'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ScopeBreakdown {
  headcountIncremental?: number;
  extraNightsIncremental?: number;
  extraHoursIncremental?: number;
  dateShiftModifierIncremental?: number;
  unitSwapIncremental?: number;
  originalUnitPrice?: number;
}

export interface ScopeRecalculationPromptProps {
  originalRent: number;
  incrementalCharge: number;
  recalculatedRent: number;
  customRent: number;
  breakdown?: ScopeBreakdown;
  onApplyRecalculated: (amount: number) => void;
  onKeepCustom: (amount: number) => void;
  onCustomRentChange?: (amount: number) => void;
  className?: string;
}

export function ScopeRecalculationPrompt({
  originalRent,
  incrementalCharge,
  recalculatedRent,
  customRent,
  breakdown,
  onApplyRecalculated,
  onKeepCustom,
  onCustomRentChange,
  className,
}: ScopeRecalculationPromptProps) {
  const isExtension = incrementalCharge > 0;

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-muted/30 p-3.5 space-y-3',
        className
      )}
    >
      {/* 1. Header & Summary Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-2.5">
        <div className="text-xs font-semibold text-foreground">
          Scope-based recalculation
        </div>
        <div className="flex items-center gap-2 font-mono text-xs tabular-nums">
          <span className="text-muted-foreground">
            Baseline stay:&nbsp;₹&nbsp;{Math.round(originalRent).toLocaleString('en-IN')}
          </span>
          <span className="text-border">|</span>
          <span
            className={cn(
              'font-semibold',
              isExtension ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            Extension:&nbsp;{incrementalCharge >= 0 ? '+' : '–'}₹&nbsp;
            {Math.abs(Math.round(incrementalCharge)).toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* 2. Itemized Breakdown */}
      {breakdown && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-1 text-[11px] border-b border-border/60 pb-2.5">
          {breakdown.extraNightsIncremental !== undefined && breakdown.extraNightsIncremental > 0 && (
            <div className="flex flex-col">
              <span className="text-muted-foreground">Extra nights</span>
              <span className="font-mono tabular-nums font-medium text-foreground">
                +₹&nbsp;{Math.round(breakdown.extraNightsIncremental).toLocaleString('en-IN')}
              </span>
            </div>
          )}
          {breakdown.extraHoursIncremental !== undefined && breakdown.extraHoursIncremental > 0 && (
            <div className="flex flex-col">
              <span className="text-muted-foreground">Extra hours</span>
              <span className="font-mono tabular-nums font-medium text-foreground">
                +₹&nbsp;{Math.round(breakdown.extraHoursIncremental).toLocaleString('en-IN')}
              </span>
            </div>
          )}
          {breakdown.headcountIncremental !== undefined && breakdown.headcountIncremental > 0 && (
            <div className="flex flex-col">
              <span className="text-muted-foreground">Headcount upgrade</span>
              <span className="font-mono tabular-nums font-medium text-foreground">
                +₹&nbsp;{Math.round(breakdown.headcountIncremental).toLocaleString('en-IN')}
              </span>
            </div>
          )}
          {breakdown.dateShiftModifierIncremental !== undefined &&
            breakdown.dateShiftModifierIncremental > 0 && (
              <div className="flex flex-col">
                <span className="text-muted-foreground">Date modifier</span>
                <span className="font-mono tabular-nums font-medium text-foreground">
                  +₹&nbsp;{Math.round(breakdown.dateShiftModifierIncremental).toLocaleString('en-IN')}
                </span>
              </div>
            )}
          {breakdown.unitSwapIncremental !== undefined && breakdown.unitSwapIncremental > 0 && (
            <div className="flex flex-col">
              <span className="text-muted-foreground">Unit swap</span>
              <span className="font-mono tabular-nums font-medium text-foreground">
                +₹&nbsp;{Math.round(breakdown.unitSwapIncremental).toLocaleString('en-IN')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 3. Action Choices */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="default"
            onClick={() => onApplyRecalculated(recalculatedRent)}
            className="h-8 px-3 text-xs font-semibold active:scale-[0.98] transition-transform select-none shadow-xs"
          >
            <Check data-icon="inline-start" className="size-3.5" />
            <span>
              Apply recalculated rent (₹&nbsp;{Math.round(recalculatedRent).toLocaleString('en-IN')})
            </span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onKeepCustom(customRent)}
            className="h-8 px-3 text-xs active:scale-[0.98] transition-transform select-none"
          >
            <span>Keep custom rent</span>
          </Button>
        </div>

        {onCustomRentChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Override:</span>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">
                ₹
              </span>
              <input
                type="number"
                min="0"
                value={customRent || ''}
                onChange={(e) => onCustomRentChange(Number(e.target.value) || 0)}
                className="h-8 w-28 rounded-md border border-border bg-background pl-5 pr-2 font-mono text-base md:text-xs tabular-nums text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Custom rent"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
