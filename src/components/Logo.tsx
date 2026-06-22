import brandLogo from "@/assets/brand-logo.png.asset.json";

// App brand logo — StudentsPlug mark with an inset neumorphic effect.
// Trick: use the PNG as a CSS mask on a background-colored div, then apply
// inset shadows. The shadows are clipped to the mark's silhouette, so the
// "S" + plug look carved INTO the page — light from the top-left, dark to
// the bottom-right — matching the app's neumorphism system.
export function Logo({ size = 32 }: { size?: number }) {
  const o = Math.max(0.5, size / 28); // offset scales with size
  const b = Math.max(1, size / 12);   // blur scales with size
  const maskStyle: React.CSSProperties = {
    width: size,
    height: size,
    backgroundColor: "var(--background)",
    WebkitMaskImage: `url(${brandLogo.url})`,
    maskImage: `url(${brandLogo.url})`,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskSize: "contain",
    maskSize: "contain",
    WebkitMaskPosition: "center",
    maskPosition: "center",
    boxShadow: [
      `inset ${o * 1.4}px ${o * 1.4}px ${b}px rgba(20,28,60,0.45)`,
      `inset -${o}px -${o}px ${b}px rgba(255,255,255,0.9)`,
    ].join(", "),
  };
  return (
    <span
      role="img"
      aria-label="StudentsPlug"
      className="inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <span aria-hidden style={maskStyle} />
    </span>
  );
}
