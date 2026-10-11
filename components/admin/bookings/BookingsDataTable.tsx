"use client";

import * as React from "react";
import useSWR from "swr";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { RotateCw, Search, X, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BookingsKpiStrip } from "@/components/admin/bookings/BookingsKpiStrip";
import { ResponsiveBookingsList } from "@/components/admin/bookings/ResponsiveBookingsList";
import { FolioDrawer } from "@/components/admin/bookings/FolioDrawer";
import type {
  BookingsDataPayload,
  BookingRecordItem,
  BookingsKpis,
} from "@/lib/bookings-data";
import { cn } from "@/lib/utils";

export interface UnitSelectItem {
  id: string;
  name: string;
  category: string;
}

export interface BookingsDataTableProps {
  initialData?: BookingsDataPayload;
  initialBookings?: BookingRecordItem[];
  initialTotal?: number;
  initialKpis?: BookingsKpis;
  unitsList?: UnitSelectItem[];
  onManageFolio?: (bookingId: string) => void;
  className?: string;
}

const STATUS_TABS = [
  { key: "ALL", label: "All" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "CHECKED_IN", label: "Checked-in" },
  { key: "CHECKED_OUT", label: "Checked-out" },
  { key: "CANCELLED", label: "Cancelled" },
] as const;

const fetcher = async (
  url: string,
): Promise<{ success: boolean; data: BookingsDataPayload }> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch bookings (${res.status} ${res.statusText})`,
    );
  }
  return res.json();
};

export function BookingsDataTable({
  initialData,
  initialBookings,
  initialTotal,
  initialKpis,
  unitsList = [],
  onManageFolio,
  className,
}: BookingsDataTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Normalize initial SSR data payload
  const normalizedInitial: BookingsDataPayload = React.useMemo(() => {
    if (initialData) return initialData;
    return {
      bookings: initialBookings ?? [],
      pagination: {
        page: 1,
        limit: 20,
        total: initialTotal ?? (initialBookings?.length || 0),
        totalPages: Math.max(
          1,
          Math.ceil((initialTotal ?? (initialBookings?.length || 0)) / 20),
        ),
      },
      kpis: initialKpis ?? {
        totalBookings: initialBookings?.length || 0,
        inHouseCount:
          initialBookings?.filter((b) => b.status === "CHECKED_IN").length || 0,
        arrivingTodayCount: 0,
        outstandingReceivables: 0,
      },
    };
  }, [initialData, initialBookings, initialTotal, initialKpis]);

  // Operational Filter State
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [selectedStatus, setSelectedStatus] = React.useState<string>("ALL");
  const [selectedUnitId, setSelectedUnitId] = React.useState<string>("ALL");
  const [page, setPage] = React.useState(1);
  const limit = 20;

  // Sync drawer state with URL search parameters via Next.js navigation hooks
  const selectedFolioId = searchParams.get("folio");

  const updateFolioParam = React.useCallback(
    (folioId: string | null) => {
      const current = new URLSearchParams(Array.from(searchParams.entries()));
      if (folioId) {
        current.set("folio", folioId);
      } else {
        current.delete("folio");
      }
      const search = current.toString();
      const query = search ? `?${search}` : "";
      React.startTransition(() => {
        router.replace(`${pathname}${query}`, { scroll: false });
      });
    },
    [searchParams, pathname, router],
  );

  // 300ms Search Debounce
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Query String for API Polling
  const queryParams = React.useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (selectedStatus !== "ALL") params.set("status", selectedStatus);
    if (selectedUnitId !== "ALL") params.set("unitId", selectedUnitId);
    return params.toString();
  }, [page, limit, debouncedSearch, selectedStatus, selectedUnitId]);

  const isDefaultQuery =
    page === 1 &&
    !debouncedSearch &&
    selectedStatus === "ALL" &&
    selectedUnitId === "ALL";

  // SWR background polling engine: 30s interval, focus revalidation, persistent previous data
  const {
    data: response,
    isValidating,
    mutate,
  } = useSWR(`/api/admin/bookings?${queryParams}`, fetcher, {
    fallbackData: isDefaultQuery
      ? { success: true, data: normalizedInitial }
      : undefined,
    refreshInterval: 30000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 5000,
    keepPreviousData: true,
  });

  const currentPayload: BookingsDataPayload =
    response?.data || normalizedInitial;
  const { bookings, pagination, kpis } = currentPayload;

  const handleManage = (bookingId: string) => {
    if (onManageFolio) {
      onManageFolio(bookingId);
    } else {
      updateFolioParam(bookingId);
    }
  };

  const startRecord =
    pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const endRecord = Math.min(
    pagination.page * pagination.limit,
    pagination.total,
  );

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      {/* 1. Summary Ribbon */}
      <BookingsKpiStrip kpis={kpis} />

      {/* 2. Flush Operational Filter & Search Strip (Two-Tier Clean Structural Toolbar) */}
      <div className="border-border/60 flex flex-col gap-2.5 border-b pb-2">
        {/* Tier 1: Status Filter Tabs (Ribbon) */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto [-webkit-overflow-scrolling:touch]">
          <div className="border-border/80 bg-surface-subtle/50 inline-flex shrink-0 items-center rounded-lg border p-0.5 gap-0.5">
            {STATUS_TABS.map((tab) => {
              const isActive = selectedStatus === tab.key;
              const countLabel =
                tab.key === "ALL"
                  ? `All (${pagination.total})`
                  : tab.key === "CHECKED_IN" && kpis.inHouseCount > 0
                    ? `Checked-in (${kpis.inHouseCount})`
                    : tab.label;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setSelectedStatus(tab.key);
                    setPage(1);
                  }}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium transition-all duration-100 ease-[var(--ease-snappy)] select-none active:scale-[0.98] whitespace-nowrap",
                    isActive
                      ? "bg-primary text-primary-foreground font-medium shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-surface-subtle/80"
                  )}
                >
                  {countLabel}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tier 2: Search Input & Operational Controls */}
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          {/* Search Input */}
          <div className="relative w-full min-w-0 sm:max-w-xs">
            <Input
              type="text"
              placeholder="Search guest, phone, or ID…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              spellCheck={false}
              className="bg-background border-border/80 focus-visible:ring-ring h-8 px-3 pr-8 text-base focus-visible:ring-1 md:text-xs"
              aria-label="Search bookings"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 flex size-5 items-center justify-center border-0 bg-transparent p-0 transition-transform appearance-none select-none active:scale-[0.98]"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Right Controls: Record Count + Unit Selector + Sync Button */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-muted-foreground font-mono text-xs tabular-nums select-none hidden sm:block">
              {pagination.total === 0
                ? "0\u00A0reservations"
                : `Showing ${startRecord}–${endRecord} of ${pagination.total}\u00A0reservations`}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative inline-flex items-center">
                <select
                  value={selectedUnitId}
                  onChange={(e) => {
                    setSelectedUnitId(e.target.value);
                    setPage(1);
                  }}
                  className="border-border/80 bg-background text-foreground focus:ring-ring h-8 rounded-md border pl-2.5 pr-7 py-1 leading-none text-base focus:ring-1 focus:outline-none md:text-xs appearance-none [-webkit-appearance:none] cursor-pointer"
                  aria-label="Filter by unit"
                >
                  <option value="ALL">All units</option>
                  {unitsList.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 size-3.5 text-muted-foreground" />
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => mutate()}
                disabled={isValidating}
                className="h-8 px-2.5 text-xs transition-transform duration-100 ease-[var(--ease-snappy)] select-none active:scale-[0.98]"
                aria-label="Refresh bookings"
              >
                <RotateCw
                  data-icon="inline-start"
                  className={cn("size-3.5", isValidating && "animate-spin")}
                />
                <span className="hidden sm:inline">Sync</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Responsive Data Table & Card Reflow */}
      <ResponsiveBookingsList
        bookings={bookings}
        onManageFolio={handleManage}
      />

      {/* 4. Tabular Numerical Pagination */}
      <div className="text-muted-foreground flex items-center justify-between pt-1 pb-4 text-xs select-none">
        <div className="font-mono tabular-nums">
          {pagination.total === 0
            ? "0 bookings"
            : `Showing ${startRecord}–${endRecord} of ${pagination.total} bookings`}
        </div>
        {pagination.totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 px-3 text-xs transition-transform active:scale-[0.98]"
            >
              Previous
            </Button>
            <span className="text-foreground px-1 font-mono tabular-nums">
              {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() =>
                setPage((p) => Math.min(pagination.totalPages, p + 1))
              }
              className="h-8 px-3 text-xs transition-transform active:scale-[0.98]"
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* 5. Compound Folio Drawer */}
      <FolioDrawer
        bookingId={selectedFolioId}
        isOpen={Boolean(selectedFolioId)}
        onOpenChange={(open) => {
          if (!open) {
            updateFolioParam(null);
          }
        }}
        unitsList={unitsList}
        onBookingMutated={() => mutate()}
      />
    </div>
  );
}

export default BookingsDataTable;
