/**
 * Recruiting operating metrics — open roles, expected starts, offer
 * acceptance, time to fill, pipeline coverage/health. Every formula here
 * matches the backend spec (§29–35) literally.
 */
import type { Requisition, Offer, Application, Hire } from "@/generated/prisma/client";

/** §29 — SUM(openings - filled) for OPEN requisitions. Never just count rows. */
export function computeOpenRoles(
  requisitions: Pick<Requisition, "id" | "status" | "openings" | "priority">[],
  hiresByRequisitionId: Map<string, number>,
) {
  const open = requisitions.filter((r) => r.status === "OPEN");
  const remainingByReq = open.map((r) => ({
    requisitionId: r.id,
    priority: r.priority,
    remaining: Math.max(0, r.openings - (hiresByRequisitionId.get(r.id) ?? 0)),
  }));
  const value = remainingByReq.reduce((a, r) => a + r.remaining, 0);
  const p0Searches = open.filter((r) => r.priority === "P0").length;
  return { value, p0Searches, remainingByReq };
}

/** §31 — accepted offers with expectedStartDate in [today, today+30], not yet converted to a Hire. */
export function computeExpectedStarts(
  offers: Pick<Offer, "id" | "status" | "expectedStartDate">[],
  hiredOfferIds: Set<string>,
  asOf: Date,
  windowDays = 30,
) {
  const windowEnd = new Date(asOf.getTime() + windowDays * 86_400_000);
  const matches = offers.filter(
    (o) =>
      o.status === "ACCEPTED" &&
      !hiredOfferIds.has(o.id) &&
      o.expectedStartDate !== null &&
      o.expectedStartDate >= asOf &&
      o.expectedStartDate <= windowEnd,
  );
  return { value: matches.length, offerIds: matches.map((o) => o.id) };
}

/** §32 — accepted / (accepted + declined), excluding PENDING/WITHDRAWN/EXPIRED. */
export function computeOfferAcceptance(offers: Pick<Offer, "status">[], target = 0.8) {
  const accepted = offers.filter((o) => o.status === "ACCEPTED").length;
  const declined = offers.filter((o) => o.status === "DECLINED").length;
  const denominator = accepted + declined;
  const value = denominator > 0 ? accepted / denominator : 0;
  return { value, accepted, declined, target };
}

/** §33 — median(acceptedAt - requisition.openedAt) across filled seats. */
export function computeMedianTimeToFill(
  hires: Pick<Hire, "acceptedAt" | "requisitionId">[],
  requisitionOpenedAt: Map<string, Date>,
  target = 35,
) {
  const days = hires
    .map((h) => {
      const openedAt = requisitionOpenedAt.get(h.requisitionId);
      if (!openedAt) return null;
      return Math.round((h.acceptedAt.getTime() - openedAt.getTime()) / 86_400_000);
    })
    .filter((d): d is number => d !== null)
    .sort((a, b) => a - b);

  if (days.length === 0) return { valueDays: 0, targetDays: target, sampleSize: 0 };
  const mid = Math.floor(days.length / 2);
  const median = days.length % 2 === 0 ? Math.round((days[mid - 1] + days[mid]) / 2) : days[mid];
  return { valueDays: median, targetDays: target, sampleSize: days.length };
}

/** §34 — stage-weighted pipeline value / remaining openings. */
export const STAGE_WEIGHTS: Record<string, number> = {
  PROSPECT: 0.05,
  CONTACTED: 0.1,
  SCREEN: 0.2,
  TECHNICAL: 0.4,
  ONSITE: 0.7,
  EXECUTIVE: 0.85,
  OFFER: 1.0,
};

export function computePipelineCoverage(
  applications: Pick<Application, "currentStage" | "status">[],
  remainingOpenings: number,
) {
  const active = applications.filter((a) => a.status === "ACTIVE");
  const weightedPipeline = active.reduce((sum, a) => sum + (STAGE_WEIGHTS[a.currentStage] ?? 0), 0);
  const coverage = remainingOpenings > 0 ? weightedPipeline / remainingOpenings : weightedPipeline > 0 ? 1 : 0;
  return {
    weightedPipeline: Math.round(weightedPipeline * 100) / 100,
    remainingOpenings,
    coverage: Math.round(coverage * 100) / 100,
    counts: {
      screen: active.filter((a) => a.currentStage === "SCREEN").length,
      technical: active.filter((a) => a.currentStage === "TECHNICAL").length,
      onsite: active.filter((a) => a.currentStage === "ONSITE").length,
      offer: active.filter((a) => a.currentStage === "OFFER").length,
    },
  };
}

/** §35 — configurable thresholds; never a manually-assigned "source of truth" field. */
export interface PipelineHealthThresholds {
  strongCoverage: number;
  moderateCoverage: number;
}
export const DEFAULT_PIPELINE_HEALTH_THRESHOLDS: PipelineHealthThresholds = {
  strongCoverage: 1.5,
  moderateCoverage: 0.8,
};

export function computePipelineHealth(
  coverage: number,
  hasLateStageCandidate: boolean,
  thresholds: PipelineHealthThresholds = DEFAULT_PIPELINE_HEALTH_THRESHOLDS,
): "STRONG" | "MODERATE" | "WEAK" {
  if (coverage >= thresholds.strongCoverage && hasLateStageCandidate) return "STRONG";
  if (coverage >= thresholds.moderateCoverage) return "MODERATE";
  return "WEAK";
}
