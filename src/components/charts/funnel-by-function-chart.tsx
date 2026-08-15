"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { FunnelByFunctionRow } from "@/types";

const config = {
  onsites: { label: "Onsites", color: "var(--chart-1)" },
  offers: { label: "Offers", color: "var(--chart-2)" },
  accepts: { label: "Accepts", color: "var(--chart-3)" },
  screenRate: { label: "Screen → Onsite", color: "var(--chart-1)" },
  offerRate: { label: "Onsite → Offer", color: "var(--chart-2)" },
  acceptRate: { label: "Offer → Accept", color: "var(--chart-3)" },
  timeToFillDays: { label: "Time to fill (days)", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function FunnelByFunctionChart({
  metric,
  data,
}: {
  metric: "volume" | "conversion" | "velocity";
  data: FunnelByFunctionRow[];
}) {
  if (metric === "velocity") {
    return (
      <ChartContainer config={config} className="h-[260px] w-full">
        <BarChart data={data} margin={{ left: -20, right: 12 }}>
          <CartesianGrid vertical={false} strokeOpacity={0.15} />
          <XAxis dataKey="function" tickLine={false} axisLine={false} fontSize={11} />
          <YAxis tickLine={false} axisLine={false} fontSize={11} width={32} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="timeToFillDays" fill="var(--chart-1)" radius={3} />
        </BarChart>
      </ChartContainer>
    );
  }

  const rows = data.map((f) => ({
    function: f.function,
    onsites: f.onsites,
    offers: f.offers,
    accepts: f.accepts,
    screenRate: f.screens > 0 ? Math.round((f.onsites / f.screens) * 1000) / 10 : 0,
    offerRate: f.onsites > 0 ? Math.round((f.offers / f.onsites) * 1000) / 10 : 0,
    acceptRate: f.offers > 0 ? Math.round((f.accepts / f.offers) * 1000) / 10 : 0,
  }));

  const keys =
    metric === "volume"
      ? (["onsites", "offers", "accepts"] as const)
      : (["screenRate", "offerRate", "acceptRate"] as const);

  return (
    <ChartContainer config={config} className="h-[260px] w-full">
      <BarChart data={rows} margin={{ left: -20, right: 12 }}>
        <CartesianGrid vertical={false} strokeOpacity={0.15} />
        <XAxis dataKey="function" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} width={32} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {keys.map((k) => (
          <Bar key={k} dataKey={k} fill={`var(--color-${k})`} radius={3} />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
