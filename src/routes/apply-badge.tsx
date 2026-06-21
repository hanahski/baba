import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Star, ShieldCheck, Sparkles, Plug, ArrowLeft, Clock3, CheckCircle2, XCircle } from "lucide-react";

type BadgeKind = "star" | "legit" | "sure_plug" | "verified";

const BADGES: Record<BadgeKind, { label: string; icon: typeof Star; blurb: string }> = {
  star:      { label: "Star",            icon: Star,        blurb: "Highlighted member badge. Required (with Authentication) to sell tickets." },
  legit:     { label: "Legit",           icon: ShieldCheck, blurb: "Trusted contributor — vouched by the community." },
  sure_plug: { label: "Sure Plug",       icon: Plug,        blurb: "Professional plug, verified reliable seller." },
  verified:  { label: "Authentication",  icon: Sparkles,    blurb: "Official EBSU student / staff authentication badge." },
};

export const Route = createFileRoute("/apply-badge")({
  component: ApplyBadgePage,
  validateSearch: (s) => ({ badge: (s.badge as BadgeKind) || "star" }),
});

function ApplyBadgePage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const { badge: initialBadge } = Route.useSearch();
  const [badge, setBadge] = useState<BadgeKind>(initialBadge);
  const [reason, setReason] = useState("");
  const [reg, setReg] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && !user) nav({ to: "/login" }); }, [user, loading]);

  const { data: mine, refetch } = useQuery({
    queryKey: ["my-badge-apps", user?.id],
    enabled: !!user,
    queryFn: async () =>
      ((await (supabase as any).from("badge_applications").select("*").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? []) as any[],
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (reason.trim().length < 12) return toast.error("Tell us a bit more (12+ chars).");
    setBusy(true);
    const { error } = await (supabase as any).from("badge_applications").insert({
      user_id: user.id, badge, reason: reason.trim(), reg_number: reg.trim() || null, contact: contact.trim() || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Application sent to admin");
    setReason(""); setReg(""); setContact("");
    refetch();
  };

  const Icon = BADGES[badge].icon;

  return (
    <AppShell>
      <div className="max-w-xl mx-auto space-y-5">
        <Link to="/tickets" className="text-xs text-primary inline-flex items-center gap-1"><ArrowLeft className="w-3 h-3" />Back</Link>

        <div className="bg-gradient-to-br from-primary to-accent text-primary-foreground rounded-3xl p-6 shadow-card">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 grid place-items-center"><Icon className="w-6 h-6" /></div>
            <div>
              <h1 className="text-xl font-bold font-display">Apply for a special badge</h1>
              <p className="text-xs opacity-90">Admin reviews every request. We'll notify you in-app.</p>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="bg-card border rounded-2xl p-5 space-y-4">
          <div>
            <Label>Which badge?</Label>
            <Select value={badge} onValueChange={(v) => setBadge(v as BadgeKind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(BADGES) as BadgeKind[]).map((k) => (
                  <SelectItem key={k} value={k}>{BADGES[k].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">{BADGES[badge].blurb}</p>
          </div>

          <div>
            <Label htmlFor="reason">Why should we grant this? <span className="text-destructive">*</span></Label>
            <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={4} maxLength={600} placeholder="Tell admin about you, your activity, and why this badge fits." required />
          </div>

          <div>
            <Label htmlFor="reg">EBSU registration number (optional)</Label>
            <Input id="reg" value={reg} onChange={(e) => setReg(e.target.value.toUpperCase())} placeholder="e.g. 2024/123456" maxLength={40} />
          </div>

          <div>
            <Label htmlFor="contact">Contact (WhatsApp / phone) — optional</Label>
            <Input id="contact" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="+234…" maxLength={40} />
          </div>

          <Button type="submit" disabled={busy} className="w-full">{busy ? "Sending…" : "Submit application"}</Button>
        </form>

        <div className="bg-card border rounded-2xl p-4">
          <h2 className="font-bold font-display mb-2">My applications</h2>
          {(!mine || mine.length === 0) ? (
            <p className="text-sm text-muted-foreground">Nothing yet.</p>
          ) : (
            <ul className="divide-y -mx-4">
              {mine.map((a) => (
                <li key={a.id} className="px-4 py-3 flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{BADGES[a.badge as BadgeKind]?.label ?? a.badge}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{a.reason}</p>
                    {a.admin_note && <p className="text-xs mt-1"><strong>Admin:</strong> {a.admin_note}</p>}
                  </div>
                  <StatusPill status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { c: string; Icon: typeof Clock3; t: string }> = {
    pending:  { c: "bg-muted text-foreground",                     Icon: Clock3,        t: "Pending" },
    approved: { c: "bg-success/15 text-success border-success/30", Icon: CheckCircle2,  t: "Approved" },
    rejected: { c: "bg-destructive/15 text-destructive border-destructive/30", Icon: XCircle, t: "Rejected" },
  };
  const m = map[status] ?? map.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${m.c}`}>
      <m.Icon className="w-3 h-3" />{m.t}
    </span>
  );
}
