import { Gauge, Scale, Wallet } from "lucide-react";

const bullets = [
  {
    icon: Scale,
    title: "One ledger for every AI use case",
    text: "Ideas, pilots and production — costs and time saved, side by side.",
  },
  {
    icon: Gauge,
    title: "ROI you can defend",
    text: "Cost per hour saved, per department, with an honest confidence label.",
  },
  {
    icon: Wallet,
    title: "Budgets that bite",
    text: "See which department is over budget before finance does.",
  },
];

export function Landing() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      {/* soft emerald glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 left-1/2 h-96 w-[52rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl"
      />
      <div className="relative mx-auto max-w-6xl px-6 pb-14 pt-16 sm:pt-20">
        <div className="flex items-center gap-2 text-sm font-medium text-emerald-400">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/15">
            <svg viewBox="0 0 32 32" className="h-4 w-4" fill="none">
              <path
                d="M8 24V15M14 24V9M20 24v-7M26 24v-4"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </span>
          Baseline AI — the AI ROI Ledger
        </div>
        <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Know what your AI is worth.{" "}
          <span className="text-muted-foreground">Not just what it costs.</span>
        </h1>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {bullets.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card">
                <Icon className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <div className="text-sm font-semibold">{title}</div>
                <div className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-10 text-xs text-muted-foreground">
          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 align-middle" />
          Built in the open — a prototype exploring how enterprises should account for AI value.
        </p>
      </div>
    </section>
  );
}
