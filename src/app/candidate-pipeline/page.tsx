"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Search } from "lucide-react";

import { TopBar } from "@/components/top-bar";
import { DataDisclaimer } from "@/components/dashboard/data-disclaimer";
import { CandidateDrawer } from "@/components/dashboard/candidate-drawer";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFilters, windowDays, daysAgo } from "@/lib/filters";
import { useAppData } from "@/lib/app-data";
import type { Candidate } from "@/types";

type SavedView = "All Candidates" | "Needs Attention" | "P0 Searches" | "Offer Stage" | "Aging > 5 Days" | "My Candidates";
const SAVED_VIEWS: SavedView[] = [
  "All Candidates",
  "Needs Attention",
  "P0 Searches",
  "Offer Stage",
  "Aging > 5 Days",
  "My Candidates",
];

type SortKey = "name" | "role" | "daysInStage" | "overallScore";

export default function CandidatePipelinePage() {
  const { data } = useAppData();
  const [view, setView] = useState<SavedView>("All Candidates");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("daysInStage");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [open, setOpen] = useState(false);
  const { functionFilter, locationFilter, timeRange } = useFilters();
  const maxSourcedDaysAgo = windowDays(timeRange);

  const requisitions = useMemo(() => data?.requisitions ?? [], [data]);
  const candidates = useMemo(() => data?.candidates ?? [], [data]);

  const p0ReqIds = useMemo(
    () => new Set(requisitions.filter((r) => r.priority === "P0").map((r) => r.id)),
    [requisitions],
  );

  // No auth in this demo, so "My Candidates" has no real logged-in user to
  // filter by — pins to whichever recruiter currently has the largest
  // candidate load, so the view has something to show instead of landing
  // on a recruiter between assignments. Ties broken alphabetically so the
  // choice stays stable across reloads.
  const myRecruiter = useMemo(() => {
    const recruiters = data?.recruiters ?? [];
    return (
      [...recruiters].sort((a, b) => b.candidates - a.candidates || a.name.localeCompare(b.name))[0]?.name ?? null
    );
  }, [data]);

  const filtered = useMemo(() => {
    let rows = candidates.filter(
      (c) =>
        c.stage !== "Started" &&
        (functionFilter === "All" || c.function === functionFilter) &&
        (locationFilter === "All" || c.location === locationFilter) &&
        daysAgo(c.sourcedDate) <= maxSourcedDaysAgo,
    );
    switch (view) {
      case "Needs Attention":
        rows = rows.filter((c) => c.risk !== "On Track");
        break;
      case "P0 Searches":
        rows = rows.filter((c) => p0ReqIds.has(c.reqId));
        break;
      case "Offer Stage":
        rows = rows.filter((c) => c.stage === "Offer" || c.stage === "Accepted");
        break;
      case "Aging > 5 Days":
        rows = rows.filter((c) => c.daysInStage > 5);
        break;
      case "My Candidates":
        rows = rows.filter((c) => c.recruiter === myRecruiter);
        break;
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter(
        (c) => c.name.toLowerCase().includes(q) || c.role.toLowerCase().includes(q),
      );
    }
    const sorted = [...rows].sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      if (sortKey === "name") {
        av = a.name;
        bv = b.name;
      } else if (sortKey === "role") {
        av = a.role;
        bv = b.role;
      } else if (sortKey === "daysInStage") {
        av = a.daysInStage;
        bv = b.daysInStage;
      } else {
        av = a.overallScore ?? -1;
        bv = b.overallScore ?? -1;
      }
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : av - (bv as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [candidates, view, query, sortKey, sortDir, p0ReqIds, functionFilter, locationFilter, maxSourcedDaysAgo, myRecruiter]);

  if (!data) return null;

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const riskStyle = (risk: Candidate["risk"]) =>
    risk === "At Risk" ? "text-critical" : risk === "Watch" ? "text-warning" : "text-muted-foreground";

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="Candidate Pipeline" description="Recruiting operating table for every active candidate." />
      <div className="flex flex-1 flex-col gap-4 p-6">
        <DataDisclaimer />

        <div className="flex flex-wrap items-center gap-1.5">
          {SAVED_VIEWS.map((v) => (
            <Button
              key={v}
              size="sm"
              variant={view === v ? "default" : "outline"}
              className="h-7 text-xs"
              onClick={() => setView(v)}
            >
              {v}
            </Button>
          ))}
          <div className="relative ml-auto w-56">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search candidate or role..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 pl-8 text-sm"
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {filtered.length} candidates sourced within {timeRange} — {functionFilter} · {locationFilter}
        </p>

        <div className="overflow-hidden rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <SortableHead label="Candidate" active={sortKey === "name"} dir={sortDir} onClick={() => toggleSort("name")} />
                <SortableHead label="Role" active={sortKey === "role"} dir={sortDir} onClick={() => toggleSort("role")} />
                <TableHead>Function</TableHead>
                <TableHead>Stage</TableHead>
                <SortableHead label="Score" align="right" active={sortKey === "overallScore"} dir={sortDir} onClick={() => toggleSort("overallScore")} />
                <TableHead>Source</TableHead>
                <TableHead>Owner</TableHead>
                <SortableHead label="Days in Stage" align="right" active={sortKey === "daysInStage"} dir={sortDir} onClick={() => toggleSort("daysInStage")} />
                <TableHead>Next Step</TableHead>
                <TableHead className="text-right">Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => {
                    setSelected(c);
                    setOpen(true);
                  }}
                >
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.role}</TableCell>
                  <TableCell className="text-muted-foreground">{c.function}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">
                      {c.stage}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{c.overallScore ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.source}</TableCell>
                  <TableCell className="text-muted-foreground">{c.recruiter}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.daysInStage}d</TableCell>
                  <TableCell className="max-w-[160px] truncate text-muted-foreground">{c.nextAction}</TableCell>
                  <TableCell className={cn("text-right text-xs font-medium", riskStyle(c.risk))}>
                    {c.risk}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-8 text-center text-sm text-muted-foreground">
                    No candidates match this view.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>

      <CandidateDrawer candidate={selected} open={open} onOpenChange={setOpen} />
    </div>
  );
}

function SortableHead({
  label,
  active,
  dir,
  onClick,
  align = "left",
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
  align?: "left" | "right";
}) {
  const Icon = dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead className={align === "right" ? "text-right" : undefined}>
      <button
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
        {active ? <Icon className="size-3" /> : null}
      </button>
    </TableHead>
  );
}
