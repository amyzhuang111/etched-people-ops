"use client";

import { useMemo, useState } from "react";

import { TopBar } from "@/components/top-bar";
import { DataDisclaimer } from "@/components/dashboard/data-disclaimer";
import { SectionHeading } from "@/components/dashboard/metric-card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppData } from "@/lib/app-data";
import { computePlanTotals } from "@/lib/plan-totals";
import type { AppData } from "@/lib/app-data";
import type { HiringFunnelStage, Requisition } from "@/types";

function funnelRate(hiringFunnel: HiringFunnelStage[], to: string, from: string): number {
  const toCount = hiringFunnel.find((s) => s.stage === to)?.count ?? 0;
  const fromCount = hiringFunnel.find((s) => s.stage === from)?.count ?? 0;
  return fromCount > 0 ? toCount / fromCount : 0.3;
}

function buildScenarioPresets(data: AppData) {
  const currentAcceptance = data.companyMetric.offerAcceptancePct / 100;
  const currentTTF = data.companyMetric.medianTimeToFillDays;
  const currentRecruiters = data.recruiters.length || 1;
  return [
    {
      name: "Current Case",
      offerAcceptance: currentAcceptance,
      timeToFill: currentTTF,
      monthlyAttrition: 0.006,
      recruiters: currentRecruiters,
    },
    {
      name: "Higher Acceptance",
      offerAcceptance: Math.min(0.95, currentAcceptance + 0.1),
      timeToFill: currentTTF,
      monthlyAttrition: 0.006,
      recruiters: currentRecruiters,
    },
    {
      name: "Faster Process",
      offerAcceptance: currentAcceptance,
      timeToFill: Math.max(14, currentTTF - 10),
      monthlyAttrition: 0.006,
      recruiters: currentRecruiters,
    },
    {
      name: "+2 Recruiters",
      offerAcceptance: currentAcceptance,
      timeToFill: currentTTF,
      monthlyAttrition: 0.006,
      recruiters: currentRecruiters + 2,
    },
    {
      name: "High Attrition",
      offerAcceptance: currentAcceptance,
      timeToFill: currentTTF,
      monthlyAttrition: 0.014,
      recruiters: currentRecruiters,
    },
  ];
}

interface Inputs {
  targetHC: number;
  monthsRemaining: number;
  monthlyAttrition: number;
  offerAcceptance: number;
  interviewToOffer: number;
  timeToFill: number;
  recruiterCapacity: number;
  recruiters: number;
}

// Every user-editable rate/count below can be dragged or typed down to 0 —
// floor each divisor so the outputs degrade to a large-but-finite number
// instead of Infinity/NaN.
const MIN_RATE = 0.01;
const MIN_COUNT = 1;

function computeOutputs(
  inputs: Inputs,
  currentHC: number,
  requisitions: Requisition[],
  screenToOnsite: number,
  sourcedToScreen: number,
) {
  const targetGap = Math.max(0, inputs.targetHC - currentHC);
  const expectedAttrition = Math.round(currentHC * inputs.monthlyAttrition * inputs.monthsRemaining);
  const requiredGrossHires = targetGap + expectedAttrition;
  const requiredOffers = Math.ceil(requiredGrossHires / Math.max(MIN_RATE, inputs.offerAcceptance));
  const requiredOnsites = Math.ceil(requiredOffers / Math.max(MIN_RATE, inputs.interviewToOffer));
  const requiredScreens = Math.ceil(requiredOnsites / Math.max(MIN_RATE, screenToOnsite));
  const estSourcedProspects = Math.ceil(requiredScreens / Math.max(MIN_RATE, sourcedToScreen));
  const recruiterCapacityRequired =
    Math.round(
      (requiredGrossHires /
        (Math.max(MIN_RATE, inputs.recruiterCapacity) * Math.max(MIN_COUNT, inputs.monthsRemaining))) *
        10,
    ) / 10;
  const recruiterGap = Math.round((recruiterCapacityRequired - inputs.recruiters) * 10) / 10;
  const projectedHC = currentHC + requiredGrossHires - expectedAttrition;
  const planAttainmentPct = (projectedHC / Math.max(MIN_COUNT, inputs.targetHC)) * 100;
  const p0Open = requisitions.filter((r) => r.priority === "P0").reduce((a, r) => a + (r.openings - r.filled), 0);
  const totalOpen = Math.max(1, requisitions.reduce((a, r) => a + (r.openings - r.filled), 0));
  const criticalRolesFillable = Math.min(p0Open, Math.round(requiredGrossHires * (p0Open / totalOpen)));

  return {
    targetGap,
    requiredGrossHires,
    requiredOffers,
    requiredOnsites,
    requiredScreens,
    estSourcedProspects,
    recruiterCapacityRequired,
    recruiterGap,
    projectedHC,
    planAttainmentPct,
    criticalRolesFillable,
    p0Open,
  };
}

export default function ScenarioPlannerPage() {
  const { data } = useAppData();
  const { totalCurrentHC, totalTargetHC } = computePlanTotals(data?.employeePlan ?? []);

  // AppData loads asynchronously after mount, so defaults are derived from
  // it directly rather than copied into state via an effect — `overrides`
  // only ever holds the fields the user has actually touched.
  const defaultInputs: Inputs | null = data
    ? {
        targetHC: totalTargetHC,
        monthsRemaining: 4,
        monthlyAttrition: 0.006,
        offerAcceptance: data.companyMetric.offerAcceptancePct / 100,
        interviewToOffer: funnelRate(data.hiringFunnel, "Offer", "Onsite"),
        timeToFill: data.companyMetric.medianTimeToFillDays,
        recruiterCapacity: 7,
        recruiters: data.recruiters.length || 1,
      }
    : null;

  const [overrides, setOverrides] = useState<Partial<Inputs>>({});
  const [activePreset, setActivePreset] = useState("Current Case");

  const requisitions = useMemo(() => data?.requisitions ?? [], [data]);
  const scenarioPresets = useMemo(() => (data ? buildScenarioPresets(data) : []), [data]);
  const screenToOnsite = useMemo(
    () => (data ? funnelRate(data.hiringFunnel, "Onsite", "Recruiter Screen") : 0.3),
    [data],
  );
  const sourcedToScreen = useMemo(
    () => (data ? funnelRate(data.hiringFunnel, "Recruiter Screen", "Sourced") : 0.3),
    [data],
  );

  const inputs: Inputs | null = useMemo(
    () => (defaultInputs ? { ...defaultInputs, ...overrides } : null),
    // defaultInputs is a fresh object every render (derived from `data`),
    // so its own fields (not the object reference) are the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, overrides],
  );
  const outputs = useMemo(
    () =>
      inputs
        ? computeOutputs(inputs, totalCurrentHC, requisitions, screenToOnsite, sourcedToScreen)
        : null,
    [inputs, totalCurrentHC, requisitions, screenToOnsite, sourcedToScreen],
  );

  if (!data || !inputs || !outputs) return null;

  function applyPreset(preset: (typeof scenarioPresets)[number]) {
    setActivePreset(preset.name);
    setOverrides((prev) => ({
      ...prev,
      offerAcceptance: preset.offerAcceptance,
      timeToFill: preset.timeToFill,
      monthlyAttrition: preset.monthlyAttrition,
      recruiters: preset.recruiters,
    }));
  }

  function update<K extends keyof Inputs>(key: K, value: Inputs[K]) {
    setActivePreset("Custom");
    setOverrides((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="Hiring Scenario Planner" description="What has to be true to hit the workforce plan?" />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <DataDisclaimer />

        <div className="flex flex-wrap items-center gap-1.5">
          {scenarioPresets.map((p) => (
            <Button
              key={p.name}
              size="sm"
              variant={activePreset === p.name ? "default" : "outline"}
              className="h-7 text-xs"
              onClick={() => applyPreset(p)}
            >
              {p.name}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Inputs */}
          <div className="flex flex-col gap-5 rounded-md border border-border p-4">
            <SectionHeading title="Assumptions" subtitle={`Current HC ${totalCurrentHC} (fixed)`} />

            <NumberField label="Target HC" value={inputs.targetHC} onChange={(v) => update("targetHC", v)} />
            <NumberField
              label="Months remaining"
              value={inputs.monthsRemaining}
              onChange={(v) => update("monthsRemaining", v)}
            />
            <SliderField
              label="Monthly attrition"
              value={inputs.monthlyAttrition}
              max={0.03}
              onChange={(v) => update("monthlyAttrition", v)}
            />
            <SliderField
              label="Offer acceptance"
              value={inputs.offerAcceptance}
              onChange={(v) => update("offerAcceptance", v)}
            />
            <SliderField
              label="Interview → offer"
              value={inputs.interviewToOffer}
              onChange={(v) => update("interviewToOffer", v)}
            />
            <NumberField
              label="Average time to fill (days)"
              value={inputs.timeToFill}
              onChange={(v) => update("timeToFill", v)}
            />
            <NumberField
              label="Recruiter capacity (starts / recruiter / month)"
              value={inputs.recruiterCapacity}
              onChange={(v) => update("recruiterCapacity", v)}
              step={0.5}
            />
            <NumberField label="Recruiters" value={inputs.recruiters} onChange={(v) => update("recruiters", v)} />
          </div>

          {/* Outputs */}
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <OutputCard label="Target Gap" value={outputs.targetGap} />
              <OutputCard label="Required Gross Hires" value={outputs.requiredGrossHires} emphasis />
              <OutputCard label="Required Offers" value={outputs.requiredOffers} />
              <OutputCard label="Required Onsites" value={outputs.requiredOnsites} />
              <OutputCard label="Required Screens" value={outputs.requiredScreens} />
              <OutputCard label="Est. Sourced Prospects" value={outputs.estSourcedProspects} />
            </div>
            <div className="rounded-md border border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Recruiter capacity required
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{outputs.recruiterCapacityRequired}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Current capacity
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{inputs.recruiters}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Gap</p>
                  <p
                    className={cn(
                      "mt-1 text-2xl font-semibold tabular-nums",
                      outputs.recruiterGap > 0 ? "text-critical" : "text-healthy",
                    )}
                  >
                    {outputs.recruiterGap > 0 ? "+" : ""}
                    {outputs.recruiterGap}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-border p-4">
              <SectionHeading title={activePreset} subtitle="Scenario outcome" />
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <OutputCard label="Projected HC" value={outputs.projectedHC} />
                <OutputCard label="Plan Attainment" value={`${outputs.planAttainmentPct.toFixed(0)}%`} />
                <OutputCard
                  label="Critical Roles Filled"
                  value={`${outputs.criticalRolesFillable} / ${outputs.p0Open}`}
                />
                <OutputCard label="Recruiter Load" value={outputs.recruiterCapacityRequired} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-normal text-muted-foreground">{label}</Label>
      <Input
        type="number"
        value={value}
        step={step}
        min={0}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="h-8 w-full"
      />
    </div>
  );
}

function SliderField({
  label,
  value,
  max = 1,
  onChange,
}: {
  label: string;
  value: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-normal text-muted-foreground">{label}</Label>
        <span className="font-mono text-xs tabular-nums">{(value * 100).toFixed(1)}%</span>
      </div>
      <Slider value={[value]} min={0} max={max} step={max / 200} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}

function OutputCard({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: number | string;
  emphasis?: boolean;
}) {
  return (
    <div className={cn("rounded-md border border-border p-3", emphasis && "bg-muted/40")}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
