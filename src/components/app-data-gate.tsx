"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useAppData } from "@/lib/app-data";
import { Button } from "@/components/ui/button";

export function AppDataGate({ children }: { children: React.ReactNode }) {
  const { data, loading, error, refetch } = useAppData();

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <AlertTriangle className="size-6 text-critical" />
        <p className="text-sm font-medium">Couldn&apos;t reach the database.</p>
        <p className="max-w-sm text-xs text-muted-foreground">{error}</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <p className="text-xs">Loading live data…</p>
      </div>
    );
  }

  return <>{children}</>;
}
