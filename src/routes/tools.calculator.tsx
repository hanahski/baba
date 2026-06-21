import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Calculator as CalcIcon, Shapes, LineChart, Box } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tools/calculator")({
  component: CalculatorPage,
  head: () => ({
    meta: [
      { title: "Calculators — Scientific, Graphing, Geometry & 3D" },
      { name: "description", content: "Four powerful Desmos calculators in one place: scientific, graphing, geometry, and 3D." },
    ],
  }),
});

declare global {
  interface Window {
    Desmos?: any;
  }
}

const DESMOS_SRC = "https://www.desmos.com/api/v1.12/calculator.js?apiKey=96102300048b4ec7a21e8ffa1b5e41a0";

function loadDesmos(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.Desmos) return Promise.resolve(window.Desmos);
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${DESMOS_SRC}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(window.Desmos));
      existing.addEventListener("error", () => reject(new Error("Failed to load Desmos")));
    });
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = DESMOS_SRC;
    s.async = true;
    s.onload = () => resolve(window.Desmos);
    s.onerror = () => reject(new Error("Failed to load Desmos"));
    document.head.appendChild(s);
  });
}

type Mode = "scientific" | "graphing" | "geometry" | "3d";

const MODES: { key: Mode; label: string; short: string; icon: typeof CalcIcon; desc: string }[] = [
  { key: "scientific", label: "Scientific", short: "Sci", icon: CalcIcon, desc: "Trig, logs, roots, factorials" },
  { key: "graphing",   label: "Graphing",   short: "Graph", icon: LineChart, desc: "Plot functions, sliders, tables" },
  { key: "geometry",   label: "Geometry",   short: "Geo", icon: Shapes, desc: "Construct points, lines, circles" },
  { key: "3d",         label: "3D",          short: "3D", icon: Box, desc: "Surfaces and curves in 3D" },
];

function CalcFrame({ mode }: { mode: Mode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const calcRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadDesmos()
      .then((Desmos) => {
        if (cancelled || !containerRef.current) return;
        const factory =
          mode === "scientific" ? Desmos.ScientificCalculator
          : mode === "graphing" ? Desmos.GraphingCalculator
          : mode === "geometry" ? Desmos.Geometry
          : Desmos.Calculator3D;
        if (typeof factory !== "function") {
          setError("This calculator isn't available in your Desmos API plan.");
          setLoading(false);
          return;
        }
        calcRef.current = factory(containerRef.current);
        setLoading(false);
      })
      .catch((e) => {
        setError(e?.message ?? "Failed to load");
        setLoading(false);
      });
    return () => {
      cancelled = true;
      try { calcRef.current?.destroy?.(); } catch {}
      calcRef.current = null;
    };
  }, [mode]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0" />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/60 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="route-loader-dot" />
            <span>Loading {MODES.find((m) => m.key === mode)?.label}…</span>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
          <p className="text-sm text-destructive max-w-xs">{error}</p>
        </div>
      )}
    </div>
  );
}

function CalculatorPage() {
  const [mode, setMode] = useState<Mode>("scientific");
  const active = MODES.find((m) => m.key === mode)!;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <active.icon className="w-5 h-5 text-primary" />
            {active.label} Calculator
          </h2>
          <p className="text-sm text-muted-foreground">{active.desc}</p>
        </div>
      </div>

      {/* Mode switcher — segmented control */}
      <div className="bg-muted/60 border rounded-2xl p-1 grid grid-cols-4 gap-1">
        {MODES.map((m) => {
          const isActive = m.key === mode;
          return (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl text-xs font-medium transition-all",
                isActive
                  ? "bg-card text-foreground shadow-card"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={isActive}
            >
              <m.icon className={cn("w-4 h-4", isActive && "text-primary")} />
              <span className="hidden sm:inline">{m.label}</span>
              <span className="sm:hidden">{m.short}</span>
            </button>
          );
        })}
      </div>

      {/* Calc surface */}
      <div className="bg-card border rounded-2xl p-1.5 shadow-card overflow-hidden">
        <div className="rounded-xl overflow-hidden h-[72vh] min-h-[460px] relative">
          {/* Remount per mode so each instance is fresh */}
          <CalcFrame key={mode} mode={mode} />
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground text-center">
        Powered by Desmos — free for everyone.
      </p>
    </div>
  );
}
