import brandLogo from "@/assets/brand-logo.svg.asset.json";

// App brand logo — StudentsPlug mark.
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-xl overflow-hidden shrink-0"
      style={{ width: size, height: size }}
      aria-label="StudentsPlug"
    >
      <img
        src={brandLogo.url}
        alt=""
        width={size}
        height={size}
        className="w-full h-full object-cover"
      />
    </span>
  );
}
