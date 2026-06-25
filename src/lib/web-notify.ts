// Browser Notification fallback for chat messages.
// Used when sound playback is blocked (iOS autoplay policy) or the tab is
// hidden — keeps users notified even without audio.

const TAG_PREFIX = "sp-dm-";

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationsGranted(): boolean {
  return notificationsSupported() && Notification.permission === "granted";
}

/** Request permission lazily; safe to call from a user gesture. */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const res = await Notification.requestPermission();
    return res === "granted";
  } catch {
    return false;
  }
}

/**
 * Show a browser notification for an incoming DM. Best-effort: silently
 * no-ops when permission isn't granted or the API is unavailable.
 * Only fires when the tab isn't currently visible — avoids spamming
 * users who already have the chat open.
 */
export function notifyIncomingMessage(opts: {
  title: string;
  body: string;
  threadId?: string;
  force?: boolean;
}) {
  if (!notificationsGranted()) return;
  if (!opts.force && typeof document !== "undefined" && document.visibilityState === "visible") return;
  try {
    const n = new Notification(opts.title, {
      body: opts.body.slice(0, 140),
      tag: TAG_PREFIX + (opts.threadId ?? "global"),
      icon: "/__l5e/assets-v1/57d8a869-4dec-403e-a4ed-ea8f590c7a68/brand-logo.png",
      badge: "/__l5e/assets-v1/57d8a869-4dec-403e-a4ed-ea8f590c7a68/brand-logo.png",
      silent: false,
    });
    n.onclick = () => {
      try { window.focus(); } catch {}
      if (opts.threadId) {
        try { window.location.assign(`/chat?tab=dms&t=${opts.threadId}`); } catch {}
      }
      n.close();
    };
  } catch {
    // Some browsers throw on construction outside a service worker — ignore.
  }
}

/** Play a sound and, if it appears to fail or page is hidden, show a Notification. */
export function playOrNotify(
  play: () => void,
  fallback: { title: string; body: string; threadId?: string },
) {
  let played = true;
  try { play(); } catch { played = false; }
  // Hidden tab: audio usually silent on mobile — always also notify.
  const hidden = typeof document !== "undefined" && document.visibilityState !== "visible";
  if (!played || hidden) notifyIncomingMessage(fallback);
}
