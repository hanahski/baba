import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { supportsNativeGoogle, requestNativeGoogleSignIn } from "@/lib/app-bridge";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { claimSeedAdminRole } from "@/lib/admin-role";
import brandLogo from "@/assets/brand-logo.png.asset.json";

const SEED_ADMIN_EMAILS = new Set(["admin+qx162n@ebsuplug.app", "consequenceoct@gmail.com"]);
const GOOGLE_REDIRECT_KEY = "studentsplug:google-redirect";

function isSeedAdminEmail(value: string) {
  return SEED_ADMIN_EMAILS.has(value.trim().toLowerCase());
}

function isInvalidLoginError(error: unknown) {
  return String((error as { message?: string } | null)?.message ?? error)
    .toLowerCase()
    .includes("invalid login credentials");
}

function getSafeRedirect(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/~oauth")) return "/";
  return value;
}

function getStoredGoogleRedirect() {
  try {
    return getSafeRedirect(sessionStorage.getItem(GOOGLE_REDIRECT_KEY) ?? undefined);
  } catch {
    return "/";
  }
}

function storeGoogleRedirect(value: string) {
  try {
    sessionStorage.setItem(GOOGLE_REDIRECT_KEY, getSafeRedirect(value));
  } catch {
    // ignore storage failures; Google sign-in still works without post-login redirect
  }
}

function clearStoredGoogleRedirect() {
  try {
    sessionStorage.removeItem(GOOGLE_REDIRECT_KEY);
  } catch {
    // ignore
  }
}

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({ redirect: (s.redirect as string | undefined) ?? undefined }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect: redirectParam } = Route.useSearch();
  const redirect = getSafeRedirect(redirectParam);
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled || !data.session) return;
      const target = getStoredGoogleRedirect() || redirect;
      clearStoredGoogleRedirect();
      await nav({ to: target });
    });
    return () => { cancelled = true; };
  }, [nav, redirect]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { display_name: name || email.split("@")[0] } },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Account created. Check your email for a 6-digit code.", { duration: 6000 });
          await nav({ to: "/verify-otp", search: { email, redirect } });
          return;
        }
        toast.success("Welcome to StudentsPlug!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          // Email-not-confirmed → send them to OTP entry instead of failing
          const msg = String(error.message || "").toLowerCase();
          if (msg.includes("confirm") || msg.includes("not confirmed")) {
            await supabase.auth.resend({ type: "signup", email }).catch(() => {});
            toast.message("Check your email for a 6-digit code to finish verifying.");
            await nav({ to: "/verify-otp", search: { email, redirect } });
            return;
          }
          if (isSeedAdminEmail(email) && isInvalidLoginError(error)) {
            const { data: created, error: createErr } = await supabase.auth.signUp({
              email,
              password,
              options: { data: { display_name: "Admin" } },
            });
            if (createErr) throw createErr;
            if (!created.session) {
              toast.success("Admin account created. Enter the 6-digit code from your email.", { duration: 7000 });
              await nav({ to: "/verify-otp", search: { email, redirect } });
              return;
            }
            await claimSeedAdminRole().catch((claimErr) => console.error("[login] admin claim failed", claimErr));
            toast.success("Admin account created and signed in");
          } else {
            throw error;
          }
        } else if (isSeedAdminEmail(email)) {
          await claimSeedAdminRole().catch((claimErr) => console.error("[login] admin claim failed", claimErr));
        }

        // Hard gate: blocked / deactivated accounts cannot sign in.
        const { data: userRes } = await supabase.auth.getUser();
        const uid = userRes.user?.id;
        if (uid) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("status")
            .eq("id", uid)
            .maybeSingle();
          if (prof?.status && prof.status !== "active") {
            await supabase.auth.signOut();
            throw new Error(
              prof.status === "blocked"
                ? "Your account has been blocked. You can't access StudentsPlug."
                : "Your account has been deactivated and can't be used to sign in.",
            );
          }
        }
        toast.success("Signed in");
      }
      await nav({ to: redirect });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    const ctx = {
      origin: window.location.origin,
      href: window.location.href,
      inIframe: window.self !== window.top,
      userAgent: navigator.userAgent,
      cookiesEnabled: navigator.cookieEnabled,
      time: new Date().toISOString(),
    };
    console.log("[GoogleSignIn] start", ctx);

    // In the Android wrapper, route through the native account picker and
    // exchange the resulting Google ID token for a Supabase session. This
    // completely avoids the web OAuth popup inside the app.
    if (supportsNativeGoogle()) {
      try {
        const idToken = await requestNativeGoogleSignIn();
        const { error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: idToken,
        });
        if (error) throw error;
        toast.success("Signed in");
        await nav({ to: redirect });
      } catch (err: any) {
        console.error("[GoogleSignIn] native failed", err);
        toast.error(`Google sign-in failed: ${err?.message || String(err)}`);
      } finally {
        setBusy(false);
      }
      return;
    }

    try {
      storeGoogleRedirect(redirect);
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/login`,
        extraParams: { prompt: "select_account" },
      });
      console.log("[GoogleSignIn] result", {
        redirected: (result as any)?.redirected,
        hasError: !!(result as any)?.error,
        errorName: (result as any)?.error?.name,
        errorMessage: (result as any)?.error?.message,
        errorCode: (result as any)?.error?.code ?? (result as any)?.error?.status,
        errorStack: (result as any)?.error?.stack,
        rawError: (result as any)?.error,
        rawResult: result,
      });
      if (result.error) {
        toast.error(`Google sign-in failed: ${result.error.message || "unknown error"}`);
        setBusy(false);
        return;
      }
      if (result.redirected) return;
      clearStoredGoogleRedirect();
      await nav({ to: redirect });
    } catch (err: any) {
      console.error("[GoogleSignIn] threw", {
        name: err?.name,
        message: err?.message,
        code: err?.code ?? err?.status,
        stack: err?.stack,
        raw: err,
        ctx,
      });
      toast.error(`Google sign-in error: ${err?.message || String(err)}`);
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-background via-accent/30 to-background">
      <div className="w-full max-w-md bg-card border rounded-3xl shadow-card p-6 md:p-8">
        <Link to="/" className="font-bold text-gradient font-display inline-flex items-center gap-0.5">
          <img src={brandLogo.url} alt="" className="h-10 w-10 object-contain" />
          <span className="text-sm leading-none">tudentsPlug</span>
        </Link>
        <h1 className="mt-4 text-2xl font-bold">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
        <p className="text-sm text-muted-foreground">{mode === "signin" ? "Sign in to read posts, download files, and rank up." : "Join the plug. Free forever."}</p>

        <Button type="button" variant="outline" className="w-full mt-6" onClick={google} disabled={busy}>
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </Button>

        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground"><div className="flex-1 h-px bg-border" />or<div className="flex-1 h-px bg-border" /></div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <div><Label htmlFor="name">Display name</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></div>
          )}
          <div><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="pw">Password</Label>
              {mode === "signin" && (
                <button
                  type="button"
                  className="text-xs text-primary hover:underline font-medium"
                  onClick={async () => {
                    if (!email) return toast.error("Enter your email first");
                    setBusy(true);
                    try {
                      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
                      if (error) throw error;
                      toast.success("Code sent. Check your inbox.");
                      await nav({ to: "/verify-otp", search: { email, redirect, mode: "recovery" } });
                    } catch (err: any) {
                      toast.error(err.message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Forgot password?
                </button>
              )}
            </div>
            <Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}</Button>
        </form>

        <p className="text-sm text-center mt-4 text-muted-foreground">
          {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
          <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-primary font-semibold hover:underline">
            {mode === "signin" ? "Create account" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
