// Rich, themed audio visualizer that puts the post author's avatar
// character at the centre of the scene with reactive music elements.
// Replaces the "childish" generic SVG scenes for the primary audio card.
import { avatarDataUri } from "@/lib/avatars";

export function AvatarVisualizer({
  avatarKey,
  playing,
  size = 88,
  className = "",
}: {
  avatarKey: string;
  playing: boolean;
  size?: number;
  className?: string;
}) {
  // 9 equalizer bars across the bottom — heights driven by CSS keyframe.
  const bars = Array.from({ length: 11 });
  // Floating music notes around the avatar.
  const notes = [
    { left: "12%", top: "22%", delay: "0s",   glyph: "♪" },
    { left: "78%", top: "18%", delay: "0.4s", glyph: "♫" },
    { left: "16%", top: "62%", delay: "0.8s", glyph: "♬" },
    { left: "82%", top: "58%", delay: "1.2s", glyph: "♪" },
    { left: "50%", top: "8%",  delay: "0.6s", glyph: "♩" },
  ];
  return (
    <div
      className={
        "relative overflow-hidden isolate " +
        "bg-[radial-gradient(circle_at_20%_20%,var(--primary)/0.35,transparent_55%),radial-gradient(circle_at_85%_75%,var(--accent)/0.45,transparent_60%)] " +
        "bg-card " +
        className
      }
      aria-hidden
    >
      {/* Aurora blobs */}
      <div className="absolute -top-10 -left-10 w-44 h-44 rounded-full opacity-50 blur-3xl bg-primary av-aurora-a" />
      <div className="absolute -bottom-12 -right-12 w-52 h-52 rounded-full opacity-50 blur-3xl bg-accent av-aurora-b" />

      {/* Floating notes */}
      {notes.map((n, i) => (
        <span
          key={i}
          className={"absolute text-primary/80 font-bold select-none drop-shadow-[0_0_6px_var(--primary)] " + (playing ? "av-note" : "opacity-40")}
          style={{
            left: n.left,
            top: n.top,
            fontSize: 18,
            animationDelay: n.delay,
          }}
        >
          {n.glyph}
        </span>
      ))}

      {/* Centre avatar with halo */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative" style={{ width: size + 28, height: size + 28 }}>
          {/* Rotating dashed halo */}
          <svg
            viewBox="0 0 100 100"
            className={"absolute inset-0 w-full h-full " + (playing ? "av-spin" : "opacity-60")}
          >
            <circle
              cx="50" cy="50" r="46"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="2"
              strokeDasharray="6 8"
              strokeLinecap="round"
              opacity="0.7"
            />
          </svg>
          {/* Pulse ring */}
          {playing && (
            <>
              <span className="absolute inset-1 rounded-full border-2 border-primary/40 av-pulse" />
              <span className="absolute inset-1 rounded-full border-2 border-accent/40 av-pulse" style={{ animationDelay: "0.6s" }} />
            </>
          )}
          {/* Avatar */}
          <img
            src={avatarDataUri(avatarKey)}
            alt=""
            width={size}
            height={size}
            style={{ width: size, height: size }}
            className={
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card shadow-glow object-cover " +
              (playing ? "av-bob" : "")
            }
          />
        </div>
      </div>

      {/* Equalizer bars across the bottom */}
      <div className="absolute bottom-0 inset-x-0 flex items-end justify-center gap-1 px-3 pb-2 h-10">
        {bars.map((_, i) => (
          <span
            key={i}
            className={"block w-1.5 rounded-full bg-gradient-to-t from-primary via-primary to-accent " + (playing ? "av-bar" : "opacity-50")}
            style={{
              height: "60%",
              animationDelay: `${(i % 5) * 0.12}s`,
              transformOrigin: "bottom",
            }}
          />
        ))}
      </div>
    </div>
  );
}
