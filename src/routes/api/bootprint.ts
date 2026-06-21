// Proxy for https://api.bootprint.space — avoids browser CORS, hotlink, and
// any CSP/image-loading issues by also proxying the image bytes.
import { createFileRoute } from "@tanstack/react-router";

const PLANETS = ["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "sun", "moon"] as const;

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

export const Route = createFileRoute("/api/bootprint")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ request }) => {
        const url = new URL(request.url);

        // Image proxy mode: /api/bootprint?image=<planet>/<file>.png
        const imagePath = url.searchParams.get("image");
        if (imagePath) {
          // Only allow paths like "mars/4.png" — no protocol, no traversal.
          if (!/^[a-z0-9_-]+\/[a-z0-9_.-]+\.(png|jpg|jpeg|webp)$/i.test(imagePath)) {
            return json({ error: "Invalid image path" }, 400);
          }
          try {
            const imgRes = await fetch(`https://cdn.bootprint.space/${imagePath}`, {
              headers: { "User-Agent": "EBSUVerse/1.0" },
            });
            if (!imgRes.ok) return json({ error: `Upstream ${imgRes.status}` }, 502);
            const headers = new Headers(corsHeaders);
            headers.set("Content-Type", imgRes.headers.get("content-type") || "image/png");
            headers.set("Cache-Control", "public, max-age=86400");
            return new Response(imgRes.body, { status: 200, headers });
          } catch (e) {
            console.error("[bootprint] image fetch failed", e);
            return json({ error: "Could not load image" }, 502);
          }
        }

        let object = (url.searchParams.get("object") || "random").toLowerCase().trim();
        if (object === "random") {
          object = PLANETS[Math.floor(Math.random() * PLANETS.length)];
        }
        if (!PLANETS.includes(object as (typeof PLANETS)[number])) {
          return json({ error: "Unknown object", allowed: PLANETS }, 400);
        }
        try {
          const res = await fetch(`https://api.bootprint.space/all/${object}`, {
            headers: { Accept: "application/json", "User-Agent": "EBSUVerse/1.0" },
          });
          if (!res.ok) return json({ error: `Upstream returned ${res.status}` }, 502);
          const data = (await res.json()) as { image?: string; [k: string]: unknown };

          // Rewrite the CDN URL to our own proxy so the <img> tag never hits a
          // third-party origin that might block hotlinking or violate CSP.
          if (typeof data.image === "string") {
            const m = data.image.match(/cdn\.bootprint\.space\/(.+)$/i);
            if (m) data.image = `/api/bootprint?image=${m[1]}`;
          }
          return json(data);
        } catch (e) {
          console.error("[bootprint] fetch failed", e);
          return json({ error: "Could not reach Bootprint API" }, 502);
        }
      },
    },
  },
});
