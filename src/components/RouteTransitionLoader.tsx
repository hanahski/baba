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

  // Track theme for picking the right GIF (and matching backdrop colour).
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
      className="fixed inset-0 z-[300] flex items-center justify-center pointer-events-auto"
      style={{ backgroundColor: bg, animation: "spLoaderFade 180ms ease-out" }}
      aria-hidden
    >
      <img
        src={src}
        alt=""
        className="object-contain"
        style={{ width: "min(60vw, 280px)", height: "min(60vw, 280px)" }}
        draggable={false}
      />
      <style>{`@keyframes spLoaderFade { from { opacity: 0 } to { opacity: 1 } }`}</style>
    </div>
  );
}
