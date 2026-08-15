"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import type { ForecastAssumptions } from "@/types";

export function ForecastAssumptionsDialog({
  open,
  onOpenChange,
  assumptions,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assumptions: ForecastAssumptions;
  onChange: (a: ForecastAssumptions) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Forecast assumptions</DialogTitle>
          <DialogDescription>
            Editable locally — updating these recalculates the 30/60/90 day forecast.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-5 py-2">
          <AssumptionRow
            label="Offer acceptance"
            value={assumptions.offerAcceptanceRate}
            onChange={(v) => onChange({ ...assumptions, offerAcceptanceRate: v })}
          />
          <AssumptionRow
            label="Accepted → start"
            value={assumptions.acceptedToStartRate}
            onChange={(v) => onChange({ ...assumptions, acceptedToStartRate: v })}
          />
          <AssumptionRow
            label="Onsite → offer"
            value={assumptions.onsiteToOfferRate}
            onChange={(v) => onChange({ ...assumptions, onsiteToOfferRate: v })}
          />
          <AssumptionRow
            label="Monthly regrettable attrition"
            value={assumptions.monthlyRegrettableAttrition}
            max={0.05}
            onChange={(v) => onChange({ ...assumptions, monthlyRegrettableAttrition: v })}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AssumptionRow({
  label,
  value,
  max = 1,
  onChange,
}: {
  label: string;
  value: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-normal text-foreground">{label}</Label>
        <span className="font-mono text-sm tabular-nums text-muted-foreground">
          {(value * 100).toFixed(1)}%
        </span>
      </div>
      <Slider
        value={[value]}
        min={0}
        max={max}
        step={max / 100}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  );
}
