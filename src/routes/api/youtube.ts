// YouTube downloader — proxies to RapidAPI youtube-media-downloader.
// Keeps RAPIDAPI_KEY private on the server.

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const InputSchema = z.object({
  url: z.string().url().max(2000),
  mode: z.enum(["auto", "audio", "mute"]).default("auto"),
  videoQuality: z.enum(["144", "240", "360", "480", "720", "1080", "1440", "2160", "max"]).default("720"),
  audioFormat: z.enum(["best", "mp3", "ogg", "wav", "opus", "m4a"]).default("mp3"),
});

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

const DEFAULT_HOST = "youtube-media-downloader.p.rapidapi.com";
const DEFAULT_DETAILS_PATH = "/v2/video/details?videoId={videoId}";
const TOOL_KEY = "youtube";

async function loadOverride() {
  let host = DEFAULT_HOST;
  let apiKey = process.env.RAPIDAPI_KEY || "";
  let detailsPath = DEFAULT_DETAILS_PATH;
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
      if (paths && typeof paths.details === "string" && paths.details) {
        detailsPath = paths.details;
      }
    }
  } catch (e) {
    console.error("[youtube] override fetch failed", e);
  }
  return { host, apiKey, detailsPath };
}

function extractVideoId(input: string): string | null {
  try {
    const u = new URL(input);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id && /^[\w-]{6,}$/.test(id) ? id : null;
    }
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      const v = u.searchParams.get("v");
      if (v && /^[\w-]{6,}$/.test(v)) return v;
      // /shorts/<id>, /embed/<id>, /live/<id>
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts.length >= 2 && ["shorts", "embed", "live", "v"].includes(parts[0])) {
        return /^[\w-]{6,}$/.test(parts[1]) ? parts[1] : null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

type VideoItem = {
  url: string;
  extension?: string;
  quality?: string; // e.g. "720p"
  height?: number;
  hasAudio?: boolean;
  sizeText?: string;
  mimeType?: string;
};
type AudioItem = {
  url: string;
  extension?: string;
  sizeText?: string;
  mimeType?: string;
  bitrate?: number;
};

function pickVideo(items: VideoItem[], targetQ: string, needAudio: boolean): VideoItem | null {
  const filtered = items.filter((i) => i.url && (needAudio ? i.hasAudio === true : true));
  if (filtered.length === 0) return null;
  const target = targetQ === "max" ? 99999 : parseInt(targetQ, 10);
  const withH = filtered.map((i) => ({
    i,
    h: i.height ?? (parseInt(String(i.quality || "").replace(/\D/g, ""), 10) || 0),
  }));
  // Pick highest height <= target, else closest above
  const atOrBelow = withH.filter((x) => x.h <= target).sort((a, b) => b.h - a.h);
  if (atOrBelow.length) return atOrBelow[0].i;
  return withH.sort((a, b) => a.h - b.h)[0].i;
}

function pickAudio(items: AudioItem[], fmt: string): AudioItem | null {
  const usable = items.filter((i) => i.url);
  if (usable.length === 0) return null;
  if (fmt !== "best") {
    const want = fmt === "mp3" ? ["mp3"] : fmt === "m4a" ? ["m4a", "mp4"] : [fmt];
    const match = usable.find((i) =>
      want.includes((i.extension || "").toLowerCase()),
    );
    if (match) return match;
  }
  // Otherwise highest bitrate, fallback first
  const sorted = [...usable].sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0));
  return sorted[0] ?? usable[0];
}

export const Route = createFileRoute("/api/youtube")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ request }) => {
        const u = new URL(request.url);
        const action = u.searchParams.get("action");

        // Admin health probe
        if (action === "health") {
          const { host, apiKey, detailsPath } = await loadOverride();
          if (!apiKey) return json({ status: "dead", error: "Missing API key", host }, 200);
          const probe = detailsPath.replace(/\{videoId\}/g, "dQw4w9WgXcQ");
          const started = Date.now();
          try {
            const res = await fetch(`https://${host}${probe}`, {
              headers: { "x-rapidapi-host": host, "x-rapidapi-key": apiKey },
            });
            const latencyMs = Date.now() - started;
            const limit = Number(res.headers.get("x-ratelimit-requests-limit") || 0);
            const remaining = Number(res.headers.get("x-ratelimit-requests-remaining") || 0);
            const reset = res.headers.get("x-ratelimit-requests-reset") || null;
            let status: "ok" | "warn" | "dead" = res.ok ? "ok" : "dead";
            if (res.ok && limit > 0 && remaining <= 0) status = "dead";
            else if (res.ok && limit > 0 && (remaining / limit < 0.1 || remaining < 25)) status = "warn";
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

        // Same-origin proxy so the browser triggers a real file download
        // (with native progress) instead of trying to navigate to a CORS-locked
        // googlevideo URL.
        const target = u.searchParams.get("u");
        const name = u.searchParams.get("n") || "video";
        if (!target) return new Response("Missing url", { status: 400 });
        let parsed: URL;
        try {
          parsed = new URL(target);
        } catch {
          return new Response("Bad url", { status: 400 });
        }
        // Only allow Google video CDN hosts
        if (!/\.googlevideo\.com$/i.test(parsed.hostname)) {
          return new Response("Host not allowed", { status: 400 });
        }
        const upstream = await fetch(parsed.toString(), {
          headers: {
            // Forward Range for resumable / seek support
            ...(request.headers.get("range") ? { Range: request.headers.get("range")! } : {}),
          },
        });
        const safeName = name.replace(/[\\/:*?"<>|\r\n]+/g, "").slice(0, 150) || "video";
        const headers = new Headers();
        const ct = upstream.headers.get("content-type");
        if (ct) headers.set("Content-Type", ct);
        const cl = upstream.headers.get("content-length");
        if (cl) headers.set("Content-Length", cl);
        const cr = upstream.headers.get("content-range");
        if (cr) headers.set("Content-Range", cr);
        const ar = upstream.headers.get("accept-ranges");
        if (ar) headers.set("Accept-Ranges", ar);
        headers.set(
          "Content-Disposition",
          `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
        );
        headers.set("Cache-Control", "no-store");
        return new Response(upstream.body, { status: upstream.status, headers });
      },
      POST: async ({ request }) => {
        const { host, apiKey, detailsPath } = await loadOverride();
        if (!apiKey) return json({ error: "Downloader not configured" }, 500);

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }
        const parsed = InputSchema.safeParse(raw);
        if (!parsed.success) return json({ error: "Invalid input" }, 400);
        const { url, mode, videoQuality, audioFormat } = parsed.data;

        const videoId = extractVideoId(url);
        if (!videoId) return json({ error: "Could not read a YouTube video ID from that URL" }, 400);

        try {
          const path = detailsPath.replace(/\{videoId\}/g, encodeURIComponent(videoId));
          const apiUrl = `https://${host}${path}`;
          const res = await fetch(apiUrl, {
            headers: {
              "x-rapidapi-key": apiKey,
              "x-rapidapi-host": host,
            },
          });
          if (!res.ok) {
            return json({ error: `Downloader service returned ${res.status}` }, 502);
          }
          const data = (await res.json()) as {
            errorId?: string;
            title?: string;
            videos?: { items?: VideoItem[] };
            audios?: { items?: AudioItem[] };
            thumbnails?: { url: string }[];
          };
          if (data.errorId && data.errorId !== "Success") {
            return json({ error: `Downloader rejected this video (${data.errorId})` }, 400);
          }

          const safeTitle = (data.title || "video").replace(/[\\/:*?"<>|]+/g, "").slice(0, 120);

          const thumb =
            (data.thumbnails && data.thumbnails.length
              ? data.thumbnails[data.thumbnails.length - 1].url
              : null) || null;

          if (mode === "audio") {
            const a = pickAudio(data.audios?.items ?? [], audioFormat);
            if (!a) return json({ error: "No audio stream available for this video" }, 404);
            return json({
              url: a.url,
              filename: `${safeTitle}.${a.extension || "m4a"}`,
              size: a.sizeText ?? null,
              title: data.title ?? null,
              thumbnail: thumb,
            });
          }

          const needAudio = mode === "auto";
          const v = pickVideo(data.videos?.items ?? [], videoQuality, needAudio);
          if (!v) {
            return json(
              {
                error: needAudio
                  ? "No combined video+audio stream available — try Audio only."
                  : "No video stream available",
              },
              404,
            );
          }
          return json({
            url: v.url,
            filename: `${safeTitle}.${v.extension || "mp4"}`,
            size: v.sizeText ?? null,
            quality: v.quality ?? null,
            title: data.title ?? null,
            thumbnail: thumb,
          });
        } catch (err) {
          console.error("[youtube] fetch failed", err);
          return json({ error: "Could not reach downloader service. Try again shortly." }, 502);
        }
      },
    },
  },
});
