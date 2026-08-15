import { describe, it, expect } from "vitest";
import { computeRisk, classifyRisk, normalizePriority, normalizeScarcity, normalizeReqAge } from "./risk-engine";

describe("classifyRisk", () => {
  it("classifies score bands per §37", () => {
    expect(classifyRisk(0)).toBe("LOW");
    expect(classifyRisk(34)).toBe("LOW");
    expect(classifyRisk(35)).toBe("MODERATE");
    expect(classifyRisk(54)).toBe("MODERATE");
    expect(classifyRisk(55)).toBe("HIGH");
    expect(classifyRisk(74)).toBe("HIGH");
    expect(classifyRisk(75)).toBe("CRITICAL");
    expect(classifyRisk(100)).toBe("CRITICAL");
  });
});

describe("computeRisk", () => {
  it("returns a CRITICAL score with explainable drivers for a maxed-out P0 search", () => {
    const result = computeRisk({
      milestoneCriticality: 1,
      milestoneProximity: 1,
      capabilityCoverageGap: 1,
      roleScarcity: 1,
      reqAge: 1,
      pipelineCoverageGap: 1,
      pipelineMomentum: 1,
      offerRisk: 1,
      recruiterCapacity: 1,
      hiringManagerSla: 1,
    });
    expect(result.riskScore).toBe(100);
    expect(result.risk).toBe("CRITICAL");
    expect(result.drivers.length).toBeGreaterThan(0);
    // Top driver should be the highest-weighted factor.
    expect(result.drivers[0].factor).toBe("capabilityCoverageGap");
  });

  it("returns LOW with no drivers for a fully healthy search", () => {
    const zero = {
      milestoneCriticality: 0,
      milestoneProximity: 0,
      capabilityCoverageGap: 0,
      roleScarcity: 0,
      reqAge: 0,
      pipelineCoverageGap: 0,
      pipelineMomentum: 0,
      offerRisk: 0,
      recruiterCapacity: 0,
      hiringManagerSla: 0,
    };
    const result = computeRisk(zero);
    expect(result.riskScore).toBe(0);
    expect(result.risk).toBe("LOW");
    expect(result.drivers).toEqual([]);
  });

  it("clamps out-of-range factor inputs instead of producing an invalid score", () => {
    const result = computeRisk({
      milestoneCriticality: 5, // out of range, should clamp to 1
      milestoneProximity: -3, // out of range, should clamp to 0
      capabilityCoverageGap: 0,
      roleScarcity: 0,
      reqAge: 0,
      pipelineCoverageGap: 0,
      pipelineMomentum: 0,
      offerRisk: 0,
      recruiterCapacity: 0,
      hiringManagerSla: 0,
    });
    expect(result.riskScore).toBeLessThanOrEqual(100);
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
  });
});

describe("normalization helpers", () => {
  it("normalizePriority maps P0-P3 and null consistently", () => {
    expect(normalizePriority("P0")).toBe(1);
    expect(normalizePriority("P3")).toBe(0);
    expect(normalizePriority(null)).toBe(0);
  });

  it("normalizeScarcity maps EXTREME down to LOW", () => {
    expect(normalizeScarcity("EXTREME")).toBe(1);
    expect(normalizeScarcity("LOW")).toBe(0);
  });

  it("normalizeReqAge caps at 1 for very old searches", () => {
    expect(normalizeReqAge(0)).toBe(0);
    expect(normalizeReqAge(1000, 75)).toBe(1);
  });
});
