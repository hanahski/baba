import brandLogo from "@/assets/brand-logo.png.asset.json";

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <img
      src={brandLogo.url}
      alt="StudentsPlug"
      width={size}
      height={size}
      className="object-contain shrink-0"
      style={{ width: size, height: size }}
    />
  );
}
