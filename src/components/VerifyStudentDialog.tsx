import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { verifyEbsuStudent } from "@/lib/verify-student.functions";
import { useAuth } from "@/lib/auth";
import { playVerifiedChime } from "@/lib/sounds";

export function VerifyStudentDialog({
  open,
  onOpenChange,
  onVerified,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onVerified?: () => void;
}) {
  const verify = useServerFn(verifyEbsuStudent);
  const { refreshProfile } = useAuth();
  const [jamb, setJamb] = useState("");
  const SESSIONS = (() => {
    const out: string[] = [];
    for (let y = 2026; y >= 2016; y--) out.push(`${y}-${y + 1}`);
    return out;
  })();
  const [session, setSession] = useState<string>(SESSIONS[1]); // default last completed session
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = jamb.trim().toUpperCase().replace(/\s+/g, "");
    if (!clean) {
      toast.error("Enter your JAMB or EBSU registration number");
      return;
    }
    if (!/^\d{4}-\d{4}$/.test(session)) {
      toast.error("Select your admission session");
      return;
    }
    setBusy(true);
    try {
      const r = await verify({ data: { jambRegNumber: clean, session } });
      if (r.ok) {
        setSuccess(true);
        playVerifiedChime();
        await refreshProfile();
        // Hold the celebration for ~2.4s then close.
        setTimeout(() => {
          setSuccess(false);
          onOpenChange(false);
          onVerified?.();
        }, 2400);
      } else {
        toast.error(r.error || "We couldn't verify you. Try again.");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Verification failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Dialog open={open && !success} onOpenChange={(v) => !busy && onOpenChange(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
              <GraduationCap className="w-7 h-7 text-primary-foreground" />
            </div>
            <DialogTitle className="text-center font-display">Get your Authentication badge</DialogTitle>
            <DialogDescription className="text-center">
            We check your JAMB or EBSU registration number against the official
            EBSU portal, then grant your Authentication badge instantly.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div>
            <Label htmlFor="jamb">JAMB or EBSU registration number</Label>
              <Input
                id="jamb"
                autoFocus
                value={jamb}
                onChange={(e) => setJamb(e.target.value.toUpperCase())}
              placeholder="e.g. 202551915114FF or EBSU/2024/00123"
                className="font-mono tracking-wider uppercase"
                maxLength={20}
                disabled={busy}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
              />
            <p className="text-xs text-muted-foreground mt-1">
              Current students and alumni are both welcome. Tip: if your EBSU
              reg number doesn't work, try your JAMB registration number.
            </p>
            </div>
            <div>
              <Label htmlFor="session">Admission session</Label>
              <select
                id="session"
                value={session}
                onChange={(e) => setSession(e.target.value)}
                disabled={busy}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {SESSIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Pick the session you were admitted in.
              </p>
            </div>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Checking with EBSU…</>
              ) : (
                <><ShieldCheck className="w-4 h-4 mr-2" />Authenticate me</>
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Full-screen success celebration */}
      {success && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md animate-fade-in"
          role="status"
          aria-live="polite"
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-success/20 blur-3xl animate-ping" />
            <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-to-br from-success to-success/70 flex items-center justify-center shadow-glow animate-scale-in">
              <svg viewBox="0 0 52 52" className="w-20 h-20 sm:w-24 sm:h-24 text-success-foreground">
                <circle cx="26" cy="26" r="25" fill="none" stroke="currentColor" strokeWidth="2" strokeOpacity="0.4" />
                <path
                  d="M14 27 l8 8 l16 -18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="check-draw"
                />
              </svg>
            </div>
          </div>
          <h2 className="mt-8 text-2xl sm:text-3xl font-bold font-display text-gradient text-center px-4 animate-fade-in-up">
            You're authenticated!
          </h2>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground text-center px-6 max-w-sm animate-fade-in-up">
            Your Authentication badge is live. You can now post, download, and unlock everything.
          </p>
        </div>
      )}
    </>
  );
}
