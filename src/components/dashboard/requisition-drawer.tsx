"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { PriorityChip } from "@/components/dashboard/status";
import { useAppData } from "@/lib/app-data";
import type { Requisition } from "@/types";

export function RequisitionDrawer({
  requisition,
  open,
  onOpenChange,
}: {
  requisition: Requisition | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data } = useAppData();
  if (!requisition || !data) return null;
  const detail = data.reqDetail[requisition.id];
  const candidates = data.candidates.filter((c) => c.reqId === requisition.id);
  const atOffer = candidates.filter((c) => c.stage === "Offer" || c.stage === "Accepted").length;
  const onsite = candidates.filter((c) => c.stage === "Onsite").length;
  const maxFunnel = detail ? Math.max(...detail.funnel.map((f) => f.count)) : 1;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <PriorityChip priority={requisition.priority} />
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {requisition.function} · {requisition.capability}
            </span>
          </div>
          <SheetTitle className="text-lg">{requisition.role}</SheetTitle>
          <SheetDescription>
            {requisition.openings} openings · Hiring Lead {requisition.recruiter} · Hiring
            Manager {requisition.hiringManager}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-4 pb-6">
          <div className="grid grid-cols-2 gap-3 rounded-md border border-border p-3 sm:grid-cols-4">
            <Stat label="Open roles" value={String(requisition.openings - requisition.filled)} />
            <Stat label="Median days open" value={String(requisition.daysOpen)} />
            <Stat label="Active candidates" value={String(candidates.length)} />
            <Stat label="Onsite / Offer" value={`${onsite} / ${atOffer}`} />
          </div>

          {detail ? (
            <>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Why it matters
                </p>
                <p className="mt-1 text-sm leading-relaxed text-foreground">{detail.whyItMatters}</p>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Funnel
                </p>
                <div className="mt-2 flex flex-col gap-1.5">
                  {detail.funnel.map((f) => (
                    <div key={f.stage} className="flex items-center gap-2 text-xs">
                      <span className="w-20 shrink-0 text-muted-foreground">{f.stage}</span>
                      <Progress value={(f.count / maxFunnel) * 100} className="h-1.5" />
                      <span className="w-10 shrink-0 text-right font-mono tabular-nums">{f.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-warning/25 bg-warning/5 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-warning">
                  Bottleneck
                </p>
                <p className="mt-1 text-sm font-medium">{detail.bottleneck.stages}</p>
                <p className="text-xs text-muted-foreground">
                  {detail.bottleneck.conversion} conversion vs {detail.bottleneck.benchmark} benchmark
                </p>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Recommended action
                </p>
                <p className="mt-1 text-sm leading-relaxed text-foreground">
                  &ldquo;{detail.recommendedAction}&rdquo;
                </p>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Source map
                </p>
                <div className="mt-2 flex flex-col gap-1.5">
                  {detail.sourceMap.map((s) => (
                    <div key={s.channel} className="flex items-center gap-2 text-xs">
                      <span className="w-28 shrink-0 text-muted-foreground">{s.channel}</span>
                      <Progress value={s.pct} className="h-1.5" />
                      <span className="w-10 shrink-0 text-right font-mono tabular-nums">{s.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Target talent pools
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {detail.targetTalentPools.map((p) => (
                    <span
                      key={p}
                      className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Linked to milestone: <span className="text-foreground">{requisition.milestone}</span>.
              Pipeline strength: {requisition.pipelineStrength}. Scarcity: {requisition.scarcity}.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-base font-semibold tabular-nums">{value}</p>
    </div>
  );
}
