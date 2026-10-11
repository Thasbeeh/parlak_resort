import * as React from "react";
import { CalendarCheck, UserCheck, LogIn, IndianRupee } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BookingsKpis } from "@/lib/bookings-data";

export interface BookingsKpiStripProps {
  kpis?: BookingsKpis;
  className?: string;
}

export function BookingsKpiStrip({ kpis, className }: BookingsKpiStripProps) {
  const {
    totalBookings = 0,
    inHouseCount = 0,
    arrivingTodayCount = 0,
    outstandingReceivables = 0,
  } = kpis || {};

  return (
    <div
      data-slot="bookings-kpi-strip"
      className={cn("grid grid-cols-2 gap-3 md:grid-cols-4", className)}
    >
      {/* 1. Total Bookings */}
      <div className="border-border bg-card relative flex flex-col justify-between overflow-hidden rounded-xl border p-3 sm:p-3.5 min-w-0 h-full">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-xs font-medium truncate">
            Total Bookings
          </span>
          <div className="bg-muted/60 text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-lg">
            <CalendarCheck className="size-4" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline gap-1.5 leading-none">
          <span className="text-foreground font-mono text-2xl font-bold tracking-tight tabular-nums">
            {totalBookings.toLocaleString("en-IN")}
          </span>
          <span className="text-muted-foreground text-xs select-none">reservations</span>
        </div>
      </div>

      {/* 2. Currently In-House */}
      <div className="border-border bg-card relative flex flex-col justify-between overflow-hidden rounded-xl border p-3 sm:p-3.5 min-w-0 h-full">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-xs font-medium truncate">
            Currently In-House
          </span>
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <UserCheck className="size-4" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline gap-1.5 leading-none">
          <span className="font-mono text-2xl font-bold tracking-tight text-emerald-600 tabular-nums dark:text-emerald-400">
            {inHouseCount.toLocaleString("en-IN")}
          </span>
          <span className="text-muted-foreground font-mono text-xs tabular-nums select-none">
            active stays
          </span>
        </div>
      </div>

      {/* 3. Arriving Today */}
      <div className="border-border bg-card relative flex flex-col justify-between overflow-hidden rounded-xl border p-3 sm:p-3.5 min-w-0 h-full">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-xs font-medium truncate">
            Arriving Today
          </span>
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <LogIn className="size-4" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline gap-1.5 leading-none">
          <span className="font-mono text-2xl font-bold tracking-tight text-blue-600 tabular-nums dark:text-blue-400">
            {arrivingTodayCount.toLocaleString("en-IN")}
          </span>
          <span className="text-muted-foreground font-mono text-xs tabular-nums select-none">
            expected arrivals
          </span>
        </div>
      </div>

      {/* 4. Outstanding Receivables */}
      <div className="border-border bg-card relative flex flex-col justify-between overflow-hidden rounded-xl border p-3 sm:p-3.5 min-w-0 h-full">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-xs font-medium truncate">
            Outstanding Receivables
          </span>
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <IndianRupee className="size-4" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline gap-1.5 leading-none">
          <span className="font-mono text-2xl font-bold tracking-tight text-amber-600 tabular-nums dark:text-amber-400">
            ₹&nbsp;{Math.round(outstandingReceivables).toLocaleString("en-IN")}
          </span>
          <span className="text-muted-foreground text-xs select-none">balance due</span>
        </div>
      </div>
    </div>
  );
}

export default BookingsKpiStrip;
