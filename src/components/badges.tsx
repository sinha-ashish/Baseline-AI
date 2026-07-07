import { Badge } from "@/components/ui/badge";
import type { Confidence, Status } from "@/lib/types";
import { VERDICT_META, type Verdict } from "@/lib/verdict";

/**
 * Confidence is the product's core visual system: measured facts are solid
 * emerald, pilot data is solid neutral, assumptions are dashed and ghosted.
 */
export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  if (confidence === "High")
    return (
      <Badge variant="emerald" title="Measured — backed by bills or logs">
        High
      </Badge>
    );
  if (confidence === "Medium")
    return (
      <Badge
        variant="outline"
        className="border-zinc-500/60 bg-zinc-500/10 text-zinc-300"
        title="Pilot data — partially observed"
      >
        Medium
      </Badge>
    );
  return (
    <Badge variant="muted" title="Assumption — a simulated or claimed number">
      Low
    </Badge>
  );
}

/** Whether a figure derived from this entry should read as an estimate (≈). */
export function isUnmeasured(confidence: Confidence): boolean {
  return confidence !== "High";
}

// Lifecycle stages as a neutral intensity ramp — colour is reserved for
// measured (emerald) and caution (amber), not for status decoration.
const statusStyles: Record<Status, string> = {
  Idea: "border-dashed border-zinc-700 text-zinc-500",
  POC: "border-zinc-700 bg-zinc-800/40 text-zinc-400",
  Pilot: "border-zinc-600 bg-zinc-700/40 text-zinc-300",
  Production: "border-zinc-400/50 bg-zinc-400/10 text-zinc-100",
  Stopped: "border-zinc-700 text-zinc-500 line-through decoration-zinc-500/70",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge variant="outline" className={statusStyles[status]}>
      {status}
    </Badge>
  );
}

const verdictStyles: Record<Verdict, string> = {
  "quick-win": "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  "strategic-bet": "border-zinc-400/50 bg-zinc-400/10 text-zinc-100",
  filler: "border-zinc-600 bg-zinc-800/40 text-zinc-400",
  trap: "border-amber-500/30 bg-amber-500/10 text-amber-400",
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return (
    <Badge variant="outline" className={verdictStyles[verdict]} title={VERDICT_META[verdict].line}>
      {VERDICT_META[verdict].label}
    </Badge>
  );
}
