import { describe, it, expect } from "vitest";
import {
  computeOpenRoles,
  computeExpectedStarts,
  computeOfferAcceptance,
  computeMedianTimeToFill,
  computePipelineCoverage,
  computePipelineHealth,
} from "./recruiting";

describe("computeOpenRoles", () => {
  it("sums openings minus filled across OPEN requisitions, not row count (§29)", () => {
    const reqs = [
      { id: "r1", status: "OPEN", openings: 4, priority: "P0" },
      { id: "r2", status: "OPEN", openings: 3, priority: "P1" },
      { id: "r3", status: "FILLED", openings: 1, priority: "P1" },
      { id: "r4", status: "CANCELLED", openings: 5, priority: "P0" },
    ] as never;
    const hires = new Map([["r1", 2]]); // 2 of 4 already filled on a multi-opening req
    const result = computeOpenRoles(reqs, hires);
    expect(result.value).toBe(2 + 3); // r1 remaining (4-2) + r2 (3-0); FILLED/CANCELLED excluded
    expect(result.p0Searches).toBe(1);
  });

  it("returns 0 when there are no open requisitions", () => {
    const result = computeOpenRoles([], new Map());
    expect(result.value).toBe(0);
  });
});

describe("computeExpectedStarts", () => {
  const asOf = new Date("2026-08-14T00:00:00Z");

  it("counts accepted offers starting within the window that aren't already hired", () => {
    const offers = [
      { id: "o1", status: "ACCEPTED", expectedStartDate: new Date("2026-08-20") }, // in window
      { id: "o2", status: "ACCEPTED", expectedStartDate: new Date("2026-09-20") }, // outside 30d
      { id: "o3", status: "ACCEPTED", expectedStartDate: new Date("2026-08-25") }, // already hired
      { id: "o4", status: "PENDING", expectedStartDate: new Date("2026-08-20") }, // not accepted
    ] as never;
    const result = computeExpectedStarts(offers, new Set(["o3"]), asOf, 30);
    expect(result.value).toBe(1);
    expect(result.offerIds).toEqual(["o1"]);
  });

  it("returns 0 when there are no offers", () => {
    expect(computeExpectedStarts([], new Set(), asOf).value).toBe(0);
  });
});

describe("computeOfferAcceptance", () => {
  it("excludes PENDING/WITHDRAWN/EXPIRED from the denominator (§32)", () => {
    const offers = [
      { status: "ACCEPTED" },
      { status: "ACCEPTED" },
      { status: "DECLINED" },
      { status: "PENDING" },
      { status: "EXPIRED" },
      { status: "WITHDRAWN" },
    ] as never;
    const result = computeOfferAcceptance(offers);
    expect(result.value).toBeCloseTo(2 / 3, 5);
  });

  it("returns 0 (not NaN) when there are no decided offers", () => {
    expect(computeOfferAcceptance([]).value).toBe(0);
  });
});

describe("computeMedianTimeToFill", () => {
  it("computes the median of acceptedAt - openedAt across hires", () => {
    const openedAt = new Map([
      ["r1", new Date("2026-01-01")],
      ["r2", new Date("2026-01-01")],
      ["r3", new Date("2026-01-01")],
    ]);
    const hires = [
      { requisitionId: "r1", acceptedAt: new Date("2026-01-31") }, // 30d
      { requisitionId: "r2", acceptedAt: new Date("2026-02-10") }, // 40d
      { requisitionId: "r3", acceptedAt: new Date("2026-02-20") }, // 50d
    ] as never;
    const result = computeMedianTimeToFill(hires, openedAt);
    expect(result.valueDays).toBe(40);
    expect(result.sampleSize).toBe(3);
  });

  it("handles zero hires without crashing", () => {
    const result = computeMedianTimeToFill([], new Map());
    expect(result.valueDays).toBe(0);
    expect(result.sampleSize).toBe(0);
  });
});

describe("computePipelineCoverage", () => {
  it("weights active applications by stage and divides by remaining openings", () => {
    const apps = [
      { currentStage: "ONSITE", status: "ACTIVE" },
      { currentStage: "OFFER", status: "ACTIVE" },
      { currentStage: "REJECTED", status: "REJECTED" }, // excluded
    ] as never;
    const result = computePipelineCoverage(apps, 2);
    expect(result.weightedPipeline).toBeCloseTo(0.7 + 1.0, 5);
    expect(result.coverage).toBeCloseTo((0.7 + 1.0) / 2, 5);
  });

  it("can exceed 100% coverage without erroring (edge case: overcoverage)", () => {
    const apps = Array.from({ length: 5 }, () => ({ currentStage: "OFFER", status: "ACTIVE" })) as never;
    const result = computePipelineCoverage(apps, 1);
    expect(result.coverage).toBeGreaterThan(1);
  });
});

describe("computePipelineHealth", () => {
  it("classifies STRONG only with high coverage AND a late-stage candidate", () => {
    expect(computePipelineHealth(2.0, true)).toBe("STRONG");
    expect(computePipelineHealth(2.0, false)).toBe("MODERATE");
  });
  it("classifies WEAK below the moderate threshold", () => {
    expect(computePipelineHealth(0.3, false)).toBe("WEAK");
  });
});
