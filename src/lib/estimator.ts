import { usdToEur, type PriceRates } from "./pricing";

/**
 * Estimator math. Deterministic scenario bands — a straight expected
 * calculation plus plain stress multipliers. Cost is linear in the volume
 * drivers, so "multiplier on the drivers" and "multiplier on the total"
 * are the same number; we document it as the former because that is what
 * physically happens in a busy month or a retry storm.
 */

export interface SizingPreset {
  id: "short" | "session" | "heavy";
  label: string;
  description: string;
  tokensIn: number;
  tokensOut: number;
}

export const SIZING_PRESETS: SizingPreset[] = [
  {
    id: "short",
    label: "Short exchange",
    description: "A question, a lookup, a quick rewrite",
    tokensIn: 2000,
    tokensOut: 500,
  },
  {
    id: "session",
    label: "Typical working session",
    description: "Drafting, summarising, back-and-forth",
    tokensIn: 8000,
    tokensOut: 2500,
  },
  {
    id: "heavy",
    label: "Heavy document work",
    description: "Long contracts, reports, multi-file analysis",
    tokensIn: 30000,
    tokensOut: 5000,
  },
];

export const DEFAULT_BUSY_MULTIPLIER = 1.5;
export const DEFAULT_BAD_DAY_MULTIPLIER = 3;

export interface UserDrivenVolume {
  kind: "user-driven";
  users: number;
  interactionsPerUserPerMonth: number;
}

export interface SystemDrivenVolume {
  kind: "system-driven";
  runsPerMonth: number;
  itemsPerRun: number;
  callsPerItem: number;
}

export type Volume = UserDrivenVolume | SystemDrivenVolume;

export function callsPerMonth(volume: Volume): number {
  if (volume.kind === "user-driven") {
    return volume.users * volume.interactionsPerUserPerMonth;
  }
  return volume.runsPerMonth * volume.itemsPerRun * volume.callsPerItem;
}

export interface EstimateInputs {
  volume: Volume;
  tokensInPerCall: number;
  tokensOutPerCall: number;
  busyMultiplier: number;
  badDayMultiplier: number;
}

export interface EstimateResult {
  callsPerMonth: number;
  mTokInPerMonth: number;
  mTokOutPerMonth: number;
  expectedMonthlyUsd: number;
  expectedMonthlyEur: number;
  busyMonthlyEur: number;
  badDayMonthlyEur: number;
}

export function monthlyCostUsd(
  calls: number,
  tokensInPerCall: number,
  tokensOutPerCall: number,
  price: PriceRates
): number {
  const mTokIn = (calls * tokensInPerCall) / 1_000_000;
  const mTokOut = (calls * tokensOutPerCall) / 1_000_000;
  return mTokIn * price.inputPerMTok + mTokOut * price.outputPerMTok;
}

export function computeEstimate(inputs: EstimateInputs, price: PriceRates): EstimateResult {
  const calls = callsPerMonth(inputs.volume);
  const expectedMonthlyUsd = monthlyCostUsd(
    calls,
    inputs.tokensInPerCall,
    inputs.tokensOutPerCall,
    price
  );
  const expectedMonthlyEur = expectedMonthlyUsd * usdToEur;
  return {
    callsPerMonth: calls,
    mTokInPerMonth: (calls * inputs.tokensInPerCall) / 1_000_000,
    mTokOutPerMonth: (calls * inputs.tokensOutPerCall) / 1_000_000,
    expectedMonthlyUsd,
    expectedMonthlyEur,
    busyMonthlyEur: expectedMonthlyEur * inputs.busyMultiplier,
    badDayMonthlyEur: expectedMonthlyEur * inputs.badDayMultiplier,
  };
}
