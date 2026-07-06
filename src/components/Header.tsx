import { cn } from "@/lib/utils";

const navItems = [
  { route: "estimate", label: "Estimate" },
  { route: "ledger", label: "Ledger" },
  { route: "dashboard", label: "Dashboard" },
] as const;

export function Header({ route }: { route: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <a href="#/" className="flex items-center gap-2.5 text-sm font-semibold">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/15">
            <svg viewBox="0 0 32 32" className="h-4 w-4 text-emerald-400" fill="none">
              <path
                d="M8 24V15M14 24V9M20 24v-7M26 24v-4"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </span>
          Baseline
          <span className="hidden text-xs font-normal text-muted-foreground sm:inline">
            — the AI ROI ledger
          </span>
        </a>
        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <a
              key={item.route}
              href={`#/${item.route}`}
              aria-current={route === item.route ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                route === item.route
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
