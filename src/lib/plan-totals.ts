import type { EmployeePlan } from "@/types";

export function computePlanTotals(employeePlan: EmployeePlan[]) {
  return {
    totalCurrentHC: employeePlan.reduce((a, r) => a + r.currentHC, 0),
    totalTargetHC: employeePlan.reduce((a, r) => a + r.targetHC, 0),
    totalProjectedHC: employeePlan.reduce((a, r) => a + r.projectedHC, 0),
  };
}
