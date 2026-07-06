# Baseline AI — the AI ROI Ledger

Know what your AI is worth. Not just what it costs.

A single-page SaaS prototype for tracking enterprise AI use cases as a ledger: expected
monthly cost against hours saved, with per-department budgets and an honest confidence
label on every estimate. No backend, no auth — all data lives in your browser's
localStorage.

## Stack

- React 18 + Vite + TypeScript
- Tailwind CSS + shadcn/ui-style components (Radix primitives)
- Zustand with localStorage persistence
- Recharts

## Develop

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
npm run preview
```

## Deploy to Vercel

The project is a static Vite build — Vercel detects it automatically:

```sh
vercel
```

(Framework preset: Vite, build command `npm run build`, output directory `dist`.)

## Notes

- Portfolio totals aggregate only non-Stopped use cases.
- "Measured share" = % of monthly cost carried by High-confidence entries.
- "Reset demo data" in the footer restores the 10 seeded use cases.
