// Dictionary proxy via parse.bot (server-side PARSE_API_KEY)
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

const SCRAPER = "d593a0d5-fc4e-4d24-b208-fd9143ffb8d0";
const BASE = `https://api.parse.bot/scraper/${SCRAPER}`;

// action -> { path, params }
const word = z.string().min(1).max(60).regex(/^[a-zA-Z .'-]+$/);

const QuerySchema = z.object({
  action: z
    .enum(["define", "pronounce", "thesaurus", "examples", "wotd", "autocomplete"])
    .default("define"),
  word: word.optional(),
  query: z.string().min(1).max(60).regex(/^[a-zA-Z .'-]+$/).optional(),
});

export const Route = createFileRoute("/api/dictionary")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ request }) => {
        const apiKey = process.env.PARSE_API_KEY;
        if (!apiKey) return json({ error: "SERVICE_UNAVAILABLE", fallback: true, message: "Dictionary service not configured" });

        const u = new URL(request.url);
        const parsed = QuerySchema.safeParse({
          action: u.searchParams.get("action") ?? undefined,
          word: u.searchParams.get("word") ?? undefined,
          query: u.searchParams.get("query") ?? undefined,
        });
        if (!parsed.success) return json({ error: "Invalid query" }, 400);
        const { action, word: w, query } = parsed.data;

        let path: string;
        switch (action) {
          case "wotd":
            path = `/get_word_of_the_day`;
            break;
          case "autocomplete":
            if (!query) return json({ error: "query required" }, 400);
            path = `/autocomplete?query=${encodeURIComponent(query)}&dataset=english`;
            break;
          case "pronounce":
            if (!w) return json({ error: "word required" }, 400);
            path = `/get_word_pronunciation?word=${encodeURIComponent(w)}`;
            break;
          case "thesaurus":
            if (!w) return json({ error: "word required" }, 400);
            path = `/get_word_thesaurus?word=${encodeURIComponent(w)}`;
            break;
          case "examples":
            if (!w) return json({ error: "word required" }, 400);
            path = `/get_word_examples?word=${encodeURIComponent(w)}`;
            break;
          default:
            if (!w) return json({ error: "word required" }, 400);
            path = `/get_word_definition?word=${encodeURIComponent(w)}`;
        }

        try {
          const res = await fetch(`${BASE}${path}`, { headers: { "X-API-Key": apiKey } });
          const data = await res.json().catch(() => null);
          if (!res.ok) return json({ error: "UPSTREAM_ERROR", fallback: true, status: res.status, data });
          return json(data ?? {});
        } catch (e) {
          console.error("[dictionary] failed", e);
          return json({ error: "SERVICE_FAILED", fallback: true });
        }
      },
    },
  },
});
