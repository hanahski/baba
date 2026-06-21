import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Gift, Loader2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/redeem")({
  component: RedeemPage,
  head: () => ({
    meta: [
      { title: "Redeem a code — StudentsPlug" },
      { name: "description", content: "Got a promo, bonus or referral code? Redeem it on StudentsPlug and instantly add credits to your student account." },
      { property: "og:title", content: "Redeem a code — StudentsPlug" },
      { property: "og:description", content: "Turn promo, bonus and referral codes into StudentsPlug credits in seconds." },
      { property: "og:url", content: "/redeem" },
    ],
    links: [{ rel: "canonical", href: "/redeem" }],
  }),
});

function RedeemPage() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ credits: number; balance: number } | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const c = code.trim();
    if (!c) return;
    if (!user) {
      toast.error("Please sign in to redeem a code.");
      return;
    }
    setBusy(true);
    setResult(null);
    const { data, error } = await supabase.rpc("redeem_coupon", { _code: c });
    setBusy(false);
    if (error) {
      const msg = error.message || "Could not redeem code";
      toast.error(
        /invalid/i.test(msg) ? "That code doesn't exist." :
        /already/i.test(msg) ? "You've already redeemed this code." :
        /fully/i.test(msg) ? "This code has been fully claimed." :
        /inactive/i.test(msg) ? "This code is no longer active." :
        msg,
      );
      return;
    }
    const r = data as { credits_added: number; balance: number; role_granted: string | null };
    setResult({ credits: r.credits_added, balance: r.balance });
    setCode("");
    if (r.role_granted === "admin") {
      toast.success("Admin access unlocked! Opening admin panel…");
      try { await refreshProfile(); } catch {}
      setTimeout(() => navigate({ to: "/admin" }), 800);
    } else if (r.credits_added > 0) {
      toast.success(`+${r.credits_added} credits added!`);
    } else {
      toast.success("Code redeemed!");
    }
  };

  return (
    <AppShell>
      <div className="max-w-md mx-auto">
        <header className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center">
            <Gift className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display">Redeem a code</h1>
            <p className="text-sm text-muted-foreground">Promo and bonus codes go here.</p>
          </div>
        </header>

        <form
          onSubmit={onSubmit}
          className="bg-card border rounded-2xl p-5 shadow-card space-y-4"
        >
          <label className="block">
            <span className="text-sm font-semibold mb-1.5 block">Your code</span>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. BOX"
              maxLength={32}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              className="font-mono tracking-wider text-lg"
            />
          </label>
          <Button type="submit" disabled={busy || !code.trim()} className="w-full">
            {busy ? (
              <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Redeeming…</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-1.5" /> Redeem</>
            )}
          </Button>

          {!user && (
            <p className="text-xs text-muted-foreground text-center">
              <Link to="/login" className="text-primary font-semibold">Sign in</Link>{" "}
              to redeem a code.
            </p>
          )}
        </form>

        {result && (
          <div className="mt-5 bg-gradient-to-br from-primary/10 to-accent border rounded-2xl p-5 text-center shadow-card animate-fade-in-up">
            <Sparkles className="w-7 h-7 text-primary mx-auto mb-2" />
            <p className="text-lg font-bold">+{result.credits} credits!</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              New balance: <span className="font-semibold text-foreground">{result.balance}</span>
            </p>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center mt-6">
          Each code can only be redeemed once per account.
        </p>
      </div>
    </AppShell>
  );
}