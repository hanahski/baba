// Random riddle proxy (free, no key required)
import { createFileRoute } from "@tanstack/react-router";

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

export const Route = createFileRoute("/api/riddle")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async () => {
        try {
          const res = await fetch("https://riddles-api.vercel.app/random", {
            headers: { Accept: "application/json" },
          });
          if (!res.ok) return json({ error: `Upstream ${res.status}` }, 502);
          const data = (await res.json()) as { riddle?: string; answer?: string };
          if (!data?.riddle) return json({ error: "No riddle returned" }, 502);
          return json({ riddle: data.riddle, answer: data.answer ?? "" });
        } catch (e) {
          console.error("[riddle] failed", e);
          return json({ error: "Could not reach riddle service" }, 502);
        }
      },
    },
  },
});
