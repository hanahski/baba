import { useEffect, useRef, useState } from "react";

/**
 * Persist a small form draft to localStorage and survive tab reloads.
 *
 * Returns the current draft (already merged with any saved snapshot on first mount),
 * an updater, a flag indicating that a non-empty saved draft was restored, and a
 * `clear()` helper to wipe the saved snapshot once the form is submitted.
 */
export function useDraft<T extends Record<string, any>>(
  key: string,
  initial: T,
  opts: { debounceMs?: number; enabled?: boolean } = {},
) {
  const { debounceMs = 400, enabled = true } = opts;
  const storageKey = `sp-draft:${key}`;
  const restoredRef = useRef(false);

  const [value, setValue] = useState<T>(() => {
    if (!enabled || typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return initial;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        restoredRef.current = true;
        return { ...initial, ...parsed };
      }
    } catch {
      /* ignore corrupt JSON */
    }
    return initial;
  });

  const [hasRestored, setHasRestored] = useState(false);
  useEffect(() => {
    if (restoredRef.current) setHasRestored(true);
  }, []);

  // Debounced save
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const t = setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(value));
      } catch {
        /* quota / privacy mode — silently skip */
      }
    }, debounceMs);
    return () => clearTimeout(t);
  }, [value, storageKey, debounceMs, enabled]);

  const clear = () => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
    setHasRestored(false);
  };

  const dismissRestoredBanner = () => setHasRestored(false);

  return { value, setValue, hasRestored, clear, dismissRestoredBanner };
}
