"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface MetricCardProps {
  title: string;
  value: number | string;
  isCurrency?: boolean;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  className?: string;
  isError?: boolean;
  onRetry?: () => void;
}

export function MetricCard({
  title,
  value,
  isCurrency = false,
  subtitle,
  icon: Icon,
  badge,
  className,
  isError = false,
  onRetry,
}: MetricCardProps) {
  const [highlight, setHighlight] = React.useState(false);
  const prevValueRef = React.useRef(value);

  // Subtle numerical transition pulse when value updates (Emil Kowalski physics)
  React.useEffect(() => {
    if (prevValueRef.current !== value) {
      prevValueRef.current = value;
      setHighlight(true);
      const timer = setTimeout(() => setHighlight(false), 800);
      return () => clearTimeout(timer);
    }
  }, [value]);

  const formattedValue = React.useMemo(() => {
    if (typeof value === "number") {
      if (isCurrency) {
        return `₹\u00A0${value.toLocaleString("en-IN")}`;
      }
      return value.toLocaleString("en-IN");
    }
    return value;
  }, [value, isCurrency]);

  return (
    <div
      data-slot="metric-card"
      className={cn(
        "relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card p-3 sm:p-3.5 shadow-xs transition-colors duration-200 min-w-0 h-full",
        highlight && "ring-1 ring-primary/40 bg-primary/5",
        className
      )}
    >
      {/* Card Header: Label & Icon */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium tracking-tight text-muted-foreground select-none truncate">
          {title}
        </span>
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
          <Icon className="size-4" />
        </div>
      </div>

      {/* Main Metric Value or Error State */}
      {isError ? (
        <div className="mt-2.5 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertTriangle className="size-4 shrink-0" />
            <span>Unable to load live metrics.</span>
          </div>
          {onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="h-6 w-fit text-[11px] px-2 gap-1 border-destructive/40 text-destructive hover:bg-destructive/10 active:scale-[0.98] transition-transform duration-150 ease-[var(--ease-snappy)]"
            >
              <RotateCw className="size-3" />
              <span>Retry</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-2.5 flex flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "font-mono text-2xl font-bold tracking-tight text-foreground tabular-nums transition-transform duration-300 ease-[var(--ease-snappy)]",
                highlight && "scale-[1.02] text-primary"
              )}
            >
              {formattedValue}
            </span>
            {badge && (
              <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Micro-glow indicator on value change */}
      {highlight && (
        <span
          className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-primary animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export default MetricCard;
