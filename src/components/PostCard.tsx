import { Link, useNavigate } from "@tanstack/react-router";
import { Eye, Heart, FileText, Lock, MessageCircle, Pencil, Repeat2, Trash2, ShieldCheck } from "lucide-react";
import { ReportDialog } from "./ReportDialog";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { AvatarDisplay } from "./AvatarDisplay";
import { RankBadge } from "./RankBadge";
import { Comments } from "./Comments";
import { EbsuBadge } from "./EbsuBadge";
import { MediaPlayer } from "./MediaPlayer";
import { SaveButton } from "./SaveButton";
import { SpecialBadges } from "./SpecialBadges";
import { AdminCrownBadge, useIsAdminUser } from "./AdminCrownBadge";
import { PlugShareActions, extractPlugShare } from "./PlugShareActions";
import { isOnline } from "@/lib/presence";
import type { RankTier } from "@/lib/ranks";
import { getIsAdminUser } from "@/lib/admin-role";
import { formatDistanceToNow } from "date-fns";

export type FeedPost = {
  id: string;
  title: string;
  body: string | null;
  post_type: string;
  file_url: string | null;
  image_url?: string | null;
  media_url?: string | null;
  media_type?: string | null;
  link_url?: string | null;
  view_count: number;
  like_count: number;
  comment_count?: number;
  repost_count?: number;
  created_at: string;
  is_official?: boolean | null;
  course?: { code: string; title: string } | null;
  author: {
    id: string;
    display_name: string;
    avatar_key: string;
    rank_tier: RankTier;
    rank_step: number;
    show_online: boolean;
    last_seen_at: string;
    is_verified?: boolean | null;
    is_legit?: boolean | null;
    is_star?: boolean | null;
    is_sure_plug?: boolean | null;
  } | null;
};

export function PostCard({ post, locked }: { post: FeedPost; locked?: boolean }) {
  const online = isOnline(post.author?.show_online, post.author?.last_seen_at);
  const { user } = useAuth();
  const nav = useNavigate();
  const { data: authorIsAdmin } = useIsAdminUser(post.author?.id);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [reposted, setReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(post.repost_count ?? 0);
  const [commentCount, setCommentCount] = useState(post.comment_count ?? 0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [topComment, setTopComment] = useState<{ id: string; body: string; author: { display_name: string; avatar_key: string } | null } | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title);
  const [editBody, setEditBody] = useState(post.body ?? "");
  const [savingEdit, setSavingEdit] = useState(false);

  // FB-style: surface the most-liked (fallback newest) top-level comment.
  useEffect(() => {
    if (!post.comment_count || (post.comment_count ?? 0) === 0) { setTopComment(null); return; }
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("post_comments")
        .select("id,body,like_count,created_at, author:profiles!post_comments_author_id_fkey(display_name,avatar_key)")
        .eq("post_id", post.id)
        .is("parent_id", null)
        .order("like_count", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (alive && data) setTopComment(data as any);
    })();
    return () => { alive = false; };
  }, [post.id, post.comment_count]);

  useEffect(() => {
    if (!user) { setLiked(false); setReposted(false); return; }
    supabase.from("post_likes").select("post_id").eq("post_id", post.id).eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setLiked(!!data));
    supabase.from("post_reposts").select("post_id").eq("post_id", post.id).eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setReposted(!!data));
    getIsAdminUser(user.id).then(setIsAdmin).catch(() => setIsAdmin(false));
  }, [user, post.id]);

  // Realtime: live like + comment counts for this post.
  useEffect(() => {
    const channel = supabase
      .channel(`post-${post.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "post_likes", filter: `post_id=eq.${post.id}` },
        (payload: any) => {
          setLikeCount((c) => c + 1);
          if (user && payload.new?.user_id === user.id) setLiked(true);
        })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "post_likes", filter: `post_id=eq.${post.id}` },
        (payload: any) => {
          setLikeCount((c) => Math.max(0, c - 1));
          if (user && payload.old?.user_id === user.id) setLiked(false);
        })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "post_comments", filter: `post_id=eq.${post.id}` },
        () => setCommentCount((c) => c + 1))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "post_comments", filter: `post_id=eq.${post.id}` },
        () => setCommentCount((c) => Math.max(0, c - 1)))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [post.id, user?.id]);

  const requireAuth = (msg: string) => {
    toast.error(msg);
    nav({ to: "/login", search: { redirect: "/" } });
  };

  const toggleLike = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) return requireAuth("Sign in to like posts");
    // Optimistic toggle — flip UI immediately, roll back on error.
    const wasLiked = liked;
    const prevCount = likeCount;
    setLiked(!wasLiked);
    setLikeCount((c) => Math.max(0, c + (wasLiked ? -1 : 1)));
    const { error } = wasLiked
      ? await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id)
      : await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
    if (error) {
      setLiked(wasLiked);
      setLikeCount(prevCount);
      toast.error(wasLiked ? "Couldn't unlike" : "Couldn't like");
    }
  };

  const toggleRepost = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) return requireAuth("Sign in to repost");
    // Optimistic toggle for reposts too.
    const wasReposted = reposted;
    const prevCount = repostCount;
    setReposted(!wasReposted);
    setRepostCount((c) => Math.max(0, c + (wasReposted ? -1 : 1)));
    const { error } = wasReposted
      ? await supabase.from("post_reposts").delete().eq("post_id", post.id).eq("user_id", user.id)
      : await supabase.from("post_reposts").insert({ post_id: post.id, user_id: user.id });
    if (error) {
      setReposted(wasReposted);
      setRepostCount(prevCount);
      toast.error(wasReposted ? "Couldn't undo repost" : "Couldn't repost");
    } else if (!wasReposted) {
      toast.success("Reposted");
    }
  };

  const onToggleComments = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setShowComments((s) => !s);
  };



  const canDelete = user && (user.id === post.author?.id || isAdmin);
  // Edit window: own post & within 15 minutes of posting.
  const ageMs = Date.now() - new Date(post.created_at).getTime();
  const canEdit = !!user && user.id === post.author?.id && ageMs < 15 * 60_000;
  const minsLeft = Math.max(0, 15 - Math.floor(ageMs / 60_000));

  const onDelete = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm("Delete this post?")) return;
    // If admin is deleting someone else's post, use the admin RPC so the
    // author gets a "removed for policy" notice.
    if (isAdmin && user?.id !== post.author?.id) {
      const { error } = await supabase.rpc("admin_delete_post" as any, { _post_id: post.id });
      if (error) toast.error(error.message);
      else { toast.success("Deleted · author notified"); setRemoved(true); }
      return;
    }
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); setRemoved(true); }
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) { toast.error("Title is required"); return; }
    setSavingEdit(true);
    const { error } = await supabase
      .from("posts")
      .update({ title: editTitle.trim(), body: editBody.trim() || null })
      .eq("id", post.id);
    setSavingEdit(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Updated");
    post.title = editTitle.trim();
    post.body = editBody.trim() || null;
    setEditing(false);
  };

  if (removed) return null;

  // General + news posts get a larger, magazine-style layout
  const isFeatured = post.post_type === "general" || post.post_type === "news";

  return (
    <article className={`relative bg-card rounded-2xl shadow-card border hover:shadow-glow transition-shadow ${isFeatured ? "p-5 md:p-6" : "p-4"} ${post.is_official ? "ring-2 ring-primary/40 bg-gradient-to-br from-primary/5 to-transparent" : ""}`}>
      {post.is_official && (
        <div className="absolute -top-3 right-3 z-10 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-[10px] font-bold shadow-glow">
          <ShieldCheck className="w-3 h-3" /> OFFICIAL
        </div>
      )}
      {/* EBSU badge — top-left corner on every post */}
      <div className="absolute -top-2 left-3 z-10">
        <EbsuBadge size={22} />
      </div>
      <header className="flex items-center gap-3 mb-3 mt-2">
        <Link to="/profile/$id" params={{ id: post.author?.id ?? "" }}>
          <AvatarDisplay avatarKey={post.author?.avatar_key ?? "boy-1"} online={online} size={40} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link to="/profile/$id" params={{ id: post.author?.id ?? "" }} className="font-semibold truncate hover:underline">
              {post.author?.display_name ?? "Unknown"}
            </Link>
            {authorIsAdmin && <AdminCrownBadge size={20} />}
            {post.author && (
              <SpecialBadges
                profile={{
                  is_verified: post.author.is_verified ?? false,
                  is_legit: post.author.is_legit ?? false,
                  is_star: post.author.is_star ?? false,
                  is_sure_plug: post.author.is_sure_plug ?? false,
                }}
                size={20}
              />
            )}
            {post.author && <RankBadge tier={post.author.rank_tier} step={post.author.rank_step} size="sm" />}
          </div>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            {post.course && <> · <span className="text-primary font-medium">{post.course.code}</span></>}
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-accent text-accent-foreground font-bold">
          {post.post_type.replace("_", " ")}
        </span>
      </header>
      {(() => {
        const { share, body: displayBody } = extractPlugShare(post.body);
        return (
          <>
            <Link to="/post/$id" params={{ id: post.id }}>
              <h3 className={`font-display font-bold leading-tight mb-1 hover:text-primary ${isFeatured ? "text-2xl md:text-3xl" : "text-lg"}`}>{post.title}</h3>
              {post.image_url && (
                <img
                  src={post.image_url}
                  alt={post.title}
                  loading="lazy"
                  className={`mt-2 mb-2 w-full object-cover rounded-xl border ${isFeatured ? "aspect-[16/9] md:aspect-[2/1]" : "aspect-[16/10]"}`}
                />
              )}
              {displayBody && (
                <p className={`text-muted-foreground whitespace-pre-wrap ${isFeatured ? "text-base line-clamp-6" : "text-sm line-clamp-3"} ${locked ? "blur-[3px] select-none" : ""}`}>
                  {displayBody.slice(0, isFeatured ? 600 : 280)}
                </p>
              )}
            </Link>
            {share && !locked && (
              <PlugShareActions share={{ ...share, authorId: share.authorId ?? post.author?.id ?? null }} authorLabel={post.author?.display_name ?? undefined} />
            )}
            {(post.media_url || post.link_url) && !locked && (
              <div className="mt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
                {post.media_url && (
                  <MediaPlayer url={post.media_url} type={post.media_type} title={post.title} avatarKey={post.author?.avatar_key} />
                )}
                {post.link_url && (
                  <MediaPlayer url={post.link_url} type="video" title={post.title} avatarKey={post.author?.avatar_key} />
                )}
              </div>
            )}
          </>
        );
      })()}
      {locked && (
        <div className="mt-3 flex items-center gap-2 text-xs text-primary bg-primary/10 px-3 py-2 rounded-lg">
          <Lock className="w-3.5 h-3.5" />
          <span>Sign in to read the full post, like, comment and repost.</span>
        </div>
      )}
      {post.file_url && !locked && (
        <div className="mt-3 inline-flex items-center gap-2 text-xs text-primary bg-primary/10 px-3 py-1.5 rounded-lg">
          <FileText className="w-3.5 h-3.5" /> File attached
        </div>
      )}
      <footer className="mt-3 flex items-center gap-1 text-xs flex-wrap">
        <button
          onClick={toggleLike}
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full transition ${liked ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted"}`}
        >
          <Heart className={`w-3.5 h-3.5 ${liked ? "fill-current" : ""}`} /> {likeCount}
        </button>
        <button
          onClick={onToggleComments}
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full transition ${showComments ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted"}`}
        >
          <MessageCircle className="w-3.5 h-3.5" /> {commentCount}
        </button>
        <button
          onClick={toggleRepost}
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full transition ${reposted ? "bg-success/15 text-success" : "text-muted-foreground hover:bg-muted"}`}
        >
          <Repeat2 className="w-3.5 h-3.5" /> {repostCount}
        </button>
        <span className="inline-flex items-center gap-1 px-2 py-1 text-muted-foreground">
          <Eye className="w-3.5 h-3.5" /> {post.view_count}
        </span>
        {!locked && (
          <SaveButton
            itemType="post"
            itemId={post.id}
            title={post.title}
            subtitle={post.author?.display_name ?? null}
            thumbUrl={post.image_url ?? null}
            variant="pill"
          />
        )}
        {canDelete && (
          <button onClick={onDelete} className="ml-auto inline-flex items-center gap-1 px-2 py-1 rounded-full text-destructive hover:bg-destructive/10">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        )}
        {canEdit && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditing(true); }}
            className={`${canDelete ? "" : "ml-auto"} inline-flex items-center gap-1 px-2 py-1 rounded-full text-muted-foreground hover:bg-muted`}
            title={`Editable for ${minsLeft} more minute${minsLeft === 1 ? "" : "s"}`}
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
        )}
        {user && user.id !== post.author?.id && (
          <span className={canDelete || canEdit ? "" : "ml-auto"}>
            <ReportDialog target={{ kind: "post", id: post.id }} />
          </span>
        )}
      </footer>

      {/* Inline edit form (15-minute window) */}
      {editing && (
        <form onSubmit={saveEdit} onClick={(e) => e.stopPropagation()} className="mt-3 pt-3 border-t space-y-2">
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            maxLength={160}
            className="w-full text-sm font-semibold rounded-lg border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            rows={4}
            className="w-full text-sm rounded-lg border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="flex items-center gap-2 text-xs">
            <button type="submit" disabled={savingEdit} className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground font-semibold disabled:opacity-50">
              {savingEdit ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => { setEditing(false); setEditTitle(post.title); setEditBody(post.body ?? ""); }} className="px-3 py-1.5 rounded-full hover:bg-muted">
              Cancel
            </button>
            <span className="text-muted-foreground ml-auto">{minsLeft} min left to edit</span>
          </div>
        </form>
      )}

      {/* Top comment preview at bottom of card (FB-style). Hidden while
          the full comments panel is open or while editing. */}
      {!showComments && !editing && topComment && (
        <button
          type="button"
          onClick={onToggleComments}
          className="mt-3 pt-3 border-t w-full text-left flex items-start gap-2 hover:bg-muted/40 rounded-b-xl -mx-1 px-1 py-1 transition"
        >
          <AvatarDisplay avatarKey={topComment.author?.avatar_key ?? "boy-1"} size={28} />
          <div className="flex-1 min-w-0">
            <div className="bg-muted/60 rounded-2xl px-3 py-1.5 inline-block max-w-full">
              <span className="text-[11px] font-semibold mr-1.5">{topComment.author?.display_name ?? "User"}</span>
              <span className="text-xs text-foreground/90 line-clamp-2">{topComment.body}</span>
            </div>
            {(post.comment_count ?? 0) > 1 && (
              <p className="text-[10px] text-muted-foreground mt-0.5 ml-2">View all {post.comment_count} comments</p>
            )}
          </div>
        </button>
      )}

      {showComments && !locked && (
        <div className="mt-3 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
          <Comments postId={post.id} />
        </div>
      )}
      {showComments && locked && (
        <div className="mt-3 pt-3 border-t">
          <Link to="/login" search={{ redirect: "/" }} className="block text-xs text-primary font-semibold hover:underline">Sign in to view and post comments →</Link>
        </div>
      )}
    </article>
  );
}
