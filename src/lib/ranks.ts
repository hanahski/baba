import type { LucideIcon } from "lucide-react";
import { Sprout, ThumbsUp, Zap, Trophy, Award, Crown } from "lucide-react";

// Rank tier values stored in the database. `sure_plug` is preserved for
// backward compatibility with existing data + ticket policies, but new
// promotions stop at `pro` per the v2 ladder.
export type RankTier = "newbie" | "normal" | "active" | "legend" | "pro" | "sure_plug";

export type StepMetal = "copper" | "silver" | "diamond" | "gold" | "gem";

/** Per-step metal colour progression (Copper → Silver → Diamond → Gold → Glowing Gem). */
export const STEP_METALS: { id: StepMetal; label: string; color: string; glow: string }[] = [
  { id: "copper",  label: "Copper",  color: "#b87333", glow: "rgba(184,115,51,0.55)"  },
  { id: "silver",  label: "Silver",  color: "#c0c5ce", glow: "rgba(192,197,206,0.55)" },
  { id: "diamond", label: "Diamond", color: "#7fd5ff", glow: "rgba(127,213,255,0.65)" },
  { id: "gold",    label: "Gold",    color: "#f5c542", glow: "rgba(245,197,66,0.7)"   },
  { id: "gem",     label: "Glowing Gem", color: "#a855f7", glow: "rgba(168,85,247,0.85)" },
];

export function metalForStep(step: number): typeof STEP_METALS[number] {
  return STEP_METALS[Math.min(Math.max(step, 1), 5) - 1];
}

export const RANKS: Record<RankTier, { label: string; icon: LucideIcon; tagline: string; index: number }> = {
  newbie:    { label: "Newbie",    icon: Sprout,   tagline: "Fresh start — sprouting in",   index: 0 },
  normal:    { label: "Normal",    icon: ThumbsUp, tagline: "Approved and going steady",    index: 1 },
  active:    { label: "Active",    icon: Zap,      tagline: "Picking up momentum",          index: 2 },
  legend:    { label: "Legend",    icon: Trophy,   tagline: "Recognised and respected",     index: 3 },
  pro:       { label: "Pro",       icon: Award,    tagline: "Top-tier contributor",         index: 4 },
  sure_plug: { label: "Sure Plug", icon: Crown,    tagline: "Legacy elite",                  index: 5 },
};

export const ORDER: RankTier[] = ["newbie", "normal", "active", "legend", "pro"];

export const POSTS_PER_STEP = 10;
export const STEPS_PER_TIER = 5;
export const MAX_STEPS = ORDER.length * STEPS_PER_TIER; // 25

export function rankProgress(approvedPostCount: number) {
  const totalSteps = Math.min(Math.floor(approvedPostCount / POSTS_PER_STEP), MAX_STEPS - 1);
  const tier = ORDER[Math.min(Math.floor(totalSteps / STEPS_PER_TIER), ORDER.length - 1)];
  const step = (totalSteps % STEPS_PER_TIER) + 1;
  const postsInStep = approvedPostCount % POSTS_PER_STEP;
  const isMax = tier === "pro" && step === 5;
  const toNext = isMax ? 0 : POSTS_PER_STEP - postsInStep;
  return { tier, step, postsInStep, toNext, pct: (postsInStep / POSTS_PER_STEP) * 100, isMax };
}

export function nextLevelLabel(tier: RankTier, step: number) {
  if (tier === "pro" && step === 5) return "MAX rank achieved";
  if (step < 5) return `${RANKS[tier].label} ${step + 1}`;
  const nextTier = ORDER[Math.min(ORDER.indexOf(tier) + 1, ORDER.length - 1)];
  return `${RANKS[nextTier].label} 1`;
}

export function encouragement(approvedPostCount: number) {
  const lines = [
    "Keep posting — every drop fills the bucket.",
    "Your next post unlocks the next step. Let's go!",
    "Pros were once Newbies. Stay consistent.",
    "Students are reading what you post. Don't stop now.",
    "One more drop and you level up.",
  ];
  return lines[approvedPostCount % lines.length];
}
