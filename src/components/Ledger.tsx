import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Pencil, Plus, Trash2 } from "lucide-react";
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
import { ConfidenceBadge, StatusBadge } from "@/components/badges";
import { UseCaseFormSheet } from "@/components/UseCaseForm";
import { useLedgerStore } from "@/store";
import { CONFIDENCES, STATUSES, type UseCase } from "@/lib/types";
import { costPerHourSaved, hoursSavedPerMonth } from "@/lib/metrics";
import { downloadCsv, useCasesToCsv } from "@/lib/csv";
import { cn, formatEur, formatEurPrecise, formatNumber } from "@/lib/utils";

const ALL = "all";

type SortKey = "cost" | "costPerHour" | null;
type SortDir = "asc" | "desc";

export function Ledger() {
  const useCases = useLedgerStore((s) => s.useCases);
  const departments = useLedgerStore((s) => s.departments);
  const deleteUseCase = useLedgerStore((s) => s.deleteUseCase);

  const [departmentFilter, setDepartmentFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [confidenceFilter, setConfidenceFilter] = useState(ALL);
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UseCase | null>(null);
  const [pendingDelete, setPendingDelete] = useState<UseCase | null>(null);

  const filtered = useMemo(() => {
    let rows = useCases.filter(
      (uc) =>
        (departmentFilter === ALL || uc.department === departmentFilter) &&
        (statusFilter === ALL || uc.status === statusFilter) &&
        (confidenceFilter === ALL || uc.confidence === confidenceFilter)
    );
    if (sortKey) {
      const dir = sortDir === "asc" ? 1 : -1;
      rows = rows.slice().sort((a, b) => {
        if (sortKey === "cost") {
          return (a.expectedMonthlyCost - b.expectedMonthlyCost) * dir;
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
  }, [useCases, departmentFilter, statusFilter, confidenceFilter, sortKey, sortDir]);

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

  function openEdit(uc: UseCase) {
    setEditing(uc);
    setFormOpen(true);
  }

  function exportCsv() {
    downloadCsv("baseline-ai-ledger.csv", useCasesToCsv(filtered));
  }

  const hasAny = useCases.length > 0;
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
            <Plus /> Add use case
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-base font-medium">
              {hasAny && hasFilters ? "No use cases match these filters" : "The ledger is empty"}
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {hasAny && hasFilters
                ? "Try clearing a filter, or add a new use case."
                : "Add your first AI use case to start tracking cost against time saved."}
            </p>
            <Button className="mt-4" size="sm" onClick={openAdd}>
              <Plus /> Add use case
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Use case</TableHead>
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
                <TableHead className="w-20 pr-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((uc) => {
                const cph = costPerHourSaved(uc);
                const stopped = uc.status === "Stopped";
                return (
                  <TableRow key={uc.id} className={cn(stopped && "opacity-55")}>
                    <TableCell className="pl-4">
                      <div className="font-medium">{uc.name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {uc.owner} · {uc.category} · {uc.usagePattern}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{uc.department}</TableCell>
                    <TableCell>
                      <StatusBadge status={uc.status} />
                    </TableCell>
                    <TableCell>
                      <ConfidenceBadge confidence={uc.confidence} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(uc.totalUsers)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(hoursSavedPerMonth(uc))}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatEur(uc.expectedMonthlyCost)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {cph === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        formatEurPrecise(cph)
                      )}
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => openEdit(uc)}
                          aria-label={`Edit ${uc.name}`}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-400"
                          onClick={() => setPendingDelete(uc)}
                          aria-label={`Delete ${uc.name}`}
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
        {filtered.length} of {useCases.length} use cases shown
        {hasFilters ? " (filtered)" : ""} · Stopped use cases are excluded from portfolio totals.
      </p>

      <UseCaseFormSheet open={formOpen} onOpenChange={setFormOpen} editing={editing} />

      {/* Delete confirmation */}
      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete use case?</DialogTitle>
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
                if (pendingDelete) deleteUseCase(pendingDelete.id);
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
