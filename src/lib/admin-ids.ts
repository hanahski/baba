// Global cache of admin user IDs — read once and reused everywhere
// so badge / credit components can render admin-aware UI without each
// one issuing its own role query.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAdminIds() {
  return useQuery({
    queryKey: ["admin-ids-global"],
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      return new Set<string>((data ?? []).map((r) => r.user_id));
    },
  });
}

export function useIsAdmin(userId?: string | null) {
  const { data } = useAdminIds();
  if (!userId) return false;
  return data?.has(userId) ?? false;
}
