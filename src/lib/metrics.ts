import type { Confidence, Department, Initiative, Status } from "./types";

/** Claimed hours: the throughput assertion (users × time saved). */
export function hoursSavedPerMonth(initiative: Initiative): number {
  return initiative.totalUsers * initiative.timeSavedPerUserPerMonth;
}

/** Measured hours where actuals exist, otherwise the claim. */
export function effectiveHoursSaved(initiative: Initiative): number {
  return initiative.actuals?.hoursSavedPerMonth ?? hoursSavedPerMonth(initiative);
}

/** Measured cost where actuals exist, otherwise the expected cost. */
export function effectiveMonthlyCost(initiative: Initiative): number {
  return initiative.actuals?.monthlyCost ?? initiative.expectedMonthlyCost;
}

export function annualCost(initiative: Initiative): number {
  return effectiveMonthlyCost(initiative) * 12;
}

/** EUR per hour saved; null when no hours are saved (avoids division by zero). */
export function costPerHourSaved(initiative: Initiative): number | null {
  const hours = effectiveHoursSaved(initiative);
  if (hours <= 0) return null;
  return effectiveMonthlyCost(initiative) / hours;
}

/** EUR per user per month; null when there are no users. */
export function costPerUser(initiative: Initiative): number | null {
  if (initiative.totalUsers <= 0) return null;
  return effectiveMonthlyCost(initiative) / initiative.totalUsers;
}

export function isActive(initiative: Initiative): boolean {
  return initiative.status !== "Stopped";
}

export interface PortfolioTotals {
  monthlyCost: number;
  annualCost: number;
  hoursSaved: number;
  impactedUsers: number;
  costPerHourSaved: number | null;
  /** % of monthly cost carried by High-confidence entries (0–100). */
  measuredShare: number | null;
  activeCount: number;
}

export function portfolioTotals(
  initiatives: Initiative[],
  opts?: { measuredOnly?: boolean }
): PortfolioTotals {
  const active = initiatives
    .filter(isActive)
    .filter((i) => !opts?.measuredOnly || i.confidence === "High");
  const monthlyCost = active.reduce((s, i) => s + effectiveMonthlyCost(i), 0);
  const hoursSaved = active.reduce((s, i) => s + effectiveHoursSaved(i), 0);
  const impactedUsers = active.reduce((s, i) => s + i.totalUsers, 0);
  const highCost = active
    .filter((i) => i.confidence === "High")
    .reduce((s, i) => s + effectiveMonthlyCost(i), 0);

  return {
    monthlyCost,
    annualCost: monthlyCost * 12,
    hoursSaved,
    impactedUsers,
    costPerHourSaved: hoursSaved > 0 ? monthlyCost / hoursSaved : null,
    measuredShare: monthlyCost > 0 ? (highCost / monthlyCost) * 100 : null,
    activeCount: active.length,
  };
}

export function statusCounts(initiatives: Initiative[]): Record<Status, number> {
  const counts: Record<Status, number> = {
    Idea: 0,
    POC: 0,
    Pilot: 0,
    Production: 0,
    Stopped: 0,
  };
  for (const i of initiatives) counts[i.status] += 1;
  return counts;
}

export function confidenceCostMix(
  initiatives: Initiative[]
): { confidence: Confidence; cost: number; count: number }[] {
  const active = initiatives.filter(isActive);
  return (["High", "Medium", "Low"] as const).map((confidence) => {
    const entries = active.filter((i) => i.confidence === confidence);
    return {
      confidence,
      cost: entries.reduce((s, i) => s + effectiveMonthlyCost(i), 0),
      count: entries.length,
    };
  });
}

export interface DepartmentSpend {
  department: Department;
  spend: number;
  utilization: number | null; // spend / budget, null when budget is 0
  overBudget: boolean;
}

export function departmentSpend(
  departments: Department[],
  initiatives: Initiative[]
): DepartmentSpend[] {
  const active = initiatives.filter(isActive);
  return departments.map((department) => {
    const spend = active
      .filter((i) => i.department === department.name)
      .reduce((s, i) => s + effectiveMonthlyCost(i), 0);
    const utilization =
      department.monthlyBudget > 0 ? spend / department.monthlyBudget : null;
    return {
      department,
      spend,
      utilization,
      overBudget: department.monthlyBudget > 0 && spend > department.monthlyBudget,
    };
  });
}

export function topByCost(initiatives: Initiative[], n: number): Initiative[] {
  return initiatives
    .filter(isActive)
    .slice()
    .sort((a, b) => effectiveMonthlyCost(b) - effectiveMonthlyCost(a))
    .slice(0, n);
}

/** Delta of measured cost against the original claim, as a fraction (−0.23 = 23% under). */
export function actualsCostDelta(initiative: Initiative): number | null {
  if (!initiative.actuals || initiative.expectedMonthlyCost <= 0) return null;
  return (
    (initiative.actuals.monthlyCost - initiative.expectedMonthlyCost) /
    initiative.expectedMonthlyCost
  );
}
