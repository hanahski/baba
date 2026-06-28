import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useIsAdmin } from "@/lib/admin-ids";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, ScanLine, Eye, ShieldCheck, ShieldAlert, Sparkles, Upload, Wand2, ImageIcon, X, PenLine, FileText, Link2, Image as ImageLucide, Type, BookOpen, Megaphone, ClipboardList, NotebookPen, Newspaper, Hash } from "lucide-react";
import { MathText } from "@/components/MathText";
import { MediaPlayer } from "@/components/MediaPlayer";
import { extractTextFromImage } from "@/lib/ocr.functions";
import { pdfToImages } from "@/lib/pdf-to-images";
import { enhanceImageFile } from "@/lib/image-enhance";
import { VerifyStudentDialog } from "@/components/VerifyStudentDialog";
import { generatePostImage } from "@/lib/generate-post-image.functions";
import { AUDIO_ANIMATIONS, AudioAnimation, type AudioAnimationId } from "@/components/AudioAnimations";
import { VideoTrimmer } from "@/components/VideoTrimmer";
import { withTimeFragment, type TimeRange } from "@/lib/trim";
import { useDraft } from "@/hooks/use-draft";



export const Route = createFileRoute("/post/new")({
  validateSearch: (s: Record<string, unknown>) => ({
    course: (s.course as string) || "",
    type: (s.type as string) || "",
  }),
  component: NewPostPage,
});

type MediaKind = "image" | "video" | "audio";
function kindFor(file: File): MediaKind | "pdf" | "other" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) return "pdf";
  return "other";
}

function NewPostPage() {
  const { user, profile, loading } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const nav = useNavigate();
  const [verifyOpen, setVerifyOpen] = useState(false);
  const { course: presetCourse, type: presetType } = Route.useSearch();
  const [type, setType] = useState(presetType || "general");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [courseId, setCourseId] = useState(presetCourse);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [aiImageUrl, setAiImageUrl] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [imageMode, setImageMode] = useState<"upload" | "ai">("upload");
  const [audioAnim, setAudioAnim] = useState<AudioAnimationId>("dance");
  const [enhanceImg, setEnhanceImg] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  // --- Draft persistence (survives tab reloads) ---
  const draft = useDraft(
    `post-new:${user?.id ?? "anon"}`,
    { title: "", body: "", type: "general", courseId: "", linkUrl: "" },
    { enabled: !!user?.id },
  );
  // Hydrate on first user-id ready
  const draftHydratedRef = useRef(false);
  useEffect(() => {
    if (!user?.id || draftHydratedRef.current) return;
    draftHydratedRef.current = true;
    const d = draft.value;
    if (d.title && !title) setTitle(d.title);
    if (d.body && !body) setBody(d.body);
    if (d.type && d.type !== "general") setType(d.type);
    if (d.courseId && !courseId) setCourseId(d.courseId);
    if (d.linkUrl && !linkUrl) setLinkUrl(d.linkUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
  // Keep draft snapshot in sync
  useEffect(() => {
    if (!user?.id) return;
    draft.setValue((v) => ({ ...v, title, body, type, courseId, linkUrl }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body, type, courseId, linkUrl, user?.id]);

  const [videoTrim, setVideoTrim] = useState<TimeRange | null>(null);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ done: number; total: number } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const runOcr = useServerFn(extractTextFromImage);
  const genAiImage = useServerFn(generatePostImage);
  const autoScannedRef = useRef<string | null>(null);

  useEffect(() => { if (!loading && !user) nav({ to: "/login", search: { redirect: "/post/new" } }); }, [user, loading]);

  // Prefill from another tool (e.g. OCR "Post as past question") via sessionStorage.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem("post_new_prefill");
      if (!raw) return;
      sessionStorage.removeItem("post_new_prefill");
      const p = JSON.parse(raw) as { title?: string; body?: string; type?: string };
      if (p.title) setTitle(p.title);
      if (p.body) setBody(p.body);
      if (p.type) setType(p.type);
      toast.success("Loaded your scan — edit, then post when ready");
    } catch {}
  }, []);

  useEffect(() => {
    if (!mediaFile) { setMediaPreview(null); return; }
    const u = URL.createObjectURL(mediaFile);
    setMediaPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [mediaFile]);

  const { data: courses } = useQuery({
    queryKey: ["all-courses"],
    queryFn: async () => (await supabase.from("courses").select("id,code,title").order("code")).data ?? [],
  });

  const scanPdf = async (file: File) => {
    if (!user) return;
    setScanning(true);
    setScanProgress({ done: 0, total: 0 });
    try {
      const pages = await pdfToImages(file, {
        maxPages: 20,
        scale: 2,
        onProgress: (done, total) => setScanProgress({ done, total }),
      });
      if (!pages.length) { toast.error("Could not read PDF pages"); return; }
      const chunks: string[] = [];
      for (let i = 0; i < pages.length; i++) {
        setScanProgress({ done: i, total: pages.length });
        const r = await runOcr({ data: { imageDataUrl: pages[i].dataUrl, mimeType: "image/png" } });
        chunks.push(`\n\n--- Page ${pages[i].page} ---\n\n${r.ok ? r.text : `[Could not read this page: ${r.error}]`}`);
      }
      const merged = chunks.join("").trim();
      setBody((prev) => (prev.trim() ? `${prev}\n\n${merged}` : merged));
      setShowPreview(true);
      toast.success(`Scanned ${pages.length} page${pages.length === 1 ? "" : "s"} into the body`);
    } catch (e: any) {
      console.error("pdf scan failed", e);
      toast.error(e?.message || "Could not scan PDF");
    } finally {
      setScanning(false);
      setScanProgress(null);
    }
  };

  // Auto-scan PDF as soon as it's attached (once per file)
  useEffect(() => {
    if (!pdfFile || !user) return;
    const sig = `${pdfFile.name}-${pdfFile.size}-${pdfFile.lastModified}`;
    if (autoScannedRef.current === sig) return;
    autoScannedRef.current = sig;
    void scanPdf(pdfFile);
  }, [pdfFile, user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Please sign in first"); nav({ to: "/login" }); return; }
    if (!profile?.is_verified && !isAdmin) {
      toast.error("Please verify you're an EBSU student before posting");
      setVerifyOpen(true);
      return;
    }
    if (type === "news" && !isAdmin && !(profile as any)?.is_legit) {
      toast.error("You need the Legit badge to post news.");
      nav({ to: "/apply-badge" });
      return;
    }
    if (!title.trim()) { toast.error("Title is required"); return; }
    setBusy(true);
    try {
      // PDF upload (private bucket)
      let file_url: string | null = null;
      let file_name: string | null = null;
      if (pdfFile) {
        const safe = pdfFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${user.id}/${Date.now()}-${safe}`;
        const { error: upErr } = await supabase.storage
          .from("post-files")
          .upload(path, pdfFile, { contentType: pdfFile.type || "application/pdf", upsert: false });
        if (upErr) throw upErr;
        file_url = path;
        file_name = pdfFile.name;
      }

      // Media upload (public bucket — full quality, no compression)
      let media_url: string | null = null;
      let media_type: MediaKind | null = null;
      if (imageMode === "ai" && aiImageUrl) {
        media_url = aiImageUrl;
        media_type = "image";
      } else if (mediaFile) {
        const k = kindFor(mediaFile);
        if (k === "image" || k === "video" || k === "audio") {
          let toUpload = mediaFile;
          if (k === "image" && enhanceImg) {
            const t = toast.loading("Enhancing image with AI…");
            toUpload = await enhanceImageFile(mediaFile);
            toast.dismiss(t);
            if (toUpload !== mediaFile) toast.success("Image enhanced");
          }
          const safe = toUpload.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const path = `${user.id}/${Date.now()}-${safe}`;
          const { error: upErr } = await supabase.storage
            .from("post-media")
            .upload(path, toUpload, { contentType: toUpload.type, upsert: false });
          if (upErr) throw upErr;
          let publicUrl = supabase.storage.from("post-media").getPublicUrl(path).data.publicUrl;
          if (k === "audio") publicUrl = `${publicUrl}#anim=${audioAnim}`;
          if (k === "video" && videoTrim) publicUrl = withTimeFragment(publicUrl, videoTrim);
          media_url = publicUrl;
          media_type = k;
        }
      }


      const payload: any = {
        author_id: user.id,
        post_type: type,
        title: title.trim(),
        body: body.trim() || null,
        course_id: courseId || null,
        file_url,
        file_name,
        media_url,
        media_type,
        link_url: linkUrl.trim() || null,
      };
      const { data, error } = await supabase.from("posts").insert(payload).select("id").single();
      if (error) throw error;
      draft.clear();
      toast.success("Posted! +1 to your rank progress");
      nav({ to: "/post/$id", params: { id: data.id } });
    } catch (err: any) {
      console.error("post submit failed", err);
      toast.error(err?.message || "Could not publish. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const POST_TYPES: { id: string; label: string; icon: typeof PenLine }[] = [
    { id: "general", label: "General", icon: Megaphone },
    { id: "past_question", label: "Past Q", icon: ClipboardList },
    { id: "assignment", label: "Assignment", icon: NotebookPen },
    { id: "note", label: "Note", icon: BookOpen },
    { id: "novel", label: "Novel", icon: BookOpen },
    { id: "news", label: "News", icon: Newspaper },
  ];

  const titleCount = title.length;
  const bodyCount = body.length;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto pb-24">
        {/* Hero header */}
        <header className="mb-5 rounded-3xl p-6 bg-gradient-to-br from-primary via-primary/80 to-accent text-primary-foreground shadow-card relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" aria-hidden />
          <div className="absolute -left-6 -bottom-10 w-32 h-32 rounded-full bg-white/10 blur-2xl" aria-hidden />
          <div className="relative flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
              <PenLine className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold font-display leading-tight">Create a post</h1>
              <p className="text-xs opacity-90">Share notes, past questions, news or anything for your coursemates.</p>
            </div>
          </div>
        </header>

        {profile && !profile.is_verified && !isAdmin && (
          <div className="mb-4 border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-accent/10 to-background rounded-2xl p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm">Verify you're an EBSU student to post</p>
              <p className="text-xs text-muted-foreground mt-0.5">Takes a few seconds with your JAMB registration number.</p>
              <Button size="sm" type="button" onClick={() => setVerifyOpen(true)} className="mt-2">
                <ShieldCheck className="w-4 h-4 mr-1.5" />Verify now
              </Button>
            </div>
          </div>
        )}

        {draft.hasRestored && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border bg-primary/5 border-primary/30 p-3">
            <div className="text-xs flex-1">
              <p className="font-semibold">Draft restored</p>
              <p className="text-muted-foreground">We brought back what you were writing before. Submit to publish, or clear to start over.</p>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={() => { draft.clear(); setTitle(""); setBody(""); setType("general"); setCourseId(""); setLinkUrl(""); }}>
              Clear
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={draft.dismissRestoredBanner}>Dismiss</Button>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          {/* SECTION 1 — Type + Course */}
          <section className="bg-card border rounded-2xl p-5 shadow-card space-y-4">
            <SectionHead icon={Hash} title="What are you posting?" hint="Pick the type & (optional) course." />
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Type</Label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {POST_TYPES.map((t) => {
                  const Icon = t.icon;
                  const active = type === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setType(t.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${active ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-muted/40 border-transparent text-muted-foreground hover:bg-muted"}`}
                    >
                      <Icon className="w-3.5 h-3.5" />{t.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Course (optional)</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select course" /></SelectTrigger>
                <SelectContent>
                  {courses?.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} — {c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </section>

          {/* SECTION 2 — Title + Body */}
          <section className="bg-card border rounded-2xl p-5 shadow-card space-y-4">
            <SectionHead icon={Type} title="Write it out" hint="A clear title helps your post get seen." />
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Title</Label>
                <span className={`text-[10px] tabular-nums ${titleCount > 140 ? "text-destructive" : "text-muted-foreground"}`}>{titleCount}/160</span>
              </div>
              <Input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={160}
                placeholder="Catchy, descriptive title…"
                className="mt-1.5 text-base"
              />
            </div>
            <div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Body</Label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] tabular-nums text-muted-foreground">{bodyCount} chars</span>
                  {body.trim() && (
                    <Button type="button" size="sm" variant="ghost" className="h-6 px-2" onClick={() => setShowPreview((v) => !v)}>
                      <Eye className="w-3 h-3 mr-1" />{showPreview ? "Edit" : "Preview"}
                    </Button>
                  )}
                </div>
              </div>
              {showPreview ? (
                <div className="mt-1.5 rounded-lg border bg-background p-3 min-h-[200px]">
                  <MathText>{body}</MathText>
                </div>
              ) : (
                <Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your post. Equations in $…$ render as LaTeX." className="mt-1.5" />
              )}
            </div>
          </section>

          {/* SECTION 3 — Media */}
          <section className="bg-card border rounded-2xl p-5 shadow-card space-y-3">
            <SectionHead icon={ImageLucide} title="Add media" hint="Upload your own, or let AI generate one." />
            <div className="inline-flex rounded-xl border bg-muted/40 p-1 text-xs w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setImageMode("upload")}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg inline-flex items-center justify-center gap-1.5 transition ${imageMode === "upload" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
              >
                <Upload className="w-3.5 h-3.5" /> Upload
              </button>
              <button
                type="button"
                onClick={() => setImageMode("ai")}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg inline-flex items-center justify-center gap-1.5 transition ${imageMode === "ai" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
              >
                <Sparkles className="w-3.5 h-3.5" /> AI generate
              </button>
            </div>

            {imageMode === "upload" ? (
              <div className="space-y-3">
                {!mediaFile ? (
                  <label className="block">
                    <input
                      type="file"
                      accept="image/*,video/*,audio/*"
                      className="sr-only"
                      onChange={(e) => setMediaFile(e.target.files?.[0] ?? null)}
                    />
                    <div className="cursor-pointer rounded-xl border-2 border-dashed border-border hover:border-primary/60 hover:bg-primary/5 transition p-6 text-center">
                      <Upload className="w-6 h-6 mx-auto text-muted-foreground" />
                      <p className="mt-2 text-sm font-semibold">Tap to upload</p>
                      <p className="text-[11px] text-muted-foreground">Image, video, or audio — full quality</p>
                    </div>
                  </label>
                ) : (
                  <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/40 border text-xs">
                    <span className="truncate font-medium">{mediaFile.name}</span>
                    <button type="button" onClick={() => setMediaFile(null)} className="shrink-0 inline-flex items-center gap-1 text-destructive hover:underline">
                      <X className="w-3 h-3" /> Remove
                    </button>
                  </div>
                )}

                {mediaFile && kindFor(mediaFile) === "image" && (
                  <label className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                    <input type="checkbox" checked={enhanceImg} onChange={(e) => setEnhanceImg(e.target.checked)} />
                    Enhance with AI before upload (slower)
                  </label>
                )}
                {mediaFile && kindFor(mediaFile) === "audio" && (
                  <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
                    <p className="text-xs font-semibold flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-primary" /> Choose an audio visual</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {AUDIO_ANIMATIONS.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => setAudioAnim(a.id)}
                          className={`group rounded-lg border-2 p-1.5 text-left transition ${audioAnim === a.id ? "border-primary shadow-glow" : "border-transparent hover:border-border"}`}
                        >
                          <AudioAnimation id={a.id} playing className="h-14 w-full rounded-md overflow-hidden bg-gradient-to-br from-primary/15 via-card to-accent/30" />
                          <p className="text-[10px] font-semibold mt-1 truncate">{a.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {mediaFile && mediaPreview && kindFor(mediaFile) === "video" && (
                  <VideoTrimmer src={mediaPreview} onChange={setVideoTrim} />
                )}
                {mediaFile && mediaPreview && kindFor(mediaFile) !== "video" && (
                  <MediaPlayer
                    url={kindFor(mediaFile) === "audio" ? `${mediaPreview}#anim=${audioAnim}` : mediaPreview}
                    type={kindFor(mediaFile) as MediaKind}
                    title={mediaFile.name}
                    avatarKey={profile?.avatar_key}
                  />
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Textarea
                  rows={3}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Describe the image — e.g. 'vibrant flat illustration of EBSU students celebrating'"
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  disabled={aiBusy || aiPrompt.trim().length < 3}
                  onClick={async () => {
                    setAiBusy(true);
                    try {
                      const { url } = await genAiImage({ data: { prompt: aiPrompt.trim() } });
                      setAiImageUrl(url);
                      toast.success("Image generated");
                    } catch (e: any) {
                      toast.error(e?.message || "Could not generate image");
                    } finally {
                      setAiBusy(false);
                    }
                  }}
                >
                  {aiBusy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</> : <><Wand2 className="w-4 h-4 mr-2" />{aiImageUrl ? "Regenerate image" : "Generate image"}</>}
                </Button>
                {aiImageUrl && (
                  <div className="relative rounded-xl overflow-hidden border bg-muted">
                    <img src={aiImageUrl} alt="AI preview" className="w-full max-h-80 object-cover" />
                    <button
                      type="button"
                      onClick={() => setAiImageUrl(null)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                      aria-label="Remove image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {!aiImageUrl && (
                  <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> AI images are generated with Lovable AI and uploaded with your post.
                  </p>
                )}
              </div>
            )}
          </section>

          {/* SECTION 4 — Link */}
          <section className="bg-card border rounded-2xl p-5 shadow-card space-y-2">
            <SectionHead icon={Link2} title="Embed a link" hint="YouTube, TikTok, Instagram, Facebook, X & more." />
            <Input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://…"
            />
            {linkUrl.trim() && (
              <div className="mt-2">
                <MediaPlayer url={linkUrl.trim()} type="video" />
              </div>
            )}
          </section>

          {/* SECTION 5 — PDF */}
          <section className="bg-card border rounded-2xl p-5 shadow-card space-y-2">
            <SectionHead icon={FileText} title="Attach a PDF" hint="Auto-scanned for text & LaTeX on attach." />
            {!pdfFile ? (
              <label className="block">
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    if (f && f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
                      toast.error("Only PDF files are allowed here.");
                      e.target.value = "";
                      return;
                    }
                    setPdfFile(f);
                  }}
                />
                <div className="cursor-pointer rounded-xl border-2 border-dashed border-border hover:border-primary/60 hover:bg-primary/5 transition p-5 text-center">
                  <FileText className="w-5 h-5 mx-auto text-muted-foreground" />
                  <p className="mt-1.5 text-sm font-semibold">Tap to attach PDF</p>
                </div>
              </label>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/40 border text-xs">
                  <span className="truncate font-medium inline-flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-primary" />{pdfFile.name}</span>
                  <button type="button" onClick={() => setPdfFile(null)} className="shrink-0 inline-flex items-center gap-1 text-destructive hover:underline">
                    <X className="w-3 h-3" /> Remove
                  </button>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => scanPdf(pdfFile)}
                  disabled={scanning}
                  className="w-full"
                >
                  {scanning ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scanning page {scanProgress?.done ?? 0}/{scanProgress?.total ?? "…"}</>
                  ) : (
                    <><ScanLine className="w-4 h-4 mr-2" />Rescan PDF → text + LaTeX</>
                  )}
                </Button>
              </>
            )}
          </section>

          {/* Sticky publish bar */}
          <div className="sticky bottom-3 z-20">
            <div className="rounded-2xl border bg-card/90 backdrop-blur shadow-card p-2 flex items-center gap-2">
              <div className="hidden sm:flex flex-1 min-w-0 items-center gap-2 px-2 text-xs text-muted-foreground">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="truncate">{title.trim() ? `“${title.trim()}”` : "Ready when you are."}</span>
              </div>
              <Button type="submit" disabled={busy || scanning} className="flex-1 sm:flex-none sm:min-w-[180px]">
                {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Posting…</> : "Publish post"}
              </Button>
            </div>
          </div>
        </form>
      </div>
      <VerifyStudentDialog open={verifyOpen} onOpenChange={setVerifyOpen} />
    </AppShell>
  );
}

function SectionHead({ icon: Icon, title, hint }: { icon: typeof PenLine; title: string; hint?: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <h2 className="text-sm font-bold leading-tight">{title}</h2>
        {hint && <p className="text-[11px] text-muted-foreground leading-tight">{hint}</p>}
      </div>
    </div>
  );
}

