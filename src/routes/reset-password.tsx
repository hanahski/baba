import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const nav = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [logoutEverywhere, setLogoutEverywhere] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        toast.error("Reset session expired. Request a new code.");
        nav({ to: "/login" });
        return;
      }
      setReady(true);
    });
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) return toast.error("Password must be at least 6 characters");
    if (pw !== pw2) return toast.error("Passwords don't match");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      toast.success("Password updated");
      if (logoutEverywhere) {
        // Revoke all other sessions but keep this one signed-in
        await supabase.auth.signOut({ scope: "others" }).catch(() => {});
        toast.message("Signed out of all other devices");
      }
      await nav({ to: "/" });
    } catch (err: any) {
      toast.error(err.message || "Could not update password");
    } finally {
      setBusy(false);
    }
  };

  if (!ready) return null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-background via-accent/30 to-background">
      <div className="w-full max-w-md bg-card border rounded-3xl shadow-card p-6 md:p-8">
        <Link to="/" className="font-bold text-xl text-gradient font-display">StudentsPlug</Link>
        <h1 className="mt-4 text-2xl font-bold">Set a new password</h1>
        <p className="text-sm text-muted-foreground">Choose a strong password you'll remember.</p>

        <form onSubmit={submit} className="space-y-3 mt-6">
          <div>
            <Label htmlFor="pw">New password</Label>
            <Input id="pw" type="password" minLength={6} required value={pw} onChange={(e) => setPw(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="pw2">Confirm new password</Label>
            <Input id="pw2" type="password" minLength={6} required value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </div>

          <div className="flex items-start justify-between gap-3 pt-2 rounded-xl border p-3 bg-accent/20">
            <div>
              <Label className="font-medium">Log out everywhere else</Label>
              <p className="text-xs text-muted-foreground">Sign out all other devices using your account.</p>
            </div>
            <Switch checked={logoutEverywhere} onCheckedChange={setLogoutEverywhere} />
          </div>

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Saving…" : "Save new password"}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground mt-6 text-center">
          <Link to="/login" className="text-primary font-semibold hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
