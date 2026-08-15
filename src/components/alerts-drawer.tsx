"use client";

import { Bell } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppData } from "@/lib/app-data";
import { cn } from "@/lib/utils";

const LEVEL_STYLES: Record<string, string> = {
  CRITICAL: "border-critical/30 bg-critical/5 text-critical",
  WARNING: "border-warning/30 bg-warning/5 text-warning",
  INFO: "border-border bg-muted/40 text-muted-foreground",
};

export function AlertsDrawer() {
  const { data } = useAppData();
  const alerts = data?.alerts ?? [];
  const criticalCount = alerts.filter((a) => a.level === "CRITICAL").length;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-8">
          <Bell className="size-4" />
          {criticalCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex size-3.5 items-center justify-center rounded-full bg-critical text-[9px] font-medium text-white">
              {criticalCount}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Alerts</SheetTitle>
          <SheetDescription>
            Deterministic signals generated from the demo dataset — illustrative only.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-2 overflow-y-auto px-4 pb-4">
          {alerts.length === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-muted-foreground">
              No active alerts. The alert engine lands in a later phase.
            </p>
          ) : null}
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={cn("rounded-md border px-3 py-2.5 text-sm", LEVEL_STYLES[alert.level])}
            >
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className={cn("border-current text-[10px]", LEVEL_STYLES[alert.level])}>
                  {alert.level}
                </Badge>
                <span className="text-[10px] text-muted-foreground">{alert.timeAgo}</span>
              </div>
              <p className="mt-1.5 font-medium text-foreground">{alert.message}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{alert.detail}</p>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
