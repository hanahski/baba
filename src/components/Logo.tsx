import brandLogo from "@/assets/brand-logo.png";

// App brand logo — plug + book spark mark in indigo/amber.
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-xl overflow-hidden shrink-0"
      style={{ width: size, height: size }}
      aria-label="StudentsPlug"
    >
      <img
        src={brandLogo}
        alt=""
        width={size}
        height={size}
        className="w-full h-full object-contain"
      />
    </span>
  );
}
