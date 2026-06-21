import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fetchToolCost } from "@/lib/tool-prices";
import { toast } from "sonner";
import { ArrowLeft, Copy, Loader2, BookmarkPlus, Camera, ImageIcon, Send, Download, X, Sparkles, MessageSquareWarning, Eye, EyeOff } from "lucide-react";
import { postFromScan } from "@/lib/post-from-scan.functions";
import { extractTextFromImage, submitOcrCorrection } from "@/lib/ocr.functions";
import { OcrLoadingState } from "@/components/OcrLoadingState";
import { MathText } from "@/components/MathText";
import { pdfToImages } from "@/lib/pdf-to-images";
import {
  getActiveOcrPromise,
  getOcrJob,
  patchOcrJob,
  patchOcrItem,
  setOcrItems,
  resetOcrJob,
  setActiveOcrPromise,
  subscribeOcrJob,
  type OcrItem,
} from "@/lib/ocr-job";



export const Route = createFileRoute("/tools/ocr")({ component: OcrTool });

const SS_KEY = "ocr_tool_state_v2";

type Persisted = { dataUrl?: string; fileName?: string; title?: string; text?: string; original?: string };

function loadPersisted(): Persisted {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(sessionStorage.getItem(SS_KEY) || "{}"); } catch { return {}; }
}
function savePersisted(p: Persisted) {
  if (typeof window === "undefined") return;
  try { sessionStorage.setItem(SS_KEY, JSON.stringify(p)); } catch {}
}
function clearPersisted() {
  if (typeof window === "undefined") return;
  try { sessionStorage.removeItem(SS_KEY); } catch {}
}

function dataUrlToFile(dataUrl: string, name: string): File | null {
  try {
    const [meta, b64] = dataUrl.split(",");
    const mime = /data:([^;]+);/.exec(meta)?.[1] || "image/png";
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new File([arr], name, { type: mime });
  } catch { return null; }
}

async function fileToDataUrl(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(f);
  });
}

function OcrTool() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [originalText, setOriginalText] = useState(""); // unedited model output, for feedback diff
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportNote, setReportNote] = useState("");
  const postScan = useServerFn(postFromScan);
  const runOcr = useServerFn(extractTextFromImage);
  const sendCorrection = useServerFn(submitOcrCorrection);
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [restored, setRestored] = useState(false);

  // Reflect the module-level OCR job so navigation away/back keeps state.
  const job = useSyncExternalStore(subscribeOcrJob, getOcrJob, getOcrJob);
  const busy = job.running;
  const pdfProgress = job.progress;

  // Derive a short, human title from the first meaningful line of OCR text.
  // Avoids the long auto-generated filename titles users complained about.
  const titleFromText = (raw: string): string => {
    const first = raw
      .replace(/\$\$?[^$]*\$\$?/g, " ") // drop LaTeX
      .split(/\n+/)
      .map((l) => l.replace(/^[\s#*>\-–•·]+/, "").trim())
      .find((l) => l.length >= 4);
    if (!first) return "";
    const cut = first.split(/(?<=[.!?])\s/)[0] ?? first;
    return cut.slice(0, 70).replace(/\s+/g, " ").trim();
  };

  // Bug 4 — restore selection across refresh
  useEffect(() => {
    const p = loadPersisted();
    if (p.dataUrl) {
      setPreview(p.dataUrl);
      const f = dataUrlToFile(p.dataUrl, p.fileName || "restored.png");
      if (f) setFile(f);
      setRestored(true);
    }
    if (p.title) setTitle(p.title);
    if (p.text) setText(p.text);
    if (p.original) setOriginalText(p.original);
    // If a scan finished while we were on another page, hydrate from the store.
    const j = getOcrJob();
    if (!p.text && j.text) {
      setText(j.text);
      setOriginalText(j.original || j.text);
    }
  }, []);

  // When an active job completes while this component is mounted, pull the
  // result into local state so the UI updates immediately.
  useEffect(() => {
    if (!job.running && job.text && !text) {
      setText(job.text);
      setOriginalText(job.original || job.text);
      const baseName = (job.fileName || "").replace(/\.[^.]+$/, "");
      const auto = titleFromText(job.text);
      if (auto && (!title.trim() || title.trim() === baseName)) setTitle(auto);
    }
  }, [job.completedAt]);

  useEffect(() => {
    if (restored) {
      toast.info("Restored your last image");
      setRestored(false);
    }
  }, [restored]);

  const pick = async (f: File | null) => {
    setText(""); setOriginalText("");
    if (!f) { setFile(null); setPreview(null); clearPersisted(); return; }
    setFile(f);
    const name = f.name.replace(/\.[^.]+$/, "");
    setTitle(name);
    const url = await fileToDataUrl(f);
    setPreview(url);
    savePersisted({ dataUrl: url, fileName: f.name, title: name, text: "" });
  };

  const onPickInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    pick(f);
    e.target.value = ""; // allow re-pick same file (Bug 5)
  };

  const clear = () => {
    setFile(null); setPreview(null); setText(""); setOriginalText(""); setTitle("");
    clearPersisted();
    resetOcrJob();
  };

  const logFailure = async (msg: string) => {
    if (!user) return;
    try {
      await supabase.from("tool_failure_log").insert({
        user_id: user.id,
        tool_name: "image_to_text",
        error_message: msg,
        metadata: { fileName: file?.name, size: file?.size },
      });
    } catch {}
  };

  const run = async () => {
    if (!user) return toast.error("Sign in first");
    if (!file || !preview) return toast.error("Pick an image or PDF first");
    if (getActiveOcrPromise()) {
      toast.info("A scan is already running…");
      return;
    }
    const capturedFile = file;
    const capturedPreview = preview;
    patchOcrJob({
      running: true,
      progress: null,
      error: null,
      text: "",
      original: "",
      fileName: capturedFile.name,
    });
    const promise = (async () => {
    try {
      const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      let extracted = "";
      let totalElapsed = 0;
      let modelUsed = "";

      if (isPdf) {
        patchOcrJob({ progress: { done: 0, total: 1 } });
        const pages = await pdfToImages(file, {
          maxPages: 20,
          scale: 2,
          onProgress: (done, total) => patchOcrJob({ progress: { done, total } }),
        });
        if (pages.length === 0) {
          toast.error("Could not read PDF. No credit was deducted.");
          return;
        }
        const parts: string[] = [];
        for (const pg of pages) {
          patchOcrJob({ progress: { done: pg.page - 1, total: pages.length } });
          const r = await runOcr({ data: { imageDataUrl: pg.dataUrl, mimeType: "image/png" } });
          if (!r.ok) {
            await logFailure(`page ${pg.page}: ${r.error}`);
            toast.error(`Page ${pg.page}: ${r.error} No credit was deducted.`);
            return;
          }
          parts.push(pages.length > 1 ? `--- Page ${pg.page} ---\n${r.text}` : r.text);
          totalElapsed += r.elapsedMs;
          modelUsed = r.model;
          patchOcrJob({ progress: { done: pg.page, total: pages.length } });
        }
        extracted = parts.join("\n\n");
      } else {
        const r = await runOcr({
          data: { imageDataUrl: preview, mimeType: file.type || "image/png" },
        });
        if (!r.ok) {
          await logFailure(r.error);
          toast.error(`${r.error} No credit was deducted.`);
          return;
        }
        extracted = r.text;
        totalElapsed = r.elapsedMs;
        modelUsed = r.model;
      }

      // Only deduct AFTER success
      try {
        const cost = await fetchToolCost("/tools/ocr", 10);
        if (cost > 0) {
          const { error } = await supabase.rpc("spend_credits", {
            _amount: cost,
            _reason: "tool:image_to_text",
            _metadata: { name: file.name, model: modelUsed, elapsedMs: totalElapsed, isPdf },
          });
          if (error) {
            if (error.message.includes("INSUFFICIENT_CREDITS")) toast.error("Not enough credits — but here's your text anyway", { action: { label: "Get credits", onClick: () => navigate({ to: "/get-credits" }) } });
            else toast.error(error.message);
          } else {
            toast.success(`Done in ${(totalElapsed / 1000).toFixed(1)}s · −${cost} credits`);
            refreshProfile();
          }
        } else {
          toast.success(`Done in ${(totalElapsed / 1000).toFixed(1)}s`);
        }
      } catch (e: any) {
        toast.error(e?.message || "Credit charge failed");
      }

      // Cache result on the module store so navigating away/back still has it
      patchOcrJob({
        text: extracted,
        original: extracted,
        elapsedMs: totalElapsed,
        model: modelUsed,
        isPdf,
      });
      // Replace filename-based title with a short, content-derived one
      // unless the user has already typed a custom title.
      const baseName = (capturedFile.name || "").replace(/\.[^.]+$/, "");
      const auto = titleFromText(extracted);
      const nextTitle = auto && (!title.trim() || title.trim() === baseName) ? auto : title;
      // Persist for refresh recovery
      savePersisted({
        dataUrl: capturedPreview,
        fileName: capturedFile.name,
        title: nextTitle,
        text: extracted,
        original: extracted,
      });
    } catch (e: any) {
      const msg = e?.message || "Scanner crashed";
      await logFailure(msg);
      toast.error(`${msg}. No credit was deducted.`);
      patchOcrJob({ error: msg });
    } finally {
      patchOcrJob({ running: false, progress: null, completedAt: Date.now() });
      setActiveOcrPromise(null);
    }
    })();
    setActiveOcrPromise(promise);
  };

  const saveAsNote = async () => {
    if (!user) return toast.error("Sign in first");
    if (!text.trim()) return toast.error("Nothing to save");
    if (!title.trim()) return toast.error("Give it a title");
    setSaving(true);
    try {
      const { error } = await supabase.from("study_notes").insert({
        uploader_id: user.id,
        title: title.trim(),
        body: text.trim(),
      });
      if (error) throw error;
      toast.success("Saved to Study Notes");
      clearPersisted();
      navigate({ to: "/notes" });
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  const reportError = async () => {
    if (!user) return toast.error("Sign in first");
    if (!text.trim() || !originalText.trim()) return;
    if (text.trim() === originalText.trim() && !reportNote.trim()) {
      return toast.error("Edit the text first, or add a note explaining the error.");
    }
    setReporting(true);
    try {
      const r = await sendCorrection({
        data: {
          originalText: originalText,
          correctedText: text,
          note: reportNote.trim() || undefined,
        },
      });
      if (!r.ok) throw new Error(r.error);
      toast.success("Thanks! Your correction will help us improve.");
      setReportNote("");
    } catch (e: any) {
      toast.error(e?.message || "Could not submit feedback");
    } finally {
      setReporting(false);
    }
  };

  // Persist edits
  useEffect(() => {
    if (!preview) return;
    const p = loadPersisted();
    savePersisted({ ...p, title, text });
  }, [title, text, preview]);

  return (
    <div className="bg-card border rounded-2xl p-6 shadow-card space-y-4 animate-fade-in-up">
      <Link to="/tools" className="text-xs text-primary inline-flex items-center gap-1"><ArrowLeft className="w-3 h-3" />All tools</Link>
      <div>
        <h2 className="text-xl font-bold font-display flex items-center gap-2">
          Image / PDF → Text
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-primary/20 to-accent text-primary inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" />AI · LaTeX-aware
          </span>
        </h2>
        <p className="text-sm text-muted-foreground">
          Snap a page or pick from your gallery. Handwriting, printed text, math formulas — all converted with LaTeX.
          Credits charged only on success.
        </p>
      </div>

      <BatchOcrPanel runOcr={runOcr} userId={user?.id ?? null} onCharge={() => refreshProfile()} />



      <div className="space-y-2">
        <Label>Add an image</Label>
        {/* Bug 5 — gallery picker (no capture attr so it opens the file browser) */}
        <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={onPickInput} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPickInput} />
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={() => cameraRef.current?.click()}>
            <Camera className="w-4 h-4 mr-2" />Take photo
          </Button>
          <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
            <ImageIcon className="w-4 h-4 mr-2" />Image or PDF
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">PDFs are scanned page by page (up to 20 pages).</p>
        {file && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="truncate">{file.name}</span>
            <button type="button" onClick={clear} className="inline-flex items-center gap-1 text-destructive hover:underline">
              <X className="w-3 h-3" />Clear
            </button>
          </div>
        )}
      </div>
      <Button onClick={run} disabled={busy || !file} className="w-full">
        {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Working…</> : "Extract text (−10 on success)"}
      </Button>

      {busy && <OcrLoadingState />}
      {busy && pdfProgress && pdfProgress.total > 1 && (
        <p className="text-xs text-center text-muted-foreground">
          Scanning page {pdfProgress.done} of {pdfProgress.total}…
        </p>
      )}

      {text && (
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
              <Label>Rendered preview</Label>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => {
                    try {
                      sessionStorage.setItem("plug-ai-prefill", text);
                    } catch {}
                    navigate({ to: "/chat", search: { tab: "dms", t: "plug-ai" } });
                  }}
                >
                  <Sparkles className="w-3 h-3 mr-1" />Ask Plug AI
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(text); toast.success("Copied"); }}>
                  <Copy className="w-3 h-3 mr-1" />Copy
                </Button>
              </div>
            </div>
            <div className="rounded-md bg-background p-3 border">
              <MathText>{text}</MathText>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Equations wrapped in <code>$…$</code> render as proper formulas. Tap <b>Ask Plug AI</b> to solve, explain or expand this scan.
            </p>
          </div>




          {/* Feedback loop — Feature 15 / Bug 9b */}
          <details className="rounded-xl border bg-muted/30 p-3">
            <summary className="cursor-pointer text-sm font-semibold inline-flex items-center gap-1">
              <MessageSquareWarning className="w-4 h-4 text-primary" />
              Spot a mistake? Help us improve
            </summary>
            <div className="mt-3 space-y-2">
              <p className="text-xs text-muted-foreground">
                Edit the extracted text below to fix any errors, then submit. Your correction trains the scanner.
              </p>
              <Textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} className="font-mono text-sm" />
              <Input
                value={reportNote}
                onChange={(e) => setReportNote(e.target.value)}
                placeholder="Optional: describe the error (e.g. 'misread H₂O as H2O')"
                maxLength={500}
              />

              <Button size="sm" variant="secondary" onClick={reportError} disabled={reporting}>
                {reporting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
                Submit correction
              </Button>
            </div>
          </details>

          <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-accent p-4 space-y-3">
            <Label>Title for this scan</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (e.g. CSC 201 — Chapter 3)" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button onClick={saveAsNote} disabled={saving} variant="secondary">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BookmarkPlus className="w-4 h-4 mr-2" />}
                Save note
              </Button>
              <Button
                onClick={() => {
                  if (!user) return toast.error("Sign in first");
                  if (!text.trim() || !title.trim()) return toast.error("Need title and text");
                  setPosting(true);
                  try {
                    sessionStorage.setItem("post_new_prefill", JSON.stringify({
                      title: title.trim(),
                      body: text.trim(),
                      type: "past_question",
                    }));
                    clearPersisted();
                    navigate({ to: "/post/new", search: { course: "", type: "past_question" } });
                  } finally { setPosting(false); }
                }}
                disabled={posting}
              >
                {posting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Post as past question
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${(title || "scan").replace(/[^a-z0-9_-]+/gi, "_")}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success("Downloaded");
                }}
              >
                <Download className="w-4 h-4 mr-2" />Download
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">Post to feed auto-generates a cover image that matches what you scanned.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Multi-image batch panel — up to 10 images, runs in background, notifies
// when complete. Uses the shared ocr-job store so navigating away keeps it
// running.
// ---------------------------------------------------------------------------
function BatchOcrPanel({
  runOcr,
  userId,
  onCharge,
}: {
  runOcr: ReturnType<typeof useServerFn<typeof extractTextFromImage>>;
  userId: string | null;
  onCharge: () => void;
}) {
  const job = useSyncExternalStore(subscribeOcrJob, getOcrJob, getOcrJob);
  const items = job.items;
  const batchRef = useRef<HTMLInputElement>(null);
  // Derive working state from the store so it survives navigation away/back.
  const working = items.some((it) => it.status === "scanning");
  const [savingAll, setSavingAll] = useState(false);

  const pick = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!userId) { toast.error("Sign in first"); return; }
    const arr = Array.from(files).slice(0, 10);
    if (files.length > 10) toast.info("Only the first 10 images were added");
    const next: OcrItem[] = [];
    for (const f of arr) {
      if (!f.type.startsWith("image/")) continue;
      const dataUrl = await fileToDataUrl(f);
      next.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: f.name,
        dataUrl,
        mimeType: f.type || "image/png",
        status: "queued",
        text: "",
        error: null,
        elapsedMs: 0,
      });
    }
    setOcrItems([...(items ?? []), ...next].slice(0, 10));
  };

  const removeItem = (id: string) => {
    setOcrItems(items.filter((it) => it.id !== id));
  };

  const requestNotifyPermission = async () => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      try { await Notification.requestPermission(); } catch {}
    }
  };

  const notifyDone = (okCount: number, failCount: number) => {
    const msg = `Scanned ${okCount} image${okCount === 1 ? "" : "s"}${failCount ? ` · ${failCount} failed` : ""}`;
    toast.success(msg);
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      try { new Notification("Scan complete", { body: msg }); } catch {}
    }
  };

  const runBatch = async () => {
    if (!userId) { toast.error("Sign in first"); return; }
    const queued = items.filter((it) => it.status === "queued" || it.status === "failed");
    if (!queued.length) { toast.info("Nothing to scan"); return; }
    await requestNotifyPermission();
    let okCount = 0;
    let failCount = 0;
    for (const it of queued) {
      // If offline, pause and wait for online
      while (typeof navigator !== "undefined" && !navigator.onLine) {
        await new Promise((r) => setTimeout(r, 2000));
      }
      patchOcrItem(it.id, { status: "scanning", error: null });
      const t0 = Date.now();
      try {
        const r = await runOcr({ data: { imageDataUrl: it.dataUrl, mimeType: it.mimeType } });
        if ((r as any).ok) {
          patchOcrItem(it.id, { status: "done", text: (r as any).text, elapsedMs: Date.now() - t0 });
          okCount++;
        } else {
          patchOcrItem(it.id, { status: "failed", error: (r as any).error || "Failed" });
          failCount++;
        }
      } catch (e: any) {
        patchOcrItem(it.id, { status: "failed", error: e?.message || "Failed" });
        failCount++;
      }
    }
    if (okCount > 0) {
      try {
        const cost = await fetchToolCost("/tools/ocr", 10);
        if (cost > 0) {
          await supabase.rpc("spend_credits", {
            _amount: cost * okCount,
            _reason: "tool:image_to_text_batch",
            _metadata: { count: okCount },
          });
          onCharge();
        }
      } catch {}
    }
    notifyDone(okCount, failCount);
  };

  const copyAll = () => {
    const all = items.filter((it) => it.status === "done").map((it) => `--- ${it.name} ---\n${it.text}`).join("\n\n");
    if (!all) return toast.info("Nothing to copy yet");
    navigator.clipboard.writeText(all);
    toast.success("Copied all results");
  };

  const saveAllAsNotes = async () => {
    if (!userId) return toast.error("Sign in first");
    const done = items.filter((it) => it.status === "done" && it.text.trim());
    if (!done.length) return toast.info("Nothing to save yet");
    setSavingAll(true);
    try {
      const rows = done.map((it) => ({
        uploader_id: userId,
        title: it.name.replace(/\.[^.]+$/, "").slice(0, 80) || "Scan",
        body: it.text.trim(),
      }));
      const { error } = await supabase.from("study_notes").insert(rows);
      if (error) throw error;
      toast.success(`Saved ${done.length} note${done.length === 1 ? "" : "s"}`);
    } catch (e: any) {
      toast.error(e?.message || "Could not save notes");
    } finally {
      setSavingAll(false);
    }
  };

  const clearAll = () => setOcrItems([]);


  return (
    <details className="rounded-2xl border bg-gradient-to-br from-accent/30 to-card p-4 my-3" open={items.length > 0}>
      <summary className="cursor-pointer font-semibold text-sm inline-flex items-center gap-1.5">
        <ImageIcon className="w-4 h-4 text-primary" />
        Batch scan up to 10 images
        {items.length > 0 && <span className="text-xs text-muted-foreground">({items.length}/10)</span>}
      </summary>
      <div className="mt-3 space-y-3">
        <input
          ref={batchRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => { void pick(e.target.files); e.target.value = ""; }}
        />
        <div className="flex gap-2 flex-wrap">
          <Button type="button" size="sm" variant="outline" onClick={() => batchRef.current?.click()} disabled={working}>
            <ImageIcon className="w-4 h-4 mr-1" />Add images
          </Button>
          <Button type="button" size="sm" onClick={runBatch} disabled={working || items.length === 0}>
            {working ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Scanning…</> : `Scan all (−10 each)`}
          </Button>
          {items.some((it) => it.status === "done") && (
            <>
              <Button type="button" size="sm" variant="ghost" onClick={copyAll}>
                <Copy className="w-4 h-4 mr-1" />Copy all
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={saveAllAsNotes} disabled={savingAll}>
                {savingAll ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <BookmarkPlus className="w-4 h-4 mr-1" />}
                Save all as notes
              </Button>
            </>
          )}
          {items.length > 0 && (
            <Button type="button" size="sm" variant="ghost" onClick={clearAll} disabled={working}>
              <X className="w-4 h-4 mr-1" />Clear
            </Button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Scans keep running if you leave this page. You'll get a notification when done.
        </p>
        {items.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {items.map((it) => (
              <div key={it.id} className="rounded-xl border bg-background overflow-hidden">
                <div className="relative aspect-square bg-muted">
                  <img src={it.dataUrl} alt={it.name} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeItem(it.id)}
                    disabled={it.status === "scanning"}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-background/90 border text-xs inline-flex items-center justify-center disabled:opacity-50"
                    aria-label="Remove"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-1 left-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-background/90 border">
                    {it.status === "queued" && "Queued"}
                    {it.status === "scanning" && "Scanning…"}
                    {it.status === "done" && "✓ Done"}
                    {it.status === "failed" && "✕ Failed"}
                  </div>
                </div>
                {it.status === "done" && (
                  <div className="p-2 max-h-24 overflow-y-auto text-[11px] whitespace-pre-wrap">{it.text.slice(0, 240)}{it.text.length > 240 ? "…" : ""}</div>
                )}
                {it.status === "failed" && it.error && (
                  <div className="p-2 text-[11px] text-destructive">{it.error}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}

