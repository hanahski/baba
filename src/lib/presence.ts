// Shared online-presence helper.
// A user is "online" when they opted-in (show_online) and have been seen
// within the heartbeat window. The heartbeat in src/lib/auth.tsx fires every
// 60s, on focus, and on visibility-change, so a 3-minute window comfortably
// covers brief blips without showing stale presence.
const PRESENCE_WINDOW_MS = 3 * 60_000;

export function isOnline(
  showOnline: boolean | null | undefined,
  lastSeenAt: string | null | undefined,
): boolean {
  if (!showOnline || !lastSeenAt) return false;
  const t = new Date(lastSeenAt).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < PRESENCE_WINDOW_MS;
}
