// Lightweight waveform renderer for an AudioBuffer.
// Pure canvas — no extra deps. Supports an optional "markers" overlay
// (used by the notification remover to show detected/edited bursts).

import { useEffect, useRef } from "react";

export type WaveMarker = {
  start: number;
  end: number;
  color?: string;
  label?: string;
};

type Props = {
  buffer: AudioBuffer | null;
  height?: number;
  /** Highlight regions in [0..duration] seconds. */
  markers?: WaveMarker[];
  /** Current playhead time in seconds (optional). */
  playhead?: number | null;
  /** Click handler receives the clicked time in seconds. */
  onSeek?: (t: number) => void;
  className?: string;
};

export function WaveformCanvas({
  buffer,
  height = 80,
  markers = [],
  playhead = null,
  onSeek,
  className,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !buffer) return;
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth;
    const cssH = height;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cssW, cssH);

    // Mono mix for visualization.
    const ch0 = buffer.getChannelData(0);
    const ch1 = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : ch0;
    const samplesPerPx = Math.max(1, Math.floor(ch0.length / cssW));
    const mid = cssH / 2;

    // Markers (drawn behind waveform).
    const dur = buffer.duration;
    for (const m of markers) {
      const x1 = (m.start / dur) * cssW;
      const x2 = (m.end / dur) * cssW;
      ctx.fillStyle = m.color ?? "rgba(239, 68, 68, 0.25)";
      ctx.fillRect(x1, 0, Math.max(2, x2 - x1), cssH);
    }

    // Waveform.
    ctx.strokeStyle = "hsl(var(--primary, 220 70% 55%))";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < cssW; x++) {
      let min = 1;
      let max = -1;
      const start = x * samplesPerPx;
      const end = Math.min(ch0.length, start + samplesPerPx);
      for (let i = start; i < end; i++) {
        const v = (ch0[i] + ch1[i]) * 0.5;
        if (v < min) min = v;
        if (v > max) max = v;
      }
      ctx.moveTo(x + 0.5, mid + min * mid);
      ctx.lineTo(x + 0.5, mid + max * mid);
    }
    ctx.stroke();

    // Playhead.
    if (playhead != null && dur > 0) {
      const px = (playhead / dur) * cssW;
      ctx.strokeStyle = "hsl(var(--accent-foreground, 0 0% 100%))";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, cssH);
      ctx.stroke();
    }
  }, [buffer, height, markers, playhead]);

  return (
    <canvas
      ref={ref}
      onClick={(e) => {
        if (!onSeek || !buffer) return;
        const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        onSeek((x / rect.width) * buffer.duration);
      }}
      className={`w-full rounded-lg bg-muted/40 ${onSeek ? "cursor-pointer" : ""} ${className ?? ""}`}
      style={{ height }}
    />
  );
}
