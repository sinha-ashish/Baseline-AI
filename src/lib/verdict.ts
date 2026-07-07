/**
 * The verdict quadrant: perceived value crossed against cost + build effort.
 * Deterministic and inspectable — the thresholds below are documented in the
 * "how we got this" panel wherever a verdict renders. This is a decision aid
 * that makes a judgment legible, not an algorithm that knows the answer.
 */

export const PERCEIVED_VALUES = [1, 2, 3, 4, 5] as const;
export type PerceivedValue = (typeof PERCEIVED_VALUES)[number];

/** Anchors so the 1–5 rating is a judgment with reference points, not a vanity slider. */
export const VALUE_ANCHORS: Record<PerceivedValue, string> = {
  1: "Invisible plumbing",
  2: "Convenient, forgettable",
  3: "Noticeably better",
  4: "Users would miss it",
  5: "Changes how users judge the whole product",
};

export const BUILD_EFFORTS = ["S", "M", "L"] as const;
export type BuildEffort = (typeof BUILD_EFFORTS)[number];

/** Indicative only — shown as a hint, never as a committed estimate. */
export const EFFORT_HINTS: Record<BuildEffort, string> = {
  S: "≈ 1–2 dev-weeks",
  M: "≈ 3–6 dev-weeks",
  L: "≈ 7+ dev-weeks",
};

export type Verdict = "quick-win" | "strategic-bet" | "filler" | "trap";

export const VERDICT_META: Record<
  Verdict,
  { label: string; line: string }
> = {
  "quick-win": { label: "Quick win", line: "Build it now." },
  "strategic-bet": { label: "Strategic bet", line: "Worth it — sequence deliberately." },
  filler: { label: "Filler", line: "Fine — background it." },
  trap: { label: "Trap", line: "The expensive thing nobody feels. Don't." },
};

/** Monthly EUR thresholds for the cost component of burden. */
export const COST_THRESHOLDS = { mid: 1000, high: 3000 };

export function costScore(monthlyEur: number): 0 | 1 | 2 {
  if (monthlyEur > COST_THRESHOLDS.high) return 2;
  if (monthlyEur >= COST_THRESHOLDS.mid) return 1;
  return 0;
}

export function effortScore(effort: BuildEffort): 0 | 1 | 2 {
  return effort === "S" ? 0 : effort === "M" ? 1 : 2;
}

/** Combined cost + effort burden, 0–4. */
export function burdenScore(monthlyEur: number, effort: BuildEffort): number {
  return costScore(monthlyEur) + effortScore(effort);
}

export function isHighValue(value: PerceivedValue): boolean {
  return value >= 4;
}

export function isHighBurden(burden: number): boolean {
  return burden >= 2;
}

export function verdictFor(
  value: PerceivedValue,
  monthlyEur: number,
  effort: BuildEffort
): Verdict {
  const highValue = isHighValue(value);
  const highBurden = isHighBurden(burdenScore(monthlyEur, effort));
  if (highValue) return highBurden ? "strategic-bet" : "quick-win";
  return highBurden ? "trap" : "filler";
}

/** Normalized plot position for the 2×2: x = burden 0–4, y = value 1–5, both 0..1. */
export function quadrantPosition(
  value: PerceivedValue,
  monthlyEur: number,
  effort: BuildEffort
): { x: number; y: number } {
  return {
    x: burdenScore(monthlyEur, effort) / 4,
    y: (value - 1) / 4,
  };
}

/** Where the quadrant divider lines sit in normalized coordinates. */
export const QUADRANT_DIVIDERS = {
  // burden becomes "high" at 2 of 4; draw the line between 1 and 2.
  x: 1.5 / 4,
  // value becomes "high" at 4 of 1–5; draw the line between 3 and 4.
  y: 2.5 / 4,
};
