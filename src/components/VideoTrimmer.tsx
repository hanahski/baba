// Trim-only video editor: pick start + end times before posting.
// No re-encoding — we just store `#t=start,end` on the media URL and the
// player honours it. Lightweight, instant, works on mobile.
import { useEffect, useRef, useState } from "react";
import { Scissors, Play, RotateCcw } from "lucide-react";
import { formatTime, type TimeRange } from "@/lib/trim";

export function VideoTrimmer({
  src,
  onChange,
}: {
  src: string;
  onChange: (range: TimeRange | null) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);

  // When the video loads, default the trim to the full clip.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onMeta = () => {
      const d = Number.isFinite(el.duration) ? el.duration : 0;
      setDuration(d);
      setStart(0);
      setEnd(d);
    };
    el.addEventListener("loadedmetadata", onMeta);
    return () => el.removeEventListener("loadedmetadata", onMeta);
  }, [src]);

  // Notify parent whenever the trim window changes meaningfully.
  useEffect(() => {
    if (duration <= 0) { onChange(null); return; }
    const trimmed = start > 0.05 || end < duration - 0.05;
    onChange(trimmed ? { start, end } : null);
  }, [start, end, duration, onChange]);

  const previewTrim = () => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = start;
    el.play();
    const stop = () => {
      if (el.currentTime >= end) { el.pause(); el.removeEventListener("timeupdate", stop); }
    };
    el.addEventListener("timeupdate", stop);
  };

  const reset = () => { setStart(0); setEnd(duration); };

  const startPct = duration ? (start / duration) * 100 : 0;
  const endPct = duration ? (end / duration) * 100 : 100;

  return (
    <div className="rounded-xl border bg-muted/30 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Scissors className="w-3.5 h-3.5 text-primary" /> Trim video
        </p>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={previewTrim}
            disabled={!duration}
            className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/15 text-primary hover:bg-primary/25 disabled:opacity-50"
          >
            <Play className="w-3 h-3" /> Preview
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={!duration}
            className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded-full hover:bg-muted disabled:opacity-50"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>
      </div>

      <video
        ref={videoRef}
        src={src}
        controls
        playsInline
        preload="metadata"
        className="w-full rounded-lg bg-black max-h-72 object-contain"
      />

      {/* Dual-thumb visual timeline */}
      <div className="relative h-9 select-none">
        <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-2 rounded-full bg-muted" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full bg-gradient-to-r from-primary to-accent"
          style={{ left: `calc(${startPct}% + 8px)`, right: `calc(${100 - endPct}% + 8px)` }}
        />
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={start}
          onChange={(e) => setStart(Math.min(Number(e.target.value), end - 0.5))}
          className="trim-range absolute inset-0 w-full appearance-none bg-transparent pointer-events-none"
        />
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={end}
          onChange={(e) => setEnd(Math.max(Number(e.target.value), start + 0.5))}
          className="trim-range absolute inset-0 w-full appearance-none bg-transparent pointer-events-none"
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
        <span>Start <strong className="text-foreground">{formatTime(start)}</strong></span>
        <span>Length <strong className="text-primary">{formatTime(Math.max(0, end - start))}</strong></span>
        <span>End <strong className="text-foreground">{formatTime(end)}</strong></span>
      </div>
    </div>
  );
}
