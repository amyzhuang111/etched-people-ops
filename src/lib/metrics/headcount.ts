/**
 * Stock metrics (headcount, plan attainment) — value as of a selected end
 * date, per the backend spec's stock-vs-flow distinction (§55).
 */
import type { Employee } from "@/generated/prisma/client";

export function computeHeadcount(employees: Pick<Employee, "status" | "hireDate" | "terminationDate">[], asOf: Date) {
  const active = employees.filter(
    (e) => e.hireDate <= asOf && (e.terminationDate === null || e.terminationDate > asOf) && e.status !== "TERMINATED",
  );
  return active.length;
}

export function computeHeadcountYtdDelta(
  employees: Pick<Employee, "status" | "hireDate" | "terminationDate">[],
  asOf: Date,
) {
  const yearStart = new Date(Date.UTC(asOf.getUTCFullYear(), 0, 1));
  const currentHC = computeHeadcount(employees, asOf);
  const startOfYearHC = computeHeadcount(employees, yearStart);
  return { currentHC, startOfYearHC, delta: currentHC - startOfYearHC };
}

export interface PlanAttainment {
  actual: number;
  plan: number;
  gap: number;
  attainment: number;
}

export function computePlanAttainment(actualHeadcount: number, plannedHeadcount: number): PlanAttainment {
  const gap = actualHeadcount - plannedHeadcount;
  const attainment = plannedHeadcount > 0 ? actualHeadcount / plannedHeadcount : 0;
  return { actual: actualHeadcount, plan: plannedHeadcount, gap, attainment };
}
