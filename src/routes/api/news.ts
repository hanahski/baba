// Daily Plug News — server-side proxy for NewsAPI.org (keeps NEWS_API_KEY private)
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const QuerySchema = z.object({
  mode: z.enum(["headlines", "search"]).default("headlines"),
  category: z
    .enum(["general", "business", "entertainment", "health", "science", "sports", "technology"])
    .default("general"),
  country: z.string().min(2).max(2).regex(/^[a-z]{2}$/).default("us"),
  q: z.string().trim().min(1).max(120).optional(),
  page: z.coerce.number().int().min(1).max(5).default(1),
});

// Curated source lists per category — /everything returns urlToImage reliably,
// unlike /top-headlines which often proxies Google News (no images / no descriptions).
const SOURCES_BY_CATEGORY: Record<string, string> = {
  general: "bbc-news,cnn,associated-press,reuters,the-verge,al-jazeera-english",
  business: "bloomberg,business-insider,fortune,the-wall-street-journal,financial-post",
  technology: "techcrunch,the-verge,wired,ars-technica,engadget,techradar",
  science: "national-geographic,new-scientist,next-big-future",
  health: "medical-news-today",
  sports: "espn,bbc-sport,fox-sports,bleacher-report,nfl-news,nhl-news",
  entertainment: "entertainment-weekly,buzzfeed,mtv-news,polygon,ign",
};

export const Route = createFileRoute("/api/news")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ request }) => {
        const apiKey = process.env.NEWS_API_KEY;
        if (!apiKey) {
          return json({ articles: [], total: 0, notConfigured: true });
        }

        const u = new URL(request.url);
        const parsed = QuerySchema.safeParse({
          mode: u.searchParams.get("mode") ?? undefined,
          category: u.searchParams.get("category") ?? undefined,
          country: u.searchParams.get("country") ?? undefined,
          q: u.searchParams.get("q") ?? undefined,
          page: u.searchParams.get("page") ?? undefined,
        });
        if (!parsed.success) return json({ error: "Invalid query" }, 400);
        const { mode, category, q, page } = parsed.data;

        let endpoint: string;
        if (mode === "search" && q) {
          const params = new URLSearchParams({
            q,
            sortBy: "publishedAt",
            language: "en",
            pageSize: "24",
            page: String(page),
            apiKey,
          });
          endpoint = `https://newsapi.org/v2/everything?${params.toString()}`;
        } else {
          const sources = SOURCES_BY_CATEGORY[category] ?? SOURCES_BY_CATEGORY.general;
          const params = new URLSearchParams({
            sources,
            sortBy: "publishedAt",
            language: "en",
            pageSize: "24",
            page: String(page),
            apiKey,
          });
          endpoint = `https://newsapi.org/v2/everything?${params.toString()}`;
        }

        try {
          const res = await fetch(endpoint, {
            headers: { Accept: "application/json", "User-Agent": "StudentsPlug/1.0" },
          });
          const data = await res.json().catch(() => null);
          if (!res.ok || (data && data.status === "error")) {
            const message =
              (data && (data.message as string)) || `Upstream error ${res.status}`;
            return json({ error: message }, res.status >= 500 ? 502 : 400);
          }
          // Trim payload to what the UI needs
          const articles = Array.isArray(data?.articles)
            ? data.articles
                .filter((a: any) => a?.title && a.title !== "[Removed]")
                .map((a: any) => ({
                  title: a.title as string,
                  description: a.description as string | null,
                  url: a.url as string,
                  image: (a.urlToImage as string | null) ?? null,
                  source: (a.source?.name as string | null) ?? null,
                  publishedAt: (a.publishedAt as string | null) ?? null,
                }))
            : [];
          return json({ articles, total: data?.totalResults ?? articles.length });
        } catch (e) {
          console.error("[news] fetch failed", e);
          return json({ error: "Could not reach the news service" }, 502);
        }
      },
    },
  },
});
