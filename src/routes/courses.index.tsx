import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, keepPreviousData } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { GraduationCap, Loader2, RefreshCw, BookOpen } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/courses/")({
  component: CoursesPage,
  head: () => ({
    meta: [
      { title: "Free Courses & Textbooks — StudentsPlug" },
      { name: "description", content: "Read free university-level textbooks from OpenStax, MIT OpenCourseWare, LibreTexts and Saylor — embedded inside StudentsPlug." },
      { property: "og:title", content: "Free Courses & Textbooks — StudentsPlug" },
      { property: "og:description", content: "Curated free, embeddable academic content from OpenStax, MIT OCW, LibreTexts and more." },
      { property: "og:url", content: "/courses" },
    ],
    links: [{ rel: "canonical", href: "/courses" }],
  }),
});

const SOURCE_LABEL: Record<string, string> = {
  openstax: "OpenStax",
  open_textbook_library: "Open Textbook Library",
  doab: "DOAB",
  oapen: "OAPEN",
  wikibooks: "Wikibooks",
  wikiversity: "Wikiversity",
  mit_ocw: "MIT OpenCourseWare",
  libretexts: "LibreTexts",
  saylor: "Saylor Academy",
};

function CoursesPage() {
  const [subject, setSubject] = useState<string>("all");
  const [source, setSource] = useState<string>("all");
  const [q, setQ] = useState("");

  const {
    data: items,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["library-courses", subject, source, q],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let query = supabase
        .from("library_courses" as never)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (subject !== "all") query = query.eq("subject", subject);
      if (source !== "all") query = query.eq("source", source);
      if (q.trim()) {
        const like = `%${q.trim().replace(/[%,]/g, " ")}%`;
        query = query.or(`title.ilike.${like},author.ilike.${like},description.ilike.${like}`);
      }
      const { data } = await query;
      return (data as unknown as CourseItem[]) ?? [];
    },
  });

  const subjects = useMemo(() => {
    const s = new Set<string>();
    (items ?? []).forEach((it) => it.subject && s.add(it.subject));
    return Array.from(s).sort();
  }, [items]);

  const sync = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/public/hooks/sync-courses", { method: "POST" });
      if (!res.ok) throw new Error("Sync failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Course library refreshed");
      refetch();
    },
    onError: () => toast.error("Sync failed"),
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="bg-card border rounded-3xl p-6 shadow-card">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold font-display flex items-center gap-2">
                <GraduationCap className="w-6 h-6 text-primary" /> Free Courses & Textbooks
              </h1>
              <p className="text-sm text-muted-foreground">
                OpenStax · MIT OpenCourseWare · LibreTexts · Open Textbook Library · Saylor Academy
                — all readable in-app
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={sync.isPending}
              onClick={() => sync.mutate()}
            >
              {sync.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-1" />
              )}
              Refresh
            </Button>
          </div>

          <input
            type="search"
            name="course-library-search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            inputMode="search"
            enterKeyHint="search"
            data-form-type="other"
            data-lpignore="true"
            data-1p-ignore="true"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, author, topic…"
            className="mt-4 w-full h-10 px-4 rounded-full border bg-background"
          />

          <div className="mt-3 flex gap-2 flex-wrap items-center">
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="h-8 px-3 rounded-full border text-xs bg-background"
            >
              <option value="all">All sources</option>
              {Object.entries(SOURCE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-8 px-3 rounded-full border text-xs bg-background"
            >
              <option value="all">All subjects</option>
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading && (
          <p className="text-center text-muted-foreground py-8">
            <Loader2 className="w-5 h-5 inline animate-spin" /> Loading…
          </p>
        )}

        {!isLoading && (items?.length ?? 0) === 0 && (
          <div className="text-center py-16 text-muted-foreground bg-card border rounded-2xl">
            <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>No courses yet. Tap Refresh to fetch the catalog.</p>
            <Button className="mt-4" onClick={() => sync.mutate()} disabled={sync.isPending}>
              {sync.isPending ? "Fetching…" : "Fetch catalog"}
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(items ?? []).map((c) => (
            <Link
              key={c.id}
              to="/courses/$id"
              params={{ id: c.id }}
              className="bg-card border rounded-2xl overflow-hidden shadow-card flex flex-col hover:border-primary transition"
            >
              <div className="aspect-[16/9] bg-muted overflow-hidden">
                {c.cover_url ? (
                  <img
                    src={c.cover_url}
                    alt={c.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-gradient-to-br from-primary/10 to-primary/5">
                    <GraduationCap className="w-12 h-12 opacity-50" />
                  </div>
                )}
              </div>
              <div className="p-4 flex flex-col gap-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap text-[10px] uppercase tracking-wide text-muted-foreground">
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                    {SOURCE_LABEL[c.source] ?? c.source}
                  </span>
                  {c.subject && <span>{c.subject}</span>}
                  {c.level && <span>· {c.level}</span>}
                </div>
                <h3 className="text-sm font-bold leading-snug line-clamp-2">{c.title}</h3>
                {c.author && (
                  <p className="text-xs text-muted-foreground line-clamp-1">{c.author}</p>
                )}
                {c.description && (
                  <p className="text-xs text-muted-foreground line-clamp-3 mt-auto pt-1">
                    {c.description}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

type CourseItem = {
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
