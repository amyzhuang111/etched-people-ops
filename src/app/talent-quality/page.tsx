"use client";

import { TopBar } from "@/components/top-bar";
import { DataDisclaimer } from "@/components/dashboard/data-disclaimer";
import { MetricCard, SectionHeading } from "@/components/dashboard/metric-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FunnelByFunctionChart } from "@/components/charts/funnel-by-function-chart";
import { useFilters } from "@/lib/filters";
import { useAppData } from "@/lib/app-data";

const CALIBRATION_TONE: Record<string, string> = {
  "Well Calibrated": "text-healthy",
  "Runs Harsh": "text-critical",
  "Runs Lenient": "text-warning",
  "Slow Feedback": "text-warning",
};

export default function TalentQualityPage() {
  const { data } = useAppData();
  const { functionFilter } = useFilters();

  if (!data) return null;

  const perFunction = data.funnelByFunction.find((f) => f.function === functionFilter);
  const companyWide = data.hiringFunnel;
  const onsite = perFunction?.onsites ?? companyWide.find((s) => s.stage === "Onsite")?.count ?? 0;
  const offer = perFunction?.offers ?? companyWide.find((s) => s.stage === "Offer")?.count ?? 0;
  const accepted = perFunction?.accepts ?? companyWide.find((s) => s.stage === "Accepted")?.count ?? 0;
  const interviewToOffer = onsite > 0 ? (offer / onsite) * 100 : 0;
  const offerAcceptance = offer > 0 ? (accepted / offer) * 100 : 0;

  const scored = data.candidates.filter(
    (c) =>
      (c.stage === "Accepted" || c.stage === "Started") &&
      c.overallScore !== null &&
      (functionFilter === "All" || c.function === functionFilter),
  );
  const strongHires = scored.filter((c) => (c.overallScore ?? 0) >= 4).length;
  const strongHirePct = scored.length > 0 ? (strongHires / scored.length) * 100 : 0;

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="Talent Quality" description="Are we maintaining the hiring bar as volume increases?" />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <DataDisclaimer />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <MetricCard label="Interview → Offer" value={`${interviewToOffer.toFixed(0)}%`} />
          <MetricCard label="Offer Acceptance" value={`${offerAcceptance.toFixed(0)}%`} />
          <MetricCard
            label="HM Satisfaction"
            value={`${data.companyMetric.hmSatisfaction.toFixed(0)} / 100`}
            helper="Proxy: hiring-manager SLA resolution rate"
          />
          <MetricCard
            label="New Hire Ramp"
            value={`${data.companyMetric.newHireRampPct.toFixed(0)}%`}
            helper="Proxy: accepted-to-start turnaround ≤ 30d"
          />
          <MetricCard label="Strong Hire %" value={`${strongHirePct.toFixed(0)}%`} helper="Overall score ≥ 4 / 5" />
        </div>

        <div className="flex flex-col gap-3 rounded-md border border-border p-4">
          <SectionHeading
            title="Time to fill by function"
            subtitle={`Median days from req open to accepted offer — ${functionFilter} highlighted by data availability.`}
          />
          <FunnelByFunctionChart metric="velocity" data={data.funnelByFunction} />
        </div>

        <div className="flex flex-col gap-3">
          <SectionHeading
            title="Source quality"
            subtitle="Channel effectiveness derived from real application and offer outcomes."
          />
          <div className="overflow-hidden rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Applicants</TableHead>
                  <TableHead className="text-right">Hires</TableHead>
                  <TableHead className="text-right">Reached Offer</TableHead>
                  <TableHead className="text-right">Acceptance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.sourceQuality.map((s) => (
                  <TableRow key={s.source}>
                    <TableCell className="font-medium">{s.source}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.applicants}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.hires}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.reachedOfferPct}%</TableCell>
                    <TableCell className="text-right tabular-nums">{s.acceptancePct}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <SectionHeading
            title="Interviewer calibration"
            subtitle="A process-calibration tool — not an individual performance signal."
          />
          <div className="overflow-hidden rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Interviewer</TableHead>
                  <TableHead>Function</TableHead>
                  <TableHead className="text-right">Interviews</TableHead>
                  <TableHead className="text-right">Avg Score</TableHead>
                  <TableHead className="text-right">Offer Correlation</TableHead>
                  <TableHead className="text-right">Feedback SLA</TableHead>
                  <TableHead className="text-right">Calibration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.interviewers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                      No per-interviewer identity is tracked yet — Interview records aren&apos;t linked to an
                      individual interviewer in the current schema.
                    </TableCell>
                  </TableRow>
                ) : null}
                {data.interviewers.map((i) => (
                  <TableRow key={i.name}>
                    <TableCell className="font-medium">{i.name}</TableCell>
                    <TableCell className="text-muted-foreground">{i.function}</TableCell>
                    <TableCell className="text-right tabular-nums">{i.interviews}</TableCell>
                    <TableCell className="text-right tabular-nums">{i.avgScore.toFixed(1)}</TableCell>
                    <TableCell className="text-right tabular-nums">{(i.offerCorrelation * 100).toFixed(0)}%</TableCell>
                    <TableCell className="text-right tabular-nums">{i.feedbackSlaHours}h</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={`text-[10px] ${CALIBRATION_TONE[i.calibration]}`}>
                        {i.calibration}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
