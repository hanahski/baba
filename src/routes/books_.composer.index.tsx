import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Loader2,
  Plus,
  Feather,
  GraduationCap,
  Sparkles,
  BookMarked,
} from "lucide-react";
import { toast } from "sonner";
import { BookCover } from "@/components/BookCover";
import { useIsAdmin } from "@/lib/admin-ids";

export const Route = createFileRoute("/books_/composer/")({ component: ComposerListPage });

const TYPES = [
  { key: "novel", label: "Novel", icon: BookOpen, hint: "Long-form fiction" },
  {
    key: "course",
    label: "Course / Textbook",
    icon: GraduationCap,
    hint: "Lessons & study material",
  },
  { key: "poetry", label: "Poetry", icon: Feather, hint: "Stanzas, free verse" },
  { key: "comics", label: "Comics / Illustrated", icon: Sparkles, hint: "Image-heavy story" },
] as const;

function ComposerListPage() {
  const qc = useQueryClient();
  const [showPicker, setShowPicker] = useState(false);

  const { data: me } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });
  const isAdmin = useIsAdmin(me?.id);
  const { data: myProfile } = useQuery({
    queryKey: ["my-star-badge", me?.id],
    enabled: !!me?.id,
    queryFn: async () => (await supabase.from("profiles").select("is_star").eq("id", me!.id).maybeSingle()).data,
  });
  const canCompose = isAdmin || !!myProfile?.is_star;

  const { data: books, isLoading } = useQuery({
    queryKey: ["my-user-books", me?.id],
    enabled: !!me?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_books")
        .select("*")
        .eq("author_id", me?.id ?? "")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async (book_type: string) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sign in to start writing");
      if (!canCompose) throw new Error("You need the Star badge to compose books. Apply for it from the special-badge form.");
      const { data, error } = await supabase
        .from("user_books")
        .insert({ author_id: u.user.id, book_type, title: "Untitled" })
        .select("id")
        .single();
      if (error) throw error;
      const { error: chapterError } = await supabase
        .from("user_book_chapters")
        .insert({ book_id: data.id, idx: 0, title: "Chapter 1", content: "" });
      if (chapterError) {
        await supabase.from("user_books").delete().eq("id", data.id);
        throw chapterError;
      }
      return data.id as string;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["my-user-books"] });
      setShowPicker(false);
      void qc.invalidateQueries({ queryKey: ["composer-chapters", id] });
      window.location.href = `/books/composer/${id}`;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="bg-card border rounded-3xl p-6 shadow-card">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold font-display flex items-center gap-2">
                <BookMarked className="w-6 h-6 text-primary" /> Book Composer
              </h1>
              <p className="text-sm text-muted-foreground max-w-md">
                Write your novel, course, poetry or comic right here. Autosaves as you type —
                publish to Book Plug when ready.
              </p>
            </div>
            <Button
              onClick={() => {
                if (!canCompose) {
                  toast.error("You need the Star badge to compose books.");
                  window.location.href = "/apply-badge";
                  return;
                }
                setShowPicker((s) => !s);
              }}
              className="bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground"
            >
              <Plus className="w-4 h-4 mr-1" /> Start writing
            </Button>
          </div>

          {showPicker && (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {TYPES.map((t) => (
                <button
                  key={t.key}
                  disabled={create.isPending}
                  onClick={() => create.mutate(t.key)}
                  className="text-left border rounded-2xl p-4 hover:border-primary hover:bg-primary/5 transition disabled:opacity-60"
                >
                  <t.icon className="w-6 h-6 text-primary mb-2" />
                  <div className="font-semibold text-sm">{t.label}</div>
                  <div className="text-xs text-muted-foreground">{t.hint}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {me && !canCompose && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-sm">
            <p className="font-semibold">⭐ Star badge required to compose books.</p>
            <p className="text-muted-foreground text-xs mt-1">
              Apply for the Star badge to unlock the book composer.
            </p>
            <Button asChild size="sm" className="mt-2">
              <Link to="/apply-badge">Apply for Star badge</Link>
            </Button>
          </div>
        )}

        {!me && (
          <div className="text-center py-16 bg-card border rounded-2xl">
            <p className="text-sm text-muted-foreground">Sign in to start writing.</p>
            <Button asChild className="mt-3">
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        )}

        {me && isLoading && (
          <p className="text-center text-muted-foreground py-8">
            <Loader2 className="w-5 h-5 inline animate-spin" /> Loading…
          </p>
        )}

        {me && !isLoading && (books?.length ?? 0) === 0 && (
          <div className="text-center py-16 bg-card border rounded-2xl">
            <Feather className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm text-muted-foreground">
              No drafts yet. Tap <strong>Start writing</strong> above.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(books ?? []).map((b: any) => (
            <Link
              key={b.id}
              to="/books/composer/$bookId"
              params={{ bookId: b.id }}
              className="flex gap-3 bg-card border rounded-2xl p-3 hover:border-primary transition"
            >
              <div className="w-16 h-24 bg-muted rounded-lg overflow-hidden shrink-0">
                <BookCover title={b.title} src={b.cover_url} className="h-full w-full" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm line-clamp-2">{b.title}</div>
                <div className="text-xs text-muted-foreground capitalize">{b.book_type}</div>
                <div className="mt-2 flex gap-2 items-center text-xs">
                  <span
                    className={`px-2 py-0.5 rounded-full ${b.status === "published" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-muted"}`}
                  >
                    {b.status}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(b.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <Link to="/books" className="text-xs text-muted-foreground hover:text-primary">
            ← Back to Book Plug
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
