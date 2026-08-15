/**
 * Talent Command Center data model.
 *
 * Everything this app renders is illustrative demo data for a portfolio
 * project — never real Etched personnel, hiring, or candidate data.
 */

export type FunctionName =
  | "ASIC"
  | "Architecture"
  | "Platform"
  | "Software"
  | "Production"
  | "GTM"
  | "Operations"
  | "Finance"
  | "People"
  | "Other";

export type Priority = "P0" | "P1" | "P2";

export type Scarcity = "Very High" | "High" | "Medium" | "Low";

export type RiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type CandidateStage =
  | "Sourced"
  | "Recruiter Screen"
  | "Technical"
  | "Onsite"
  | "Offer"
  | "Accepted"
  | "Started";

export type SourceChannel =
  | "Employee Referral"
  | "Outbound"
  | "Inbound"
  | "Agency"
  | "University"
  | "Executive Search";

export type LocationName = "San Jose" | "Taiwan" | "Other";

export interface Capability {
  id: string;
  name: string;
  function: FunctionName;
  needed: number;
  current: number;
  scarcity: Scarcity;
  criticality: Priority;
}

export interface EmployeePlan {
  function: FunctionName;
  team: string;
  currentHC: number;
  targetHC: number;
  openReqs: number;
  acceptedOffers: number;
  expectedStarts: number;
  projectedHC: number;
  priority: Priority;
}

export interface Requisition {
  id: string;
  role: string;
  function: FunctionName;
  capability: string;
  location: LocationName;
  priority: Priority;
  openings: number;
  filled: number;
  daysOpen: number;
  recruiter: string;
  hiringManager: string;
  milestone: string;
  scarcity: Scarcity;
  pipelineStrength: "Strong" | "Moderate" | "Weak";
  criticalityScore: number;
}

export interface InterviewScorecard {
  interviewer: string;
  stage: string;
  technicalDepth: number;
  problemSolving: number;
  execution: number;
  communication: number;
  domainExpertise: number;
  overallRecommendation: number;
  notes: string;
  submittedDaysAgo: number | null;
}

export interface Candidate {
  id: string;
  name: string;
  reqId: string;
  role: string;
  function: FunctionName;
  location: LocationName;
  currentCompany: string;
  experienceYears: number;
  stage: CandidateStage;
  source: SourceChannel;
  recruiter: string;
  hiringManager: string;
  daysInStage: number;
  technicalScore: number | null;
  executionScore: number | null;
  overallScore: number | null;
  scorecards: InterviewScorecard[];
  nextAction: string;
  risk: "On Track" | "Watch" | "At Risk";
  blocker: string | null;
  sourcedDate: string;
  timeline: { stage: string; date: string | null }[];
  nudgedAt: string | null;
}

export interface Recruiter {
  name: string;
  functions: FunctionName[];
  p0Reqs: number;
  totalReqs: number;
  candidates: number;
  lateStage: number;
  startsQTD: number;
  targetCapacity: number;
  capacityPercentage: number;
}

export interface Milestone {
  name: string;
  requiredHC: number;
  staffedHC: number;
  keyGap: string;
  status: RiskLevel;
}

export interface Interviewer {
  name: string;
  function: FunctionName;
  interviews: number;
  avgScore: number;
  offerCorrelation: number;
  feedbackSlaHours: number;
  calibration: "Well Calibrated" | "Runs Harsh" | "Runs Lenient" | "Slow Feedback";
}

export interface ForecastAssumptions {
  offerAcceptanceRate: number;
  acceptedToStartRate: number;
  monthlyRegrettableAttrition: number;
  onsiteToOfferRate: number;
}

/** Hand-authored narrative detail for the highest-criticality requisitions. */
export interface RequisitionDetail {
  whyItMatters: string;
  funnel: { stage: string; count: number }[];
  bottleneck: { stages: string; conversion: string; benchmark: string };
  recommendedAction: string;
  sourceMap: { channel: string; pct: number }[];
  targetTalentPools: string[];
}

export interface AlertItem {
  id: string;
  level: "CRITICAL" | "WARNING" | "INFO";
  message: string;
  detail: string;
  timeAgo: string;
}

/** Cumulative company-wide funnel — count of candidates who reached at least this stage. */
export interface HiringFunnelStage {
  stage: CandidateStage;
  count: number;
}

/**
 * One row per application, company-wide — the raw material for a
 * time-windowed funnel. maxBucket indexes the same 7 stages as
 * HiringFunnelStage (0=Sourced .. 6=Started); the client re-buckets after
 * filtering by enteredPipelineAt so the Time Range filter reflects real
 * applications inside the window, not a scaled estimate.
 */
export interface FunnelEventRow {
  enteredPipelineAt: string;
  maxBucket: number;
}

/** Per-function funnel volume + speed, derived from real stage-event history. */
export interface FunnelByFunctionRow {
  function: FunctionName;
  applicants: number;
  screens: number;
  onsites: number;
  offers: number;
  accepts: number;
  timeToFillDays: number;
}

/** Sourcing-channel effectiveness, derived from real Application.source + Offer status. */
export interface SourceQualityRow {
  source: SourceChannel;
  applicants: number;
  hires: number;
  reachedOfferPct: number;
  acceptancePct: number;
}

export interface HmSlaEventRow {
  id: string;
  hiringManager: string;
  type: "FEEDBACK_OVERDUE" | "DECISION_OVERDUE" | "INTERVIEW_SCHEDULING_DELAY" | "OFFER_APPROVAL_DELAY" | "REQ_KICKOFF_DELAY";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  detectedAt: string;
  resolvedAt: string | null;
  durationHours: number | null;
}

/** Recruiting-team operating metrics — Backend MD Phase 6 "Operating Intelligence". */
export interface RecruitingOps {
  screensPerWeek: number;
  startsPerMonth: number;
  feedbackWithin24hPct: number;
  offersAtRisk: number;
  hmSlaEvents: HmSlaEventRow[];
}

/** Company-wide facts with no natural home on an existing entity. */
export interface CompanyMetric {
  hmSatisfaction: number;
  newHireRampPct: number;
  offerSlaDays: number;
  headcountYtdDelta: number;
  offerAcceptancePct: number;
  medianTimeToFillDays: number;
  startsLast7Days: number;
}
