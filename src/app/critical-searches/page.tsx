"use client";

import { useMemo, useState } from "react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

import { TopBar } from "@/components/top-bar";
import { DataDisclaimer } from "@/components/dashboard/data-disclaimer";
import { SectionHeading } from "@/components/dashboard/metric-card";
import { PriorityChip } from "@/components/dashboard/status";
import { RequisitionDrawer } from "@/components/dashboard/requisition-drawer";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DEFAULT_ASSUMPTIONS } from "@/data/reference";
import { pipelineCoverage, pipelineWeightedExpectedHires } from "@/lib/formulas";
import { useFilters, windowDays } from "@/lib/filters";
import { useAppData } from "@/lib/app-data";
import type { Requisition } from "@/types";

const TREND_BY_STRENGTH = {
  Weak: { icon: TrendingUp, label: "Worsening", tone: "text-critical" },
  Moderate: { icon: Minus, label: "Flat", tone: "text-muted-foreground" },
  Strong: { icon: TrendingDown, label: "Improving", tone: "text-healthy" },
} as const;

export default function CriticalSearchesPage() {
  const { data } = useAppData();
  const [selected, setSelected] = useState<Requisition | null>(null);
  const [open, setOpen] = useState(false);
  const { functionFilter, locationFilter, timeRange } = useFilters();
  const maxDaysOpen = windowDays(timeRange);

  const requisitions = useMemo(() => data?.requisitions ?? [], [data]);
  const candidates = useMemo(() => data?.candidates ?? [], [data]);

  const ranked = useMemo(() => {
    return [...requisitions]
      .filter(
        (r) =>
          r.openings - r.filled > 0 &&
          r.daysOpen <= maxDaysOpen &&
          (functionFilter === "All" || r.function === functionFilter) &&
          (locationFilter === "All" || r.location === locationFilter),
      )
      .sort((a, b) => b.criticalityScore - a.criticalityScore)
      .map((r) => {
        const reqCandidates = candidates.filter((c) => c.reqId === r.id);
        const onsite = reqCandidates.filter((c) => c.stage === "Onsite").length;
        const offer = reqCandidates.filter((c) => c.stage === "Offer").length;
        const accepted = reqCandidates.filter((c) => c.stage === "Accepted").length;
        const weighted = pipelineWeightedExpectedHires({ onsite, offer, accepted }, DEFAULT_ASSUMPTIONS);
        const coverage = pipelineCoverage(weighted, r.openings - r.filled) * 100;
        return { req: r, coverage: Math.min(999, coverage) };
      });
  }, [requisitions, candidates, functionFilter, locationFilter, maxDaysOpen]);

  if (!data) return null;

  return (
    <div className="flex flex-1 flex-col">
      <TopBar
        title="Critical Searches"
        description="The roles with the highest company-level cost of remaining unfilled."
      />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <DataDisclaimer />

        <div className="rounded-md border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Criticality score</span> = 35% milestone
          importance + 25% headcount gap + 20% talent scarcity + 10% days-open severity + 10%
          pipeline weakness, normalized to 0–100.
        </div>

        <div className="flex flex-col gap-3">
          <SectionHeading
            title="Ranked searches"
            subtitle={`${ranked.length} open searches, opened within ${timeRange} — ${functionFilter} · ${locationFilter}. Click a row for full detail.`}
          />
          <div className="overflow-hidden rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10">Rank</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Function</TableHead>
                  <TableHead className="text-right">Openings</TableHead>
                  <TableHead className="text-right">Days Open</TableHead>
                  <TableHead className="text-right">Pipeline Coverage</TableHead>
                  <TableHead className="text-right">Criticality</TableHead>
                  <TableHead>Hiring Manager</TableHead>
                  <TableHead>Recruiter</TableHead>
                  <TableHead className="text-right">Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranked.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-8 text-center text-sm text-muted-foreground">
                      No open searches match {timeRange} · {functionFilter} · {locationFilter}.
                    </TableCell>
                  </TableRow>
                ) : null}
                {ranked.map(({ req, coverage }, i) => {
                  const trend = TREND_BY_STRENGTH[req.pipelineStrength];
                  const TrendIcon = trend.icon;
                  return (
                    <TableRow
                      key={req.id}
                      className="cursor-pointer"
                      onClick={() => {
                        setSelected(req);
                        setOpen(true);
                      }}
                    >
                      <TableCell className="tabular-nums text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{req.role}</TableCell>
                      <TableCell className="text-muted-foreground">{req.function}</TableCell>
                      <TableCell className="text-right tabular-nums">{req.openings - req.filled}</TableCell>
                      <TableCell className="text-right tabular-nums">{req.daysOpen}d</TableCell>
                      <TableCell className="text-right tabular-nums">{coverage.toFixed(0)}%</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-mono text-sm tabular-nums">{req.criticalityScore}</span>
                          <PriorityChip priority={req.priority} />
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{req.hiringManager}</TableCell>
                      <TableCell className="text-muted-foreground">{req.recruiter}</TableCell>
                      <TableCell className="text-right">
                        <span className={`inline-flex items-center gap-1 text-xs ${trend.tone}`}>
                          <TrendIcon className="size-3.5" />
                          {trend.label}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <RequisitionDrawer requisition={selected} open={open} onOpenChange={setOpen} />
    </div>
  );
}
