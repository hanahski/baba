import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Gamepad2, Loader2, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/games/freegames")({ component: FreeGamesPage });

type Game = {
  id: number;
  title: string;
  thumbnail: string;
  short_description: string;
  game_url: string;
  genre: string;
  platform: string;
  publisher: string;
};

const CATEGORIES = [
  { id: "", label: "All" },
  { id: "shooter", label: "Shooter" },
  { id: "mmorpg", label: "MMORPG" },
  { id: "strategy", label: "Strategy" },
  { id: "moba", label: "MOBA" },
  { id: "racing", label: "Racing" },
  { id: "sports", label: "Sports" },
  { id: "card", label: "Card" },
  { id: "fighting", label: "Fighting" },
];

function FreeGamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ sortBy: "popularity" });
    if (category) params.set("category", category);
    fetch(`/api/freegames?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        if (Array.isArray(data)) setGames(data);
        else setError(data?.error || "Could not load games");
      })
      .catch(() => active && setError("Could not load games"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [category]);

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <Gamepad2 className="w-6 h-6 text-primary" /> Free Games
        </h1>
        <p className="text-sm text-muted-foreground">Hundreds of free-to-play games. Tap to play.</p>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 -mx-1 px-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-bold border transition ${
              category === c.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive py-8 text-center">{error}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map((g) => (
            <a
              key={g.id}
              href={g.game_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-card border rounded-2xl overflow-hidden shadow-card hover:shadow-glow hover:-translate-y-0.5 transition"
            >
              <div className="aspect-video overflow-hidden bg-muted">
                <img
                  src={g.thumbnail}
                  alt={g.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold font-display truncate group-hover:text-primary">{g.title}</h3>
                  <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{g.short_description}</p>
                <div className="flex gap-2 mt-3">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {g.genre}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {g.platform}
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
