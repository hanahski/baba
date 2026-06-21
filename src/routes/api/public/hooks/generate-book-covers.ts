// Generate realistic book-cover images via Lovable AI Gateway for books that
// don't yet have an AI cover. Batches small numbers per request to bound cost
// and avoid Worker timeouts.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/images/generations";
const MODEL = "openai/gpt-image-2";

type Book = { id: string; title: string; author: string | null; category: string };

function coverPrompt(b: Book): string {
  const genre =
    b.category === "novel"
      ? "literary novel"
      : b.category === "poetry"
        ? "poetry collection"
        : b.category === "comics"
          ? "graphic novel"
          : b.category === "course"
            ? "academic textbook"
            : "non-fiction book";
  return [
    `A photorealistic, professionally designed front book cover for a ${genre} titled "${b.title}"`,
    b.author && b.author !== "Free Book Centre" ? `by ${b.author}` : "",
    "Centered, portrait orientation, printed paperback look with subtle paper texture and soft shadow.",
    "The title and author MUST be rendered as crisp legible typography on the cover, well-kerned, no spelling mistakes.",
    "Bold editorial design, rich color palette, tasteful illustration or photography matching the subject.",
    "No borders, no watermarks, no website URLs, no QR codes, no barcodes.",
  ]
    .filter(Boolean)
    .join(" ");
}

async function generatePng(prompt: string): Promise<Uint8Array> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      size: "1024x1536",
      quality: "low",
      n: 1,
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`gateway ${res.status}: ${txt.slice(0, 200)}`);
  }
  const json = (await res.json()) as { data?: Array<{ b64_json?: string }> };
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error("no image in response");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function run(limit: number) {
  const { data: books, error } = await supabaseAdmin
    .from("library_books")
    .select("id,title,author,category,cover_url")
    .or("cover_url.is.null,cover_url.like.https://placehold.co/%")
    .limit(limit);
  if (error) throw new Error(error.message);

  const results: Array<{ id: string; title: string; ok: boolean; error?: string }> = [];
  for (const b of (books ?? []) as Array<Book & { cover_url: string | null }>) {
    try {
      const png = await generatePng(coverPrompt(b));
      const path = `${b.id}.png`;
      const up = await supabaseAdmin.storage
        .from("book-covers")
        .upload(path, png, { contentType: "image/png", upsert: true });
      if (up.error) throw new Error(up.error.message);
      const { data: pub } = supabaseAdmin.storage.from("book-covers").getPublicUrl(path);
      const { error: updErr } = await supabaseAdmin
        .from("library_books")
        .update({ cover_url: pub.publicUrl })
        .eq("id", b.id);
      if (updErr) throw new Error(updErr.message);
      results.push({ id: b.id, title: b.title, ok: true });
    } catch (e) {
      results.push({ id: b.id, title: b.title, ok: false, error: (e as Error).message });
    }
  }
  const { count: remaining } = await supabaseAdmin
    .from("library_books")
    .select("id", { count: "exact", head: true })
    .or("cover_url.is.null,cover_url.like.https://placehold.co/%");
  return { processed: results.length, remaining: remaining ?? 0, results };
}

export const Route = createFileRoute("/api/public/hooks/generate-book-covers")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "6", 10) || 6, 1), 12);
        try {
          return Response.json({ ok: true, ...(await run(limit)) });
        } catch (e) {
          return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
        }
      },
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "6", 10) || 6, 1), 12);
        const out = await run(limit);
        return Response.json({ ok: true, ...out });
      },
    },
  },
});
