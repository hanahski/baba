import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, RefreshCw, Globe2, X, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tools/planets")({
  component: PlanetsPage,
  head: () => ({
    meta: [
      { title: "Planet Explorer — Solar System Facts & Images" },
      { name: "description", content: "Discover surprising facts and stunning images for every planet — plus the Sun and Moon — powered by Bootprint." },
      { property: "og:title", content: "Planet Explorer — Solar System Facts" },
      { property: "og:description", content: "Facts and images for every planet, the Sun and the Moon." },
      { property: "og:url", content: "/tools/planets" },
    ],
    links: [{ rel: "canonical", href: "/tools/planets" }],
  }),
});

type PlanetKey = "mercury" | "venus" | "earth" | "mars" | "jupiter" | "saturn" | "uranus" | "neptune" | "pluto" | "sun" | "moon";

const PLANETS: { key: PlanetKey; label: string; emoji: string }[] = [
  { key: "mercury", label: "Mercury", emoji: "☿" },
  { key: "venus",   label: "Venus",   emoji: "♀" },
  { key: "earth",   label: "Earth",   emoji: "🌍" },
  { key: "mars",    label: "Mars",    emoji: "♂" },
  { key: "jupiter", label: "Jupiter", emoji: "♃" },
  { key: "saturn",  label: "Saturn",  emoji: "♄" },
  { key: "uranus",  label: "Uranus",  emoji: "♅" },
  { key: "neptune", label: "Neptune", emoji: "♆" },
  { key: "pluto",   label: "Pluto",   emoji: "♇" },
  { key: "sun",     label: "Sun",     emoji: "☀" },
  { key: "moon",    label: "Moon",    emoji: "🌙" },
];

type ApiResp = { object: string; image: string; fact: string };

function PlanetsPage() {
  const [selected, setSelected] = useState<PlanetKey | "random">("mars");
  const [data, setData] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<"closed" | "open" | "full">("closed");

  useEffect(() => {
    if (lightbox === "closed") return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLightbox("closed"); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [lightbox]);

  const fetchOne = async (which: PlanetKey | "random") => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bootprint?object=${which}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed");
      setData(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOne(selected); /* eslint-disable-line */ }, []);

  const onPick = (k: PlanetKey | "random") => {
    setSelected(k);
    fetchOne(k);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-primary" />
            Planet Explorer
          </h2>
          <p className="text-sm text-muted-foreground">A fact and image from across the solar system.</p>
        </div>
        <button
          onClick={() => onPick("random")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground text-xs font-bold shadow-card hover:shadow-glow transition"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Surprise me
        </button>
      </div>

      {/* Planet chip picker */}
      <div className="flex flex-wrap gap-2">
        {PLANETS.map((p) => {
          const isActive = selected === p.key;
          return (
            <button
              key={p.key}
              onClick={() => onPick(p.key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold border transition",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-card"
                  : "bg-card text-foreground border-border hover:bg-muted",
              )}
            >
              <span className="mr-1">{p.emoji}</span>
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Card */}
      <div className="bg-card border rounded-3xl shadow-card overflow-hidden">
        <button
          type="button"
          onClick={() => data?.image && setLightbox("open")}
          className="relative aspect-square sm:aspect-[4/3] w-full bg-gradient-to-br from-muted to-background block group"
          aria-label="View image"
        >
          {data?.image ? (
            <>
              <img
                src={data.image}
                alt={data.object}
                className={cn("w-full h-full object-cover transition-opacity", loading && "opacity-50")}
                loading="lazy"
              />
              <span className="absolute bottom-2 right-2 bg-black/55 text-white text-[10px] px-2 py-1 rounded-full inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                <Maximize2 className="w-3 h-3" /> Tap to view
              </span>
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
              {loading ? "Loading…" : "—"}
            </div>
          )}
        </button>
        <div className="p-6 space-y-4">
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-2xl font-bold font-display capitalize">{data?.object ?? "…"}</h3>
                <button
                  onClick={() => onPick(selected)}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition disabled:opacity-50"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                  New fact
                </button>
              </div>
              <p className="text-base text-foreground/90 leading-relaxed min-h-[4em]">
                {data?.fact ?? (loading ? "Fetching the cosmos…" : "")}
              </p>
            </>
          )}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground text-center">
        Data & images courtesy of <a href="https://bootprint.space" target="_blank" rel="noreferrer" className="underline">Bootprint</a>.
      </p>
      <p className="text-[11px] text-muted-foreground text-center">
        Data & images courtesy of <a href="https://bootprint.space" target="_blank" rel="noreferrer" className="underline">Bootprint</a>.
      </p>

      {lightbox !== "closed" && data?.image && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setLightbox(lightbox === "open" ? "full" : "closed")}
        >
          <img
            src={data.image}
            alt={data.object}
            className={cn(
              "select-none transition-all duration-300",
              lightbox === "open"
                ? "max-w-full max-h-full object-contain rounded-xl"
                : "w-screen h-screen object-cover",
            )}
            draggable={false}
          />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLightbox("closed"); }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center backdrop-blur"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <p className="absolute bottom-5 left-0 right-0 text-center text-white/80 text-xs pointer-events-none">
            {lightbox === "open" ? "Tap again for full screen • Esc to close" : "Tap to close"}
          </p>
        </div>
      )}
    </div>
  );
}
