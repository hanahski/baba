import brandLogo from "@/assets/brand-logo.png";

/**
 * Branded loading screen — animated logo + brand wordmark.
 * Used as the router's defaultPendingComponent and for app-level suspense.
 */
export function BrandLoader({ label = "StudentsPlug" }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-5 bg-background">
      <div className="relative">
        <span
          aria-hidden
          className="absolute inset-0 -m-3 rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, hsl(var(--primary)/0.0), hsl(var(--primary)/0.6), hsl(var(--primary)/0.0))",
            animation: "brandSpin 1.4s linear infinite",
            filter: "blur(8px)",
          }}
        />
        <img
          src={brandLogo}
          alt=""
          width={88}
          height={88}
          className="relative h-22 w-22 object-contain"
          style={{ animation: "brandPulse 1.6s ease-in-out infinite" }}
        />
      </div>
      <div className="flex items-end gap-[2px] text-xl font-bold tracking-wide">
        {label.split("").map((ch, i) => (
          <span
            key={i}
            className="inline-block bg-gradient-to-b from-primary to-accent bg-clip-text text-transparent"
            style={{
              animation: `brandLetter 1.6s ${i * 0.06}s ease-in-out infinite`,
            }}
          >
            {ch === " " ? "\u00A0" : ch}
          </span>
        ))}
      </div>
      <style>{`
        @keyframes brandSpin { to { transform: rotate(360deg); } }
        @keyframes brandPulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 0 hsl(var(--primary)/0.0)); }
          50% { transform: scale(1.08); filter: drop-shadow(0 8px 18px hsl(var(--primary)/0.45)); }
        }
        @keyframes brandLetter {
          0%, 100% { transform: translateY(0); opacity: .55; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}