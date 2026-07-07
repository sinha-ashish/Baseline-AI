import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLedgerStore } from "@/store";
import type { Initiative } from "@/lib/types";
import { hoursSavedPerMonth } from "@/lib/metrics";
import { cn, formatEur, formatNumber } from "@/lib/utils";

/**
 * The reconcile moment: numbers a user would pull from a bill or a log.
 * Measured quality flips confidence to High; pilot-quality numbers set Medium.
 */
export function RecordActualsDialog({
  initiative,
  onClose,
}: {
  initiative: Initiative | null;
  onClose: () => void;
}) {
  const recordActuals = useLedgerStore((s) => s.recordActuals);

  const [cost, setCost] = useState("");
  const [hours, setHours] = useState("");
  const [quality, setQuality] = useState<"measured" | "pilot">("measured");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initiative) {
      setCost(initiative.actuals ? String(initiative.actuals.monthlyCost) : "");
      setHours(initiative.actuals ? String(initiative.actuals.hoursSavedPerMonth) : "");
      setQuality(initiative.actuals?.quality ?? "measured");
      setError(null);
    }
  }, [initiative]);

  function save() {
    const costN = Number(cost);
    const hoursN = Number(hours);
    if (cost.trim() === "" || !Number.isFinite(costN) || costN < 0) {
      setError("Enter the actual monthly cost in EUR (0 or more).");
      return;
    }
    if (hours.trim() === "" || !Number.isFinite(hoursN) || hoursN < 0) {
      setError("Enter the actual hours saved per month (0 or more).");
      return;
    }
    if (!initiative) return;
    recordActuals(initiative.id, {
      monthlyCost: costN,
      hoursSavedPerMonth: hoursN,
      quality,
      recordedAt: new Date().toISOString(),
    });
    onClose();
  }

  return (
    <Dialog open={initiative !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record actuals</DialogTitle>
          <DialogDescription>
            {initiative && (
              <>
                Claimed for “{initiative.name}”: ≈{formatEur(initiative.expectedMonthlyCost)}/mo ·{" "}
                {formatNumber(hoursSavedPerMonth(initiative))} h/mo. Enter what the bill and the
                logs actually say.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Actual monthly cost (EUR)</Label>
              <Input
                type="number"
                min={0}
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="e.g. 1850"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Actual hours saved / month</Label>
              <Input
                type="number"
                min={0}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="e.g. 205"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Where do these numbers come from?</Label>
            <div className="grid gap-2">
              <QualityOption
                selected={quality === "measured"}
                onSelect={() => setQuality("measured")}
                title="Measured — bills and logs"
                text="Real invoices or usage logs. Flips confidence to High."
              />
              <QualityOption
                selected={quality === "pilot"}
                onSelect={() => setQuality("pilot")}
                title="Pilot extrapolation — early numbers"
                text="A pilot scaled up on paper. Sets confidence to Medium."
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Record actuals</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QualityOption({
  selected,
  onSelect,
  title,
  text,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  text: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "rounded-lg border p-3 text-left transition-colors",
        selected ? "border-emerald-500/50 bg-emerald-500/5" : "border-border hover:bg-accent/50"
      )}
    >
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{text}</div>
    </button>
  );
}
