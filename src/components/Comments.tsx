import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Heart, MessageSquare, Send, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { getIsAdminUser } from "@/lib/admin-role";
import { AvatarDisplay } from "./AvatarDisplay";

type Author = { id: string; display_name: string; avatar_key: string } | null;
type Row = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  parent_id: string | null;
  like_count: number;
  author: Author;
};

type Node = Row & { replies: Node[] };

function buildTree(rows: Row[]): Node[] {
  const map = new Map<string, Node>();
  rows.forEach((r) => map.set(r.id, { ...r, replies: [] }));
  const roots: Node[] = [];
  map.forEach((n) => {
    if (n.parent_id && map.has(n.parent_id)) map.get(n.parent_id)!.replies.push(n);
    else roots.push(n);
  });
  return roots;
}

export function Comments({ postId }: { postId: string }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("post_comments")
      .select("id,post_id,author_id,body,created_at,parent_id,like_count, author:profiles!post_comments_author_id_fkey(id,display_name,avatar_key)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .limit(500);
    setRows((data ?? []) as unknown as Row[]);
  };

  const loadMyLikes = async () => {
    if (!user) { setLiked(new Set()); return; }
    const ids = rows.map((r) => r.id);
    if (!ids.length) return;
    const { data } = await supabase
      .from("post_comment_likes")
      .select("comment_id")
      .eq("user_id", user.id)
      .in("comment_id", ids);
    setLiked(new Set((data ?? []).map((d) => d.comment_id)));
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [postId]);
  useEffect(() => { void loadMyLikes(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [rows.length, user?.id]);

  useEffect(() => {
    if (!user) return;
    getIsAdminUser(user.id).then(setIsAdmin).catch(() => setIsAdmin(false));
  }, [user?.id]);

  // Realtime: new/deleted comments and live like-count updates.
  useEffect(() => {
    const ch = supabase
      .channel(`comments-${postId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "post_comments", filter: `post_id=eq.${postId}` }, () => void load())
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "post_comments", filter: `post_id=eq.${postId}` },
        (p: any) => setRows((rs) => rs.filter((r) => r.id !== p.old?.id)))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "post_comments", filter: `post_id=eq.${postId}` },
        (p: any) => setRows((rs) => rs.map((r) => r.id === p.new?.id ? { ...r, like_count: p.new.like_count } : r)))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const body = text.trim();
    if (!body) return;
    setPosting(true);
    const { error } = await supabase.from("post_comments").insert({
      post_id: postId, author_id: user.id, body,
      parent_id: replyTo?.id ?? null,
    });
    setPosting(false);
    if (error) { toast.error(error.message); return; }
    setText(""); setReplyTo(null);
  };

  const toggleLike = async (cid: string) => {
    if (!user) { toast.error("Sign in to like"); return; }
    const isLiked = liked.has(cid);
    // optimistic
    setLiked((s) => { const n = new Set(s); if (isLiked) n.delete(cid); else n.add(cid); return n; });
    setRows((rs) => rs.map((r) => r.id === cid ? { ...r, like_count: Math.max(0, r.like_count + (isLiked ? -1 : 1)) } : r));
    if (isLiked) {
      await supabase.from("post_comment_likes").delete().eq("comment_id", cid).eq("user_id", user.id);
    } else {
      const { error } = await supabase.from("post_comment_likes").insert({ comment_id: cid, user_id: user.id });
      if (error) {
        // revert
        setLiked((s) => { const n = new Set(s); n.delete(cid); return n; });
      }
    }
  };

  const remove = async (cid: string, authorId: string) => {
    if (!user || (user.id !== authorId && !isAdmin)) return;
    if (!confirm("Delete this comment?")) return;
    const { error } = await supabase.from("post_comments").delete().eq("id", cid);
    if (error) toast.error(error.message);
  };

  const tree = buildTree(rows);
  const total = rows.length;

  const Row = ({ node, depth = 0 }: { node: Node; depth?: number }) => {
    const isLiked = liked.has(node.id);
    const canDelete = user && (user.id === node.author_id || isAdmin);
    return (
      <li className={depth === 0 ? "" : "ml-10 mt-2"}>
        <div className="flex gap-2 items-start">
          <Link to="/profile/$id" params={{ id: node.author?.id ?? "" }}>
            <AvatarDisplay avatarKey={node.author?.avatar_key ?? "boy-1"} size={depth === 0 ? 36 : 28} />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="bg-muted/60 rounded-2xl px-3.5 py-2 inline-block max-w-full">
              <Link to="/profile/$id" params={{ id: node.author?.id ?? "" }} className="text-xs font-semibold hover:underline">
                {node.author?.display_name ?? "User"}
              </Link>
              <p className="text-sm whitespace-pre-wrap break-words leading-snug">{node.body}</p>
            </div>
            <div className="flex items-center gap-3 mt-1 ml-3 text-[11px] text-muted-foreground">
              <span>{formatDistanceToNow(new Date(node.created_at), { addSuffix: true })}</span>
              <button onClick={() => toggleLike(node.id)} className={`font-semibold inline-flex items-center gap-1 ${isLiked ? "text-primary" : "hover:text-foreground"}`}>
                <Heart className={`w-3 h-3 ${isLiked ? "fill-current" : ""}`} /> Like{node.like_count > 0 ? ` · ${node.like_count}` : ""}
              </button>
              {depth === 0 && user && (
                <button
                  onClick={() => { setReplyTo({ id: node.id, name: node.author?.display_name ?? "user" }); }}
                  className="font-semibold hover:text-foreground inline-flex items-center gap-1"
                >
                  <MessageSquare className="w-3 h-3" /> Reply
                </button>
              )}
              {canDelete && (
                <button onClick={() => remove(node.id, node.author_id)} className="ml-auto hover:text-destructive inline-flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              )}
            </div>
            {node.replies.length > 0 && (
              <ul className="mt-2 space-y-2">
                {node.replies.map((r) => <Row key={r.id} node={r} depth={depth + 1} />)}
              </ul>
            )}
          </div>
        </div>
      </li>
    );
  };

  return (
    <section className="mt-6 border-t pt-5">
      <h3 className="text-sm font-bold mb-3">Comments {total > 0 && <span className="text-muted-foreground font-normal">· {total}</span>}</h3>
      {tree.length === 0 ? (
        <p className="text-sm text-muted-foreground italic mb-4">No comments yet — be the first.</p>
      ) : (
        <ul className="space-y-4 mb-4">
          {tree.map((n) => <Row key={n.id} node={n} />)}
        </ul>
      )}
      {user ? (
        <form onSubmit={submit} className="space-y-2">
          {replyTo && (
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              Replying to <span className="font-semibold text-foreground">{replyTo.name}</span>
              <button type="button" onClick={() => setReplyTo(null)} className="text-primary hover:underline">cancel</button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={replyTo ? `Reply to ${replyTo.name}…` : "Write a comment…"}
              maxLength={2000}
              className="flex-1 text-sm rounded-full border bg-background px-4 py-2 focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <button type="submit" disabled={posting || !text.trim()} className="inline-flex items-center gap-1 px-4 py-2 text-sm font-semibold rounded-full bg-primary text-primary-foreground disabled:opacity-50">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      ) : (
        <Link to="/login" search={{ redirect: typeof window !== "undefined" ? window.location.pathname : "/" }} className="text-sm text-primary font-semibold hover:underline">Sign in to comment →</Link>
      )}
    </section>
  );
}
