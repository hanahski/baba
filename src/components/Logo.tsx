import ebsuCrest from "@/assets/ebsu-crest.jpeg";

// App logo — uses the official EBSU crest for a strong, recognisable identity.
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-xl overflow-hidden bg-white ring-1 ring-primary/20 shrink-0"
      style={{ width: size, height: size }}
      aria-label="StudentsPlug · EBSU"
    >
      <img
        src={ebsuCrest}
        alt=""
        width={size}
        height={size}
        className="w-full h-full object-contain"
      />
    </span>
  );
}
