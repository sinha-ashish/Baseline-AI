import { Badge } from "@/components/ui/badge";
import type { Confidence, Status } from "@/lib/types";

/** Confidence gets a distinct treatment per level: emerald = High, amber = Medium, dashed muted = Low. */
export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  if (confidence === "High") return <Badge variant="emerald">High</Badge>;
  if (confidence === "Medium") return <Badge variant="amber">Medium</Badge>;
  return <Badge variant="muted">Low</Badge>;
}

const statusStyles: Record<Status, string> = {
  Idea: "border-zinc-700 bg-zinc-800/60 text-zinc-300",
  POC: "border-sky-500/30 bg-sky-500/10 text-sky-400",
  Pilot: "border-violet-500/30 bg-violet-500/10 text-violet-400",
  Production: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  Stopped: "border-red-500/30 bg-red-500/10 text-red-400 line-through decoration-red-400/50",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge variant="outline" className={statusStyles[status]}>
      {status}
    </Badge>
  );
}
