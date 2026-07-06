import type { UseCase } from "./types";
import {
  annualCost,
  costPerHourSaved,
  costPerUser,
  hoursSavedPerMonth,
} from "./metrics";

function escapeCsv(value: string | number): string {
  const s = String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function useCasesToCsv(useCases: UseCase[]): string {
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
    "Annual Cost (EUR)",
    "Hours Saved per Month",
    "Cost per Hour Saved (EUR)",
    "Cost per User (EUR)",
    "Peak Usage",
    "Fallback",
    "Confidence",
  ];

  const rows = useCases.map((uc) => {
    const cph = costPerHourSaved(uc);
    const cpu = costPerUser(uc);
    return [
      uc.name,
      uc.department,
      uc.owner,
      uc.status,
      uc.category,
      uc.usagePattern,
      uc.totalUsers,
      uc.timeSavedPerUserPerMonth,
      uc.expectedMonthlyCost,
      annualCost(uc),
      hoursSavedPerMonth(uc),
      cph === null ? "" : cph.toFixed(2),
      cpu === null ? "" : cpu.toFixed(2),
      uc.peakUsage,
      uc.fallback,
      uc.confidence,
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
