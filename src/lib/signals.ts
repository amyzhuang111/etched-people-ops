import { planGap } from "@/lib/formulas";
import type { EmployeePlan, Recruiter, Requisition, SourceQualityRow } from "@/types";

/** Deterministic analytical observations generated from live data — not a chat assistant. */
export function computeSignals(
  employeePlan: EmployeePlan[],
  requisitions: Requisition[],
  recruiters: Recruiter[],
  sourceQuality: SourceQualityRow[],
): string[] {
  const signals: string[] = [];
  if (employeePlan.length === 0) return signals;

  const worst = [...employeePlan].sort(
    (a, b) => planGap(a.projectedHC, a.targetHC) - planGap(b.projectedHC, b.targetHC),
  )[0];
  const worstGap = Math.abs(planGap(worst.projectedHC, worst.targetHC));
  signals.push(`${worst.function} is projected to finish ${worstGap} hires below plan.`);

  const p0Reqs = requisitions.filter((r) => r.priority === "P0");
  const p0Gap = p0Reqs.reduce((sum, r) => sum + (r.openings - r.filled), 0);
  const totalGap = requisitions.reduce((sum, r) => sum + (r.openings - r.filled), 0);
  const p0Share = totalGap > 0 ? Math.round((p0Gap / totalGap) * 100) : 0;
  signals.push(
    `${p0Reqs.length} P0 roles account for ${p0Share}% of the total open-headcount gap across all requisitions.`,
  );

  const referral = sourceQuality.find((s) => s.source === "Employee Referral");
  const inbound = sourceQuality.find((s) => s.source === "Inbound");
  if (referral && inbound && inbound.reachedOfferPct > 0) {
    const ratio = Math.round((referral.reachedOfferPct / inbound.reachedOfferPct) * 10) / 10;
    signals.push(
      `Candidates referred by employees reach offer ${ratio}× more often than inbound applicants.`,
    );
  }

  const overloaded = recruiters.filter((r) => r.capacityPercentage > 100).length;
  if (overloaded > 0) {
    signals.push(
      `Recruiter capacity exceeds 100% for ${overloaded} member${overloaded === 1 ? "" : "s"} of the team.`,
    );
  }

  const oldestP0 = [...p0Reqs].sort((a, b) => b.daysOpen - a.daysOpen)[0];
  if (oldestP0) {
    signals.push(
      `${oldestP0.role} (${oldestP0.function}) is the longest-open P0 search at ${oldestP0.daysOpen} days.`,
    );
  }

  return signals;
}
