"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Phone, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { UnderpaidArrival } from "@/lib/dashboard-data";

export interface UnderpaidArrivalsAlertProps {
  underpaidArrivals: UnderpaidArrival[];
  onCollectPayment?: (arrival: UnderpaidArrival) => void;
  className?: string;
  isError?: boolean;
  onRetry?: () => void;
}

export function UnderpaidArrivalsAlert({
  underpaidArrivals,
  onCollectPayment,
  className,
  isError = false,
  onRetry,
}: UnderpaidArrivalsAlertProps) {
  // Error State: Section 11.3.2
  if (isError) {
    return (
      <div
        data-slot="underpaid-error-state"
        className={cn(
          "flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive shadow-xs",
          className
        )}
      >
        <AlertCircle className="size-4.5 shrink-0" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-2">
          <span>Failed to evaluate arrival payment balances. Check internet connection.</span>
          {onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="h-6 text-[11px] px-2 border-destructive/40 text-destructive hover:bg-destructive/10 active:scale-[0.98] transition-transform duration-150 ease-[var(--ease-snappy)]"
            >
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Empty State: All arriving guests have met advance payment
  if (!underpaidArrivals || underpaidArrivals.length === 0) {
    return (
      <div
        data-slot="underpaid-empty-state"
        className={cn(
          "flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-300 transition-colors",
          className
        )}
      >
        <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span className="font-medium">
          All guests arriving today have met the required advance payment.
        </span>
      </div>
    );
  }

  return (
    <div
      data-slot="underpaid-arrivals-alert"
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 shadow-xs",
        className
      )}
    >
      {/* Alert Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="size-4.5 text-amber-600 dark:text-amber-400" />
          <h2 className="text-sm font-semibold text-foreground">
            Underpaid Arrivals Alert
          </h2>
          <Badge
            variant="outline"
            className="border-amber-500/30 bg-amber-500/10 font-mono text-[10px] text-amber-800 dark:text-amber-300"
          >
            {underpaidArrivals.length} Action Required
          </Badge>
        </div>
        <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">
          totalPaid &lt; requiredAdvance
        </span>
      </div>

      {/* List of Underpaid Arriving Guests */}
      <div className="flex flex-col divide-y divide-border/60 rounded-md border border-border/80 bg-card overflow-hidden">
        {underpaidArrivals.map((item) => (
          <div
            key={item.bookingId}
            className="flex flex-col gap-2 p-3.5 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/30 transition-colors"
          >
            {/* Left: Guest Details & Units */}
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-semibold text-primary">
                  {item.bookingId}
                </span>
                <span className="text-sm font-medium text-foreground">
                  {item.guestName}
                </span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground">
                  {item.unitName}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <a
                  href={`tel:${item.guestPhone}`}
                  className="flex items-center gap-1 hover:text-foreground font-mono"
                >
                  <Phone className="size-3" />
                  {item.guestPhone}
                </a>
                <span>•</span>
                <span>
                  Advance Required:{" "}
                  <strong className="font-mono tabular-nums text-foreground">
                    ₹{'\u00A0'}{item.requiredAdvance.toLocaleString("en-IN")}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Collected:{" "}
                  <strong className="font-mono tabular-nums text-foreground">
                    ₹{'\u00A0'}{item.totalPaid.toLocaleString("en-IN")}
                  </strong>
                </span>
              </div>
            </div>

            {/* Right: Shortfall & Collect Payment Action */}
            <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
              <Badge
                variant="outline"
                className="border-red-500/20 bg-red-500/10 font-mono tabular-nums text-xs font-semibold text-red-700 dark:text-red-400 py-1 px-2.5"
              >
                ₹{'\u00A0'}{item.shortfall.toLocaleString("en-IN")} Shortfall
              </Badge>

              {onCollectPayment && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => onCollectPayment(item)}
                  className="h-8 gap-1.5 text-xs active:scale-[0.98] transition-transform duration-150 ease-[var(--ease-snappy)]"
                >
                  <IndianRupee className="size-3.5" />
                  <span>Collect Payment</span>
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default UnderpaidArrivalsAlert;
