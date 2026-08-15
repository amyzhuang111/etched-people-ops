/**
 * Critical Talent Coverage (§36) — the most important metric in the system.
 * For each milestone capability requirement:
 *   currentQualifiedHC = employees mapped to that capability with sufficient
 *     proficiency (ADVANCED or EXPERT counts; WORKING does not, since
 *     requiredProficiency on the requirement sets the bar)
 *   forecastQualifiedHC = currentQualifiedHC + accepted starts (for that
 *     capability's requisitions) landing before the milestone's target date
 *   currentCoverage = currentQualifiedHC / requiredHeadcount (capped at 100%)
 *   forecastCoverage = forecastQualifiedHC / requiredHeadcount (capped at 100%)
 * Overall coverage weights each requirement by importanceWeight.
 */

const PROFICIENCY_RANK: Record<string, number> = { WORKING: 1, ADVANCED: 2, EXPERT: 3 };
const REQUIRED_PROFICIENCY_RANK: Record<string, number> = { WORKING: 1, ADVANCED: 2, EXPERT: 3 };

export interface CapabilityRequirementInput {
  capabilityId: string;
  requiredHeadcount: number;
  importanceWeight: number;
  requiredProficiency: string | null;
  targetDate: Date;
}

export interface EmployeeCapabilityInput {
  employeeId: string;
  capabilityId: string;
  proficiency: string;
  employeeActive: boolean;
}

export interface AcceptedStartInput {
  capabilityId: string;
  expectedStartDate: Date | null;
}

export interface CapabilityCoverageResult {
  capabilityId: string;
  required: number;
  current: number;
  acceptedStarts: number;
  forecastQualified: number;
  currentCoverage: number;
  forecastCoverage: number;
  importanceWeight: number;
}

export function computeCapabilityCoverage(
  requirement: CapabilityRequirementInput,
  employeeCapabilities: EmployeeCapabilityInput[],
  acceptedStarts: AcceptedStartInput[],
): CapabilityCoverageResult {
  const minRank = requirement.requiredProficiency
    ? (REQUIRED_PROFICIENCY_RANK[requirement.requiredProficiency] ?? 1)
    : 1;

  const qualified = employeeCapabilities.filter(
    (ec) =>
      ec.capabilityId === requirement.capabilityId &&
      ec.employeeActive &&
      (PROFICIENCY_RANK[ec.proficiency] ?? 0) >= minRank,
  );
  const current = qualified.length;

  const startsBeforeMilestone = acceptedStarts.filter(
    (s) =>
      s.capabilityId === requirement.capabilityId &&
      s.expectedStartDate !== null &&
      s.expectedStartDate <= requirement.targetDate,
  ).length;

  const forecastQualified = current + startsBeforeMilestone;

  return {
    capabilityId: requirement.capabilityId,
    required: requirement.requiredHeadcount,
    current,
    acceptedStarts: startsBeforeMilestone,
    forecastQualified,
    currentCoverage: requirement.requiredHeadcount > 0 ? Math.min(1, current / requirement.requiredHeadcount) : 1,
    forecastCoverage:
      requirement.requiredHeadcount > 0 ? Math.min(1, forecastQualified / requirement.requiredHeadcount) : 1,
    importanceWeight: requirement.importanceWeight,
  };
}

/** Importance-weighted aggregate across a set of capability coverage results. */
export function aggregateCoverage(results: CapabilityCoverageResult[]) {
  const weightedDenominator = results.reduce((a, r) => a + r.importanceWeight * r.required, 0);
  if (weightedDenominator === 0) return { current: 0, forecast: 0 };
  const currentNumerator = results.reduce((a, r) => a + r.currentCoverage * r.importanceWeight * r.required, 0);
  const forecastNumerator = results.reduce((a, r) => a + r.forecastCoverage * r.importanceWeight * r.required, 0);
  return {
    current: currentNumerator / weightedDenominator,
    forecast: forecastNumerator / weightedDenominator,
  };
}
