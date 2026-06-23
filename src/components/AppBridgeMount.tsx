import { useEffect } from "react";
import { installAppBridge, isInApp, pushThemeToNative } from "@/lib/app-bridge";

/**
 * Mount once at the app root. Installs window.StudentsPlugApp so the Android
 * wrapper can hand shared files to the website, marks the document with an
 * `in-app` class, and keeps the native shell's background color in sync with
 * the website's current light/dark mode.
 */
export function AppBridgeMount() {
  useEffect(() => {
    installAppBridge();
    if (!isInApp()) return;
    document.documentElement.classList.add("in-app");

    const sync = () => {
      const isDark = document.documentElement.classList.contains("dark");
      pushThemeToNative(isDark ? "dark" : "light");
    };
    sync();

    // React to ThemeToggle and cross-tab/system changes.
    const onThemeEvent = () => sync();
    window.addEventListener("sp-theme-change", onThemeEvent);
    window.addEventListener("storage", onThemeEvent);

    // React to anything else flipping the `dark` class on <html>.
    const mo = new MutationObserver(sync);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      window.removeEventListener("sp-theme-change", onThemeEvent);
      window.removeEventListener("storage", onThemeEvent);
      mo.disconnect();
    };
  }, []);
  return null;
}
