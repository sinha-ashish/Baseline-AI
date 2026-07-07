# Baseline AI

Know what your AI is worth. Not just what it costs.

Baseline is a suite for enterprise AI economics covering the full lifecycle of an AI cost
number — **Estimate → Track → Reconcile** — and the judgment call that comes before all of
it: what's worth building. Every figure carries a confidence label (Low = assumption,
Medium = pilot data, High = measured), and the product refuses to show a number without
telling you how much to trust it.

## The suite

- **The Estimator** prices an AI initiative before it is built: size the usage with
  transparent token presets, pick a model — or "let the gateway decide" with an adjustable
  cheap/premium routing blend — and read the cost as a deterministic scenario band
  (expected / busy month / bad day) with the arithmetic shown in full. Perceived value
  (1–5) and build effort (S/M/L) produce a plain-language verdict on a 2×2: Quick win,
  Strategic bet, Filler, or Trap. One click lands it in the Ledger stamped Low confidence.
  A "view as workflow" second lens renders the same estimate as a cost flow; named
  scenario projects can be kept side by side.
- **The Ledger** tracks the live portfolio: cost, hours saved, owners, budgets, filters,
  sorting, CSV export. "Record actuals" flips an entry from guessed to measured and shows
  the delta against the original estimate.
- **The Dashboard** aggregates it: cost per hour saved, measured share, adoption funnel,
  confidence mix, department budgets, value-vs-cost quadrant with traps flagged,
  estimate-vs-reality reconciliation — and the "Show only what's measured" toggle that
  drains every unmeasured number out of the totals.

## Stack

- React 18 + Vite + TypeScript
- Tailwind CSS + shadcn/ui-style components (Radix primitives)
- Zustand with versioned localStorage persistence (schema v3, migrations included)
- Recharts

All cost math lives in pure, unit-tested functions in `src/lib/` (Vitest). Model pricing
is a static, dated snapshot in `src/lib/pricing.ts` — `pricesAsOf` is rendered wherever
prices appear.

## Develop

```sh
npm install
npm run dev
npm test
```

## Build & deploy

```sh
npm run build
npm run preview
```

Static Vite build — Vercel auto-detects it (`vercel`, output `dist/`).

## Notes

- No backend, no auth: data lives in the browser's localStorage.
- Portfolio totals aggregate only non-Stopped initiatives; measured figures replace
  claims wherever actuals exist.
- "Reset demo data" in the footer restores the seeded demo portfolio.
