import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { PartyPopper, Gift, Coins, X, Sparkles, Heart, Star } from "lucide-react";

/**
 * Listens to the referrals table; whenever the signed-in user gets credited as an inviter,
 * pop a celebratory postcard that loops congratulatory animations for ~10s.
 */
export function ReferralCelebration() {
  const { user } = useAuth();
  const [event, setEvent] = useState<{ id: string; inviteeName: string } | null>(null);
  const [closing, setClosing] = useState(false);
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`referrals-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "referrals", filter: `inviter_id=eq.${user.id}` },
        async (payload) => {
          const row = payload.new as { id: string; invitee_id: string };
          if (seenRef.current.has(row.id)) return;
          seenRef.current.add(row.id);
          const { data: invitee } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", row.invitee_id)
            .maybeSingle();
          setEvent({ id: row.id, inviteeName: invitee?.display_name ?? "a new student" });
          setClosing(false);
          // ~10 seconds total
          setTimeout(() => setClosing(true), 9700);
          setTimeout(() => setEvent(null), 10300);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const confetti = useMemo(
    () =>
      Array.from({ length: 36 }).map((_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 2 + Math.random() * 2,
        rotate: Math.random() * 360,
        hue: ["#ff5d8f", "#ffb830", "#7bdff2", "#a78bfa", "#86efac", "#f472b6"][i % 6],
        size: 6 + Math.random() * 6,
      })),
    [event?.id],
  );

  if (!event) return null;

  const dismiss = () => {
    setClosing(true);
    setTimeout(() => setEvent(null), 400);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed z-[90] left-1/2 -translate-x-1/2 top-20 w-[94vw] max-w-md transition-all duration-400 ${
        closing ? "opacity-0 -translate-y-4 scale-95" : "opacity-100 translate-y-0 scale-100"
      }`}
      style={{ animation: !closing ? "rcCardIn 700ms cubic-bezier(0.34, 1.56, 0.64, 1)" : undefined }}
    >
      {/* Postcard */}
      <div className="relative rounded-3xl shadow-glow overflow-hidden border-2 border-white/40"
           style={{ background: "linear-gradient(135deg, #6d28d9 0%, #db2777 50%, #f59e0b 100%)", animation: "rcHue 4s ease-in-out infinite" }}>
        {/* Looping confetti */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {confetti.map((c, i) => (
            <span
              key={i}
              className="absolute -top-4 rounded-sm"
              style={{
                left: `${c.left}%`,
                width: c.size,
                height: c.size * 0.5,
                background: c.hue,
                transform: `rotate(${c.rotate}deg)`,
                animation: `rcFall ${c.duration}s ${c.delay}s linear infinite`,
              }}
            />
          ))}
        </div>

        {/* Sparkle ring */}
        <div className="absolute inset-0 pointer-events-none">
          {[0, 60, 120, 180, 240, 300].map((deg, i) => (
            <Sparkles
              key={i}
              className="absolute w-4 h-4 text-white/80"
              style={{
                top: "50%", left: "50%",
                transform: `rotate(${deg}deg) translateY(-110px)`,
                animation: `rcTwinkle 1.4s ${i * 0.15}s ease-in-out infinite`,
              }}
            />
          ))}
        </div>

        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white z-20"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative z-10 px-6 py-7 text-white text-center">
          <div
            className="mx-auto w-20 h-20 rounded-full bg-white/95 text-pink-600 flex items-center justify-center shadow-2xl"
            style={{ animation: "rcBob 1.2s ease-in-out infinite" }}
          >
            <Gift className="w-10 h-10" style={{ animation: "rcWiggle 0.9s ease-in-out infinite" }} />
          </div>

          <div className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-white/90 inline-flex items-center gap-1.5">
            <Star className="w-3 h-3 fill-yellow-300 text-yellow-300" />
            Referral success
            <Star className="w-3 h-3 fill-yellow-300 text-yellow-300" />
          </div>

          <h2 className="mt-2 font-display font-black text-2xl leading-tight drop-shadow"
              style={{ animation: "rcPulse 1.8s ease-in-out infinite" }}>
            Congratulations! 🎉
          </h2>
          <p className="mt-1 text-sm opacity-95">
            <strong>{event.inviteeName}</strong> just joined with your invite code.
          </p>

          <div className="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full font-bold">
            <Coins className="w-5 h-5 text-yellow-300" />
            <span>+100 credits earned</span>
            <Heart className="w-4 h-4 fill-red-400 text-red-400" style={{ animation: "rcBeat 0.8s ease-in-out infinite" }} />
          </div>

          <p className="mt-3 text-[11px] uppercase tracking-widest opacity-80 inline-flex items-center gap-1">
            <PartyPopper className="w-3 h-3" /> Keep inviting to climb the leaderboard
          </p>
        </div>

        {/* Bottom barcode-style strip */}
        <div className="relative h-3 bg-black/30">
          <div className="absolute inset-0 flex items-center">
            {Array.from({ length: 50 }).map((_, i) => (
              <span key={i} className="inline-block bg-white/80 mr-0.5"
                    style={{ width: i % 5 === 0 ? 3 : 1, height: "100%" }} />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes rcCardIn {
          0%   { transform: translate(-50%, -60px) scale(0.6) rotate(-4deg); opacity: 0; }
          60%  { transform: translate(-50%, 6px) scale(1.05) rotate(1deg); opacity: 1; }
          100% { transform: translate(-50%, 0) scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes rcBob {
          0%, 100% { transform: translateY(0) rotate(-8deg); }
          50%      { transform: translateY(-6px) rotate(8deg); }
        }
        @keyframes rcWiggle {
          0%, 100% { transform: rotate(-10deg) scale(1); }
          50%      { transform: rotate(10deg) scale(1.1); }
        }
        @keyframes rcPulse {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.05); }
        }
        @keyframes rcBeat {
          0%, 100% { transform: scale(1); }
          25%      { transform: scale(1.3); }
          50%      { transform: scale(1); }
          75%      { transform: scale(1.2); }
        }
        @keyframes rcFall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(360px) rotate(720deg); opacity: 0; }
        }
        @keyframes rcTwinkle {
          0%, 100% { opacity: 0.2; transform: rotate(var(--r, 0deg)) translateY(-110px) scale(0.6); }
          50%      { opacity: 1;   transform: rotate(var(--r, 0deg)) translateY(-110px) scale(1.2); }
        }
        @keyframes rcHue {
          0%, 100% { filter: hue-rotate(0deg); }
          50%      { filter: hue-rotate(30deg); }
        }
      `}</style>
    </div>
  );
}
