// Admin AI — function-calling assistant available only to admins.
// Acts like a co-admin: schedules with second precision, names users it touches,
// and can proactively message the admin via the admin_ai_messages table.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Msg = { role: "user" | "assistant" | "system" | "tool"; content: string; tool_call_id?: string; tool_calls?: any[]; name?: string };

const SYSTEM_PROMPT = `You are Co-Admin — an elite engineering + writing teammate inside StudentsPlug's admin panel. Pro-level coder, technical writer, composer, and operator. You and the admin run the site together.

PRO CRAFT
- Code like a senior: idiomatic, complete, runnable. No "TODO", no stubs. Include imports, packages, build hints.
- Write like a pro: tight prose, real structure, real headings, real examples.
- When the admin uploads images / PDFs / code / docs, READ them carefully and reference specifics.
- The admin can attach up to 25 images plus arbitrary documents in one message. Treat every attachment as primary input — don't ask them to re-describe what's clearly in the file.

FILE CREATION
- Use 'create_text_file' for any text/source file: .java, .kt, .xml, .gradle, .ts, .tsx, .js, .py, .json, .yaml, .html, .css, .md, .txt, .sh, .sql, Dockerfile, etc. Give a clean filename with the right extension.
- Use 'create_pdf' for polished PDFs (reports, notes, contracts). Provide markdown-flavored body; basic # / ## / lists / paragraphs render.
- Use 'create_docx' for Word documents.
- Use 'generate_image' for any "make/draw/design/create an image/poster/banner/illustration of X". The PNG is auto-rendered and downloadable inline. Pick a great prompt with style cues (lighting, mood, composition). Don't ask permission — just generate.
- After creating a file, mention the filename briefly. The download link is rendered automatically.
- If the admin says "make a Java file that does X" — just call create_text_file with filename ending .java and full working code. Don't ask which package name unless truly ambiguous.

VOICE
- Warm, direct, brief. Use the admin's first name when known.
- Suggest next steps after every action. ("Want me to also unblock her?")
- If something looks off (spike in reports, failed job, suspicious signups) — speak up first, don't wait.
- NEVER invent limitations. If a tool exists, use it. If unsure something works, try it and report the real result instead of guessing.

USERS BY NAME
- ALWAYS refer to users by display_name (and @handle / email if helpful), never by raw UUID.
- Before any user-targeted action, use 'find_user' first if you don't already have the id from this turn.
- When you report what you did, include the user's name explicitly ("Removed verification from Maureen Girl").
- When the admin asks about a balance / status / badge, ALWAYS call 'get_user' for fresh data. Never quote stale numbers from earlier in the conversation.

TIME & SCHEDULING
- The scheduler polls every ~1 second, so you can schedule things as soon as ~1–2s out.
- run_at is ISO-8601 UTC with seconds, e.g. 2026-06-05T22:59:30.000Z.
- "in 1 second" => now + 1s. "in 1 minute" => now + 60s. Compute from the current UTC time provided to you.
- If unsure of the time, call 'now_utc' first.
- After scheduling, confirm both relative ("in 10 sec") AND absolute ("at 22:59:40 UTC").
- For RECURRING ("every 1 second", "every minute"), use 'schedule_recurring' with every_seconds (min 1). Add max_runs or repeat_until if the admin specifies a stop condition.
- Recurring 'grant_credits' with NEGATIVE amount works — it's how you drain credits over time. Don't claim it's broken.

CANCELLING JOBS
- "stop the credit drain", "cancel that", "stop it" — call 'list_scheduled', find matching recurring jobs (by action / user / description), then 'cancel_scheduled' for each. Don't ask for the UUID.

LOGS & DEBUGGING
- If the admin asks why something didn't work, call 'list_failed_jobs' for real logs. Do NOT invent log lines or guess errors. If nothing failed, say so.

MESSAGING / GROUPS
- You CAN create DM group chats with 'create_dm_group'. Resolve names → user_ids via 'find_user' first. The admin is auto-included as owner.

BADGES — YOU CAN GRANT ANY OF THEM
- Valid badges: verified, star, legit, sure_plug. Use 'set_badge' for any of them. Never refuse or claim you can't.
- For admin role: 'grant_admin' / 'revoke_admin'. Confirm once for grant_admin (it's powerful), then do it.
- For pending applications in the Applications tab, use 'list_badge_applications' + 'review_badge_application' (approve auto-grants the badge).

REPORTS
- Use 'list_recent_reports' to see pending. 'resolve_report' marks them resolved/dismissed and can optionally take action (delete post, block user) in one call.

MESSAGING USERS
- 'send_dm' sends a direct message from the admin to any user. Use it to warn, congratulate, or follow up on a report.

AUTONOMY (when admin is away)
- If asked to "handle everything" or "do the undone tasks", work through: pending badge applications, pending reports, failed scheduled jobs. Approve obvious ones, flag edge cases via 'post_note_to_admin' for the admin's inbox.

REVERSIBLE FLOWS
- Common pattern: remove X now, schedule add-back in Y minutes. Do both in one turn.

SAFETY
- Confirm before bulk destructive actions (delete many posts, mass-block, grant_admin).
- For single grants/removals/badges, just do it and report.
- Refuse anything outside admin scope (code edits, secrets).

BANNERS (homepage carousel)
- 'add_banner' posts a new slide. If the admin attaches an image, you'll get an 'attached_image_url' line in system context — pass it as image_url.
- 'list_banners' to see all (with ids). Then 'update_banner' for edits (move/stop/repair/change), 'delete_banner' to remove, 'reorder_banners' to rearrange.
- "Move it to position 2" → list_banners → reorder_banners with new id order.
- "Stop showing it" → update_banner with is_active=false.
- "Schedule this banner to post at 6pm" → schedule_action with action='add_banner' and args including image_url.

AI TOOLS (/tools page)
- You CAN add, upgrade, approve, archive, or delete any AI-powered tool on /tools.
- 'list_ai_tools' to see what exists. 'create_ai_tool' to add a new one (status='approved' publishes immediately). 'update_ai_tool' to upgrade prompt/model/icon. 'set_ai_tool_status' to approve/archive. 'delete_ai_tool' to remove.
- For kind='ai_prompt' config use: { model: 'google/gemini-3-flash-preview', system_prompt: '...', user_template: '...' }.

ONLINE / STATS
- "How many people are online?" → call 'dashboard_stats' and report online_count (active in last 5 min) AND total_users. Never claim you can't see it.

FORMAT
- Markdown, terse. No lectures. Never say "I can't" when a tool exists — try it.`;

const TOOLS = [
  { type: "function", function: { name: "now_utc", description: "Get the current UTC timestamp as ISO-8601 with seconds. Call this whenever you need to schedule something.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "find_user", description: "Search users by display name, email, or UUID. Returns up to 10 matches with display_name + email.", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } } },
  { type: "function", function: { name: "set_user_status", description: "Block, deactivate, or reactivate a user.", parameters: { type: "object", properties: { user_id: { type: "string" }, status: { type: "string", enum: ["active", "blocked", "deactivated"] } }, required: ["user_id", "status"] } } },
  { type: "function", function: { name: "set_user_rank", description: "Set a user's rank. tier: newbie|normal|active|legend|pro|sure_plug, step 1-5.", parameters: { type: "object", properties: { user_id: { type: "string" }, tier: { type: "string" }, step: { type: "integer" } }, required: ["user_id", "tier", "step"] } } },
  { type: "function", function: { name: "set_badge", description: "Grant or revoke a badge. badge: verified|star|legit|sure_plug.", parameters: { type: "object", properties: { user_id: { type: "string" }, badge: { type: "string" }, value: { type: "boolean" } }, required: ["user_id", "badge", "value"] } } },
  { type: "function", function: { name: "grant_credits", description: "Add (positive) or remove (negative) credits from a user.", parameters: { type: "object", properties: { user_id: { type: "string" }, amount: { type: "integer" }, reason: { type: "string" } }, required: ["user_id", "amount"] } } },
  { type: "function", function: { name: "delete_post", description: "Delete a post by id.", parameters: { type: "object", properties: { post_id: { type: "string" } }, required: ["post_id"] } } },
  { type: "function", function: { name: "delete_comment", description: "Delete a comment by id.", parameters: { type: "object", properties: { comment_id: { type: "string" } }, required: ["comment_id"] } } },
  { type: "function", function: { name: "delete_listing", description: "Delete a marketplace listing by id.", parameters: { type: "object", properties: { listing_id: { type: "string" } }, required: ["listing_id"] } } },
  { type: "function", function: { name: "create_coupon", description: "Create a redeemable coupon.", parameters: { type: "object", properties: { code: { type: "string" }, reward_credits: { type: "integer" }, max_uses: { type: "integer" } }, required: ["code", "reward_credits"] } } },
  { type: "function", function: { name: "add_banner", description: "Add a homepage banner slide. If the admin attached an image in this turn, the data URL is provided to you as 'attached_image_url' in the system context — pass it as image_url.", parameters: { type: "object", properties: { title: { type: "string" }, subtitle: { type: "string" }, image_url: { type: "string" }, link_url: { type: "string" }, sort_order: { type: "integer" } }, required: ["title"] } } },
  { type: "function", function: { name: "list_banners", description: "List ALL homepage banners (active and inactive) with id, title, sort_order, is_active, image_url. Use before update_banner / delete_banner / reorder_banners.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "update_banner", description: "Update an existing banner. Pass only the fields to change. Use to move (sort_order), stop (is_active=false), repair/change (title, subtitle, image_url, link_url).", parameters: { type: "object", properties: { id: { type: "string" }, title: { type: "string" }, subtitle: { type: "string" }, image_url: { type: "string" }, link_url: { type: "string" }, sort_order: { type: "integer" }, is_active: { type: "boolean" } }, required: ["id"] } } },
  { type: "function", function: { name: "delete_banner", description: "Permanently delete a banner by id.", parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } } },
  { type: "function", function: { name: "reorder_banners", description: "Reorder banners. Pass an array of ids in the desired display order (first = leftmost).", parameters: { type: "object", properties: { ordered_ids: { type: "array", items: { type: "string" } } }, required: ["ordered_ids"] } } },
  { type: "function", function: { name: "dashboard_stats", description: "Read overall site stats including online_count (users active in last 5 min), signups_today, signups_7d, totals, pending reports/applications, rank distribution, recent logins, recent signups. ALWAYS use this to answer 'how many people are online'.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "list_recent_reports", description: "List pending user reports.", parameters: { type: "object", properties: { limit: { type: "integer" } } } } },
  { type: "function", function: { name: "schedule_action", description: "Schedule a ONE-TIME action at a future ISO-8601 UTC timestamp (with seconds). Resolution ~1s.", parameters: { type: "object", properties: { run_at: { type: "string" }, action: { type: "string" }, args: { type: "object" }, note: { type: "string" } }, required: ["run_at", "action", "args"] } } },
  { type: "function", function: { name: "schedule_recurring", description: "Schedule a RECURRING action that fires every N seconds starting at start_at. Use this for 'every 1 second', 'every 10 seconds', 'every minute'. Optional max_runs caps total executions; optional repeat_until is an ISO-8601 UTC end time. Minimum interval 1 second.", parameters: { type: "object", properties: { start_at: { type: "string", description: "ISO-8601 UTC start time. Use now+interval for 'starting in N seconds'." }, every_seconds: { type: "integer", description: "Interval between runs, in seconds. Min 1." }, action: { type: "string" }, args: { type: "object" }, max_runs: { type: "integer", description: "Optional cap on total runs." }, repeat_until: { type: "string", description: "Optional ISO-8601 UTC end time." }, note: { type: "string" } }, required: ["start_at", "every_seconds", "action", "args"] } } },
  { type: "function", function: { name: "list_scheduled", description: "List upcoming scheduled actions.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "cancel_scheduled", description: "Cancel a scheduled action by id.", parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } } },
  { type: "function", function: { name: "cancel_jobs_matching", description: "Cancel ALL pending scheduled jobs that match a filter. Use when admin says 'stop the credit drain' or 'cancel everything for user X'. Returns count cancelled.", parameters: { type: "object", properties: { action: { type: "string", description: "e.g. 'grant_credits' to cancel all credit jobs" }, user_id: { type: "string", description: "Only cancel jobs whose args.user_id matches" }, only_recurring: { type: "boolean", description: "If true, only cancel recurring jobs" } } } } },
  { type: "function", function: { name: "get_user", description: "Get fresh full details for a single user (balance, status, badges, rank). Use this BEFORE quoting numbers to the admin.", parameters: { type: "object", properties: { user_id: { type: "string" } }, required: ["user_id"] } } },
  { type: "function", function: { name: "list_failed_jobs", description: "Read real failure logs for scheduled jobs. Returns recent failed jobs with their action, args, and error message. Use this when admin asks 'why didn't it work' or 'show me the logs'.", parameters: { type: "object", properties: { limit: { type: "integer" } } } } },
  { type: "function", function: { name: "create_dm_group", description: "Create a DM group chat. The admin is automatically the owner. Pass member user_ids (resolved via find_user).", parameters: { type: "object", properties: { name: { type: "string" }, member_user_ids: { type: "array", items: { type: "string" } } }, required: ["name", "member_user_ids"] } } },
  { type: "function", function: { name: "recent_signups", description: "List N most recent signups with name, email, created_at.", parameters: { type: "object", properties: { limit: { type: "integer" } } } } },
  { type: "function", function: { name: "grant_admin", description: "Promote a user to admin role. Confirm with the admin first since it's powerful.", parameters: { type: "object", properties: { user_id: { type: "string" } }, required: ["user_id"] } } },
  { type: "function", function: { name: "revoke_admin", description: "Remove admin role from a user.", parameters: { type: "object", properties: { user_id: { type: "string" } }, required: ["user_id"] } } },
  { type: "function", function: { name: "list_badge_applications", description: "List pending badge applications.", parameters: { type: "object", properties: { limit: { type: "integer" } } } } },
  { type: "function", function: { name: "review_badge_application", description: "Approve or reject a pending badge application. Approve auto-grants the badge to the applicant.", parameters: { type: "object", properties: { application_id: { type: "string" }, decision: { type: "string", enum: ["approved", "rejected"] } }, required: ["application_id", "decision"] } } },
  { type: "function", function: { name: "resolve_report", description: "Mark a user report as resolved or dismissed. Optionally also delete the reported content or block the reported user in one call.", parameters: { type: "object", properties: { report_id: { type: "string" }, decision: { type: "string", enum: ["resolved", "dismissed"] }, also_delete_content: { type: "boolean" }, also_block_user: { type: "boolean" } }, required: ["report_id", "decision"] } } },
  { type: "function", function: { name: "send_dm", description: "Send a direct message from the admin to a single user.", parameters: { type: "object", properties: { user_id: { type: "string" }, body: { type: "string" } }, required: ["user_id", "body"] } } },
  { type: "function", function: { name: "post_note_to_admin", description: "Drop a note into the admin's own AI inbox (for follow-ups, things you flagged but didn't action).", parameters: { type: "object", properties: { body: { type: "string" } }, required: ["body"] } } },
  { type: "function", function: { name: "list_ai_tools", description: "List all AI tools on /tools (any status). Returns id, slug, title, category, kind, status, description.", parameters: { type: "object", properties: { status: { type: "string", enum: ["proposed","approved","rejected","archived"] } } } } },
  { type: "function", function: { name: "create_ai_tool", description: "Create a new AI-powered tool that appears on /tools when status=approved. kind: ai_prompt (chat completion), ai_image (image gen), api_call (external API). config is a JSON object with kind-specific keys (e.g. { model, system_prompt, user_template } for ai_prompt). Pass status='approved' to publish immediately.", parameters: { type: "object", properties: { slug: { type: "string" }, title: { type: "string" }, description: { type: "string" }, icon: { type: "string", description: "lucide-react icon name, e.g. Sparkles, BookOpen, Brain" }, category: { type: "string" }, kind: { type: "string", enum: ["ai_prompt","ai_image","api_call"] }, config: { type: "object" }, status: { type: "string", enum: ["proposed","approved"] }, brief: { type: "string" } }, required: ["slug","title","kind"] } } },
  { type: "function", function: { name: "update_ai_tool", description: "Upgrade or edit an existing AI tool. Pass id (or slug) plus any fields to change (title, description, icon, category, config, brief). Use to improve prompts, swap models, fix icons.", parameters: { type: "object", properties: { id: { type: "string" }, slug: { type: "string" }, title: { type: "string" }, description: { type: "string" }, icon: { type: "string" }, category: { type: "string" }, config: { type: "object" }, brief: { type: "string" } } } } },
  { type: "function", function: { name: "set_ai_tool_status", description: "Approve, reject, or archive an AI tool. approved = visible on /tools.", parameters: { type: "object", properties: { id: { type: "string" }, slug: { type: "string" }, status: { type: "string", enum: ["proposed","approved","rejected","archived"] } }, required: ["status"] } } },
  { type: "function", function: { name: "delete_ai_tool", description: "Permanently delete an AI tool by id or slug.", parameters: { type: "object", properties: { id: { type: "string" }, slug: { type: "string" } } } } },
  { type: "function", function: { name: "create_text_file", description: "Create any text-based file (source code, config, markup) the admin can download. Use for .java, .kt, .xml, .gradle, .ts, .tsx, .js, .py, .json, .yaml, .html, .css, .md, .txt, .sh, .sql, Dockerfile, etc. Write COMPLETE working content — no placeholders.", parameters: { type: "object", properties: { filename: { type: "string", description: "Filename including extension, e.g. MainActivity.kt" }, content: { type: "string", description: "Full file contents." } }, required: ["filename", "content"] } } },
  { type: "function", function: { name: "create_pdf", description: "Generate a downloadable PDF. Body accepts simple markdown: # H1, ## H2, ### H3, paragraphs, blank lines. Use for reports, notes, briefs, contracts.", parameters: { type: "object", properties: { filename: { type: "string" }, title: { type: "string" }, body: { type: "string", description: "Markdown-flavored body." } }, required: ["filename", "body"] } } },
  { type: "function", function: { name: "create_docx", description: "Generate a downloadable Microsoft Word (.docx) document. Body accepts simple markdown.", parameters: { type: "object", properties: { filename: { type: "string" }, title: { type: "string" }, body: { type: "string" } }, required: ["filename", "body"] } } },
  { type: "function", function: { name: "generate_image", description: "Generate a brand-new image from a text prompt using Gemini Nano Banana. Returns a downloadable PNG. Use for mockups, illustrations, banner art, infographics, social posts. The image is auto-rendered inline in the admin chat with a download chip.", parameters: { type: "object", properties: { prompt: { type: "string", description: "Detailed image description." }, filename: { type: "string", description: "Optional filename (defaults to image.png)." } }, required: ["prompt"] } } },
];

async function uploadGeneratedFile(userId: string, filename: string, bytes: Buffer | Uint8Array, mime: string): Promise<{ url: string; filename: string; size: number; mime: string }> {
  const safe = filename.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "file";
  const path = `admin-ai/files/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
  const { error } = await supabaseAdmin.storage.from("banners").upload(path, bytes, { contentType: mime, upsert: false });
  if (error) throw error;
  const { data, error: sErr } = await supabaseAdmin.storage.from("banners").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
  if (sErr) throw sErr;
  return { url: data.signedUrl, filename: safe, size: bytes.byteLength, mime };
}

function mimeForFilename(name: string): string {
  const ext = name.toLowerCase().split(".").pop() || "";
  const map: Record<string, string> = {
    java: "text/x-java-source", kt: "text/x-kotlin", kts: "text/x-kotlin",
    xml: "application/xml", gradle: "text/plain", properties: "text/plain",
    ts: "text/typescript", tsx: "text/typescript", js: "text/javascript", jsx: "text/javascript",
    py: "text/x-python", rb: "text/x-ruby", go: "text/x-go", rs: "text/x-rust",
    c: "text/x-c", cpp: "text/x-c++", h: "text/x-c", hpp: "text/x-c++",
    cs: "text/x-csharp", swift: "text/x-swift", php: "application/x-httpd-php",
    json: "application/json", yaml: "text/yaml", yml: "text/yaml", toml: "text/plain",
    html: "text/html", htm: "text/html", css: "text/css", scss: "text/css",
    md: "text/markdown", txt: "text/plain", sh: "application/x-sh", bash: "application/x-sh",
    sql: "application/sql", env: "text/plain", dockerfile: "text/plain",
    csv: "text/csv", svg: "image/svg+xml",
  };
  return map[ext] ?? "text/plain";
}

async function nameFor(userId: string): Promise<{ id: string; display_name: string | null; email: string | null } | null> {
  const { data } = await supabaseAdmin.from("profiles").select("id,display_name,email").eq("id", userId).maybeSingle();
  return data ?? null;
}

export async function executeAdminTool(name: string, args: any, actingUserId: string): Promise<any> {
  switch (name) {
    case "now_utc": {
      const d = new Date();
      return { iso: d.toISOString(), epoch_ms: d.getTime(), human: d.toUTCString() };
    }
    case "find_user": {
      const q = String(args.query ?? "").trim();
      const isUuid = /^[0-9a-f-]{36}$/i.test(q);
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("id,display_name,email,status,rank_tier,credits,is_verified")
        .or(`display_name.ilike.%${q}%,email.ilike.%${q}%,id.eq.${isUuid ? q : "00000000-0000-0000-0000-000000000000"}`)
        .limit(10);
      if (error) throw error;
      return { matches: data };
    }
    case "set_user_status": {
      const { error } = await supabaseAdmin.from("profiles").update({ status: args.status }).eq("id", args.user_id);
      if (error) throw error;
      const u = await nameFor(args.user_id);
      return { ok: true, user: u, status: args.status };
    }
    case "set_user_rank": {
      const { error } = await supabaseAdmin.from("profiles").update({ rank_tier: args.tier, rank_step: args.step }).eq("id", args.user_id);
      if (error) throw error;
      const u = await nameFor(args.user_id);
      return { ok: true, user: u, tier: args.tier, step: args.step };
    }
    case "set_badge": {
      const col = ({ verified: "is_verified", star: "is_star", legit: "is_legit", sure_plug: "is_sure_plug" } as any)[args.badge];
      if (!col) throw new Error("unknown badge");
      const { error } = await supabaseAdmin.from("profiles").update({ [col]: !!args.value } as any).eq("id", args.user_id);
      if (error) throw error;
      const u = await nameFor(args.user_id);
      return { ok: true, user: u, badge: args.badge, value: !!args.value };
    }
    case "grant_credits": {
      const { data: row } = await supabaseAdmin.from("profiles").select("credits,display_name,email").eq("id", args.user_id).maybeSingle();
      if (!row) throw new Error("user not found");
      const newBal = (row.credits ?? 0) + Number(args.amount);
      const { error } = await supabaseAdmin.from("profiles").update({ credits: newBal }).eq("id", args.user_id);
      if (error) throw error;
      await supabaseAdmin.from("credit_transactions").insert({ user_id: args.user_id, amount: Number(args.amount), reason: args.reason ?? "admin_ai_grant", balance_after: newBal, metadata: { by: actingUserId, via: "admin_ai" } });
      return { ok: true, user: { id: args.user_id, display_name: row.display_name, email: row.email }, amount: Number(args.amount), balance: newBal };
    }
    case "delete_post": {
      const { error } = await supabaseAdmin.from("posts").delete().eq("id", args.post_id);
      if (error) throw error; return { ok: true };
    }
    case "delete_comment": {
      const { error } = await supabaseAdmin.from("post_comments").delete().eq("id", args.comment_id);
      if (error) throw error; return { ok: true };
    }
    case "delete_listing": {
      const { error } = await supabaseAdmin.from("market_listings").delete().eq("id", args.listing_id);
      if (error) throw error; return { ok: true };
    }
    case "create_coupon": {
      const { data, error } = await supabaseAdmin.from("coupons").insert({ code: String(args.code).toUpperCase(), reward_credits: args.reward_credits ?? 0, max_uses: args.max_uses ?? null, is_active: true }).select().single();
      if (error) throw error; return { ok: true, coupon: data };
    }
    case "add_banner": {
      const { data: maxRow } = await supabaseAdmin.from("banner_slides").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
      const nextOrder = (maxRow?.sort_order ?? -1) + 1;
      const { data, error } = await supabaseAdmin.from("banner_slides").insert({ title: args.title, subtitle: args.subtitle ?? null, image_url: args.image_url ?? null, link_url: args.link_url ?? null, sort_order: args.sort_order ?? nextOrder, is_active: true }).select().single();
      if (error) throw error; return { ok: true, banner: data };
    }
    case "list_banners": {
      const { data, error } = await supabaseAdmin.from("banner_slides").select("id,title,subtitle,image_url,link_url,sort_order,is_active,created_at").order("sort_order", { ascending: true });
      if (error) throw error; return { banners: data, count: data?.length ?? 0 };
    }
    case "update_banner": {
      const { id, ...patch } = args;
      const clean: any = {};
      for (const k of ["title","subtitle","image_url","link_url","sort_order","is_active"]) if (patch[k] !== undefined) clean[k] = patch[k];
      const { data, error } = await supabaseAdmin.from("banner_slides").update(clean).eq("id", id).select().single();
      if (error) throw error; return { ok: true, banner: data };
    }
    case "delete_banner": {
      const { error } = await supabaseAdmin.from("banner_slides").delete().eq("id", args.id);
      if (error) throw error; return { ok: true };
    }
    case "reorder_banners": {
      const ids: string[] = args.ordered_ids ?? [];
      for (let i = 0; i < ids.length; i++) {
        await supabaseAdmin.from("banner_slides").update({ sort_order: i }).eq("id", ids[i]);
      }
      return { ok: true, reordered: ids.length };
    }
    case "dashboard_stats": {
      const { data, error } = await supabaseAdmin.rpc("admin_dashboard_stats");
      if (error) {
        // fallback
        const [users, posts, listings, pending, online] = await Promise.all([
          supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
          supabaseAdmin.from("posts").select("id", { count: "exact", head: true }),
          supabaseAdmin.from("market_listings").select("id", { count: "exact", head: true }),
          supabaseAdmin.from("user_reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
          supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).gte("last_seen_at", new Date(Date.now() - 5*60*1000).toISOString()),
        ]);
        return { total_users: users.count, total_posts: posts.count, total_listings: listings.count, pending_reports: pending.count, online_count: online.count };
      }
      return data;
    }

    case "list_recent_reports": {
      const { data, error } = await supabaseAdmin.from("user_reports").select("*").eq("status", "pending").order("created_at", { ascending: false }).limit(args.limit ?? 10);
      if (error) throw error; return { reports: data };
    }
    case "schedule_action": {
      const { data, error } = await supabaseAdmin.from("scheduled_admin_actions").insert({
        created_by: actingUserId, action: args.action, args: args.args ?? {}, run_at: args.run_at, note: args.note ?? null,
      }).select().single();
      if (error) throw error;
      return { ok: true, id: data.id, scheduled_for: data.run_at };
    }
    case "schedule_recurring": {
      const every = Math.max(1, Number(args.every_seconds));
      const { data, error } = await supabaseAdmin.from("scheduled_admin_actions").insert({
        created_by: actingUserId,
        action: args.action,
        args: args.args ?? {},
        run_at: args.start_at,
        repeat_every_seconds: every,
        max_runs: args.max_runs ?? null,
        repeat_until: args.repeat_until ?? null,
        note: args.note ?? null,
      }).select().single();
      if (error) throw error;
      return { ok: true, id: data.id, first_run_at: data.run_at, every_seconds: every, max_runs: args.max_runs ?? null, repeat_until: args.repeat_until ?? null };
    }
    case "list_scheduled": {
      const { data, error } = await supabaseAdmin.from("scheduled_admin_actions").select("id,action,args,run_at,status,note,repeat_every_seconds,run_count,max_runs,repeat_until").eq("status", "pending").order("run_at", { ascending: true }).limit(50);
      if (error) throw error; return { scheduled: data };
    }
    case "cancel_scheduled": {
      const { error } = await supabaseAdmin.from("scheduled_admin_actions").update({ status: "cancelled" }).eq("id", args.id);
      if (error) throw error; return { ok: true };
    }
    case "cancel_jobs_matching": {
      let q = supabaseAdmin.from("scheduled_admin_actions").select("id,action,args,repeat_every_seconds").eq("status", "pending");
      if (args.action) q = q.eq("action", args.action);
      if (args.only_recurring) q = q.not("repeat_every_seconds", "is", null);
      const { data: rows, error } = await q.limit(200);
      if (error) throw error;
      const filtered = (rows ?? []).filter((r: any) => !args.user_id || r.args?.user_id === args.user_id);
      if (filtered.length === 0) return { ok: true, cancelled: 0, jobs: [] };
      const ids = filtered.map((r: any) => r.id);
      const { error: uerr } = await supabaseAdmin.from("scheduled_admin_actions").update({ status: "cancelled" }).in("id", ids);
      if (uerr) throw uerr;
      return { ok: true, cancelled: ids.length, jobs: filtered.map((r: any) => ({ id: r.id, action: r.action, args: r.args, recurring: !!r.repeat_every_seconds })) };
    }
    case "get_user": {
      const { data, error } = await supabaseAdmin.from("profiles").select("id,display_name,email,status,rank_tier,rank_step,credits,is_verified,is_star,is_legit,is_sure_plug,created_at,last_seen_at").eq("id", args.user_id).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("user not found");
      return { user: data };
    }
    case "list_failed_jobs": {
      const { data, error } = await supabaseAdmin.from("scheduled_admin_actions").select("id,action,args,run_at,executed_at,error,run_count,repeat_every_seconds").eq("status", "failed").order("executed_at", { ascending: false }).limit(args.limit ?? 10);
      if (error) throw error;
      return { failed: data, count: data?.length ?? 0 };
    }
    case "create_dm_group": {
      const members: string[] = Array.from(new Set([actingUserId, ...(args.member_user_ids ?? [])]));
      const { data: tid, error: rpcErr } = await supabaseAdmin.rpc("create_dm_group", { _name: args.name, _member_ids: members });
      if (rpcErr) {
        // Fallback: direct insert (rpc uses auth.uid() which is null for service role)
        const { data: thread, error: terr } = await supabaseAdmin.from("dm_threads").insert({ is_group: true, name: args.name, owner_id: actingUserId, last_message_at: new Date().toISOString() }).select().single();
        if (terr) throw terr;
        const rows = members.map((uid) => ({ thread_id: thread.id, user_id: uid, role: uid === actingUserId ? "admin" : "member" }));
        const { error: merr } = await supabaseAdmin.from("dm_thread_members").insert(rows);
        if (merr) throw merr;
        return { ok: true, thread_id: thread.id, name: args.name, members: members.length };
      }
      return { ok: true, thread_id: tid, name: args.name, members: members.length };
    }
    case "recent_signups": {
      const { data, error } = await supabaseAdmin.from("profiles").select("id,display_name,email,created_at").order("created_at", { ascending: false }).limit(args.limit ?? 10);
      if (error) throw error;
      return { signups: data };
    }
    case "grant_admin": {
      const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: args.user_id, role: "admin" });
      if (error && !String(error.message).includes("duplicate")) throw error;
      const u = await nameFor(args.user_id);
      return { ok: true, user: u, role: "admin" };
    }
    case "revoke_admin": {
      const { error } = await supabaseAdmin.from("user_roles").delete().eq("user_id", args.user_id).eq("role", "admin");
      if (error) throw error;
      const u = await nameFor(args.user_id);
      return { ok: true, user: u };
    }
    case "list_badge_applications": {
      const { data, error } = await supabaseAdmin.from("badge_applications").select("id,user_id,badge,reason,reg_number,contact,status,created_at").eq("status", "pending").order("created_at", { ascending: true }).limit(args.limit ?? 20);
      if (error) throw error;
      const ids = Array.from(new Set((data ?? []).map((r: any) => r.user_id)));
      const { data: profs } = ids.length ? await supabaseAdmin.from("profiles").select("id,display_name,email").in("id", ids) : { data: [] as any[] };
      const byId = new Map((profs ?? []).map((p: any) => [p.id, p]));
      return { applications: (data ?? []).map((r: any) => ({ ...r, user: byId.get(r.user_id) ?? null })) };
    }
    case "review_badge_application": {
      const { data: app, error: gerr } = await supabaseAdmin.from("badge_applications").select("*").eq("id", args.application_id).maybeSingle();
      if (gerr || !app) throw new Error("application not found");
      const status = args.decision === "approved" ? "approved" : "rejected";
      const { error: uerr } = await supabaseAdmin.from("badge_applications").update({ status, reviewed_at: new Date().toISOString() }).eq("id", args.application_id);
      if (uerr) throw uerr;
      let granted: any = null;
      if (status === "approved") {
        const col = ({ verified: "is_verified", star: "is_star", legit: "is_legit", sure_plug: "is_sure_plug" } as any)[app.badge];
        if (col) {
          await supabaseAdmin.from("profiles").update({ [col]: true } as any).eq("id", app.user_id);
          granted = app.badge;
        }
      }
      const u = await nameFor(app.user_id);
      return { ok: true, decision: status, badge_granted: granted, user: u };
    }
    case "resolve_report": {
      const { data: rep, error: gerr } = await supabaseAdmin.from("user_reports").select("*").eq("id", args.report_id).maybeSingle();
      if (gerr || !rep) throw new Error("report not found");
      const status = args.decision === "resolved" ? "resolved" : "dismissed";
      const { error: uerr } = await supabaseAdmin.from("user_reports").update({ status, reviewed_at: new Date().toISOString() }).eq("id", args.report_id);
      if (uerr) throw uerr;
      const sideEffects: string[] = [];
      if (args.also_delete_content) {
        if (rep.target_post_id) { await supabaseAdmin.from("posts").delete().eq("id", rep.target_post_id); sideEffects.push("post deleted"); }
        if (rep.target_listing_id) { await supabaseAdmin.from("market_listings").delete().eq("id", rep.target_listing_id); sideEffects.push("listing deleted"); }
      }
      if (args.also_block_user && rep.target_user_id) {
        await supabaseAdmin.from("profiles").update({ status: "blocked" }).eq("id", rep.target_user_id);
        sideEffects.push("user blocked");
      }
      return { ok: true, decision: status, side_effects: sideEffects };
    }
    case "send_dm": {
      // Find or create a 1:1 thread between admin and target.
      // IMPORTANT: 1:1 threads MUST set user_a/user_b — the chat list queries
      // dm_threads via .or(user_a.eq.me,user_b.eq.me). Without those columns
      // the recipient's chat list won't show the thread even though the
      // unread badge counts it via memberships (invisible-unread bug).
      const a = actingUserId < args.user_id ? actingUserId : args.user_id;
      const b = actingUserId < args.user_id ? args.user_id : actingUserId;
      const { data: existing } = await supabaseAdmin
        .from("dm_threads")
        .select("id")
        .eq("is_group", false)
        .eq("user_a", a)
        .eq("user_b", b)
        .maybeSingle();
      let threadId: string | null = existing?.id ?? null;
      if (!threadId) {
        const { data: t, error: terr } = await supabaseAdmin
          .from("dm_threads")
          .insert({ is_group: false, user_a: a, user_b: b, owner_id: actingUserId, last_message_at: new Date().toISOString() })
          .select()
          .single();
        if (terr) throw terr;
        threadId = t.id;
        await supabaseAdmin.from("dm_thread_members").insert([
          { thread_id: threadId, user_id: actingUserId, role: "admin" },
          { thread_id: threadId, user_id: args.user_id, role: "member" },
        ]).then(() => {}, () => {});
      }
      const { error: merr } = await supabaseAdmin.from("dm_messages").insert({ thread_id: threadId, sender_id: actingUserId, body: String(args.body) });
      if (merr) throw merr;
      await supabaseAdmin.from("dm_threads").update({ last_message_at: new Date().toISOString() }).eq("id", threadId);
      const u = await nameFor(args.user_id);
      return { ok: true, thread_id: threadId, user: u };
    }
    case "post_note_to_admin": {
      await postAiMessage(actingUserId, String(args.body), { kind: "self_note" });
      return { ok: true };
    }
    case "list_ai_tools": {
      let q = supabaseAdmin.from("ai_tools").select("id,slug,title,description,icon,category,kind,status,brief,updated_at").order("updated_at", { ascending: false });
      if (args.status) q = q.eq("status", args.status);
      const { data, error } = await q.limit(200);
      if (error) throw error;
      return { tools: data, count: data?.length ?? 0 };
    }
    case "create_ai_tool": {
      const row = {
        slug: String(args.slug).toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
        title: String(args.title),
        description: args.description ?? "",
        icon: args.icon ?? "Sparkles",
        category: args.category ?? "edu",
        kind: args.kind,
        config: args.config ?? {},
        status: args.status ?? "approved",
        brief: args.brief ?? null,
        created_by: actingUserId,
      };
      const { data, error } = await supabaseAdmin.from("ai_tools").insert(row).select().single();
      if (error) throw error;
      return { ok: true, tool: data };
    }
    case "update_ai_tool": {
      const patch: any = {};
      for (const k of ["title","description","icon","category","config","brief"]) if (args[k] !== undefined) patch[k] = args[k];
      if (Object.keys(patch).length === 0) throw new Error("nothing to update");
      let q = supabaseAdmin.from("ai_tools").update(patch);
      if (args.id) q = q.eq("id", args.id);
      else if (args.slug) q = q.eq("slug", args.slug);
      else throw new Error("id or slug required");
      const { data, error } = await q.select().single();
      if (error) throw error;
      return { ok: true, tool: data };
    }
    case "set_ai_tool_status": {
      let q = supabaseAdmin.from("ai_tools").update({ status: args.status });
      if (args.id) q = q.eq("id", args.id);
      else if (args.slug) q = q.eq("slug", args.slug);
      else throw new Error("id or slug required");
      const { data, error } = await q.select().single();
      if (error) throw error;
      return { ok: true, tool: data };
    }
    case "delete_ai_tool": {
      let q = supabaseAdmin.from("ai_tools").delete();
      if (args.id) q = q.eq("id", args.id);
      else if (args.slug) q = q.eq("slug", args.slug);
      else throw new Error("id or slug required");
      const { error } = await q;
      if (error) throw error;
      return { ok: true };
    }
    case "create_text_file": {
      const filename = String(args.filename || "file.txt");
      const content = String(args.content ?? "");
      const mime = mimeForFilename(filename);
      const out = await uploadGeneratedFile(actingUserId, filename, Buffer.from(content, "utf8"), mime);
      return { ok: true, file_url: out.url, filename: out.filename, size: out.size, mime };
    }
    case "create_pdf": {
      const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
      const pdf = await PDFDocument.create();
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
      const margin = 50;
      const pageWidth = 595;
      const pageHeight = 842;
      const maxWidth = pageWidth - margin * 2;
      let page = pdf.addPage([pageWidth, pageHeight]);
      let y = pageHeight - margin;
      const wrap = (text: string, f: any, size: number) => {
        const words = text.split(/\s+/);
        const lines: string[] = [];
        let cur = "";
        for (const w of words) {
          const trial = cur ? cur + " " + w : w;
          if (f.widthOfTextAtSize(trial, size) > maxWidth) { if (cur) lines.push(cur); cur = w; }
          else cur = trial;
        }
        if (cur) lines.push(cur);
        return lines;
      };
      const drawLine = (text: string, f: any, size: number, gap = 4) => {
        if (y - size < margin) { page = pdf.addPage([pageWidth, pageHeight]); y = pageHeight - margin; }
        page.drawText(text, { x: margin, y: y - size, size, font: f, color: rgb(0.1, 0.1, 0.12) });
        y -= size + gap;
      };
      if (args.title) { for (const ln of wrap(String(args.title), bold, 22)) drawLine(ln, bold, 22, 8); y -= 6; }
      const body = String(args.body ?? "");
      for (const raw of body.split(/\n/)) {
        const line = raw.replace(/\r$/, "");
        if (!line.trim()) { y -= 8; continue; }
        let f = font, size = 11, txt = line;
        if (/^###\s+/.test(line)) { f = bold; size = 13; txt = line.replace(/^###\s+/, ""); }
        else if (/^##\s+/.test(line)) { f = bold; size = 15; txt = line.replace(/^##\s+/, ""); }
        else if (/^#\s+/.test(line)) { f = bold; size = 18; txt = line.replace(/^#\s+/, ""); }
        else if (/^[-*]\s+/.test(line)) { txt = "• " + line.replace(/^[-*]\s+/, ""); }
        for (const ln of wrap(txt, f, size)) drawLine(ln, f, size, 3);
      }
      const bytes = await pdf.save();
      const filename = String(args.filename || "document.pdf");
      const out = await uploadGeneratedFile(actingUserId, filename.endsWith(".pdf") ? filename : filename + ".pdf", bytes, "application/pdf");
      return { ok: true, file_url: out.url, filename: out.filename, size: out.size, mime: "application/pdf" };
    }
    case "create_docx": {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");
      const children: any[] = [];
      if (args.title) children.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: String(args.title), bold: true })] }));
      const body = String(args.body ?? "");
      for (const raw of body.split(/\n/)) {
        const line = raw.replace(/\r$/, "");
        if (!line.trim()) { children.push(new Paragraph("")); continue; }
        if (/^###\s+/.test(line)) children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, text: line.replace(/^###\s+/, "") }));
        else if (/^##\s+/.test(line)) children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, text: line.replace(/^##\s+/, "") }));
        else if (/^#\s+/.test(line)) children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, text: line.replace(/^#\s+/, "") }));
        else if (/^[-*]\s+/.test(line)) children.push(new Paragraph({ text: line.replace(/^[-*]\s+/, ""), bullet: { level: 0 } }));
        else children.push(new Paragraph({ children: [new TextRun(line)] }));
      }
      const doc = new Document({ sections: [{ children }] });
      const bytes = await Packer.toBuffer(doc);
      const filename = String(args.filename || "document.docx");
      const out = await uploadGeneratedFile(actingUserId, filename.endsWith(".docx") ? filename : filename + ".docx", bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      return { ok: true, file_url: out.url, filename: out.filename, size: out.size, mime: out.mime };
    }
    case "generate_image": {
      const apiKey = process.env.LOVABLE_API_KEY;
      if (!apiKey) throw new Error("AI not configured");
      const prompt = String(args.prompt || "").slice(0, 4000);
      if (!prompt) throw new Error("prompt required");
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
      });
      if (!res.ok) throw new Error(`image gen failed ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const j = await res.json();
      const dataUrl: string | undefined = j?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!dataUrl?.startsWith("data:")) throw new Error("image gen returned no image");
      const m = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
      if (!m) throw new Error("bad image data");
      const mime = m[1] || "image/png";
      const ext = (mime.split("/")[1] || "png").replace(/[^a-z0-9]/gi, "");
      const filename = String(args.filename || `image.${ext}`);
      const out = await uploadGeneratedFile(actingUserId, filename.endsWith(`.${ext}`) ? filename : `${filename}.${ext}`, Buffer.from(m[2], "base64"), mime);
      return { ok: true, file_url: out.url, filename: out.filename, size: out.size, mime, prompt };
    }
    default:
      throw new Error(`unknown tool: ${name}`);
  }
}

// Insert a proactive message into the admin's inbox. Used by scheduler + pulse.
export async function postAiMessage(adminId: string, content: string, opts: { kind?: string; payload?: any; related_action_id?: string } = {}) {
  await supabaseAdmin.from("admin_ai_messages").insert({
    admin_user_id: adminId,
    kind: opts.kind ?? "info",
    content,
    payload: opts.payload ?? {},
    related_action_id: opts.related_action_id ?? null,
  });
}

type Attachment = { url: string; name?: string; mime?: string; kind?: "image" | "file" };

export const adminAiChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { messages: Msg[]; attached_image_url?: string; attachments?: Attachment[] }) => {
    if (!d || !Array.isArray(d.messages)) throw new Error("messages required");
    if (d.messages.length > 40) d.messages = d.messages.slice(-40);
    if (d.attachments && d.attachments.length > 30) throw new Error("max 30 attachments");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { data: role } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!role) throw new Error("admin only");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI not configured");

    const { data: me } = await supabaseAdmin.from("profiles").select("display_name,email").eq("id", context.userId).maybeSingle();
    const adminName = me?.display_name?.split(" ")[0] || me?.email?.split("@")[0] || "admin";

    const now = new Date();
    let sysCtx = `Current UTC time: ${now.toISOString()} (epoch ms: ${now.getTime()}). You are talking to ${adminName} (user id: ${context.userId}). Scheduler resolution: ~5 seconds.`;
    if (data.attached_image_url) sysCtx += `\n\nattached_image_url: ${data.attached_image_url}\n(The admin attached an image this turn. If they ask to post/add/schedule a banner, USE this URL as image_url.)`;

    // Inject attachments into the LAST user message as multimodal content.
    const inMsgs: any[] = [...data.messages];
    const atts = data.attachments ?? [];
    if (atts.length > 0) {
      let lastUserIdx = -1;
      for (let i = inMsgs.length - 1; i >= 0; i--) { if (inMsgs[i].role === "user") { lastUserIdx = i; break; } }
      if (lastUserIdx >= 0) {
        const orig = inMsgs[lastUserIdx];
        const textPart = typeof orig.content === "string" ? orig.content : "";
        const parts: any[] = [];
        if (textPart) parts.push({ type: "text", text: textPart });
        const fileNotes: string[] = [];
        for (const a of atts) {
          if (a.kind === "image" || (a.mime ?? "").startsWith("image/")) {
            parts.push({ type: "image_url", image_url: { url: a.url } });
          } else {
            fileNotes.push(`- ${a.name ?? "file"} (${a.mime ?? "unknown"}): ${a.url}`);
          }
        }
        if (fileNotes.length) parts.push({ type: "text", text: `\n\nAttached files (download to inspect):\n${fileNotes.join("\n")}` });
        inMsgs[lastUserIdx] = { role: "user", content: parts.length === 1 && parts[0].type === "text" ? parts[0].text : parts };
      }
    }

    let messages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: sysCtx },
      ...inMsgs,
    ];

    const executed: { name: string; args: any; result: any; error?: string }[] = [];

    for (let i = 0; i < 8; i++) {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "openai/gpt-5.5", messages, tools: TOOLS, tool_choice: "auto" }),
      });

      if (res.status === 429) throw new Error("Admin AI is busy. Try again.");
      if (res.status === 402) throw new Error("Admin AI credits exhausted.");
      if (!res.ok) throw new Error(`AI error ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const json = await res.json();
      const choice = json?.choices?.[0]?.message;
      if (!choice) throw new Error("no reply");

      messages.push(choice);

      const calls = choice.tool_calls;
      if (!calls || calls.length === 0) {
        return { reply: choice.content ?? "", executed };
      }

      for (const c of calls) {
        const name = c.function?.name;
        let args: any = {};
        try { args = JSON.parse(c.function?.arguments || "{}"); } catch { /* */ }
        let result: any; let error: string | undefined;
        try { result = await executeAdminTool(name, args, context.userId); }
        catch (e: any) { error = e?.message || String(e); result = { error }; }
        executed.push({ name, args, result, error });
        messages.push({ role: "tool", tool_call_id: c.id, content: JSON.stringify(result) });
      }
    }
    return { reply: "(stopped after 8 tool steps)", executed };
  });

// Mark all unseen proactive messages as seen for the calling admin.
export const markAdminAiSeen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await supabaseAdmin.from("admin_ai_messages").update({ seen_at: new Date().toISOString() }).eq("admin_user_id", context.userId).is("seen_at", null);
    return { ok: true };
  });

// Upload an admin-AI-attached image to the banners bucket and return a long-lived signed URL.
export const adminAiUploadImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { data_url: string; filename?: string }) => {
    if (!d?.data_url?.startsWith("data:")) throw new Error("data_url required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { data: role } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!role) throw new Error("admin only");

    const m = data.data_url.match(/^data:([^;]+);base64,(.*)$/);
    if (!m) throw new Error("invalid data url");
    const mime = m[1];
    const bytes = Buffer.from(m[2], "base64");
    if (bytes.length > 25 * 1024 * 1024) throw new Error("image too large (max 25MB)");
    const ext = (mime.split("/")[1] || "png").replace(/[^a-z0-9]/gi, "");
    const path = `admin-ai/${context.userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: upErr } = await supabaseAdmin.storage.from("banners").upload(path, bytes, { contentType: mime, upsert: false });
    if (upErr) throw upErr;
    // 10-year signed URL
    const { data: signed, error: sErr } = await supabaseAdmin.storage.from("banners").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    if (sErr) throw sErr;
    return { ok: true, url: signed.signedUrl, path };
  });

// Upload any admin-AI-attached file (image OR document) up to 25MB.
// Returns a signed URL the chat can pass into adminAiChat as an attachment.
export const adminAiUploadFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { data_url: string; filename?: string; mime?: string }) => {
    if (!d?.data_url?.startsWith("data:")) throw new Error("data_url required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { data: role } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!role) throw new Error("admin only");
    const m = data.data_url.match(/^data:([^;]+);base64,(.*)$/);
    if (!m) throw new Error("invalid data url");
    const mime = data.mime || m[1] || "application/octet-stream";
    const bytes = Buffer.from(m[2], "base64");
    if (bytes.length > 25 * 1024 * 1024) throw new Error("file too large (max 25MB)");
    const baseName = (data.filename || "file").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
    const path = `admin-ai/uploads/${context.userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${baseName}`;
    const { error: upErr } = await supabaseAdmin.storage.from("banners").upload(path, bytes, { contentType: mime, upsert: false });
    if (upErr) throw upErr;
    const { data: signed, error: sErr } = await supabaseAdmin.storage.from("banners").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    if (sErr) throw sErr;
    return {
      ok: true,
      url: signed.signedUrl,
      path,
      filename: baseName,
      mime,
      size: bytes.byteLength,
      kind: mime.startsWith("image/") ? "image" as const : "file" as const,
    };
  });
