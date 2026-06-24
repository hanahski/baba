import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import loaderDark from "@/assets/loader-dark.gif.asset.json";
import loaderLight from "@/assets/loader-light.gif.asset.json";

/**
 * Full-screen branded animated logo shown during route transitions.
 * Visible only while the router is actually loading the next route, with a
 * minimum 400ms presence so very fast navigations still get a brand moment.
 */
const MIN_VISIBLE_MS = 400;

export function RouteTransitionLoader() {
  const isLoading = useRouterState({ select: (s) => s.isLoading });
  const [visible, setVisible] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const startedAt = useRef<number | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const update = () => setIsDark(document.documentElement.classList.contains("dark"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (isLoading) {
      if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
      if (!visible) {
        startedAt.current = Date.now();
        setVisible(true);
      }
    } else if (visible) {
      const elapsed = startedAt.current ? Date.now() - startedAt.current : MIN_VISIBLE_MS;
      const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
      hideTimer.current = setTimeout(() => {
        setVisible(false);
        startedAt.current = null;
      }, remaining);
    }
    return () => {
      if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
    };
  }, [isLoading, visible]);

  if (!visible) return null;

  const src = isDark ? loaderDark.url : loaderLight.url;
  const bg = isDark ? "#000" : "#fff";

  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center pointer-events-auto"
      style={{ backgroundColor: bg, animation: "spLoaderFade 180ms ease-out" }}
      aria-hidden
    >
      <div className="relative flex items-center justify-center">
        {/* soft brand glow */}
        <div
          className="absolute inset-0 rounded-full blur-2xl opacity-60"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--primary)/0.35) 0%, transparent 70%)",
          }}
        />
        {/* spinning conic ring */}
        <div
          className="absolute rounded-full"
          style={{
            width: 168,
            height: 168,
            background:
              "conic-gradient(from 0deg, hsl(var(--primary)) 0%, transparent 35%, transparent 65%, hsl(var(--primary)) 100%)",
            WebkitMask:
              "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))",
            animation: "spLoaderSpin 1.6s linear infinite",
            opacity: 0.85,
          }}
        />
        <img
          src={src}
          alt=""
          className="object-contain relative"
          style={{ width: 128, height: 128 }}
          draggable={false}
        />
      </div>
      <div className="mt-6 flex items-center gap-1.5">
        <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
          StudentsPlug
        </span>
        <span className="sp-dot" />
        <span className="sp-dot" style={{ animationDelay: "0.15s" }} />
        <span className="sp-dot" style={{ animationDelay: "0.3s" }} />
      </div>
      <style>{`
        @keyframes spLoaderFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes spLoaderSpin { to { transform: rotate(360deg) } }
        @keyframes spLoaderDot { 0%,80%,100% { opacity: .25; transform: translateY(0) } 40% { opacity: 1; transform: translateY(-2px) } }
        .sp-dot { width: 4px; height: 4px; border-radius: 9999px; background: hsl(var(--primary)); display: inline-block; animation: spLoaderDot 1s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
