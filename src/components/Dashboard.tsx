import { useMemo, useState } from "react";
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
import { ConfidenceBadge, StatusBadge, VerdictBadge } from "@/components/badges";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { QuadrantPlot, type QuadrantPoint } from "@/components/QuadrantPlot";
import { useLedgerStore } from "@/store";
import {
  actualsCostDelta,
  confidenceCostMix,
  costPerHourSaved,
  departmentSpend,
  effectiveMonthlyCost,
  hoursSavedPerMonth,
  isActive,
  portfolioTotals,
  statusCounts,
  topByCost,
} from "@/lib/metrics";
import { quadrantPosition, verdictFor } from "@/lib/verdict";
import type { Initiative } from "@/lib/types";
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

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

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
  const initiatives = useLedgerStore((s) => s.initiatives);
  const departments = useLedgerStore((s) => s.departments);
  const [measuredOnly, setMeasuredOnly] = useState(false);
  const animate = !prefersReducedMotion();

  // The one theatrical control: flipping this drains every unmeasured number
  // out of the totals below.
  const visible = useMemo(
    () =>
      measuredOnly
        ? initiatives.filter((i) => i.confidence === "High")
        : initiatives,
    [initiatives, measuredOnly]
  );

  const totals = useMemo(
    () => portfolioTotals(initiatives, { measuredOnly }),
    [initiatives, measuredOnly]
  );
  const funnel = useMemo(() => {
    const counts = statusCounts(visible);
    return FUNNEL_STATUSES.map((status) => ({ status, count: counts[status] }));
  }, [visible]);
  const confidenceMix = useMemo(() => confidenceCostMix(visible), [visible]);
  const budgets = useMemo(() => departmentSpend(departments, visible), [departments, visible]);
  const top5 = useMemo(() => topByCost(visible, 5), [visible]);

  const quadrantInitiatives = useMemo(() => visible.filter(isActive), [visible]);
  const quadrantPoints = useMemo<QuadrantPoint[]>(
    () =>
      quadrantInitiatives.map((i) => {
        const cost = effectiveMonthlyCost(i);
        return {
          id: i.id,
          name: `${i.name} — ${formatEur(cost)}/mo · value ${i.perceivedValue}/5`,
          ...quadrantPosition(i.perceivedValue, cost, i.buildEffort),
          verdict: verdictFor(i.perceivedValue, cost, i.buildEffort),
          measured: i.confidence === "High",
        };
      }),
    [quadrantInitiatives]
  );
  const traps = useMemo(
    () =>
      quadrantInitiatives.filter(
        (i) => verdictFor(i.perceivedValue, effectiveMonthlyCost(i), i.buildEffort) === "trap"
      ),
    [quadrantInitiatives]
  );
  const reconciled = useMemo(
    () => initiatives.filter(isActive).filter((i) => i.actuals),
    [initiatives]
  );

  if (initiatives.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-24 text-center">
        <p className="text-lg font-medium">No initiatives yet</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Add your first AI initiative in the Ledger, or reset the demo data from the footer.
        </p>
      </div>
    );
  }

  const donutData = confidenceMix.filter((d) => d.cost > 0);

  return (
    <div className="space-y-6">
      {/* The Measured toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-display text-2xl">Portfolio</div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {measuredOnly
              ? "Only entries backed by bills or logs are counted."
              : "Claims and measurements, blended — flip the toggle to see only what is proven."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={measuredOnly}
          onClick={() => setMeasuredOnly((v) => !v)}
          className={cn(
            "flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
            measuredOnly
              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
              : "border-border bg-card text-foreground hover:bg-accent/50"
          )}
        >
          Show only what's measured
          <span
            className={cn(
              "relative h-5 w-9 rounded-full transition-colors",
              measuredOnly ? "bg-emerald-500" : "bg-secondary"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-4 w-4 rounded-full bg-background transition-all",
                measuredOnly ? "left-[18px]" : "left-0.5"
              )}
            />
          </span>
        </button>
      </div>

      {/* Hero stat row */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardDescription>Cost per Hour Saved</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-5xl font-bold tracking-tight",
                measuredOnly && "text-emerald-400"
              )}
            >
              {totals.costPerHourSaved === null ? (
                "—"
              ) : (
                <>
                  {!measuredOnly && "≈ "}
                  <AnimatedNumber value={totals.costPerHourSaved} format={formatEurPrecise} />
                </>
              )}
            </div>
            <p className="mt-2 text-xs">
              {measuredOnly ? (
                <span className="text-emerald-400">Measured entries only</span>
              ) : totals.measuredShare === null ? (
                <span className="text-muted-foreground">No active spend yet</span>
              ) : (
                <span className="text-emerald-400">
                  Measured share:{" "}
                  <AnimatedNumber
                    value={totals.measuredShare}
                    format={(n) => `${n.toFixed(0)}%`}
                  />{" "}
                  of monthly spend
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
            <div className="text-3xl font-bold tracking-tight">
              <AnimatedNumber value={totals.monthlyCost} format={formatEur} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              <AnimatedNumber value={totals.annualCost} format={formatEur} /> annualised
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Hours Saved / Month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              <AnimatedNumber value={totals.hoursSaved} format={formatNumber} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              across {totals.activeCount} active initiatives
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Impacted Users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              <AnimatedNumber value={totals.impactedUsers} format={formatNumber} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">non-stopped initiatives only</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Value vs cost quadrant */}
        <Card>
          <CardHeader>
            <CardTitle>Value against cost and effort</CardTitle>
            <CardDescription>
              Is the spend buying throughput, experience, or nothing?
            </CardDescription>
          </CardHeader>
          <CardContent>
            {quadrantPoints.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                No active initiatives to plot.
              </div>
            ) : (
              <>
                <QuadrantPlot points={quadrantPoints} />
                {traps.length > 0 && (
                  <div className="mt-4 space-y-1.5 border-t border-border/60 pt-3">
                    {traps.map((t) => (
                      <div key={t.id} className="flex items-baseline gap-2 text-xs">
                        <VerdictBadge verdict="trap" />
                        <span className="font-medium">{t.name}</span>
                        <span aria-hidden className="flex-1 -translate-y-0.5 border-b border-dotted border-zinc-700" />
                        <span className="tabular-nums text-amber-400">
                          {formatEur(effectiveMonthlyCost(t))}/mo · value {t.perceivedValue}/5
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-3 text-xs text-muted-foreground">
                  Based on your inputs — a prompt for judgment, not a verdict from on high.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Estimate vs actual */}
        <Card>
          <CardHeader>
            <CardTitle>Estimate against reality</CardTitle>
            <CardDescription>Where actuals exist, the claim meets the bill</CardDescription>
          </CardHeader>
          <CardContent>
            {reconciled.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center text-center text-sm text-muted-foreground">
                <p>No actuals recorded yet.</p>
                <p className="mt-1">
                  Use “Record actuals” on a ledger entry to see estimate vs reality here.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {reconciled.map((i) => (
                  <ReconciliationRow key={i.id} initiative={i} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Status funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Adoption funnel</CardTitle>
            <CardDescription>Initiatives by lifecycle stage</CardDescription>
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
                        formatter={(e) =>
                          `${e.payload?.status}: ${e.value} initiative${e.value === 1 ? "" : "s"}`
                        }
                      />
                    }
                  />
                  <Bar
                    dataKey="count"
                    radius={[4, 4, 4, 4]}
                    barSize={22}
                    isAnimationActive={animate}
                    animationDuration={700}
                  >
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
                            formatter={(e) => `${e.name}: ${formatEur(e.value ?? 0)} / month`}
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
                        isAnimationActive={animate}
                        animationDuration={700}
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
                        entry.confidence === "Low" &&
                          "border border-dashed border-zinc-500 bg-transparent"
                      )}
                      style={
                        entry.confidence === "Low"
                          ? undefined
                          : { backgroundColor: CONFIDENCE_COLORS[entry.confidence] }
                      }
                    />
                    <span className="w-16 text-muted-foreground">{entry.confidence}</span>
                    <span className="font-medium tabular-nums">
                      <AnimatedNumber value={entry.cost} format={formatEur} />
                    </span>
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
                    <AnimatedNumber value={spend} format={formatEur} /> /{" "}
                    {formatEur(department.monthlyBudget)}
                    {overBudget && " · over budget"}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700 motion-reduce:transition-none",
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
            <CardTitle>Top initiatives by cost</CardTitle>
            <CardDescription>Five biggest monthly line items</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border/60">
              {top5.map((i) => {
                const cph = costPerHourSaved(i);
                const measured = i.confidence === "High";
                return (
                  <div
                    key={i.id}
                    className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{i.name}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{i.department}</span>
                        <StatusBadge status={i.status} />
                        <ConfidenceBadge confidence={i.confidence} />
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-semibold tabular-nums">
                        {!measured && "≈ "}
                        {formatEur(effectiveMonthlyCost(i))}
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

/** One reconciled initiative: the claim, the band if one was simulated, and the bill. */
function ReconciliationRow({ initiative }: { initiative: Initiative }) {
  const actuals = initiative.actuals!;
  const band = initiative.estimate?.band;
  const delta = actualsCostDelta(initiative);
  const scaleMax =
    Math.max(band?.badDay ?? 0, initiative.expectedMonthlyCost, actuals.monthlyCost) * 1.08;
  const pos = (v: number) => `${Math.min(100, (v / scaleMax) * 100)}%`;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{initiative.name}</span>
        {delta !== null && (
          <span
            className={cn(
              "text-xs tabular-nums",
              delta <= 0 ? "text-emerald-400" : "text-amber-400"
            )}
          >
            {Math.abs(delta * 100).toFixed(0)}% {delta <= 0 ? "under" : "over"} estimate
          </span>
        )}
      </div>
      <div className="relative mt-2 h-2 rounded-full bg-secondary">
        {band && (
          <div
            className="absolute inset-y-0 rounded-full bg-amber-500/20"
            style={{ left: pos(band.expected), right: `calc(100% - ${pos(band.badDay)})` }}
            title={`Simulated band: ≈${formatEur(band.expected)} to ≈${formatEur(band.badDay)}`}
          />
        )}
        <div
          className="absolute top-1/2 h-3.5 w-0.5 -translate-y-1/2 bg-zinc-400"
          style={{ left: pos(initiative.expectedMonthlyCost) }}
          title={`Estimated ≈${formatEur(initiative.expectedMonthlyCost)}/mo`}
        />
        <div
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500 ring-2 ring-background"
          style={{ left: pos(actuals.monthlyCost) }}
          title={`Measured ${formatEur(actuals.monthlyCost)}/mo`}
        />
      </div>
      <div className="mt-1.5 flex items-baseline justify-between text-xs text-muted-foreground">
        <span>
          Estimated ≈{formatEur(initiative.expectedMonthlyCost)}/mo → measured{" "}
          <span className="font-medium text-emerald-400">{formatEur(actuals.monthlyCost)}/mo</span>
        </span>
        <span className="tabular-nums">
          {formatNumber(actuals.hoursSavedPerMonth)} h/mo measured (claimed{" "}
          {formatNumber(hoursSavedPerMonth(initiative))})
        </span>
      </div>
    </div>
  );
}
