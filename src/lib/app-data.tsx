"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type {
  AlertItem,
  Candidate,
  Capability,
  CompanyMetric,
  EmployeePlan,
  FunnelByFunctionRow,
  FunnelEventRow,
  HiringFunnelStage,
  Interviewer,
  Milestone,
  Recruiter,
  RecruitingOps,
  Requisition,
  RequisitionDetail,
  SourceQualityRow,
} from "@/types";

export interface AppData {
  requisitions: Requisition[];
  reqDetail: Record<string, RequisitionDetail>;
  candidates: Candidate[];
  recruiters: Recruiter[];
  capabilities: Capability[];
  employeePlan: EmployeePlan[];
  milestones: Milestone[];
  interviewers: Interviewer[];
  alerts: AlertItem[];
  companyMetric: CompanyMetric;
  hiringFunnel: HiringFunnelStage[];
  funnelEvents: FunnelEventRow[];
  funnelByFunction: FunnelByFunctionRow[];
  recruitingOps: RecruitingOps;
  sourceQuality: SourceQualityRow[];
}

interface AppDataState {
  data: AppData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  reassignRequisition: (reqId: string, recruiter: string) => Promise<void>;
  nudgeCandidate: (candidateId: string) => Promise<void>;
}

const AppDataContext = createContext<AppDataState | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/bootstrap", { cache: "no-store" });
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const json: AppData = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetching from the API on mount — the standard data-fetch-on-mount
    // pattern. fetchData's own setState calls all happen after an awaited
    // fetch, not synchronously within this effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const reassignRequisition = useCallback(async (reqId: string, recruiter: string) => {
    const res = await fetch(`/api/requisitions/${reqId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recruiter }),
    });
    if (!res.ok) throw new Error("Failed to reassign requisition");
    setData((prev) =>
      prev
        ? { ...prev, requisitions: prev.requisitions.map((r) => (r.id === reqId ? { ...r, recruiter } : r)) }
        : prev,
    );
  }, []);

  const nudgeCandidate = useCallback(async (candidateId: string) => {
    const res = await fetch(`/api/candidates/${candidateId}/nudge`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to nudge candidate");
    const { nudgedAt } = await res.json();
    setData((prev) =>
      prev
        ? { ...prev, candidates: prev.candidates.map((c) => (c.id === candidateId ? { ...c, nudgedAt } : c)) }
        : prev,
    );
  }, []);

  return (
    <AppDataContext.Provider
      value={{ data, loading, error, refetch: fetchData, reassignRequisition, nudgeCandidate }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within an AppDataProvider");
  return ctx;
}
