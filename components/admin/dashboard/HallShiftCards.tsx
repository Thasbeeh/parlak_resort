"use client";

import * as React from "react";
import { Building2, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardHallOperations } from "@/lib/dashboard-data";

export interface HallShiftCardsProps {
  hallOperations: DashboardHallOperations;
  className?: string;
}

export function HallShiftCards({
  hallOperations,
  className,
}: HallShiftCardsProps) {
  const { nonAcHall, acHall } = hallOperations;

  return (
    <div
      data-slot="hall-shift-cards"
      className={cn("grid gap-4 lg:grid-cols-2", className)}
    >
      {/* ──────────────────────────────────────────────────────────── */}
      {/* Card 1: Non-AC Event Hall (Active Venue)                     */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs gap-4">
        {/* Header: Icon + Title/Capacity + Status Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              <Building2 className="size-5 shrink-0" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-sm sm:text-base font-bold tracking-tight text-foreground font-sans">
                Non–AC Event Hall
              </h3>
              <p className="font-mono text-xs text-muted-foreground tabular-nums">
                Max Capacity: 1,200&nbsp;Pax
              </p>
            </div>
          </div>

          <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 text-xs font-mono font-medium text-emerald-700 dark:text-emerald-400 select-none">
            Active Venue
          </span>
        </div>

        {/* Shift Trays Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Morning Shift */}
          <div className="flex flex-col justify-between rounded-xl border border-border/50 bg-surface-subtle/70 dark:bg-surface-subtle/40 p-3.5 gap-2.5 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90 font-sans">
                <Sun className="size-4 text-amber-500 shrink-0" />
                <span>Morning Shift</span>
              </div>
              <span className="font-mono text-xs text-muted-foreground tabular-nums select-none">
                10:00–15:00
              </span>
            </div>

            <div className="flex items-baseline gap-1.5 leading-none mt-0.5">
              <span className="font-mono text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {nonAcHall.morningSlotHeadcount}
              </span>
              <span className="font-mono text-xs text-muted-foreground tabular-nums select-none">
                Pax
              </span>
            </div>

            <p className="text-xs text-muted-foreground font-sans truncate">
              {nonAcHall.morningSlotHeadcount > 0
                ? `${nonAcHall.morningSlotHeadcount}\u00A0Attendees (Event Active)`
                : "0 Attendees (No Event Scheduled)"}
            </p>
          </div>

          {/* Evening Shift */}
          <div className="flex flex-col justify-between rounded-xl border border-border/50 bg-surface-subtle/70 dark:bg-surface-subtle/40 p-3.5 gap-2.5 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90 font-sans">
                <Moon className="size-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
                <span>Evening Shift</span>
              </div>
              <span className="font-mono text-xs text-muted-foreground tabular-nums select-none">
                17:00–22:00
              </span>
            </div>

            <div className="flex items-baseline gap-1.5 leading-none mt-0.5">
              <span className="font-mono text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {nonAcHall.eveningSlotHeadcount}
              </span>
              <span className="font-mono text-xs text-muted-foreground tabular-nums select-none">
                Pax
              </span>
            </div>

            <p className="text-xs text-muted-foreground font-sans truncate">
              {nonAcHall.eveningSlotHeadcount > 0
                ? `${nonAcHall.eveningSlotHeadcount}\u00A0Attendees (Event Active)`
                : "0 Attendees (No Event Scheduled)"}
            </p>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* Card 2: AC Event Hall                                         */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs gap-4">
        {/* Header: Icon + Title/Capacity + Status Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Building2 className="size-5 shrink-0" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-sm sm:text-base font-bold tracking-tight text-foreground font-sans">
                AC Event Hall
              </h3>
              <p className="font-mono text-xs text-muted-foreground tabular-nums">
                Max Capacity: 2,000&nbsp;Pax
              </p>
            </div>
          </div>

          <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 text-xs font-mono font-medium text-emerald-700 dark:text-emerald-400 select-none">
            Active Venue
          </span>
        </div>

        {/* Shift Trays Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Morning Shift */}
          <div className="flex flex-col justify-between rounded-xl border border-border/50 bg-surface-subtle/70 dark:bg-surface-subtle/40 p-3.5 gap-2.5 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground font-sans">
                <Sun className="size-4 text-muted-foreground shrink-0" />
                <span>Morning Shift</span>
              </div>
              <span className="font-mono text-xs text-muted-foreground tabular-nums select-none">
                10:00–15:00
              </span>
            </div>

            <div className="flex items-baseline gap-1.5 leading-none mt-0.5">
              <span className="font-mono text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {acHall.morningSlotHeadcount}
              </span>
              <span className="font-mono text-xs text-muted-foreground tabular-nums select-none">
                Pax
              </span>
            </div>

            <p className="text-xs text-muted-foreground font-sans truncate">
              {acHall.morningSlotHeadcount > 0
                ? `${acHall.morningSlotHeadcount}\u00A0Attendees (Event Active)`
                : "0 Attendees (No Event Scheduled)"}
            </p>
          </div>

          {/* Evening Shift */}
          <div className="flex flex-col justify-between rounded-xl border border-border/50 bg-surface-subtle/70 dark:bg-surface-subtle/40 p-3.5 gap-2.5 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground font-sans">
                <Moon className="size-4 text-muted-foreground shrink-0" />
                <span>Evening Shift</span>
              </div>
              <span className="font-mono text-xs text-muted-foreground tabular-nums select-none">
                17:00–22:00
              </span>
            </div>

            <div className="flex items-baseline gap-1.5 leading-none mt-0.5">
              <span className="font-mono text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {acHall.eveningSlotHeadcount}
              </span>
              <span className="font-mono text-xs text-muted-foreground tabular-nums select-none">
                Pax
              </span>
            </div>

            <p className="text-xs text-muted-foreground font-sans truncate">
              {acHall.eveningSlotHeadcount > 0
                ? `${acHall.eveningSlotHeadcount}\u00A0Attendees (Event Active)`
                : "0 Attendees (No Event Scheduled)"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HallShiftCards;
