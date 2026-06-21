import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { RankBadge } from "@/components/RankBadge";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { BookOpen, Download, Heart, Loader2, Lock, ScanLine, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { PostQuiz } from "@/components/PostQuiz";
import { Comments } from "@/components/Comments";
import { isOnline } from "@/lib/presence";
import { MathText } from "@/components/MathText";
import { extractTextFromImage } from "@/lib/ocr.functions";
import { pdfToImages } from "@/lib/pdf-to-images";
import { PastQuestionArticle } from "@/components/PastQuestionArticle";
import { MediaPlayer } from "@/components/MediaPlayer";
import { PdfReader } from "@/components/PdfReader";
import { VerifyStudentDialog } from "@/components/VerifyStudentDialog";


export const Route = createFileRoute("/post/$id")({ component: PostPage });

function PostPage() {
  const { id } = Route.useParams();
  const { user, profile } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [rescanning, setRescanning] = useState(false);
  const [rescanProgress, setRescanProgress] = useState<{ done: number; total: number } | null>(null);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const runOcr = useServerFn(extractTextFromImage);


  const { data: post, refetch } = useQuery({
    queryKey: ["post", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("*, course:courses(code,title), author:profiles!posts_author_id_fkey(id,display_name,avatar_key,rank_tier,rank_step,show_online,last_seen_at)")
        .eq("id", id).maybeSingle();
      return data;
    },
  });

  const { data: liked } = useQuery({
    queryKey: ["like", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("post_likes").select("post_id").eq("post_id", id).eq("user_id", user!.id).maybeSingle();
      return !!data;
    },
  });

  // increment view (best-effort) once for signed-in users
  useEffect(() => {
    if (!user || !post) return;
    supabase.from("posts").update({ view_count: (post.view_count ?? 0) + 1 }).eq("id", id).then();
  }, [user, post?.id]);

  // sign a readable URL for inline PDF preview
  useEffect(() => {
    if (!user || !post?.file_url) { setPdfUrl(null); return; }
    supabase.storage.from("post-files").createSignedUrl(post.file_url, 3600).then(({ data }) => {
      if (data?.signedUrl) setPdfUrl(data.signedUrl);
    });
  }, [user, post?.file_url]);

  if (!post) return <AppShell><p className="text-muted-foreground">Loading…</p></AppShell>;

  const toggleLike = async () => {
    if (!user) { nav({ to: "/login" }); return; }
    if (liked) await supabase.from("post_likes").delete().eq("post_id", id).eq("user_id", user.id);
    else await supabase.from("post_likes").insert({ post_id: id, user_id: user.id });
    qc.invalidateQueries({ queryKey: ["like", id] });
    refetch();
  };

  const download = async () => {
    if (!user) { nav({ to: "/login" }); return; }
    if (!profile?.is_verified) {
      toast.error("Verify you're an EBSU student to download");
      setVerifyOpen(true);
      return;
    }
    if (!post.file_url) return;
    const { data, error } = await supabase.storage.from("post-files").createSignedUrl(post.file_url, 60);
    if (error) { toast.error(error.message); return; }
    window.open(data.signedUrl, "_blank");
  };

  const isAuthor = !!user && user.id === post.author_id;

  const rescanPdf = async () => {
    if (!post.file_url) return;
    setRescanning(true);
    setRescanProgress({ done: 0, total: 0 });
    try {
      const { data: signed, error: sErr } = await supabase.storage
        .from("post-files").createSignedUrl(post.file_url, 300);
      if (sErr || !signed) throw sErr || new Error("Could not access PDF");
      const blob = await fetch(signed.signedUrl).then((r) => r.blob());
      const pages = await pdfToImages(blob, {
        maxPages: 20,
        scale: 2,
        onProgress: (done, total) => setRescanProgress({ done, total }),
      });
      const chunks: string[] = [];
      for (let i = 0; i < pages.length; i++) {
        setRescanProgress({ done: i, total: pages.length });
        const r = await runOcr({ data: { imageDataUrl: pages[i].dataUrl, mimeType: "image/png" } });
        chunks.push(`\n\n--- Page ${pages[i].page} ---\n\n${r.ok ? r.text : `[Could not read: ${r.error}]`}`);
      }
      const merged = chunks.join("").trim();
      const newBody = post.body ? `${post.body}\n\n${merged}` : merged;
      const { error: uErr } = await supabase.from("posts").update({ body: newBody }).eq("id", id);
      if (uErr) throw uErr;
      toast.success(`Rescanned ${pages.length} page${pages.length === 1 ? "" : "s"} → text added to post`);
      refetch();
    } catch (e: any) {
      console.error("rescan failed", e);
      toast.error(e?.message || "Rescan failed");
    } finally {
      setRescanning(false);
      setRescanProgress(null);
    }
  };

  const canDelete = user && (user.id === post.author_id);
  const remove = async () => {
    if (!confirm("Delete this post?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); nav({ to: "/" }); }
  };
  const locked = !user;

  return (
    <AppShell>
      <article className="bg-card border rounded-3xl shadow-card p-6 max-w-3xl mx-auto">
        <header className="flex items-center gap-3 mb-4">
          <Link to="/profile/$id" params={{ id: post.author?.id ?? "" }}><AvatarDisplay avatarKey={post.author?.avatar_key ?? "boy-1"} size={48} online={isOnline(post.author?.show_online, post.author?.last_seen_at)} /></Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link to="/profile/$id" params={{ id: post.author?.id ?? "" }} className="font-semibold hover:underline">{post.author?.display_name}</Link>
              {post.author && <RankBadge tier={post.author.rank_tier} step={post.author.rank_step} size="sm" />}
            </div>
            <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}{post.course && <> · {post.course.code}</>}</p>
          </div>
          <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-accent text-accent-foreground font-bold">{post.post_type.replace("_", " ")}</span>
        </header>
        <h1 className="text-3xl font-bold font-display mb-4">{post.title}</h1>
        {locked ? (
          <div className="bg-primary/10 border border-primary/30 rounded-2xl p-6 text-center">
            <Lock className="w-8 h-8 text-primary mx-auto mb-3" />
            <p className="font-semibold">Sign in to read the full post</p>
            <Button asChild className="mt-4"><Link to="/login" search={{ redirect: `/post/${id}` }}>Sign in</Link></Button>
          </div>
        ) : (
          <>
            {post.body && (
              post.post_type === "past_question" ? (
                <PastQuestionArticle
                  note={{
                    title: post.title,
                    body: post.body,
                    created_at: post.created_at,
                    course: post.course ? { code: post.course.code, title: post.course.title } : null,
                    faculty: null,
                    department: null,
                  }}
                />
              ) : (
                <MathText>{post.body}</MathText>
              )
            )}

            {(post.media_url || post.link_url) && (
              <div className="mt-6 space-y-4">
                {post.media_url && (
                  <MediaPlayer url={post.media_url} type={post.media_type} title={post.title} avatarKey={post.author?.avatar_key} />
                )}
                {post.link_url && (
                  <MediaPlayer url={post.link_url} type="video" title={post.title} avatarKey={post.author?.avatar_key} />
                )}
              </div>
            )}

            {post.file_url && (
              <div className="mt-6">
                {pdfUrl ? (
                  <div className="rounded-2xl border bg-muted p-4 flex flex-wrap items-center gap-3">
                    <BookOpen className="w-6 h-6 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{post.file_name ?? "Attached PDF"}</p>
                      <p className="text-xs text-muted-foreground">In-app reader with zoom, navigation and auto text extraction.</p>
                    </div>
                    <Button onClick={() => setPdfOpen(true)}><BookOpen className="w-4 h-4 mr-2" />Open reader</Button>
                    <Button variant="outline" onClick={download}><Download className="w-4 h-4 mr-2" />Download</Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Preparing PDF preview…</p>
                )}
                {pdfUrl && pdfOpen && (
                  <PdfReader
                    url={pdfUrl}
                    title={post.file_name ?? "PDF"}
                    downloadName={post.file_name ?? undefined}
                    onClose={() => setPdfOpen(false)}
                  />
                )}
                {isAuthor && (
                  <div className="mt-3">
                    <Button variant="secondary" onClick={rescanPdf} disabled={rescanning}>
                      {rescanning ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scanning {rescanProgress?.done ?? 0}/{rescanProgress?.total ?? "…"}</>
                      ) : (
                        <><ScanLine className="w-4 h-4 mr-2" />Rescan PDF → LaTeX</>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
        <footer className="mt-6 flex items-center gap-3 border-t pt-4">
          <Button variant={liked ? "default" : "outline"} size="sm" onClick={toggleLike}>
            <Heart className={`w-4 h-4 mr-1 ${liked ? "fill-current" : ""}`} />{post.like_count}
          </Button>
          <span className="text-sm text-muted-foreground">{post.view_count} views</span>
          {canDelete && <Button variant="ghost" size="sm" onClick={remove} className="ml-auto text-destructive"><Trash2 className="w-4 h-4 mr-1" />Delete</Button>}
        </footer>
        {!locked && (
          <>
            <PostQuiz
              postId={post.id}
              postTitle={post.title}
              isAuthor={!!user && user.id === post.author_id}
              userId={user?.id ?? null}
              courseId={post.course_id ?? null}
            />
            <Comments postId={post.id} />
          </>
        )}
      </article>
      <VerifyStudentDialog open={verifyOpen} onOpenChange={setVerifyOpen} onVerified={() => refetch()} />
    </AppShell>
  );
}
