import { classifyRisk } from "@/lib/risk/risk-engine";
import type { Candidate, ForecastAssumptions, Priority } from "@/types";

export function planAttainment(projectedHC: number, targetHC: number): number {
  if (targetHC === 0) return 0;
  return (projectedHC / targetHC) * 100;
}

export function planGap(projectedHC: number, targetHC: number): number {
  return projectedHC - targetHC;
}

/** Weighted expected hires from the current pipeline, given conversion assumptions. */
export function pipelineWeightedExpectedHires(
  pipeline: { onsite: number; offer: number; accepted: number },
  assumptions: ForecastAssumptions,
): number {
  const fromAccepted = pipeline.accepted * assumptions.acceptedToStartRate;
  const fromOffer =
    pipeline.offer * assumptions.offerAcceptanceRate * assumptions.acceptedToStartRate;
  const fromOnsite =
    pipeline.onsite *
    assumptions.onsiteToOfferRate *
    assumptions.offerAcceptanceRate *
    assumptions.acceptedToStartRate;
  return fromAccepted + fromOffer + fromOnsite;
}

export function pipelineCoverage(weightedExpectedHires: number, remainingOpenings: number): number {
  if (remainingOpenings <= 0) return 1;
  return weightedExpectedHires / remainingOpenings;
}

const PRIORITY_WEIGHT: Record<Priority, number> = {
  P0: 1,
  P1: 0.6,
  P2: 0.3,
};

/** Delegates to the risk engine's §37 bands so a criticalityScore reads the
 * same way everywhere it's displayed, whichever page renders it. */
export function riskFromCriticality(score: number): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" {
  const level = classifyRisk(score);
  return level === "MODERATE" ? "MEDIUM" : level;
}

/**
 * Monthly forward simulation: current HC + prorated pipeline conversions -
 * prorated regrettable attrition. Deterministic given the same assumptions
 * and pipeline snapshot — not a lookup table.
 */
export function forecastHeadcount(input: {
  currentHC: number;
  acceptedOffers: number;
  pipeline: { onsite: number; offer: number; accepted: number };
  assumptions: ForecastAssumptions;
  monthsOut: number;
}): number {
  const { currentHC, acceptedOffers, pipeline, assumptions, monthsOut } = input;
  const totalExpectedHires =
    acceptedOffers * assumptions.acceptedToStartRate +
    pipelineWeightedExpectedHires(pipeline, assumptions);

  // Front-loaded conversion curve: pipeline that's further along converts
  // sooner. Spread total expected hires across a 3-month horizon.
  const monthlyShare = [0.42, 0.34, 0.24];

  let hc = currentHC;
  for (let m = 0; m < monthsOut; m++) {
    const share = monthlyShare[m] ?? monthlyShare[monthlyShare.length - 1] / monthsOut;
    hc += totalExpectedHires * share;
    hc -= hc * assumptions.monthlyRegrettableAttrition;
  }
  return Math.round(hc);
}

export function recruiterCapacityPct(weightedWorkload: number, targetCapacity: number): number {
  if (targetCapacity === 0) return 0;
  return (weightedWorkload / targetCapacity) * 100;
}

export function capacityRiskLabel(pct: number): "Available" | "Healthy" | "Stretched" | "Overloaded" {
  if (pct < 80) return "Available";
  if (pct <= 100) return "Healthy";
  if (pct <= 120) return "Stretched";
  return "Overloaded";
}

/**
 * Critical Talent Coverage (CTC) — probability-adjusted staffing coverage
 * across roles, weighted by company criticality. A concept invented for
 * this demo, not a real Etched metric.
 */
export function criticalTalentCoverage(
  rows: { needed: number; current: number; criticality: Priority }[],
): number {
  let weightedNumerator = 0;
  let weightedDenominator = 0;
  for (const row of rows) {
    const weight = PRIORITY_WEIGHT[row.criticality];
    const coverage = row.needed > 0 ? Math.min(1, row.current / row.needed) : 1;
    weightedNumerator += coverage * weight * row.needed;
    weightedDenominator += weight * row.needed;
  }
  if (weightedDenominator === 0) return 0;
  return (weightedNumerator / weightedDenominator) * 100;
}

export function candidateOverallScore(c: Pick<Candidate, "scorecards">): number | null {
  if (c.scorecards.length === 0) return null;
  const sum = c.scorecards.reduce((acc, s) => acc + s.overallRecommendation, 0);
  return Math.round((sum / c.scorecards.length) * 10) / 10;
}

export function formatPct(value: number, digits = 0): string {
  return `${value.toFixed(digits)}%`;
}

export function formatSigned(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

export function candidateAgingBuckets(candidates: Candidate[]) {
  const active = candidates.filter((c) => c.stage !== "Started");
  const buckets = [
    { label: "0–3 days", min: 0, max: 3 },
    { label: "4–7 days", min: 4, max: 7 },
    { label: "8–14 days", min: 8, max: 14 },
    { label: "15+ days", min: 15, max: Infinity },
  ];
  return buckets.map((b) => ({
    bucket: b.label,
    count: active.filter((c) => c.daysInStage >= b.min && c.daysInStage <= b.max).length,
  }));
}
