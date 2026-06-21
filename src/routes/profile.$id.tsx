import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { AvatarDisplay } from "@/components/AvatarDisplay";
import { RankBadge } from "@/components/RankBadge";
import { PostCard, type FeedPost } from "@/components/PostCard";
import { encouragement, nextLevelLabel, rankProgress } from "@/lib/ranks";
import { useAuth } from "@/lib/auth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BadgeCheck, GraduationCap, MessageSquare, Send } from "lucide-react";
import { Link as RLink } from "@tanstack/react-router";
import { MediaPlayer } from "@/components/MediaPlayer";
import { SpecialBadges } from "@/components/SpecialBadges";
import { AdminCrownBadge, useIsAdminUser } from "@/components/AdminCrownBadge";
import { useIsAdmin } from "@/lib/admin-ids";
import { getOrCreateDmThread } from "@/lib/dm";
import { toast } from "sonner";

export const Route = createFileRoute("/profile/$id")({ component: ProfilePage });

function ProfilePage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [tab, setTab] = useState("posts");
  const navigate = useNavigate();
  const [dmBusy, setDmBusy] = useState(false);
  const { data: isAdmin } = useIsAdminUser(user?.id);
  const profileIsAdmin = useIsAdmin(id);


  const { data, isLoading, error } = useQuery({
    queryKey: ["profile", id],
    queryFn: async () => {
      const { data: p, error: pErr } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      if (pErr) throw pErr;
      const [{ data: posts }, dept] = await Promise.all([
        supabase.from("posts")
          .select("id,title,body,post_type,file_url,image_url,media_url,media_type,link_url,view_count,like_count,comment_count,repost_count,created_at,is_official, course:courses(code,title), author:profiles!posts_author_id_fkey(id,display_name,avatar_key,rank_tier,rank_step,show_online,last_seen_at)")
          .eq("author_id", id).order("created_at", { ascending: false }),
        p?.department_id
          ? supabase.from("departments").select("name,faculty:faculties(name)").eq("id", p.department_id).maybeSingle().then((r) => r.data)
          : Promise.resolve(null),
      ]);
      return { profile: p, posts: (posts ?? []) as unknown as FeedPost[], dept };
    },
  });

  if (isLoading) return <AppShell><div className="max-w-3xl mx-auto py-10 text-center text-muted-foreground">Loading profile…</div></AppShell>;
  if (error) return <AppShell><div className="max-w-3xl mx-auto py-10 text-center"><p className="text-destructive font-semibold">Couldn't load profile</p><p className="text-sm text-muted-foreground mt-1">{(error as any)?.message}</p></div></AppShell>;
  if (!data?.profile) return <AppShell><div className="max-w-3xl mx-auto py-10 text-center"><p className="font-semibold">Profile not found</p><p className="text-sm text-muted-foreground mt-1">This user may have deleted their account.</p></div></AppShell>;
  const p: any = data.profile;
  const prog = rankProgress(p.approved_post_count);
  const online = p.show_online && Date.now() - new Date(p.last_seen_at).getTime() < 5 * 60_000;
  const coverUrl = p.cover_url as string | null;
  const coverVideoUrl = (p as any).cover_video_url as string | null;
  const isMe = user?.id === p.id;

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <div className="bg-card border rounded-3xl shadow-card overflow-hidden">
          <div
            className="relative h-32 sm:h-44 bg-gradient-to-br from-primary/20 via-accent/20 to-primary/10 bg-cover bg-center"
            style={!coverVideoUrl && coverUrl ? { backgroundImage: `url(${coverUrl})` } : undefined}
          >
            {coverVideoUrl && (
              <video
                src={coverVideoUrl}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
          </div>

          <div className="p-4 sm:p-6">
            <div className="flex items-start gap-4 flex-wrap -mt-12 sm:-mt-16">
              <div className="rounded-full ring-4 ring-card">
                <AvatarDisplay avatarKey={p.avatar_key} size={88} online={online} photoUrl={(p as any).picture_url} />
              </div>
              <div className="flex-1 min-w-0 pt-2 w-full">
                <h1 className="text-xl sm:text-2xl font-bold font-display leading-tight break-words flex items-start gap-2">
                  <span className="break-words min-w-0 flex-1">{p.display_name}</span>
                  {profileIsAdmin ? (
                    isMe && isAdmin ? (
                      <Link to="/admin" className="hover:opacity-80 transition-opacity" title="Admin Panel">
                        <AdminCrownBadge size={24} className="mt-1" />
                      </Link>
                    ) : (
                      <AdminCrownBadge size={24} className="mt-1" />
                    )
                  ) : (
                    <SpecialBadges profile={p} size={20} className="mt-1" />
                  )}
                </h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {!profileIsAdmin && <RankBadge tier={p.rank_tier} step={p.rank_step} />}
                  <span className="text-xs text-muted-foreground">{p.approved_post_count} posts</span>
                  {p.academic_level && <Badge variant="secondary">{p.academic_level} level</Badge>}
                </div>
                {!isMe && (
                  <Button
                    size="sm"
                    className="mt-3"
                    disabled={dmBusy}
                    onClick={async () => {
                      if (!user) { navigate({ to: "/login", search: { redirect: `/profile/${p.id}` } }); return; }
                      setDmBusy(true);
                      try {
                        const tid = await getOrCreateDmThread(user.id, p.id);
                        navigate({ to: "/chat", search: { t: tid } as any });
                      } catch (e: any) {
                        toast.error(e.message ?? "Couldn't open chat");
                      } finally {
                        setDmBusy(false);
                      }
                    }}
                  >
                    <Send className="w-4 h-4 mr-1.5" /> Message
                  </Button>
                )}
              </div>
            </div>
            <div className="mt-6">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold">Progress to {nextLevelLabel(prog.tier, prog.step)}</span>
                <span className="text-muted-foreground">{prog.postsInStep}/10 posts</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-hero rank-grow" style={{ width: `${prog.pct}%` }} />
              </div>
              <p className="text-xs text-primary mt-2 italic">{encouragement(p.approved_post_count)}</p>
            </div>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="posts">Posts ({data.posts.length})</TabsTrigger>
            <TabsTrigger value="media">Media ({data.posts.filter((p:any)=>p.media_url||p.image_url).length})</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-4">
            <div className="space-y-3">
              {data.posts.map((post) => <PostCard key={post.id} post={post} />)}
              {!data.posts.length && <p className="text-sm text-muted-foreground">{isMe ? "You haven't" : "This user hasn't"} posted yet.</p>}
            </div>
          </TabsContent>

          <TabsContent value="media" className="mt-4">
            {(() => {
              const media = data.posts.filter((p: any) => p.media_url || p.image_url);
              if (!media.length) return <p className="text-sm text-muted-foreground">No photos or videos yet.</p>;
              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {media.map((p: any) => {
                    const url = p.media_url ?? p.image_url;
                    const type = p.media_type ?? "image";
                    const isVideo = type === "video" || /\.(mp4|webm|mov)(\?|$)/i.test(url);
                    const isAudio = type === "audio";
                    return (
                      <RLink
                        key={p.id}
                        to="/post/$id"
                        params={{ id: p.id }}
                        className="aspect-square overflow-hidden rounded-xl border bg-muted relative group"
                      >
                        {isVideo ? (
                          <video src={url} className="w-full h-full object-cover" muted preload="metadata" />
                        ) : isAudio ? (
                          <div className="w-full h-full flex items-center justify-center text-3xl bg-gradient-to-br from-primary/20 to-accent/40">🎵</div>
                        ) : (
                          <img src={url} alt={p.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        )}
                      </RLink>
                    );
                  })}
                </div>
              );
            })()}
          </TabsContent>

          <TabsContent value="about" className="mt-4 space-y-3">
            <div className="bg-card border rounded-2xl p-5 space-y-3">
              {p.bio ? (
                <div>
                  <h3 className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-1">Bio</h3>
                  <p className="text-sm whitespace-pre-wrap">{p.bio}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No bio yet.</p>
              )}
              {data.dept?.name && (
                <div className="flex items-start gap-2 text-sm">
                  <GraduationCap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>
                    <b>{data.dept.name}</b>
                    {(data.dept as any).faculty?.name && <span className="text-muted-foreground"> • {(data.dept as any).faculty.name}</span>}
                  </span>
                </div>
              )}
              {p.academic_level && (
                <div className="flex items-center gap-2 text-sm">
                  <MessageSquare className="w-4 h-4 text-primary shrink-0" />
                  <span>{p.academic_level} level student</span>
                </div>
              )}
              <div className="text-xs text-muted-foreground pt-2 border-t">
                Joined {new Date(p.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
