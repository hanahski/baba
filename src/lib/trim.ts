// Parse / build "#t=start,end" media fragment identifiers for video URLs.
// Lets us trim videos without re-encoding — we just bookend playback.

export type TimeRange = { start?: number; end?: number };

export function parseTimeFragment(url: string): TimeRange {
  // The hash may also carry `#anim=…` from audio scenes — be tolerant.
  const hash = url.split("#")[1] ?? "";
  const params = hash.split("&");
  for (const p of params) {
    const [k, v] = p.split("=");
    if (k === "t" && v) {
      const [a, b] = v.split(",").map((s) => Number(s));
      const r: TimeRange = {};
      if (!Number.isNaN(a)) r.start = Math.max(0, a);
      if (b !== undefined && !Number.isNaN(b)) r.end = Math.max(0, b);
      return r;
    }
  }
  return {};
}

export function withTimeFragment(url: string, range: TimeRange): string {
  const cleanUrl = url.split("#")[0];
  const existingHash = url.split("#")[1] ?? "";
  const parts = existingHash.split("&").filter((p) => p && !p.startsWith("t="));
  if (range.start !== undefined || range.end !== undefined) {
    const s = (range.start ?? 0).toFixed(2);
    const e = range.end !== undefined ? `,${range.end.toFixed(2)}` : "";
    parts.push(`t=${s}${e}`);
  }
  const hash = parts.join("&");
  return hash ? `${cleanUrl}#${hash}` : cleanUrl;
}

export function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
