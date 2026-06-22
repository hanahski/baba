import { useEffect } from "react";
import { installAppBridge, isInApp } from "@/lib/app-bridge";

/**
 * Mount once at the app root. Installs window.StudentsPlugApp so the Android
 * wrapper can hand shared files to the website, and hides the in-browser
 * route loader bar when running inside the app (the app shows its own splash).
 */
export function AppBridgeMount() {
  useEffect(() => {
    installAppBridge();
    if (isInApp()) document.documentElement.classList.add("in-app");
  }, []);
  return null;
}
