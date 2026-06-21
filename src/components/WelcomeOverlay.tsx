import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, Coins, PartyPopper, X } from "lucide-react";
import { AvatarDisplay } from "./AvatarDisplay";
import { playWelcomeCelebrationChime } from "@/lib/sounds";

/**
 * Once-only celebration shown to a new member after their first sign-in.
 * Gated by profile.seen_welcome (boolean) — set to true on dismiss so it never shows again.
 */
export function WelcomeOverlay() {
  const { profile, refreshProfile } = useAuth();
  const [closing, setClosing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const show = !!profile && profile.seen_welcome === false;

  useEffect(() => {
    if (show) {
      playWelcomeCelebrationChime();
      // small delay so layout is calm
      const t = setTimeout(() => setMounted(true), 250);
      return () => clearTimeout(t);
    }
    setMounted(false);
  }, [show]);

  const dismiss = async () => {
    if (closing) return;
    setClosing(true);
    if (profile) {
      await supabase.from("profiles").update({ seen_welcome: true } as any).eq("id", profile.id);
      refreshProfile();
    }
  };

  // 24 confetti shards — randomized once
  const confetti = useMemo(
    () =>
      Array.from({ length: 28 }).map((_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        rotate: Math.random() * 360,
        hue: ["#ff5d8f", "#ffb830", "#7bdff2", "#a78bfa", "#86efac"][i % 5],
        size: 6 + Math.random() * 10,
      })),
    [],
  );

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 z-[100] flex items-center justify-center px-4 transition-opacity duration-300 ${
        mounted ? "opacity-100" : "opacity-0"
      } ${closing ? "opacity-0" : ""}`}
      style={{ background: "radial-gradient(circle at center, rgba(0,0,0,0.65), rgba(0,0,0,0.85))" }}
      onTransitionEnd={() => closing && setMounted(false)}
    >
      {/* Confetti layer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confetti.map((c, i) => (
          <span
            key={i}
            className="absolute top-[-20px] rounded-sm"
            style={{
              left: `${c.left}%`,
              width: c.size,
              height: c.size * 0.4,
              background: c.hue,
              transform: `rotate(${c.rotate}deg)`,
              animation: `welcomeFall 2.6s ${c.delay}s ease-in forwards`,
            }}
          />
        ))}
        {/* Big popper burst behind card */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ animation: "welcomePulse 1.6s ease-out" }}
        >
          <div className="w-[480px] h-[480px] rounded-full bg-gradient-to-br from-primary/30 via-accent/30 to-primary/10 blur-3xl" />
        </div>
      </div>

      <div
        className={`relative max-w-md w-full bg-card border-2 border-primary/40 rounded-3xl shadow-glow p-6 sm:p-8 text-center ${
          mounted && !closing ? "animate-bounce-in" : ""
        }`}
        style={{ animation: mounted && !closing ? "welcomeIn 700ms cubic-bezier(0.34, 1.56, 0.64, 1)" : undefined }}
      >
        <button
          onClick={dismiss}
          aria-label="Close"
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted text-muted-foreground"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center justify-center mb-3" style={{ animation: "welcomeBob 1.2s ease-in-out infinite" }}>
          <AvatarDisplay avatarKey={profile?.avatar_key ?? "boy-1"} size={88} />
        </div>

        <div className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-primary mb-2">
          <PartyPopper className="w-4 h-4" /> New plug joined
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold font-display leading-tight mb-2">
          Welcome, {profile?.display_name?.split(" ")[0] ?? "friend"}!
        </h2>
        <p className="text-sm text-muted-foreground mb-5">
          You just joined <strong className="text-foreground">StudentsPlug</strong>. Catalog, market, chat, AI tools — it's all unlocked.
        </p>

        {/* Credit card-style reveal */}
        <div className="relative mx-auto max-w-xs rounded-2xl p-5 bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-glow mb-5"
          style={{ animation: "welcomeCardPop 900ms 400ms backwards cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
          <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-300" style={{ animation: "welcomeSpin 2s linear infinite" }} />
          <div className="flex items-center justify-center gap-2 text-3xl font-extrabold">
            <Coins className="w-7 h-7" />
            <span style={{ animation: "welcomeCount 1200ms 600ms backwards" }}>+50</span>
          </div>
          <div className="text-xs font-semibold opacity-90 mt-1">There's your 50 credits for joining us</div>
        </div>

        <Button onClick={dismiss} className="w-full" size="lg">
          Let's go
        </Button>

        <p className="text-[11px] text-muted-foreground mt-3">
          Invite a friend with your code and earn 100 more credits.
        </p>
      </div>

      <style>{`
        @keyframes welcomeFall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0.4; }
        }
        @keyframes welcomePulse {
          0%   { transform: scale(0.6); opacity: 0; }
          40%  { opacity: 1; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes welcomeIn {
          0%   { transform: scale(0.5) translateY(40px); opacity: 0; }
          70%  { transform: scale(1.06) translateY(-4px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes welcomeBob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-8px); }
        }
        @keyframes welcomeCardPop {
          0%   { transform: scale(0.4) rotate(-8deg); opacity: 0; }
          70%  { transform: scale(1.08) rotate(2deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes welcomeSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes welcomeCount {
          0%   { transform: scale(0.2); opacity: 0; }
          60%  { transform: scale(1.4); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
