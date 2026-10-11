"use client";

import * as React from "react";
import {
  CalendarX,
  LogIn,
  LogOut,
  IndianRupee,
  Phone,
  CheckCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import {
  dashboardCheckInAction,
  dashboardCheckoutAction,
} from "@/actions/dashboard-actions";
import { cn } from "@/lib/utils";
import type { TodayRosterItem } from "@/lib/dashboard-data";

export interface TodayRosterTableProps {
  roster: TodayRosterItem[];
  onRecordPayment?: (item: TodayRosterItem) => void;
  onRefresh?: () => void;
  className?: string;
  isError?: boolean;
}

type FilterTab = "ALL" | "ROOMS" | "HALLS";

export function TodayRosterTable({
  roster,
  onRecordPayment,
  onRefresh,
  className,
  isError = false,
}: TodayRosterTableProps) {
  const [filter, setFilter] = React.useState<FilterTab>("ALL");
  const [search, setSearch] = React.useState<string>("");
  const [expandedRowId, setExpandedRowId] = React.useState<string | null>(null);
  const [actionInProgressId, setActionInProgressId] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  // Filter roster items based on category tabs and search text
  const filteredRoster = React.useMemo(() => {
    return (roster || []).filter((item) => {
      // Tab filter
      if (filter === "ROOMS") {
        const isRoom = item.stayType === "OVERNIGHT" || item.stayType === "DAY_SLOT";
        if (!isRoom) return false;
      } else if (filter === "HALLS") {
        const isHall = item.stayType === "MORNING_SLOT" || item.stayType === "EVENING_SLOT";
        if (!isHall) return false;
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = item.guestName.toLowerCase().includes(q);
        const matchesRef = item.bookingId.toLowerCase().includes(q);
        const matchesPhone = item.guestPhone.toLowerCase().includes(q);
        const matchesUnit = item.units.some((u) => u.toLowerCase().includes(q));
        if (!matchesName && !matchesRef && !matchesPhone && !matchesUnit) return false;
      }

      return true;
    });
  }, [roster, filter, search]);

  const handleCheckIn = async (item: TodayRosterItem) => {
    setActionInProgressId(item.id);
    setActionError(null);
    try {
      const res = await dashboardCheckInAction({
        bookingId: item.id,
        expectedUpdatedAt: item.updatedAt,
      });

      if (!res.success) {
        setActionError(res.error || "Failed to check in guest.");
        return;
      }

      if (onRefresh) onRefresh();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Unexpected check-in error."
      );
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleCheckOut = async (item: TodayRosterItem) => {
    // Domain Checkout Invariant: Final Balance Due == ₹0
    if (item.balanceDue > 0) {
      if (onRecordPayment) {
        onRecordPayment(item);
      }
      return;
    }

    setActionInProgressId(item.id);
    setActionError(null);
    try {
      const res = await dashboardCheckoutAction({
        bookingId: item.id,
        expectedUpdatedAt: item.updatedAt || new Date().toISOString(),
      });

      if (!res.success) {
        setActionError(res.error || "Failed to check out guest.");
        return;
      }

      if (onRefresh) onRefresh();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Unexpected checkout error."
      );
    } finally {
      setActionInProgressId(null);
    }
  };

  return (
    <div
      data-slot="today-roster-table"
      className={cn(
        "flex flex-col rounded-lg border border-border bg-card shadow-xs overflow-hidden",
        className
      )}
    >
      {/* 1. Header Strip: Title & Live Count Badge */}
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold tracking-tight text-foreground font-sans">
            Today&apos;s Operational Roster
          </h2>
          <Badge variant="secondary" className="font-mono text-xs tabular-nums">
            {filteredRoster.length}
          </Badge>
        </div>
      </div>

      {/* 2. Flush Operational Filter & Search Strip (Two-Tier Clean Structural Toolbar) */}
      <div className="flex flex-col gap-2.5 border-b border-border/60 px-4 py-2.5 sm:px-5">
        {/* Tier 1: Category Filter Tabs (Ribbon) with horizontal touch scrolling */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto [-webkit-overflow-scrolling:touch]">
          <div className="border-border/80 bg-surface-subtle/50 inline-flex shrink-0 items-center rounded-lg border p-0.5 gap-0.5">
            {[
              { id: "ALL" as const, label: `All Schedule (${roster?.length || 0})` },
              { id: "ROOMS" as const, label: "Overnight Rooms" },
              { id: "HALLS" as const, label: "Event Halls" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-all duration-100 ease-[var(--ease-snappy)] select-none active:scale-[0.98] whitespace-nowrap",
                  filter === tab.id
                    ? "bg-primary text-primary-foreground font-medium shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-subtle/80",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tier 2: Search Input & Record Count Indicator */}
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full min-w-0 sm:max-w-xs">
            <Input
              type="text"
              placeholder="Filter roster by guest, phone, or unit…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              spellCheck={false}
              className="bg-background border-border/80 focus-visible:ring-ring h-8 px-3 pr-8 text-base focus-visible:ring-1 md:text-xs"
              aria-label="Filter roster"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 flex size-5 items-center justify-center border-0 bg-transparent p-0 transition-transform appearance-none select-none active:scale-[0.98]"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="text-muted-foreground font-mono text-xs tabular-nums select-none">
            {filteredRoster.length === (roster?.length || 0)
              ? `${filteredRoster.length}\u00A0reservations today`
              : `Showing ${filteredRoster.length} of ${roster?.length || 0}\u00A0reservations`}
          </div>
        </div>
      </div>

      {actionError && (
        <div className="mx-4 mt-3 rounded-md border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
          {actionError}
        </div>
      )}

      {/* Error State per Section 11.3.3 */}
      {isError ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <AlertTriangle className="size-6 text-destructive mb-2" />
          <h3 className="text-sm font-semibold text-foreground">
            Error loading today&apos;s roster. Click to retry.
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Failed to refresh operational schedule from server.
          </p>
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="mt-3 h-7 text-xs active:scale-[0.98] transition-transform duration-150 ease-[var(--ease-snappy)]"
            >
              Retry
            </Button>
          )}
        </div>
      ) : filteredRoster.length === 0 ? (
        /* Empty State per Section 11.3.3 */
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
            <CalendarX className="size-6 text-muted-foreground" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-foreground">
            No arrivals, departures, or events scheduled for today.
          </h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm">
            {search
              ? "No reservations match your search query."
              : "Check the Bookings calendar for upcoming reservations."}
          </p>
          {(search || filter !== "ALL") && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setFilter("ALL");
              }}
              className="mt-3 h-7 text-xs active:scale-[0.98] transition-transform duration-100 ease-[var(--ease-snappy)] select-none"
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        /* Table Component */
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="border-b border-border/60 bg-muted/30 text-xs font-semibold text-muted-foreground select-none">
              <tr>
                <th className="py-2.5 px-3 w-8 border-b border-border"></th>
                <th className="py-2.5 px-3 font-mono border-b border-border">Ref</th>
                <th className="py-2.5 px-3 border-b border-border">Guest</th>
                <th className="py-2.5 px-3 hidden md:table-cell border-b border-border">Unit(s)</th>
                <th className="py-2.5 px-3 border-b border-border">Stay type</th>
                <th className="py-2.5 px-3 border-b border-border">Schedule</th>
                <th className="py-2.5 px-3 border-b border-border">Status</th>
                <th className="py-2.5 px-3 text-right border-b border-border">Balance due</th>
                <th className="py-2.5 px-3 text-right border-b border-border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoster.map((item) => {
                const isLoading = actionInProgressId === item.id;
                const canCheckIn = item.status === "CONFIRMED";
                const canCheckOut = item.status === "CHECKED_IN";
                const isExpanded = expandedRowId === item.id;

                return (
                  <React.Fragment key={item.id}>
                    <tr
                      className={cn(
                        "hover:bg-muted/20 transition-colors cursor-pointer",
                        isExpanded && "bg-muted/15"
                      )}
                      onClick={() =>
                        setExpandedRowId((prev) => (prev === item.id ? null : item.id))
                      }
                    >
                      {/* Expand Peek Trigger */}
                      <td className="py-2.5 px-3 text-center border-b border-border/60">
                        <button
                          type="button"
                          aria-label={isExpanded ? "Collapse row details" : "Expand row details"}
                          className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-transform appearance-none select-none"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedRowId((prev) => (prev === item.id ? null : item.id));
                          }}
                        >
                          {isExpanded ? (
                            <ChevronDown className="size-3.5 shrink-0" />
                          ) : (
                            <ChevronRight className="size-3.5 shrink-0" />
                          )}
                        </button>
                      </td>

                      {/* Booking ID Ref */}
                      <td className="py-2.5 px-3 font-mono font-semibold text-primary whitespace-nowrap border-b border-border/60">
                        {item.bookingId}
                      </td>

                      {/* Guest Details */}
                      <td className="py-2.5 px-3 border-b border-border/60">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground text-xs">
                            {item.guestName}
                          </span>
                          <a
                            href={`tel:${item.guestPhone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground hover:text-foreground"
                          >
                            <Phone className="size-2.5 shrink-0" />
                            {item.guestPhone}
                          </a>
                        </div>
                      </td>

                      {/* Units */}
                      <td className="py-2.5 px-3 hidden md:table-cell border-b border-border/60">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {item.units.map((unitName, i) => (
                            <span
                              key={i}
                              className="rounded bg-muted/80 px-1.5 py-0.5 text-[10px] font-mono font-medium text-foreground"
                            >
                              {unitName}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Stay Type Pill */}
                      <td className="py-2.5 px-3 whitespace-nowrap border-b border-border/60">
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-mono text-[10px] uppercase font-medium",
                            item.stayType === "OVERNIGHT" &&
                              "border-indigo-500/30 text-indigo-700 dark:text-indigo-300 bg-indigo-500/10",
                            item.stayType === "DAY_SLOT" &&
                              "border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10",
                            (item.stayType === "MORNING_SLOT" ||
                              item.stayType === "EVENING_SLOT") &&
                              "border-purple-500/30 text-purple-700 dark:text-purple-300 bg-purple-500/10"
                          )}
                        >
                          {item.stayType.replace("_", " ")}
                        </Badge>
                      </td>

                      {/* Scheduled Time */}
                      <td className="py-2.5 px-3 font-mono text-xs whitespace-nowrap text-foreground border-b border-border/60">
                        {item.scheduledTime}
                      </td>

                      {/* Status Badge */}
                      <td className="py-2.5 px-3 whitespace-nowrap border-b border-border/60">
                        <StatusBadge status={item.status} />
                      </td>

                      {/* Balance Due */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap border-b border-border/60">
                        {item.balanceDue === 0 ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle className="size-3 shrink-0" />
                            Settled
                          </span>
                        ) : (
                          <span className="font-mono text-xs font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                            ₹{'\u00A0'}{item.balanceDue.toLocaleString("en-IN")}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td
                        className="py-2.5 px-3 text-right whitespace-nowrap border-b border-border/60"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          {canCheckIn && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleCheckIn(item)}
                              disabled={isLoading}
                              className="h-7 px-2.5 text-[11px] gap-1 active:scale-[0.98] transition-transform duration-100 ease-[var(--ease-snappy)] select-none shrink-0"
                            >
                              {isLoading ? (
                                <Loader2 className="size-3 shrink-0 animate-spin" />
                              ) : (
                                <LogIn className="size-3 shrink-0" />
                              )}
                              <span>Check-In</span>
                            </Button>
                          )}

                          {canCheckOut && (
                            <Button
                              size="sm"
                              variant={item.balanceDue > 0 ? "outline" : "default"}
                              onClick={() => handleCheckOut(item)}
                              disabled={isLoading}
                              className={cn(
                                "h-7 px-2.5 text-[11px] gap-1 active:scale-[0.98] transition-transform duration-100 ease-[var(--ease-snappy)] select-none shrink-0",
                                item.balanceDue > 0 &&
                                  "border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                              )}
                              title={
                                item.balanceDue > 0
                                  ? `Cannot check out: Outstanding balance of ₹\u00A0${item.balanceDue.toLocaleString("en-IN")} must be collected or adjusted to ₹0 first.`
                                  : "Check out guest"
                              }
                            >
                              {isLoading ? (
                                <Loader2 className="size-3 shrink-0 animate-spin" />
                              ) : (
                                <LogOut className="size-3 shrink-0" />
                              )}
                              <span>
                                {item.balanceDue > 0 ? "Collect & Out" : "Check-Out"}
                              </span>
                            </Button>
                          )}

                          {item.balanceDue > 0 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onRecordPayment && onRecordPayment(item)}
                              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground active:scale-[0.98] transition-transform duration-100 ease-[var(--ease-snappy)] select-none shrink-0"
                              title="Record Payment"
                            >
                              <IndianRupee className="size-3 shrink-0" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Row Peek: Section 2 Page 2 Detail Views */}
                    {isExpanded && (
                      <tr className="bg-muted/20 animate-in fade-in duration-150">
                        <td colSpan={9} className="p-4 border-b border-border/60">
                          <div className="flex flex-col gap-3 text-xs">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground">
                                  Reservation Peek:
                                </span>
                                <span className="font-mono text-primary font-medium">
                                  {item.bookingId}
                                </span>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-foreground font-medium">{item.guestName}</span>
                                <span className="text-muted-foreground font-mono">({item.guestPhone})</span>
                              </div>
                              <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
                                <span className="text-muted-foreground">
                                  Rent: <strong className="text-foreground">₹{'\u00A0'}{(item.rentCharge ?? 0).toLocaleString("en-IN")}</strong>
                                </span>
                                <span className="text-muted-foreground">
                                  Paid: <strong className="text-foreground">₹{'\u00A0'}{(item.totalPaid ?? 0).toLocaleString("en-IN")}</strong>
                                </span>
                                <span
                                  className={
                                    item.balanceDue > 0
                                      ? "text-amber-600 dark:text-amber-400 font-semibold"
                                      : "text-emerald-600 dark:text-emerald-400 font-semibold"
                                  }
                                >
                                  Balance Due: ₹{'\u00A0'}{item.balanceDue.toLocaleString("en-IN")}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                                  Assigned Units & Attached Domes
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {item.units.map((unitName, i) => (
                                    <span
                                      key={i}
                                      className="inline-flex items-center rounded-md border border-border bg-card px-2.5 py-1 text-xs font-mono font-medium text-foreground shadow-2xs"
                                    >
                                      {unitName}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                                  Guest & Operational Notes
                                </span>
                                <p className="text-xs text-muted-foreground italic bg-card rounded-md border border-border p-2.5">
                                  {item.notes ? item.notes : "No special notes recorded for this reservation."}
                                </p>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default TodayRosterTable;
