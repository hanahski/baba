import { RANKS, metalForStep, type RankTier } from "@/lib/ranks";
import { cn } from "@/lib/utils";

/**
 * RankBadge — coloured per-step (Copper → Silver → Diamond → Gold → Glowing Gem),
 * with an animated glow on every step and a stronger pulse on step 5.
 */
export function RankBadge({
  tier, step, size = "md", className,
}: {
  tier: RankTier; step: number; size?: "sm" | "md" | "lg"; className?: string;
}) {
  const r = RANKS[tier];
  const Icon = r.icon;
  const metal = metalForStep(step);
  const isGem = step >= 5;

  const dims = size === "sm"
    ? "text-[10px] px-1.5 py-0.5 gap-1"
    : size === "lg" ? "text-sm px-3 py-1.5 gap-1.5" : "text-xs px-2 py-1 gap-1";
  const iconSize = size === "sm" ? "w-3 h-3" : size === "lg" ? "w-4 h-4" : "w-3.5 h-3.5";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold text-white shadow-card relative overflow-hidden",
        dims,
        isGem && "rank-gem-pulse",
        !isGem && "rank-glow",
        className,
      )}
      style={{
        background: `linear-gradient(135deg, ${metal.color}, color-mix(in oklab, ${metal.color} 60%, white))`,
        // CSS var consumed by `.rank-glow` / `.rank-gem-pulse` keyframes in styles.css
        ["--rank-glow" as any]: metal.glow,
      }}
      title={`${r.label} · ${metal.label} (Step ${step})`}
    >
      <Icon className={cn(iconSize, "drop-shadow")} />
      <span className="uppercase tracking-wide">{r.label}</span>
      <span className="opacity-90">·{step}</span>
    </span>
  );
}
