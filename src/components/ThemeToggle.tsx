import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "sp-theme";
type Theme = "light" | "dark";

function readTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {}
  // Default to light mode on first visit, then lock it in so we never randomly flip later.
  try { window.localStorage.setItem(STORAGE_KEY, "light"); } catch {}
  return "light";
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => readTheme());

  // Keep DOM + storage in sync, and listen to changes from other tabs / other toggle instances.
  useEffect(() => {
    applyTheme(theme);
    try { window.localStorage.setItem(STORAGE_KEY, theme); } catch {}
  }, [theme]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const v = e.newValue;
      if (v === "dark" || v === "light") setThemeState(v);
    };
    const onCustom = (e: Event) => {
      const next = (e as CustomEvent<Theme>).detail;
      if (next === "dark" || next === "light") setThemeState(next);
      else setThemeState(readTheme());
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("sp-theme-change", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("sp-theme-change", onCustom);
    };
  }, []);

  const setTheme = (t: Theme) => {
    applyTheme(t);
    try { window.localStorage.setItem(STORAGE_KEY, t); } catch {}
    setThemeState(t);
    try { window.dispatchEvent(new CustomEvent("sp-theme-change", { detail: t })); } catch {}
  };

  return {
    theme,
    setTheme,
    toggle: () => setTheme(readTheme() === "dark" ? "light" : "dark"),
  };
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex items-center justify-center w-10 h-10 rounded-full border bg-card hover:bg-accent transition shadow-card ${className}`}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
