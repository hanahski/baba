import { supabase } from "@/integrations/supabase/client";

export async function getIsAdminUser(userId: string | null | undefined) {
  if (!userId) return false;

  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw error;
  return !!data;
}

export async function claimSeedAdminRole() {
  const { data, error } = await supabase.rpc("claim_seed_admin_role");
  if (error) throw error;
  return !!data;
}