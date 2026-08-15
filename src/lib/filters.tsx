"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { CandidateStage, FunnelEventRow, FunctionName, HiringFunnelStage } from "@/types";

export type TimeRange = "30D" | "90D" | "YTD" | "12M";
export type LocationFilter = "All" | "San Jose" | "Taiwan" | "Other";
export type FunctionFilter = "All" | FunctionName;

interface FiltersState {
  timeRange: TimeRange;
  setTimeRange: (t: TimeRange) => void;
  functionFilter: FunctionFilter;
  setFunctionFilter: (f: FunctionFilter) => void;
  locationFilter: LocationFilter;
  setLocationFilter: (l: LocationFilter) => void;
}

const FiltersContext = createContext<FiltersState | null>(null);

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [timeRange, setTimeRange] = useState<TimeRange>("90D");
  const [functionFilter, setFunctionFilter] = useState<FunctionFilter>("All");
  const [locationFilter, setLocationFilter] = useState<LocationFilter>("All");

  const value = useMemo(
    () => ({
      timeRange,
      setTimeRange,
      functionFilter,
      setFunctionFilter,
      locationFilter,
      setLocationFilter,
    }),
    [timeRange, functionFilter, locationFilter],
  );

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export function useFilters() {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error("useFilters must be used within a FiltersProvider");
  return ctx;
}

// Fixed "today" the seed dataset is generated relative to (see
// prisma/seed.ts) — kept as a constant rather than `new Date()` so
// filtering by day-window is deterministic and never diverges between
// server and client render.
const SEED_TODAY = new Date("2026-08-14T00:00:00Z");

/** Trailing window, in days, that a Time Range selection represents. */
export function windowDays(timeRange: TimeRange): number {
  switch (timeRange) {
    case "30D":
      return 30;
    case "90D":
      return 90;
    case "YTD": {
      const jan1 = new Date(Date.UTC(SEED_TODAY.getUTCFullYear(), 0, 1));
      return Math.round((SEED_TODAY.getTime() - jan1.getTime()) / 86_400_000);
    }
    case "12M":
      return 365;
  }
}

/** Days between an ISO date string and the seed dataset's fixed "today". */
export function daysAgo(isoDate: string): number {
  const then = new Date(`${isoDate}T00:00:00Z`);
  return Math.round((SEED_TODAY.getTime() - then.getTime()) / 86_400_000);
}

const FUNNEL_STAGE_LABELS: CandidateStage[] = [
  "Sourced",
  "Recruiter Screen",
  "Technical",
  "Onsite",
  "Offer",
  "Accepted",
  "Started",
];

/**
 * Re-buckets the real per-application funnel events into a cumulative
 * funnel scoped to applications that entered the pipeline within the
 * selected Time Range — real filtering, not a scaled estimate of the
 * all-time totals.
 */
export function computeWindowedFunnel(events: FunnelEventRow[], windowDays: number): HiringFunnelStage[] {
  const inWindow = events.filter((e) => daysAgo(e.enteredPipelineAt) <= windowDays);
  return FUNNEL_STAGE_LABELS.map((stage, idx) => ({
    stage,
    count: inWindow.filter((e) => e.maxBucket >= idx).length,
  }));
}
