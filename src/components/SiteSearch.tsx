import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, Loader2, X, FileText, BookOpen, GraduationCap, ShoppingBag, User } from "lucide-react";
import { builtInPastQuestions } from "@/lib/past-questions";

type Group = {
  key: string;
  label: string;
  icon: typeof FileText;
  items: { id: string; to: any; params?: any; title: string; subtitle?: string }[];
};

function useDebounced<T>(value: T, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

async function safe<T>(p: PromiseLike<{ data: T | null; error: any }>): Promise<T[]> {
  try {
    const r = await p;
    return ((r as any).data as T[] | null) ?? [];
  } catch {
    return [];
  }
}

export function SiteSearch({ autoFocus = false, placeholder }: { autoFocus?: boolean; placeholder?: string }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const debounced = useDebounced(q.trim(), 150);
  const rootRef = useRef<HTMLDivElement>(null);
  const nav = useNavigate();

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const { data, isFetching } = useQuery({
    queryKey: ["site-search", debounced],
    enabled: debounced.length >= 1,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    queryFn: async () => {
      const term = debounced.replace(/[%,]/g, " ").slice(0, 80);
      const like = `%${term}%`;
      const [posts, notes, courses, people, market, books] = await Promise.all([
        safe<any>(supabase.from("posts")
          .select("id,title,body,post_type,course:courses(code,title),author:profiles!posts_author_id_fkey(display_name)")
          .or(`title.ilike.${like},body.ilike.${like}`)
          .order("created_at", { ascending: false }).limit(6)),
        safe<any>(supabase.from("study_notes")
          .select("id,title,body,course_id")
          .or(`title.ilike.${like},body.ilike.${like}`)
          .order("created_at", { ascending: false }).limit(6)),
        safe<any>(supabase.from("courses")
          .select("id,code,title")
          .or(`code.ilike.${like},title.ilike.${like}`)
          .limit(6)),
        safe<any>(supabase.from("profiles")
          .select("id,display_name,rank_tier")
          .ilike("display_name", like)
          .limit(6)),
        safe<any>(supabase.from("market_listings")
          .select("id,title,description,price")
          .eq("is_sold", false)
          .or(`title.ilike.${like},description.ilike.${like}`)
          .order("created_at", { ascending: false }).limit(6)),
        safe<any>((supabase.from("library_books" as any) as any)
          .select("id,title,author,category,price_credits,cover_url")
          .or(`title.ilike.${like},author.ilike.${like}`)
          .limit(6)),
      ]);

      const pq = builtInPastQuestions
        .filter((p) =>
          p.title.toLowerCase().includes(term.toLowerCase()) ||
          p.body.toLowerCase().includes(term.toLowerCase()) ||
          (p.course?.code ?? "").toLowerCase().includes(term.toLowerCase())
        )
        .slice(0, 4)
        .map((p) => ({ id: p.id, title: p.title, body: p.body, course: p.course }));

      return { posts, notes: [...pq, ...notes], courses, people, market, books };
    },
  });

  const groups: Group[] = useMemo(() => {
    if (!data) return [];
    const g: Group[] = [];
    if (data.posts.length) g.push({
      key: "posts", label: "Posts", icon: FileText,
      items: data.posts.map((p: any) => ({
        id: p.id, to: "/post/$id", params: { id: p.id },
        title: p.title,
        subtitle: [p.course?.code, p.author?.display_name].filter(Boolean).join(" • ") || p.post_type,
      })),
    });
    if (data.notes.length) g.push({
      key: "notes", label: "Notes & Past Questions", icon: BookOpen,
      items: data.notes.map((n: any) => ({
        id: String(n.id), to: "/notes/$id", params: { id: String(n.id) },
        title: n.title, subtitle: n.course?.code,
      })),
    });
    if (data.courses.length) g.push({
      key: "courses", label: "Courses", icon: GraduationCap,
      items: data.courses.map((c: any) => ({
        id: c.id, to: "/course/$id", params: { id: c.id },
        title: `${c.code} — ${c.title}`,
      })),
    });
    if (data.market.length) g.push({
      key: "market", label: "Market", icon: ShoppingBag,
      items: data.market.map((m: any) => ({
        id: m.id, to: "/market/$id", params: { id: m.id },
        title: m.title, subtitle: `₦${Number(m.price).toLocaleString()}`,
      })),
    });
    if ((data as any).books?.length) g.push({
      key: "books", label: "Book Plug", icon: BookOpen,
      items: (data as any).books.map((b: any) => ({
        id: b.id, to: "/books/read/$id", params: { id: b.id }, title: b.title,
        subtitle: `${b.author ?? ""} • ${b.price_credits} credits`,
      })),
    });
    if (data.people.length) g.push({
      key: "people", label: "People", icon: User,
      items: data.people.map((u: any) => ({
        id: u.id, to: "/profile/$id", params: { id: u.id },
        title: u.display_name, subtitle: u.rank_tier,
      })),
    });
    return g;
  }, [data]);

  const total = groups.reduce((s, g) => s + g.items.length, 0);
  const showPanel = open && debounced.length >= 1;

  const submit = (e?: React.FormEvent | React.KeyboardEvent) => {
    e?.preventDefault?.();
    const term = q.trim();
    if (!term) return;
    setOpen(false);
    // Blur to dismiss mobile keyboard, then navigate
    (document.activeElement as HTMLElement | null)?.blur?.();
    nav({ to: "/search", search: { q: term } });
  };

  return (
    <div ref={rootRef} className="relative w-full">
      <form role="search" onSubmit={submit} className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          name="site-search"
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
          autoFocus={autoFocus}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onKeyDown={(e) => { if (e.key === "Enter") submit(e); if (e.key === "Escape") setOpen(false); }}
          placeholder={placeholder ?? "Search posts, notes, courses, market, people…"}
          className="pl-9 pr-9 rounded-full h-9"
          aria-label="Search the site"
        />
        {q && (
          <button
            type="button"
            onClick={() => { setQ(""); setOpen(false); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted"
            aria-label="Clear search"
          >
            {isFetching ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <X className="w-4 h-4 text-muted-foreground" />}
          </button>
        )}
        {/* Hidden submit so iOS/Android keyboard "search" key always submits the form. */}
        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true">Search</button>
      </form>

      {showPanel && (
        <div className="absolute z-50 left-0 right-0 mt-2 bg-card border rounded-2xl shadow-glow max-h-[70vh] overflow-y-auto animate-fade-in-up">
          {!data && isFetching ? (
            <p className="p-4 text-sm text-muted-foreground inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Searching…
            </p>
          ) : total === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm font-semibold">No matches for "{debounced}"</p>
              <p className="text-xs text-muted-foreground mt-1">Try a course code (CSC 201), an author, or a topic.</p>
            </div>
          ) : (
            <div className="divide-y">
              {groups.map((g) => (
                <div key={g.key} className="py-2">
                  <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider font-bold text-muted-foreground inline-flex items-center gap-1.5">
                    <g.icon className="w-3 h-3" /> {g.label}
                  </div>
                  {g.items.map((it) => (
                    <Link
                      key={`${g.key}-${it.id}`}
                      to={it.to}
                      params={it.params}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-2 px-4 py-2 hover:bg-accent transition"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold line-clamp-1">{it.title}</p>
                        {it.subtitle && <p className="text-xs text-muted-foreground line-clamp-1">{it.subtitle}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              ))}
              <button
                type="button"
                onClick={() => submit()}
                className="w-full text-center text-xs font-semibold py-2.5 text-primary hover:bg-accent"
              >
                See all results for "{debounced}" →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
