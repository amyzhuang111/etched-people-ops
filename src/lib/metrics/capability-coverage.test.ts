import { describe, it, expect } from "vitest";
import { computeCapabilityCoverage, aggregateCoverage } from "./capability-coverage";

describe("computeCapabilityCoverage", () => {
  const requirement = {
    capabilityId: "cap-1",
    requiredHeadcount: 10,
    importanceWeight: 1,
    requiredProficiency: "ADVANCED",
    targetDate: new Date("2026-11-01"),
  };

  it("counts only employees meeting the required proficiency bar", () => {
    const empCaps = [
      { employeeId: "e1", capabilityId: "cap-1", proficiency: "WORKING", employeeActive: true }, // below bar
      { employeeId: "e2", capabilityId: "cap-1", proficiency: "ADVANCED", employeeActive: true },
      { employeeId: "e3", capabilityId: "cap-1", proficiency: "EXPERT", employeeActive: true },
      { employeeId: "e4", capabilityId: "cap-2", proficiency: "EXPERT", employeeActive: true }, // wrong capability
      { employeeId: "e5", capabilityId: "cap-1", proficiency: "EXPERT", employeeActive: false }, // inactive
    ];
    const result = computeCapabilityCoverage(requirement, empCaps, []);
    expect(result.current).toBe(2);
    expect(result.currentCoverage).toBeCloseTo(0.2, 5);
  });

  it("adds accepted starts landing before the milestone target date to the forecast", () => {
    const empCaps = [{ employeeId: "e1", capabilityId: "cap-1", proficiency: "EXPERT", employeeActive: true }];
    const starts = [
      { capabilityId: "cap-1", expectedStartDate: new Date("2026-10-01") }, // before target
      { capabilityId: "cap-1", expectedStartDate: new Date("2027-01-01") }, // after target
      { capabilityId: "cap-2", expectedStartDate: new Date("2026-10-01") }, // wrong capability
    ];
    const result = computeCapabilityCoverage(requirement, empCaps, starts);
    expect(result.current).toBe(1);
    expect(result.acceptedStarts).toBe(1);
    expect(result.forecastQualified).toBe(2);
    expect(result.forecastCoverage).toBeCloseTo(0.2, 5);
  });

  it("caps coverage at 100% even when overstaffed (edge case)", () => {
    const empCaps = Array.from({ length: 20 }, (_, i) => ({
      employeeId: `e${i}`,
      capabilityId: "cap-1",
      proficiency: "EXPERT",
      employeeActive: true,
    }));
    const result = computeCapabilityCoverage(requirement, empCaps, []);
    expect(result.currentCoverage).toBe(1);
  });
});

describe("aggregateCoverage", () => {
  it("weights each capability by importanceWeight * required headcount", () => {
    const results = [
      { capabilityId: "a", required: 10, current: 10, acceptedStarts: 0, forecastQualified: 10, currentCoverage: 1, forecastCoverage: 1, importanceWeight: 1 },
      { capabilityId: "b", required: 10, current: 0, acceptedStarts: 0, forecastQualified: 0, currentCoverage: 0, forecastCoverage: 0, importanceWeight: 1 },
    ];
    const { current } = aggregateCoverage(results);
    expect(current).toBeCloseTo(0.5, 5);
  });

  it("returns 0 for an empty set instead of dividing by zero", () => {
    expect(aggregateCoverage([]).current).toBe(0);
  });
});
