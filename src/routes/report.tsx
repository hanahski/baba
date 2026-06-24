import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Flag, ImagePlus, X, ArrowLeft, Loader2, Camera } from "lucide-react";

const searchSchema = z.object({
  kind: z.enum(["post", "user", "listing", "general", "catalogue"]).optional(),
  id: z.string().optional(),
  faculty: z.string().optional(),
  department: z.string().optional(),
});

export const Route = createFileRoute("/report")({
  validateSearch: searchSchema,
  component: ReportPage,
});

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

const BUCKET = "post-media";
const MAX_SHOTS = 4;

function ReportPage() {
  const search = useSearch({ from: "/report" });
  const nav = useNavigate();
  const { user } = useAuth();
  const kind = search.kind ?? "general";

  const initialCategory =
    kind === "catalogue" ? "Missing / wrong course" : CATEGORIES[0];
  const [category, setCategory] = useState(initialCategory);
  const [subject, setSubject] = useState("");
  const [reason, setReason] = useState("");
  const [shots, setShots] = useState<{ url: string; path: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const titleSuffix =
    kind === "general"
      ? "an issue"
      : kind === "catalogue"
      ? "catalogue issue"
      : kind;

  async function pickFiles(files: FileList | null) {
    if (!files || !user) {
      if (!user) toast.error("Sign in first");
      return;
    }
    const remaining = MAX_SHOTS - shots.length;
    const list = Array.from(files).slice(0, remaining);
    if (list.length === 0) return;
    setUploading(true);
    try {
      const uploaded: { url: string; path: string }[] = [];
      for (const f of list) {
        if (f.size > 8 * 1024 * 1024) {
          toast.error(`${f.name} > 8MB — skipped`);
          continue;
        }
        const ext = f.name.split(".").pop() || "png";
        const path = `reports/${user.id}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(path, f, { upsert: false, contentType: f.type });
        if (error) {
          toast.error(error.message);
          continue;
        }
        const url = supabase.storage.from(BUCKET).getPublicUrl(path).data
          .publicUrl;
        uploaded.push({ url, path });
      }
      setShots((s) => [...s, ...uploaded]);
    } finally {
      setUploading(false);
    }
  }

  async function removeShot(idx: number) {
    const shot = shots[idx];
    setShots((s) => s.filter((_, i) => i !== idx));
    try {
      await supabase.storage.from(BUCKET).remove([shot.path]);
    } catch {}
  }

  async function submit() {
    if (!user) {
      toast.error("Sign in to report");
      nav({ to: "/login", search: { redirect: "/report" } });
      return;
    }
    if (reason.trim().length < 6) {
      toast.error("Please add a short reason (6+ chars)");
      return;
    }
    setBusy(true);
    const contextLine =
      kind === "catalogue"
        ? `Catalogue: ${search.faculty ?? "—"}${
            search.department ? ` › ${search.department}` : ""
          }`
        : null;
    const screenshotLine =
      shots.length > 0
        ? `Screenshots:\n${shots.map((s) => s.url).join("\n")}`
        : null;
    const fullReason = [contextLine, reason.trim(), screenshotLine]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 4000);
    const row: any = {
      reporter_id: user.id,
      category,
      subject: subject.trim().slice(0, 120) || null,
      reason: fullReason,
      target_user_id: kind === "user" ? search.id : null,
      target_post_id: kind === "post" ? search.id : null,
      target_listing_id: kind === "listing" ? search.id : null,
    };
    const { error } = await supabase.from("user_reports" as any).insert(row);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Report sent to admins. Thank you.");
    nav({ to: "/" });
  }

  return (
    <AppShell>
      <div className="max-w-xl mx-auto">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="bg-card border rounded-3xl shadow-card p-5 sm:p-6 space-y-5">
          <header className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-destructive/10 grid place-items-center shrink-0">
              <Flag className="w-5 h-5 text-destructive" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold font-display">Report {titleSuffix}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Send screenshots and a clear description — admins review every report.
              </p>
            </div>
          </header>

          {kind === "catalogue" && (
            <div className="bg-muted/40 border rounded-2xl p-3 text-xs text-muted-foreground">
              Help fix the EBSU catalogue. Include the exact faculty, department,
              course code, and what's wrong or missing.
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-background border rounded-xl px-3 py-2.5 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Subject (optional)
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value.slice(0, 120))}
              placeholder="Short headline"
              className="w-full bg-background border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              What happened?
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 2000))}
              rows={6}
              placeholder="Describe the issue clearly. Include usernames, links, or steps to reproduce."
              className="w-full bg-background border rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />
            <p className="text-[10px] text-muted-foreground text-right">{reason.length}/2000</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5" /> Send screenshots ({shots.length}/{MAX_SHOTS})
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                pickFiles(e.target.files);
                if (fileRef.current) fileRef.current.value = "";
              }}
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {shots.map((s, i) => (
                <div key={s.path} className="relative aspect-square rounded-xl overflow-hidden border bg-muted">
                  <img src={s.url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeShot(i)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white grid place-items-center"
                    aria-label="Remove"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {shots.length < MAX_SHOTS && (
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="aspect-square rounded-xl border-2 border-dashed border-muted-foreground/30 grid place-items-center text-muted-foreground hover:text-primary hover:border-primary transition disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <div className="text-center">
                      <ImagePlus className="w-5 h-5 mx-auto" />
                      <p className="text-[10px] mt-1">Add image</p>
                    </div>
                  )}
                </button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">
              PNG or JPG, up to 8MB each. Screenshots help admins act faster.
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              onClick={submit}
              disabled={busy || reason.trim().length < 6}
              className="flex-1 h-11"
            >
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…
                </>
              ) : (
                <>
                  <Flag className="w-4 h-4 mr-2" /> Send report
                </>
              )}
            </Button>
            <Link to="/" className="contents">
              <Button variant="outline" className="h-11">Cancel</Button>
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
