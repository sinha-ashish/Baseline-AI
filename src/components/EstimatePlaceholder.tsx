export function EstimatePlaceholder() {
  return (
    <div className="mx-auto max-w-2xl py-16">
      <div className="font-display text-3xl">The Estimator</div>
      <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
        The Estimator prices an AI use case before it is built: describe it, size the usage, pick a
        model, and get a monthly cost as a band — expected, busy month, bad day — with the math
        shown in full. Estimates land in the ledger stamped Low confidence, ready to be measured.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        This room is next on the roadmap and is not built yet. The ledger and dashboard are fully
        working.
      </p>
      <div className="mt-8 flex gap-3">
        <a
          href="#/ledger"
          className="inline-flex h-9 items-center rounded-md border border-input px-4 text-sm font-medium transition-colors hover:bg-accent"
        >
          Browse the ledger
        </a>
        <a
          href="#/dashboard"
          className="inline-flex h-9 items-center rounded-md border border-input px-4 text-sm font-medium transition-colors hover:bg-accent"
        >
          Open the dashboard
        </a>
      </div>
    </div>
  );
}
