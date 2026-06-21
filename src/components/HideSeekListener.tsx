import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { Button } from "@/components/ui/button";
import { MapPin, X, Check, MessageCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { playHideSeekPing } from "@/lib/sounds";
import { getOrCreateDmThread } from "@/lib/dm";
import { EBSU_ZONES } from "@/lib/ebsu-zones";

type Ping = {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string | null;
  status: string;
  created_at: string;
};

type SenderInfo = {
  id: string;
  display_name: string;
  avatar_key: string;
  current_zone: string | null;
};

/**
 * Listens for incoming hide_seek_pings and shows a "found you" postcard.
 * Mounted in AppShell so it works on every page for the signed-in user.
 */
export function HideSeekListener({ userId }: { userId: string | undefined }) {
  const navigate = useNavigate();
  const [active, setActive] = useState<{ ping: Ping; sender: SenderInfo } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let alive = true;

    const present = async (ping: Ping) => {
      const { data: sender } = await supabase
        .from("profiles")
        .select("id,display_name,avatar_key,current_zone")
        .eq("id", ping.sender_id)
        .maybeSingle();
      if (!alive || !sender) return;
      setActive({ ping, sender: sender as SenderInfo });
      playHideSeekPing();
    };

    // Pull most recent pending ping on mount, in case one arrived while offline.
    void supabase
      .from("hide_seek_pings")
      .select("*")
      .eq("receiver_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) void present(data as Ping);
      });

    const ch = supabase
      .channel(`hsp-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "hide_seek_pings",
          filter: `receiver_id=eq.${userId}`,
        },
        (payload) => {
          void present(payload.new as Ping);
        },
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, [userId]);

  if (!active) return null;
  const { ping, sender } = active;
  const zone = EBSU_ZONES.find((z) => z.id === sender.current_zone);

  const respond = async (status: "accepted" | "denied" | "seen") => {
    setBusy(true);
    const { error } = await supabase
      .from("hide_seek_pings")
      .update({ status, responded_at: new Date().toISOString() })
      .eq("id", ping.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (status === "accepted") {
      try {
        const tid = await getOrCreateDmThread(userId!, sender.id);
        navigate({ to: "/chat", search: { tab: "dms", t: tid } });
      } catch (e: any) {
        toast.error(e.message ?? "Couldn't open chat");
      }
    }
    setActive(null);
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-sm bg-gradient-to-br from-primary via-primary to-accent rounded-3xl p-1 shadow-2xl animate-scale-in">
        <button
          onClick={() => void respond("seen")}
          className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-background border shadow flex items-center justify-center z-10"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="bg-card rounded-[22px] p-6 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs uppercase tracking-widest font-bold text-primary mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Found you!
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="flex justify-center mb-3">
            <div className="rounded-full ring-4 ring-primary/30 ring-offset-2 ring-offset-card">
              <AvatarDisplay avatarKey={sender.avatar_key} size={88} online />
            </div>
          </div>
          <h2 className="font-display text-xl font-bold">{sender.display_name}</h2>
          {zone && (
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
              <MapPin className="w-3 h-3" />
              <span>{zone.emoji} {zone.name}</span>
            </div>
          )}
          {ping.message && (
            <p className="mt-3 text-sm bg-muted rounded-2xl px-3 py-2 italic">
              "{ping.message}"
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            spotted you nearby and waved hello.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button variant="outline" disabled={busy} onClick={() => void respond("denied")}>
              <X className="w-4 h-4 mr-1" /> Deny
            </Button>
            <Button disabled={busy} onClick={() => void respond("accepted")}>
              <MessageCircle className="w-4 h-4 mr-1" /> Say hi
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
