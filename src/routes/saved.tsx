import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { Bookmark, BookOpen, FileText, ShoppingBag, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/saved")({ component: SavedPage });

const ICONS: Record<string, any> = {
  post: FileText, book: BookOpen, market: ShoppingBag, past_question: FileText, note: BookOpen,
};

const LINK_FOR: Record<string, (id: string) => { to: any; params: any }> = {
  post: (id) => ({ to: "/post/$id", params: { id } }),
  book: (id) => ({ to: "/books/read/$id", params: { id } }),
  market: (id) => ({ to: "/market/$id", params: { id } }),
  past_question: (id) => ({ to: "/notes/$id", params: { id } }),
  note: (id) => ({ to: "/notes/$id", params: { id } }),
};

function SavedPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  useEffect(() => { if (!loading && !user) nav({ to: "/login", search: { redirect: "/saved" } }); }, [user, loading]);

  const { data, isLoading } = useQuery({
    queryKey: ["saved-items", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("saved_items")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const remove = async (id: string) => {
    const { error } = await supabase.from("saved_items").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Removed from saved"); qc.invalidateQueries({ queryKey: ["saved-items"] }); }
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <header className="mb-5 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
            <Bookmark className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display">Saved items</h1>
            <p className="text-sm text-muted-foreground">Everything you bookmarked, in one place.</p>
          </div>
        </header>

        {isLoading ? (
          <p className="text-sm text-muted-foreground inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>
        ) : !data?.length ? (
          <div className="bg-card border rounded-2xl p-10 text-center">
            <Bookmark className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-semibold">No saved items yet</p>
            <p className="text-sm text-muted-foreground mt-1">Tap the bookmark icon on any post, book, or listing to save it here.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {data.map((s: any) => {
              const Icon = ICONS[s.item_type] ?? FileText;
              const link = LINK_FOR[s.item_type]?.(s.item_id);
              return (
                <li key={s.id} className="bg-card border rounded-2xl p-3 flex items-center gap-3 hover:shadow-card transition">
                  {s.thumb_url ? (
                    <img src={s.thumb_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    {link ? (
                      <Link {...link} className="block">
                        <p className="text-sm font-semibold line-clamp-1">{s.title ?? "Saved item"}</p>
                        {s.subtitle && <p className="text-xs text-muted-foreground line-clamp-1">{s.subtitle}</p>}
                      </Link>
                    ) : (
                      <>
                        <p className="text-sm font-semibold line-clamp-1">{s.title ?? "Saved item"}</p>
                        {s.subtitle && <p className="text-xs text-muted-foreground line-clamp-1">{s.subtitle}</p>}
                      </>
                    )}
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{s.item_type.replace("_", " ")}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(s.id)}
                    className="p-2 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
                    aria-label="Remove saved item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
