"use client";

import { Fragment, Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, ChevronRight, Search } from "lucide-react";

import { TopBar } from "@/components/top-bar";
import { DataDisclaimer } from "@/components/dashboard/data-disclaimer";
import { MetricCard, SectionHeading } from "@/components/dashboard/metric-card";
import { RiskChip } from "@/components/dashboard/status";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";

import { TEAMS_BY_FUNCTION } from "@/data/reference";
import { planAttainment, planGap, formatSigned } from "@/lib/formulas";
import { computePlanTotals } from "@/lib/plan-totals";
import { useFilters } from "@/lib/filters";
import { useAppData } from "@/lib/app-data";
import { cn } from "@/lib/utils";
import type { FunctionName } from "@/types";

function statusFromAttainment(pct: number): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" {
  if (pct < 75) return "CRITICAL";
  if (pct < 88) return "HIGH";
  if (pct < 97) return "MEDIUM";
  return "LOW";
}

function WorkforcePlanInner() {
  const { data } = useAppData();
  const searchParams = useSearchParams();
  const presetFunction = searchParams.get("function");

  const [expanded, setExpanded] = useState<Set<FunctionName>>(
    new Set(presetFunction ? [presetFunction as FunctionName] : []),
  );
  const [query, setQuery] = useState(presetFunction ?? "");
  const [capQuery, setCapQuery] = useState("");
  const { functionFilter } = useFilters();

  const employeePlan = useMemo(() => data?.employeePlan ?? [], [data]);
  const capabilities = useMemo(() => data?.capabilities ?? [], [data]);
  const requisitions = useMemo(() => data?.requisitions ?? [], [data]);

  const sortedCapabilities = useMemo(() => {
    return [...capabilities]
      .filter(
        (c) =>
          c.name.toLowerCase().includes(capQuery.toLowerCase()) &&
          (functionFilter === "All" || c.function === functionFilter),
      )
      .map((c) => ({ ...c, coverage: c.needed > 0 ? (c.current / c.needed) * 100 : 100 }))
      .sort((a, b) => a.coverage - b.coverage);
  }, [capabilities, capQuery, functionFilter]);

  if (!data) return null;

  const { totalCurrentHC: totalCurrent, totalTargetHC: totalTarget, totalProjectedHC: totalProjected } =
    computePlanTotals(employeePlan);
  const gap = planGap(totalProjected, totalTarget);
  const monthsRemaining = 4;
  const netAddsPerMonth = Math.max(0, Math.round(Math.abs(gap) / monthsRemaining));

  const filteredPlan = employeePlan.filter(
    (r) =>
      r.function.toLowerCase().includes(query.toLowerCase()) &&
      (functionFilter === "All" || r.function === functionFilter),
  );

  function toggle(fn: FunctionName) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(fn)) next.delete(fn);
      else next.add(fn);
      return next;
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <TopBar
        title="Workforce Plan"
        description="Translate company priorities into required capabilities and headcount."
      />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <DataDisclaimer />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <MetricCard label="Current HC" value={String(totalCurrent)} />
          <MetricCard label="Plan HC" value={String(totalTarget)} />
          <MetricCard label="Expected EOY" value={String(totalProjected)} />
          <MetricCard
            label="Plan Gap"
            value={String(gap)}
            deltaTone={gap < 0 ? "negative" : "positive"}
            delta={`${planAttainment(totalProjected, totalTarget).toFixed(0)}% attainment`}
          />
          <MetricCard label="Net Adds Required / Mo" value={String(netAddsPerMonth)} helper={`Over ${monthsRemaining} months`} />
        </div>

        <Tabs defaultValue="functions">
          <TabsList>
            <TabsTrigger value="functions">Functions</TabsTrigger>
            <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
          </TabsList>

          <TabsContent value="functions" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <SectionHeading
                title="Function view"
                subtitle={`Click a function to expand its teams. Top-bar filter: ${functionFilter}.`}
              />
              <div className="relative w-56">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search function..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-8 pl-8 text-sm"
                />
              </div>
            </div>
            <div className="overflow-hidden rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Function</TableHead>
                    <TableHead className="text-right">Current</TableHead>
                    <TableHead className="text-right">Plan</TableHead>
                    <TableHead className="text-right">Net Adds</TableHead>
                    <TableHead className="text-right">Open</TableHead>
                    <TableHead className="text-right">Accepted</TableHead>
                    <TableHead className="text-right">Starts</TableHead>
                    <TableHead className="text-right">Forecast</TableHead>
                    <TableHead className="text-right">Gap</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlan.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="py-8 text-center text-sm text-muted-foreground">
                        No functions match this search.
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {filteredPlan.map((row) => {
                    const pct = planAttainment(row.projectedHC, row.targetHC);
                    const rowGap = planGap(row.projectedHC, row.targetHC);
                    const isExpanded = expanded.has(row.function);
                    const teams = TEAMS_BY_FUNCTION[row.function];
                    const teamReqCounts = teams.map((team) => ({
                      team,
                      openReqs: requisitions
                        .filter((r) => r.function === row.function && r.capability === team)
                        .reduce((a, r) => a + (r.openings - r.filled), 0),
                    }));
                    return (
                      <Fragment key={row.function}>
                        <TableRow
                          className="cursor-pointer"
                          onClick={() => toggle(row.function)}
                        >
                          <TableCell className="font-medium">
                            <span className="flex items-center gap-1.5">
                              {isExpanded ? (
                                <ChevronDown className="size-3.5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="size-3.5 text-muted-foreground" />
                              )}
                              {row.function}
                            </span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{row.currentHC}</TableCell>
                          <TableCell className="text-right tabular-nums">{row.targetHC}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {row.targetHC - row.currentHC}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{row.openReqs}</TableCell>
                          <TableCell className="text-right tabular-nums">{row.acceptedOffers}</TableCell>
                          <TableCell className="text-right tabular-nums">{row.expectedStarts}</TableCell>
                          <TableCell className="text-right tabular-nums">{row.projectedHC}</TableCell>
                          <TableCell className={`text-right tabular-nums ${rowGap < 0 ? "text-critical" : "text-healthy"}`}>
                            {rowGap}
                          </TableCell>
                          <TableCell className="text-right">
                            <RiskChip level={statusFromAttainment(pct)} />
                          </TableCell>
                        </TableRow>
                        {isExpanded ? (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={10} className="bg-muted/30 py-2">
                              <div className="flex flex-wrap gap-x-6 gap-y-1.5 pl-6 text-xs text-muted-foreground">
                                {teamReqCounts.map((t) => (
                                  <span key={t.team}>
                                    {t.team}
                                    {t.openReqs > 0 ? (
                                      <span className="ml-1 font-mono tabular-nums text-foreground">
                                        {t.openReqs} open
                                      </span>
                                    ) : null}
                                  </span>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground">
              Team taxonomy is an illustrative workforce-planning structure for this demo, not
              Etched&apos;s actual org chart.
            </p>
          </TabsContent>

          <TabsContent value="capabilities" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <SectionHeading
                title="Capability coverage"
                subtitle={`Sorted worst coverage first. Top-bar filter: ${functionFilter}.`}
              />
              <div className="relative w-56">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search capability..."
                  value={capQuery}
                  onChange={(e) => setCapQuery(e.target.value)}
                  className="h-8 pl-8 text-sm"
                />
              </div>
            </div>
            <div className="overflow-hidden rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Capability</TableHead>
                    <TableHead>Function</TableHead>
                    <TableHead className="text-right">Needed</TableHead>
                    <TableHead className="text-right">Current</TableHead>
                    <TableHead className="text-right">Gap</TableHead>
                    <TableHead>Scarcity</TableHead>
                    <TableHead>Criticality</TableHead>
                    <TableHead className="w-40 text-right">Coverage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCapabilities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                        No capabilities match this search.
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {sortedCapabilities.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground">{c.function}</TableCell>
                      <TableCell className="text-right tabular-nums">{c.needed}</TableCell>
                      <TableCell className="text-right tabular-nums">{c.current}</TableCell>
                      <TableCell
                        className={cn(
                          "text-right tabular-nums",
                          c.current - c.needed < 0 ? "text-critical" : "text-healthy",
                        )}
                      >
                        {formatSigned(c.current - c.needed)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{c.scarcity}</TableCell>
                      <TableCell className="text-muted-foreground">{c.criticality}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={c.coverage} className="h-1.5" />
                          <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                            {c.coverage.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function WorkforcePlanPage() {
  return (
    <Suspense fallback={null}>
      <WorkforcePlanInner />
    </Suspense>
  );
}
