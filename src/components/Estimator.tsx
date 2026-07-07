import { useMemo, useState } from "react";
import { ChevronDown, FolderOpen, Save, Trash2 } from "lucide-react";
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
import { QuadrantPlot } from "@/components/QuadrantPlot";
import { useLedgerStore } from "@/store";
import { cn, formatEur, formatNumber } from "@/lib/utils";
import {
  DEFAULT_BAD_DAY_MULTIPLIER,
  DEFAULT_BUSY_MULTIPLIER,
  SIZING_PRESETS,
  callsPerMonth,
  computeEstimate,
  monthlyCostUsd,
  type Volume,
} from "@/lib/estimator";
import {
  DEFAULT_CHEAP_MODEL_ID,
  DEFAULT_PREMIUM_MODEL_ID,
  DEFAULT_PREMIUM_SHARE,
  MODEL_PRICES,
  blendPrices,
  getModelPrice,
  pricesAsOf,
  usdToEur,
  type PriceRates,
} from "@/lib/pricing";
import {
  BUILD_EFFORTS,
  COST_THRESHOLDS,
  EFFORT_HINTS,
  PERCEIVED_VALUES,
  VALUE_ANCHORS,
  VERDICT_META,
  quadrantPosition,
  verdictFor,
  type BuildEffort,
  type PerceivedValue,
} from "@/lib/verdict";
import type { EstimateEngine, Initiative, ScenarioSnapshot } from "@/lib/types";

type PresetId = "short" | "session" | "heavy" | "custom";
const GATEWAY = "gateway";

function parsePositive(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function engineLabelFor(engine: EstimateEngine): string {
  if (engine.kind === "model") {
    return getModelPrice(engine.modelId)?.label ?? engine.modelId;
  }
  const cheap = getModelPrice(engine.cheapModelId)?.label ?? engine.cheapModelId;
  const premium = getModelPrice(engine.premiumModelId)?.label ?? engine.premiumModelId;
  const p = Math.round(engine.premiumShare * 100);
  return `Gateway blend — ${100 - p}% ${cheap} / ${p}% ${premium}`;
}

function ratesFor(engine: EstimateEngine): PriceRates | null {
  if (engine.kind === "model") {
    return getModelPrice(engine.modelId) ?? null;
  }
  const cheap = getModelPrice(engine.cheapModelId);
  const premium = getModelPrice(engine.premiumModelId);
  if (!cheap || !premium) return null;
  return blendPrices(cheap, premium, engine.premiumShare);
}

export function Estimator() {
  const departments = useLedgerStore((s) => s.departments);
  const addInitiative = useLedgerStore((s) => s.addInitiative);
  const setHighlight = useLedgerStore((s) => s.setHighlight);
  const projects = useLedgerStore((s) => s.projects);
  const saveScenario = useLedgerStore((s) => s.saveScenario);
  const deleteScenario = useLedgerStore((s) => s.deleteScenario);

  // 1 — describe
  const [name, setName] = useState("");
  const [department, setDepartment] = useState(departments[0]?.name ?? "");
  const [owner, setOwner] = useState("");
  const [kind, setKind] = useState<"user-driven" | "system-driven">("user-driven");

  // 2 — size
  const [users, setUsers] = useState("");
  const [interactions, setInteractions] = useState("");
  const [runs, setRuns] = useState("");
  const [items, setItems] = useState("");
  const [callsPerItem, setCallsPerItem] = useState("1");
  const [presetId, setPresetId] = useState<PresetId>("session");
  const [customIn, setCustomIn] = useState("4000");
  const [customOut, setCustomOut] = useState("1000");

  // 3 — engine
  const [engineId, setEngineId] = useState<string>("claude-sonnet-4-5");
  const [cheapId, setCheapId] = useState(DEFAULT_CHEAP_MODEL_ID);
  const [premiumId, setPremiumId] = useState(DEFAULT_PREMIUM_MODEL_ID);
  const [premiumPct, setPremiumPct] = useState(String(DEFAULT_PREMIUM_SHARE * 100));

  // 4 — weigh
  const [perceivedValue, setPerceivedValue] = useState("3");
  const [buildEffort, setBuildEffort] = useState<BuildEffort>("M");

  // band multipliers
  const [busyMult, setBusyMult] = useState(String(DEFAULT_BUSY_MULTIPLIER));
  const [badMult, setBadMult] = useState(String(DEFAULT_BAD_DAY_MULTIPLIER));

  const [showMath, setShowMath] = useState(false);
  const [view, setView] = useState<"form" | "workflow">("form");
  const [projectName, setProjectName] = useState("");

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

  const premiumShare = useMemo(() => {
    const p = parsePositive(premiumPct);
    return p === null ? DEFAULT_PREMIUM_SHARE : Math.min(1, p / 100);
  }, [premiumPct]);

  const engine: EstimateEngine = useMemo(
    () =>
      engineId === GATEWAY
        ? { kind: "gateway", cheapModelId: cheapId, premiumModelId: premiumId, premiumShare }
        : { kind: "model", modelId: engineId },
    [engineId, cheapId, premiumId, premiumShare]
  );

  const rates = useMemo(() => ratesFor(engine), [engine]);
  const busy = parsePositive(busyMult) ?? DEFAULT_BUSY_MULTIPLIER;
  const bad = parsePositive(badMult) ?? DEFAULT_BAD_DAY_MULTIPLIER;

  const result = useMemo(() => {
    if (!volume || !tokens || !rates) return null;
    return computeEstimate(
      {
        volume,
        tokensInPerCall: tokens.tokensIn,
        tokensOutPerCall: tokens.tokensOut,
        busyMultiplier: busy,
        badDayMultiplier: bad,
      },
      rates
    );
  }, [volume, tokens, rates, busy, bad]);

  const value = Number(perceivedValue) as PerceivedValue;
  const verdict = result ? verdictFor(value, result.expectedMonthlyEur, buildEffort) : null;

  function snapshot(): ScenarioSnapshot | null {
    if (!volume || !tokens) return null;
    return {
      name: name.trim() || "Untitled initiative",
      department,
      owner: owner.trim(),
      volume,
      presetId,
      tokensInPerCall: tokens.tokensIn,
      tokensOutPerCall: tokens.tokensOut,
      engine,
      busyMultiplier: busy,
      badDayMultiplier: bad,
      perceivedValue: value,
      buildEffort,
    };
  }

  function loadSnapshot(s: ScenarioSnapshot) {
    setName(s.name);
    setDepartment(s.department);
    setOwner(s.owner);
    setKind(s.volume.kind);
    if (s.volume.kind === "user-driven") {
      setUsers(String(s.volume.users));
      setInteractions(String(s.volume.interactionsPerUserPerMonth));
    } else {
      setRuns(String(s.volume.runsPerMonth));
      setItems(String(s.volume.itemsPerRun));
      setCallsPerItem(String(s.volume.callsPerItem));
    }
    setPresetId(s.presetId);
    if (s.presetId === "custom") {
      setCustomIn(String(s.tokensInPerCall));
      setCustomOut(String(s.tokensOutPerCall));
    }
    if (s.engine.kind === "gateway") {
      setEngineId(GATEWAY);
      setCheapId(s.engine.cheapModelId);
      setPremiumId(s.engine.premiumModelId);
      setPremiumPct(String(Math.round(s.engine.premiumShare * 100)));
    } else {
      setEngineId(s.engine.modelId);
    }
    setBusyMult(String(s.busyMultiplier));
    setBadMult(String(s.badDayMultiplier));
    setPerceivedValue(String(s.perceivedValue));
    setBuildEffort(s.buildEffort);
    setView("form");
    window.scrollTo({ top: 0 });
  }

  function addToLedger() {
    if (!result || !volume || !tokens) return;
    const entry: Omit<Initiative, "id"> = {
      name: name.trim() || "Untitled initiative",
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
      perceivedValue: value,
      buildEffort,
      estimate: {
        volume,
        tokensInPerCall: tokens.tokensIn,
        tokensOutPerCall: tokens.tokensOut,
        engine,
        engineLabel: engineLabelFor(engine),
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
    const id = addInitiative(entry);
    setHighlight(id);
    window.location.hash = "/ledger";
  }

  const canAdd = result !== null && name.trim().length > 0;
  const canSaveScenario = result !== null && projectName.trim().length > 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_minmax(340px,400px)]">
      {/* Input column */}
      <div className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="font-display text-3xl">The Estimator</div>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Price an AI initiative before it is built — and get a build-or-skip verdict, not
              just a cost. The math is shown in full.
            </p>
          </div>
          <div className="flex rounded-lg border border-border p-0.5 text-sm">
            <button
              type="button"
              onClick={() => setView("form")}
              className={cn(
                "rounded-md px-3 py-1.5 transition-colors",
                view === "form" ? "bg-secondary text-foreground" : "text-muted-foreground"
              )}
            >
              Form
            </button>
            <button
              type="button"
              onClick={() => result && setView("workflow")}
              disabled={!result}
              title={result ? undefined : "Fill in the sizing first"}
              className={cn(
                "rounded-md px-3 py-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                view === "workflow" ? "bg-secondary text-foreground" : "text-muted-foreground"
              )}
            >
              View as workflow
            </button>
          </div>
        </div>

        {view === "workflow" && result && volume && tokens ? (
          <WorkflowView
            volume={volume}
            tokens={tokens}
            engine={engine}
            result={result}
            users={users}
            setUsers={setUsers}
            interactions={interactions}
            setInteractions={setInteractions}
            runs={runs}
            setRuns={setRuns}
            items={items}
            setItems={setItems}
            callsPerItem={callsPerItem}
            setCallsPerItem={setCallsPerItem}
            engineId={engineId}
            setEngineId={setEngineId}
            cheapId={cheapId}
            setCheapId={setCheapId}
            premiumId={premiumId}
            setPremiumId={setPremiumId}
            premiumPct={premiumPct}
            setPremiumPct={setPremiumPct}
          />
        ) : (
          <>
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
                  The pattern decides how volume is counted: by the people using it, or by the
                  work flowing through it.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <ChoiceCard
                    selected={kind === "user-driven"}
                    onSelect={() => setKind("user-driven")}
                    title="User-driven"
                    text="People interact with it directly — a chatbot, an assistant, a copilot."
                  />
                  <ChoiceCard
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
                      <div className="mt-1 text-xs text-muted-foreground">
                        {preset.description}
                      </div>
                      <div className="mt-2 text-xs tabular-nums text-muted-foreground">
                        ≈ {formatNumber(preset.tokensIn)} in / {formatNumber(preset.tokensOut)}{" "}
                        out tokens per {unitWord}
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
                <Select value={engineId} onValueChange={setEngineId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={GATEWAY}>
                      Let the gateway decide — blended rate
                    </SelectItem>
                    {MODEL_PRICES.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label} — ${m.inputPerMTok} in / ${m.outputPerMTok} out per MTok
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {engineId === GATEWAY && (
                <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Assumes a routing layer that sends most requests to a cheaper model and
                    escalates only when needed — usually the single biggest cost lever you have.
                    The blend is an assumption about your architecture, not something this tool
                    does.
                  </p>
                  <div className="mt-3 grid gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label>Most requests go to</Label>
                      <Select value={cheapId} onValueChange={setCheapId}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MODEL_PRICES.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Escalations go to</Label>
                      <Select value={premiumId} onValueChange={setPremiumId}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MODEL_PRICES.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Escalation share (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={premiumPct}
                        onChange={(e) => setPremiumPct(e.target.value)}
                      />
                    </div>
                  </div>
                  {rates && (
                    <p className="mt-3 text-xs tabular-nums text-muted-foreground">
                      Blended rate: ${rates.inputPerMTok.toFixed(2)} in / $
                      {rates.outputPerMTok.toFixed(2)} out per MTok (
                      {Math.round((1 - premiumShare) * 100)}% cheap /{" "}
                      {Math.round(premiumShare * 100)}% premium).
                    </p>
                  )}
                </div>
              )}

              <p className="mt-3 text-xs text-muted-foreground">
                Prices as of {pricesAsOf} — static list prices, verify before budgeting.
                Converted at $1 = €{usdToEur} (fixed reference rate).
              </p>
            </section>

            {/* 4 — Weigh */}
            <section className="rounded-xl border bg-card p-6">
              <div className="font-display text-lg">4 · Weigh it</div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Hours saved is the objective win. This is the other half: does it make the product
                feel materially smarter, faster, more trustworthy? A feature can save few hours
                and still be worth building if it changes how users see the whole product. Both
                inputs are your judgment — the tool makes them legible, it does not make them
                true.
              </p>
              <div className="mt-4 space-y-4">
                <div>
                  <Label>Perceived value</Label>
                  <div className="mt-2 grid gap-2">
                    {PERCEIVED_VALUES.map((v) => (
                      <ChoiceCard
                        key={v}
                        selected={value === v}
                        onSelect={() => setPerceivedValue(String(v))}
                        title={`${v} — ${VALUE_ANCHORS[v]}`}
                        compact
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Build effort (rough)</Label>
                  <div className="mt-2 grid gap-3 sm:grid-cols-3">
                    {BUILD_EFFORTS.map((e) => (
                      <ChoiceCard
                        key={e}
                        selected={buildEffort === e}
                        onSelect={() => setBuildEffort(e)}
                        title={e}
                        text={EFFORT_HINTS[e]}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      {/* Result panel */}
      <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-xl border bg-card p-6">
          <div className="font-display text-lg">The number</div>
          {result === null ? (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Fill in the sizing to see a monthly cost band — expected, busy month, bad day — and
              a build-or-skip verdict.
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
                  multiplier={<MultiplierInput value={busyMult} onChange={setBusyMult} />}
                />
                <BandRow
                  label="Bad day"
                  monthly={result.badDayMonthlyEur}
                  note="A retry storm, oversized inputs, or a runaway session multiplying the volume drivers."
                  caution
                  multiplier={<MultiplierInput value={badMult} onChange={setBadMult} />}
                />
              </div>

              {/* The verdict */}
              {verdict && (
                <div className="mt-6 border-t border-border/60 pt-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-display text-lg">{VERDICT_META[verdict].label}</span>
                    <span
                      className={cn(
                        "text-sm",
                        verdict === "quick-win" && "text-emerald-400",
                        verdict === "trap" && "text-amber-400",
                        (verdict === "strategic-bet" || verdict === "filler") &&
                          "text-muted-foreground"
                      )}
                    >
                      {VERDICT_META[verdict].line}
                    </span>
                  </div>
                  <QuadrantPlot
                    className="mt-3"
                    points={[
                      {
                        id: "current",
                        name: name.trim() || "This initiative",
                        ...quadrantPosition(value, result.expectedMonthlyEur, buildEffort),
                        verdict,
                      },
                    ]}
                    highlightId="current"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Based on your inputs — a prompt for judgment, not a verdict from on high.
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowMath((v) => !v)}
                className="mt-6 flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
                aria-expanded={showMath}
              >
                How we got this
                <ChevronDown
                  className={cn("h-4 w-4 transition-transform", showMath && "rotate-180")}
                />
              </button>
              {showMath && rates && tokens && volume && (
                <div className="mt-3 space-y-1.5 rounded-md bg-secondary/50 p-3 text-xs leading-relaxed text-muted-foreground">
                  <p>
                    {volume.kind === "user-driven"
                      ? `${formatNumber(volume.users)} users × ${formatNumber(
                          volume.interactionsPerUserPerMonth
                        )} interactions`
                      : `${formatNumber(volume.runsPerMonth)} runs × ${formatNumber(
                          volume.itemsPerRun
                        )} items × ${formatNumber(volume.callsPerItem)} calls`}{" "}
                    = {formatNumber(result.callsPerMonth)} calls/month
                  </p>
                  {engine.kind === "gateway" && (
                    <p>
                      Blended rate: {Math.round((1 - premiumShare) * 100)}% ×{" "}
                      {getModelPrice(cheapId)?.label} + {Math.round(premiumShare * 100)}% ×{" "}
                      {getModelPrice(premiumId)?.label} = ${rates.inputPerMTok.toFixed(2)} in / $
                      {rates.outputPerMTok.toFixed(2)} out per MTok — assuming the routing layer
                      holds that split.
                    </p>
                  )}
                  <p>
                    Input: {formatNumber(result.callsPerMonth)} × {formatNumber(tokens.tokensIn)}{" "}
                    tokens = {result.mTokInPerMonth.toFixed(2)} MTok × $
                    {rates.inputPerMTok.toFixed(2)} = $
                    {(result.mTokInPerMonth * rates.inputPerMTok).toFixed(2)}
                  </p>
                  <p>
                    Output: {formatNumber(result.callsPerMonth)} ×{" "}
                    {formatNumber(tokens.tokensOut)} tokens = {result.mTokOutPerMonth.toFixed(2)}{" "}
                    MTok × ${rates.outputPerMTok.toFixed(2)} = $
                    {(result.mTokOutPerMonth * rates.outputPerMTok).toFixed(2)}
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
                  <p>
                    Verdict thresholds: value counts as high at 4–5. Burden = cost score (
                    {"<"}€{formatNumber(COST_THRESHOLDS.mid)} → 0, €
                    {formatNumber(COST_THRESHOLDS.mid)}–{formatNumber(COST_THRESHOLDS.high)} → 1,{" "}
                    {">"}€{formatNumber(COST_THRESHOLDS.high)} → 2) + effort (S 0 / M 1 / L 2);
                    high at 2 or more.
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
                  : "Name the initiative to add it to the ledger."}
              </p>
            </>
          )}
        </div>

        {/* Scenarios */}
        <div className="rounded-xl border bg-card p-6">
          <div className="font-display text-lg">Scenarios</div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Keep a few estimates side by side while pricing a future product. Saved in this
            browser, like everything else here.
          </p>
          <div className="mt-3 flex gap-2">
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Project name, e.g. Support copilot"
              list="project-names"
            />
            <datalist id="project-names">
              {projects.map((p) => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
            <Button
              variant="outline"
              size="sm"
              className="h-9 shrink-0"
              disabled={!canSaveScenario}
              onClick={() => {
                const s = snapshot();
                if (s) saveScenario(projectName.trim(), s);
              }}
            >
              <Save /> Save scenario
            </Button>
          </div>

          {projects.length > 0 && (
            <div className="mt-4 space-y-4">
              {projects.map((project) => (
                <div key={project.id}>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {project.name}
                  </div>
                  <div className="mt-1.5 space-y-1.5">
                    {project.scenarios.map((scenario) => {
                      const r = ratesFor(scenario.snapshot.engine);
                      const expected = r
                        ? computeEstimate(
                            {
                              volume: scenario.snapshot.volume,
                              tokensInPerCall: scenario.snapshot.tokensInPerCall,
                              tokensOutPerCall: scenario.snapshot.tokensOutPerCall,
                              busyMultiplier: scenario.snapshot.busyMultiplier,
                              badDayMultiplier: scenario.snapshot.badDayMultiplier,
                            },
                            r
                          ).expectedMonthlyEur
                        : null;
                      const v = expected
                        ? verdictFor(
                            scenario.snapshot.perceivedValue,
                            expected,
                            scenario.snapshot.buildEffort
                          )
                        : null;
                      return (
                        <div key={scenario.id} className="flex items-center gap-2 text-sm">
                          <span className="min-w-0 flex-1 truncate">
                            {scenario.snapshot.name}
                          </span>
                          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            {expected === null ? "—" : `≈ ${formatEur(expected)}/mo`}
                            {v ? ` · ${VERDICT_META[v].label}` : ""}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => loadSnapshot(scenario.snapshot)}
                            aria-label={`Load ${scenario.snapshot.name}`}
                            title="Load"
                          >
                            <FolderOpen />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-red-400"
                            onClick={() => deleteScenario(project.id, scenario.id)}
                            aria-label={`Delete ${scenario.snapshot.name}`}
                            title="Delete"
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The workflow lens: the same estimate as a left-to-right cost flow. A second
 * view of an existing estimate, never the way to build one — editing here
 * writes the same state the form reads.
 */
function WorkflowView(props: {
  volume: Volume;
  tokens: { tokensIn: number; tokensOut: number };
  engine: EstimateEngine;
  result: ReturnType<typeof computeEstimate>;
  users: string;
  setUsers: (v: string) => void;
  interactions: string;
  setInteractions: (v: string) => void;
  runs: string;
  setRuns: (v: string) => void;
  items: string;
  setItems: (v: string) => void;
  callsPerItem: string;
  setCallsPerItem: (v: string) => void;
  engineId: string;
  setEngineId: (v: string) => void;
  cheapId: string;
  setCheapId: (v: string) => void;
  premiumId: string;
  setPremiumId: (v: string) => void;
  premiumPct: string;
  setPremiumPct: (v: string) => void;
}) {
  const { volume, tokens, engine, result } = props;
  const calls = callsPerMonth(volume);

  const gateway = engine.kind === "gateway";
  const cheapPrice = gateway ? getModelPrice(engine.cheapModelId) : null;
  const premiumPrice = gateway ? getModelPrice(engine.premiumModelId) : null;
  const cheapEur =
    gateway && cheapPrice
      ? monthlyCostUsd(calls * (1 - engine.premiumShare), tokens.tokensIn, tokens.tokensOut, cheapPrice) * usdToEur
      : null;
  const premiumEur =
    gateway && premiumPrice
      ? monthlyCostUsd(calls * engine.premiumShare, tokens.tokensIn, tokens.tokensOut, premiumPrice) * usdToEur
      : null;
  const singlePrice = !gateway && engine.kind === "model" ? getModelPrice(engine.modelId) : null;

  return (
    <section className="rounded-xl border bg-card p-6">
      <p className="text-xs leading-relaxed text-muted-foreground">
        The same estimate as a cost flow — volume enters on the left, cost pools on the right.
        Edits here update the form; it is one estimate, two lenses.
      </p>
      <div className="mt-5 flex gap-3 overflow-x-auto pb-2">
        {/* Demand */}
        <FlowCard title={volume.kind === "user-driven" ? "Demand — people" : "Demand — work"}>
          {volume.kind === "user-driven" ? (
            <div className="space-y-2">
              <FlowInput label="Users" value={props.users} onChange={props.setUsers} />
              <FlowInput
                label="Interactions / user / mo"
                value={props.interactions}
                onChange={props.setInteractions}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <FlowInput label="Runs / mo" value={props.runs} onChange={props.setRuns} />
              <FlowInput label="Items / run" value={props.items} onChange={props.setItems} />
              <FlowInput
                label="Calls / item"
                value={props.callsPerItem}
                onChange={props.setCallsPerItem}
              />
            </div>
          )}
          <div className="mt-3 border-t border-border/60 pt-2 text-xs tabular-nums text-muted-foreground">
            = {formatNumber(calls)} calls/mo · ≈{formatNumber(tokens.tokensIn)} in /{" "}
            {formatNumber(tokens.tokensOut)} out tokens each
          </div>
        </FlowCard>

        <FlowArrow />

        {/* Routing / engine */}
        {gateway ? (
          <FlowCard title="Gateway routes">
            <p className="text-xs text-muted-foreground">
              Assumed split — the routing layer is your architecture, not this tool.
            </p>
            <div className="mt-2">
              <FlowInput
                label="Escalation share (%)"
                value={props.premiumPct}
                onChange={props.setPremiumPct}
              />
            </div>
            <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
              <div>
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">
                    {Math.round((1 - engine.premiumShare) * 100)}% stay cheap
                  </span>
                  <span className="tabular-nums">
                    {cheapEur === null ? "—" : `≈ ${formatEur(cheapEur)}/mo`}
                  </span>
                </div>
                <Select value={props.cheapId} onValueChange={props.setCheapId}>
                  <SelectTrigger className="mt-1 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODEL_PRICES.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">
                    {Math.round(engine.premiumShare * 100)}% escalate
                  </span>
                  <span className="tabular-nums">
                    {premiumEur === null ? "—" : `≈ ${formatEur(premiumEur)}/mo`}
                  </span>
                </div>
                <Select value={props.premiumId} onValueChange={props.setPremiumId}>
                  <SelectTrigger className="mt-1 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODEL_PRICES.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FlowCard>
        ) : (
          <FlowCard title="Model answers">
            <Select value={props.engineId} onValueChange={props.setEngineId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gateway">Let the gateway decide — blended rate</SelectItem>
                {MODEL_PRICES.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {singlePrice && (
              <div className="mt-3 space-y-1.5 border-t border-border/60 pt-2 text-xs tabular-nums text-muted-foreground">
                <div className="flex justify-between gap-3">
                  <span>Input tokens</span>
                  <span>
                    ≈ {formatEur(result.mTokInPerMonth * singlePrice.inputPerMTok * usdToEur)}/mo
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Output tokens</span>
                  <span>
                    ≈ {formatEur(result.mTokOutPerMonth * singlePrice.outputPerMTok * usdToEur)}
                    /mo
                  </span>
                </div>
              </div>
            )}
          </FlowCard>
        )}

        <FlowArrow />

        {/* Pool */}
        <FlowCard title="Monthly pool" emphasized>
          <div className="text-2xl font-semibold tabular-nums">
            ≈ {formatEur(result.expectedMonthlyEur)}
            <span className="text-xs font-normal text-muted-foreground"> /mo</span>
          </div>
          <div className="mt-2 space-y-1 text-xs tabular-nums text-muted-foreground">
            <div className="flex justify-between gap-3">
              <span>Busy month</span>
              <span className="text-amber-400">≈ {formatEur(result.busyMonthlyEur)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Bad day</span>
              <span className="text-amber-400">≈ {formatEur(result.badDayMonthlyEur)}</span>
            </div>
            <div className="flex justify-between gap-3 border-t border-border/60 pt-1">
              <span>Annualised</span>
              <span>≈ {formatEur(result.expectedMonthlyEur * 12)}</span>
            </div>
          </div>
        </FlowCard>
      </div>
    </section>
  );
}

function FlowCard({
  title,
  emphasized,
  children,
}: {
  title: string;
  emphasized?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "w-56 shrink-0 rounded-lg border p-4",
        emphasized ? "border-zinc-500/60 bg-secondary/40" : "border-border bg-background/40"
      )}
    >
      <div className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      {children}
    </div>
  );
}

function FlowArrow() {
  return (
    <div aria-hidden className="flex shrink-0 items-center text-zinc-600">
      →
    </div>
  );
}

function FlowInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-8 text-xs"
      />
    </div>
  );
}

function ChoiceCard({
  selected,
  onSelect,
  title,
  text,
  compact,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  text?: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "rounded-lg border text-left transition-colors",
        compact ? "px-3 py-2" : "p-3",
        selected ? "border-emerald-500/50 bg-emerald-500/5" : "border-border hover:bg-accent/50"
      )}
    >
      <div className="text-sm font-medium">{title}</div>
      {text && <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</div>}
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
