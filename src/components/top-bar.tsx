"use client";

import { ChevronDown } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertsDrawer } from "@/components/alerts-drawer";
import { useFilters, type TimeRange } from "@/lib/filters";
import { FUNCTIONS } from "@/data/reference";
import { cn } from "@/lib/utils";

const TIME_RANGES: TimeRange[] = ["30D", "90D", "YTD", "12M"];
const LOCATIONS = ["All", "San Jose", "Taiwan", "Other"] as const;

export function TopBar({ title, description }: { title: string; description?: string }) {
  const { timeRange, setTimeRange, functionFilter, setFunctionFilter, locationFilter, setLocationFilter } =
    useFilters();

  return (
    <header className="sticky top-0 z-10 flex flex-col gap-3 border-b border-border bg-background/95 px-6 py-3.5 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <div>
            <h1 className="text-base font-semibold tracking-tight">{title}</h1>
            {description ? (
              <p className="text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-md border border-border p-0.5">
            {TIME_RANGES.map((t) => (
              <button
                key={t}
                onClick={() => setTimeRange(t)}
                className={cn(
                  "rounded-[5px] px-2.5 py-1 text-xs font-medium transition-colors",
                  timeRange === t
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs font-medium">
                {functionFilter}
                <ChevronDown className="size-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
              <DropdownMenuItem onSelect={() => setFunctionFilter("All")}>All functions</DropdownMenuItem>
              {FUNCTIONS.map((f) => (
                <DropdownMenuItem key={f} onSelect={() => setFunctionFilter(f)}>
                  {f}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs font-medium">
                {locationFilter}
                <ChevronDown className="size-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {LOCATIONS.map((l) => (
                <DropdownMenuItem key={l} onSelect={() => setLocationFilter(l)}>
                  {l}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-4" />

          <span className="hidden text-xs text-muted-foreground sm:inline">
            Last refreshed: Today 08:42
          </span>

          <AlertsDrawer />

          <Avatar className="size-7">
            <AvatarFallback className="bg-primary text-[11px] font-medium text-primary-foreground">
              AZ
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
