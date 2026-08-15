"use client";

import { TopBar } from "@/components/top-bar";
import { DataDisclaimer } from "@/components/dashboard/data-disclaimer";
import { SectionHeading } from "@/components/dashboard/metric-card";
import { DEFAULT_ASSUMPTIONS } from "@/data/reference";
import { useAppData } from "@/lib/app-data";

export default function SettingsPage() {
  const { data } = useAppData();
  if (!data) return null;

  const avgTargetCapacity =
    data.recruiters.length > 0
      ? data.recruiters.reduce((a, r) => a + r.targetCapacity, 0) / data.recruiters.length
      : 0;

  const rows: { label: string; value: string }[] = [
    { label: "Offer acceptance rate", value: `${(DEFAULT_ASSUMPTIONS.offerAcceptanceRate * 100).toFixed(0)}%` },
    { label: "Accepted → start rate", value: `${(DEFAULT_ASSUMPTIONS.acceptedToStartRate * 100).toFixed(0)}%` },
    { label: "Onsite → offer rate", value: `${(DEFAULT_ASSUMPTIONS.onsiteToOfferRate * 100).toFixed(0)}%` },
    { label: "Monthly regrettable attrition", value: `${(DEFAULT_ASSUMPTIONS.monthlyRegrettableAttrition * 100).toFixed(1)}%` },
    {
      label: "Recruiter target capacity",
      value: `${avgTargetCapacity.toFixed(1)} starts / recruiter / month`,
    },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="Settings" description="Default assumptions used across the app." />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <DataDisclaimer />

        <div className="flex max-w-lg flex-col gap-3">
          <SectionHeading
            title="Default forecast assumptions"
            subtitle="Edit these live in Scenario Planner or the Overview forecast card."
          />
          <div className="overflow-hidden rounded-md border border-border">
            {rows.map((r) => (
              <div
                key={r.label}
                className="flex items-center justify-between border-b border-border px-4 py-2.5 text-sm last:border-b-0"
              >
                <span className="text-muted-foreground">{r.label}</span>
                <span className="font-mono tabular-nums">{r.value}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Requisitions, candidates, and recruiters live in a real Postgres database — reassigning
            a requisition persists across reloads. Recruiter target capacity above is read live
            from that database. The Scenario Planner opens with these defaults pulled from real
            current metrics, but any values you drag or type there are local &ldquo;what-if&rdquo;
            edits by design and reset on reload.
          </p>
        </div>
      </div>
    </div>
  );
}
