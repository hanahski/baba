import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Flag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";

type Target =
  | { kind: "post"; id: string }
  | { kind: "user"; id: string }
  | { kind: "listing"; id: string }
  | { kind: "general" }
  | { kind: "catalogue"; faculty?: string; department?: string };

const CATEGORIES = [
  "Spam or scam",
  "Harassment or hate",
  "Sexual or inappropriate",
  "Fake or misleading",
  "Stolen / copied content",
  "Missing / wrong course",
  "Missing / wrong department",
  "Missing / wrong faculty",
  "Bug or broken feature",
  "Other",
];

export function ReportDialog({ target, trigger, label }: { target: Target; trigger?: React.ReactNode; label?: string }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const initialCategory = target.kind === "catalogue" ? "Missing / wrong course" : CATEGORIES[0];
  const [category, setCategory] = useState(initialCategory);
  const [subject, setSubject] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user) { toast.error("Sign in to report"); nav({ to: "/login", search: { redirect: "/" } }); return; }
    if (reason.trim().length < 6) { toast.error("Please add a short reason (6+ chars)"); return; }
    setBusy(true);
    const contextLine =
      target.kind === "catalogue"
        ? `Catalogue: ${target.faculty ?? "—"}${target.department ? ` › ${target.department}` : ""}`
        : null;
    const fullReason = [contextLine, reason.trim()].filter(Boolean).join("\n").slice(0, 1000);
    const row: any = {
      reporter_id: user.id,
      category,
      subject: subject.trim().slice(0, 120) || null,
      reason: fullReason,
      target_user_id: target.kind === "user" ? target.id : null,
      target_post_id: target.kind === "post" ? target.id : null,
      target_listing_id: target.kind === "listing" ? target.id : null,
    };
    const { error } = await supabase.from("user_reports" as any).insert(row);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Report sent to admins. Thank you.");
    setOpen(false); setReason(""); setSubject("");
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-muted-foreground hover:bg-muted text-xs"
        title="Report"
      >
        {trigger ?? <><Flag className="w-3.5 h-3.5" /> {label ?? "Report"}</>}
      </button>
      {open && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={() => setOpen(false)}>
          <div className="bg-card border rounded-3xl w-full max-w-md p-5 space-y-3 shadow-glow" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold font-display inline-flex items-center gap-2">
                <Flag className="w-4 h-4 text-destructive" />
                Report {target.kind === "general" ? "an issue" : target.kind === "catalogue" ? "catalogue issue" : target.kind}
              </h3>
              <button onClick={() => setOpen(false)} className="p-1 rounded-full hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            {target.kind === "catalogue" && (
              <p className="text-xs text-muted-foreground">
                Help admins fix the EBSU catalogue. Mention the exact faculty, department, course code, and what's wrong or missing.
              </p>
            )}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-background border rounded-xl px-3 py-2 text-sm">
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Subject (optional)</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value.slice(0, 120))}
                placeholder="Short headline"
                className="w-full bg-background border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Details</label>
              <textarea
                value={reason} onChange={(e) => setReason(e.target.value.slice(0, 1000))}
                rows={4} placeholder="Tell admins what's wrong…"
                className="w-full bg-background border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <p className="text-[10px] text-muted-foreground text-right">{reason.length}/1000</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={submit} disabled={busy} className="flex-1">{busy ? "Sending…" : "Send report"}</Button>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
