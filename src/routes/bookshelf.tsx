import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { Library, BookOpen, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/bookshelf")({
  head: () => ({
    meta: [
      { title: "My Bookshelf — Books you own on StudentsPlug" },
      { name: "description", content: "Your private bookshelf on StudentsPlug — every novel and textbook you've unlocked, organised and ready to read on any device." },
      { property: "og:title", content: "My Bookshelf — StudentsPlug" },
      { property: "og:description", content: "Every novel and textbook you've unlocked on StudentsPlug, ready to read." },
      { property: "og:url", content: "/bookshelf" },
    ],
    links: [{ rel: "canonical", href: "/bookshelf" }],
  }),
  component: BookshelfPage,
});

function BookshelfPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (!loading && !user) nav({ to: "/login", search: { redirect: "/bookshelf" } });
  }, [user, loading]);

  const { data, isLoading } = useQuery({
    queryKey: ["bookshelf", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: purchases } = await supabase
        .from("library_book_purchases")
        .select("book_id, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      const ids = (purchases ?? []).map((p: any) => p.book_id);
      if (!ids.length) return [];
      const { data: books } = await supabase.from("library_books").select("*").in("id", ids);
      const byId = new Map((books ?? []).map((b: any) => [b.id, b]));
      return ids.map((id) => byId.get(id)).filter(Boolean);
    },
  });

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <header className="mb-5 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
            <Library className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display">My Bookshelf</h1>
            <p className="text-sm text-muted-foreground">Every book you've unlocked, ready to read.</p>
          </div>
        </header>

        {isLoading ? (
          <p className="text-sm text-muted-foreground inline-flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </p>
        ) : !data?.length ? (
          <div className="bg-card border rounded-2xl p-10 text-center">
            <BookOpen className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-semibold">No books yet</p>
            <p className="text-sm text-muted-foreground mt-1">Unlock books from Book Plug and they'll show up here.</p>
            <Button asChild className="mt-4"><Link to="/books">Browse Book Plug</Link></Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.map((b: any) => (
              <div key={b.id} className="bg-card border rounded-2xl overflow-hidden shadow-card flex flex-col">
                <Link to="/books/read/$id" params={{ id: b.id }} className="block">
                  <div className="aspect-[2/3] bg-muted overflow-hidden">
                    {b.cover_url ? (
                      <img src={b.cover_url} alt={b.title} loading="lazy" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <BookOpen className="w-10 h-10 opacity-40" />
                      </div>
                    )}
                  </div>
                </Link>
                <div className="p-3 flex flex-col gap-2 flex-1">
                  <Link to="/books/read/$id" params={{ id: b.id }} className="hover:text-primary transition-colors">
                    <h3 className="text-sm font-semibold line-clamp-2 leading-tight">{b.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">{b.author}</p>
                  </Link>
                  <Button size="sm" variant="secondary" asChild className="w-full mt-auto">
                    <Link to="/books/read/$id" params={{ id: b.id }}>
                      <Check className="w-3.5 h-3.5 mr-1" /> Read
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
