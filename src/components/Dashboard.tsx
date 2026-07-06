import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfidenceBadge, StatusBadge } from "@/components/badges";
import { useLedgerStore } from "@/store";
import {
  confidenceCostMix,
  costPerHourSaved,
  departmentSpend,
  portfolioTotals,
  statusCounts,
  topByCost,
} from "@/lib/metrics";
import { cn, formatEur, formatEurPrecise, formatNumber } from "@/lib/utils";

const FUNNEL_STATUSES = ["Idea", "POC", "Pilot", "Production"] as const;
// Lifecycle as a neutral intensity ramp — colour stays reserved for measured
// (emerald) and caution (amber).
const FUNNEL_COLORS: Record<(typeof FUNNEL_STATUSES)[number], string> = {
  Idea: "#3f3f46",
  POC: "#52525b",
  Pilot: "#71717a",
  Production: "#d4d4d8",
};

const CONFIDENCE_COLORS = {
  High: "#10b981",
  Medium: "#71717a",
  Low: "#3f3f46",
} as const;

function ChartTooltip({
  active,
  payload,
  formatter,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; payload?: Record<string, unknown> }[];
  formatter: (entry: { name?: string; value?: number; payload?: Record<string, unknown> }) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-1.5 text-xs shadow-md">
      {formatter(payload[0])}
    </div>
  );
}

export function Dashboard() {
  const useCases = useLedgerStore((s) => s.useCases);
  const departments = useLedgerStore((s) => s.departments);

  const totals = useMemo(() => portfolioTotals(useCases), [useCases]);
  const funnel = useMemo(() => {
    const counts = statusCounts(useCases);
    return FUNNEL_STATUSES.map((status) => ({ status, count: counts[status] }));
  }, [useCases]);
  const confidenceMix = useMemo(() => confidenceCostMix(useCases), [useCases]);
  const budgets = useMemo(() => departmentSpend(departments, useCases), [departments, useCases]);
  const top5 = useMemo(() => topByCost(useCases, 5), [useCases]);

  if (useCases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-24 text-center">
        <p className="text-lg font-medium">No use cases yet</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Add your first AI use case in the Ledger tab, or reset the demo data from the footer.
        </p>
      </div>
    );
  }

  const donutData = confidenceMix.filter((d) => d.cost > 0);

  return (
    <div className="space-y-6">
      {/* Hero stat row */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardDescription>Cost per Hour Saved</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold tracking-tight">
              {totals.costPerHourSaved === null
                ? "—"
                : `≈ ${formatEurPrecise(totals.costPerHourSaved)}`}
            </div>
            <p className="mt-2 text-xs">
              {totals.measuredShare === null ? (
                <span className="text-muted-foreground">No active spend yet</span>
              ) : (
                <span className="text-emerald-400">
                  Measured share: {totals.measuredShare.toFixed(0)}% of monthly spend
                </span>
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Monthly Cost</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{formatEur(totals.monthlyCost)}</div>
            <p className="mt-2 text-xs text-muted-foreground">
              {formatEur(totals.annualCost)} annualised
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Hours Saved / Month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              {formatNumber(totals.hoursSaved)}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              across {totals.activeCount} active use cases
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Impacted Users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              {formatNumber(totals.impactedUsers)}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">non-stopped use cases only</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Status funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Adoption funnel</CardTitle>
            <CardDescription>Use cases by lifecycle stage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnel} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <XAxis type="number" hide domain={[0, "dataMax"]} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="status"
                    axisLine={false}
                    tickLine={false}
                    width={84}
                    tick={{ fill: "#a1a1aa", fontSize: 13 }}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    content={
                      <ChartTooltip
                        formatter={(e) => `${e.payload?.status}: ${e.value} use case${e.value === 1 ? "" : "s"}`}
                      />
                    }
                  />
                  <Bar dataKey="count" radius={[4, 4, 4, 4]} barSize={22}>
                    {funnel.map((entry) => (
                      <Cell key={entry.status} fill={FUNNEL_COLORS[entry.status]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Confidence donut */}
        <Card>
          <CardHeader>
            <CardTitle>Confidence mix</CardTitle>
            <CardDescription>Monthly spend by confidence in the savings estimate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="h-56 flex-1">
                {donutData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No active spend to break down
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip
                        content={
                          <ChartTooltip
                            formatter={(e) =>
                              `${e.name}: ${formatEur(e.value ?? 0)} / month`
                            }
                          />
                        }
                      />
                      <Pie
                        data={donutData}
                        dataKey="cost"
                        nameKey="confidence"
                        innerRadius="62%"
                        outerRadius="90%"
                        paddingAngle={3}
                        strokeWidth={0}
                      >
                        {donutData.map((entry) => (
                          <Cell
                            key={entry.confidence}
                            fill={CONFIDENCE_COLORS[entry.confidence]}
                            strokeDasharray={entry.confidence === "Low" ? "4 4" : undefined}
                            stroke={entry.confidence === "Low" ? "#71717a" : undefined}
                            strokeWidth={entry.confidence === "Low" ? 1 : 0}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="space-y-3 pr-2">
                {confidenceMix.map((entry) => (
                  <div key={entry.confidence} className="flex items-center gap-2.5 text-sm">
                    <span
                      className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        entry.confidence === "Low" && "border border-dashed border-zinc-500 bg-transparent"
                      )}
                      style={
                        entry.confidence === "Low"
                          ? undefined
                          : { backgroundColor: CONFIDENCE_COLORS[entry.confidence] }
                      }
                    />
                    <span className="w-16 text-muted-foreground">{entry.confidence}</span>
                    <span className="font-medium tabular-nums">{formatEur(entry.cost)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Department budgets */}
        <Card>
          <CardHeader>
            <CardTitle>Department budgets</CardTitle>
            <CardDescription>Monthly AI spend vs budget</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {budgets.map(({ department, spend, utilization, overBudget }) => (
              <div key={department.name}>
                <div className="mb-1.5 flex items-baseline justify-between text-sm">
                  <span className="font-medium">{department.name}</span>
                  <span
                    className={cn(
                      "tabular-nums text-muted-foreground",
                      overBudget && "font-semibold text-amber-400"
                    )}
                  >
                    {formatEur(spend)} / {formatEur(department.monthlyBudget)}
                    {overBudget && " · over budget"}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      overBudget ? "bg-amber-500" : "bg-emerald-500"
                    )}
                    style={{
                      width: `${Math.min(100, (utilization ?? 0) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top 5 by cost */}
        <Card>
          <CardHeader>
            <CardTitle>Top use cases by cost</CardTitle>
            <CardDescription>Five biggest monthly line items</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/60">
              {top5.map((uc) => {
                const cph = costPerHourSaved(uc);
                return (
                  <div key={uc.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{uc.name}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{uc.department}</span>
                        <StatusBadge status={uc.status} />
                        <ConfidenceBadge confidence={uc.confidence} />
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-semibold tabular-nums">
                        {uc.confidence !== "High" && "≈ "}
                        {formatEur(uc.expectedMonthlyCost)}
                        <span className="text-muted-foreground">/mo</span>
                      </div>
                      <div className="text-xs tabular-nums text-muted-foreground">
                        {cph === null ? "— per h saved" : `${formatEurPrecise(cph)} per h saved`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
