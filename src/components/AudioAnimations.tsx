// 5 themed audio "cover" animations. SVG + CSS only, no canvas, no deps.
// Each scene loops ~15s and reacts to playback. The IDs are kept stable so
// existing posts (encoded in URL fragments like #anim=dance) keep working.

export type AudioAnimationId = "dance" | "podcast" | "teacher" | "stage" | "chart";

export const AUDIO_ANIMATIONS: { id: AudioAnimationId; label: string; hint: string }[] = [
  { id: "dance",   label: "Dance Floor",     hint: "A group dancing to the beat" },
  { id: "podcast", label: "Podcast Studio",  hint: "A host speaking on the mic" },
  { id: "teacher", label: "Classroom",       hint: "A teacher at the board" },
  { id: "stage",   label: "Live on Stage",   hint: "An artist performing" },
  { id: "chart",   label: "Fancy Chart",     hint: "A moving analytics chart" },
];

// ── Backwards-compat: old posts used bars/wave/orbit/vinyl IDs. Map them. ──
const LEGACY: Record<string, AudioAnimationId> = {
  bars: "chart",
  wave: "stage",
  orbit: "podcast",
  vinyl: "dance",
  podcast: "podcast",
};
export function normalizeAnim(id: string | null | undefined): AudioAnimationId {
  if (!id) return "dance";
  if ((AUDIO_ANIMATIONS as { id: string }[]).some((a) => a.id === id)) return id as AudioAnimationId;
  return LEGACY[id] ?? "dance";
}

// ── Scene 1: Dance floor ───────────────────────────────────────────────────
function Dance({ playing }: { playing: boolean }) {
  const s = (i: number) => ({
    animation: playing
      ? `dance-bop 0.55s ease-in-out ${i * 0.12}s infinite alternate`
      : `dance-bop 2.2s ease-in-out ${i * 0.2}s infinite alternate`,
    transformOrigin: "50% 90%",
  });
  return (
    <svg viewBox="0 0 320 140" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="floor" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--primary)" stopOpacity="0.25" />
          <stop offset="1" stopColor="transparent" />
        </linearGradient>
      </defs>
      <rect x="0" y="120" width="320" height="20" fill="url(#floor)" />
      {/* disco lights */}
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={40 + i * 110} cy="18" r="6"
          fill="var(--primary)" opacity="0.6"
          style={{ animation: `disco 1.4s ease-in-out ${i * 0.3}s infinite` }} />
      ))}
      {/* 4 dancers */}
      {[40, 110, 180, 250].map((x, i) => (
        <g key={x} style={s(i)} transform={`translate(${x},0)`}>
          <circle cx="0" cy="42" r="10" fill="var(--primary)" />
          <rect x="-9" y="52" width="18" height="36" rx="6" fill="var(--accent-foreground)" />
          <rect x="-12" y="86" width="8" height="28" rx="3" fill="var(--primary)" />
          <rect x="4"   y="86" width="8" height="28" rx="3" fill="var(--primary)" />
          {/* arms */}
          <rect x="-22" y="56" width="8" height="22" rx="3" fill="var(--primary)"
            style={{ transformOrigin: "left top", animation: playing ? `dance-arm-l 0.55s ease-in-out ${i*0.1}s infinite alternate` : undefined }} />
          <rect x="14"  y="56" width="8" height="22" rx="3" fill="var(--primary)"
            style={{ transformOrigin: "left top", animation: playing ? `dance-arm-r 0.55s ease-in-out ${i*0.1}s infinite alternate` : undefined }} />
        </g>
      ))}
    </svg>
  );
}

// ── Scene 2: Podcast studio ────────────────────────────────────────────────
function Podcast({ playing }: { playing: boolean }) {
  return (
    <svg viewBox="0 0 320 140" className="h-full w-full" aria-hidden>
      {/* desk */}
      <rect x="0" y="108" width="320" height="32" fill="var(--muted)" />
      {/* host */}
      <g transform="translate(110,10)" style={{ animation: playing ? "talk-bob 0.7s ease-in-out infinite alternate" : undefined, transformOrigin: "50% 80%" }}>
        <circle cx="50" cy="42" r="22" fill="var(--primary)" />
        <rect x="22" y="62" width="56" height="48" rx="10" fill="var(--accent-foreground)" />
        {/* headphones */}
        <path d="M28 38 Q50 14 72 38" stroke="var(--foreground)" strokeWidth="4" fill="none" />
        <circle cx="28" cy="42" r="6" fill="var(--foreground)" />
        <circle cx="72" cy="42" r="6" fill="var(--foreground)" />
        {/* mouth */}
        <rect x="44" y="50" width="12" height="3" rx="1.5" fill="var(--background)"
          style={{ animation: playing ? "talk-mouth 0.25s ease-in-out infinite alternate" : undefined, transformOrigin: "50% 51px" }} />
      </g>
      {/* mic */}
      <g transform="translate(60,40)">
        <rect x="14" y="0" width="14" height="34" rx="6" fill="var(--foreground)" />
        <rect x="19" y="34" width="4" height="40" fill="var(--muted-foreground)" />
        <rect x="6"  y="74" width="30" height="4" rx="2" fill="var(--muted-foreground)" />
      </g>
      {/* sound rings from mic */}
      {[0, 1, 2].map((i) => (
        <circle key={i} cx="74" cy="56" r="6"
          fill="none" stroke="var(--primary)" strokeWidth="2"
          style={{ animation: playing ? `pod-ring 1.6s ease-out ${i * 0.4}s infinite` : undefined, opacity: playing ? undefined : 0.25, transformOrigin: "74px 56px" }} />
      ))}
      {/* ON AIR sign */}
      <rect x="240" y="20" width="64" height="22" rx="4" fill="var(--destructive)"
        style={{ animation: playing ? "onair 1.2s ease-in-out infinite" : undefined }} />
      <text x="272" y="35" textAnchor="middle" fontSize="11" fontWeight="700" fill="white">ON AIR</text>
    </svg>
  );
}

// ── Scene 3: Teacher at board ──────────────────────────────────────────────
function Teacher({ playing }: { playing: boolean }) {
  return (
    <svg viewBox="0 0 320 140" className="h-full w-full" aria-hidden>
      {/* board */}
      <rect x="20" y="10" width="220" height="90" rx="6" fill="#1f3a2e" />
      <rect x="20" y="10" width="220" height="90" rx="6" fill="none" stroke="var(--muted-foreground)" strokeWidth="3" />
      {/* chalk writing — strokes appear in sequence */}
      {[
        "M40 36 H120",
        "M40 54 H160",
        "M40 72 H100",
        "M180 36 H220",
        "M180 54 H210",
      ].map((d, i) => (
        <path key={i} d={d} stroke="white" strokeWidth="3" strokeLinecap="round" fill="none"
          strokeDasharray="120" strokeDashoffset="120"
          style={{ animation: playing ? `chalk 3.5s ease-out ${i * 0.6}s infinite` : undefined, opacity: playing ? undefined : 0.5 }} />
      ))}
      {/* floor */}
      <rect x="0" y="120" width="320" height="20" fill="var(--muted)" />
      {/* teacher */}
      <g transform="translate(248,30)" style={{ animation: playing ? "teach-sway 1.4s ease-in-out infinite alternate" : undefined, transformOrigin: "50% 90%" }}>
        <circle cx="20" cy="20" r="14" fill="var(--primary)" />
        <rect x="4" y="34" width="32" height="46" rx="8" fill="var(--accent-foreground)" />
        <rect x="6"  y="80" width="10" height="22" rx="3" fill="var(--primary)" />
        <rect x="24" y="80" width="10" height="22" rx="3" fill="var(--primary)" />
        {/* pointer arm */}
        <rect x="-18" y="40" width="22" height="6" rx="3" fill="var(--primary)"
          style={{ transformOrigin: "right center", animation: playing ? "teach-arm 0.9s ease-in-out infinite alternate" : undefined }} />
        <rect x="-30" y="41" width="14" height="4" rx="2" fill="var(--foreground)" />
      </g>
    </svg>
  );
}

// ── Scene 4: Artist on stage ───────────────────────────────────────────────
function Stage({ playing }: { playing: boolean }) {
  return (
    <svg viewBox="0 0 320 140" className="h-full w-full" aria-hidden>
      {/* spotlights */}
      <defs>
        <linearGradient id="spot1" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--primary)" stopOpacity="0.6" />
          <stop offset="1" stopColor="transparent" />
        </linearGradient>
        <linearGradient id="spot2" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--accent-foreground)" stopOpacity="0.6" />
          <stop offset="1" stopColor="transparent" />
        </linearGradient>
      </defs>
      <polygon points="60,0 20,120 100,120" fill="url(#spot1)"
        style={{ transformOrigin: "60px 0", animation: playing ? "spot-sway 2.4s ease-in-out infinite alternate" : undefined }} />
      <polygon points="260,0 220,120 300,120" fill="url(#spot2)"
        style={{ transformOrigin: "260px 0", animation: playing ? "spot-sway2 2.4s ease-in-out infinite alternate" : undefined }} />
      {/* stage */}
      <rect x="0" y="118" width="320" height="22" fill="var(--foreground)" opacity="0.85" />
      {/* artist with guitar */}
      <g transform="translate(140,30)" style={{ animation: playing ? "rock-bop 0.5s ease-in-out infinite alternate" : undefined, transformOrigin: "50% 90%" }}>
        <circle cx="20" cy="18" r="12" fill="var(--primary)" />
        <rect x="6" y="30" width="28" height="42" rx="8" fill="var(--accent-foreground)" />
        <rect x="8"  y="72" width="9" height="22" rx="3" fill="var(--primary)" />
        <rect x="23" y="72" width="9" height="22" rx="3" fill="var(--primary)" />
        {/* guitar */}
        <rect x="-6" y="50" width="44" height="6" rx="2" fill="var(--foreground)" transform="rotate(-15 16 53)" />
        <ellipse cx="-8" cy="60" rx="10" ry="7" fill="var(--destructive)" />
      </g>
      {/* mic stand */}
      <rect x="118" y="50" width="3" height="70" fill="var(--muted-foreground)" />
      <circle cx="120" cy="50" r="6" fill="var(--foreground)" />
      {/* crowd hands */}
      {[10, 30, 50, 70, 250, 270, 290, 310].map((x, i) => (
        <rect key={x} x={x} y="100" width="6" height="18" rx="2" fill="var(--foreground)" opacity="0.6"
          style={{ animation: playing ? `crowd 0.6s ease-in-out ${i * 0.07}s infinite alternate` : undefined, transformOrigin: `${x+3}px 118px` }} />
      ))}
    </svg>
  );
}

// ── Scene 5: Fancy chart ───────────────────────────────────────────────────
function Chart({ playing }: { playing: boolean }) {
  const bars = [40, 70, 55, 85, 60, 95, 72, 110, 80, 100, 65, 90];
  return (
    <svg viewBox="0 0 320 140" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="bar-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--primary)" />
          <stop offset="1" stopColor="var(--accent-foreground)" />
        </linearGradient>
        <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--primary)" stopOpacity="0.4" />
          <stop offset="1" stopColor="transparent" />
        </linearGradient>
      </defs>
      {/* grid */}
      {[30, 60, 90, 120].map((y) => (
        <line key={y} x1="0" x2="320" y1={y} y2={y} stroke="var(--border)" strokeDasharray="2 4" />
      ))}
      {/* bars */}
      {bars.map((h, i) => (
        <rect key={i} x={10 + i * 25} y={130 - h} width="16" height={h} rx="3" fill="url(#bar-grad)"
          style={{
            transformOrigin: `${10 + i * 25 + 8}px 130px`,
            animation: playing
              ? `bar-pulse 0.6s ease-in-out ${(i % 6) * 0.1}s infinite alternate`
              : `bar-pulse 2.4s ease-in-out ${(i % 6) * 0.2}s infinite alternate`,
          }} />
      ))}
      {/* trend line */}
      <path d="M10,80 C60,40 110,90 160,55 S260,30 310,50" fill="none"
        stroke="var(--destructive)" strokeWidth="2.5" strokeLinecap="round"
        strokeDasharray="600" strokeDashoffset={playing ? "0" : "600"}
        style={{ animation: playing ? "trend 3s ease-in-out infinite" : undefined }} />
      <path d="M10,80 C60,40 110,90 160,55 S260,30 310,50 L310,130 L10,130 Z" fill="url(#area)" opacity="0.6" />
      {/* moving dot */}
      <circle r="4" fill="var(--destructive)"
        style={{ animation: playing ? "dot-path 3s ease-in-out infinite" : undefined, offsetPath: "path('M10,80 C60,40 110,90 160,55 S260,30 310,50')", offsetRotate: "0deg" } as React.CSSProperties} />
    </svg>
  );
}

export function AudioAnimation({
  id,
  playing,
  className = "h-32 w-full rounded-xl overflow-hidden bg-gradient-to-br from-primary/15 via-card to-accent/30",
}: {
  id: AudioAnimationId | string;
  playing: boolean;
  className?: string;
}) {
  const norm = normalizeAnim(id);
  return (
    <div className={className}>
      {norm === "dance"   && <Dance   playing={playing} />}
      {norm === "podcast" && <Podcast playing={playing} />}
      {norm === "teacher" && <Teacher playing={playing} />}
      {norm === "stage"   && <Stage   playing={playing} />}
      {norm === "chart"   && <Chart   playing={playing} />}
    </div>
  );
}
