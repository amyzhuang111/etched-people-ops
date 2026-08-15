import { cn } from "@/lib/utils";
import type { Priority, RiskLevel } from "@/types";

const RISK_STYLES: Record<RiskLevel, string> = {
  CRITICAL: "bg-critical/10 text-critical border-critical/25",
  HIGH: "bg-warning/10 text-warning border-warning/25",
  MEDIUM: "bg-muted text-foreground/70 border-border",
  LOW: "bg-healthy/10 text-healthy border-healthy/25",
};

export function RiskChip({ level, className }: { level: RiskLevel; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide",
        RISK_STYLES[level],
        className,
      )}
    >
      {level}
    </span>
  );
}

const PRIORITY_STYLES: Record<Priority, string> = {
  P0: "bg-critical/10 text-critical border-critical/25",
  P1: "bg-warning/10 text-warning border-warning/25",
  P2: "bg-muted text-muted-foreground border-border",
};

export function PriorityChip({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
        PRIORITY_STYLES[priority],
        className,
      )}
    >
      {priority}
    </span>
  );
}

export function StatusDot({ level, className }: { level: RiskLevel; className?: string }) {
  const color =
    level === "CRITICAL"
      ? "bg-critical"
      : level === "HIGH"
        ? "bg-warning"
        : level === "MEDIUM"
          ? "bg-muted-foreground"
          : "bg-healthy";
  return <span className={cn("inline-block size-2 rounded-full", color, className)} />;
}
