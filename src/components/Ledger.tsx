import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ClipboardCheck,
  Download,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfidenceBadge, StatusBadge, VerdictBadge } from "@/components/badges";
import { InitiativeFormSheet } from "@/components/InitiativeForm";
import { RecordActualsDialog } from "@/components/RecordActualsDialog";
import { useLedgerStore } from "@/store";
import { CONFIDENCES, STATUSES, type Initiative } from "@/lib/types";
import {
  actualsCostDelta,
  costPerHourSaved,
  effectiveHoursSaved,
  effectiveMonthlyCost,
} from "@/lib/metrics";
import { verdictFor } from "@/lib/verdict";
import { downloadCsv, initiativesToCsv } from "@/lib/csv";
import { cn, formatEur, formatEurPrecise, formatNumber } from "@/lib/utils";

const ALL = "all";

type SortKey = "cost" | "costPerHour" | null;
type SortDir = "asc" | "desc";

export function Ledger() {
  const initiatives = useLedgerStore((s) => s.initiatives);
  const departments = useLedgerStore((s) => s.departments);
  const deleteInitiative = useLedgerStore((s) => s.deleteInitiative);
  const highlightId = useLedgerStore((s) => s.highlightId);
  const setHighlight = useLedgerStore((s) => s.setHighlight);

  // Fade the just-added-from-estimator highlight after a beat.
  useEffect(() => {
    if (!highlightId) return;
    const timer = setTimeout(() => setHighlight(null), 3500);
    return () => clearTimeout(timer);
  }, [highlightId, setHighlight]);

  const [departmentFilter, setDepartmentFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [confidenceFilter, setConfidenceFilter] = useState(ALL);
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Initiative | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Initiative | null>(null);
  const [recordingActuals, setRecordingActuals] = useState<Initiative | null>(null);

  const filtered = useMemo(() => {
    let rows = initiatives.filter(
      (i) =>
        (departmentFilter === ALL || i.department === departmentFilter) &&
        (statusFilter === ALL || i.status === statusFilter) &&
        (confidenceFilter === ALL || i.confidence === confidenceFilter)
    );
    if (sortKey) {
      const dir = sortDir === "asc" ? 1 : -1;
      rows = rows.slice().sort((a, b) => {
        if (sortKey === "cost") {
          return (effectiveMonthlyCost(a) - effectiveMonthlyCost(b)) * dir;
        }
        // Entries without a computable cost-per-hour sort to the bottom either way.
        const av = costPerHourSaved(a);
        const bv = costPerHourSaved(b);
        if (av === null && bv === null) return 0;
        if (av === null) return 1;
        if (bv === null) return -1;
        return (av - bv) * dir;
      });
    }
    return rows;
  }, [initiatives, departmentFilter, statusFilter, confidenceFilter, sortKey, sortDir]);

  function toggleSort(key: Exclude<SortKey, null>) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("desc");
    } else if (sortDir === "desc") {
      setSortDir("asc");
    } else {
      setSortKey(null);
    }
  }

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(initiative: Initiative) {
    setEditing(initiative);
    setFormOpen(true);
  }

  function exportCsv() {
    downloadCsv("baseline-ai-initiatives.csv", initiativesToCsv(filtered));
  }

  const hasAny = initiatives.length > 0;
  const hasFilters =
    departmentFilter !== ALL || statusFilter !== ALL || confidenceFilter !== ALL;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <FilterSelect
          value={departmentFilter}
          onChange={setDepartmentFilter}
          allLabel="All departments"
          options={departments.map((d) => d.name)}
        />
        <FilterSelect
          value={statusFilter}
          onChange={setStatusFilter}
          allLabel="All statuses"
          options={[...STATUSES]}
        />
        <FilterSelect
          value={confidenceFilter}
          onChange={setConfidenceFilter}
          allLabel="All confidence"
          options={[...CONFIDENCES]}
        />
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download /> Export CSV
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus /> Add initiative
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-base font-medium">
              {hasAny && hasFilters ? "No initiatives match these filters" : "The ledger is empty"}
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {hasAny && hasFilters
                ? "Try clearing a filter, or add a new initiative."
                : "Add your first AI initiative to start tracking cost against time saved."}
            </p>
            <Button className="mt-4" size="sm" onClick={openAdd}>
              <Plus /> Add initiative
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Initiative</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead className="text-right">Users</TableHead>
                <TableHead className="text-right">Hours saved / mo</TableHead>
                <SortableHead
                  label="Monthly cost"
                  active={sortKey === "cost"}
                  dir={sortDir}
                  onClick={() => toggleSort("cost")}
                />
                <SortableHead
                  label="€ / h saved"
                  active={sortKey === "costPerHour"}
                  dir={sortDir}
                  onClick={() => toggleSort("costPerHour")}
                />
                <TableHead className="w-28 pr-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((initiative) => {
                const cph = costPerHourSaved(initiative);
                const stopped = initiative.status === "Stopped";
                const measured = !!initiative.actuals;
                const unmeasured = initiative.confidence !== "High";
                const verdict = verdictFor(
                  initiative.perceivedValue,
                  initiative.expectedMonthlyCost,
                  initiative.buildEffort
                );
                const delta = actualsCostDelta(initiative);
                return (
                  <TableRow
                    key={initiative.id}
                    ref={
                      initiative.id === highlightId
                        ? (el) => el?.scrollIntoView({ block: "center" })
                        : undefined
                    }
                    className={cn(
                      stopped && "opacity-55",
                      initiative.id === highlightId &&
                        "bg-emerald-500/10 transition-colors duration-1000"
                    )}
                  >
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-2 font-medium">
                        {initiative.name}
                        {verdict === "trap" && !stopped && <VerdictBadge verdict="trap" />}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {initiative.owner} · {initiative.category} · {initiative.usagePattern} ·
                        value {initiative.perceivedValue}/5 · effort {initiative.buildEffort}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {initiative.department}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={initiative.status} />
                    </TableCell>
                    <TableCell>
                      <ConfidenceBadge confidence={initiative.confidence} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(initiative.totalUsers)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(effectiveHoursSaved(initiative))}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-medium tabular-nums",
                        initiative.confidence === "Low" && "text-zinc-400"
                      )}
                    >
                      {unmeasured && !measured && "≈ "}
                      {formatEur(effectiveMonthlyCost(initiative))}
                      {measured && delta !== null && (
                        <div className="text-xs font-normal text-muted-foreground">
                          est. ≈{formatEur(initiative.expectedMonthlyCost)} ·{" "}
                          <span className={delta <= 0 ? "text-emerald-400" : "text-amber-400"}>
                            {Math.abs(delta * 100).toFixed(0)}% {delta <= 0 ? "under" : "over"}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums",
                        initiative.confidence === "Low" && "text-zinc-400"
                      )}
                    >
                      {cph === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        `${unmeasured ? "≈ " : ""}${formatEurPrecise(cph)}`
                      )}
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-emerald-400"
                          onClick={() => setRecordingActuals(initiative)}
                          aria-label={`Record actuals for ${initiative.name}`}
                          title="Record actuals"
                        >
                          <ClipboardCheck />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => openEdit(initiative)}
                          aria-label={`Edit ${initiative.name}`}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-400"
                          onClick={() => setPendingDelete(initiative)}
                          aria-label={`Delete ${initiative.name}`}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {initiatives.length} initiatives shown
        {hasFilters ? " (filtered)" : ""} · Stopped initiatives are excluded from portfolio
        totals. Measured figures replace claims wherever actuals exist.
      </p>

      <InitiativeFormSheet open={formOpen} onOpenChange={setFormOpen} editing={editing} />
      <RecordActualsDialog
        initiative={recordingActuals}
        onClose={() => setRecordingActuals(null)}
      />

      {/* Delete confirmation */}
      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete initiative?</DialogTitle>
            <DialogDescription>
              “{pendingDelete?.name}” will be removed from the ledger. This cannot be undone
              (except by resetting the demo data).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (pendingDelete) deleteInitiative(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  allLabel,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  allLabel: string;
  options: string[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SortableHead({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <TableHead className="text-right">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground",
          active && "text-foreground"
        )}
      >
        {label}
        {active ? (
          dir === "desc" ? (
            <ArrowDown className="h-3.5 w-3.5" />
          ) : (
            <ArrowUp className="h-3.5 w-3.5" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
        )}
      </button>
    </TableHead>
  );
}
