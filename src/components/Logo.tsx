import brandLogo from "@/assets/brand-logo.png.asset.json";

// App brand logo — StudentsPlug mark, presented inside a neumorphic puck.
// The puck uses the app's `shadow-card` token so it matches the rest of the
// neumorphism system (soft extrusion on the shared surface), and presses in
// on :active for a tactile feel. Inner padding keeps the mark from touching
// the rim so the dual highlights/shadows read cleanly.
export function Logo({ size = 32 }: { size?: number }) {
  const pad = Math.max(2, Math.round(size * 0.14));
  return (
    <span
      className="inline-flex items-center justify-center shrink-0 rounded-full bg-background shadow-card neu-pressable"
      style={{ width: size, height: size, padding: pad }}
      aria-label="StudentsPlug"
    >
      <img
        src={brandLogo.url}
        alt=""
        width={size - pad * 2}
        height={size - pad * 2}
        className="w-full h-full object-contain drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]"
      />
    </span>
  );
}
