import type { Volume } from "./estimator";
import type { BuildEffort, PerceivedValue } from "./verdict";

export const STATUSES = ["Idea", "POC", "Pilot", "Production", "Stopped"] as const;
export type Status = (typeof STATUSES)[number];

export const CATEGORIES = ["Gen", "Agent", "Automation", "Hybrid"] as const;
export type Category = (typeof CATEGORIES)[number];

export const USAGE_PATTERNS = ["user-driven", "system-driven"] as const;
export type UsagePattern = (typeof USAGE_PATTERNS)[number];

export const CONFIDENCES = ["Low", "Medium", "High"] as const;
export type Confidence = (typeof CONFIDENCES)[number];

/** The engine an estimate priced against: one model, or a routing-layer blend. */
export type EstimateEngine =
  | { kind: "model"; modelId: string }
  | {
      kind: "gateway";
      cheapModelId: string;
      premiumModelId: string;
      /** Share of requests assumed to escalate to the premium model, 0..1. */
      premiumShare: number;
    };

/**
 * The inputs and band of a simulated estimate, stored on the initiative it
 * created so the number stays inspectable and reconcilable after the fact.
 */
export interface StoredEstimate {
  volume: Volume;
  tokensInPerCall: number;
  tokensOutPerCall: number;
  engine: EstimateEngine;
  engineLabel: string;
  busyMultiplier: number;
  badDayMultiplier: number;
  /** EUR per month. */
  band: { expected: number; busyMonth: number; badDay: number };
  pricesAsOf: string;
  createdAt: string; // ISO date
}

/** Measured (or pilot-quality) reality, recorded against the original claim. */
export interface Actuals {
  monthlyCost: number; // EUR
  hoursSavedPerMonth: number;
  /** "measured" = bills/logs → High confidence; "pilot" = early numbers → Medium. */
  quality: "measured" | "pilot";
  recordedAt: string; // ISO date
}

export interface Initiative {
  id: string;
  name: string;
  department: string;
  owner: string;
  status: Status;
  category: Category;
  usagePattern: UsagePattern;
  totalUsers: number;
  timeSavedPerUserPerMonth: number; // hours
  expectedMonthlyCost: number; // EUR
  peakUsage: string;
  fallback: string;
  confidence: Confidence;
  /** Human judgment, 1–5 — how much this changes how users experience the product. */
  perceivedValue: PerceivedValue;
  /** Human judgment, t-shirt sized. */
  buildEffort: BuildEffort;
  estimate?: StoredEstimate;
  actuals?: Actuals;
}

export interface Department {
  name: string;
  monthlyBudget: number; // EUR
}

/** A saved estimator scenario — the full form state, reloadable. */
export interface ScenarioSnapshot {
  name: string;
  department: string;
  owner: string;
  volume: Volume;
  presetId: "short" | "session" | "heavy" | "custom";
  tokensInPerCall: number;
  tokensOutPerCall: number;
  engine: EstimateEngine;
  busyMultiplier: number;
  badDayMultiplier: number;
  perceivedValue: PerceivedValue;
  buildEffort: BuildEffort;
}

export interface Scenario {
  id: string;
  createdAt: string;
  snapshot: ScenarioSnapshot;
}

/** A named set of scenarios being explored together. */
export interface Project {
  id: string;
  name: string;
  createdAt: string;
  scenarios: Scenario[];
}
