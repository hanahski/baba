// Vocal split — proxies to RapidAPI voice-separation-api.
// POST: forward an uploaded audio file (multipart "file"), return JSON with stem URLs.
// GET ?u=...: stream a stem URL back with attachment headers (avoids CORS + forces download).
// GET ?action=health: ping upstream and report quota headers for the admin panel.

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const DEFAULT_HOST = "voice-separation-api.p.rapidapi.com";
const DEFAULT_SEPARATE_PATH = "/api/rapidapi/separate-audio";
const ALLOWED_PROXY_HOSTS = ["stems.songfinder.gg"];
const TOOL_KEY = "vocal";

async function loadOverride() {
  let host = DEFAULT_HOST;
  let apiKey = process.env.RAPIDAPI_KEY || "";
  let separatePath = DEFAULT_SEPARATE_PATH;
  try {
    const { data } = await supabaseAdmin
      .from("tool_overrides")
      .select("rapidapi_host, rapidapi_key, paths")
      .eq("tool_key", TOOL_KEY)
      .maybeSingle();
    if (data) {
      if (data.rapidapi_host) host = data.rapidapi_host;
      if (data.rapidapi_key) apiKey = data.rapidapi_key;
      const paths = data.paths as Record<string, string> | null;
      if (paths && typeof paths.separate === "string" && paths.separate) {
        separatePath = paths.separate;
      }
    }
  } catch (e) {
    console.error("[vocal-split] override fetch failed", e);
  }
  return { host, apiKey, separatePath };
}

export const Route = createFileRoute("/api/public/vocal-split")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: corsHeaders }),

      POST: async ({ request }) => {
        const { host, apiKey, separatePath } = await loadOverride();
        if (!apiKey) return json({ error: "Server missing RAPIDAPI_KEY" }, 500);

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return json({ error: "Expected multipart/form-data" }, 400);
        }
        const file = form.get("file");
        if (!(file instanceof File)) {
          return json({ error: "Missing file" }, 400);
        }
        if (file.size > 50 * 1024 * 1024) {
          return json({ error: "Max 50 MB" }, 413);
        }

        const out = new FormData();
        out.append("file", file, file.name || "audio");

        let res: Response;
        try {
          res = await fetch(`https://${host}${separatePath}`, {
            method: "POST",
            headers: {
              "x-rapidapi-host": host,
              "x-rapidapi-key": apiKey,
            },
            body: out,
          });
        } catch (e) {
          return json(
            { error: e instanceof Error ? e.message : "Upstream request failed" },
            502,
          );
        }

        const text = await res.text();
        let data: unknown;
        try {
          data = JSON.parse(text);
        } catch {
          return json({ error: "Upstream returned non-JSON", body: text.slice(0, 500) }, 502);
        }
        if (!res.ok) {
          return json({ error: "Separation failed", upstream: data }, res.status);
        }
        return json(data, 200);
      },

      GET: async ({ request }) => {
        const url = new URL(request.url);
        const action = url.searchParams.get("action");

        // Health probe (cheap HEAD-ish — read quota headers regardless of status)
        if (action === "health") {
          const { host, apiKey } = await loadOverride();
          if (!apiKey) {
            return json({ status: "dead", error: "Missing API key", host }, 200);
          }
          const started = Date.now();
          try {
            const res = await fetch(`https://${host}/`, {
              headers: { "x-rapidapi-host": host, "x-rapidapi-key": apiKey },
            });
            const latencyMs = Date.now() - started;
            const limit = Number(res.headers.get("x-ratelimit-requests-limit") || 0);
            const remaining = Number(res.headers.get("x-ratelimit-requests-remaining") || 0);
            const reset = res.headers.get("x-ratelimit-requests-reset") || null;
            // 404 at "/" is fine — host is alive
            let status: "ok" | "warn" | "dead" = "ok";
            if (limit > 0 && remaining <= 0) status = "dead";
            else if (limit > 0 && (remaining / limit < 0.1 || remaining < 25)) status = "warn";
            else if (res.status >= 500) status = "dead";
            return json({
              status,
              httpStatus: res.status,
              latencyMs,
              limit: limit || null,
              remaining: limit ? remaining : null,
              reset,
              host,
            }, 200);
          } catch (e) {
            return json({
              status: "dead",
              error: e instanceof Error ? e.message : "Network error",
              host,
            }, 200);
          }
        }

        const u = url.searchParams.get("u");
        const name = url.searchParams.get("n") || "stem.wav";
        if (!u) return json({ error: "Missing u" }, 400);
        let target: URL;
        try {
          target = new URL(u);
        } catch {
          return json({ error: "Invalid url" }, 400);
        }
        if (!ALLOWED_PROXY_HOSTS.includes(target.hostname)) {
          return json({ error: "Host not allowed" }, 400);
        }
        const range = request.headers.get("range") ?? undefined;
        const upstream = await fetch(target.toString(), {
          headers: range ? { Range: range } : undefined,
        });
        const headers = new Headers();
        const passthrough = [
          "content-type",
          "content-length",
          "accept-ranges",
          "content-range",
          "etag",
          "last-modified",
        ];
        for (const h of passthrough) {
          const v = upstream.headers.get(h);
          if (v) headers.set(h, v);
        }
        headers.set("Cache-Control", "private, max-age=300");
        headers.set(
          "Content-Disposition",
          `attachment; filename="${name.replace(/[^a-zA-Z0-9._ -]/g, "_")}"`,
        );
        for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);
        return new Response(upstream.body, {
          status: upstream.status,
          headers,
        });
      },
    },
  },
});
