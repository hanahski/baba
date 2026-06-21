// Proxy for 3 RapidAPI virtual-number / temp-SMS providers, with the
// documented endpoint paths from each provider's RapidAPI playground.
//
// Admins can override the upstream host / API key / endpoint paths from
// the Admin Panel → Tools tab (table: public.tool_overrides). When no
// override row exists for a provider we fall back to the built-in defaults.

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const DEFAULT_HOSTS: Record<string, string> = {
  "1": "global-virtual-number-api.p.rapidapi.com",
  "2": "global-virtual-numbers-sms-verify.p.rapidapi.com",
  "3": "verify-sms-temp-number.p.rapidapi.com",
};

const TOOL_KEYS: Record<string, string> = {
  "1": "vnum1",
  "2": "vnum2",
  "3": "vnum3",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

function defaultPath(provider: string, action: string, p: URLSearchParams): string | null {
  const country = p.get("country") || "";
  const countryId = p.get("countryId") || "";
  const number = p.get("number") || "";
  const page = p.get("page") || "1";

  if (provider === "1") {
    if (action === "countries") return "/1466/get%2Bcountries";
    if (action === "numbers")
      return `/1467/get%2Bnumber%2Bby%2Bcountry%2Bid?countryCode=${encodeURIComponent(country || countryId)}`;
    if (action === "messages") {
      const phone = number.replace(/^\+/, "");
      return `/1469/check%2Bsms%2Bhistory?countryCode=${encodeURIComponent(country || countryId)}&phoneNumber=${encodeURIComponent(phone)}`;
    }
  }

  if (provider === "2") {
    if (action === "countries") return "/e-sim/all-countries";
    if (action === "numbers")
      return `/e-sim/country-numbers?countryId=${encodeURIComponent(countryId || country)}`;
    if (action === "messages")
      return `/e-sim/view-messages?countryId=${encodeURIComponent(countryId || country)}&page=${encodeURIComponent(page)}`;
  }

  if (provider === "3") {
    if (action === "countries") return "/countriesList";
    if (action === "numbers")
      return `/countryNumbers?country=${encodeURIComponent(country || countryId)}&page=${encodeURIComponent(page)}`;
    if (action === "messages") {
      const phone = number.startsWith("+") ? number : `+${number}`;
      return `/getMessages?phone=${encodeURIComponent(phone)}`;
    }
  }

  return null;
}

function applyTemplate(template: string, p: URLSearchParams): string {
  // Replace {country} {countryId} {number} {page} placeholders
  const number = p.get("number") || "";
  return template
    .replace(/\{country\}/g, encodeURIComponent(p.get("country") || p.get("countryId") || ""))
    .replace(/\{countryId\}/g, encodeURIComponent(p.get("countryId") || p.get("country") || ""))
    .replace(/\{number\}/g, encodeURIComponent(number))
    .replace(/\{phone\}/g, encodeURIComponent(number.replace(/^\+/, "")))
    .replace(/\{page\}/g, encodeURIComponent(p.get("page") || "1"));
}

export const Route = createFileRoute("/api/public/virtual-number")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),

      GET: async ({ request }) => {
        const url = new URL(request.url);
        const provider = url.searchParams.get("provider") || "";
        const action = url.searchParams.get("action") || "";

        const toolKey = TOOL_KEYS[provider];
        if (!toolKey) return json({ error: "Unknown provider" }, 400);

        // Fetch override (if any)
        let host = DEFAULT_HOSTS[provider];
        let apiKey = process.env.RAPIDAPI_KEY || "";
        let overridePaths: Record<string, string> | null = null;
        try {
          const { data } = await supabaseAdmin
            .from("tool_overrides")
            .select("rapidapi_host, rapidapi_key, paths")
            .eq("tool_key", toolKey)
            .maybeSingle();
          if (data) {
            if (data.rapidapi_host) host = data.rapidapi_host;
            if (data.rapidapi_key) apiKey = data.rapidapi_key;
            if (data.paths && typeof data.paths === "object") {
              overridePaths = data.paths as Record<string, string>;
            }
          }
        } catch (e) {
          console.error("[virtual-number] override fetch failed", e);
        }

        if (!apiKey) return json({ error: "Server missing RAPIDAPI key" }, 500);

        // Health-check: ping the "countries" endpoint (cheapest call) and
        // surface RapidAPI quota headers so the admin UI can warn early.
        if (action === "health") {
          const probePath =
            (overridePaths && overridePaths["countries"]) ||
            defaultPath(provider, "countries", url.searchParams);
          if (!probePath) return json({ status: "unknown", error: "No probe path" }, 200);
          const started = Date.now();
          try {
            const res = await fetch(`https://${host}${probePath}`, {
              headers: { "x-rapidapi-host": host, "x-rapidapi-key": apiKey },
            });
            const latencyMs = Date.now() - started;
            const limit = Number(res.headers.get("x-ratelimit-requests-limit") || res.headers.get("x-ratelimit-limit") || 0);
            const remaining = Number(res.headers.get("x-ratelimit-requests-remaining") || res.headers.get("x-ratelimit-remaining") || 0);
            const reset = res.headers.get("x-ratelimit-requests-reset") || res.headers.get("x-ratelimit-reset") || null;
            const body = await res.text();
            let upstream: unknown = body.slice(0, 400);
            try { upstream = JSON.parse(body); } catch { /* keep text */ }
            const ok = res.ok;
            let status: "ok" | "warn" | "dead" = ok ? "ok" : "dead";
            const pct = limit > 0 ? remaining / limit : null;
            if (ok && ((pct !== null && pct < 0.1) || (limit > 0 && remaining > 0 && remaining < 25))) {
              status = "warn";
            }
            if (ok && limit > 0 && remaining <= 0) status = "dead";
            return json({
              status,
              httpStatus: res.status,
              latencyMs,
              limit: limit || null,
              remaining: limit ? remaining : null,
              reset,
              host,
              upstream: ok ? null : upstream,
            }, 200);
          } catch (e) {
            return json({
              status: "dead",
              httpStatus: 0,
              error: e instanceof Error ? e.message : "Network error",
              host,
            }, 200);
          }
        }

        let path: string | null = null;
        if (overridePaths && typeof overridePaths[action] === "string") {
          path = applyTemplate(overridePaths[action], url.searchParams);
        } else {
          path = defaultPath(provider, action, url.searchParams);
        }
        if (!path) return json({ error: "Unknown action" }, 400);

        try {
          const res = await fetch(`https://${host}${path}`, {
            headers: {
              "x-rapidapi-host": host,
              "x-rapidapi-key": apiKey,
            },
          });
          const text = await res.text();
          let parsed: unknown;
          try {
            parsed = JSON.parse(text);
          } catch {
            parsed = text.slice(0, 800);
          }
          if (!res.ok) {
            return json({ error: "Upstream failed", status: res.status, upstream: parsed }, res.status);
          }
          return json(parsed, 200);
        } catch (e) {
          return json({ error: e instanceof Error ? e.message : "Upstream error" }, 502);
        }
      },
    },
  },
});
