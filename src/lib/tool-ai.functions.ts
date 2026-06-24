// Tool AI — admin-only: propose, approve, list, run user-generated tools.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { BUILTIN_AI_TOOLS, type SeedTool } from "@/data/aiToolsSeed";

type ToolKind = "ai_prompt" | "ai_image" | "api_call";

async function requireAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase
    .from("user_roles").select("role").eq("user_id", ctx.userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("admin only");
}

// Auto-install code-baked tools into the DB so remixes ship them.
// Cheap: runs once per admin list call; INSERT skips on slug conflict.
async function ensureSeedTools(supabase: any, userId: string) {
  if (BUILTIN_AI_TOOLS.length === 0) return;
  const slugs = BUILTIN_AI_TOOLS.map((t) => t.slug);
  const { data: existing } = await supabase.from("ai_tools").select("slug").in("slug", slugs);
  const have = new Set((existing ?? []).map((r: any) => r.slug));
  const missing = BUILTIN_AI_TOOLS.filter((t) => !have.has(t.slug));
  if (missing.length === 0) return;
  await supabase.from("ai_tools").insert(
    missing.map((t: SeedTool) => ({
      slug: t.slug,
      title: t.title,
      description: t.description,
      icon: t.icon,
      category: t.category,
      kind: t.kind,
      config: t.config,
      status: "approved",
      brief: "seeded from codebase",
      created_by: userId,
    })),
  );
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || `tool-${Date.now()}`;
}

const PROPOSE_SYSTEM = `You are Tool AI — an autonomous tool designer for the Plug platform.
You design small, single-purpose tools that run inside the website. Compose ANY build the admin describes — academic helpers, fun utilities, lookups, generators, converters — choosing the simplest kind that fits.

Pick ONE of three "kind" values and fill the matching config exactly:

1) "ai_prompt" — wraps an LLM call. config:
   { "system_prompt": string,
     "model": "google/gemini-2.5-flash" | "google/gemini-2.5-pro" | "google/gemini-2.5-flash-lite",
     "input_label": string, "input_placeholder": string, "output_format": "markdown"|"plain" }
   Write a STRONG, specific system_prompt — describe persona, exact output shape, length limit, formatting rules. Tell the model to use markdown headings/lists/bold so results render beautifully (never raw JSON unless the user asked for JSON).

2) "ai_image" — generates an image from the user's text. config:
   { "prompt_template": string (use {input} placeholder),
     "input_label": string, "input_placeholder": string }

3) "api_call" — calls a free public REST API. config:
   { "url": string (may use {input}), "method": "GET"|"POST",
     "headers": object, "query_template": object, "body_template": object|null,
     "input_label": string, "input_placeholder": string,
     "result_path": string (dot path into JSON, "" for whole body) }
   Use ONLY free no-auth public APIs (open-meteo, wikipedia, dictionaryapi.dev,
   restcountries, agify.io, genderize.io, nationalize.io, jsonplaceholder, zippopotam.us,
   public CORS-friendly endpoints). Never invent endpoints that need API keys.
   Use "result_path" to drill into the most useful sub-object so the user sees clean data, not the raw envelope. The UI auto-formats objects as labelled cards — return small focused objects, not giant arrays.

Also return: "title" (<= 36 chars), "slug" (kebab),
"description" (<= 120 chars),
"icon" (a lucide-react icon name like Sparkles, Calculator, Globe2, BookA, Languages,
Wand2, Brain, Bot, FileText, Mic, Image, Search, Map, Clock, Quote, Cloud, Sun, Music, Code, Gamepad2, Heart, Star, Zap),
"category": choose "edu" for anything study/academic/learning/research related, otherwise "other" (fun, lifestyle, utilities, entertainment, finance, news, games, image, audio).

Return STRICT JSON only:
{ "title","slug","description","icon","category","kind","config" }`;

export const toolAiPropose = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { brief: string }) => {
    if (!d?.brief || d.brief.length < 4) throw new Error("brief required");
    if (d.brief.length > 4000) throw new Error("brief too long");
    return d;
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: PROPOSE_SYSTEM },
          { role: "user", content: data.brief },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) throw new Error(`AI gateway ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const payload = await res.json();
    const content: string = payload?.choices?.[0]?.message?.content ?? "{}";
    let spec: any = {};
    try { spec = JSON.parse(content); }
    catch { const m = content.match(/\{[\s\S]*\}/); if (m) try { spec = JSON.parse(m[0]); } catch {} }

    const title = String(spec.title || "Untitled tool").slice(0, 60);
    let slug = slugify(spec.slug || title);
    const existing = await context.supabase.from("ai_tools").select("id").eq("slug", slug).maybeSingle();
    if (existing.data) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    const kind: ToolKind = (["ai_prompt", "ai_image", "api_call"].includes(spec.kind) ? spec.kind : "ai_prompt") as ToolKind;

    const row = {
      slug,
      title,
      description: String(spec.description || "").slice(0, 240),
      icon: String(spec.icon || "Sparkles"),
      category: spec.category === "other" ? "other" : "edu",
      kind,
      config: spec.config && typeof spec.config === "object" ? spec.config : {},
      status: "proposed",
      brief: data.brief,
      created_by: context.userId,
    };
    const ins = await context.supabase.from("ai_tools").insert(row).select("*").single();
    if (ins.error) throw new Error(ins.error.message);
    return { tool: ins.data };
  });

export const toolAiList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status?: string } | undefined) => d ?? {})
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    try { await ensureSeedTools(context.supabase, context.userId); } catch (e) { console.error("[tool-ai] seed failed", e); }
    let q = context.supabase.from("ai_tools").select("*").order("created_at", { ascending: false }).limit(100);
    if (data?.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { tools: rows ?? [] };
  });

// Returns a ready-to-paste TS snippet for a single approved tool, so an
// admin can bake it into src/data/aiToolsSeed.ts and have it survive remix.
export const toolAiExport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { data: t, error } = await context.supabase.from("ai_tools").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!t) throw new Error("not found");
    const snippet = `  {\n    slug: ${JSON.stringify(t.slug)},\n    title: ${JSON.stringify(t.title)},\n    description: ${JSON.stringify(t.description ?? "")},\n    icon: ${JSON.stringify(t.icon ?? "Sparkles")},\n    category: ${JSON.stringify(t.category)},\n    kind: ${JSON.stringify(t.kind)},\n    config: ${JSON.stringify(t.config ?? {}, null, 2).replace(/\n/g, "\n    ")},\n  },`;
    return { snippet, slug: t.slug, title: t.title };
  });

export const toolAiSetStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "approved" | "rejected" | "archived" | "proposed" }) => d)
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { error } = await context.supabase.from("ai_tools").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toolAiDelete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { error } = await context.supabase.from("ai_tools").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

function renderTemplate(tpl: any, vars: Record<string, string>): any {
  if (typeof tpl === "string") return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
  if (Array.isArray(tpl)) return tpl.map((v) => renderTemplate(v, vars));
  if (tpl && typeof tpl === "object") {
    const out: any = {};
    for (const k of Object.keys(tpl)) out[k] = renderTemplate(tpl[k], vars);
    return out;
  }
  return tpl;
}

function pluck(obj: any, path: string) {
  if (!path) return obj;
  return path.split(".").reduce((a: any, k: string) => (a == null ? a : a[k]), obj);
}

export const toolAiRun = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string; input: string }) => {
    if (!d?.slug) throw new Error("slug required");
    if (typeof d.input !== "string") throw new Error("input required");
    if (d.input.length > 6000) throw new Error("input too long");
    return d;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: tool, error } = await supabaseAdmin.from("ai_tools").select("*").eq("slug", data.slug).maybeSingle();
    if (error) throw new Error(error.message);
    if (!tool || tool.status !== "approved") throw new Error("tool not available");
    const apiKey = process.env.LOVABLE_API_KEY;

    if (tool.kind === "ai_prompt") {
      if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
      const cfg: any = tool.config || {};
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: cfg.model || "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: cfg.system_prompt || "You are a helpful assistant." },
            { role: "user", content: data.input },
          ],
        }),
      });
      if (!res.ok) throw new Error(`AI gateway ${res.status}`);
      const j = await res.json();
      return { type: "text" as const, text: j?.choices?.[0]?.message?.content ?? "" };
    }

    if (tool.kind === "ai_image") {
      if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
      const cfg: any = tool.config || {};
      const prompt = String(cfg.prompt_template || "{input}").replace(/\{input\}/g, data.input);
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
      });
      if (!res.ok) throw new Error(`AI gateway ${res.status}`);
      const j = await res.json();
      const img = j?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      return { type: "image" as const, url: img, text: j?.choices?.[0]?.message?.content ?? "" };
    }

    // api_call
    const cfg: any = tool.config || {};
    const vars = { input: data.input };
    const url = new URL(renderTemplate(cfg.url, vars));
    const qt = renderTemplate(cfg.query_template || {}, vars);
    for (const [k, v] of Object.entries(qt)) if (v != null && v !== "") url.searchParams.set(k, String(v));
    const init: RequestInit = {
      method: (cfg.method || "GET").toUpperCase(),
      headers: { Accept: "application/json", ...(renderTemplate(cfg.headers || {}, vars) as any) },
    };
    if (init.method === "POST" && cfg.body_template) {
      (init.headers as any)["Content-Type"] = "application/json";
      init.body = JSON.stringify(renderTemplate(cfg.body_template, vars));
    }
    const res = await fetch(url.toString(), init);
    const ct = res.headers.get("content-type") || "";
    const body = ct.includes("json") ? await res.json() : await res.text();
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const picked = typeof body === "object" ? pluck(body, cfg.result_path || "") : body;
    return { type: "json" as const, data: picked };
  });
