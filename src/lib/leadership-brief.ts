import type { AppData } from "@/lib/app-data";
import { daysAgo } from "@/lib/filters";
import { planGap } from "@/lib/formulas";

export interface LeadershipBriefContent {
  whatChanged: { tone: "positive" | "negative"; text: string }[];
  topRisks: string[];
  decisionsNeeded: string[];
}

/**
 * Deterministic weekly-brief commentary generated from live data — not an
 * LLM (Backend MD §77: never fabricate a "what changed" narrative). "What
 * changed" reads from real stage-event timestamps in the trailing 7 days;
 * without stored historical snapshots this is recent activity, not a
 * true week-over-week delta.
 */
export function buildLeadershipBrief(data: AppData): LeadershipBriefContent {
  const whatChanged: LeadershipBriefContent["whatChanged"] = [];

  // Company-wide (not scoped to open requisitions, unlike data.candidates).
  const startsThisWeek = data.companyMetric.startsLast7Days;
  if (startsThisWeek > 0) {
    whatChanged.push({
      tone: "positive",
      text: `${startsThisWeek} candidate${startsThisWeek === 1 ? "" : "s"} started in the last 7 days`,
    });
  }

  const offersThisWeek = data.candidates.filter((c) =>
    c.timeline.some((t) => t.stage === "OFFER" && t.date && daysAgo(t.date) <= 7),
  ).length;
  if (offersThisWeek > 0) {
    whatChanged.push({
      tone: "positive",
      text: `${offersThisWeek} candidate${offersThisWeek === 1 ? "" : "s"} reached offer stage in the last 7 days`,
    });
  }

  if (data.recruitingOps.offersAtRisk > 0) {
    whatChanged.push({
      tone: "negative",
      text: `${data.recruitingOps.offersAtRisk} open offer${data.recruitingOps.offersAtRisk === 1 ? "" : "s"} flagged at risk`,
    });
  }

  const overloaded = data.recruiters.filter((r) => r.capacityPercentage > 120);
  if (overloaded.length > 0) {
    whatChanged.push({
      tone: "negative",
      text: `${overloaded.length} recruiter${overloaded.length === 1 ? "" : "s"} now over 120% capacity`,
    });
  }

  const unresolvedSla = data.recruitingOps.hmSlaEvents.filter((e) => !e.resolvedAt).length;
  if (unresolvedSla > 0) {
    whatChanged.push({
      tone: "negative",
      text: `${unresolvedSla} hiring-manager SLA item${unresolvedSla === 1 ? "" : "s"} still open`,
    });
  }

  // ---------------------------------------------------------------------
  const topRisks: string[] = [];

  const riskiestReq = [...data.requisitions].sort((a, b) => b.criticalityScore - a.criticalityScore)[0];
  if (riskiestReq) {
    topRisks.push(
      `${riskiestReq.role} (${riskiestReq.function}) is the highest-risk open search — criticality ${riskiestReq.criticalityScore}, ${riskiestReq.pipelineStrength.toLowerCase()} pipeline.`,
    );
  }

  const worstPlan = [...data.employeePlan].sort(
    (a, b) => planGap(a.projectedHC, a.targetHC) - planGap(b.projectedHC, b.targetHC),
  )[0];
  if (worstPlan && planGap(worstPlan.projectedHC, worstPlan.targetHC) < 0) {
    topRisks.push(
      `${worstPlan.function} is projected ${Math.abs(planGap(worstPlan.projectedHC, worstPlan.targetHC))} hires below plan.`,
    );
  }

  const worstMilestone = [...data.milestones].sort(
    (a, b) => a.staffedHC / Math.max(1, a.requiredHC) - b.staffedHC / Math.max(1, b.requiredHC),
  )[0];
  if (worstMilestone) {
    const pct = Math.round((worstMilestone.staffedHC / Math.max(1, worstMilestone.requiredHC)) * 100);
    topRisks.push(`${worstMilestone.name} sits at ${pct}% capability coverage — key gap: ${worstMilestone.keyGap}.`);
  }

  // ---------------------------------------------------------------------
  const decisionsNeeded: string[] = [];

  const weakP0 = data.requisitions.find((r) => r.priority === "P0" && r.pipelineStrength === "Weak");
  if (weakP0) {
    decisionsNeeded.push(`Approve additional sourcing support for ${weakP0.role} — pipeline coverage weak.`);
  }
  if (data.recruitingOps.offersAtRisk > 0) {
    decisionsNeeded.push(
      `Review ${data.recruitingOps.offersAtRisk} at-risk offer${data.recruitingOps.offersAtRisk === 1 ? "" : "s"} before they lapse.`,
    );
  }
  if (overloaded.length > 0) {
    decisionsNeeded.push(`Reallocate load away from ${overloaded[0].name} — over 120% capacity.`);
  }
  if (unresolvedSla > 0) {
    decisionsNeeded.push(`Escalate ${unresolvedSla} overdue hiring-manager SLA item${unresolvedSla === 1 ? "" : "s"}.`);
  }
  if (decisionsNeeded.length === 0) {
    decisionsNeeded.push("No urgent escalations this week — hold current pace.");
  }

  return { whatChanged, topRisks, decisionsNeeded };
}
