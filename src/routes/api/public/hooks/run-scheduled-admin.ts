import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { executeAdminTool, postAiMessage } from "@/lib/admin-ai.functions";

function describe(action: string, args: any, result: any): string {
  const u = result?.user;
  const name = u?.display_name || u?.email || (args?.user_id ? `user ${String(args.user_id).slice(0, 8)}` : "");
  switch (action) {
    case "set_badge":
      return `${args.value ? "Granted" : "Removed"} ${args.badge} badge ${args.value ? "to" : "from"} ${name}.`;
    case "set_user_status":
      return `Set ${name}'s status to ${args.status}.`;
    case "set_user_rank":
      return `Set ${name}'s rank to ${args.tier} (step ${args.step}).`;
    case "grant_credits":
      return `${args.amount >= 0 ? "Granted" : "Removed"} ${Math.abs(args.amount)} credits ${args.amount >= 0 ? "to" : "from"} ${name}. New balance: ${result?.balance ?? "?"}.`;
    case "delete_post": return `Deleted post ${args.post_id}.`;
    case "delete_comment": return `Deleted comment ${args.comment_id}.`;
    case "delete_listing": return `Deleted listing ${args.listing_id}.`;
    case "add_banner": return `Posted banner "${args.title}".`;
    case "update_banner": return `Updated banner ${args.id}.`;
    case "delete_banner": return `Removed banner ${args.id}.`;
    default: return `Ran ${action}.`;
  }
}

async function runDueOnce(): Promise<any[]> {
  const { data: due, error } = await supabaseAdmin
    .from("scheduled_admin_actions")
    .select("*")
    .eq("status", "pending")
    .lte("run_at", new Date().toISOString())
    .limit(20);
  if (error) return [{ error: error.message }];

  const results: any[] = [];
  for (const job of due ?? []) {
    try {
      const result = await executeAdminTool(job.action, job.args ?? {}, job.created_by);
      const nextRunCount = (job.run_count ?? 0) + 1;
      const interval = job.repeat_every_seconds as number | null;
      const maxRuns = job.max_runs as number | null;
      const repeatUntil = job.repeat_until as string | null;
      const now = new Date();
      const hitMax = maxRuns != null && nextRunCount >= maxRuns;
      const pastEnd = repeatUntil != null && now.getTime() >= new Date(repeatUntil).getTime();
      const shouldRepeat = interval != null && interval > 0 && !hitMax && !pastEnd;

      if (shouldRepeat) {
        const nextAt = new Date(now.getTime() + interval * 1000).toISOString();
        await supabaseAdmin.from("scheduled_admin_actions").update({
          run_count: nextRunCount,
          run_at: nextAt,
          result,
          executed_at: now.toISOString(),
        }).eq("id", job.id);
      } else {
        await supabaseAdmin.from("scheduled_admin_actions").update({
          status: "done",
          executed_at: now.toISOString(),
          run_count: nextRunCount,
          result,
        }).eq("id", job.id);
      }

      try {
        const suffix = shouldRepeat ? ` (recurring — next in ${interval}s, run #${nextRunCount}${maxRuns ? `/${maxRuns}` : ""})` : "";
        await postAiMessage(job.created_by, `✅ ${describe(job.action, job.args ?? {}, result)}${job.note ? ` (note: ${job.note})` : ""}${suffix}`, { kind: "scheduled_done", payload: { action: job.action, args: job.args, result, run_count: nextRunCount, repeating: shouldRepeat }, related_action_id: job.id });
      } catch (_) { /* non-fatal */ }
      results.push({ id: job.id, ok: true, repeating: shouldRepeat });
    } catch (e: any) {
      await supabaseAdmin.from("scheduled_admin_actions").update({ status: "failed", executed_at: new Date().toISOString(), error: e?.message ?? String(e) }).eq("id", job.id);
      try {
        await postAiMessage(job.created_by, `⚠️ Scheduled ${job.action} failed: ${e?.message ?? String(e)}`, { kind: "scheduled_failed", payload: { action: job.action, args: job.args }, related_action_id: job.id });
      } catch (_) { /* non-fatal */ }
      results.push({ id: job.id, ok: false, error: e?.message });
    }
  }
  return results;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const Route = createFileRoute("/api/public/hooks/run-scheduled-admin")({
  server: {
    handlers: {
      // Each invocation runs as a ~25s mini-loop, polling every 5s.
      // With pg_cron firing every 30s, this gives ~5s effective resolution.
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const tickMs = Math.max(500, Math.min(15000, Number(url.searchParams.get("tick") ?? 1000)));
        const windowMs = Math.max(tickMs, Math.min(50000, Number(url.searchParams.get("window") ?? 25000)));
        const ticks = Math.max(1, Math.floor(windowMs / tickMs));

        const all: any[] = [];
        for (let i = 0; i < ticks; i++) {
          const r = await runDueOnce();
          all.push(...r);
          if (i < ticks - 1) await sleep(tickMs);
        }
        return Response.json({ ok: true, ran: all.length, results: all });
      },
    },
  },
});
