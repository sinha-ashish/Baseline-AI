import { describe, expect, it } from "vitest";
import {
  callsPerMonth,
  computeEstimate,
  monthlyCostUsd,
  type EstimateInputs,
} from "./estimator";
import { blendPrices, usdToEur, type ModelPrice } from "./pricing";
import {
  actualsCostDelta,
  costPerHourSaved,
  costPerUser,
  effectiveHoursSaved,
  effectiveMonthlyCost,
  portfolioTotals,
} from "./metrics";
import { burdenScore, quadrantPosition, verdictFor } from "./verdict";
import type { Initiative } from "./types";

const testPrice: ModelPrice = {
  id: "test-model",
  label: "Test model",
  provider: "Anthropic",
  inputPerMTok: 3,
  outputPerMTok: 15,
};

describe("callsPerMonth", () => {
  it("multiplies users by interactions for user-driven volume", () => {
    expect(
      callsPerMonth({ kind: "user-driven", users: 650, interactionsPerUserPerMonth: 6 })
    ).toBe(3900);
  });

  it("multiplies runs, items, and calls for system-driven volume", () => {
    expect(
      callsPerMonth({ kind: "system-driven", runsPerMonth: 20, itemsPerRun: 500, callsPerItem: 2 })
    ).toBe(20000);
  });

  it("returns 0 when any driver is 0", () => {
    expect(
      callsPerMonth({ kind: "user-driven", users: 0, interactionsPerUserPerMonth: 6 })
    ).toBe(0);
  });
});

describe("monthlyCostUsd", () => {
  it("prices input and output tokens separately", () => {
    // 1,000 calls × 2,000 in = 2 MTok × $3 = $6; 1,000 × 500 out = 0.5 MTok × $15 = $7.50
    expect(monthlyCostUsd(1000, 2000, 500, testPrice)).toBeCloseTo(13.5, 10);
  });

  it("is zero for zero calls", () => {
    expect(monthlyCostUsd(0, 2000, 500, testPrice)).toBe(0);
  });
});

describe("computeEstimate", () => {
  const inputs: EstimateInputs = {
    volume: { kind: "user-driven", users: 650, interactionsPerUserPerMonth: 6 },
    tokensInPerCall: 8000,
    tokensOutPerCall: 2500,
    busyMultiplier: 1.5,
    badDayMultiplier: 3,
  };

  it("computes the expected monthly cost in USD and EUR", () => {
    const result = computeEstimate(inputs, testPrice);
    // 3,900 calls: 31.2 MTok in × $3 = $93.60; 9.75 MTok out × $15 = $146.25
    expect(result.callsPerMonth).toBe(3900);
    expect(result.expectedMonthlyUsd).toBeCloseTo(239.85, 6);
    expect(result.expectedMonthlyEur).toBeCloseTo(239.85 * usdToEur, 6);
  });

  it("applies the scenario multipliers to the expected figure", () => {
    const result = computeEstimate(inputs, testPrice);
    expect(result.busyMonthlyEur).toBeCloseTo(result.expectedMonthlyEur * 1.5, 10);
    expect(result.badDayMonthlyEur).toBeCloseTo(result.expectedMonthlyEur * 3, 10);
  });

  it("produces zeros, not NaN, for zero volume", () => {
    const result = computeEstimate(
      { ...inputs, volume: { kind: "system-driven", runsPerMonth: 0, itemsPerRun: 10, callsPerItem: 1 } },
      testPrice
    );
    expect(result.expectedMonthlyEur).toBe(0);
    expect(result.badDayMonthlyEur).toBe(0);
  });
});

describe("blendPrices — the gateway assumption", () => {
  const cheap = { inputPerMTok: 1, outputPerMTok: 5 };
  const premium = { inputPerMTok: 5, outputPerMTok: 25 };

  it("blends by premium share", () => {
    // 80/20: in = 1×0.8 + 5×0.2 = 1.8; out = 5×0.8 + 25×0.2 = 9
    const blended = blendPrices(cheap, premium, 0.2);
    expect(blended.inputPerMTok).toBeCloseTo(1.8, 10);
    expect(blended.outputPerMTok).toBeCloseTo(9, 10);
  });

  it("degenerates to the single model at the extremes", () => {
    expect(blendPrices(cheap, premium, 0)).toEqual(cheap);
    expect(blendPrices(cheap, premium, 1)).toEqual(premium);
  });

  it("clamps out-of-range shares", () => {
    expect(blendPrices(cheap, premium, 1.5)).toEqual(premium);
    expect(blendPrices(cheap, premium, -1)).toEqual(cheap);
  });
});

describe("verdict — value against cost and effort", () => {
  it("scores burden from cost bands and effort sizes", () => {
    expect(burdenScore(500, "S")).toBe(0); // <€1k + S
    expect(burdenScore(1500, "M")).toBe(2); // €1–3k + M
    expect(burdenScore(3500, "L")).toBe(4); // >€3k + L
  });

  it("places the four verdicts", () => {
    expect(verdictFor(5, 500, "S")).toBe("quick-win"); // high value, low burden
    expect(verdictFor(4, 3500, "L")).toBe("strategic-bet"); // high value, high burden
    expect(verdictFor(2, 500, "S")).toBe("filler"); // low value, low burden
    expect(verdictFor(2, 1500, "L")).toBe("trap"); // low value, high burden
  });

  it("treats value 3 as low and 4 as high (the documented threshold)", () => {
    expect(verdictFor(3, 500, "S")).toBe("filler");
    expect(verdictFor(4, 500, "S")).toBe("quick-win");
  });

  it("normalizes quadrant positions into 0..1", () => {
    expect(quadrantPosition(1, 0, "S")).toEqual({ x: 0, y: 0 });
    expect(quadrantPosition(5, 5000, "L")).toEqual({ x: 1, y: 1 });
  });
});

const base: Initiative = {
  id: "t1",
  name: "Test",
  department: "IT",
  owner: "Test Owner",
  status: "Pilot",
  category: "Gen",
  usagePattern: "user-driven",
  totalUsers: 0,
  timeSavedPerUserPerMonth: 0,
  expectedMonthlyCost: 100,
  peakUsage: "",
  fallback: "",
  confidence: "Low",
  perceivedValue: 3,
  buildEffort: "M",
};

describe("metrics guards", () => {
  it("returns null instead of dividing by zero", () => {
    expect(costPerHourSaved(base)).toBeNull();
    expect(costPerUser(base)).toBeNull();
  });

  it("filters to High confidence with measuredOnly", () => {
    const initiatives: Initiative[] = [
      { ...base, id: "a", expectedMonthlyCost: 100, confidence: "Low" },
      { ...base, id: "b", expectedMonthlyCost: 200, confidence: "High" },
    ];
    expect(portfolioTotals(initiatives).monthlyCost).toBe(300);
    expect(portfolioTotals(initiatives, { measuredOnly: true }).monthlyCost).toBe(200);
  });
});

describe("actuals — measured beats claimed", () => {
  const measured: Initiative = {
    ...base,
    id: "m1",
    totalUsers: 30,
    timeSavedPerUserPerMonth: 6, // claim: 180 h
    expectedMonthlyCost: 2400,
    confidence: "High",
    actuals: {
      monthlyCost: 1850,
      hoursSavedPerMonth: 205,
      quality: "measured",
      recordedAt: "2026-06-01T00:00:00.000Z",
    },
  };

  it("uses actuals for effective cost and hours", () => {
    expect(effectiveMonthlyCost(measured)).toBe(1850);
    expect(effectiveHoursSaved(measured)).toBe(205);
    expect(effectiveMonthlyCost(base)).toBe(100);
  });

  it("computes the estimate-vs-actual delta", () => {
    // 2400 → 1850 is 22.9% under
    expect(actualsCostDelta(measured)).toBeCloseTo(-0.229, 3);
    expect(actualsCostDelta(base)).toBeNull();
  });

  it("feeds actuals into portfolio totals", () => {
    const totals = portfolioTotals([measured]);
    expect(totals.monthlyCost).toBe(1850);
    expect(totals.hoursSaved).toBe(205);
  });
});
