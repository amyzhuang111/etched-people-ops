import { Info } from "lucide-react";

export function DataDisclaimer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground ${className}`}
    >
      <Info className="size-3.5 shrink-0" />
      Illustrative demo data — not Etched internal data.
    </div>
  );
}
