import { useState, useRef } from "react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { Coins, FileText, ScanLine, ImageDown, BellOff, Mic2, Mic, Repeat, Youtube, Calculator, Globe2, BookA, Phone, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import * as LucideIcons from "lucide-react";
import { useToolPrices } from "@/lib/tool-prices";

export const Route = createFileRoute("/tools")({ component: ToolsLayout });

type Tool = {
  to: string;
  label: string;
  desc: string;
  icon: typeof FileText;
  cost: number;
  soon?: boolean;
};

const TOOLS: Tool[] = [
  { to: "/tools/pdf", label: "Text → PDF", desc: "Turn your notes into a clean PDF", icon: FileText, cost: 10 },
  { to: "/tools/ocr", label: "Image → Text", desc: "Extract text from a photo or screenshot", icon: ImageDown, cost: 10 },
  { to: "/tools/audio-convert", label: "Audio Converter", desc: "Convert MP3, WAV, AAC, M4A, OGG, Opus, FLAC", icon: Repeat, cost: 0 },
  { to: "/tools/qr", label: "QR / Ticket Scanner", desc: "Validate event tickets", icon: ScanLine, cost: 0 },
  { to: "/tools/vocal-split", label: "Vocal Remover", desc: "AI-powered vocals & instrumental separation", icon: Mic2, cost: 0 },
  { to: "/tools/voice-clone", label: "Voice Cloning", desc: "Clone a voice from a sample or design one from attributes", icon: Mic, cost: 0 },
  { to: "/tools/notif-clean", label: "iPhone Notification Remover", desc: "Detect & notch-out tri-tone alerts in audio", icon: BellOff, cost: 0, soon: true },
  { to: "/tools/youtube", label: "YouTube Downloader", desc: "Save videos & audio from YouTube links", icon: Youtube, cost: 0 },
  { to: "/tools/calculator", label: "Scientific Calculator", desc: "Full scientific calculator powered by Desmos", icon: Calculator, cost: 0 },
  { to: "/tools/planets", label: "Planet Explorer", desc: "Facts & images of the planets, Sun & Moon", icon: Globe2, cost: 0 },
  { to: "/tools/dictionary", label: "Dictionary", desc: "Definitions, pronunciation & examples", icon: BookA, cost: 0 },
  { to: "/tools/vnum1", label: "Virtual Number", desc: "Global virtual numbers with SMS inbox", icon: Phone, cost: 0 },
  { to: "/tools/vnum2", label: "Virtual Number 2", desc: "Global eSIM numbers with SMS verify", icon: Phone, cost: 0 },
  { to: "/tools/vnum3", label: "Virtual Number 3", desc: "Temporary phone numbers for SMS", icon: Phone, cost: 0 },
];

function ToolsLayout() {
  const { profile, user, isAdmin } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const onHub = path === "/tools";

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold font-display">Tools Plug</h1>
            <p className="text-sm text-muted-foreground">Small utilities. Some cost credits.</p>
          </div>
          {user && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/10 to-accent border">
              <Coins className="w-4 h-4 text-primary" />
              {isAdmin ? (
                <span className="text-base font-bold leading-none" title="Unlimited credits (admin)">∞</span>
              ) : (
                <span className="text-sm font-bold">{profile?.credits ?? 0}</span>
              )}
              <span className="text-xs text-muted-foreground">credits</span>
            </div>
          )}
        </header>

        {onHub ? <ToolsHub /> : <Outlet />}
      </div>
    </AppShell>
  );
}

const OTHER_TOOLS = new Set([
  "/tools/vocal-split",
  "/tools/voice-clone",
  "/tools/youtube",
  "/tools/notif-clean",
  "/tools/qr",
  "/tools/audio-convert",
  "/tools/vnum1",
  "/tools/vnum2",
  "/tools/vnum3",
]);


function ToolCard({ t }: { t: Tool }) {
  const inner = (
    <>
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center shrink-0">
        <t.icon className="w-6 h-6 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold font-display truncate">{t.label}</h3>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
            t.soon ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
            : t.cost === 0 ? "bg-success/20 text-success"
            : "bg-muted text-muted-foreground"
          }`}>
            {t.soon ? "SOON" : t.cost === 0 ? "FREE" : `-${t.cost}`}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{t.desc}</p>
      </div>
    </>
  );
  if (t.soon) {
    return (
      <div
        aria-disabled="true"
        className="bg-card border rounded-2xl p-5 shadow-card flex items-start gap-4 opacity-60 cursor-not-allowed h-full"
      >
        {inner}
      </div>
    );
  }
  return (
    <Link
      to={t.to}
      className="group bg-card border rounded-2xl p-5 shadow-card hover:shadow-glow hover:-translate-y-0.5 transition flex items-start gap-4 h-full"
    >
      {inner}
    </Link>
  );
}

function SwipeCarousel({ tools }: { tools: Tool[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const amount = Math.max(280, Math.floor(el.clientWidth * 0.9));
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };
  return (
    <div className="relative">
      <div
        ref={ref}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 -mx-1 px-1"
        style={{ scrollbarWidth: "none" }}
      >
        {tools.map((t) => (
          <div
            key={t.to}
            className="snap-start shrink-0 w-[85%] sm:w-[48%]"
          >
            <ToolCard t={t} />
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 mt-3">
        <button
          onClick={() => scrollBy(-1)}
          aria-label="Previous"
          className="w-9 h-9 rounded-full bg-card border shadow-card flex items-center justify-center hover:bg-accent transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => scrollBy(1)}
          aria-label="Next"
          className="w-9 h-9 rounded-full bg-card border shadow-card flex items-center justify-center hover:bg-accent transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ToolsHub() {
  const [tab, setTab] = useState<"edu" | "other">("edu");
  const eduTools = TOOLS.filter((t) => !OTHER_TOOLS.has(t.to));
  const otherTools = TOOLS.filter((t) => OTHER_TOOLS.has(t.to));
  const list = tab === "edu" ? eduTools : otherTools;
  const { data: aiTools } = useQuery({
    queryKey: ["ai-tools-public", tab],
    queryFn: async () => {
      const { data } = await supabase.from("ai_tools").select("slug,title,description,icon,category,credits_cost").eq("status", "approved").eq("category", tab).order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const { data: priceMap = {} } = useToolPrices();
  const listWithPrices = list.map((t) => ({ ...t, cost: priceMap[t.to] ?? t.cost }));
  return (
    <div className="space-y-5">
      <div className="inline-flex w-full sm:w-auto p-1 rounded-full bg-muted border">
        {([
          { id: "edu", label: "Edu Tools" },
          { id: "other", label: "Other Tools" },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-bold rounded-full transition ${
              tab === t.id ? "bg-background shadow text-foreground" : "text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <SwipeCarousel tools={listWithPrices} />
      {aiTools && aiTools.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="font-bold font-display">AI-built tools</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {aiTools.map((t: any) => {
              const I = (LucideIcons as any)[t.icon] ?? Sparkles;
              return (
                <Link key={t.slug} to="/tools/ai/$slug" params={{ slug: t.slug }}
                  className="group bg-card border rounded-2xl p-4 shadow-card hover:shadow-glow hover:-translate-y-0.5 transition flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center shrink-0">
                    <I className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold font-display truncate">{t.title}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${(t.credits_cost ?? 0) === 0 ? "bg-success/20 text-success" : "bg-primary/15 text-primary"}`}>
                        {(t.credits_cost ?? 0) === 0 ? "FREE · AI" : `-${t.credits_cost} · AI`}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{t.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
