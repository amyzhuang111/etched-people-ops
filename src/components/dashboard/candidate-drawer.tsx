"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppData } from "@/lib/app-data";
import type { Candidate } from "@/types";

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <div className="flex flex-1 gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={`h-1.5 flex-1 rounded-full ${n <= value ? "bg-foreground/80" : "bg-muted"}`}
          />
        ))}
      </div>
      <span className="w-6 shrink-0 text-right font-mono tabular-nums">{value}</span>
    </div>
  );
}

export function CandidateDrawer({
  candidate,
  open,
  onOpenChange,
}: {
  candidate: Candidate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { nudgeCandidate } = useAppData();
  const [sending, setSending] = useState(false);

  if (!candidate) return null;
  const reminderSent = Boolean(candidate.nudgedAt);
  const latestScorecard = candidate.scorecards[candidate.scorecards.length - 1];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">
              {candidate.stage}
            </Badge>
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {candidate.function}
            </span>
          </div>
          <SheetTitle className="text-lg">{candidate.name}</SheetTitle>
          <SheetDescription>{candidate.role}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-4 pb-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Candidate overview
            </p>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <InfoRow label="Location" value={candidate.location} />
              <InfoRow label="Source" value={candidate.source} />
              <InfoRow label="Current company" value={candidate.currentCompany} />
              <InfoRow label="Experience" value={`${candidate.experienceYears} yrs`} />
              <InfoRow label="Recruiter" value={candidate.recruiter} />
              <InfoRow label="Hiring manager" value={candidate.hiringManager} />
            </div>
          </div>

          {latestScorecard ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Interview signal
              </p>
              <div className="mt-2 flex flex-col gap-2">
                <ScoreBar label="Technical depth" value={latestScorecard.technicalDepth} />
                <ScoreBar label="Problem solving" value={latestScorecard.problemSolving} />
                <ScoreBar label="Execution" value={latestScorecard.execution} />
                <ScoreBar label="Communication" value={latestScorecard.communication} />
                <ScoreBar label="Domain expertise" value={latestScorecard.domainExpertise} />
                <ScoreBar label="Overall recommendation" value={latestScorecard.overallRecommendation} />
              </div>
              <div className="mt-3 rounded-md border border-border bg-muted/30 p-2.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{latestScorecard.interviewer}</span> —{" "}
                {latestScorecard.notes}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No interview scorecards submitted yet.</p>
          )}

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Process velocity
            </p>
            <div className="mt-2 flex flex-col gap-1.5">
              {candidate.timeline.map((t) => (
                <div key={t.stage} className="flex items-center justify-between text-xs">
                  <span>{t.stage}</span>
                  <span className="font-mono text-muted-foreground">
                    {t.date
                      ? new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-border p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Next action
            </p>
            <p className="mt-1 text-sm">{candidate.nextAction}</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              disabled={reminderSent || sending}
              onClick={async () => {
                setSending(true);
                try {
                  await nudgeCandidate(candidate.id);
                } finally {
                  setSending(false);
                }
              }}
            >
              {reminderSent ? "Reminder sent ✓" : sending ? "Sending…" : "Send Reminder"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
