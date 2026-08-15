"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Info } from "lucide-react";

import { TopBar } from "@/components/top-bar";
import { DataDisclaimer } from "@/components/dashboard/data-disclaimer";
import { MetricCard, SectionHeading } from "@/components/dashboard/metric-card";
import { PriorityChip, RiskChip } from "@/components/dashboard/status";
import { RequisitionDrawer } from "@/components/dashboard/requisition-drawer";
import { ForecastAssumptionsDialog } from "@/components/dashboard/forecast-assumptions-dialog";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { DEFAULT_ASSUMPTIONS, TIME_TO_FILL_TARGET_DAYS } from "@/data/reference";
import {
  criticalTalentCoverage,
  forecastHeadcount,
  planAttainment,
  planGap,
  riskFromCriticality,
} from "@/lib/formulas";
import { computeSignals } from "@/lib/signals";
import { computePlanTotals } from "@/lib/plan-totals";
import { useFilters, windowDays } from "@/lib/filters";
import { useAppData } from "@/lib/app-data";
import type { ForecastAssumptions, Requisition } from "@/types";

const MILESTONE_STATUS_LABEL: Record<string, "Critical" | "At Risk" | "On Track"> = {
  CRITICAL: "Critical",
  HIGH: "At Risk",
  MEDIUM: "At Risk",
  LOW: "On Track",
};

export default function OverviewPage() {
  const { data } = useAppData();
  const [selectedReq, setSelectedReq] = useState<Requisition | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);
  const [assumptions, setAssumptions] = useState<ForecastAssumptions>(DEFAULT_ASSUMPTIONS);
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null);
  const { functionFilter, locationFilter, timeRange } = useFilters();
  const maxDaysOpen = windowDays(timeRange);

  const requisitions = useMemo(() => data?.requisitions ?? [], [data]);
  const employeePlan = useMemo(() => data?.employeePlan ?? [], [data]);

  const scopedOpenReqs = useMemo(
    () =>
      requisitions.filter(
        (r) =>
          (functionFilter === "All" || r.function === functionFilter) &&
          (locationFilter === "All" || r.location === locationFilter) &&
          r.daysOpen <= maxDaysOpen &&
          r.openings - r.filled > 0,
      ),
    [requisitions, functionFilter, locationFilter, maxDaysOpen],
  );

  const talentRisks = useMemo(
    () => [...scopedOpenReqs].sort((a, b) => b.criticalityScore - a.criticalityScore).slice(0, 8),
    [scopedOpenReqs],
  );

  const workforcePlanRows = useMemo(
    () => employeePlan.filter((r) => functionFilter === "All" || r.function === functionFilter),
    [employeePlan, functionFilter],
  );

  if (!data) return null;

  const { totalCurrentHC, totalTargetHC, totalProjectedHC } = computePlanTotals(employeePlan);
  const attainment = planAttainment(totalProjectedHC, totalTargetHC);
  const gap = planGap(totalProjectedHC, totalTargetHC);
  const ctc = criticalTalentCoverage(
    data.capabilities.map((c) => ({ needed: c.needed, current: c.current, criticality: c.criticality })),
  );

  const openReqCount = scopedOpenReqs.length;
  const p0Count = scopedOpenReqs.filter((r) => r.priority === "P0").length;
  const expectedStarts = employeePlan.reduce((a, r) => a + r.expectedStarts, 0);
  const offerAcceptance = data.companyMetric.offerAcceptancePct;
  const medianTTF = data.companyMetric.medianTimeToFillDays;

  // Live snapshot of the active pipeline, company-wide — used to forecast
  // headcount from real candidate records rather than a static estimate.
  const pipelineSnapshot = {
    onsite: data.candidates.filter((c) => c.stage === "Onsite").length,
    offer: data.candidates.filter((c) => c.stage === "Offer").length,
    accepted: data.candidates.filter((c) => c.stage === "Accepted").length,
  };
  const acceptedOffers = employeePlan.reduce((a, r) => a + r.acceptedOffers, 0);

  const forecast30 = forecastHeadcount({
    currentHC: totalCurrentHC,
    acceptedOffers,
    pipeline: pipelineSnapshot,
    assumptions,
    monthsOut: 1,
  });
  const forecast60 = forecastHeadcount({
    currentHC: totalCurrentHC,
    acceptedOffers,
    pipeline: pipelineSnapshot,
    assumptions,
    monthsOut: 2,
  });
  const forecast90 = forecastHeadcount({
    currentHC: totalCurrentHC,
    acceptedOffers,
    pipeline: pipelineSnapshot,
    assumptions,
    monthsOut: 3,
  });
  const forecastGap = forecast90 - totalTargetHC;

  const signals = computeSignals(employeePlan, requisitions, data.recruiters, data.sourceQuality);

  return (
    <div className="flex flex-1 flex-col">
      <TopBar
        title="Talent Command Center"
        description="Hiring capacity against Etched's highest-priority company needs."
      />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <DataDisclaimer />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <MetricCard
            label="Headcount"
            value={String(totalCurrentHC)}
            delta={`+${data.companyMetric.headcountYtdDelta} YTD`}
            deltaTone="positive"
          />
          <MetricCard label="Open Reqs" value={String(openReqCount)} delta={`${p0Count} critical`} deltaTone="negative" />
          <MetricCard
            label="Plan Attainment"
            value={`${attainment.toFixed(0)}%`}
            delta={`${gap} vs plan`}
            deltaTone={gap < 0 ? "negative" : "positive"}
          />
          <MetricCard label="Expected Starts" value={String(expectedStarts)} helper="Next 30 days" />
          <MetricCard
            label="Offer Acceptance"
            value={`${offerAcceptance.toFixed(0)}%`}
            delta="Target 80%"
            deltaTone={offerAcceptance < 80 ? "negative" : "positive"}
          />
          <MetricCard
            label="Median Time to Fill"
            value={`${medianTTF}d`}
            delta={`${medianTTF - TIME_TO_FILL_TARGET_DAYS >= 0 ? "+" : ""}${medianTTF - TIME_TO_FILL_TARGET_DAYS}d vs target`}
            deltaTone={medianTTF > TIME_TO_FILL_TARGET_DAYS ? "negative" : "positive"}
          />
        </div>

        {/* Talent Plan hero insight */}
        <div className="rounded-md border border-border bg-card p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Talent Plan
          </p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-8 gap-y-2">
            <div>
              <span className="text-3xl font-semibold tabular-nums tracking-tight">
                {attainment.toFixed(0)}%
              </span>
              <span className="ml-2 text-sm text-muted-foreground">Plan Attainment</span>
            </div>
            <div>
              <span className="text-3xl font-semibold tabular-nums tracking-tight">{ctc.toFixed(0)}%</span>
              <span className="ml-2 text-sm text-muted-foreground">Critical Talent Coverage</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="ml-1.5 inline size-3.5 cursor-help text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Probability-adjusted staffing coverage across roles, weighted by company
                  criticality. A concept created for this demo, not a real Etched metric.
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Overall hiring volume is near plan, but shortages remain concentrated in several
            high-criticality capabilities — headcount is not the same as capability coverage.
          </p>
        </div>

        {/* Talent Risks */}
        <div className="flex flex-col gap-3">
          <SectionHeading
            title="Talent Risks"
            subtitle={`Opened within ${timeRange} — ${functionFilter} · ${locationFilter}.`}
          />
          <div className="overflow-hidden rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-16">Priority</TableHead>
                  <TableHead>Capability</TableHead>
                  <TableHead>Function</TableHead>
                  <TableHead className="text-right">Open Roles</TableHead>
                  <TableHead className="text-right">Days Open</TableHead>
                  <TableHead>Pipeline</TableHead>
                  <TableHead>Milestone</TableHead>
                  <TableHead className="text-right">Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {talentRisks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                      No open requisitions match {timeRange} · {functionFilter} · {locationFilter}.
                    </TableCell>
                  </TableRow>
                ) : null}
                {talentRisks.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedReq(r);
                      setDrawerOpen(true);
                    }}
                  >
                    <TableCell>
                      <PriorityChip priority={r.priority} />
                    </TableCell>
                    <TableCell className="font-medium">{r.capability}</TableCell>
                    <TableCell className="text-muted-foreground">{r.function}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.openings - r.filled}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.daysOpen}d</TableCell>
                    <TableCell className="text-muted-foreground">{r.pipelineStrength}</TableCell>
                    <TableCell className="text-muted-foreground">{r.milestone}</TableCell>
                    <TableCell className="text-right">
                      <RiskChip level={riskFromCriticality(r.criticalityScore)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Workforce Plan */}
          <div className="flex flex-col gap-3 rounded-md border border-border p-4">
            <SectionHeading title="Workforce Plan" subtitle="Function-level attainment against FY plan." />
            <div className="flex flex-col gap-3">
              {workforcePlanRows.map((row) => {
                const pct = planAttainment(row.projectedHC, row.targetHC);
                return (
                  <Link
                    key={row.function}
                    href={`/workforce-plan?function=${encodeURIComponent(row.function)}`}
                    className="group flex items-center gap-3"
                  >
                    <span className="w-24 shrink-0 truncate text-sm">{row.function}</span>
                    <Progress value={Math.min(100, pct)} className="h-2 flex-1" />
                    <span className="w-10 shrink-0 text-right text-xs font-medium tabular-nums text-muted-foreground group-hover:text-foreground">
                      {pct.toFixed(0)}%
                    </span>
                    <ChevronRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Milestone exposure */}
          <div className="flex flex-col gap-3 rounded-md border border-border p-4">
            <SectionHeading title="Talent → Milestone Exposure" subtitle="Staffing coverage against key company milestones." />
            <div className="flex flex-col divide-y divide-border">
              {data.milestones.map((m) => {
                const staffing = (m.staffedHC / m.requiredHC) * 100;
                const isExpanded = expandedMilestone === m.name;
                return (
                  <button
                    key={m.name}
                    onClick={() => setExpandedMilestone(isExpanded ? null : m.name)}
                    className="flex flex-col gap-1 py-2.5 text-left"
                  >
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium">{m.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="tabular-nums text-muted-foreground">{staffing.toFixed(0)}%</span>
                        <RiskChip
                          level={m.status}
                          className="w-[72px] justify-center"
                        />
                      </div>
                    </div>
                    {isExpanded ? (
                      <p className="text-xs text-muted-foreground">
                        Key gap: <span className="text-foreground">{m.keyGap}</span> — {m.staffedHC} of{" "}
                        {m.requiredHC} required roles staffed.{" "}
                        {MILESTONE_STATUS_LABEL[m.status]} status.
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Forecast */}
          <div className="flex flex-col gap-4 rounded-md border border-border p-4">
            <SectionHeading title="30 / 60 / 90 Day Forecast" subtitle="Current + accepted + weighted pipeline − expected attrition." />
            <div className="flex items-end justify-between gap-2">
              {[
                { label: "Current", value: totalCurrentHC },
                { label: "30 Days", value: forecast30 },
                { label: "60 Days", value: forecast60 },
                { label: "90 Days", value: forecast90 },
                { label: "Target", value: totalTargetHC },
              ].map((step, i) => (
                <div key={step.label} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-lg font-semibold tabular-nums">{step.value}</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {step.label}
                  </span>
                  {i > 0 && i < 4 ? (
                    <span className="text-[10px] tabular-nums text-healthy">
                      +{step.value -
                        [totalCurrentHC, forecast30, forecast60, forecast90][i - 1]}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Forecast gap</span>
              <span className={forecastGap < 0 ? "font-semibold text-critical" : "font-semibold text-healthy"}>
                {forecastGap}
              </span>
            </div>
            <Button variant="outline" size="sm" className="self-start" onClick={() => setAssumptionsOpen(true)}>
              View assumptions
            </Button>
          </div>

          {/* Signals */}
          <div className="flex flex-col gap-3 rounded-md border border-border p-4">
            <SectionHeading title="Signals" subtitle="Deterministic observations from the current dataset." />
            <ul className="flex flex-col gap-2.5">
              {signals.map((s) => (
                <li key={s} className="flex gap-2 text-sm leading-relaxed">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-foreground/50" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <RequisitionDrawer requisition={selectedReq} open={drawerOpen} onOpenChange={setDrawerOpen} />
      <ForecastAssumptionsDialog
        open={assumptionsOpen}
        onOpenChange={setAssumptionsOpen}
        assumptions={assumptions}
        onChange={setAssumptions}
      />
    </div>
  );
}
