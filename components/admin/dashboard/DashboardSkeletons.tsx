import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function MetricCardSkeleton() {
  return (
    <div className="flex h-[110px] w-full flex-col justify-between rounded-lg border border-border bg-card p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="size-4 rounded-full" />
      </div>
      <div className="mt-4 flex flex-col gap-1.5">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-3.5 w-40" />
      </div>
    </div>
  );
}

export function MetricCardsRowSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCardSkeleton />
      <MetricCardSkeleton />
      <MetricCardSkeleton />
      <MetricCardSkeleton />
    </div>
  );
}

export function HallShiftCardSkeleton() {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-xl" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col justify-between rounded-xl border border-border/50 bg-surface-subtle/70 p-3.5 gap-2.5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-3 w-36" />
        </div>
        <div className="flex flex-col justify-between rounded-xl border border-border/50 bg-surface-subtle/70 p-3.5 gap-2.5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-3 w-36" />
        </div>
      </div>
    </div>
  );
}

export function HallShiftsRowSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <HallShiftCardSkeleton />
      <HallShiftCardSkeleton />
    </div>
  );
}

export function UnderpaidAlertSkeleton() {
  return (
    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="size-4.5 rounded-full" />
          <Skeleton className="h-4 w-44" />
        </div>
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="flex h-[56px] items-center justify-between rounded-md border border-border/40 bg-card p-3"
          >
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-48" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-24 rounded" />
              <Skeleton className="h-8 w-28 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TodayRosterTableSkeleton() {
  return (
    <div className="flex flex-col rounded-lg border border-border bg-card shadow-xs">
      <div className="flex flex-col gap-3 border-b border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-3.5 w-64" />
        </div>
        <Skeleton className="h-8 w-64 rounded-lg" />
      </div>

      <div className="divide-y divide-border/40">
        <div className="flex items-center justify-between p-4 bg-muted/20">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24 hidden md:block" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20 text-right" />
          <Skeleton className="h-4 w-24 text-right" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center justify-between p-3.5">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-4 w-14" />
            <div className="flex flex-col gap-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-4 w-24 hidden md:block" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-16" />
            <div className="flex gap-2">
              <Skeleton className="h-7 w-20 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardFullSkeleton() {
  return (
    <div className="flex flex-col gap-6" data-slot="dashboard-skeleton">
      <div className="flex flex-col gap-1.5 border-b border-border/80 pb-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96" />
      </div>
      <MetricCardsRowSkeleton />
      <HallShiftsRowSkeleton />
      <UnderpaidAlertSkeleton />
      <TodayRosterTableSkeleton />
    </div>
  );
}

export default DashboardFullSkeleton;
