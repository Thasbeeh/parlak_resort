"use client";

import * as React from "react";
import {
  resolveSlabForHeadcount,
  calculateModifiedPrice,
  PriceSlabLike,
  PriceModifierLike,
} from "@/lib/pricing/resolve-modifiers";
import { UnitType, StayType, UNIT_STAY_TYPES } from "@/schemas/price.schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Calculator,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Users,
  Coins,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface PriceCalculatorWidgetProps {
  slabs: PriceSlabLike[];
  unitType: UnitType;
  maxGuestCapacity: number;
  initialStayType?: StayType;
  modifiers?: PriceModifierLike[];
  className?: string;
}

export function PriceCalculatorWidget({
  slabs,
  unitType,
  maxGuestCapacity,
  initialStayType,
  modifiers = [],
  className,
}: PriceCalculatorWidgetProps) {
  const allowedStayTypes = UNIT_STAY_TYPES[unitType] || ["OVERNIGHT", "DAY_SLOT"];
  const [selectedStayType, setSelectedStayType] = React.useState<StayType>(
    initialStayType || allowedStayTypes[0]
  );
  const [headcount, setHeadcount] = React.useState<number>(1);
  const [simulateWeekend, setSimulateWeekend] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (!allowedStayTypes.includes(selectedStayType)) {
      setSelectedStayType(allowedStayTypes[0]);
    }
  }, [allowedStayTypes, selectedStayType]);

  const activeSlabsForSlot = React.useMemo(() => {
    return slabs
      .filter((s) => s.stayType === selectedStayType)
      .sort((a, b) => a.minHeadcount - b.minHeadcount);
  }, [slabs, selectedStayType]);

  const resolvedSlab = React.useMemo(() => {
    return resolveSlabForHeadcount(activeSlabsForSlot, headcount, selectedStayType);
  }, [activeSlabsForSlot, headcount, selectedStayType]);

  // Find simulated weekend modifier if any, or default to standard 15% preview
  const weekendModifier = React.useMemo(() => {
    return modifiers.find((m) => m.type === "WEEKEND" && m.isActive);
  }, [modifiers]);

  const simulatedPercentage = weekendModifier ? weekendModifier.percentage : 15;
  const effectivePercentage = simulateWeekend ? simulatedPercentage : 0;
  const finalPrice = resolvedSlab
    ? calculateModifiedPrice(resolvedSlab.basePrice, effectivePercentage)
    : 0;

  const isFloorRuleApplied =
    resolvedSlab &&
    activeSlabsForSlot.length > 0 &&
    headcount < activeSlabsForSlot[0].minHeadcount;

  const isExceeded =
    headcount > maxGuestCapacity ||
    (activeSlabsForSlot.length > 0 &&
      headcount > activeSlabsForSlot[activeSlabsForSlot.length - 1].maxHeadcount);

  return (
    <div
      className={cn(
        "rounded-xl border bg-card/60 backdrop-blur-xs p-4 shadow-xs space-y-4",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10 text-primary">
            <Calculator className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-foreground">
              Rate Simulator & Quote Tester
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Verify resolved tariffs for arbitrary guest counts in real time
            </p>
          </div>
        </div>

        <Badge variant="outline" className="font-mono text-[10px] px-2 py-0.5">
          Max: {maxGuestCapacity} Pax
        </Badge>
      </div>

      {/* Stay Type Selector */}
      <div className="flex flex-wrap gap-1.5">
        {allowedStayTypes.map((st) => (
          <Button
            key={st}
            type="button"
            size="compact"
            variant={selectedStayType === st ? "default" : "outline"}
            onClick={() => setSelectedStayType(st)}
            className="text-[11px] h-7 px-2.5 font-medium select-none transition-transform duration-100 ease-out active:scale-[0.98]"
          >
            {st.replace("_", " ")}
          </Button>
        ))}
      </div>

      {/* Headcount Input Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
        <div className="space-y-1.5">
          <Label htmlFor="sim-headcount" className="text-xs flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            Test Guest Headcount
          </Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-xs"
              onClick={() => setHeadcount((prev) => Math.max(1, prev - 1))}
              disabled={headcount <= 1}
              className="h-8 w-8 select-none transition-transform duration-100 ease-out active:scale-95"
            >
              -
            </Button>
            <Input
              id="sim-headcount"
              type="number"
              min={1}
              max={maxGuestCapacity * 2}
              value={headcount}
              onChange={(e) => setHeadcount(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="h-8 text-base md:text-xs font-mono text-center tabular-nums font-semibold"
            />
            <Button
              type="button"
              variant="outline"
              size="icon-xs"
              onClick={() => setHeadcount((prev) => prev + 1)}
              className="h-8 w-8 select-none transition-transform duration-100 ease-out active:scale-95"
            >
              +
            </Button>
          </div>
        </div>

        {/* Weekend Simulation Toggle */}
        <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/20 h-8">
          <Label htmlFor="sim-weekend" className="text-xs text-muted-foreground cursor-pointer select-none">
            Weekend surge (+{simulatedPercentage}%)
          </Label>
          <Switch
            id="sim-weekend"
            checked={simulateWeekend}
            onCheckedChange={setSimulateWeekend}
          />
        </div>
      </div>

      {/* Simulator Resolution Box */}
      <div className="pt-2 border-t">
        {activeSlabsForSlot.length === 0 ? (
          <div className="p-3 rounded-lg border border-dashed text-center text-xs text-muted-foreground bg-muted/10">
            No slabs configured for {selectedStayType.replace("_", " ")} yet. Add slabs below to simulate rates.
          </div>
        ) : resolvedSlab ? (
          <div className="p-3 rounded-lg border bg-muted/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-semibold text-foreground">
                  Matched Tier: {resolvedSlab.minHeadcount} &ndash; {resolvedSlab.maxHeadcount} Pax
                </span>
              </div>
              {isFloorRuleApplied && (
                <Badge variant="outline" className="text-[10px] bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300">
                  Minimum Floor Applied
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
              <div className="p-2 rounded-md bg-card border">
                <div className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                  <Coins className="h-3 w-3" /> Base Tariff
                </div>
                <div className="text-sm font-bold text-foreground mt-0.5">
                  ₹{resolvedSlab.basePrice.toLocaleString("en-IN")}
                </div>
              </div>

              <div className="p-2 rounded-md bg-card border">
                <div className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Resolved Price
                </div>
                <div className="text-sm font-bold text-primary mt-0.5">
                  ₹{finalPrice.toLocaleString("en-IN")}
                  {effectivePercentage !== 0 && (
                    <span className="text-[10px] font-normal text-muted-foreground ml-1">
                      ({effectivePercentage > 0 ? `+${effectivePercentage}` : effectivePercentage}%)
                    </span>
                  )}
                </div>
              </div>

              <div className="p-2 rounded-md bg-card border col-span-2 sm:col-span-1">
                <div className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Required Advance
                </div>
                <div className="text-sm font-bold text-foreground mt-0.5">
                  ₹{resolvedSlab.requiredDeposit.toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            {isFloorRuleApplied && (
              <p className="text-[11px] text-amber-700 dark:text-amber-300 font-mono">
                Guest count ({headcount}) is below lowest slab min ({resolvedSlab.minHeadcount}). Baseline venue opening fee applied automatically per domain specifications.
              </p>
            )}
          </div>
        ) : (
          <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>No Matching Pricing Slab</span>
            </div>
            <p className="text-[11px] font-mono">
              {isExceeded
                ? `Guest headcount (${headcount}) exceeds the maximum configured capacity of ${maxGuestCapacity} Pax.`
                : `No slab covers ${headcount} Pax in ${selectedStayType.replace("_", " ")}.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PriceCalculatorWidget;
