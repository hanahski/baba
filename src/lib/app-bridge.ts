/**
 * StudentsPlug app ↔ website bridge.
 *
 * Detect the wrapper:
 *   isInApp() — true when running inside the Android WebView (UA contains
 *   "StudentsPlugApp"). Use it to enable app-only behavior on the site.
 *
 * Android → website (files shared INTO the app):
 *   The native side calls window.StudentsPlugApp.receiveFiles(json). We
 *   re-emit them as a "studentsplug:shared-files" CustomEvent. Files that
 *   arrive before any listener is attached are queued on
 *   window.__sharedFilesQueue and flushed on first subscribe.
 *
 *     onSharedFiles((files) => upload(files));
 *
 * Website → Android (download a file to the device):
 *   saveFileToDevice(file) writes the file into the phone's Downloads via
 *   the AndroidApp.saveFile bridge. Returns false outside the app so the
 *   caller can fall back to a normal <a download> in regular browsers.
 *
 * Theme sync:
 *   pushThemeToNative(theme) tells the wrapper which mode the site is in so
 *   the native root + splash background match (white in light mode, black
 *   in dark mode) — including the very next cold start.
 */

export type SharedFilePayload = {
  name: string;
  type: string;
  /** data URL: data:<mime>;base64,<...>. The native side always sends this. */
  dataUrl: string;
};

type AndroidBridge = {
  platform: () => string;
  appVersion: () => string;
  theme?: () => string;
  setTheme?: (theme: "light" | "dark") => void;
  saveFile?: (name: string, mime: string, base64: string) => boolean;
  /** Launches the native Google account picker. Result arrives via
   *  window.StudentsPlugApp.onGoogleIdToken / onGoogleSignInError. */
  googleSignIn?: () => void;
  /** Clears the cached native Google credential so the next sign-in re-prompts. */
  googleSignOut?: () => void;
};

declare global {
  interface Window {
    StudentsPlugApp?: {
      receiveFiles: (json: string) => void;
      onGoogleIdToken?: (token: string) => void;
      onGoogleSignInError?: (message: string) => void;
    };
    AndroidApp?: AndroidBridge;
    __sharedFilesQueue?: File[];
  }
}

export const isInApp = () =>
  typeof navigator !== "undefined" && /StudentsPlugApp/i.test(navigator.userAgent);

function dataUrlToFile(p: SharedFilePayload): File {
  const [meta, b64] = p.dataUrl.split(",");
  const isB64 = /;base64/i.test(meta);
  const bin = isB64 ? atob(b64) : decodeURIComponent(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], p.name || "shared", { type: p.type || "application/octet-stream" });
}

export function installAppBridge() {
  if (typeof window === "undefined") return;
  if (window.StudentsPlugApp) return;

  window.__sharedFilesQueue = window.__sharedFilesQueue ?? [];

  window.StudentsPlugApp = {
    receiveFiles(json: string) {
      try {
        const payloads = JSON.parse(json) as SharedFilePayload[];
        const files = payloads.map(dataUrlToFile);
        window.__sharedFilesQueue!.push(...files);
        window.dispatchEvent(
          new CustomEvent("studentsplug:shared-files", { detail: { files } }),
        );
      } catch (err) {
        console.error("[app-bridge] receiveFiles failed", err);
      }
    },
  };
}

/** Drain & subscribe in one call. Returns an unsubscribe fn. */
export function onSharedFiles(cb: (files: File[]) => void) {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => cb((e as CustomEvent).detail.files as File[]);
  window.addEventListener("studentsplug:shared-files", handler);
  const queued = window.__sharedFilesQueue ?? [];
  if (queued.length) {
    window.__sharedFilesQueue = [];
    cb(queued);
  }
  return () => window.removeEventListener("studentsplug:shared-files", handler);
}

/** Tell the Android wrapper which theme the site is using right now. */
export function pushThemeToNative(theme: "light" | "dark") {
  try {
    window.AndroidApp?.setTheme?.(theme);
  } catch {
    /* not in app */
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const result = String(r.result || "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/**
 * Save a file to the phone's Downloads folder via the Android bridge.
 * Returns true on success, false if not running inside the app (callers
 * should fall back to a normal browser download in that case).
 */
export async function saveFileToDevice(
  file: Blob,
  filename: string,
  mime?: string,
): Promise<boolean> {
  if (!isInApp() || !window.AndroidApp?.saveFile) return false;
  try {
    const base64 = await blobToBase64(file);
    return Boolean(window.AndroidApp.saveFile(filename, mime ?? file.type ?? "application/octet-stream", base64));
  } catch (err) {
    console.error("[app-bridge] saveFileToDevice failed", err);
    return false;
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Native Google Sign-In bridge                                              */
/* ────────────────────────────────────────────────────────────────────────── */

/** True when the wrapper exposes the native Google Sign-In bridge. */
export function supportsNativeGoogle(): boolean {
  return isInApp() && typeof window !== "undefined" && typeof window.AndroidApp?.googleSignIn === "function";
}

/**
 * Ask the Android wrapper to show the native Google account picker.
 * Resolves with the Google ID token (a JWT) that can be handed to
 * `supabase.auth.signInWithIdToken({ provider: "google", token })`.
 */
export function requestNativeGoogleSignIn(timeoutMs = 120_000): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!supportsNativeGoogle()) {
      reject(new Error("Native Google Sign-In is not available"));
      return;
    }

    const bridge = (window.StudentsPlugApp ??= { receiveFiles: () => {} });
    let done = false;
    const cleanup = () => {
      bridge.onGoogleIdToken = undefined;
      bridge.onGoogleSignInError = undefined;
      clearTimeout(timer);
    };
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      cleanup();
      reject(new Error("Google sign-in timed out"));
    }, timeoutMs);

    bridge.onGoogleIdToken = (token: string) => {
      if (done) return;
      done = true;
      cleanup();
      if (!token) reject(new Error("Empty Google ID token"));
      else resolve(token);
    };
    bridge.onGoogleSignInError = (message: string) => {
      if (done) return;
      done = true;
      cleanup();
      reject(new Error(message || "Google sign-in cancelled"));
    };

    try {
      window.AndroidApp!.googleSignIn!();
    } catch (err) {
      if (done) return;
      done = true;
      cleanup();
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

/** Optional: clear the native cached Google account so next sign-in re-prompts. */
export function nativeGoogleSignOut() {
  try {
    window.AndroidApp?.googleSignOut?.();
  } catch {
    /* not in app */
  }
}
