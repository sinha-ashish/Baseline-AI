import { describe, expect, it } from "vitest";
import {
  callsPerMonth,
  computeEstimate,
  monthlyCostUsd,
  type EstimateInputs,
} from "./estimator";
import { usdToEur, type ModelPrice } from "./pricing";
import { costPerHourSaved, costPerUser, portfolioTotals } from "./metrics";
import type { UseCase } from "./types";

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

describe("metrics guards", () => {
  const base: UseCase = {
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
  };

  it("returns null instead of dividing by zero", () => {
    expect(costPerHourSaved(base)).toBeNull();
    expect(costPerUser(base)).toBeNull();
  });

  it("filters to High confidence with measuredOnly", () => {
    const cases: UseCase[] = [
      { ...base, id: "a", expectedMonthlyCost: 100, confidence: "Low" },
      { ...base, id: "b", expectedMonthlyCost: 200, confidence: "High" },
    ];
    expect(portfolioTotals(cases).monthlyCost).toBe(300);
    expect(portfolioTotals(cases, { measuredOnly: true }).monthlyCost).toBe(200);
  });
});
