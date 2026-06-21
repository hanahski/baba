// DM helpers — find-or-create a private 1:1 thread between two users.
// dm_threads stores (user_a, user_b). We always query both orderings.
import { supabase } from "@/integrations/supabase/client";

export async function getOrCreateDmThread(meId: string, otherId: string): Promise<string> {
  if (meId === otherId) throw new Error("You can't DM yourself");
  // Try existing thread (either ordering)
  const { data: existing, error: findErr } = await supabase
    .from("dm_threads")
    .select("id")
    .or(
      `and(user_a.eq.${meId},user_b.eq.${otherId}),and(user_a.eq.${otherId},user_b.eq.${meId})`,
    )
    .maybeSingle();
  if (findErr) throw findErr;
  if (existing) return existing.id;

  const { data: created, error: insErr } = await supabase
    .from("dm_threads")
    .insert({ user_a: meId, user_b: otherId })
    .select("id")
    .single();
  if (insErr) throw insErr;
  return created.id;
}
