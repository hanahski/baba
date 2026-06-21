import ebsuCrest from "@/assets/ebsu-crest.jpeg";

// Compact Ebonyi State University badge — shown top-left on every feed post,
// market listing, ticket and other University-affiliated cards.
// Uses the official EBSU crest inside a circular profile-style frame.
export function EbsuBadge({ size = 28 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-card shadow-card ring-2 ring-primary/30 overflow-hidden shrink-0"
      title="Ebonyi State University"
      aria-label="Ebonyi State University"
      style={{ width: size, height: size }}
    >
      <img
        src={ebsuCrest}
        alt=""
        width={size}
        height={size}
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </span>
  );
}
