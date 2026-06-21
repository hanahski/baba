import { createFileRoute } from "@tanstack/react-router";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const Route = createFileRoute("/api/eightball")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const locale = url.searchParams.get("locale") || "en";
        try {
          const res = await fetch(`https://eightballapi.com/api?locale=${encodeURIComponent(locale)}`, {
            headers: { Accept: "application/json", "User-Agent": "EBSUVerse/1.0" },
          });
          if (!res.ok) {
            return new Response(JSON.stringify({ error: `Upstream ${res.status}` }), {
              status: 502,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            });
          }
          const data = await res.json();
          return new Response(JSON.stringify(data), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        } catch (e) {
          console.error("[eightball] fetch failed", e);
          return new Response(JSON.stringify({ error: "Could not reach oracle" }), {
            status: 502,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
      },
    },
  },
});
