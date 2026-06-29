import { useEffect, useRef, useState, type ReactNode } from "react";

import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { Sparkles, Crown, Upload, GamepadIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { resolveBannerUrls } from "@/lib/banner-url";

type Layout = "image-bg" | "image-left" | "image-right" | "image-top" | "text-only" | "split";

type Slide = {
  id?: string;
  badge: string;
  title: string;
  body: string;
  cta?: { label: string; to: string };
  icon: ReactNode;
  gradient: string;
  imageUrl?: string;
  layout?: Layout;
  accent?: string | null;
  variant?: "auto" | "light" | "dark";
};

const defaultSlides: Slide[] = [
  {
    badge: "EBSU Student Hub",
    title: "Pass with flying colours.",
    body: "Past questions, assignments & notes — built by students, for students.",
    cta: { label: "Get started — it's free", to: "/login" },
    icon: <Sparkles className="w-3 h-3" />,
    gradient: "bg-hero",
  },
  {
    badge: "Rank up",
    title: "From Newbie to Pro",
    body: "Post 10 contents to climb each step. 5 tiers, 25 steps.",
    cta: { label: "View your rank", to: "/me" },
    icon: <Crown className="w-3 h-3" />,
    gradient: "bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500",
  },
  {
    badge: "Share & earn",
    title: "Drop a past question.",
    body: "Type it out or upload the PDF — your coursemates will thank you.",
    cta: { label: "Post material", to: "/post/new" },
    icon: <Upload className="w-3 h-3" />,
    gradient: "bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600",
  },
  {
    badge: "Break time",
    title: "Mini games & quizzes",
    body: "Puzzles, crossword & MCQs after every course past question.",
    cta: { label: "Play now", to: "/games" },
    icon: <GamepadIcon className="w-3 h-3" />,
    gradient: "bg-gradient-to-br from-fuchsia-500 via-purple-600 to-indigo-700",
  },
];

/** Fire-and-forget analytics. Failures swallow silently. */
function logBannerEvent(bannerId: string | undefined, kind: "impression" | "click") {
  if (!bannerId) return;
  supabase.from("banner_events").insert({ banner_id: bannerId, kind }).then(() => {}, () => {});
}

export function HeroCarousel() {
  const { data: admin } = useQuery({
    queryKey: ["home-banners"],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const rows = (await supabase
        .from("banner_slides")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })).data ?? [];
      // Filter publish_at / expire_at client-side (columns may be missing on old rows)
      const live = (rows as any[]).filter((r) => {
        if (r.publish_at && r.publish_at > nowIso) return false;
        if (r.expire_at && r.expire_at <= nowIso) return false;
        return true;
      });
      const resolved = await resolveBannerUrls(live as any[]);
      if (typeof window !== "undefined") {
        resolved.forEach((b: any) => {
          if (b.image_url) {
            const img = new Image();
            img.src = b.image_url;
          }
        });
      }
      return resolved;
    },
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });

  const adminSlides: Slide[] = (admin ?? []).map((b: any) => ({
    id: b.id,
    badge: "Featured",
    title: b.title,
    body: b.subtitle ?? "",
    cta: b.link_url ? { label: b.cta_label?.trim() || "Open", to: b.link_url } : undefined,
    icon: <Sparkles className="w-3 h-3" />,
    gradient: "bg-gradient-to-br from-slate-900 via-slate-800 to-black",
    imageUrl: b.image_url,
    layout: (b.layout ?? "image-bg") as Layout,
    accent: b.accent ?? null,
    variant: (b.variant ?? "auto") as Slide["variant"],
  }));

  const slides = [...adminSlides, ...defaultSlides];

  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const startX = useRef<number | null>(null);
  const dx = useRef(0);
  const [drag, setDrag] = useState(0);
  const impressionLogged = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setI((v) => (v + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [paused, slides.length]);

  // Log impression when a slide becomes the active one
  useEffect(() => {
    const slide = slides[i];
    if (slide?.id && !impressionLogged.current.has(slide.id)) {
      impressionLogged.current.add(slide.id);
      logBannerEvent(slide.id, "impression");
    }
  }, [i, slides]);

  const onStart = (x: number) => { startX.current = x; setPaused(true); };
  const onMove = (x: number) => {
    if (startX.current == null) return;
    dx.current = x - startX.current;
    setDrag(dx.current);
  };
  const onEnd = () => {
    if (Math.abs(dx.current) > 60) {
      setI((v) => (v + (dx.current < 0 ? 1 : slides.length - 1)) % slides.length);
    }
    startX.current = null; dx.current = 0; setDrag(0);
    setTimeout(() => setPaused(false), 4000);
  };

  return (
    <section
      className="relative overflow-hidden rounded-3xl mb-6 select-none touch-pan-y min-h-[320px] aspect-[4/5] sm:aspect-[16/8] sm:min-h-0 md:aspect-[16/6]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => { setPaused(false); onEnd(); }}
      onTouchStart={(e) => onStart(e.touches[0].clientX)}
      onTouchMove={(e) => onMove(e.touches[0].clientX)}
      onTouchEnd={onEnd}
      onMouseDown={(e) => onStart(e.clientX)}
      onMouseMove={(e) => startX.current != null && onMove(e.clientX)}
      onMouseUp={onEnd}
    >
      <div
        className="flex h-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(calc(${-i * 100}% + ${drag}px))`, transitionDuration: drag ? "0ms" : "500ms" }}
      >
        {slides.map((s, idx) => (
          <SlideView
            key={s.id ?? `default-${idx}`}
            slide={s}
            eager={idx === 0}
            stopDragClick={(e) => {
              if (Math.abs(dx.current) > 10) { e.preventDefault(); e.stopPropagation(); }
              else if (s.id) logBannerEvent(s.id, "click");
            }}
          />
        ))}
      </div>

      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 z-10">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setI(idx)}
            aria-label={`Slide ${idx + 1}`}
            className={`h-1.5 rounded-full transition-all ${idx === i ? "w-8 bg-white" : "w-1.5 bg-white/50"}`}
          />
        ))}
      </div>
    </section>
  );
}

function SlideView({
  slide: s,
  eager,
  stopDragClick,
}: {
  slide: Slide;
  eager: boolean;
  stopDragClick: (e: React.MouseEvent) => void;
}) {
  const layout: Layout = s.layout ?? "image-bg";
  const variant = s.variant ?? "auto";
  const textColor = variant === "dark" ? "text-slate-900" : "text-white";
  const accentStyle = s.accent ? { backgroundColor: s.accent } : undefined;
  const accentGradient = s.accent
    ? { background: `linear-gradient(135deg, ${s.accent}, #0f172a)` }
    : undefined;
  const isExternal = s.cta?.to ? /^https?:\/\//i.test(s.cta.to) : false;
  const wrapperClass = `absolute inset-0 z-20 block ${s.cta ? "cursor-pointer" : ""}`;

  const Badge = (
    <span className={`inline-flex items-center gap-1 text-[11px] md:text-xs font-bold ${variant === "dark" ? "bg-black/10" : "bg-white/15"} px-3 py-1 rounded-full backdrop-blur w-fit`}>
      {s.icon}{s.badge}
    </span>
  );

  const Cta = s.cta ? (
    <span
      className="mt-4 w-fit inline-flex items-center justify-center rounded-md h-11 px-8 text-base font-medium shadow-md"
      style={s.accent ? { backgroundColor: s.accent, color: variant === "dark" ? "#0f172a" : "#fff" } : undefined}
    >
      {s.cta.label}
    </span>
  ) : null;

  const TextBlock = (
    <div className={`flex flex-col justify-end h-full p-5 md:p-10 ${textColor} ${layout === "image-top" || layout === "text-only" ? "justify-center" : ""}`}>
      {Badge}
      <h2 className="mt-3 text-xl sm:text-2xl md:text-5xl font-bold leading-tight font-display drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">{s.title}</h2>
      {s.body && <p className="mt-2 text-sm md:text-lg opacity-95 drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)] line-clamp-3">{s.body}</p>}
      {Cta}
    </div>
  );

  const Img = (extraClass = "") => s.imageUrl ? (
    <img
      src={s.imageUrl}
      alt={s.title}
      className={`w-full h-full object-cover ${extraClass}`}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      decoding="async"
      draggable={false}
    />
  ) : null;

  let body: ReactNode;
  if (layout === "image-bg" && s.imageUrl) {
    body = (
      <>
        <div className="absolute inset-0">{Img("absolute inset-0")}</div>
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/75 via-black/30 to-transparent z-10" />
        <div className="relative z-10 h-full">{TextBlock}</div>
      </>
    );
  } else if (layout === "image-top" && s.imageUrl) {
    body = (
      <div className="absolute inset-0 flex flex-col">
        <div className="flex-1 relative overflow-hidden">{Img()}</div>
        <div className="flex-1 relative" style={accentGradient ?? { backgroundColor: "rgb(15 23 42)" }}>{TextBlock}</div>
      </div>
    );
  } else if (layout === "image-left" && s.imageUrl) {
    body = (
      <div className="absolute inset-0 flex">
        <div className="w-2/5 relative overflow-hidden">{Img()}</div>
        <div className="flex-1 relative" style={accentGradient ?? { backgroundColor: "rgb(15 23 42)" }}>{TextBlock}</div>
      </div>
    );
  } else if (layout === "image-right" && s.imageUrl) {
    body = (
      <div className="absolute inset-0 flex">
        <div className="flex-1 relative" style={accentGradient ?? { backgroundColor: "rgb(15 23 42)" }}>{TextBlock}</div>
        <div className="w-2/5 relative overflow-hidden">{Img()}</div>
      </div>
    );
  } else if (layout === "split" && s.imageUrl) {
    body = (
      <>
        <div className="absolute inset-0">{Img("absolute inset-0")}</div>
        <div className="absolute inset-0" style={{ background: s.accent ? `linear-gradient(110deg, ${s.accent} 50%, transparent 70%)` : "linear-gradient(110deg, rgba(15,23,42,0.92) 50%, transparent 70%)" }} />
        <div className="relative z-10 h-full w-1/2">{TextBlock}</div>
      </>
    );
  } else {
    // text-only or fallback when no image
    body = (
      <div className="absolute inset-0" style={accentGradient}>
        {!accentGradient && <div className={`absolute inset-0 ${s.gradient}`} />}
        <div className="relative z-10 h-full">{TextBlock}</div>
        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      </div>
    );
  }

  return (
    <div className="shrink-0 w-full h-full bg-black text-white relative overflow-hidden">
      {body}
      {s.cta && (
        isExternal ? (
          <a href={s.cta.to} target="_blank" rel="noreferrer" className={wrapperClass} onClick={stopDragClick} aria-label={s.cta.label} />
        ) : (
          <Link to={s.cta.to as any} className={wrapperClass} onClick={stopDragClick} aria-label={s.cta.label} />
        )
      )}
    </div>
  );
}
