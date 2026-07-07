import type { Initiative } from "./types";
import {
  annualCost,
  costPerHourSaved,
  costPerUser,
  hoursSavedPerMonth,
} from "./metrics";
import { VERDICT_META, verdictFor } from "./verdict";

function escapeCsv(value: string | number): string {
  const s = String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function initiativesToCsv(initiatives: Initiative[]): string {
  const header = [
    "Name",
    "Department",
    "Owner",
    "Status",
    "Category",
    "Usage Pattern",
    "Total Users",
    "Time Saved per User per Month (h)",
    "Expected Monthly Cost (EUR)",
    "Actual Monthly Cost (EUR)",
    "Annual Cost (EUR)",
    "Claimed Hours Saved per Month",
    "Actual Hours Saved per Month",
    "Cost per Hour Saved (EUR)",
    "Cost per User (EUR)",
    "Perceived Value (1-5)",
    "Build Effort",
    "Verdict",
    "Peak Usage",
    "Fallback",
    "Confidence",
  ];

  const rows = initiatives.map((i) => {
    const cph = costPerHourSaved(i);
    const cpu = costPerUser(i);
    const verdict = verdictFor(i.perceivedValue, i.expectedMonthlyCost, i.buildEffort);
    return [
      i.name,
      i.department,
      i.owner,
      i.status,
      i.category,
      i.usagePattern,
      i.totalUsers,
      i.timeSavedPerUserPerMonth,
      i.expectedMonthlyCost,
      i.actuals ? i.actuals.monthlyCost : "",
      annualCost(i),
      hoursSavedPerMonth(i),
      i.actuals ? i.actuals.hoursSavedPerMonth : "",
      cph === null ? "" : cph.toFixed(2),
      cpu === null ? "" : cpu.toFixed(2),
      i.perceivedValue,
      i.buildEffort,
      VERDICT_META[verdict].label,
      i.peakUsage,
      i.fallback,
      i.confidence,
    ].map(escapeCsv);
  });

  return [header.map(escapeCsv), ...rows].map((r) => r.join(",")).join("\r\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
