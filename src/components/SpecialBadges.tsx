import { cn } from "@/lib/utils";
import { useIsAdmin } from "@/lib/admin-ids";

/**
 * Special profile badges — admin-granted recognition icons.
 * Verification (FB-style check), Legit (trusted), Star (highlighted), Sure Plug (pro plug).
 * Each is a self-contained inline SVG so colors come from semantic tokens.
 */

type BadgeProps = { size?: number; className?: string };

export function VerificationBadge({ size = 18, className }: BadgeProps) {
  return (
    <span
      title="Verified"
      aria-label="Verified"
      className={cn("inline-flex items-center justify-center shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
        <path
          fill="#1d9bf0"
          d="M12 1.5 14.4 4l3.3-.4.6 3.3 3 1.5-1.4 3 1.4 3-3 1.5-.6 3.3-3.3-.4L12 22.5 9.6 20l-3.3.4-.6-3.3-3-1.5 1.4-3-1.4-3 3-1.5.6-3.3 3.3.4L12 1.5Z"
        />
        <path
          fill="#fff"
          d="m10.6 15.4-3-3 1.4-1.4 1.6 1.6 4.4-4.4 1.4 1.4-5.8 5.8Z"
        />
      </svg>
    </span>
  );
}

export function LegitBadge({ size = 18, className }: BadgeProps) {
  return (
    <span
      title="Legit — trusted contributor"
      aria-label="Legit"
      className={cn("inline-flex items-center justify-center shrink-0 rank-glow rounded-full", className)}
      style={{
        width: size,
        height: size,
        ["--rank-glow" as any]: "rgba(34,197,94,0.6)",
      }}
    >
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
        <defs>
          <linearGradient id="legitGrad" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>
        </defs>
        <path fill="url(#legitGrad)" d="M12 2 3 6v6c0 5 3.8 9.3 9 10 5.2-.7 9-5 9-10V6l-9-4Z" />
        <path fill="#fff" d="m10.6 15.4-3-3 1.4-1.4 1.6 1.6 4.4-4.4 1.4 1.4-5.8 5.8Z" />
      </svg>
    </span>
  );
}

export function StarBadge({ size = 18, className }: BadgeProps) {
  return (
    <span
      title="Star member"
      aria-label="Star"
      className={cn("inline-flex items-center justify-center shrink-0 rank-glow rounded-full", className)}
      style={{
        width: size,
        height: size,
        ["--rank-glow" as any]: "rgba(245,197,66,0.7)",
      }}
    >
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
        <defs>
          <linearGradient id="starGrad" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        <path
          fill="url(#starGrad)"
          stroke="#b45309"
          strokeWidth="0.6"
          d="m12 2.5 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.3l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9L12 2.5Z"
        />
      </svg>
    </span>
  );
}

export function SurePlugBadge({ size = 18, className }: BadgeProps) {
  return (
    <span
      title="Sure Plug — pro"
      aria-label="Sure Plug"
      className={cn("inline-flex items-center justify-center shrink-0 rank-gem-pulse rounded-full", className)}
      style={{
        width: size,
        height: size,
        ["--rank-glow" as any]: "rgba(168,85,247,0.85)",
      }}
    >
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
        <defs>
          <linearGradient id="plugGrad" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#7e22ce" />
          </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="10" fill="url(#plugGrad)" />
        <path
          fill="#fff"
          d="M9 6v3H8v2h1v1a3 3 0 0 0 2 2.83V18h2v-3.17A3 3 0 0 0 15 12v-1h1V9h-1V6h-2v3h-2V6H9Z"
        />
      </svg>
    </span>
  );
}

export function AdminBadge({ size = 18, className }: BadgeProps) {
  return (
    <span
      title="Admin"
      aria-label="Admin"
      className={cn("inline-flex items-center justify-center shrink-0 rank-glow rounded-full", className)}
      style={{
        width: size,
        height: size,
        ["--rank-glow" as any]: "rgba(250,204,21,0.85)",
        filter: "drop-shadow(0 0 6px rgba(250,204,21,0.9))",
      }}
    >
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
        <defs>
          <linearGradient id="adminGoldGrad" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="50%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>
        <path
          fill="url(#adminGoldGrad)"
          stroke="#92400e"
          strokeWidth="0.5"
          d="M12 1.5 14.4 4l3.3-.4.6 3.3 3 1.5-1.4 3 1.4 3-3 1.5-.6 3.3-3.3-.4L12 22.5 9.6 20l-3.3.4-.6-3.3-3-1.5 1.4-3-1.4-3 3-1.5.6-3.3 3.3.4L12 1.5Z"
        />
        <path fill="#fff" d="m10.6 15.4-3-3 1.4-1.4 1.6 1.6 4.4-4.4 1.4 1.4-5.8 5.8Z" />
      </svg>
    </span>
  );
}

export function SpecialBadges({
  profile,
  size = 18,
  className,
  isAdmin,
}: {
  profile: { id?: string; is_verified?: boolean | null; is_legit?: boolean | null; is_star?: boolean | null; is_sure_plug?: boolean | null };
  size?: number;
  className?: string;
  /** Optional override — when true the user gets only the gold admin badge. */
  isAdmin?: boolean;
}) {
  if (!profile) return null;
  const isAdminHook = useIsAdmin(profile.id ?? null);
  const admin = isAdmin ?? isAdminHook;
  if (admin) {
    return (
      <span className={cn("inline-flex items-center gap-1", className)}>
        <AdminBadge size={size} />
      </span>
    );
  }
  const has = profile.is_verified || profile.is_legit || profile.is_star || profile.is_sure_plug;
  if (!has) return null;
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {profile.is_verified && <VerificationBadge size={size} />}
      {profile.is_legit && <LegitBadge size={size} />}
      {profile.is_star && <StarBadge size={size} />}
      {profile.is_sure_plug && <SurePlugBadge size={size} />}
    </span>
  );
}

