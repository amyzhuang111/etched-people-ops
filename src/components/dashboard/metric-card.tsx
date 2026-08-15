import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  delta,
  deltaTone = "neutral",
  helper,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: "positive" | "negative" | "neutral";
  helper?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-card px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      {delta ? (
        <p
          className={cn(
            "mt-0.5 text-xs font-medium",
            deltaTone === "positive" && "text-healthy",
            deltaTone === "negative" && "text-critical",
            deltaTone === "neutral" && "text-muted-foreground",
          )}
        >
          {delta}
        </p>
      ) : helper ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{helper}</p>
      ) : null}
    </div>
  );
}

export function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
