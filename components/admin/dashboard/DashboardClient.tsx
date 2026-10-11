"use client";

import * as React from "react";
import useSWR from "swr";
import Link from "next/link";
import { format } from "date-fns";
import {
  RotateCw,
  Plus,
  IndianRupee,
  LogIn,
  LogOut,
  Users,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/admin/dashboard/MetricCard";
import { HallShiftCards } from "@/components/admin/dashboard/HallShiftCards";
import { UnderpaidArrivalsAlert } from "@/components/admin/dashboard/UnderpaidArrivalsAlert";
import { TodayRosterTable } from "@/components/admin/dashboard/TodayRosterTable";
import { RecordPaymentDialog } from "@/components/admin/dashboard/RecordPaymentDialog";
import { useAdminShell } from "@/components/admin/AdminShellContext";
import type {
  DashboardData,
  UnderpaidArrival,
  TodayRosterItem,
} from "@/lib/dashboard-data";

export interface DashboardClientProps {
  initialData: DashboardData;
}

const fetcher = async (url: string): Promise<{ success: boolean; data: DashboardData }> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch dashboard data (${res.status} ${res.statusText})`);
  }
  return res.json();
};

export function DashboardClient({ initialData }: DashboardClientProps) {
  const { setIsSyncing, setLastSyncedAt } = useAdminShell();

  // Selected booking for Quick Payment Modal
  const [paymentBooking, setPaymentBooking] = React.useState<{
    id: string;
    bookingId: string;
    guestName: string;
    amountToPay: number;
    expectedUpdatedAt?: string;
  } | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState<boolean>(false);

  // SWR background polling engine: 30s interval, focus revalidation, 0ms initial load
  const { data: response, error, isValidating, mutate } = useSWR(
    "/api/admin/dashboard",
    fetcher,
    {
      fallbackData: { success: true, data: initialData },
      refreshInterval: 30000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      keepPreviousData: true,
    }
  );

  const dashboardData = response?.data || initialData;
  const { summaryMetrics, hallOperations, underpaidArrivals, todayRoster, lastSyncedAt } =
    dashboardData;

  // Sync state with global shell header's LiveSyncBadge
  React.useEffect(() => {
    setIsSyncing(isValidating);
  }, [isValidating, setIsSyncing]);

  React.useEffect(() => {
    if (lastSyncedAt) {
      setLastSyncedAt(new Date(lastSyncedAt));
    }
  }, [lastSyncedAt, setLastSyncedAt]);

  const handleManualRefresh = () => {
    mutate();
  };

  const handleOpenPaymentFromAlert = (arrival: UnderpaidArrival) => {
    // Find roster match to get primary database ID
    const rosterMatch = todayRoster.find((r) => r.bookingId === arrival.bookingId);
    setPaymentBooking({
      id: arrival.id || rosterMatch?.id || arrival.bookingId,
      bookingId: arrival.bookingId,
      guestName: arrival.guestName,
      amountToPay: arrival.shortfall,
      expectedUpdatedAt: arrival.updatedAt || rosterMatch?.updatedAt,
    });
    setPaymentDialogOpen(true);
  };

  const handleOpenPaymentFromRoster = (item: TodayRosterItem) => {
    setPaymentBooking({
      id: item.id,
      bookingId: item.bookingId,
      guestName: item.guestName,
      amountToPay: item.balanceDue,
      expectedUpdatedAt: item.updatedAt,
    });
    setPaymentDialogOpen(true);
  };

  const formattedSyncedTime = React.useMemo(() => {
    if (!lastSyncedAt) return "Just now";
    try {
      const d = new Date(lastSyncedAt);
      return format(d, "hh:mm:ss a");
    } catch {
      return "Just now";
    }
  }, [lastSyncedAt]);

  const isLiveError = Boolean(error && !response?.data);

  return (
    <div className="flex flex-col gap-4" data-slot="dashboard-client">
      {/* 1. Header Toolbar (Neutral Sans, Zero Boilerplate Subtitles) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-4">
        <div>
          <h1 className="font-sans text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Operations Cockpit
          </h1>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <span
            suppressHydrationWarning
            className="hidden md:inline text-xs font-mono text-muted-foreground"
          >
            Synced: {formattedSyncedTime}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isValidating}
            aria-label="Refresh dashboard metrics"
            className="h-8 gap-1.5 text-xs active:scale-[0.98] transition-transform duration-150 ease-[var(--ease-snappy)]"
          >
            <RotateCw
              className={`size-3.5 ${isValidating ? "animate-spin text-primary" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Link
            href="/admin/bookings/new"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary text-primary-foreground hover:bg-primary/95 h-8 px-3 text-xs gap-1.5 shadow-xs active:scale-[0.98] transition-transform duration-150 ease-[var(--ease-snappy)] font-medium select-none"
          >
            <Plus className="size-3.5" />
            <span>New booking</span>
          </Link>
        </div>
      </div>

      {/* Sync Failure Error Banner per Section 11.3.1 */}
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" />
            <span>
              Failed to refresh dashboard analytics. Displaying cached operational data.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleManualRefresh}
            className="h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive/10 active:scale-[0.98] transition-transform duration-150 ease-[var(--ease-snappy)]"
          >
            Retry
          </Button>
        </div>
      )}

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="30-Day Net Revenue"
          value={summaryMetrics.total30DayRevenue}
          isCurrency
          subtitle="Includes retained cancellation income"
          icon={IndianRupee}
          isError={isLiveError}
          onRetry={handleManualRefresh}
        />
        <MetricCard
          title="Today's Check-ins"
          value={summaryMetrics.todayCheckinsCount}
          subtitle="Arriving guest groups"
          icon={LogIn}
          isError={isLiveError}
          onRetry={handleManualRefresh}
        />
        <MetricCard
          title="Today's Check-outs"
          value={summaryMetrics.todayCheckoutsCount}
          subtitle="Departing guest groups"
          icon={LogOut}
          isError={isLiveError}
          onRetry={handleManualRefresh}
        />
        <MetricCard
          title="Resident Overnight Guests"
          value={summaryMetrics.residentOvernightGuests}
          subtitle="Overnight stays (Domes & A-Frames)"
          icon={Users}
          isError={isLiveError}
          onRetry={handleManualRefresh}
        />
      </div>

      {/* 3. Event Hall Shift Operations (2 Cards) */}
      <HallShiftCards hallOperations={hallOperations} />

      {/* 4. Underpaid Arrivals Alert Strip */}
      <UnderpaidArrivalsAlert
        underpaidArrivals={underpaidArrivals}
        onCollectPayment={handleOpenPaymentFromAlert}
        isError={isLiveError}
        onRetry={handleManualRefresh}
      />

      {/* 5. Today's Operational Roster Table */}
      <TodayRosterTable
        roster={todayRoster}
        onRecordPayment={handleOpenPaymentFromRoster}
        onRefresh={handleManualRefresh}
        isError={isLiveError}
      />

      {/* 6. Quick Record Payment Modal */}
      <RecordPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        booking={paymentBooking}
        onSuccess={() => {
          mutate();
        }}
      />
    </div>
  );
}

export default DashboardClient;
