import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useLedgerStore } from "@/store";
import {
  CATEGORIES,
  CONFIDENCES,
  STATUSES,
  USAGE_PATTERNS,
  type Initiative,
} from "@/lib/types";
import {
  BUILD_EFFORTS,
  EFFORT_HINTS,
  PERCEIVED_VALUES,
  VALUE_ANCHORS,
  type BuildEffort,
  type PerceivedValue,
} from "@/lib/verdict";

interface FormState {
  name: string;
  department: string;
  owner: string;
  status: string;
  category: string;
  usagePattern: string;
  totalUsers: string;
  timeSavedPerUserPerMonth: string;
  expectedMonthlyCost: string;
  peakUsage: string;
  fallback: string;
  confidence: string;
  perceivedValue: string;
  buildEffort: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

function emptyForm(defaultDepartment: string): FormState {
  return {
    name: "",
    department: defaultDepartment,
    owner: "",
    status: "Idea",
    category: "Gen",
    usagePattern: "user-driven",
    totalUsers: "",
    timeSavedPerUserPerMonth: "",
    expectedMonthlyCost: "",
    peakUsage: "",
    fallback: "",
    confidence: "Low",
    perceivedValue: "3",
    buildEffort: "M",
  };
}

function fromInitiative(initiative: Initiative): FormState {
  return {
    name: initiative.name,
    department: initiative.department,
    owner: initiative.owner,
    status: initiative.status,
    category: initiative.category,
    usagePattern: initiative.usagePattern,
    totalUsers: String(initiative.totalUsers),
    timeSavedPerUserPerMonth: String(initiative.timeSavedPerUserPerMonth),
    expectedMonthlyCost: String(initiative.expectedMonthlyCost),
    peakUsage: initiative.peakUsage,
    fallback: initiative.fallback,
    confidence: initiative.confidence,
    perceivedValue: String(initiative.perceivedValue),
    buildEffort: initiative.buildEffort,
  };
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = "Name is required.";
  if (!form.owner.trim()) errors.owner = "Owner is required.";

  const users = Number(form.totalUsers);
  if (form.totalUsers.trim() === "" || !Number.isFinite(users) || users < 0 || !Number.isInteger(users)) {
    errors.totalUsers = "Enter a whole number of users (0 or more).";
  }

  const hours = Number(form.timeSavedPerUserPerMonth);
  if (form.timeSavedPerUserPerMonth.trim() === "" || !Number.isFinite(hours) || hours < 0) {
    errors.timeSavedPerUserPerMonth = "Enter hours saved (0 or more).";
  }

  const cost = Number(form.expectedMonthlyCost);
  if (form.expectedMonthlyCost.trim() === "" || !Number.isFinite(cost) || cost < 0) {
    errors.expectedMonthlyCost = "Enter a monthly cost in EUR (0 or more).";
  }

  return errors;
}

export function InitiativeFormSheet({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Initiative | null;
}) {
  const departments = useLedgerStore((s) => s.departments);
  const addInitiative = useLedgerStore((s) => s.addInitiative);
  const updateInitiative = useLedgerStore((s) => s.updateInitiative);

  const defaultDepartment = departments[0]?.name ?? "";
  const [form, setForm] = useState<FormState>(() => emptyForm(defaultDepartment));
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (open) {
      setForm(editing ? fromInitiative(editing) : emptyForm(defaultDepartment));
      setErrors({});
    }
  }, [open, editing, defaultDepartment]);

  const set = (key: keyof FormState) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    // estimate and actuals are deliberately not form fields — updates merge,
    // so they survive edits untouched.
    const payload: Omit<Initiative, "id"> = {
      name: form.name.trim(),
      department: form.department,
      owner: form.owner.trim(),
      status: form.status as Initiative["status"],
      category: form.category as Initiative["category"],
      usagePattern: form.usagePattern as Initiative["usagePattern"],
      totalUsers: Number(form.totalUsers),
      timeSavedPerUserPerMonth: Number(form.timeSavedPerUserPerMonth),
      expectedMonthlyCost: Number(form.expectedMonthlyCost),
      peakUsage: form.peakUsage.trim(),
      fallback: form.fallback.trim(),
      confidence: form.confidence as Initiative["confidence"],
      perceivedValue: Number(form.perceivedValue) as PerceivedValue,
      buildEffort: form.buildEffort as BuildEffort,
    };

    if (editing) {
      updateInitiative(editing.id, payload);
    } else {
      addInitiative(payload);
    }
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{editing ? "Edit initiative" : "Add initiative"}</SheetTitle>
          <SheetDescription>
            {editing
              ? "Update the details of this AI initiative."
              : "Record a new AI initiative in the ledger."}
          </SheetDescription>
        </SheetHeader>

        {editing?.estimate && (
          <div className="space-y-1 rounded-md border border-dashed border-zinc-700 bg-secondary/40 p-3 text-xs leading-relaxed text-muted-foreground">
            <div className="font-medium text-foreground">
              Original estimate — {editing.estimate.engineLabel},{" "}
              {new Date(editing.estimate.createdAt).toLocaleDateString("en-IE", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>
            <p>
              Expected ≈€{Math.round(editing.estimate.band.expected).toLocaleString("en-IE")} ·
              busy month ≈€{Math.round(editing.estimate.band.busyMonth).toLocaleString("en-IE")} ·
              bad day ≈€{Math.round(editing.estimate.band.badDay).toLocaleString("en-IE")} per
              month.
            </p>
            <p>
              {editing.estimate.volume.kind === "user-driven"
                ? `${editing.estimate.volume.users} users × ${editing.estimate.volume.interactionsPerUserPerMonth} interactions/month`
                : `${editing.estimate.volume.runsPerMonth} runs × ${editing.estimate.volume.itemsPerRun} items × ${editing.estimate.volume.callsPerItem} calls`}
              , {editing.estimate.tokensInPerCall.toLocaleString("en-IE")} in /{" "}
              {editing.estimate.tokensOutPerCall.toLocaleString("en-IE")} out tokens per call.
              Prices as of {editing.estimate.pricesAsOf}.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4">
          <Field label="Name" error={errors.name}>
            <Input
              value={form.name}
              onChange={(e) => set("name")(e.target.value)}
              placeholder="e.g. Contract clause extraction"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Department">
              <Select value={form.department} onValueChange={set("department")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.name} value={d.name}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Owner" error={errors.owner}>
              <Input
                value={form.owner}
                onChange={(e) => set("owner")(e.target.value)}
                placeholder="e.g. Lena Hoffmann"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Status">
              <Select value={form.status} onValueChange={set("status")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Category">
              <Select value={form.category} onValueChange={set("category")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Usage pattern">
              <Select value={form.usagePattern} onValueChange={set("usagePattern")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USAGE_PATTERNS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Confidence">
              <Select value={form.confidence} onValueChange={set("confidence")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONFIDENCES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Perceived value (your judgment)">
              <Select value={form.perceivedValue} onValueChange={set("perceivedValue")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERCEIVED_VALUES.map((v) => (
                    <SelectItem key={v} value={String(v)}>
                      {v} — {VALUE_ANCHORS[v]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Build effort (rough)">
              <Select value={form.buildEffort} onValueChange={set("buildEffort")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUILD_EFFORTS.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e} — {EFFORT_HINTS[e]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Total users" error={errors.totalUsers}>
              <Input
                type="number"
                min={0}
                step={1}
                value={form.totalUsers}
                onChange={(e) => set("totalUsers")(e.target.value)}
                placeholder="e.g. 120"
              />
            </Field>
            <Field label="Time saved / user / month (h)" error={errors.timeSavedPerUserPerMonth}>
              <Input
                type="number"
                min={0}
                step={0.25}
                value={form.timeSavedPerUserPerMonth}
                onChange={(e) => set("timeSavedPerUserPerMonth")(e.target.value)}
                placeholder="e.g. 2.5"
              />
            </Field>
          </div>

          <Field label="Expected monthly cost (EUR)" error={errors.expectedMonthlyCost}>
            <Input
              type="number"
              min={0}
              step={50}
              value={form.expectedMonthlyCost}
              onChange={(e) => set("expectedMonthlyCost")(e.target.value)}
              placeholder="e.g. 1400"
            />
          </Field>

          <Field label="Peak usage">
            <Input
              value={form.peakUsage}
              onChange={(e) => set("peakUsage")(e.target.value)}
              placeholder="e.g. Month-end close"
            />
          </Field>

          <Field label="Fallback if unavailable">
            <Input
              value={form.fallback}
              onChange={(e) => set("fallback")(e.target.value)}
              placeholder="e.g. Manual review"
            />
          </Field>

          <SheetFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{editing ? "Save changes" : "Add initiative"}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
