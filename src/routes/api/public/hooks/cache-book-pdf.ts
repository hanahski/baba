// Downloads an external PDF for a library_book and mirrors it to the book-pdfs bucket.
// Idempotent: if the row already points at our bucket, we just return that URL.
import { createFileRoute } from "@tanstack/react-router";

const BUCKET = "book-pdfs";

const FETCH_TIMEOUT_MS = 10000;

async function fetchWithTimeout(url: string, ms = FETCH_TIMEOUT_MS): Promise<Response | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      headers: { "User-Agent": "StudentsPlug/1.0 (+pdf-resolver)" },
      redirect: "follow",
      signal: ctrl.signal,
    });
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function extractPdfHrefs(html: string, base: URL): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/href\s*=\s*["']([^"'<>]+\.pdf(?:\?[^"'<>]*)?)["']/gi)) {
    try {
      const url = new URL(m[1], base);
      if (/(privacy|policy|terms|twitter|google|facebook|linkedin|cookie)/i.test(url.pathname)) continue;
      out.push(url.toString());
    } catch {}
  }
  return out;
}

function extractFollowableHrefs(html: string, base: URL): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/href\s*=\s*["']([^"'<>#]+)["']/gi)) {
    const href = m[1];
    if (/\.(jpg|jpeg|png|gif|svg|css|js|ico|zip|epub|mobi|rar)(\?|$)/i.test(href)) continue;
    if (/^(mailto:|tel:|javascript:)/i.test(href)) continue;
    try {
      const u = new URL(href, base);
      if (u.protocol !== "http:" && u.protocol !== "https:") continue;
      if (u.host !== base.host) continue;
      out.push(u.toString());
    } catch {}
  }
  return out;
}

async function resolveArchivePdfUrl(sourceUrl: string): Promise<string | null> {
  const match = sourceUrl.match(/archive\.org\/details\/([^/?#]+)/i);
  if (!match) return null;
  const identifier = decodeURIComponent(match[1]);
  const metadata = await fetchWithTimeout(`https://archive.org/metadata/${encodeURIComponent(identifier)}`, 20_000);
  if (!metadata?.ok) return null;
  const payload = await metadata.json() as { files?: Array<{ name?: string; format?: string; source?: string }> };
  const candidates = (payload.files ?? [])
    .filter((file) => file.name?.toLowerCase().endsWith(".pdf"))
    .filter((file) => !/(text pdf|search text|full text)/i.test(file.format ?? ""))
    .filter((file) => !/(scandata|_text|_bw|_searchable|policy|privacy)/i.test(file.name ?? ""))
    .sort((a, b) => {
      const score = (file: { format?: string; source?: string }) =>
        (file.source === "original" ? 4 : 0) + (/pdf/i.test(file.format ?? "") ? 2 : 0);
      return score(b) - score(a);
    });
  const name = candidates[0]?.name;
  return name ? `https://archive.org/download/${encodeURIComponent(identifier)}/${name.split("/").map(encodeURIComponent).join("/")}` : null;
}

async function resolveFreeBookCentrePdfUrl(sourceUrl: string): Promise<string | null> {
  const source = new URL(sourceUrl);
  if (!/(^|\.)freebookcentre\.net$/i.test(source.hostname)) return null;
  const page = await fetchWithTimeout(sourceUrl, 20_000);
  if (!page?.ok) return null;
  const html = await page.text();
  const gatewayMatch = html.match(/href=["']([^"']*gotoweb\.php\?id=\d+[^"']*)["']/i);
  if (!gatewayMatch) return null;
  const gatewayUrl = new URL(gatewayMatch[1], page.url).toString();
  const gateway = await fetchWithTimeout(gatewayUrl, 20_000);
  if (!gateway?.ok) return null;
  const contentType = gateway.headers.get("content-type") ?? "";
  if (contentType.includes("pdf") || /\.pdf(?:\?|#|$)/i.test(gateway.url)) return gateway.url;
  if (!contentType.includes("html")) return null;
  const gatewayHtml = await gateway.text();
  return extractPdfHrefs(gatewayHtml, new URL(gateway.url))[0] ?? null;
}

// Recursively try to find a real PDF behind any landing/index page.
// Depth 0 → source URL itself. Depth 1+ → follow promising links.
// Up to depth 2 so freebookcentre-style index → publisher → PDF chains resolve.
async function resolvePdfUrl(sourceUrl: string, depth = 0, seen = new Set<string>()): Promise<string | null> {
  if (seen.has(sourceUrl)) return null;
  seen.add(sourceUrl);
  if (/\.pdf(\?|#|$)/i.test(sourceUrl)) return sourceUrl;
  const res = await fetchWithTimeout(sourceUrl);
  if (!res || !res.ok) return null;
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("pdf")) return res.url;
  if (!ct.includes("html")) return null;
  const html = await res.text();
  const base = new URL(res.url);

  // First pass: direct .pdf link on this page wins.
  const pdfs = extractPdfHrefs(html, base);
  if (pdfs[0]) return pdfs[0];

  if (depth >= 2) return null;

  // Rank candidates: prefer hrefs that mention pdf/download/book/read/chapter.
  const all = extractFollowableHrefs(html, base);
  const scored = all
    .map((u) => {
      const score = /(pdf|download|read|book|chapter|fulltext|view)/i.test(u) ? 2
        : (new URL(u).host !== base.host ? 1 : 0);
      return { u, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((x) => x.u);

  for (const c of scored) {
    const hit = await resolvePdfUrl(c, depth + 1, seen);
    if (hit) return hit;
  }
  return null;
}


async function cacheById(id: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: book, error } = await supabaseAdmin
    .from("library_books")
    .select("id, read_url, source_url, openlibrary_key")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!book) return { ok: false, error: "not_found" as const };
  const cachedPath = `${book.id}-book.pdf`;
  if (book.read_url?.includes(`/${BUCKET}/${cachedPath}`)) {
    const { data, error: signError } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(cachedPath, 60 * 60 * 24);
    if (signError || !data?.signedUrl) return { ok: false, error: "could_not_open_cached_pdf" };
    return { ok: true, cached_url: data.signedUrl, already: true };
  }
  const originalSource = book.source_url || (book.read_url && !book.read_url.includes(`/${BUCKET}/`) ? book.read_url : null);
  if (!originalSource) {
    return { ok: false, error: "no_source" as const };
  }

  // Archive metadata identifies the actual item file. The generic resolver is
  // deliberately same-site only so social/privacy PDFs can never be selected.
  if (!/(^|\.)freebookcentre\.net$/i.test(new URL(originalSource).hostname)) {
    return { ok: false, error: "unsupported_source" };
  }
  const pdfUrl = await resolveFreeBookCentrePdfUrl(originalSource);
  if (!pdfUrl) return { ok: false, error: "no_pdf_found" };

  const res = await fetchWithTimeout(pdfUrl, 20_000);
  if (!res) return { ok: false, error: "source_timed_out" };
  if (!res.ok) return { ok: false, error: `fetch_${res.status}` };
  const ct = res.headers.get("content-type") ?? "";
  const buf = new Uint8Array(await res.arrayBuffer());
  if (!ct.includes("pdf") && !(buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46)) {
    return { ok: false, error: "not_a_pdf" };
  }

  // A new key replaces any incorrectly cached legacy PDF.
  const path = cachedPath;
  const up = await supabaseAdmin.storage.from(BUCKET).upload(path, buf, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (up.error) return { ok: false, error: `upload: ${up.error.message}` };

  const { data: stored } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  await supabaseAdmin.from("library_books").update({ read_url: stored.publicUrl }).eq("id", book.id);
  const { data: signed, error: signError } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24);
  if (signError || !signed?.signedUrl) return { ok: false, error: "could_not_open_cached_pdf" };
  return { ok: true, cached_url: signed.signedUrl, already: false };
}

export const Route = createFileRoute("/api/public/hooks/cache-book-pdf")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const id = new URL(request.url).searchParams.get("id");
        if (!id) return Response.json({ ok: false, error: "missing id" }, { status: 400 });
        try {
          const out = await cacheById(id);
          return Response.json(out, { status: out.ok ? 200 : 400 });
        } catch (e) {
          return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
        }
      },
    },
  },
});
