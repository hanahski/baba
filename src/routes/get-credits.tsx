import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Coins, Play, Loader2, Check, Sparkles, Tv } from "lucide-react";

export const Route = createFileRoute("/get-credits")({
  component: GetCreditsPage,
  head: () => ({
    meta: [
      { title: "Get more credits — StudentsPlug" },
      { name: "description", content: "Earn free StudentsPlug credits by watching short reward ads. Pick how many credits you want and watch an ad to claim them instantly." },
      { property: "og:title", content: "Get more credits — StudentsPlug" },
      { property: "og:description", content: "Watch a short reward ad and claim free StudentsPlug credits instantly." },
      { property: "og:url", content: "/get-credits" },
    ],
    links: [{ rel: "canonical", href: "/get-credits" }],
  }),
});

type Option = { amount: number; seconds: number; label: string; gradient: string };

const OPTIONS: Option[] = [
  { amount: 10, seconds: 5, label: "Quick", gradient: "from-emerald-500 to-teal-600" },
  { amount: 25, seconds: 10, label: "Popular", gradient: "from-violet-500 to-fuchsia-600" },
  { amount: 50, seconds: 15, label: "Best value", gradient: "from-amber-500 to-orange-600" },
];

const DAILY_CAP = 200;

function GetCreditsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState<Option | null>(null);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"idle" | "ad" | "claiming">("idle");
  const [earnedToday, setEarnedToday] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("credit_transactions")
        .select("amount")
        .eq("user_id", user.id)
        .eq("reason", "ad_reward")
        .gte("created_at", start.toISOString());
      const sum = (data ?? []).reduce((a, r: any) => a + (r.amount ?? 0), 0);
      setEarnedToday(sum);
    })();
  }, [user, profile?.credits]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const remaining = Math.max(0, DAILY_CAP - earnedToday);

  const watchAd = (opt: Option) => {
    if (!user) {
      navigate({ to: "/login", search: { redirect: "/get-credits" } });
      return;
    }
    if (opt.amount > remaining) {
      toast.error("You've hit today's reward limit. Come back tomorrow!");
      return;
    }
    setActive(opt);
    setPhase("ad");
    setProgress(0);
    const total = opt.seconds * 1000;
    const startedAt = Date.now();
    timerRef.current = window.setInterval(() => {
      const pct = Math.min(100, ((Date.now() - startedAt) / total) * 100);
      setProgress(pct);
      if (pct >= 100) {
        if (timerRef.current) window.clearInterval(timerRef.current);
        void claim(opt);
      }
    }, 100);
  };

  const claim = async (opt: Option) => {
    setPhase("claiming");
    const { data, error } = await supabase.rpc("claim_ad_reward", { _amount: opt.amount });
    if (error) {
      const msg = error.message || "Couldn't grant credits";
      toast.error(/DAILY_LIMIT/i.test(msg) ? "You've hit today's reward limit. Come back tomorrow!" : msg);
      setPhase("idle");
      setActive(null);
      return;
    }
    const r = data as { credits_added: number; balance: number; earned_today: number };
    toast.success(`+${r.credits_added} credits added!`);
    setEarnedToday(r.earned_today);
    try { await refreshProfile(); } catch {}
    setPhase("idle");
    setActive(null);
    setProgress(0);
  };

  const closeAd = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    setPhase("idle");
    setActive(null);
    setProgress(0);
  };

  return (
    <AppShell>
      <div className="max-w-lg mx-auto space-y-6">
        <header className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center mx-auto">
            <Coins className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold font-display">Get more credits</h1>
          <p className="text-sm text-muted-foreground">
            Pick how many credits you want, watch a short reward ad, and claim them instantly.
          </p>
          {user && (
            <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary bg-primary/10 rounded-full px-3 py-1">
              <Coins className="w-4 h-4" /> Balance: {profile?.credits ?? 0}
            </div>
          )}
        </header>

        <div className="space-y-3">
          {OPTIONS.map((opt) => {
            const disabled = opt.amount > remaining;
            return (
              <button
                key={opt.amount}
                type="button"
                onClick={() => watchAd(opt)}
                disabled={disabled || phase !== "idle"}
                className="w-full text-left bg-card border rounded-2xl p-4 shadow-card flex items-center gap-4 transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:hover:translate-y-0"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${opt.gradient} flex items-center justify-center text-white shrink-0 shadow`}>
                  <Coins className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">{opt.amount} credits</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide bg-muted text-muted-foreground rounded-full px-2 py-0.5">{opt.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Watch a {opt.seconds}s ad</p>
                </div>
                <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary shrink-0">
                  <Play className="w-4 h-4" /> Watch
                </div>
              </button>
            );
          })}
        </div>

        <div className="text-center text-xs text-muted-foreground">
          {earnedToday >= DAILY_CAP ? (
            <span className="text-amber-600 font-semibold">You've reached today's limit of {DAILY_CAP} credits. Come back tomorrow!</span>
          ) : (
            <>You've earned <b>{earnedToday}</b> / {DAILY_CAP} ad credits today.</>
          )}
        </div>
      </div>

      {active && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card rounded-2xl overflow-hidden shadow-xl">
            <div className="aspect-video bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center justify-center gap-3 text-white relative">
              <Tv className="w-12 h-12 opacity-80" />
              {phase === "claiming" ? (
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Check className="w-5 h-5 text-emerald-400" /> Ad complete — adding credits…
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" /> Reward ad playing…
                </div>
              )}
              <span className="text-xs opacity-70">Sponsored · {active.amount} credits reward</span>
            </div>
            <div className="p-4 space-y-3">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {phase === "claiming" ? (
                    <span className="inline-flex items-center gap-1.5"><Loader2 className="w-4 h-4 animate-spin" /> Claiming…</span>
                  ) : (
                    `Watch to earn ${active.amount} credits`
                  )}
                </span>
                <Button variant="ghost" size="sm" onClick={closeAd} disabled={phase === "claiming"}>
                  {progress >= 100 ? "" : "Skip & cancel"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
