import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, ExternalLink, GraduationCap, Loader2 } from "lucide-react";

export const Route = createFileRoute("/courses/$id")({ component: CourseReader });

type CourseRow = {
  id: string;
  source: string;
  title: string;
  author: string | null;
  subject: string | null;
  level: string | null;
  cover_url: string | null;
  description: string | null;
  read_url: string;
  download_url: string | null;
  can_embed: boolean;
  is_course: boolean;
};

function CourseReader() {
  const { id } = Route.useParams();
  const router = useRouter();

  const { data: course, isLoading } = useQuery({
    queryKey: ["library-course", id],
    queryFn: async () => {
      const { data } = await supabase.from("library_courses" as never).select("*").eq("id", id).maybeSingle();
      return data as unknown as CourseRow | null;
    },
  });

  // Record progress / last opened
  useEffect(() => {
    if (!course) return;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      await supabase.from("library_course_progress" as never).upsert(
        { user_id: u.user.id, course_id: course.id, last_opened_at: new Date().toISOString() } as never,
        { onConflict: "user_id,course_id" },
      );
    })();
  }, [course]);

  return (
    <AppShell>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Button size="sm" variant="ghost" onClick={() => router.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <Link to="/courses" className="text-xs text-muted-foreground hover:text-primary">All courses</Link>
        </div>

        {isLoading && (
          <p className="text-center text-muted-foreground py-12">
            <Loader2 className="w-5 h-5 inline animate-spin mr-1" /> Loading…
          </p>
        )}

        {!isLoading && !course && (
          <div className="text-center py-16 text-muted-foreground bg-card border rounded-2xl">
            <GraduationCap className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>Course not found.</p>
          </div>
        )}

        {course && (
          <div className="bg-card border rounded-2xl overflow-hidden shadow-card">
            <div className="p-4 flex gap-4 items-start border-b flex-wrap">
              {course.cover_url && (
                <img src={course.cover_url} alt={course.title} className="w-24 h-32 object-cover rounded-lg shadow" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">{course.source.replace(/_/g, " ")}</span>
                  {course.subject && <span>{course.subject}</span>}
                  {course.level && <span>· {course.level}</span>}
                </div>
                <h1 className="text-lg font-bold font-display leading-tight">{course.title}</h1>
                {course.author && <p className="text-sm text-muted-foreground">{course.author}</p>}
                {course.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-4">{course.description}</p>}
                <div className="flex gap-2 mt-3 flex-wrap">
                  {course.download_url && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={course.download_url} download target="_blank" rel="noopener">
                        <Download className="w-3.5 h-3.5 mr-1" /> Download PDF
                      </a>
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" asChild>
                    <a href={course.read_url} target="_blank" rel="noopener">
                      <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open in new tab
                    </a>
                  </Button>
                </div>
              </div>
            </div>

            <div className="w-full bg-black" style={{ height: "80vh" }}>
              <iframe
                src={course.read_url}
                title={course.title}
                className="w-full h-full border-0"
                allow="fullscreen"
                allowFullScreen
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
