// Proactive monitor — runs every few minutes. If anything notable changed,
// drops a short message into each admin's admin_ai_messages inbox.

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { postAiMessage } from "@/lib/admin-ai.functions";

export const Route = createFileRoute("/api/public/hooks/admin-ai-pulse")({
  server: {
    handlers: {
      POST: async () => {
        const { data: stateRow } = await supabaseAdmin.from("admin_ai_state").select("v").eq("k", "last_pulse").maybeSingle();
        const lastIso: string = (stateRow?.v as any)?.at ?? new Date(Date.now() - 5 * 60_000).toISOString();
        const nowIso = new Date().toISOString();

        const [reportsRes, failedRes, signupsRes, blocksRes] = await Promise.all([
          supabaseAdmin.from("user_reports").select("id,reason,reported_user_id,created_at").eq("status", "pending").gt("created_at", lastIso).order("created_at", { ascending: false }).limit(10),
          supabaseAdmin.from("scheduled_admin_actions").select("id,action,args,error,executed_at").eq("status", "failed").gt("executed_at", lastIso).limit(10),
          supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).gt("created_at", lastIso),
          supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).eq("status", "blocked").gt("updated_at", lastIso),
        ]);

        const reports = reportsRes.data ?? [];
        const failed = failedRes.data ?? [];
        const newSignups = signupsRes.count ?? 0;
        const newBlocks = blocksRes.count ?? 0;

        const blurbs: string[] = [];
        if (reports.length) blurbs.push(`📣 ${reports.length} new pending report${reports.length === 1 ? "" : "s"} since ${new Date(lastIso).toLocaleTimeString()}.`);
        if (failed.length) blurbs.push(`⚠️ ${failed.length} scheduled action${failed.length === 1 ? "" : "s"} failed (${failed.map((f) => f.action).slice(0, 3).join(", ")}).`);
        if (newSignups >= 10) blurbs.push(`📈 Signup spike: ${newSignups} new users since last pulse.`);
        if (newBlocks >= 5) blurbs.push(`🚫 ${newBlocks} users blocked since last pulse.`);

        if (blurbs.length) {
          const { data: admins } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin");
          const text = blurbs.join("\n") + "\n\nWant me to dig into any of these?";
          for (const a of admins ?? []) {
            try { await postAiMessage(a.user_id, text, { kind: "pulse", payload: { reports: reports.length, failed: failed.length, newSignups, newBlocks } }); } catch (_) { /* */ }
          }
        }

        await supabaseAdmin.from("admin_ai_state").upsert({ k: "last_pulse", v: { at: nowIso }, updated_at: nowIso });
        return Response.json({ ok: true, notified: blurbs.length });
      },
    },
  },
});
