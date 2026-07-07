import type { ReactNode } from "react";
import { useLedgerStore } from "@/store";
import {
  effectiveMonthlyCost,
  isActive,
  portfolioTotals,
  topByCost,
} from "@/lib/metrics";
import { quadrantPosition, verdictFor, VERDICT_META } from "@/lib/verdict";
import { CountUp } from "@/components/CountUp";
import { QuadrantPlot } from "@/components/QuadrantPlot";
import { formatEur, formatNumber } from "@/lib/utils";

/** A statement-style line: label, dot leader, right-aligned figure. */
function StatementRow({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-baseline gap-3 ${className ?? ""}`}>
      <span className="shrink-0">{label}</span>
      <span aria-hidden className="flex-1 -translate-y-1 border-b border-dotted border-zinc-700" />
      <span className="shrink-0 text-right">{value}</span>
    </div>
  );
}

function SectionMark({ children }: { children: ReactNode }) {
  return (
    <div className="font-display text-sm italic tracking-wide text-emerald-400/90">{children}</div>
  );
}

export function Landing() {
  const initiatives = useLedgerStore((s) => s.initiatives);
  const totals = portfolioTotals(initiatives);
  const measured = portfolioTotals(initiatives, { measuredOnly: true });
  const trackGlimpse = topByCost(initiatives, 3);
  const active = initiatives.filter(isActive);
  const measuredCount = active.filter((i) => i.confidence === "High").length;

  // The estimate-stage glimpse: a real initiative from the live portfolio,
  // plotted on the verdict quadrant.
  const glimpse =
    active.find(
      (i) => verdictFor(i.perceivedValue, effectiveMonthlyCost(i), i.buildEffort) === "quick-win"
    ) ?? active[0];
  const glimpseVerdict = glimpse
    ? verdictFor(glimpse.perceivedValue, effectiveMonthlyCost(glimpse), glimpse.buildEffort)
    : null;

  return (
    <div className="mx-auto max-w-6xl px-6">
      {/* 1 — The tension, 2 — The thesis */}
      <section className="border-b border-border/60 py-20 sm:py-28">
        <p className="text-sm font-medium text-amber-400/90">
          Most AI ROI numbers are guesses wearing suits.
        </p>
        <h1 className="mt-5 max-w-3xl font-display text-5xl font-medium leading-[1.05] tracking-tight sm:text-6xl">
          Know what your AI is worth.
          <br />
          <span className="text-muted-foreground">Not just what it costs.</span>
        </h1>
        <p className="mt-7 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Enterprises greenlight AI on optimistic estimates. When finance asks what it is actually
          worth, most teams have a guess and a shrug — and half of what got built saves hours
          nobody actually feels. Baseline puts a confidence label on every cost and moves it from
          guessed to measured. And because value is not just hours saved — the feature that makes
          a product feel smart can matter more than the one that automates a hundred invisible
          hours — it scores both, and tells you what is a quick win and what is a trap.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <a
            href="#/estimate"
            className="inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            Estimate an initiative
          </a>
          <a
            href="#/dashboard"
            className="inline-flex h-10 items-center rounded-md border border-input px-5 text-sm font-medium transition-colors hover:bg-accent"
          >
            Open the dashboard
          </a>
        </div>
      </section>

      {/* 3 — The lifecycle */}
      <section className="border-b border-border/60 py-16 sm:py-20">
        <SectionMark>The lifecycle of an AI cost number</SectionMark>
        <div className="mt-8 grid gap-10 lg:grid-cols-3">
          <div>
            <div className="font-display text-2xl">01 · Estimate</div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Price an initiative before it is built — a cost band, and a build-or-skip verdict
              from value against cost and effort.
            </p>
            <div className="mt-5 rounded-lg border bg-card p-4 text-sm">
              <div className="mb-2 text-xs text-muted-foreground">
                The estimator's verdict — from the live demo portfolio
              </div>
              {glimpse && glimpseVerdict && (
                <>
                  <QuadrantPlot
                    points={[
                      {
                        id: glimpse.id,
                        name: glimpse.name,
                        ...quadrantPosition(
                          glimpse.perceivedValue,
                          effectiveMonthlyCost(glimpse),
                          glimpse.buildEffort
                        ),
                        verdict: glimpseVerdict,
                      },
                    ]}
                    highlightId={glimpse.id}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    {glimpse.name}: {VERDICT_META[glimpseVerdict].label} —{" "}
                    {VERDICT_META[glimpseVerdict].line}
                  </p>
                </>
              )}
            </div>
          </div>
          <div>
            <div className="font-display text-2xl">02 · Track</div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Every initiative is a ledger line: cost, hours saved, owner, budget. Stopped items
              drop out of the totals.
            </p>
            <div className="mt-5 rounded-lg border bg-card p-4 text-sm">
              <div className="mb-3 text-xs text-muted-foreground">From the live demo portfolio</div>
              <div className="space-y-2">
                {trackGlimpse.map((i) => (
                  <StatementRow
                    key={i.id}
                    label={i.name}
                    value={`${formatEur(effectiveMonthlyCost(i))} /mo`}
                    className="min-w-0 [&>span:first-child]:truncate"
                  />
                ))}
              </div>
            </div>
          </div>
          <div>
            <div className="font-display text-2xl">03 · Reconcile</div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Record what it actually cost and saved. The entry flips from guessed to measured —
              and the portfolio gets honest.
            </p>
            <div className="mt-5 rounded-lg border bg-card p-4 text-sm">
              <div className="mb-3 text-xs text-muted-foreground">From the live demo portfolio</div>
              <div className="space-y-2">
                <StatementRow
                  label="Measured share of spend"
                  value={
                    <span className="font-medium text-emerald-400">
                      {totals.measuredShare === null ? "—" : `${totals.measuredShare.toFixed(0)}%`}
                    </span>
                  }
                />
                <StatementRow
                  label="Entries backed by bills or logs"
                  value={`${measuredCount} of ${active.length}`}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4 — The proof */}
      <section className="border-b border-border/60 py-16 sm:py-20">
        <SectionMark>The gap is the argument</SectionMark>
        <div className="mt-8 max-w-2xl space-y-4 text-lg sm:text-xl">
          <StatementRow
            label="Claimed savings"
            value={
              <CountUp
                value={totals.hoursSaved}
                format={(n) => `${formatNumber(n)} h/mo`}
                className="font-medium"
              />
            }
          />
          <StatementRow
            label="Measured savings"
            value={
              <CountUp
                value={measured.hoursSaved}
                format={(n) => `${formatNumber(n)} h/mo`}
                delayMs={500}
                className="font-medium text-emerald-400"
              />
            }
          />
        </div>
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Only savings carried by measured entries count as proof. Baseline shows the gap instead
          of hiding it — that is the point.
        </p>
      </section>

      {/* 5 — The roadmap */}
      <section className="border-b border-border/60 py-16 sm:py-20">
        <SectionMark>Roadmap</SectionMark>
        <div className="mt-8 max-w-2xl space-y-4 text-sm sm:text-base">
          <StatementRow
            label="Simulate — price an initiative before it exists"
            value={<span className="text-emerald-400">live</span>}
          />
          <StatementRow
            label="Track & reconcile — the ledger and measured actuals"
            value={<span className="text-emerald-400">live</span>}
          />
          <StatementRow
            label="Live usage feeds from enterprise tools"
            value={<span className="text-muted-foreground">planned</span>}
          />
        </div>
      </section>

      {/* 6 — Provenance */}
      <section className="py-10">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Built as the working extension of an AI use-case governance methodology developed for
          enterprise portfolio management.
        </p>
      </section>
    </div>
  );
}
