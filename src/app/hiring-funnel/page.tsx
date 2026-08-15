"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

import { TopBar } from "@/components/top-bar";
import { DataDisclaimer } from "@/components/dashboard/data-disclaimer";
import { SectionHeading } from "@/components/dashboard/metric-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FunnelByFunctionChart } from "@/components/charts/funnel-by-function-chart";
import { FUNNEL_TARGETS, SOURCE_CHANNELS } from "@/data/reference";
import { candidateAgingBuckets } from "@/lib/formulas";
import { cn } from "@/lib/utils";
import { useFilters, windowDays, computeWindowedFunnel } from "@/lib/filters";
import { useAppData } from "@/lib/app-data";

const FUNNEL_TRANSITIONS = [
  { label: "Sourced → Screen", from: "Sourced", to: "Recruiter Screen", driver: "Targeting" },
  { label: "Screen → Technical", from: "Recruiter Screen", to: "Technical", driver: "Calibration" },
  { label: "Technical → Onsite", from: "Technical", to: "Onsite", driver: "Technical bar" },
  { label: "Onsite → Offer", from: "Onsite", to: "Offer", driver: "Healthy" },
  { label: "Offer → Accept", from: "Offer", to: "Accepted", driver: "Comp / competition" },
];

export default function HiringFunnelPage() {
  const { data, nudgeCandidate } = useAppData();
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [metric, setMetric] = useState<"volume" | "conversion" | "velocity">("conversion");
  const [nudging, setNudging] = useState<Set<string>>(new Set());
  const [recruiterFilter, setRecruiterFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const { functionFilter, locationFilter, timeRange } = useFilters();

  const maxDaysOpen = windowDays(timeRange);
  const funnelEvents = useMemo(() => data?.funnelEvents ?? [], [data]);
  const windowedFunnel = useMemo(
    () => computeWindowedFunnel(funnelEvents, maxDaysOpen),
    [funnelEvents, maxDaysOpen],
  );
  const countFor = (stage: string) => windowedFunnel.find((s) => s.stage === stage)?.count ?? 0;
  const maxCount = windowedFunnel[0]?.count || 1;

  const leakage = FUNNEL_TRANSITIONS.map((t) => {
    const fromCount = countFor(t.from);
    const toCount = countFor(t.to);
    const conversion = fromCount > 0 ? (toCount / fromCount) * 100 : 0;
    const target = FUNNEL_TARGETS[t.label];
    const delta = conversion - target;
    const loss = delta < 0 ? Math.round((Math.abs(delta) / 100) * fromCount) : 0;
    return { ...t, conversion, target, delta, loss };
  });

  const candidates = useMemo(() => data?.candidates ?? [], [data]);
  const recruiterNames = useMemo(
    () => Array.from(new Set(data?.recruiters.map((r) => r.name) ?? [])),
    [data],
  );

  const scopedCandidates = useMemo(
    () =>
      candidates.filter(
        (c) =>
          (functionFilter === "All" || c.function === functionFilter) &&
          (locationFilter === "All" || c.location === locationFilter) &&
          (recruiterFilter === "All" || c.recruiter === recruiterFilter) &&
          (sourceFilter === "All" || c.source === sourceFilter),
      ),
    [candidates, functionFilter, locationFilter, recruiterFilter, sourceFilter],
  );

  const aging = useMemo(() => candidateAgingBuckets(scopedCandidates), [scopedCandidates]);

  async function handleNudge(candidateId: string) {
    setNudging((prev) => new Set(prev).add(candidateId));
    try {
      await nudgeCandidate(candidateId);
    } finally {
      setNudging((prev) => {
        const next = new Set(prev);
        next.delete(candidateId);
        return next;
      });
    }
  }

  const interventionQueue = useMemo(
    () =>
      scopedCandidates
        .filter((c) => c.risk === "At Risk" && (!activeStage || c.stage === activeStage))
        .sort((a, b) => b.daysInStage - a.daysInStage)
        .slice(0, 12),
    [scopedCandidates, activeStage],
  );

  if (!data) return null;

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="Hiring Funnel" description="Where candidates move, stall, and drop." />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <DataDisclaimer />

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Function &amp; location filters are in the top bar. Scope further:
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
                Recruiter: {recruiterFilter}
                <ChevronDown className="size-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
              <DropdownMenuItem onSelect={() => setRecruiterFilter("All")}>All recruiters</DropdownMenuItem>
              {recruiterNames.map((r) => (
                <DropdownMenuItem key={r} onSelect={() => setRecruiterFilter(r)}>
                  {r}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
                Source: {sourceFilter}
                <ChevronDown className="size-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => setSourceFilter("All")}>All sources</DropdownMenuItem>
              {SOURCE_CHANNELS.map((s) => (
                <DropdownMenuItem key={s} onSelect={() => setSourceFilter(s)}>
                  {s}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Main funnel */}
        <div className="flex flex-col gap-3 rounded-md border border-border p-4">
          <SectionHeading
            title="Main funnel"
            subtitle={`${timeRange} window, all requisitions. Click a stage to filter below.`}
          />
          <div className="flex flex-col gap-1.5">
            {windowedFunnel.map((s, i) => {
              const prev = i > 0 ? windowedFunnel[i - 1].count : null;
              const conv = prev ? Math.round((s.count / prev) * 100) : null;
              return (
                <button
                  key={s.stage}
                  onClick={() => setActiveStage(activeStage === s.stage ? null : s.stage)}
                  className={cn(
                    "flex items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors",
                    activeStage === s.stage ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/40",
                  )}
                >
                  <span className="w-36 shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {s.stage}
                  </span>
                  <div className="h-2 flex-1 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-foreground/80"
                      style={{ width: `${Math.max(2, (s.count / maxCount) * 100)}%` }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right font-mono text-sm tabular-nums">
                    {s.count.toLocaleString()}
                  </span>
                  <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                    {conv !== null ? `${conv}%` : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Leakage */}
        <div className="flex flex-col gap-3">
          <SectionHeading title="Funnel leakage" subtitle="Where conversion falls short of benchmark." />
          <div className="overflow-hidden rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Current Conversion</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead className="text-right">Δ</TableHead>
                  <TableHead className="text-right">Candidate Loss</TableHead>
                  <TableHead>Primary Driver</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leakage.map((l) => (
                  <TableRow key={l.label}>
                    <TableCell className="font-medium">{l.label}</TableCell>
                    <TableCell className="text-right tabular-nums">{l.conversion.toFixed(0)}%</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{l.target}%</TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums font-medium",
                        l.delta < 0 ? "text-critical" : "text-healthy",
                      )}
                    >
                      {l.delta >= 0 ? "+" : ""}
                      {l.delta.toFixed(0)}pp
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{l.loss > 0 ? l.loss : "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{l.driver}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Funnel by function */}
        <div className="flex flex-col gap-3 rounded-md border border-border p-4">
          <div className="flex items-center justify-between">
            <SectionHeading
              title="Funnel by function"
              subtitle={(data?.funnelByFunction ?? []).map((f) => f.function).join(", ") || "No pipeline activity yet."}
            />
            <Tabs value={metric} onValueChange={(v) => setMetric(v as typeof metric)}>
              <TabsList>
                <TabsTrigger value="conversion">Conversion</TabsTrigger>
                <TabsTrigger value="volume">Volume</TabsTrigger>
                <TabsTrigger value="velocity">Velocity</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <FunnelByFunctionChart metric={metric} data={data?.funnelByFunction ?? []} />
        </div>

        {/* Candidate aging */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="flex flex-col gap-3 rounded-md border border-border p-4">
            <SectionHeading
              title="Candidate aging"
              subtitle={`Time in current stage — ${functionFilter} · ${locationFilter} · ${recruiterFilter} · ${sourceFilter}.`}
            />
            <div className="flex flex-col gap-2">
              {aging.map((b) => (
                <div key={b.bucket} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-xs text-muted-foreground">{b.bucket}</span>
                  <div className="h-2 flex-1 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-foreground/80"
                      style={{
                        width: `${Math.max(2, (b.count / Math.max(1, ...aging.map((x) => x.count))) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right text-xs tabular-nums">{b.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-md border border-border p-4 lg:col-span-2">
            <SectionHeading
              title="Intervention queue"
              subtitle={activeStage ? `Filtered to ${activeStage}` : "Candidates blocked or aging beyond SLA."}
            />
            <div className="overflow-hidden rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Candidate</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead className="text-right">Waiting</TableHead>
                    <TableHead>Blocker</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {interventionQueue.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground">{c.role}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">
                          {c.stage}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{c.daysInStage}d</TableCell>
                      <TableCell className="text-muted-foreground">{c.blocker}</TableCell>
                      <TableCell className="text-muted-foreground">{c.recruiter}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          disabled={Boolean(c.nudgedAt) || nudging.has(c.id)}
                          onClick={() => handleNudge(c.id)}
                        >
                          {c.nudgedAt ? "Nudged ✓" : nudging.has(c.id) ? "Sending…" : "Nudge"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {interventionQueue.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                        No candidates need intervention in this view.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
