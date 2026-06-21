// Vocal split v2 — StemSplit (YouTube → Stems) via RapidAPI.
//
// POST  /api/public/vocal-split-v2                → { youtubeUrl } → { id }
// GET   /api/public/vocal-split-v2?id=...         → poll status + outputs
// GET   /api/public/vocal-split-v2?url=...&n=...  → proxy-download a presigned stem URL
// GET   /api/public/vocal-split-v2?action=health  → admin health probe

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const DEFAULT_HOST = "stemsplit-ai-audio-stem-separation-youtube-to-stems2.p.rapidapi.com";
const DEFAULT_CREATE_PATH = "/youtube-jobs";
const DEFAULT_STATUS_PATH = "/youtube-jobs/{id}";
const TOOL_KEY = "vocal-yt";

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

async function loadOverride() {
  let host = DEFAULT_HOST;
  let apiKey = process.env.RAPIDAPI_KEY || "";
  let createPath = DEFAULT_CREATE_PATH;
  let statusPath = DEFAULT_STATUS_PATH;
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
      if (paths) {
        if (typeof paths.create === "string" && paths.create) createPath = paths.create;
        if (typeof paths.status === "string" && paths.status) statusPath = paths.status;
      }
    }
  } catch (e) {
    console.error("[vocal-split-v2] override fetch failed", e);
  }
  return { host, apiKey, createPath, statusPath };
}

export const Route = createFileRoute("/api/public/vocal-split-v2")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),

      POST: async ({ request }) => {
        const { host, apiKey, createPath } = await loadOverride();
        if (!apiKey) return json({ error: "Server missing RAPIDAPI_KEY" }, 500);

        let body: { youtubeUrl?: string };
        try {
          body = await request.json();
        } catch {
          return json({ error: "Expected JSON body" }, 400);
        }
        const youtubeUrl = String(body.youtubeUrl || "").trim();
        if (!youtubeUrl) return json({ error: "Missing youtubeUrl" }, 400);
        if (!/^https?:\/\/(www\.|m\.|music\.)?(youtube\.com|youtu\.be)\//i.test(youtubeUrl)) {
          return json({ error: "Please provide a valid YouTube URL" }, 400);
        }

        let res: Response;
        try {
          res = await fetch(`https://${host}${createPath}`, {
            method: "POST",
            headers: {
              "x-rapidapi-host": host,
              "x-rapidapi-key": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ youtubeUrl }),
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
        if (!res.ok) return json({ error: "Job creation failed", upstream: data }, res.status);
        return json(data, 200);
      },

      GET: async ({ request }) => {
        const url = new URL(request.url);
        const action = url.searchParams.get("action");

        if (action === "health") {
          const { host, apiKey } = await loadOverride();
          if (!apiKey) return json({ status: "dead", error: "Missing API key", host }, 200);
          const started = Date.now();
          try {
            const res = await fetch(`https://${host}/`, {
              headers: { "x-rapidapi-host": host, "x-rapidapi-key": apiKey },
            });
            const latencyMs = Date.now() - started;
            const limit = Number(res.headers.get("x-ratelimit-requests-limit") || 0);
            const remaining = Number(res.headers.get("x-ratelimit-requests-remaining") || 0);
            const reset = res.headers.get("x-ratelimit-requests-reset") || null;
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

        const { host, apiKey, statusPath } = await loadOverride();
        if (!apiKey) return json({ error: "Server missing RAPIDAPI_KEY" }, 500);

        const id = url.searchParams.get("id");
        const dlUrl = url.searchParams.get("url");
        const name = url.searchParams.get("n") || "stem.mp3";

        if (dlUrl) {
          if (!/^https?:\/\//i.test(dlUrl)) return json({ error: "Bad url" }, 400);
          const upstream = await fetch(dlUrl);
          if (!upstream.ok) {
            return json({ error: "Download failed" }, upstream.status);
          }
          const headers = new Headers();
          headers.set("Content-Type", upstream.headers.get("content-type") || "audio/mpeg");
          const cl = upstream.headers.get("content-length");
          if (cl) headers.set("Content-Length", cl);
          headers.set(
            "Content-Disposition",
            `attachment; filename="${name.replace(/[^a-zA-Z0-9._ ()-]/g, "_")}"`,
          );
          for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);
          return new Response(upstream.body, { status: 200, headers });
        }

        if (!id) return json({ error: "Missing id" }, 400);

        const path = statusPath.replace(/\{id\}/g, encodeURIComponent(id));
        const res = await fetch(`https://${host}${path}`, {
          headers: {
            "x-rapidapi-host": host,
            "x-rapidapi-key": apiKey,
          },
        });
        const text = await res.text();
        let data: unknown;
        try {
          data = JSON.parse(text);
        } catch {
          return json({ error: "Upstream returned non-JSON", body: text.slice(0, 500) }, 502);
        }
        if (!res.ok) return json({ error: "Status failed", upstream: data }, res.status);
        return json(data, 200);
      },
    },
  },
});
