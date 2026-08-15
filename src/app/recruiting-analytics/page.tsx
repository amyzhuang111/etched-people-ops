"use client";

import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";

import { TopBar } from "@/components/top-bar";
import { DataDisclaimer } from "@/components/dashboard/data-disclaimer";
import { MetricCard, SectionHeading } from "@/components/dashboard/metric-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { capacityRiskLabel, recruiterCapacityPct } from "@/lib/formulas";
import { cn } from "@/lib/utils";
import { useFilters } from "@/lib/filters";
import { useAppData } from "@/lib/app-data";
import type { Priority } from "@/types";

const RISK_TONE: Record<string, string> = {
  Available: "text-muted-foreground",
  Healthy: "text-healthy",
  Stretched: "text-warning",
  Overloaded: "text-critical",
};

const SEVERITY_TONE: Record<string, string> = {
  LOW: "text-muted-foreground",
  MEDIUM: "text-warning",
  HIGH: "text-critical",
  CRITICAL: "text-critical",
};

const WORKLOAD_WEIGHT: Record<Priority, number> = { P0: 1.4, P1: 1, P2: 0.6 };

export default function RecruitingAnalyticsPage() {
  const { data, reassignRequisition } = useAppData();
  const [fromReq, setFromReq] = useState<string>("");
  const [toRecruiter, setToRecruiter] = useState<string>("");
  const [reassigning, setReassigning] = useState(false);
  const { functionFilter, locationFilter } = useFilters();

  const requisitions = useMemo(() => data?.requisitions ?? [], [data]);
  const candidates = useMemo(() => data?.candidates ?? [], [data]);
  const recruiters = useMemo(() => data?.recruiters ?? [], [data]);

  const scopedReqs = useMemo(
    () =>
      requisitions.filter(
        (r) =>
          (functionFilter === "All" || r.function === functionFilter) &&
          (locationFilter === "All" || r.location === locationFilter),
      ),
    [requisitions, functionFilter, locationFilter],
  );

  const recruiterStats = useMemo(() => {
    return recruiters
      .map((recruiter) => {
        const reqs = scopedReqs.filter((r) => r.recruiter === recruiter.name);
        const p0Reqs = reqs.filter((r) => r.priority === "P0").length;
        const cands = candidates.filter((c) => reqs.some((r) => r.id === c.reqId));
        const lateStage = cands.filter((c) => c.stage === "Onsite" || c.stage === "Offer").length;
        const weightedWorkload = reqs.reduce((sum, r) => sum + WORKLOAD_WEIGHT[r.priority], 0);
        const capacityPercentage = recruiterCapacityPct(weightedWorkload, recruiter.targetCapacity);
        return {
          name: recruiter.name,
          p0Reqs,
          totalReqs: reqs.length,
          candidates: cands.length,
          lateStage,
          startsQTD: recruiter.startsQTD,
          capacityPercentage,
          risk: capacityRiskLabel(capacityPercentage),
        };
      })
      .filter((r) => r.totalReqs > 0 || functionFilter === "All");
  }, [recruiters, scopedReqs, candidates, functionFilter]);

  const avgLoad = recruiters.length > 0 ? scopedReqs.length / recruiters.length : 0;
  const { screensPerWeek, startsPerMonth, feedbackWithin24hPct, offersAtRisk, hmSlaEvents } =
    data?.recruitingOps ?? { screensPerWeek: 0, startsPerMonth: 0, feedbackWithin24hPct: 0, offersAtRisk: 0, hmSlaEvents: [] };
  // "Moved within 48h" — real candidates whose current stage is <2 days old.
  const activeCandidates = candidates.filter((c) => c.stage !== "Started");
  const candidateSlaPct =
    activeCandidates.length > 0
      ? Math.round(
          (activeCandidates.filter((c) => c.daysInStage <= 2).length / activeCandidates.length) * 100,
        )
      : 0;

  async function handleReassign() {
    if (!fromReq || !toRecruiter) return;
    setReassigning(true);
    try {
      await reassignRequisition(fromReq, toRecruiter);
      setFromReq("");
      setToRecruiter("");
    } finally {
      setReassigning(false);
    }
  }

  if (!data) return null;

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="Recruiting Analytics" description="Talent team operations and capacity." />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <DataDisclaimer />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          <MetricCard label="Recruiter Load" value={avgLoad.toFixed(1)} helper="Open reqs / recruiter" />
          <MetricCard label="Sourcing Productivity" value={String(screensPerWeek)} helper="Qualified screens / week" />
          <MetricCard label="Hiring Velocity" value={String(startsPerMonth)} helper="Starts / month" />
          <MetricCard label="Candidate SLA" value={`${candidateSlaPct}%`} helper="Moved within 48h" />
          <MetricCard label="Interview SLA" value={`${feedbackWithin24hPct}%`} helper="Feedback within 24h" />
          <MetricCard
            label="Offer Response"
            value={`${data.companyMetric.offerSlaDays.toFixed(1)}d`}
            helper="Avg. candidate response time"
          />
          <MetricCard
            label="Offers at Risk"
            value={String(offersAtRisk)}
            delta={offersAtRisk > 0 ? "Needs attention" : "None open"}
            deltaTone={offersAtRisk > 0 ? "negative" : "positive"}
          />
        </div>

        <div className="flex flex-col gap-3">
          <SectionHeading
            title="Recruiter capacity"
            subtitle={`${functionFilter} · ${locationFilter} — < 80% available · 80–100% healthy · 100–120% stretched · > 120% overloaded`}
          />
          <div className="overflow-hidden rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Recruiter</TableHead>
                  <TableHead className="text-right">P0 Reqs</TableHead>
                  <TableHead className="text-right">Total Reqs</TableHead>
                  <TableHead className="text-right">Candidates</TableHead>
                  <TableHead className="text-right">Late Stage</TableHead>
                  <TableHead className="text-right">Starts QTD</TableHead>
                  <TableHead className="text-right">Capacity</TableHead>
                  <TableHead className="text-right">Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recruiterStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                      No recruiters have open reqs in {functionFilter} · {locationFilter}.
                    </TableCell>
                  </TableRow>
                ) : null}
                {recruiterStats.map((r) => (
                  <TableRow key={r.name}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.p0Reqs}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.totalReqs}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.candidates}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.lateStage}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.startsQTD}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.capacityPercentage.toFixed(0)}%</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={cn("text-[10px]", RISK_TONE[r.risk])}>
                        {r.risk}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <SectionHeading
            title="Hiring manager SLA"
            subtitle="Feedback, decision, scheduling, and offer-approval delays flagged against hiring managers."
          />
          <div className="overflow-hidden rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Hiring Manager</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead className="text-right">Severity</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hmSlaEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      No hiring-manager SLA events recorded.
                    </TableCell>
                  </TableRow>
                ) : null}
                {hmSlaEvents.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.hiringManager}</TableCell>
                    <TableCell className="text-muted-foreground">{e.type.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {e.durationHours ? `${e.durationHours}h` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={cn("text-[10px]", SEVERITY_TONE[e.severity])}>
                        {e.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {e.resolvedAt ? `Resolved ${e.resolvedAt}` : "Open"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-md border border-border p-4">
          <SectionHeading
            title="Reassign a requisition"
            subtitle="Writes to the database — persists across reloads."
          />
          <div className="flex flex-wrap items-center gap-2">
            <Select value={fromReq} onValueChange={setFromReq}>
              <SelectTrigger className="h-8 w-64 text-xs">
                <SelectValue placeholder="Select requisition" />
              </SelectTrigger>
              <SelectContent>
                {requisitions.map((r) => (
                  <SelectItem key={r.id} value={r.id} className="text-xs">
                    {r.id} — {r.role} ({r.recruiter})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ArrowRight className="size-4 text-muted-foreground" />
            <Select value={toRecruiter} onValueChange={setToRecruiter}>
              <SelectTrigger className="h-8 w-48 text-xs">
                <SelectValue placeholder="Select recruiter" />
              </SelectTrigger>
              <SelectContent>
                {recruiters.map((r) => (
                  <SelectItem key={r.name} value={r.name} className="text-xs">
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleReassign} disabled={!fromReq || !toRecruiter || reassigning}>
              {reassigning ? "Reassigning…" : "Reassign"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
