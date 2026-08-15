"use client";

import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";

import { TopBar } from "@/components/top-bar";
import { DataDisclaimer } from "@/components/dashboard/data-disclaimer";
import { MetricCard, SectionHeading } from "@/components/dashboard/metric-card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { planAttainment, riskFromCriticality } from "@/lib/formulas";
import { computePlanTotals } from "@/lib/plan-totals";
import { useAppData } from "@/lib/app-data";
import { buildLeadershipBrief } from "@/lib/leadership-brief";

function buildBriefText({
  weekOf,
  attainment,
  atRiskCount,
  startsThisWeek,
  offerAcceptance,
  medianTTF,
  whatChanged,
  topRisks,
  decisionsNeeded,
}: {
  weekOf: string;
  attainment: number;
  atRiskCount: number;
  startsThisWeek: number;
  offerAcceptance: number;
  medianTTF: number;
  whatChanged: { tone: "positive" | "negative"; text: string }[];
  topRisks: string[];
  decisionsNeeded: string[];
}) {
  return [
    `WEEKLY TALENT BRIEF — Week of ${weekOf}`,
    "",
    "EXECUTIVE SUMMARY",
    `Hiring plan: ${attainment.toFixed(0)}% on trajectory`,
    `Critical searches: ${atRiskCount} at risk`,
    `Starts: ${startsThisWeek} this week`,
    `Offer acceptance: ${offerAcceptance.toFixed(0)}%`,
    `Median TTF: ${medianTTF} days`,
    "",
    "WHAT CHANGED",
    ...(whatChanged.length > 0
      ? whatChanged.map((c) => `${c.tone === "positive" ? "+" : "-"} ${c.text}`)
      : ["No notable changes in the last 7 days."]),
    "",
    "TOP RISKS",
    ...topRisks.map((r, i) => `${String(i + 1).padStart(2, "0")} ${r}`),
    "",
    "DECISIONS NEEDED",
    ...decisionsNeeded.map((d, i) => `${String(i + 1).padStart(2, "0")} ${d}`),
    "",
    "Illustrative demo data — not Etched internal data.",
  ].join("\n");
}

export default function LeadershipBriefPage() {
  const { data } = useAppData();
  const [copied, setCopied] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);

  if (!data) return null;

  const weekOf = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const { totalProjectedHC, totalTargetHC } = computePlanTotals(data.employeePlan);
  const attainment = planAttainment(totalProjectedHC, totalTargetHC);
  const atRiskCount = data.requisitions.filter((r) => {
    const risk = riskFromCriticality(r.criticalityScore);
    return risk === "CRITICAL" || risk === "HIGH";
  }).length;
  const offerAcceptance = data.companyMetric.offerAcceptancePct;
  const medianTTF = data.companyMetric.medianTimeToFillDays;

  const { whatChanged, topRisks, decisionsNeeded } = buildLeadershipBrief(data);

  // Company-wide hires (not scoped to open requisitions, unlike
  // data.candidates) with a startDate in the last 7 days.
  const startsThisWeek = data.companyMetric.startsLast7Days;

  const briefText = buildBriefText({
    weekOf,
    attainment,
    atRiskCount,
    startsThisWeek,
    offerAcceptance,
    medianTTF,
    whatChanged,
    topRisks,
    decisionsNeeded,
  });

  async function handleCopy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(briefText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      }
      throw new Error("Clipboard unavailable");
    } catch {
      setShowCopyModal(true);
    }
  }

  function handleExport() {
    const blob = new Blob([briefText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "etched-weekly-talent-brief.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="Weekly Talent Brief" description={`Week of ${weekOf}`} />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <DataDisclaimer />

        <div className="flex flex-col gap-3">
          <SectionHeading title="Executive summary" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <MetricCard label="Hiring Plan" value={`${attainment.toFixed(0)}%`} helper="On trajectory" />
            <MetricCard label="Critical Searches" value={String(atRiskCount)} helper="At risk" />
            <MetricCard label="Starts" value={String(startsThisWeek)} helper="This week" />
            <MetricCard label="Offer Acceptance" value={`${offerAcceptance.toFixed(0)}%`} />
            <MetricCard label="Median TTF" value={`${medianTTF} days`} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-md border border-border p-4">
            <SectionHeading title="Recent activity" subtitle="Trailing 7 days" />
            <ul className="mt-3 flex flex-col gap-2">
              {whatChanged.length === 0 ? (
                <li className="text-sm text-muted-foreground">No notable changes in the last 7 days.</li>
              ) : null}
              {whatChanged.map((c) => (
                <li key={c.text} className="flex gap-2 text-sm">
                  <span className={c.tone === "positive" ? "text-healthy" : "text-critical"}>
                    {c.tone === "positive" ? "+" : "−"}
                  </span>
                  <span className="text-foreground">{c.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-md border border-border p-4">
            <SectionHeading title="Top risks" />
            <ol className="mt-3 flex flex-col gap-2.5">
              {topRisks.map((r, i) => (
                <li key={r} className="flex gap-2.5 text-sm">
                  <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  <span>{r}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-md border border-border p-4">
            <SectionHeading title="Decisions needed" />
            <ol className="mt-3 flex flex-col gap-2.5">
              {decisionsNeeded.map((d, i) => (
                <li key={d} className="flex gap-2.5 text-sm">
                  <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  <span>{d}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleCopy} size="sm" variant="outline" className="gap-1.5">
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy Brief"}
          </Button>
          <Button onClick={handleExport} size="sm" variant="outline" className="gap-1.5">
            <Download className="size-3.5" />
            Export
          </Button>
        </div>
      </div>

      <Dialog open={showCopyModal} onOpenChange={setShowCopyModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Weekly Talent Brief</DialogTitle>
          </DialogHeader>
          <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 font-mono text-xs">
            {briefText}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
