import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { purchaseLibraryBook } from "@/lib/library-purchase.functions";
import { getLibraryBooks } from "@/lib/library-books.functions";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { BookOpen, Loader2, Coins, Check, PlusCircle, Feather } from "lucide-react";
import { toast } from "sonner";
import { SaveButton } from "@/components/SaveButton";
import { BookCover } from "@/components/BookCover";

export const Route = createFileRoute("/books")({ component: BooksPage });

const CATS = [
  { key: "all", label: "All" },
  { key: "novel", label: "Novel" },
  { key: "book", label: "Book" },
  { key: "comics", label: "Comics" },
  { key: "poetry", label: "Poetry" },
] as const;

function BooksPage() {
  const [cat, setCat] = useState<string>("all");
  const [q, setQ] = useState("");
  const qc = useQueryClient();
  const purchaseFn = useServerFn(purchaseLibraryBook);
  const getBooksFn = useServerFn(getLibraryBooks);

  const {
    data: books,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["library-books", cat, q],
    placeholderData: keepPreviousData,
    queryFn: () =>
      getBooksFn({
        data: {
          category: cat as "all" | "novel" | "book" | "comics" | "poetry",
          query: q,
          limit: 120,
        },
      }),
    staleTime: 60_000,
  });

  const { data: owned } = useQuery({
    queryKey: ["library-owned"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return new Set<string>();
      const { data } = await supabase
        .from("library_book_purchases")
        .select("book_id")
        .eq("user_id", u.user.id);
      return new Set((data ?? []).map((r: any) => r.book_id));
    },
  });

  const buy = useMutation({
    mutationFn: async (book_id: string) => {
      return await purchaseFn({ data: { bookId: book_id } });
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["library-owned"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
      if (data?.already_owned) toast.success("You already own this book");
      else toast.success("Unlocked! Open it to read.");
    },
    onError: (e: any) => {
      const msg = e?.message ?? "Purchase failed";
      if (msg.includes("INSUFFICIENT_CREDITS"))
        toast.error("Not enough credits", {
          action: { label: "Get credits", onClick: () => window.location.assign("/get-credits") },
        });
      else if (msg.includes("Not authenticated")) toast.error("Sign in to buy books");
      else toast.error(msg);
    },
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="bg-card border rounded-3xl p-6 shadow-card">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold font-display flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-primary" /> Book Plug
              </h1>
              <p className="text-sm text-muted-foreground">
                Complete downloadable books from FreeBookCentre, plus books written by the community
              </p>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                asChild
                className="bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground hover:opacity-90"
              >
                <Link to="/books/composer">
                  <Feather className="w-4 h-4 mr-1" /> Write a book
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to="/market/new" search={{ kind: "books" } as any}>
                  <PlusCircle className="w-4 h-4 mr-1" /> Sell a book
                </Link>
              </Button>
            </div>
          </div>

          <input
            type="search"
            name="book-library-search"
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
            placeholder="Search title or author…"
            className="mt-4 w-full h-10 px-4 rounded-full border bg-background"
          />

          <div className="mt-3 flex gap-2 flex-wrap">
            {CATS.map((c) => (
              <button
                key={c.key}
                onClick={() => setCat(c.key)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${cat === c.key ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading && (
          <p className="text-center text-muted-foreground py-8">
            <Loader2 className="w-5 h-5 inline animate-spin" /> Loading books…
          </p>
        )}

        {!isLoading && (books?.length ?? 0) === 0 && (
          <div className="text-center py-16 text-muted-foreground bg-card border rounded-2xl">
            <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>No books yet in this category.</p>
            <Button className="mt-4" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {(books ?? []).map((b: any) => {
            const isOwned = owned?.has(b.id);
            return (
              <div
                key={b.id}
                className="relative bg-card border rounded-2xl overflow-hidden shadow-card flex flex-col"
              >
                <SaveButton
                  itemType="book"
                  itemId={b.id}
                  title={b.title}
                  subtitle={b.author}
                  thumbUrl={b.cover_url}
                  className="absolute top-2 right-2 z-10"
                />
                <Link to="/books/read/$id" params={{ id: b.id }} className="block">
                  <div className="aspect-[2/3] bg-muted overflow-hidden">
                    <BookCover
                      title={b.title}
                      author={b.author}
                      src={b.cover_url}
                      className="h-full w-full"
                      imageClassName="hover:scale-105 transition-transform"
                    />
                  </div>
                </Link>
                <div className="p-3 flex flex-col gap-2 flex-1">
                  <Link
                    to="/books/read/$id"
                    params={{ id: b.id }}
                    className="hover:text-primary transition-colors"
                  >
                    <h3 className="text-sm font-semibold line-clamp-2 leading-tight">{b.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">{b.author}</p>
                  </Link>
                  <div className="flex items-center justify-between text-xs mt-auto">
                    <span className="capitalize px-2 py-0.5 rounded-full bg-muted">
                      {b.category}
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-primary">
                      <Coins className="w-3 h-3" /> {b.price_credits}
                    </span>
                  </div>
                  {isOwned ? (
                    <Button size="sm" variant="secondary" asChild className="w-full">
                      <Link to="/books/read/$id" params={{ id: b.id }}>
                        <Check className="w-3.5 h-3.5 mr-1" /> Read
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={buy.isPending && buy.variables === b.id}
                      onClick={() => buy.mutate(b.id)}
                      className="w-full"
                    >
                      {buy.isPending && buy.variables === b.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <Coins className="w-3.5 h-3.5 mr-1" /> Unlock
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center">
          <Link to="/market" className="text-xs text-muted-foreground hover:text-primary">
            ← Back to Market
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
