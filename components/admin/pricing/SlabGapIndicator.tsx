"use client";

import * as React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SlabGapIndicatorProps {
  prevMax: number;
  nextMin: number;
  slotLabel?: string;
  className?: string;
  showContiguousBadge?: boolean;
}

export function SlabGapIndicator({
  prevMax,
  nextMin,
  slotLabel,
  className,
  showContiguousBadge = false,
}: SlabGapIndicatorProps) {
  if (
    typeof prevMax !== "number" ||
    typeof nextMin !== "number" ||
    Number.isNaN(prevMax) ||
    Number.isNaN(nextMin) ||
    !Number.isFinite(prevMax) ||
    !Number.isFinite(nextMin)
  ) {
    return null;
  }

  const expectedMin = prevMax + 1;
  const isContiguous = nextMin === expectedMin;
  const isGap = nextMin > expectedMin;
  const isOverlap = nextMin < expectedMin;

  if (isContiguous) {
    if (!showContiguousBadge) return null;
    return (
      <div
        className={cn(
          "flex items-center gap-2 py-1 px-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-mono",
          className
        )}
      >
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span>Contiguous sequence: {prevMax} &rarr; {nextMin} Pax</span>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium border shadow-xs transition-colors duration-150 ease-out select-none",
        isGap
          ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400"
          : "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300",
        className
      )}
    >
      {isGap ? (
        <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
      ) : (
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      )}

      <div className="flex-1 space-y-0.5">
        <div className="font-semibold">
          {isGap
            ? `Headcount Gap Detected (${slotLabel || "Tier sequence"})`
            : `Headcount Overlap Detected (${slotLabel || "Tier sequence"})`}
        </div>
        <p className="text-[11px] opacity-90 font-mono">
          {isGap ? (
            <>
              Tier skips from <strong className="underline">{prevMax}</strong> to{" "}
              <strong className="underline">{nextMin} Pax</strong>. Next tier must start at{" "}
              <strong className="font-bold underline">{expectedMin} Pax</strong>.
            </>
          ) : (
            <>
              Next tier starts at <strong className="underline">{nextMin} Pax</strong>, overlapping with previous tier ending at{" "}
              <strong className="underline">{prevMax} Pax</strong>. Expected next min is{" "}
              <strong className="font-bold underline">{expectedMin} Pax</strong>.
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export default SlabGapIndicator;
