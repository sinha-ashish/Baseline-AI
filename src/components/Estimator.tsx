import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
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
import { useLedgerStore } from "@/store";
import { cn, formatEur, formatNumber } from "@/lib/utils";
import {
  DEFAULT_BAD_DAY_MULTIPLIER,
  DEFAULT_BUSY_MULTIPLIER,
  SIZING_PRESETS,
  computeEstimate,
  type Volume,
} from "@/lib/estimator";
import { MODEL_PRICES, getModelPrice, pricesAsOf, usdToEur } from "@/lib/pricing";
import type { UseCase } from "@/lib/types";

type PresetId = "short" | "session" | "heavy" | "custom";

function parsePositive(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function Estimator() {
  const departments = useLedgerStore((s) => s.departments);
  const addUseCase = useLedgerStore((s) => s.addUseCase);
  const setHighlight = useLedgerStore((s) => s.setHighlight);

  // Step 1 — describe
  const [name, setName] = useState("");
  const [department, setDepartment] = useState(departments[0]?.name ?? "");
  const [owner, setOwner] = useState("");
  const [kind, setKind] = useState<"user-driven" | "system-driven">("user-driven");

  // Step 2 — size
  const [users, setUsers] = useState("");
  const [interactions, setInteractions] = useState("");
  const [runs, setRuns] = useState("");
  const [items, setItems] = useState("");
  const [callsPerItem, setCallsPerItem] = useState("1");
  const [presetId, setPresetId] = useState<PresetId>("session");
  const [customIn, setCustomIn] = useState("4000");
  const [customOut, setCustomOut] = useState("1000");

  // Step 3 — engine
  const [modelId, setModelId] = useState("claude-sonnet-4-5");

  // Band multipliers
  const [busyMult, setBusyMult] = useState(String(DEFAULT_BUSY_MULTIPLIER));
  const [badMult, setBadMult] = useState(String(DEFAULT_BAD_DAY_MULTIPLIER));

  const [showMath, setShowMath] = useState(false);

  const unitWord = kind === "user-driven" ? "interaction" : "call";

  const tokens = useMemo(() => {
    if (presetId === "custom") {
      const tokensIn = parsePositive(customIn);
      const tokensOut = parsePositive(customOut);
      if (tokensIn === null || tokensOut === null) return null;
      return { tokensIn, tokensOut };
    }
    const preset = SIZING_PRESETS.find((p) => p.id === presetId)!;
    return { tokensIn: preset.tokensIn, tokensOut: preset.tokensOut };
  }, [presetId, customIn, customOut]);

  const volume: Volume | null = useMemo(() => {
    if (kind === "user-driven") {
      const u = parsePositive(users);
      const i = parsePositive(interactions);
      if (u === null || i === null) return null;
      return { kind, users: u, interactionsPerUserPerMonth: i };
    }
    const r = parsePositive(runs);
    const it = parsePositive(items);
    const c = parsePositive(callsPerItem);
    if (r === null || it === null || c === null) return null;
    return { kind, runsPerMonth: r, itemsPerRun: it, callsPerItem: c };
  }, [kind, users, interactions, runs, items, callsPerItem]);

  const price = getModelPrice(modelId);
  const busy = parsePositive(busyMult) ?? DEFAULT_BUSY_MULTIPLIER;
  const bad = parsePositive(badMult) ?? DEFAULT_BAD_DAY_MULTIPLIER;

  const result = useMemo(() => {
    if (!volume || !tokens || !price) return null;
    return computeEstimate(
      {
        volume,
        tokensInPerCall: tokens.tokensIn,
        tokensOutPerCall: tokens.tokensOut,
        busyMultiplier: busy,
        badDayMultiplier: bad,
      },
      price
    );
  }, [volume, tokens, price, busy, bad]);

  function addToLedger() {
    if (!result || !volume || !tokens || !price) return;
    const entry: Omit<UseCase, "id"> = {
      name: name.trim() || "Untitled use case",
      department,
      owner: owner.trim() || "Unassigned",
      status: "Idea",
      category: kind === "user-driven" ? "Gen" : "Automation",
      usagePattern: kind,
      totalUsers: volume.kind === "user-driven" ? volume.users : 0,
      timeSavedPerUserPerMonth: 0,
      expectedMonthlyCost: Math.round(result.expectedMonthlyEur),
      peakUsage: "",
      fallback: "",
      confidence: "Low",
      estimate: {
        volume,
        tokensInPerCall: tokens.tokensIn,
        tokensOutPerCall: tokens.tokensOut,
        modelId: price.id,
        modelLabel: price.label,
        busyMultiplier: busy,
        badDayMultiplier: bad,
        band: {
          expected: result.expectedMonthlyEur,
          busyMonth: result.busyMonthlyEur,
          badDay: result.badDayMonthlyEur,
        },
        pricesAsOf,
        createdAt: new Date().toISOString(),
      },
    };
    const id = addUseCase(entry);
    setHighlight(id);
    window.location.hash = "/ledger";
  }

  const canAdd = result !== null && name.trim().length > 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_minmax(340px,400px)]">
      {/* Input column */}
      <div className="space-y-8">
        <div>
          <div className="font-display text-3xl">The Estimator</div>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Price an AI use case before it is built. Three inputs, one band, the math shown in
            full — done in under two minutes.
          </p>
        </div>

        {/* 1 — Describe */}
        <section className="rounded-xl border bg-card p-6">
          <div className="font-display text-lg">1 · Describe it</div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Customer email triage"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={department} onValueChange={setDepartment}>
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
            </div>
            <div className="space-y-1.5">
              <Label>Owner</Label>
              <Input
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="Who answers for it"
              />
            </div>
          </div>

          <div className="mt-5">
            <Label>How is it used?</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              The pattern decides how volume is counted: by the people using it, or by the work
              flowing through it.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <PatternCard
                selected={kind === "user-driven"}
                onSelect={() => setKind("user-driven")}
                title="User-driven"
                text="People interact with it directly — a chatbot, an assistant, a copilot."
              />
              <PatternCard
                selected={kind === "system-driven"}
                onSelect={() => setKind("system-driven")}
                title="System-driven"
                text="It runs on files, schedules, or events — a monthly validation, an automated check."
              />
            </div>
          </div>
        </section>

        {/* 2 — Size */}
        <section className="rounded-xl border bg-card p-6">
          <div className="font-display text-lg">2 · Size it</div>
          {kind === "user-driven" ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>How many users?</Label>
                <Input
                  type="number"
                  min={0}
                  value={users}
                  onChange={(e) => setUsers(e.target.value)}
                  placeholder="e.g. 400"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Interactions per user per month</Label>
                <Input
                  type="number"
                  min={0}
                  value={interactions}
                  onChange={(e) => setInteractions(e.target.value)}
                  placeholder="e.g. 12"
                />
              </div>
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Runs per month</Label>
                <Input
                  type="number"
                  min={0}
                  value={runs}
                  onChange={(e) => setRuns(e.target.value)}
                  placeholder="e.g. 20"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Items per run</Label>
                <Input
                  type="number"
                  min={0}
                  value={items}
                  onChange={(e) => setItems(e.target.value)}
                  placeholder="e.g. 500"
                />
              </div>
              <div className="space-y-1.5">
                <Label>AI calls per item</Label>
                <Input
                  type="number"
                  min={0}
                  value={callsPerItem}
                  onChange={(e) => setCallsPerItem(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="mt-5">
            <Label>How big is each {unitWord}?</Label>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {SIZING_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setPresetId(preset.id)}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-colors",
                    presetId === preset.id
                      ? "border-emerald-500/50 bg-emerald-500/5"
                      : "border-border hover:bg-accent/50"
                  )}
                >
                  <div className="text-sm font-medium">{preset.label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{preset.description}</div>
                  <div className="mt-2 text-xs tabular-nums text-muted-foreground">
                    ≈ {formatNumber(preset.tokensIn)} in / {formatNumber(preset.tokensOut)} out
                    tokens per {unitWord}
                  </div>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setPresetId("custom")}
              className={cn(
                "mt-3 w-full rounded-lg border p-3 text-left transition-colors",
                presetId === "custom"
                  ? "border-emerald-500/50 bg-emerald-500/5"
                  : "border-border hover:bg-accent/50"
              )}
            >
              <div className="text-sm font-medium">Custom</div>
              {presetId === "custom" && (
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Input tokens per {unitWord}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={customIn}
                      onChange={(e) => setCustomIn(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Output tokens per {unitWord}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={customOut}
                      onChange={(e) => setCustomOut(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              )}
            </button>
          </div>
        </section>

        {/* 3 — Engine */}
        <section className="rounded-xl border bg-card p-6">
          <div className="font-display text-lg">3 · Pick the engine</div>
          <div className="mt-4 max-w-md space-y-1.5">
            <Label>Model</Label>
            <Select value={modelId} onValueChange={setModelId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODEL_PRICES.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label} — ${m.inputPerMTok} in / ${m.outputPerMTok} out per MTok
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Prices as of {pricesAsOf} — static list prices, verify before budgeting. Converted at
            $1 = €{usdToEur} (fixed reference rate).
          </p>
        </section>
      </div>

      {/* Result panel */}
      <div className="lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-xl border bg-card p-6">
          <div className="font-display text-lg">The number</div>
          {result === null ? (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Fill in the sizing to see a monthly cost band — expected, busy month, bad day.
            </p>
          ) : (
            <>
              <div className="mt-5 space-y-5">
                <BandRow
                  label="Expected"
                  monthly={result.expectedMonthlyEur}
                  note="The straight calculation from your inputs."
                  big
                />
                <BandRow
                  label="Busy month"
                  monthly={result.busyMonthlyEur}
                  note="If adoption spikes or usage doubles down."
                  caution
                  multiplier={
                    <MultiplierInput value={busyMult} onChange={setBusyMult} />
                  }
                />
                <BandRow
                  label="Bad day"
                  monthly={result.badDayMonthlyEur}
                  note="A retry storm, oversized inputs, or a runaway session multiplying the volume drivers."
                  caution
                  multiplier={<MultiplierInput value={badMult} onChange={setBadMult} />}
                />
              </div>

              <button
                type="button"
                onClick={() => setShowMath((v) => !v)}
                className="mt-6 flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
                aria-expanded={showMath}
              >
                How we got this
                <ChevronDown className={cn("h-4 w-4 transition-transform", showMath && "rotate-180")} />
              </button>
              {showMath && price && tokens && (
                <div className="mt-3 space-y-1.5 rounded-md bg-secondary/50 p-3 text-xs leading-relaxed text-muted-foreground">
                  <p>
                    {volume?.kind === "user-driven"
                      ? `${formatNumber(volume.users)} users × ${formatNumber(
                          volume.interactionsPerUserPerMonth
                        )} interactions`
                      : volume
                        ? `${formatNumber(volume.runsPerMonth)} runs × ${formatNumber(
                            volume.itemsPerRun
                          )} items × ${formatNumber(volume.callsPerItem)} calls`
                        : ""}{" "}
                    = {formatNumber(result.callsPerMonth)} calls/month
                  </p>
                  <p>
                    Input: {formatNumber(result.callsPerMonth)} × {formatNumber(tokens.tokensIn)}{" "}
                    tokens = {result.mTokInPerMonth.toFixed(2)} MTok × ${price.inputPerMTok} = $
                    {(result.mTokInPerMonth * price.inputPerMTok).toFixed(2)}
                  </p>
                  <p>
                    Output: {formatNumber(result.callsPerMonth)} × {formatNumber(tokens.tokensOut)}{" "}
                    tokens = {result.mTokOutPerMonth.toFixed(2)} MTok × ${price.outputPerMTok} = $
                    {(result.mTokOutPerMonth * price.outputPerMTok).toFixed(2)}
                  </p>
                  <p>
                    ${result.expectedMonthlyUsd.toFixed(2)} × €{usdToEur}/$ = €
                    {result.expectedMonthlyEur.toFixed(2)} expected per month
                  </p>
                  <p>
                    Busy month = expected × {busy}. Bad day = expected × {bad}. Cost scales
                    linearly with the volume drivers, so a multiplier on the drivers is a
                    multiplier on the total.
                  </p>
                  <p>Prices as of {pricesAsOf}.</p>
                </div>
              )}

              <Button className="mt-6 w-full" disabled={!canAdd} onClick={addToLedger}>
                Add to Ledger
              </Button>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                {canAdd
                  ? "Lands in the ledger stamped Low confidence — a simulated estimate, not a measurement."
                  : "Name the use case to add it to the ledger."}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PatternCard({
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
      <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</div>
    </button>
  );
}

function MultiplierInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      ×
      <Input
        type="number"
        min={1}
        step={0.5}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-6 w-16 px-2 text-xs"
        aria-label="Scenario multiplier"
      />
    </span>
  );
}

function BandRow({
  label,
  monthly,
  note,
  big,
  caution,
  multiplier,
}: {
  label: string;
  monthly: number;
  note: string;
  big?: boolean;
  caution?: boolean;
  multiplier?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-3">
        <span className="flex shrink-0 items-center gap-2 text-sm">
          {label}
          {multiplier}
        </span>
        <span
          aria-hidden
          className="flex-1 -translate-y-1 border-b border-dotted border-zinc-700"
        />
        <span
          className={cn(
            "shrink-0 text-right font-medium tabular-nums",
            big ? "text-2xl" : "text-base",
            caution && "text-amber-400"
          )}
        >
          ≈ {formatEur(monthly)}
          <span className="text-xs font-normal text-muted-foreground"> /mo</span>
        </span>
      </div>
      <div className="mt-0.5 flex items-baseline justify-between gap-3">
        <span className="text-xs text-muted-foreground">{note}</span>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          ≈ {formatEur(monthly * 12)} /yr
        </span>
      </div>
    </div>
  );
}
