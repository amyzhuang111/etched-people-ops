import "server-only";

import { db } from "@/lib/db";
import { candidateOverallScore, recruiterCapacityPct } from "@/lib/formulas";
import { computeHeadcount, computeHeadcountYtdDelta } from "@/lib/metrics/headcount";
import {
  computeOfferAcceptance,
  computeMedianTimeToFill,
  computeExpectedStarts,
  computePipelineCoverage,
  computePipelineHealth,
} from "@/lib/metrics/recruiting";
import {
  computeRisk,
  classifyRisk,
  normalizePriority,
  normalizeScarcity,
  normalizeReqAge,
  normalizeMilestoneProximity,
} from "@/lib/risk/risk-engine";
import type {
  Priority as DbPriority,
  ScarcityLevel,
  ApplicationSource,
  ApplicationStage,
  InterviewType,
  InterviewRecommendation,
} from "@/generated/prisma/client";
import type {
  AlertItem,
  Candidate,
  CandidateStage,
  Capability,
  CompanyMetric,
  EmployeePlan,
  FunnelByFunctionRow,
  FunnelEventRow,
  HiringFunnelStage,
  HmSlaEventRow,
  Interviewer,
  LocationName,
  Milestone,
  Priority,
  Recruiter,
  RecruitingOps,
  Requisition,
  RequisitionDetail,
  Scarcity,
  SourceChannel,
  SourceQualityRow,
} from "@/types";

// Fixed "today" the seed dataset is generated relative to (matches
// src/lib/filters.tsx's SEED_TODAY) so every derived number stays
// deterministic between server and client render.
const ASOF = new Date("2026-08-14T00:00:00Z");
const TARGET_CAPACITY_DEFAULT = 7;

function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatTimeAgo(d: Date, asOf: Date): string {
  const days = diffDays(asOf, d);
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 14) return `${days}d ago`;
  return `${Math.round(days / 7)}w ago`;
}

function toPriority(p: DbPriority): Priority {
  return p === "P3" ? "P2" : (p as Priority);
}

function isActiveAsOf(
  e: { hireDate: Date; terminationDate: Date | null; status: string },
  asOf: Date,
): boolean {
  return e.hireDate <= asOf && (e.terminationDate === null || e.terminationDate > asOf) && e.status !== "TERMINATED";
}

const SCARCITY_MAP: Record<ScarcityLevel, Scarcity> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  EXTREME: "Very High",
};

function mapSiteLocation(city: string | null | undefined, country: string | null | undefined): LocationName {
  if (country === "Taiwan") return "Taiwan";
  if (city === "San Jose") return "San Jose";
  return "Other";
}

function mapFreeTextLocation(loc: string | null): LocationName {
  if (!loc) return "Other";
  if (loc.includes("Taiwan") || loc.includes("Hsinchu")) return "Taiwan";
  if (loc.includes("San Jose")) return "San Jose";
  return "Other";
}

const STAGE_MAP: Record<ApplicationStage, CandidateStage> = {
  PROSPECT: "Sourced",
  CONTACTED: "Sourced",
  SCREEN: "Recruiter Screen",
  TECHNICAL: "Technical",
  ONSITE: "Onsite",
  EXECUTIVE: "Onsite",
  OFFER: "Offer",
  HIRED: "Started",
  REJECTED: "Sourced",
  WITHDRAWN: "Sourced",
};

const SOURCE_MAP: Record<ApplicationSource, SourceChannel> = {
  SOURCED: "Outbound",
  REFERRAL: "Employee Referral",
  INBOUND: "Inbound",
  AGENCY: "Agency",
  EVENT: "University",
  OTHER: "Executive Search",
};

const INTERVIEW_TYPE_LABEL: Record<InterviewType, string> = {
  RECRUITER: "Recruiter Screen",
  TECHNICAL: "Technical Panel",
  SYSTEM_DESIGN: "System Design Panel",
  ONSITE: "Onsite Panel",
  EXECUTIVE: "Executive Panel",
  OTHER: "Panel",
};

const RECOMMENDATION_SCORE: Record<InterviewRecommendation, number> = {
  STRONG_YES: 5,
  YES: 4,
  MIXED: 3,
  NO: 2,
  STRONG_NO: 1,
};

const NEXT_ACTION_BY_STAGE: Record<CandidateStage, string> = {
  Sourced: "Reach out to gauge interest",
  "Recruiter Screen": "Schedule recruiter screen",
  Technical: "Schedule technical interview",
  Onsite: "Complete onsite loop",
  Offer: "Awaiting candidate response",
  Accepted: "Confirm start date",
  Started: "Onboarding",
};

// Cumulative funnel bucket an application has *reached* — derived from its
// full ApplicationStageEvent history (§18: never inferred from currentStage
// alone), so a candidate later rejected at Onsite still counts as having
// reached Onsite.
const FUNNEL_BUCKET_INDEX: Partial<Record<ApplicationStage, number>> = {
  PROSPECT: 0,
  CONTACTED: 0,
  SCREEN: 1,
  TECHNICAL: 2,
  ONSITE: 3,
  EXECUTIVE: 3,
  OFFER: 4,
  HIRED: 4,
};
const FUNNEL_BUCKET_LABELS: CandidateStage[] = ["Sourced", "Recruiter Screen", "Technical", "Onsite", "Offer"];

function maxFunnelBucket(stageEvents: { toStage: ApplicationStage }[]): number {
  let max = 0;
  for (const e of stageEvents) {
    const idx = FUNNEL_BUCKET_INDEX[e.toStage];
    if (idx !== undefined && idx > max) max = idx;
  }
  return max;
}

// Extends maxFunnelBucket (0-4) with Accepted (5) / Started (6) so a single
// per-application snapshot covers the full 7-stage funnel.
function fullFunnelBucket(a: {
  stageEvents: { toStage: ApplicationStage }[];
  offers: { status: string }[];
  hire: unknown;
}): number {
  let bucket = maxFunnelBucket(a.stageEvents);
  if (a.offers.some((o) => o.status === "ACCEPTED")) bucket = Math.max(bucket, 5);
  if (a.hire) bucket = Math.max(bucket, 6);
  return bucket;
}

function currentQuarterRange(asOf: Date): [Date, Date] {
  const q = Math.floor(asOf.getUTCMonth() / 3);
  const start = new Date(Date.UTC(asOf.getUTCFullYear(), q * 3, 1));
  const end = new Date(Date.UTC(asOf.getUTCFullYear(), q * 3 + 3, 1));
  return [start, end];
}

export interface BootstrapData {
  requisitions: Requisition[];
  reqDetail: Record<string, RequisitionDetail>;
  candidates: Candidate[];
  recruiters: Recruiter[];
  capabilities: Capability[];
  employeePlan: EmployeePlan[];
  milestones: Milestone[];
  interviewers: Interviewer[];
  alerts: AlertItem[];
  companyMetric: CompanyMetric;
  hiringFunnel: HiringFunnelStage[];
  funnelEvents: FunnelEventRow[];
  funnelByFunction: FunnelByFunctionRow[];
  recruitingOps: RecruitingOps;
  sourceQuality: SourceQualityRow[];
}

export async function getBootstrapData(): Promise<BootstrapData> {
  const asOf = ASOF;

  const [functions, employees, capabilityRows, milestoneRows, requisitionRows, applicationRows, recruiterPlans, workforcePlans, hmSlaEvents] =
    await Promise.all([
      db.function.findMany(),
      db.employee.findMany({ include: { capabilities: true } }),
      db.capability.findMany({ include: { function: true, milestoneRequirements: true } }),
      db.milestone.findMany({ include: { capabilityRequirements: { include: { capability: true } } } }),
      db.requisition.findMany({
        include: { function: true, capability: true, site: true, milestone: true, hires: true },
      }),
      db.application.findMany({
        include: {
          candidate: true,
          requisition: { include: { function: true } },
          stageEvents: true,
          interviews: true,
          offers: { include: { hire: true, riskEvents: true } },
          hire: true,
        },
      }),
      db.recruiterCapacityPlan.findMany(),
      db.workforcePlan.findMany(),
      db.hiringManagerSlaEvent.findMany(),
    ]);

  const employeeMap = new Map(employees.map((e) => [e.id, e]));
  const fullName = (id: string | null | undefined) => {
    if (!id) return "Unassigned";
    const e = employeeMap.get(id);
    return e ? `${e.firstName} ${e.lastName}` : "Unassigned";
  };

  // Active employees currently holding each capability — feeds both the
  // Capabilities list below and the risk engine's capabilityCoverageGap.
  const empCapCountByCapability = new Map<string, number>();
  for (const e of employees) {
    if (!isActiveAsOf(e, asOf)) continue;
    for (const ec of e.capabilities) {
      if (ec.effectiveTo) continue;
      empCapCountByCapability.set(ec.capabilityId, (empCapCountByCapability.get(ec.capabilityId) ?? 0) + 1);
    }
  }
  const neededByCapability = new Map(
    capabilityRows.map((c) => [c.id, c.milestoneRequirements.reduce((sum, req) => sum + req.requiredHeadcount, 0)]),
  );

  // Recruiter weighted workload (open requisitions only) and unresolved
  // hiring-manager SLA events per HM — inputs to the risk engine's
  // recruiterCapacity and hiringManagerSla factors.
  const loadByRecruiter = new Map<string, number>();
  for (const r of requisitionRows) {
    if (r.status !== "OPEN" || !r.recruiterEmployeeId) continue;
    const w = r.priority === "P0" ? 1.4 : r.priority === "P1" ? 1 : 0.6;
    loadByRecruiter.set(r.recruiterEmployeeId, (loadByRecruiter.get(r.recruiterEmployeeId) ?? 0) + w);
  }
  const unresolvedSlaByHm = new Map<string, number>();
  for (const e of hmSlaEvents) {
    if (e.resolvedAt) continue;
    unresolvedSlaByHm.set(e.hiringManagerEmployeeId, (unresolvedSlaByHm.get(e.hiringManagerEmployeeId) ?? 0) + 1);
  }

  // -------------------------------------------------------------------
  // Company-wide figures — computed across every application/offer/hire
  // regardless of requisition status, so headline metrics reconcile with
  // the full underlying tables (not just the open-requisition subset the
  // per-req UI below tracks).
  // -------------------------------------------------------------------
  const allOffers = applicationRows.flatMap((a) => a.offers);
  const allHires = applicationRows.flatMap((a) => (a.hire ? [a.hire] : []));
  const openedAtByReq = new Map(
    requisitionRows.filter((r) => r.openedAt).map((r) => [r.id, r.openedAt as Date]),
  );

  const offerAcceptance = computeOfferAcceptance(allOffers);
  const medianTTF = computeMedianTimeToFill(allHires, openedAtByReq);

  const respondedOffers = allOffers.filter((o) => o.respondedAt);
  const avgResponseDays =
    respondedOffers.length > 0
      ? respondedOffers.reduce((sum, o) => sum + diffDays(o.respondedAt as Date, o.offeredAt), 0) /
        respondedOffers.length
      : 0;

  const resolvedShare =
    hmSlaEvents.length > 0 ? hmSlaEvents.filter((e) => e.resolvedAt).length / hmSlaEvents.length : 1;

  const fastRampHires = allHires.filter((h) => diffDays(h.startDate, h.acceptedAt) <= 30);
  const newHireRampPct = allHires.length > 0 ? Math.round((fastRampHires.length / allHires.length) * 100) : 0;

  const ytd = computeHeadcountYtdDelta(employees, asOf);
  const startsLast7Days = allHires.filter((h) => diffDays(asOf, h.startDate) <= 7 && h.startDate <= asOf).length;

  const companyMetric: CompanyMetric = {
    // Proxy: the schema has no satisfaction-survey table — derived from
    // how often hiring-manager SLA events get resolved.
    hmSatisfaction: Math.round(60 + resolvedShare * 40),
    newHireRampPct,
    offerSlaDays: Math.round(avgResponseDays * 10) / 10,
    headcountYtdDelta: ytd.delta,
    offerAcceptancePct: Math.round(offerAcceptance.value * 1000) / 10,
    medianTimeToFillDays: medianTTF.valueDays,
    startsLast7Days,
  };

  // -------------------------------------------------------------------
  // Requisitions — the UI only ever tracked open requisitions (no closed
  // status in the legacy shape), so this stays scoped to OPEN.
  // -------------------------------------------------------------------
  const appsByReq = new Map<string, typeof applicationRows>();
  for (const a of applicationRows) {
    const list = appsByReq.get(a.requisitionId) ?? [];
    list.push(a);
    appsByReq.set(a.requisitionId, list);
  }

  const startsQTDByRecruiter = new Map<string, number>();
  const [qStart, qEnd] = currentQuarterRange(asOf);

  const requisitions: Requisition[] = requisitionRows
    .filter((r) => r.status === "OPEN")
    .map((r) => {
      const filled = r.hires.length;
      const daysOpen = r.openedAt ? diffDays(asOf, r.openedAt) : 0;
      const recruiter = fullName(r.recruiterEmployeeId);
      const hiringManager = fullName(r.hiringManagerEmployeeId);
      const scarcity = SCARCITY_MAP[r.roleScarcity];
      const priority = toPriority(r.priority);
      const reqApps = (appsByReq.get(r.id) ?? []).filter((a) => a.status === "ACTIVE");
      const remaining = Math.max(0, r.openings - filled);
      const { coverage } = computePipelineCoverage(reqApps, remaining);
      const hasLateStage = reqApps.some((a) => ["ONSITE", "EXECUTIVE", "OFFER"].includes(a.currentStage));
      const health = computePipelineHealth(coverage, hasLateStage);
      const pipelineStrength = health === "STRONG" ? "Strong" : health === "MODERATE" ? "Moderate" : "Weak";

      for (const h of r.hires) {
        if (h.startDate >= qStart && h.startDate < qEnd) {
          startsQTDByRecruiter.set(recruiter, (startsQTDByRecruiter.get(recruiter) ?? 0) + 1);
        }
      }

      // Deterministic risk engine (§37) — every factor pulled from real
      // rows, never a manually-assigned severity.
      const needed = neededByCapability.get(r.capabilityId) ?? 0;
      const current = empCapCountByCapability.get(r.capabilityId) ?? 0;
      const capabilityCoverageGap = needed > 0 ? 1 - Math.min(1, current / needed) : 0;

      const stalledCount = reqApps.filter((a) => diffDays(asOf, a.lastStageChangedAt) > 10).length;
      const pipelineMomentum = reqApps.length > 0 ? stalledCount / reqApps.length : 0;

      const reqOffers = (appsByReq.get(r.id) ?? []).flatMap((a) => a.offers);
      const reqRiskEvents = reqOffers.flatMap((o) => o.riskEvents);
      const offerRisk = reqOffers.length > 0 ? Math.min(1, reqRiskEvents.filter((e) => !e.resolvedAt).length) : 0;

      const recruiterLoad = r.recruiterEmployeeId ? (loadByRecruiter.get(r.recruiterEmployeeId) ?? 0) : 0;
      const recruiterTarget =
        recruiterPlans.find((p) => p.recruiterEmployeeId === r.recruiterEmployeeId)?.targetWeightedReqLoad ||
        TARGET_CAPACITY_DEFAULT;
      const recruiterCapacityPctValue = recruiterTarget > 0 ? recruiterLoad / recruiterTarget : 0;
      const recruiterCapacityFactor = Math.max(0, Math.min(1, (recruiterCapacityPctValue - 0.8) / 0.6));

      const hmUnresolved = r.hiringManagerEmployeeId ? (unresolvedSlaByHm.get(r.hiringManagerEmployeeId) ?? 0) : 0;
      const hiringManagerSla = Math.min(1, hmUnresolved / 2);

      const { riskScore } = computeRisk({
        milestoneCriticality: normalizePriority(r.milestone?.priority ?? null),
        milestoneProximity: r.milestone ? normalizeMilestoneProximity(r.milestone.targetDate, asOf) : 0,
        capabilityCoverageGap,
        roleScarcity: normalizeScarcity(r.roleScarcity),
        reqAge: normalizeReqAge(daysOpen),
        pipelineCoverageGap: 1 - Math.min(1, coverage),
        pipelineMomentum,
        offerRisk,
        recruiterCapacity: recruiterCapacityFactor,
        hiringManagerSla,
      });

      return {
        id: r.id,
        role: r.title,
        function: r.function.name as Requisition["function"],
        capability: r.capability.name,
        location: mapSiteLocation(r.site?.city, r.site?.country),
        priority,
        openings: r.openings,
        filled,
        daysOpen,
        recruiter,
        hiringManager,
        milestone: r.milestone?.name ?? "Unassigned",
        scarcity,
        pipelineStrength,
        criticalityScore: riskScore,
      };
    });

  // No hand-authored narrative detail source in the new schema yet —
  // RequisitionDrawer already renders a graceful fallback when a req has
  // no entry here.
  const reqDetail: Record<string, RequisitionDetail> = {};

  // -------------------------------------------------------------------
  // Candidates — one row per Application, scoped to open requisitions'
  // active-or-just-hired pipelines.
  // -------------------------------------------------------------------
  const openReqIds = new Set(requisitions.map((r) => r.id));
  const reqById = new Map(requisitionRows.map((r) => [r.id, r]));

  const candidates: Candidate[] = applicationRows
    .filter((a) => openReqIds.has(a.requisitionId) && (a.status === "ACTIVE" || a.status === "HIRED"))
    .map((a) => {
      const req = reqById.get(a.requisitionId)!;
      const recruiter = fullName(req.recruiterEmployeeId);
      const hiringManager = fullName(req.hiringManagerEmployeeId);
      const offerAccepted = a.offers.some((o) => o.status === "ACCEPTED");
      const stage: CandidateStage = a.hire ? "Started" : offerAccepted ? "Accepted" : STAGE_MAP[a.currentStage];
      const daysInStage = diffDays(asOf, a.lastStageChangedAt);

      const scorecards = a.interviews
        .filter((i) => i.completedAt && i.score != null)
        .map((i) => ({
          interviewer: INTERVIEW_TYPE_LABEL[i.type],
          stage: i.type,
          technicalDepth: i.score ?? 0,
          problemSolving: i.score ?? 0,
          execution: i.score ?? 0,
          communication: i.score ?? 0,
          domainExpertise: i.score ?? 0,
          overallRecommendation: i.recommendation ? RECOMMENDATION_SCORE[i.recommendation] : 3,
          notes: "",
          submittedDaysAgo: i.feedbackSubmittedAt ? diffDays(asOf, i.feedbackSubmittedAt) : null,
        }));

      const risk: Candidate["risk"] = daysInStage > 14 ? "At Risk" : daysInStage > 7 ? "Watch" : "On Track";

      return {
        id: a.id,
        name: `${a.candidate.firstName} ${a.candidate.lastName}`,
        reqId: a.requisitionId,
        role: req.title,
        function: a.requisition.function.name as Candidate["function"],
        location: mapFreeTextLocation(a.candidate.location),
        currentCompany: a.candidate.currentCompany ?? "—",
        experienceYears: 0,
        stage,
        source: SOURCE_MAP[a.source],
        recruiter,
        hiringManager,
        daysInStage,
        technicalScore: scorecards.find((s) => s.stage === "TECHNICAL")?.technicalDepth ?? null,
        executionScore: scorecards.find((s) => s.stage === "ONSITE")?.execution ?? null,
        overallScore: candidateOverallScore({ scorecards }),
        scorecards,
        nextAction: NEXT_ACTION_BY_STAGE[stage],
        risk,
        blocker: risk === "At Risk" ? `Stalled in ${stage} for ${daysInStage}d` : null,
        sourcedDate: toIso(a.enteredPipelineAt),
        timeline: [...a.stageEvents]
          .sort((x, y) => x.occurredAt.getTime() - y.occurredAt.getTime())
          .map((e) => ({ stage: e.toStage, date: toIso(e.occurredAt) })),
        nudgedAt: null,
      };
    });

  // -------------------------------------------------------------------
  // Capabilities — needed = sum of milestone requirement headcounts;
  // current = active employees currently holding that capability.
  // -------------------------------------------------------------------
  const capabilities: Capability[] = capabilityRows.map((c) => ({
    id: c.id,
    name: c.name,
    function: (c.function?.name as Capability["function"]) ?? "Other",
    needed: c.milestoneRequirements.reduce((sum, req) => sum + req.requiredHeadcount, 0),
    current: empCapCountByCapability.get(c.id) ?? 0,
    scarcity: SCARCITY_MAP[c.scarcityLevel],
    criticality: toPriority(c.criticality),
  }));

  // -------------------------------------------------------------------
  // Milestones — coverage/status derived live from capability
  // requirements, not a stored label.
  // -------------------------------------------------------------------
  const milestones: Milestone[] = milestoneRows.map((m) => {
    let requiredHC = 0;
    let staffedHC = 0;
    let worst: { name: string; ratio: number } | null = null;
    for (const r of m.capabilityRequirements) {
      const current = empCapCountByCapability.get(r.capabilityId) ?? 0;
      requiredHC += r.requiredHeadcount;
      staffedHC += Math.min(current, r.requiredHeadcount);
      const ratio = r.requiredHeadcount > 0 ? current / r.requiredHeadcount : 1;
      if (!worst || ratio < worst.ratio) worst = { name: r.capability.name, ratio };
    }
    const coveragePct = requiredHC > 0 ? staffedHC / requiredHC : 1;
    const status: Milestone["status"] =
      coveragePct >= 0.9 ? "LOW" : coveragePct >= 0.7 ? "MEDIUM" : coveragePct >= 0.5 ? "HIGH" : "CRITICAL";
    return { name: m.name, requiredHC, staffedHC, keyGap: worst?.name ?? "—", status };
  });

  // -------------------------------------------------------------------
  // Workforce plan — one row per function.
  // -------------------------------------------------------------------
  const planByFunction = new Map(
    workforcePlans.filter((p) => p.functionId).map((p) => [p.functionId as string, p]),
  );

  const employeePlan: EmployeePlan[] = functions.map((fn) => {
    const funcEmployees = employees.filter((e) => e.functionId === fn.id);
    const currentHC = computeHeadcount(funcEmployees, asOf);
    const plan = planByFunction.get(fn.id);
    const targetHC = plan?.plannedHeadcount ?? currentHC;

    const funcReqs = requisitions.filter((r) => r.function === fn.name);
    const openReqsCount = funcReqs.reduce((sum, r) => sum + (r.openings - r.filled), 0);

    const funcOffers = applicationRows
      .filter((a) => a.requisition.function.name === fn.name)
      .flatMap((a) => a.offers);
    const funcAcceptedNotStarted = funcOffers.filter((o) => o.status === "ACCEPTED" && !o.hire);
    const funcHiredOfferIds = new Set(funcOffers.filter((o) => o.hire).map((o) => o.id));
    const funcExpectedStarts = computeExpectedStarts(funcOffers, funcHiredOfferIds, asOf, 30);

    const priority: Priority = targetHC - currentHC >= 8 ? "P0" : targetHC - currentHC >= 3 ? "P1" : "P2";

    return {
      function: fn.name as EmployeePlan["function"],
      team: fn.name,
      currentHC,
      targetHC,
      openReqs: openReqsCount,
      acceptedOffers: funcAcceptedNotStarted.length,
      expectedStarts: funcExpectedStarts.value,
      projectedHC: currentHC + funcAcceptedNotStarted.length,
      priority,
    };
  });

  // -------------------------------------------------------------------
  // Recruiters — every distinct recruiterEmployeeId referenced by a
  // requisition, rolled up from the already-computed requisitions and
  // candidates arrays.
  // -------------------------------------------------------------------
  const recruiterIds = [
    ...new Set(requisitionRows.map((r) => r.recruiterEmployeeId).filter((id): id is string => !!id)),
  ];
  const recruiters: Recruiter[] = recruiterIds.map((id) => {
    const name = fullName(id);
    const reqs = requisitions.filter((r) => r.recruiter === name);
    const cands = candidates.filter((c) => c.recruiter === name);
    const p0Reqs = reqs.filter((r) => r.priority === "P0").length;
    const lateStage = cands.filter((c) => c.stage === "Onsite" || c.stage === "Offer").length;
    const weightedWorkload = reqs.reduce(
      (sum, r) => sum + (r.priority === "P0" ? 1.4 : r.priority === "P1" ? 1 : 0.6),
      0,
    );
    const plan = recruiterPlans.find((p) => p.recruiterEmployeeId === id);
    const targetCapacity = plan?.targetWeightedReqLoad || TARGET_CAPACITY_DEFAULT;
    const employee = employeeMap.get(id);
    const employeeFn = employee ? functions.find((f) => f.id === employee.functionId) : undefined;
    return {
      name,
      functions: employeeFn ? [employeeFn.name as Recruiter["functions"][number]] : [],
      p0Reqs,
      totalReqs: reqs.length,
      candidates: cands.length,
      lateStage,
      startsQTD: startsQTDByRecruiter.get(name) ?? 0,
      targetCapacity,
      capacityPercentage: recruiterCapacityPct(weightedWorkload, targetCapacity),
    };
  });

  // -------------------------------------------------------------------
  // Hiring funnel — company-wide cumulative stage counts, derived from
  // every application's real stage-event history (§18), plus Accepted /
  // Started from offer and hire status.
  // -------------------------------------------------------------------
  const acceptedApps = applicationRows.filter((a) => a.offers.some((o) => o.status === "ACCEPTED"));
  const hiringFunnel: HiringFunnelStage[] = [
    ...FUNNEL_BUCKET_LABELS.map((stage, idx) => ({
      stage,
      count: applicationRows.filter((a) => maxFunnelBucket(a.stageEvents) >= idx).length,
    })),
    { stage: "Accepted", count: acceptedApps.length },
    { stage: "Started", count: allHires.length },
  ];

  // One row per application, company-wide — lets the client re-bucket a
  // real time-windowed funnel (Time Range filter) instead of scaling the
  // all-time totals above by an arbitrary multiplier.
  const funnelEvents: FunnelEventRow[] = applicationRows.map((a) => ({
    enteredPipelineAt: toIso(a.enteredPipelineAt),
    maxBucket: fullFunnelBucket(a),
  }));

  const funnelByFunction: FunnelByFunctionRow[] = functions
    .map((fn) => {
      const funcApps = applicationRows.filter((a) => a.requisition.function.id === fn.id);
      const funcHires = funcApps.flatMap((a) => (a.hire ? [a.hire] : []));
      const funcTTF = computeMedianTimeToFill(funcHires, openedAtByReq);
      return {
        function: fn.name as FunnelByFunctionRow["function"],
        applicants: funcApps.length,
        screens: funcApps.filter((a) => maxFunnelBucket(a.stageEvents) >= 1).length,
        onsites: funcApps.filter((a) => maxFunnelBucket(a.stageEvents) >= 3).length,
        offers: funcApps.filter((a) => maxFunnelBucket(a.stageEvents) >= 4).length,
        accepts: funcApps.filter((a) => a.offers.some((o) => o.status === "ACCEPTED")).length,
        timeToFillDays: funcTTF.valueDays,
      };
    })
    .filter((row) => row.applicants > 0);

  // -------------------------------------------------------------------
  // Source quality — real per-channel effectiveness (no cost-per-hire or
  // post-hire retention tracking exists in the schema, so those columns
  // aren't fabricated here — only what's derivable stays).
  // -------------------------------------------------------------------
  const appsBySource = new Map<SourceChannel, typeof applicationRows>();
  for (const a of applicationRows) {
    const label = SOURCE_MAP[a.source];
    const list = appsBySource.get(label) ?? [];
    list.push(a);
    appsBySource.set(label, list);
  }
  const sourceQuality: SourceQualityRow[] = [...appsBySource.entries()]
    .map(([source, apps]) => {
      const sourceOffers = apps.flatMap((a) => a.offers);
      const decided = sourceOffers.filter((o) => o.status === "ACCEPTED" || o.status === "DECLINED");
      const accepted = sourceOffers.filter((o) => o.status === "ACCEPTED").length;
      return {
        source,
        applicants: apps.length,
        hires: apps.filter((a) => a.hire).length,
        reachedOfferPct: Math.round(
          (apps.filter((a) => maxFunnelBucket(a.stageEvents) >= 4).length / apps.length) * 100,
        ),
        acceptancePct: decided.length > 0 ? Math.round((accepted / decided.length) * 100) : 0,
      };
    })
    .sort((a, b) => b.hires - a.hires);

  // -------------------------------------------------------------------
  // Recruiting operating intelligence — screens/starts throughput, feedback
  // SLA (from real Interview timestamps, no per-interviewer identity
  // needed), open OfferRiskEvent count, and hiring-manager SLA events.
  // -------------------------------------------------------------------
  const allInterviews = applicationRows.flatMap((a) => a.interviews);
  const feedbackTimedInterviews = allInterviews.filter((i) => i.completedAt && i.feedbackSubmittedAt);
  const feedbackWithin24hPct =
    feedbackTimedInterviews.length > 0
      ? Math.round(
          (feedbackTimedInterviews.filter(
            (i) => diffDays(i.feedbackSubmittedAt as Date, i.completedAt as Date) <= 1,
          ).length /
            feedbackTimedInterviews.length) *
            100,
        )
      : 0;

  const allOfferRiskEvents = allOffers.flatMap((o) => o.riskEvents);
  const offersAtRisk = allOfferRiskEvents.filter((e) => !e.resolvedAt).length;

  const recruitingOps: RecruitingOps = {
    screensPerWeek: Math.round((hiringFunnel.find((s) => s.stage === "Recruiter Screen")?.count ?? 0) / 13),
    startsPerMonth: Math.round(((hiringFunnel.find((s) => s.stage === "Started")?.count ?? 0) / 3) * 10) / 10,
    feedbackWithin24hPct,
    offersAtRisk,
    hmSlaEvents: [...hmSlaEvents]
      .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime())
      .map((e): HmSlaEventRow => ({
        id: e.id,
        hiringManager: fullName(e.hiringManagerEmployeeId),
        type: e.type,
        severity: e.severity,
        detectedAt: toIso(e.detectedAt),
        resolvedAt: e.resolvedAt ? toIso(e.resolvedAt) : null,
        durationHours: e.durationHours,
      })),
  };

  // -------------------------------------------------------------------
  // Alert engine (§52) — deterministic, computed live from the same rows
  // as everything else above (no separate write path, no LLM). Mirrors
  // the Alert.type taxonomy: CRITICAL_SEARCH, OFFER_RISK,
  // RECRUITER_OVERLOAD, HIRING_MANAGER_SLA, PLAN_GAP.
  // -------------------------------------------------------------------
  const alerts: AlertItem[] = [];

  for (const r of requisitions) {
    if (classifyRisk(r.criticalityScore) !== "CRITICAL") continue;
    alerts.push({
      id: `critical-search-${r.id}`,
      level: "CRITICAL",
      message: `${r.role} is a critical search`,
      detail: `${r.function} · criticality ${r.criticalityScore} · open ${r.daysOpen}d · ${r.pipelineStrength.toLowerCase()} pipeline`,
      timeAgo: "today",
    });
  }

  for (const a of applicationRows) {
    for (const o of a.offers) {
      for (const e of o.riskEvents) {
        if (e.resolvedAt) continue;
        alerts.push({
          id: `offer-risk-${e.id}`,
          level: e.severity === "HIGH" || e.severity === "CRITICAL" ? "CRITICAL" : "WARNING",
          message: `Offer at risk — ${a.requisition.title}`,
          detail: `${e.riskType.replace(/_/g, " ").toLowerCase()} · ${e.severity.toLowerCase()} severity`,
          timeAgo: formatTimeAgo(e.detectedAt, asOf),
        });
      }
    }
  }

  for (const r of recruiters) {
    if (r.capacityPercentage <= 120) continue;
    alerts.push({
      id: `recruiter-overload-${r.name}`,
      level: r.capacityPercentage > 150 ? "CRITICAL" : "WARNING",
      message: `${r.name} is over capacity`,
      detail: `${r.capacityPercentage.toFixed(0)}% of target load across ${r.totalReqs} open req${r.totalReqs === 1 ? "" : "s"}`,
      timeAgo: "today",
    });
  }

  for (const e of hmSlaEvents) {
    if (e.resolvedAt || (e.severity !== "HIGH" && e.severity !== "CRITICAL")) continue;
    alerts.push({
      id: `hm-sla-${e.id}`,
      level: e.severity === "CRITICAL" ? "CRITICAL" : "WARNING",
      message: `Hiring-manager SLA breach — ${fullName(e.hiringManagerEmployeeId)}`,
      detail: `${e.type.replace(/_/g, " ").toLowerCase()}${e.durationHours ? ` · open ${e.durationHours}h` : ""}`,
      timeAgo: formatTimeAgo(e.detectedAt, asOf),
    });
  }

  for (const p of employeePlan) {
    const gap = p.targetHC - p.currentHC;
    if (gap < 8) continue;
    alerts.push({
      id: `plan-gap-${p.function}`,
      level: gap >= 20 ? "CRITICAL" : "WARNING",
      message: `${p.function} is behind plan`,
      detail: `${p.currentHC} of ${p.targetHC} target headcount — ${gap} short`,
      timeAgo: "today",
    });
  }

  const LEVEL_RANK = { CRITICAL: 0, WARNING: 1, INFO: 2 };
  alerts.sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level]);

  return {
    requisitions,
    reqDetail,
    candidates,
    recruiters,
    capabilities,
    employeePlan,
    milestones,
    // No interviewer-identity column exists on Interview yet — Phase 7
    // (Talent Quality) will extend the schema if this needs real rows.
    interviewers: [],
    alerts,
    companyMetric,
    hiringFunnel,
    funnelEvents,
    funnelByFunction,
    recruitingOps,
    sourceQuality,
  };
}

export async function reassignRequisition(reqId: string, recruiterName: string) {
  const employees = await db.employee.findMany();
  const match = employees.find((e) => `${e.firstName} ${e.lastName}` === recruiterName);
  if (!match) throw new Error("Unknown recruiter");
  return db.requisition.update({ where: { id: reqId }, data: { recruiterEmployeeId: match.id } });
}

export async function nudgeCandidate(applicationId: string) {
  // No nudge-tracking column exists on Application in the Backend MD
  // schema — this acks the action without persisting it, so the
  // highlight naturally clears on refresh instead of silently faking
  // durability.
  const existing = await db.application.findUnique({ where: { id: applicationId } });
  if (!existing) throw new Error("Application not found");
  return { id: applicationId, nudgedAt: new Date() };
}
