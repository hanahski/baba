// Voice cloning — proxies to RapidAPI Omnivoice Multilingual TTS & Voice Cloning API.
// POST ?action=clone   { text, reference_audio_url, language, format, speed, num_step } -> JSON (audio url/base64)
// POST ?action=design  { text, voice_attributes, language, format, num_step } -> JSON
// GET  ?action=health  -> upstream status + quota for admin panel

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

const DEFAULT_HOST = "multilingual-tts-voice-cloning-api1.p.rapidapi.com";
const DEFAULT_PATHS = { clone: "/tts/clone", design: "/tts/design" };
const TOOL_KEY = "voice-clone";

async function loadOverride() {
  let host = DEFAULT_HOST;
  let apiKey = process.env.RAPIDAPI_KEY || "";
  let paths = { ...DEFAULT_PATHS };
  try {
    const { data } = await supabaseAdmin
      .from("tool_overrides")
      .select("rapidapi_host, rapidapi_key, paths")
      .eq("tool_key", TOOL_KEY)
      .maybeSingle();
    if (data) {
      if (data.rapidapi_host) host = data.rapidapi_host;
      if (data.rapidapi_key) apiKey = data.rapidapi_key;
      const p = data.paths as Record<string, string> | null;
      if (p) {
        if (typeof p.clone === "string" && p.clone) paths.clone = p.clone;
        if (typeof p.design === "string" && p.design) paths.design = p.design;
      }
    }
  } catch (e) {
    console.error("[voice-clone] override fetch failed", e);
  }
  return { host, apiKey, paths };
}

export const Route = createFileRoute("/api/public/voice-clone")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),

      GET: async ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("action") !== "health") {
          return json({ error: "Unknown action" }, 400);
        }
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
          });
        } catch (e) {
          return json(
            { status: "dead", error: e instanceof Error ? e.message : "Network error", host },
            200,
          );
        }
      },

      POST: async ({ request }) => {
        const url = new URL(request.url);
        const action = url.searchParams.get("action") || "clone";
        if (action !== "clone" && action !== "design") {
          return json({ error: "action must be 'clone' or 'design'" }, 400);
        }
        const { host, apiKey, paths } = await loadOverride();
        if (!apiKey) return json({ error: "Server missing RAPIDAPI_KEY" }, 500);

        let body: Record<string, unknown>;
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }

        // Light validation
        if (typeof body.text !== "string" || !body.text.trim()) {
          return json({ error: "text is required" }, 400);
        }
        if (body.text.length > 2000) {
          return json({ error: "text too long (max 2000 chars)" }, 400);
        }
        if (action === "clone" && typeof body.reference_audio_url !== "string") {
          return json({ error: "reference_audio_url is required" }, 400);
        }
        if (action === "design" && typeof body.voice_attributes !== "string") {
          return json({ error: "voice_attributes is required" }, 400);
        }

        const path = action === "clone" ? paths.clone : paths.design;

        let res: Response;
        try {
          res = await fetch(`https://${host}${path}`, {
            method: "POST",
            headers: {
              "x-rapidapi-host": host,
              "x-rapidapi-key": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
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
          // Some endpoints stream raw audio — pass through
          if (res.ok && res.headers.get("content-type")?.startsWith("audio/")) {
            return new Response(text, {
              status: 200,
              headers: {
                "Content-Type": res.headers.get("content-type") || "audio/wav",
                ...corsHeaders,
              },
            });
          }
          return json({ error: "Upstream returned non-JSON", body: text.slice(0, 500) }, 502);
        }
        if (!res.ok) {
          return json({ error: "Upstream error", upstream: data }, res.status);
        }
        return json(data, 200);
      },
    },
  },
});
