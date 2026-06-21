import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BookOpen, Search, ScanLine, FileText } from "lucide-react";
import { builtInPastQuestions } from "@/lib/past-questions";
import { SaveButton } from "@/components/SaveButton";

export const Route = createFileRoute("/notes/")({ component: NotesLibrary });

function NotesLibrary() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  useEffect(() => { const t = setTimeout(() => setDebouncedQ(q.trim()), 220); return () => clearTimeout(t); }, [q]);

  const { data: notes, isLoading, isError, error } = useQuery({
    queryKey: ["study-notes", debouncedQ],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let query = supabase
        .from("study_notes")
        .select("id,title,body,created_at,uploader_id,course_id")
        .order("created_at", { ascending: false })
        .limit(60);
      if (debouncedQ) {
        const like = `%${debouncedQ.replace(/[%,]/g, " ")}%`;
        query = query.or(`title.ilike.${like},body.ilike.${like}`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    retry: 1,
  });

  const term = debouncedQ.toLowerCase();
  const builtIns = builtInPastQuestions
    .filter((n) => !term || n.title.toLowerCase().includes(term) || n.body.toLowerCase().includes(term) || (n.course?.code ?? "").toLowerCase().includes(term))
    .map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      created_at: "2026-05-26T00:00:00.000Z",
      uploader_id: null,
      course: n.course,
      _kind: "past_question" as const,
    }));

  const allNotes = [...builtIns, ...(notes ?? [])];
  const filtered = allNotes;

  return (
    <AppShell>
      <div className="mb-6 rounded-3xl p-6 bg-gradient-to-br from-primary/15 via-accent to-background border animate-fade-in-up">
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full mb-2">
          <BookOpen className="w-3.5 h-3.5" /> Study Notes Library
        </div>
        <h1 className="text-3xl font-bold font-display">Notes that don't disappear.</h1>
        <p className="text-muted-foreground mt-1">Scan a textbook page or screenshot with the OCR tool and save it here — searchable, organized, always with you.</p>
        <div className="mt-4 flex gap-2 flex-wrap">
          <Button asChild size="sm" variant="secondary">
            <Link to="/tools/ocr"><ScanLine className="w-4 h-4 mr-1" />Scan & save a note</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/tools/pdf"><FileText className="w-4 h-4 mr-1" />Make a PDF</Link>
          </Button>
        </div>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes…" className="pl-9 rounded-full" />
      </div>

      {isLoading && allNotes.length === 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card border rounded-2xl p-4 animate-pulse">
              <div className="h-3 w-16 bg-muted rounded mb-2" />
              <div className="h-4 w-3/4 bg-muted rounded mb-3" />
              <div className="space-y-1.5">
                <div className="h-3 w-full bg-muted rounded" />
                <div className="h-3 w-5/6 bg-muted rounded" />
                <div className="h-3 w-2/3 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : isError && allNotes.length === 0 ? (
        <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-6 text-sm">
          Couldn't load notes from the cloud. {(error as Error)?.message}
        </div>
      ) : !filtered.length ? (
        <div className="bg-card border rounded-2xl p-8 text-center">
          <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold">No saved notes yet.</p>
          <p className="text-sm text-muted-foreground mt-1">Use the OCR tool to scan and save your first one.</p>
          <Button asChild className="mt-4"><Link to="/tools/ocr">Open OCR tool</Link></Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((n: any) => (
            <div key={n.id} className="relative">
              <SaveButton
                itemType={n._kind === "past_question" ? "past_question" : "note"}
                itemId={String(n.id)}
                title={n.title}
                subtitle={n.course?.code ?? null}
                className="absolute top-2 right-2 z-10"
              />
              <Link to="/notes/$id" params={{ id: String(n.id) }} className="bg-card border rounded-2xl p-4 shadow-card hover-lift transition block">
                {n.course?.code && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{n.course.code}</span>
                )}
                <h3 className="font-bold font-display mt-1 line-clamp-2 pr-8">{n.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-5 whitespace-pre-wrap">{n.body}</p>
                <p className="text-[10px] text-muted-foreground mt-3">{new Date(n.created_at).toISOString().slice(0, 10)}</p>
              </Link>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
