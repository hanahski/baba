import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BASE_URL = "https://www.freebookcentre.net";
const USER_AGENT = "StudentsPlug/1.0 (+library-sync)";

type Category = "course" | "book" | "novel" | "poetry" | "comics";

type LibraryRow = {
  openlibrary_key: string;
  title: string;
  author: string;
  cover_url: string | null;
  category: Category;
  read_url: string;
  source_url: string;
  source: string;
  description: string | null;
  first_publish_year: number | null;
  price_credits: number;
};

const PRICE: Record<Category, number> = { course: 20, book: 25, novel: 20, poetry: 10, comics: 15 };
const SKIP_PATH = /(AboutUs|ContactUs|Policy|Terms|Sitemap|link_us|gotoweb|assets\/|#)/i;

function cleanText(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteUrl(href: string, base = BASE_URL) {
  try {
    const url = new URL(href, base);
    return url.hostname === "www.freebookcentre.net" || url.hostname === "freebookcentre.net"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function stableKey(url: string) {
  const slug = new URL(url).pathname
    .replace(/\.(?:html?|php)$/i, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "");
  return `fbc-${slug}`.slice(0, 200);
}

function classify(url: string, pageTitle: string): Category {
  const value = `${url} ${pageTitle}`.toLowerCase();
  if (/comic|graphic novel|manga/.test(value)) return "comics";
  if (/poetry|poem/.test(value)) return "poetry";
  if (/fiction|novel|short stor|fantasy|horror|adventure|classic/.test(value)) return "novel";
  if (
    /computer|engineering|mathemat|physics|chemistry|biology|medical|program|database|network|science/.test(
      value,
    )
  )
    return "course";
  return "book";
}

async function fetchHtml(url: string, timeoutMs = 15_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

function categoryLinks(html: string) {
  const links = new Set<string>();
  for (const match of html.matchAll(/href=["']([^"']+)["']/gi)) {
    const url = absoluteUrl(match[1]);
    if (!url || SKIP_PATH.test(url)) continue;
    if (
      /\.(?:html?|php)$/i.test(new URL(url).pathname) &&
      !/(Books-Download|books-download)\//.test(url)
    )
      links.add(url);
  }
  return [...links];
}

function parseBooks(html: string, categoryUrl: string): LibraryRow[] {
  const titleMatch =
    html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const pageTitle = cleanText(titleMatch?.[1] ?? "");
  const category = classify(categoryUrl, pageTitle);
  const rows: LibraryRow[] = [];
  const starts = [...html.matchAll(/<div[^>]+itemtype=["']http:\/\/schema\.org\/Book["'][^>]*>/gi)];

  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index].index ?? 0;
    const end = starts[index + 1]?.index ?? Math.min(html.length, start + 12_000);
    const block = html.slice(start, end);
    const name =
      block.match(/itemprop=["']name["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i) ??
      block.match(/href=["']([^"']+)["'][^>]*itemprop=["']name["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!name) continue;
    const detailUrl = absoluteUrl(name[1], categoryUrl);
    if (!detailUrl || SKIP_PATH.test(detailUrl)) continue;
    const title = cleanText(name[2]);
    const author = cleanText(
      block.match(/itemprop=["']author["'][^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? "FreeBookCentre",
    );
    const description = cleanText(
      block.match(/itemprop=["']description["'][^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? "",
    );
    const image = absoluteUrl(
      block.match(/itemprop=["']image["'][^>]*src=["']([^"']+)["']/i)?.[1] ?? "",
      categoryUrl,
    );
    const hasPdf = /assets\/images\/book\/pdf\.png/i.test(block);
    const pages = Number(block.match(/itemprop=["']noOfPages["'][^>]*>(\d+)/i)?.[1] ?? 0);

    // PDF-marked entries with a known page count are the complete downloadable books.
    if (!title || !hasPdf || pages < 2) continue;
    rows.push({
      openlibrary_key: stableKey(detailUrl),
      title: title.slice(0, 280),
      author: (author || "FreeBookCentre").slice(0, 200),
      cover_url: image,
      category,
      read_url: detailUrl,
      source_url: detailUrl,
      source: "freebookcentre",
      description: description.slice(0, 800) || null,
      first_publish_year: null,
      price_credits: PRICE[category],
    });
  }
  return rows;
}

async function pool<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) {
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const item = items[cursor];
      cursor += 1;
      await worker(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
}

export async function syncFreeBookCentre(maxPages = 120) {
  const errors: string[] = [];
  const homeHtml = await fetchHtml(`${BASE_URL}/`, 20_000);
  const pages = categoryLinks(homeHtml).slice(0, Math.max(1, Math.min(maxPages, 500)));
  const found = new Map<string, LibraryRow>();

  await pool(pages, 6, async (pageUrl) => {
    try {
      const html = await fetchHtml(pageUrl);
      for (const row of parseBooks(html, pageUrl)) found.set(row.openlibrary_key, row);
    } catch (error) {
      if (errors.length < 20) errors.push(`${pageUrl}: ${(error as Error).message}`);
    }
  });

  const rows = [...found.values()];
  let rowsUpserted = 0;
  for (let index = 0; index < rows.length; index += 250) {
    const batch = rows.slice(index, index + 250);
    const { error } = await supabaseAdmin
      .from("library_books")
      .upsert(batch, { onConflict: "openlibrary_key" });
    if (error) throw new Error(error.message);
    rowsUpserted += batch.length;
  }

  return { pagesScanned: pages.length, booksFound: rows.length, rowsUpserted, errors };
}
