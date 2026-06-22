import brandLogo from "@/assets/brand-logo.png.asset.json";

// App brand logo — StudentsPlug mark.
// Neumorphism is applied to the mark's actual silhouette (the "S" + plug),
// not a circular puck. `filter: drop-shadow()` follows the PNG's alpha
// channel, so stacking a light shadow toward the top-left and a darker one
// toward the bottom-right extrudes the shape itself off the page —
// matching the app's soft monochromatic neumorphism system.
export function Logo({ size = 32 }: { size?: number }) {
  // Shadow offset/blur scale with size so a 16px favicon and a 96px header
  // mark both read as the same material.
  const o = Math.max(0.5, size / 32); // offset unit
  const b = Math.max(1, size / 16);   // blur unit
  const neuFilter = [
    `drop-shadow(-${o}px -${o}px ${b}px rgba(255,255,255,0.95))`,
    `drop-shadow(${o * 1.25}px ${o * 1.25}px ${b * 1.3}px rgba(20,28,60,0.28))`,
    `drop-shadow(0 0 0.5px rgba(20,28,60,0.35))`, // tiny edge definition
  ].join(" ");
  return (
    <span
      className="inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
      aria-label="StudentsPlug"
    >
      <img
        src={brandLogo.url}
        alt=""
        width={size}
        height={size}
        className="w-full h-full object-contain"
        style={{ filter: neuFilter }}
      />
    </span>
  );
}
