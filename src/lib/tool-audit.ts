// Helpers shared by all in-browser audio tools:
//  • logToolJob — fire-and-forget insert into public.tool_jobs (audit log).
//  • hasToolConsent / acceptToolConsent — read/write profiles.tool_consent_at.

import { supabase } from "@/integrations/supabase/client";

export type ToolName = "audio-convert" | "vocal-split" | "vocal-split-v2" | "notif-clean";

export async function logToolJob(args: {
  tool: ToolName;
  file?: File | null;
  settings?: Record<string, unknown>;
  durationMs?: number;
}) {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return; // anonymous use is allowed; just don't log
    await supabase.from("tool_jobs").insert({
      user_id: u.user.id,
      tool: args.tool,
      file_name: args.file?.name ?? null,
      file_size_bytes: args.file?.size ?? null,
      settings: (args.settings ?? null) as never,
      duration_ms: args.durationMs ?? null,
    });
  } catch {
    /* never block the UX on logging */
  }
}

export async function hasToolConsent(): Promise<boolean | "anon"> {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) return "anon"; // signed-out: gate via localStorage only
  const { data } = await supabase
    .from("profiles")
    .select("tool_consent_at")
    .eq("id", u.user.id)
    .maybeSingle();
  return !!data?.tool_consent_at;
}

export async function acceptToolConsent() {
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) {
    localStorage.setItem("tool_consent_at", new Date().toISOString());
    return;
  }
  await supabase
    .from("profiles")
    .update({ tool_consent_at: new Date().toISOString() })
    .eq("id", u.user.id);
}

export function hasLocalConsent(): boolean {
  return !!localStorage.getItem("tool_consent_at");
}
