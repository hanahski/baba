import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { SiteSearch } from "@/components/SiteSearch";
import { builtInPastQuestions } from "@/lib/past-questions";
import { FileText, BookOpen, GraduationCap, ShoppingBag, User, Loader2 } from "lucide-react";

const searchSchema = z.object({ q: z.string().optional().default("") });

export const Route = createFileRoute("/search")({
  validateSearch: searchSchema,
  component: SearchPage,
});

async function safe<T>(p: PromiseLike<{ data: T | null; error: any }>): Promise<T[]> {
  try { const r = await p; return ((r as any).data as T[] | null) ?? []; } catch { return []; }
}

function SearchPage() {
  const { q } = Route.useSearch();
  const term = (q ?? "").trim();

  const { data, isFetching } = useQuery({
    queryKey: ["search-full", term],
    enabled: term.length >= 2,
    queryFn: async () => {
      const like = `%${term.replace(/[%,]/g, " ").slice(0, 80)}%`;
      const [posts, notes, courses, people, market] = await Promise.all([
        safe<any>(supabase.from("posts").select("id,title,body,post_type,course:courses(code,title),author:profiles!posts_author_id_fkey(display_name)").or(`title.ilike.${like},body.ilike.${like}`).order("created_at", { ascending: false }).limit(30)),
        safe<any>(supabase.from("study_notes").select("id,title,body,course_id").or(`title.ilike.${like},body.ilike.${like}`).order("created_at", { ascending: false }).limit(30)),
        safe<any>(supabase.from("courses").select("id,code,title").or(`code.ilike.${like},title.ilike.${like}`).limit(30)),
        safe<any>(supabase.from("profiles").select("id,display_name,rank_tier,bio").ilike("display_name", like).limit(30)),
        safe<any>(supabase.from("market_listings").select("id,title,description,price").eq("is_sold", false).or(`title.ilike.${like},description.ilike.${like}`).order("created_at", { ascending: false }).limit(30)),
      ]);
      const pq = builtInPastQuestions
        .filter((p) => p.title.toLowerCase().includes(term.toLowerCase()) || p.body.toLowerCase().includes(term.toLowerCase()) || (p.course?.code ?? "").toLowerCase().includes(term.toLowerCase()))
        .map((p) => ({ id: p.id, title: p.title, body: p.body, course: p.course }));
      return { posts, notes: [...pq, ...notes], courses, people, market };
    },
  });

  const total = data ? data.posts.length + data.notes.length + data.courses.length + data.people.length + data.market.length : 0;

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-bold font-display mb-3">Search</h1>
          <SiteSearch autoFocus placeholder="Search the whole site…" />
        </header>

        {term.length < 1 ? (
          <p className="text-sm text-muted-foreground">Type something to search across posts, notes, courses, books, market, and people.</p>
        ) : isFetching && !data ? (
          <p className="text-sm text-muted-foreground inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Searching…</p>
        ) : total === 0 ? (
          <div className="bg-card border rounded-2xl p-8 text-center">
            <p className="font-semibold">No results for "{term}"</p>
            <p className="text-sm text-muted-foreground mt-1">Try a course code (e.g. CSC 201), an author, or a topic.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {data!.posts.length > 0 && (
              <Section icon={FileText} label={`Posts (${data!.posts.length})`}>
                {data!.posts.map((p: any) => (
                  <ResultRow key={p.id} to="/post/$id" params={{ id: p.id }} title={p.title} subtitle={[p.course?.code, p.author?.display_name].filter(Boolean).join(" • ")} />
                ))}
              </Section>
            )}
            {data!.notes.length > 0 && (
              <Section icon={BookOpen} label={`Notes & Past Questions (${data!.notes.length})`}>
                {data!.notes.map((n: any) => (
                  <ResultRow key={String(n.id)} to="/notes/$id" params={{ id: String(n.id) }} title={n.title} subtitle={n.course?.code} />
                ))}
              </Section>
            )}
            {data!.courses.length > 0 && (
              <Section icon={GraduationCap} label={`Courses (${data!.courses.length})`}>
                {data!.courses.map((c: any) => (
                  <ResultRow key={c.id} to="/course/$id" params={{ id: c.id }} title={`${c.code} — ${c.title}`} />
                ))}
              </Section>
            )}
            {data!.people.length > 0 && (
              <Section icon={User} label={`People (${data!.people.length})`}>
                {data!.people.map((u: any) => (
                  <ResultRow key={u.id} to="/profile/$id" params={{ id: u.id }} title={u.display_name} subtitle={u.bio ?? u.rank_tier} />
                ))}
              </Section>
            )}
            {data!.market.length > 0 && (
              <Section icon={ShoppingBag} label={`Market (${data!.market.length})`}>
                {data!.market.map((m: any) => (
                  <ResultRow key={m.id} to="/market/$id" params={{ id: m.id }} title={m.title} subtitle={`₦${Number(m.price).toLocaleString()}`} />
                ))}
              </Section>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Section({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border rounded-2xl overflow-hidden">
      <h2 className="text-xs uppercase tracking-wider font-bold text-muted-foreground px-4 py-2.5 border-b inline-flex items-center gap-1.5"><Icon className="w-3.5 h-3.5" /> {label}</h2>
      <div className="divide-y">{children}</div>
    </section>
  );
}
function ResultRow({ to, params, title, subtitle }: { to: any; params: any; title: string; subtitle?: string }) {
  return (
    <Link to={to} params={params} className="block px-4 py-3 hover:bg-accent">
      <p className="text-sm font-semibold line-clamp-1">{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{subtitle}</p>}
    </Link>
  );
}
