"use client";

import { TopBar } from "@/components/top-bar";
import { DataDisclaimer } from "@/components/dashboard/data-disclaimer";
import { MetricCard, SectionHeading } from "@/components/dashboard/metric-card";
import { FUNCTIONS, SOURCE_CHANNELS } from "@/data/reference";
import { useAppData } from "@/lib/app-data";

export default function DataPage() {
  const { data } = useAppData();
  if (!data) return null;

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="Data" description="What backs this demo, and how it was generated." />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <DataDisclaimer />

        <div className="flex flex-col gap-3">
          <SectionHeading title="Dataset composition" subtitle="Live counts from Postgres via /api/bootstrap." />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard label="Functions" value={String(FUNCTIONS.length)} />
            <MetricCard label="Capabilities" value={String(data.capabilities.length)} />
            <MetricCard label="Requisitions" value={String(data.requisitions.length)} />
            <MetricCard label="Candidates" value={String(data.candidates.length)} />
            <MetricCard label="Recruiters" value={String(data.recruiters.length)} />
            <MetricCard label="Milestones" value={String(data.milestones.length)} />
            <MetricCard label="Sourcing Channels" value={String(SOURCE_CHANNELS.length)} />
            <MetricCard label="Interviewers" value={String(data.interviewers.length)} />
          </div>
        </div>

        <div className="max-w-2xl rounded-md border border-border p-4 text-sm leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">How this data was generated</p>
          <p className="mt-2">
            A ~24-model relational schema (Employee, Requisition, Candidate, Application,
            ApplicationStageEvent, Interview, Offer, Hire, Milestone, Capability, and more) lives
            in Postgres (Prisma), seeded once from a deterministic generator (fixed pseudo-random
            seed, mulberry32 — never regenerated on render). Every number on every page — headcount,
            open roles, pipeline coverage, risk scores, the hiring funnel, source-channel
            effectiveness, time to fill — is computed live from those rows, not pre-aggregated or
            hand-entered. Pipeline history is event-sourced: a candidate&rsquo;s stage is derived
            from its full <code className="rounded bg-muted px-1 py-0.5 text-xs">ApplicationStageEvent</code>{" "}
            trail, never inferred from a single &ldquo;current stage&rdquo; field. This page and every
            other reads that data live from{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">/api/bootstrap</code>, and
            actions like reassigning a requisition write back to the same database.
          </p>
          <p className="mt-2">
            Two genuine gaps remain, shown as zero rather than invented: individual interviewer
            identity isn&rsquo;t tracked on an Interview record yet, and there&rsquo;s no cost-per-hire or
            post-hire retention tracking in the schema. Org taxonomy (function names, sourcing
            channels) stays static config, the same way it would sit in a settings table in a real
            system.
          </p>
          <p className="mt-2">
            Facts verified against etched.com: San Jose HQ plus a Taiwan factory and a San Jose
            data center; and six functions with a named public VP — ASIC, Architecture, Platform,
            Software, Production, Finance (ASIC and Architecture actually report to one combined
            VP in reality; this demo splits them for planning granularity). Several ASIC/Platform/
            Software capability names (Physical Design, DFT, RTL, Interface IP, SI/PI, Electrical,
            Supercomputing, Firmware) match real open role titles on their careers page. GTM,
            Operations, People, and Other are illustrative additions for a complete org, not named
            on the public site. Everything else — headcounts, requisitions, candidates, scores,
            and forecasts — is entirely fictional.
          </p>
        </div>
      </div>
    </div>
  );
}
