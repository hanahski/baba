import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";

/**
 * Notifies users when an admin removes their content. Shows a sticky toast
 * per pending notice and acknowledges (hides) it after the user dismisses.
 */
export function ContentRemovalToasts() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: notices = [] } = useQuery({
    queryKey: ["content-removals", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("content_removals" as any)
        .select("id,content_kind,content_title,reason,created_at")
        .eq("user_id", user!.id)
        .eq("acknowledged", false)
        .order("created_at", { ascending: false });
      return (data as any[]) ?? [];
    },
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`removals-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "content_removals", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["content-removals", user.id] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  useEffect(() => {
    if (!notices.length) return;
    for (const n of notices) {
      toast(
        `${n.content_kind === "post" ? "Your post" : "Your listing"} was deleted by Admin`,
        {
          id: `removal-${n.id}`,
          description: `${n.content_title ? `"${n.content_title}" — ` : ""}${n.reason}`,
          duration: 15000,
          icon: <ShieldAlert className="w-4 h-4 text-destructive" />,
          action: {
            label: "OK",
            onClick: async () => {
              await supabase.from("content_removals" as any).update({ acknowledged: true }).eq("id", n.id);
              qc.invalidateQueries({ queryKey: ["content-removals", user!.id] });
            },
          },
        },
      );
    }
  }, [notices, qc, user]);

  return null;
}