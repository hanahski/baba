import { useEffect, useState } from "react";
import { ScanLine } from "lucide-react";

const MESSAGES = [
  "Scanning handwriting…",
  "Reading printed text…",
  "Correcting text errors…",
  "Detecting math & formulas…",
  "Formatting equations…",
  "Almost ready, preparing your result…",
];

/**
 * Calm, professional waiting state for OCR.
 * - Soft gradient progress bar (eases asymptotically to ~95%)
 * - Looping dot wave
 * - Friendly rotating messages
 */
export function OcrLoadingState() {
  const [progress, setProgress] = useState(8);
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const tick = setInterval(() => {
      setProgress((p) => (p < 95 ? p + (95 - p) * 0.04 : p));
    }, 180);
    const rot = setInterval(() => setMsgIdx((i) => (i + 1) % MESSAGES.length), 2200);
    return () => { clearInterval(tick); clearInterval(rot); };
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-accent/40 p-6 shadow-card animate-fade-in"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-md animate-pulse" />
          <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 grid place-items-center text-primary-foreground">
            <ScanLine className="w-5 h-5 animate-pulse" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate" key={msgIdx}>
            <span className="inline-block animate-fade-in">{MESSAGES[msgIdx]}</span>
          </p>
          <p className="text-xs text-muted-foreground">Take a breath — accurate results are worth a moment.</p>
        </div>
      </div>

      <div className="relative h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-primary/80 to-accent-foreground/60 transition-[width] duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[slide-in-right_1.8s_ease-in-out_infinite]"
          style={{ mixBlendMode: "overlay" }}
        />
      </div>

      <div className="mt-4 flex items-center justify-center gap-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-primary/60"
            style={{
              animation: `pulse 1.4s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
