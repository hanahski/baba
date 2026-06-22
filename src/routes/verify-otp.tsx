import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { claimSeedAdminRole } from "@/lib/admin-role";

const SEED_ADMIN_EMAILS = new Set(["admin+qx162n@ebsuplug.app", "consequenceoct@gmail.com"]);

export const Route = createFileRoute("/verify-otp")({
  validateSearch: (s: Record<string, unknown>) => ({
    email: (s.email as string | undefined) ?? "",
    redirect: (s.redirect as string | undefined) ?? "/",
    mode: ((s.mode as string | undefined) === "recovery" ? "recovery" : "signup") as "recovery" | "signup",
  }),
  component: VerifyOtpPage,
});

function VerifyOtpPage() {
  const { email: emailParam, redirect, mode } = Route.useSearch();
  const isRecovery = mode === "recovery";
  const nav = useNavigate();
  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const verify = async (token: string) => {
    if (!email) return toast.error("Enter the email you signed up with");
    if (token.length !== 6) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token,
        type: isRecovery ? "recovery" : "email",
      });
      if (error) throw error;
      if (isRecovery) {
        toast.success("Code verified — set your new password");
        await nav({ to: "/reset-password" });
        return;
      }
      if (SEED_ADMIN_EMAILS.has(email.trim().toLowerCase())) {
        await claimSeedAdminRole().catch((e) => console.error("[verify-otp] admin claim", e));
      }
      toast.success("Email verified — welcome!");
      await nav({ to: redirect });
    } catch (err: any) {
      toast.error(err.message || "Invalid or expired code");
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (!email) return toast.error("Enter your email first");
    setBusy(true);
    try {
      if (isRecovery) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.resend({ type: "signup", email: email.trim() });
        if (error) throw error;
      }
      toast.success("New code sent. Check your inbox.");
      setResendIn(45);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const signOutAndExit = async () => {
    setBusy(true);
    try {
      await supabase.auth.signOut();
    } finally {
      await nav({ to: "/login" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-background via-accent/30 to-background">
      <div className="w-full max-w-md bg-card border rounded-3xl shadow-card p-6 md:p-8">
        <Link to="/" className="font-bold text-xl text-gradient font-display">StudentsPlug</Link>
        <h1 className="mt-4 text-2xl font-bold">{isRecovery ? "Reset your password" : "Verify your email"}</h1>
        <p className="text-sm text-muted-foreground">
          We sent a 6-digit code to <span className="font-medium text-foreground">{email || "your email"}</span>.
          {isRecovery ? " Enter it below to choose a new password." : " Enter it below to activate your account."}
        </p>

        <Button type="button" variant="secondary" className="w-full mt-4" disabled={busy || resendIn > 0} onClick={resend}>
          {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
        </Button>

        {!emailParam && (
          <div className="mt-4">
            <Label htmlFor="email">Email</Label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-md border bg-background"
              placeholder="you@school.edu"
            />
          </div>
        )}

        <div className="mt-6 flex justify-center">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={(v) => {
              setCode(v);
              if (v.length === 6) verify(v);
            }}
            disabled={busy}
          >
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        <Button className="w-full mt-6" disabled={busy || code.length !== 6} onClick={() => verify(code)}>
          {busy ? "Verifying…" : "Verify code"}
        </Button>

        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={resend}
            disabled={busy || resendIn > 0}
            className="text-primary font-semibold disabled:text-muted-foreground disabled:no-underline hover:underline"
          >
            {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
          </button>
          <button
            type="button"
            onClick={signOutAndExit}
            disabled={busy}
            className="text-muted-foreground hover:text-foreground hover:underline"
          >
            Sign out
          </button>
        </div>

        <p className="text-xs text-muted-foreground mt-6 text-center">
          Wrong email?{" "}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
