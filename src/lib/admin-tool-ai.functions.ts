// AI-assisted parser for RapidAPI tool snippets (admin Tool Editor).
// Takes any blob of text (cURL, JS, C#, JSON, plain URL) and asks Lovable AI
// to extract host / key / paths.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Parsed = {
  host?: string;
  key?: string;
  paths?: Record<string, string>;
  method?: string;
  notes?: string;
};

export const aiParseToolSnippet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { snippet: string; toolKey?: string; actions?: string[] }) => {
    if (!d || typeof d.snippet !== "string") throw new Error("snippet required");
    if (d.snippet.length > 20000) throw new Error("snippet too large");
    return d;
  })
  .handler(async ({ data, context }) => {
    // Admin only
    const { supabase, userId } = context;
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("admin only");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const actions = (data.actions ?? []).join(", ") || "any relevant endpoint";
    const prompt = `You parse RapidAPI integration snippets (cURL, fetch JS, C#, JSON config, plain URLs). Extract config for a Lovable admin "tool_overrides" record.

Tool key: ${data.toolKey ?? "(unspecified)"}
Expected action names (use these as keys in "paths"): ${actions}

Return STRICT JSON only with this shape (omit keys you cannot find — never guess):
{
  "host": "<x-rapidapi-host value, e.g. foo.p.rapidapi.com>",
  "key":  "<x-rapidapi-key value if present>",
  "paths": { "<action>": "<url path starting with />" },
  "method": "GET|POST|PUT|DELETE|PATCH",
  "notes": "<one short sentence describing what this endpoint does>"
}

Snippet:
"""
${data.snippet}
"""`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You return STRICT JSON only — no markdown, no commentary." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`AI gateway ${res.status}: ${body.slice(0, 300)}`);
    }
    const payload = await res.json();
    const content: string = payload?.choices?.[0]?.message?.content ?? "{}";
    let parsed: Parsed = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      // Try to extract a JSON block
      const m = content.match(/\{[\s\S]*\}/);
      if (m) {
        try { parsed = JSON.parse(m[0]); } catch { /* ignore */ }
      }
    }
    return parsed;
  });
