/**
 * Deterministic risk engine (§37). Every factor is pre-normalized to [0, 1]
 * by the caller (0 = no risk contribution, 1 = maximum); this module only
 * weights, sums, classifies, and explains — it never fetches data itself.
 * A red status without an explanation is insufficient (§37) — every score
 * comes back with its contributing drivers, ranked.
 */

export interface RiskFactors {
  milestoneCriticality: number; // 0-1, e.g. P0=1, P1=0.66, P2=0.33, none=0
  milestoneProximity: number; // 0-1, closer target date = higher
  capabilityCoverageGap: number; // 0-1, 1 - currentCoverage for the linked capability
  roleScarcity: number; // 0-1, EXTREME=1, HIGH=0.66, MEDIUM=0.33, LOW=0
  reqAge: number; // 0-1, normalized days-open severity
  pipelineCoverageGap: number; // 0-1, 1 - min(1, pipelineCoverage)
  pipelineMomentum: number; // 0-1, 1 = stalled (no recent stage advances)
  offerRisk: number; // 0-1, presence/severity of open OfferRiskEvents
  recruiterCapacity: number; // 0-1, overload severity
  hiringManagerSla: number; // 0-1, open/overdue HM SLA severity
}

const WEIGHTS: Record<keyof RiskFactors, number> = {
  milestoneCriticality: 0.15,
  milestoneProximity: 0.1,
  capabilityCoverageGap: 0.2,
  roleScarcity: 0.1,
  reqAge: 0.1,
  pipelineCoverageGap: 0.15,
  pipelineMomentum: 0.05,
  offerRisk: 0.05,
  recruiterCapacity: 0.05,
  hiringManagerSla: 0.05,
};

const DRIVER_LABELS: Record<keyof RiskFactors, string> = {
  milestoneCriticality: "Milestone criticality",
  milestoneProximity: "Milestone proximity",
  capabilityCoverageGap: "Capability coverage gap",
  roleScarcity: "Role scarcity",
  reqAge: "Search open a long time",
  pipelineCoverageGap: "Weak pipeline coverage",
  pipelineMomentum: "Stalled pipeline momentum",
  offerRisk: "Offer at risk",
  recruiterCapacity: "Recruiter over capacity",
  hiringManagerSla: "Hiring-manager SLA breach",
};

export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export interface RiskDriver {
  driver: string;
  factor: keyof RiskFactors;
  value: number;
  contribution: number;
}

export interface RiskResult {
  riskScore: number;
  risk: RiskLevel;
  drivers: RiskDriver[];
}

export function classifyRisk(score: number): RiskLevel {
  if (score >= 75) return "CRITICAL";
  if (score >= 55) return "HIGH";
  if (score >= 35) return "MODERATE";
  return "LOW";
}

export function computeRisk(factors: RiskFactors): RiskResult {
  const drivers: RiskDriver[] = (Object.keys(WEIGHTS) as (keyof RiskFactors)[]).map((key) => {
    const value = Math.max(0, Math.min(1, factors[key] ?? 0));
    const contribution = Math.round(value * WEIGHTS[key] * 100);
    return { driver: DRIVER_LABELS[key], factor: key, value, contribution };
  });

  const riskScore = Math.max(0, Math.min(100, drivers.reduce((a, d) => a + d.contribution, 0)));

  return {
    riskScore,
    risk: classifyRisk(riskScore),
    drivers: [...drivers].sort((a, b) => b.contribution - a.contribution).filter((d) => d.contribution > 0),
  };
}

// ---------------------------------------------------------------------------
// Normalization helpers — turn raw values into [0, 1] factor inputs.
// ---------------------------------------------------------------------------

export function normalizePriority(priority: "P0" | "P1" | "P2" | "P3" | null | undefined): number {
  switch (priority) {
    case "P0":
      return 1;
    case "P1":
      return 0.66;
    case "P2":
      return 0.33;
    default:
      return 0;
  }
}

export function normalizeScarcity(scarcity: "LOW" | "MEDIUM" | "HIGH" | "EXTREME" | null | undefined): number {
  switch (scarcity) {
    case "EXTREME":
      return 1;
    case "HIGH":
      return 0.66;
    case "MEDIUM":
      return 0.33;
    default:
      return 0;
  }
}

export function normalizeReqAge(daysOpen: number, capDays = 75): number {
  return Math.max(0, Math.min(1, daysOpen / capDays));
}

export function normalizeMilestoneProximity(targetDate: Date, asOf: Date, horizonDays = 180): number {
  const daysRemaining = (targetDate.getTime() - asOf.getTime()) / 86_400_000;
  if (daysRemaining <= 0) return 1;
  return Math.max(0, Math.min(1, 1 - daysRemaining / horizonDays));
}
