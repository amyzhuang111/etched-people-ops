import { describe, it, expect } from "vitest";
import { computeHeadcount, computeHeadcountYtdDelta, computePlanAttainment } from "./headcount";

const asOf = new Date("2026-08-14T00:00:00Z");

describe("computeHeadcount", () => {
  it("counts only employees active as of the given date", () => {
    const employees = [
      { status: "ACTIVE", hireDate: new Date("2020-01-01"), terminationDate: null },
      { status: "TERMINATED", hireDate: new Date("2020-01-01"), terminationDate: new Date("2025-01-01") },
      { status: "ACTIVE", hireDate: new Date("2030-01-01"), terminationDate: null }, // not hired yet
    ] as never;
    expect(computeHeadcount(employees, asOf)).toBe(1);
  });

  it("returns 0 for an empty employee list", () => {
    expect(computeHeadcount([], asOf)).toBe(0);
  });
});

describe("computeHeadcountYtdDelta", () => {
  it("computes the delta between current and start-of-year headcount", () => {
    const employees = [
      { status: "ACTIVE", hireDate: new Date("2020-01-01"), terminationDate: null },
      { status: "ACTIVE", hireDate: new Date("2026-03-01"), terminationDate: null },
      { status: "ACTIVE", hireDate: new Date("2026-06-01"), terminationDate: null },
    ] as never;
    const result = computeHeadcountYtdDelta(employees, asOf);
    expect(result.currentHC).toBe(3);
    expect(result.startOfYearHC).toBe(1);
    expect(result.delta).toBe(2);
  });
});

describe("computePlanAttainment", () => {
  it("computes gap and attainment ratio", () => {
    const result = computePlanAttainment(430, 467);
    expect(result.gap).toBe(-37);
    expect(result.attainment).toBeCloseTo(0.9207, 3);
  });

  it("handles a zero plan without dividing by zero", () => {
    const result = computePlanAttainment(10, 0);
    expect(result.attainment).toBe(0);
  });
});
