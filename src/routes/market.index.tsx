import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { SaveButton } from "@/components/SaveButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PlusCircle,
  ShoppingBag,
  Search,
  Ticket,
  BookOpen,
  Package,
  QrCode,
  Coins,
  RefreshCw,
} from "lucide-react";
import { EbsuBadge } from "@/components/EbsuBadge";
import { StorageMedia } from "@/components/StorageMedia";
import { getLibraryBooks } from "@/lib/library-books.functions";

export const Route = createFileRoute("/market/")({ component: MarketPage });

const KINDS = [
  {
    key: "tickets",
    label: "Tickets",
    icon: Ticket,
    cta: "I want to sell my Ticket",
    tone: "from-fuchsia-500 to-rose-500",
  },
  {
    key: "products",
    label: "Products",
    icon: Package,
    cta: "I want to sell a Product",
    tone: "from-sky-500 to-indigo-500",
  },
  {
    key: "books",
    label: "Book Plug",
    icon: BookOpen,
    cta: "I want to sell my Book",
    tone: "from-emerald-500 to-teal-500",
  },
] as const;

function MarketPage() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 220);
    return () => clearTimeout(t);
  }, [q]);
  const [kind, setKind] = useState<string>("all");
  const [showSold, setShowSold] = useState(false);
  const [listingLimit, setListingLimit] = useState(30);
  const qc = useQueryClient();
  const getBooksFn = useServerFn(getLibraryBooks);

  const { data: listings, isLoading, isFetching } = useQuery({
    queryKey: ["market", kind, debouncedQ, showSold, listingLimit],
    placeholderData: keepPreviousData,
    enabled: kind !== "books",
    queryFn: async () => {
      let query = supabase
        .from("market_listings")
        .select("*")
        .neq("listing_kind" as any, "advert")
        .order("created_at", { ascending: false })
        .limit(listingLimit);
      if (!showSold) query = query.eq("is_sold", false);
      if (kind !== "all") query = query.eq("listing_kind" as any, kind);
      if (debouncedQ) {
        const like = `%${debouncedQ.replace(/[%,]/g, " ")}%`;
        query = query.or(`title.ilike.${like},description.ilike.${like}`);
      }
      return (await query).data ?? [];
    },
  });
  const canLoadMoreListings = (listings?.length ?? 0) >= listingLimit;

  const { data: books, isLoading: booksLoading } = useQuery({
    queryKey: ["market-books", debouncedQ],
    placeholderData: keepPreviousData,
    enabled: kind === "books" || kind === "all",
    queryFn: () =>
      getBooksFn({
        data: { category: "all", query: debouncedQ, limit: kind === "all" ? 10 : 120 },
      }),
    staleTime: 60_000,
  });

  const { data: tickets, isLoading: ticketsLoading } = useQuery({
    queryKey: ["market-tickets", debouncedQ],
    placeholderData: keepPreviousData,
    enabled: kind === "tickets" || kind === "all",
    queryFn: async () => {
      let query = supabase
        .from("tickets")
        .select("*")
        .eq("is_sold", false)
        .order("created_at", { ascending: false })
        .limit(kind === "all" ? 6 : 60);
      if (debouncedQ) {
        const like = `%${debouncedQ.replace(/[%,]/g, " ")}%`;
        query = query.or(`title.ilike.${like},description.ilike.${like}`);
      }
      return (await query).data ?? [];
    },
  });

  const filtered = listings ?? [];

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="bg-card border rounded-3xl p-6 shadow-card">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold font-display flex items-center gap-2">
                <ShoppingBag className="w-6 h-6 text-primary" />
                Market Plug
              </h1>
              <p className="text-sm text-muted-foreground">
                Buy, sell, and trade with fellow students.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  qc.invalidateQueries({ queryKey: ["market"] });
                  qc.invalidateQueries({ queryKey: ["market-books"] });
                  qc.invalidateQueries({ queryKey: ["market-tickets"] });
                }}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/tools/qr">
                  <QrCode className="w-4 h-4 mr-1" />
                  Ticket Scanner
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
            {KINDS.map(({ key, label, icon: Icon, cta, tone }) => {
              const isTicket = key === "tickets";
              return (
                <div
                  key={key}
                  className={`relative overflow-hidden rounded-2xl p-4 text-white bg-gradient-to-br ${tone} shadow-card flex flex-col`}
                >
                  <div className="absolute top-2 left-2 flex items-center gap-1 z-10">
                    <EbsuBadge size={22} />
                    <span className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full bg-white/95 text-foreground shadow-card">
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <Icon className="w-7 h-7 mb-2 opacity-90 mt-6 self-end" />
                  <div className="font-bold font-display text-base leading-tight">{label}</div>
                  {isTicket ? (
                    <Link to="/tickets" className="text-xs underline opacity-90 mt-1 block">
                      View tickets
                    </Link>
                  ) : key === "books" ? (
                    <Link to="/books" className="text-xs underline opacity-90 mt-1 block">
                      Browse books
                    </Link>
                  ) : (
                    <button
                      onClick={() => setKind(key)}
                      className="text-xs underline opacity-90 mt-1 block text-left"
                    >
                      View listings
                    </button>
                  )}
                  <Button
                    asChild
                    size="sm"
                    variant="secondary"
                    className="mt-3 w-full h-auto whitespace-normal break-words text-[11px] leading-tight py-2 px-2"
                  >
                    {isTicket ? (
                      <Link to="/tickets">{cta}</Link>
                    ) : (
                      <Link to="/market/new" search={{ kind: key } as any}>
                        {cta}
                      </Link>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex gap-2 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search listings…"
                className="pl-9"
              />
            </div>
            <label className="flex items-center gap-2 text-xs px-3 py-2 rounded-full bg-muted cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showSold}
                onChange={(e) => setShowSold(e.target.checked)}
                className="accent-primary"
              />
              Show sold
            </label>
          </div>
          <div className="mt-3 flex gap-2 flex-wrap">
            {["all", ...KINDS.map((k) => k.key)].map((c) => (
              <button
                key={c}
                onClick={() => setKind(c)}
                className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition ${kind === c ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {isLoading && <p className="text-center text-muted-foreground py-8">Loading…</p>}

        {(kind === "all" || kind === "tickets") && (tickets?.length ?? 0) > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Ticket className="w-4 h-4" /> Tickets
              </h2>
              <Link to="/tickets" className="text-xs text-primary hover:underline">
                See all →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(tickets ?? []).map((t: any) => (
                <Link
                  key={t.id}
                  to="/tickets/$id"
                  params={{ id: t.id }}
                  className="bg-card border rounded-2xl overflow-hidden shadow-card hover:shadow-glow transition"
                >
                  <div className="aspect-video bg-muted overflow-hidden">
                    <img
                      src={t.photo_url}
                      alt={t.title}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold line-clamp-1">{t.title}</h3>
                      <span className="text-primary font-bold whitespace-nowrap text-sm">
                        {t.pay_mode === "credits"
                          ? `${t.price} cr`
                          : `₦${Number(t.price).toLocaleString()}`}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {t.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
        {kind === "tickets" && !ticketsLoading && (tickets?.length ?? 0) === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Ticket className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>No tickets for sale right now.</p>
            <Button asChild className="mt-4">
              <Link to="/tickets">
                <Ticket className="w-4 h-4 mr-1" />
                Open ticket marketplace
              </Link>
            </Button>
          </div>
        )}

        {(kind === "all" || kind === "books") && (books?.length ?? 0) > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> Book Plug
              </h2>
              <Link to="/books" className="text-xs text-primary hover:underline">
                See all →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {(books ?? []).map((b: any) => (
                <Link
                  key={b.id}
                  to="/books/read/$id"
                  params={{ id: b.id }}
                  className="bg-card border rounded-2xl overflow-hidden shadow-card hover:shadow-glow transition flex flex-col"
                >
                  <div className="aspect-[2/3] bg-muted overflow-hidden">
                    {b.cover_url ? (
                      <img
                        src={b.cover_url}
                        alt={b.title}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <BookOpen className="w-10 h-10 opacity-40" />
                      </div>
                    )}
                  </div>
                  <div className="p-3 flex flex-col gap-1 flex-1">
                    <h3 className="text-sm font-semibold line-clamp-2 leading-tight">{b.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">{b.author}</p>
                    <div className="flex items-center justify-between text-xs mt-auto pt-1">
                      <span className="capitalize px-2 py-0.5 rounded-full bg-muted">
                        {b.category}
                      </span>
                      <span className="inline-flex items-center gap-1 font-bold text-primary">
                        <Coins className="w-3 h-3" /> {b.price_credits}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
        {kind === "books" ? (
          <>
            {booksLoading && (
              <p className="text-center text-muted-foreground py-8">Loading books…</p>
            )}
            {!booksLoading && (books?.length ?? 0) === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No books yet. Open the Book Plug to fetch from freebookcentre.net.</p>
                <Button asChild className="mt-4">
                  <Link to="/books">
                    <BookOpen className="w-4 h-4 mr-1" />
                    Go to Book Plug
                  </Link>
                </Button>
              </div>
            )}
          </>
        ) : kind === "tickets" ? null : (
          <>
            {!isLoading && filtered.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No listings in this category yet. Be the first!</p>
                <Button asChild className="mt-4">
                  <Link to="/market/new">
                    <PlusCircle className="w-4 h-4 mr-1" />
                    Post a listing
                  </Link>
                </Button>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((l: any) => (
                <Link
                  key={l.id}
                  to="/market/$id"
                  params={{ id: l.id }}
                  className="relative bg-card border rounded-2xl p-4 shadow-card hover:shadow-glow transition group"
                >
                  <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
                    <EbsuBadge size={22} />
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-card/95 backdrop-blur border text-[10px] font-bold uppercase tracking-wider text-primary shadow-card">
                      {l.listing_kind ?? "product"}
                    </span>
                  </div>
                  <SaveButton
                    itemType="market"
                    itemId={l.id}
                    title={l.title}
                    subtitle={l.category}
                    thumbUrl={l.photos?.[0] ?? null}
                    className="absolute top-2 right-2 z-10"
                  />
                  {l.photos?.[0] && (
                    <StorageMedia
                      url={l.photos[0]}
                      alt={l.title}
                      className="w-full h-40 object-cover rounded-xl mb-3 mt-4"
                    />
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold group-hover:text-primary break-words flex-1 min-w-0">
                      {l.title}
                    </h3>
                    <span className="text-primary font-bold whitespace-nowrap">
                      ₦{Number(l.price).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 break-words">
                    {l.description}
                  </p>
                  <div className="flex gap-2 mt-2 text-xs items-center flex-wrap">
                    <span className="px-2 py-0.5 rounded-full bg-muted break-words">
                      {l.category}
                    </span>
                    {l.location && (
                      <span className="text-muted-foreground break-words">📍 {l.location}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
            {canLoadMoreListings && filtered.length > 0 && (
              <div className="pt-2">
                <button
                  onClick={() => setListingLimit((n) => n + 30)}
                  disabled={isFetching}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-muted hover:bg-muted/80 text-sm font-semibold disabled:opacity-50"
                >
                  {isFetching ? "Loading…" : "Load more listings"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
