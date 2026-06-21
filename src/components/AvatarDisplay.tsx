import { avatarDataUri } from "@/lib/avatars";
import { cn } from "@/lib/utils";

export function AvatarDisplay({
  avatarKey,
  size = 40,
  online,
  className,
}: {
  avatarKey: string;
  size?: number;
  online?: boolean;
  className?: string;
  /** Deprecated: Google/external photos are intentionally never displayed. */
  photoUrl?: string | null;
}) {
  // Only the saved upload/chosen in-app avatar is displayed. Google photos are
  // never used as a visual fallback, so OAuth sign-ins cannot override choices.
  const savedAvatar = avatarKey?.trim();
  const src = savedAvatar ? avatarDataUri(savedAvatar) : avatarDataUri("boy-1");
  return (
    <div className={cn("relative inline-block shrink-0", className)} style={{ width: size, height: size }}>
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        style={{ width: size, height: size }}
        className="block rounded-full border-2 border-card shadow-card object-cover aspect-square bg-muted"
        onError={(e) => {
          const generatedFallback = avatarDataUri("boy-1");
          if (e.currentTarget.src !== generatedFallback) {
            e.currentTarget.src = generatedFallback;
          }
        }}
      />
      {online && (
        <span
          className="online-dot absolute bottom-0 right-0 block rounded-full bg-success border-2 border-card"
          style={{ width: Math.max(size * 0.28, 10), height: Math.max(size * 0.28, 10) }}
          aria-label="Online"
        />
      )}
    </div>
  );
}

