import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ArrowLeft, BookOpen } from "lucide-react";
import { getBuiltInPastQuestion } from "@/lib/past-questions";
import { useAuth } from "@/lib/auth";
import { PastQuestionArticle } from "@/components/PastQuestionArticle";


export const Route = createFileRoute("/notes/$id")({
  component: NoteDetail,
  head: ({ params }) => {
    const builtIn = getBuiltInPastQuestion(params.id);
    const title = builtIn?.title ?? "Study note — StudentsPlug";
    const desc = builtIn
      ? `${builtIn.title} — past question and study note on StudentsPlug.`
      : "Past questions and study notes shared by EBSU students on StudentsPlug.";
    const url = `/notes/${params.id}`;
    return {
      meta: [
        { title: `${title} — StudentsPlug`.slice(0, 70) },
        { name: "description", content: desc.slice(0, 160) },
        { property: "og:title", content: title },
        { property: "og:description", content: desc.slice(0, 200) },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: title,
          author: { "@type": "Organization", name: "StudentsPlug" },
        }),
      }],
    };
  },
});

function NoteDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const { data: note, isLoading, isError, error } = useQuery({
    queryKey: ["note", id],
    queryFn: async () => {
      const builtIn = getBuiltInPastQuestion(id);
      if (builtIn) {
        return {
          id: builtIn.id,
          title: builtIn.title,
          body: builtIn.body,
          created_at: "2026-05-26T00:00:00.000Z",
          course_id: null,
          course: builtIn.course,
          faculty: builtIn.faculty ?? null,
          department: builtIn.department ?? null,
        };
      }
      const { data, error } = await supabase
        .from("study_notes")
        .select("id,title,body,created_at,course_id")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      let course: { code: string; title: string } | null = null;
      if (data.course_id) {
        const { data: c } = await supabase
          .from("courses")
          .select("code,title")
          .eq("id", data.course_id)
          .maybeSingle();
        course = c ?? null;
      }
      return { ...data, course, faculty: null, department: null };
    },
  });

  const isBuiltIn = id.startsWith("pdf-page-") || !!getBuiltInPastQuestion(id);

  // Record this user's view (once per note, enforced by UNIQUE constraint).
  useEffect(() => {
    if (!user || isBuiltIn) return;
    supabase.from("note_views").insert({ note_id: id, viewer_id: user.id }).then(() => {});
  }, [user, id, isBuiltIn]);

  // Audience — who has opened this note.
  const { data: audience } = useQuery({
    queryKey: ["note-audience", id],
    enabled: !isBuiltIn,
    queryFn: async () => {
      const { data: views } = await supabase
        .from("note_views")
        .select("viewer_id, created_at")
        .eq("note_id", id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!views?.length) return { count: 0, viewers: [] as any[] };
      const ids = Array.from(
        new Set(views.map((v) => v.viewer_id).filter((x): x is string => !!x)),
      );
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,display_name,avatar_key")
        .in("id", ids);
      const pmap = new Map((profiles ?? []).map((p) => [p.id, p]));
      const viewers = views
        .map((v) => ({ ...(v.viewer_id ? pmap.get(v.viewer_id) : undefined), at: v.created_at }))
        .filter((v: any) => v.id);
      return { count: views.length, viewers };
    },
  });

  return (
    <AppShell>
      <Link to="/notes" className="text-sm text-primary inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="w-4 h-4" />All Past Questions
      </Link>

      {isLoading ? (
        <div className="bg-card border rounded-2xl p-8 animate-pulse">
          <div className="h-3 w-24 bg-muted rounded mb-3" />
          <div className="h-6 w-2/3 bg-muted rounded mb-2" />
          <div className="h-4 w-1/2 bg-muted rounded mb-6" />
          <div className="space-y-2">
            <div className="h-3 w-full bg-muted rounded" />
            <div className="h-3 w-11/12 bg-muted rounded" />
            <div className="h-3 w-10/12 bg-muted rounded" />
          </div>
        </div>
      ) : isError ? (
        <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-6 text-sm">
          Couldn't load this past question. {(error as Error)?.message}
        </div>
      ) : !note ? (
        <div className="bg-card border rounded-2xl p-8 text-center">
          <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold">Past question not found.</p>
        </div>
      ) : (
        <PastQuestionArticle note={note} audience={isBuiltIn ? null : audience ?? null} />
      )}
    </AppShell>
  );
}
