// FreeToGame proxy — list & detail of free-to-play games (no key required)
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
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=600",
      ...corsHeaders,
    },
  });

const slug = z
  .string()
  .min(1)
  .max(40)
  .regex(/^[a-z0-9-]+$/i);

const QuerySchema = z.object({
  id: z.coerce.number().int().positive().max(100000).optional(),
  platform: slug.optional(),
  category: slug.optional(),
  sortBy: z.enum(["release-date", "popularity", "alphabetical", "relevance"]).optional(),
});

const BASE = "https://www.freetogame.com/api";

export const Route = createFileRoute("/api/freegames")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ request }) => {
        const u = new URL(request.url);
        const parsed = QuerySchema.safeParse({
          id: u.searchParams.get("id") ?? undefined,
          platform: u.searchParams.get("platform") ?? undefined,
          category: u.searchParams.get("category") ?? undefined,
          sortBy: u.searchParams.get("sortBy") ?? undefined,
        });
        if (!parsed.success) return json({ error: "Invalid query" }, 400);

        let target: string;
        if (parsed.data.id) {
          target = `${BASE}/game?id=${parsed.data.id}`;
        } else {
          const params = new URLSearchParams();
          if (parsed.data.platform) params.set("platform", parsed.data.platform);
          if (parsed.data.category) params.set("category", parsed.data.category);
          params.set("sort-by", parsed.data.sortBy ?? "popularity");
          target = `${BASE}/games?${params.toString()}`;
        }

        try {
          const res = await fetch(target, { headers: { Accept: "application/json" } });
          if (!res.ok) return json({ error: `Upstream ${res.status}` }, 502);
          const data = await res.json();
          return json(data);
        } catch (e) {
          console.error("[freegames] failed", e);
          return json({ error: "Could not reach game service" }, 502);
        }
      },
    },
  },
});
