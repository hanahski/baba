/**
 * StudentsPlug app ↔ website bridge.
 *
 * When running inside the Android wrapper (UA contains "StudentsPlugApp"),
 * the native side calls `window.StudentsPlugApp.receiveFiles(json)` with files
 * the user shared into the app via Android's share sheet. We re-emit them as a
 * DOM CustomEvent so any page can opt-in:
 *
 *     window.addEventListener("studentsplug:shared-files", (e) => {
 *       const files: File[] = (e as CustomEvent).detail.files;
 *       // ...feed into your <input type="file"> or upload code
 *     });
 *
 * Files arriving before any listener registered are queued on
 * `window.__sharedFilesQueue` and re-dispatched on the first listener attach.
 */

export type SharedFilePayload = {
  name: string;
  type: string;
  /** data URL: data:<mime>;base64,<...> */
  dataUrl: string;
};

declare global {
  interface Window {
    StudentsPlugApp?: {
      receiveFiles: (json: string) => void;
    };
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
  if (window.StudentsPlugApp) return; // already installed

  window.__sharedFilesQueue = window.__sharedFilesQueue ?? [];

  window.StudentsPlugApp = {
    receiveFiles(json: string) {
      try {
        const payloads = JSON.parse(json) as SharedFilePayload[];
        const files = payloads.map(dataUrlToFile);
        window.__sharedFilesQueue!.push(...files);
        window.dispatchEvent(
          new CustomEvent("studentsplug:shared-files", { detail: { files } })
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
  // flush queue
  const queued = window.__sharedFilesQueue ?? [];
  if (queued.length) {
    window.__sharedFilesQueue = [];
    cb(queued);
  }
  return () => window.removeEventListener("studentsplug:shared-files", handler);
}
