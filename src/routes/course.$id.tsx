import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { PostCard, type FeedPost } from "@/components/PostCard";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Plus, Clock, BookOpen, ClipboardList, FileQuestion, Users, Gamepad2, MessageSquare, Newspaper, HelpCircle, BookMarked } from "lucide-react";

export const Route = createFileRoute("/course/$id")({ component: CoursePage });

function CoursePage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["course", id],
    queryFn: async () => {
      const [{ data: c }, { data: posts }] = await Promise.all([
        supabase.from("courses").select("code,title").eq("id", id).maybeSingle(),
        supabase.from("posts")
          .select("id,title,body,post_type,file_url,view_count,like_count,comment_count,repost_count,created_at, course:courses(code,title), author:profiles!posts_author_id_fkey(id,display_name,avatar_key,rank_tier,rank_step,show_online,last_seen_at)")
          .eq("course_id", id)
          .order("created_at", { ascending: false }),
      ]);
      return { course: c, posts: (posts ?? []) as unknown as FeedPost[] };
    },
  });

  const groups: Array<{ key: string; label: string; icon: typeof BookOpen }> = [
    { key: "note", label: "Study material", icon: BookOpen },
    { key: "assignment", label: "Assignment", icon: ClipboardList },
    { key: "past_question", label: "Past question", icon: FileQuestion },
    { key: "novel", label: "Novel", icon: BookMarked },
    { key: "news", label: "News", icon: Newspaper },
    { key: "request", label: "Request", icon: HelpCircle },
    { key: "general", label: "Posts & discussion", icon: MessageSquare },
  ];

  const postLink = (type: string) => ({
    to: user ? "/post/new" : "/login",
    search: user ? { course: id, type } : { redirect: "/post/new" },
  });

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-sm text-primary font-bold">{data?.course?.code}</p>
          <h1 className="text-2xl font-bold font-display">{data?.course?.title}</h1>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <Link
          to="/chat"
          search={{ tab: "dms", newGroup: true, groupName: `${data?.course?.code ?? ""} ${data?.course?.title ?? ""}`.trim() }}
          className="bg-card border-2 border-dashed rounded-2xl p-4 text-left hover:border-primary/50 transition block"
        >
          <Users className="w-6 h-6 text-primary mb-2" />
          <p className="font-bold font-display">Create a group</p>
          <p className="text-xs text-muted-foreground">Open Chat Plug</p>
        </Link>
        <Link
          to="/games"
          className="bg-card border-2 border-dashed rounded-2xl p-4 hover:border-primary/50 transition block"
        >
          <Gamepad2 className="w-6 h-6 text-primary mb-2" />
          <p className="font-bold font-display">Game</p>
          <p className="text-xs text-muted-foreground">Play & earn credits</p>
        </Link>
      </div>

      {groups.map((g) => {
        const items = data?.posts.filter((p) => p.post_type === g.key) ?? [];
        if (g.key === "past_question" && items.length === 0) return null;
        const Icon = g.icon;
        return (
          <section key={g.key} className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold font-display flex items-center gap-2">
                <Icon className="w-5 h-5 text-primary" />
                {g.label}
              </h2>
              <Button asChild size="sm" variant="outline">
                <Link {...postLink(g.key)}>
                  <Plus className="w-4 h-4 mr-1" />Add
                </Link>
              </Button>
            </div>
            {items.length ? (
              <div className="space-y-3">{items.map((p) => <PostCard key={p.id} post={p} locked={!user} />)}</div>
            ) : (
              <div className="bg-card border-2 border-dashed rounded-2xl p-6 text-center">
                <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="font-semibold">Coming soon</p>
                <p className="text-sm text-muted-foreground mb-3">
                  No {g.label.toLowerCase()} yet. Be the first to share one.
                </p>
                <Button asChild size="sm">
                  <Link {...postLink(g.key)}>
                    <Plus className="w-4 h-4 mr-1" />Post {g.label.toLowerCase()}
                  </Link>
                </Button>
              </div>
            )}
          </section>
        );
      })}
    </AppShell>
  );
}
