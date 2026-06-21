import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { getIsAdminUser } from "@/lib/admin-role";

/**
 * Facebook-style verification check, but glowing gold — shown next to a name
 * to indicate an admin / staff account.
 */
export function AdminCrownBadge({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <span
      title="Admin · StudentsPlug staff"
      aria-label="Admin"
      className={cn("inline-flex items-center justify-center shrink-0 admin-gold-glow rounded-full", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
        <defs>
          <linearGradient id="adminGoldGrad" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#ffe27a" />
            <stop offset="55%" stopColor="#f5b301" />
            <stop offset="100%" stopColor="#b8860b" />
          </linearGradient>
        </defs>
        <path
          fill="url(#adminGoldGrad)"
          stroke="#7a5200"
          strokeWidth="0.4"
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

/** Cached lookup: is this user an admin? Shared across the app via react-query. */
export function useIsAdminUser(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["is-admin-user", userId],
    enabled: !!userId,
    staleTime: 5 * 60_000,
    queryFn: async () => getIsAdminUser(userId),
  });
}