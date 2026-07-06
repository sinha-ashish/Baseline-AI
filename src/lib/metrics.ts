import type { Confidence, Department, Status, UseCase } from "./types";

export function hoursSavedPerMonth(uc: UseCase): number {
  return uc.totalUsers * uc.timeSavedPerUserPerMonth;
}

export function annualCost(uc: UseCase): number {
  return uc.expectedMonthlyCost * 12;
}

/** EUR per hour saved; null when no hours are saved (avoids division by zero). */
export function costPerHourSaved(uc: UseCase): number | null {
  const hours = hoursSavedPerMonth(uc);
  if (hours <= 0) return null;
  return uc.expectedMonthlyCost / hours;
}

/** EUR per user per month; null when there are no users. */
export function costPerUser(uc: UseCase): number | null {
  if (uc.totalUsers <= 0) return null;
  return uc.expectedMonthlyCost / uc.totalUsers;
}

export function isActive(uc: UseCase): boolean {
  return uc.status !== "Stopped";
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

export function portfolioTotals(useCases: UseCase[]): PortfolioTotals {
  const active = useCases.filter(isActive);
  const monthlyCost = active.reduce((s, uc) => s + uc.expectedMonthlyCost, 0);
  const hoursSaved = active.reduce((s, uc) => s + hoursSavedPerMonth(uc), 0);
  const impactedUsers = active.reduce((s, uc) => s + uc.totalUsers, 0);
  const highCost = active
    .filter((uc) => uc.confidence === "High")
    .reduce((s, uc) => s + uc.expectedMonthlyCost, 0);

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

export function statusCounts(useCases: UseCase[]): Record<Status, number> {
  const counts: Record<Status, number> = {
    Idea: 0,
    POC: 0,
    Pilot: 0,
    Production: 0,
    Stopped: 0,
  };
  for (const uc of useCases) counts[uc.status] += 1;
  return counts;
}

export function confidenceCostMix(
  useCases: UseCase[]
): { confidence: Confidence; cost: number; count: number }[] {
  const active = useCases.filter(isActive);
  return (["High", "Medium", "Low"] as const).map((confidence) => {
    const entries = active.filter((uc) => uc.confidence === confidence);
    return {
      confidence,
      cost: entries.reduce((s, uc) => s + uc.expectedMonthlyCost, 0),
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
  useCases: UseCase[]
): DepartmentSpend[] {
  const active = useCases.filter(isActive);
  return departments.map((department) => {
    const spend = active
      .filter((uc) => uc.department === department.name)
      .reduce((s, uc) => s + uc.expectedMonthlyCost, 0);
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

export function topByCost(useCases: UseCase[], n: number): UseCase[] {
  return useCases
    .filter(isActive)
    .slice()
    .sort((a, b) => b.expectedMonthlyCost - a.expectedMonthlyCost)
    .slice(0, n);
}
