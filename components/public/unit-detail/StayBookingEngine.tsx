"use client";

import * as React from "react";
import {
  Plus,
  Minus,
  Trash2,
  Calendar,
  Clock,
  ShieldCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SocialIcons } from "@/components/public/icons/SocialIcons";

export interface StayBookingEngineProps {
  unitCategory: "DOME" | "A_FRAME";
  unitName: string;
  unitId?: string;
  totalInventoryUnits?: number;
  overnightBaseRate?: number;
  daySlotBaseRate?: number;
  className?: string;
}

interface RoomItemState {
  id: string;
  adults: number;
  infants: number;
}

interface NightBreakdownItem {
  date: string;
  dayOfWeek: string;
  isWeekend: boolean;
  baseRatePerUnit: number;
  appliedModifier: {
    name: string;
    type: string;
    percentage: number;
  } | null;
  effectiveRatePerUnit: number;
}

interface InquiryQuoteData {
  totalStayRent: number;
  requiredAdvanceTotal: number;
  remainingBalance: number;
  totalNights: number;
  totalRooms: number;
  totalAdults: number;
  totalInfants: number;
  nightsBreakdown: NightBreakdownItem[];
  whatsappMessage: string;
  whatsappUrl: string;
}

/**
 * Helper to get today's date in YYYY-MM-DD IST
 */
function getTodayIST(): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

/**
 * Helper to add days to YYYY-MM-DD
 */
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  const yOut = date.getUTCFullYear();
  const mOut = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dOut = String(date.getUTCDate()).padStart(2, "0");
  return `${yOut}-${mOut}-${dOut}`;
}

/**
 * Formats YYYY-MM-DD to human readable string: "15 Oct 2026"
 */
function formatHumanDate(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const [y, m, d] = dateStr.split("-").map(Number);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${d}\u00A0${months[m - 1]}\u00A0${y}`;
}

/**
 * StayBookingEngine - Interactive Accommodation Booking & Server-Side Quote Engine
 *
 * Enforces:
 * 1. Zero Client-Side Math: Client never calculates rates or lookups. Form queries POST /api/inquiry/generate.
 * 2. Strict Occupancy Hard Caps:
 *    - Domes: Max 3 adults, max 2 infants per room. Min 1 adult. Strictly NO extra beds.
 *    - A-Frames: Max 5 adults, max 4 infants per room. Min 1 adult. Strictly NO extra beds.
 *    - Stepper '+' buttons are strictly disabled at caps.
 * 3. Mobile Input Zoom Prevention: All inputs declare `text-base md:text-sm` (16px minimum on touch).
 * 4. Availability Integration: Queries GET /api/availability to verify inventory and grey out sold out dates.
 * 5. Price-Free WhatsApp CTA: Primary action routes to server-generated wa.me URL excluding prices to prevent tampering.
 * 6. Live Screen Estimate: Displayed with aria-live="polite" and integer rounding.
 */
export function StayBookingEngine({
  unitCategory,
  unitName,
  unitId,
  totalInventoryUnits = unitCategory === "DOME" ? 4 : 3,
  overnightBaseRate = unitCategory === "DOME" ? 3500 : 5000,
  daySlotBaseRate = unitCategory === "DOME" ? 2500 : 3500,
  className,
}: StayBookingEngineProps) {
  const isDome = unitCategory === "DOME";
  const maxAdultsPerRoom = isDome ? 3 : 5;
  const maxInfantsPerRoom = isDome ? 2 : 4;

  const todayStr = React.useMemo(() => getTodayIST(), []);
  const tomorrowStr = React.useMemo(() => addDays(todayStr, 1), [todayStr]);

  // Form State
  const [stayType, setStayType] = React.useState<"OVERNIGHT" | "DAY_SLOT">(
    "OVERNIGHT",
  );
  const [checkInDate, setCheckInDate] = React.useState<string>(todayStr);
  const [checkOutDate, setCheckOutDate] = React.useState<string>(tomorrowStr);
  const [daySlotDate, setDaySlotDate] = React.useState<string>(todayStr);

  // Multi-room state
  const [rooms, setRooms] = React.useState<RoomItemState[]>([
    { id: "room-1", adults: 2, infants: 0 },
  ]);

  // Guest Details
  const [guestName, setGuestName] = React.useState<string>("");
  const [guestPhone, setGuestPhone] = React.useState<string>("");
  const [specialRequests, setSpecialRequests] = React.useState<string>("");

  // Live Inventory & Availability State
  const [isCheckingAvailability, setIsCheckingAvailability] =
    React.useState<boolean>(false);
  const [isAvailable, setIsAvailable] = React.useState<boolean>(true);
  const [availableUnitsCount, setAvailableUnitsCount] =
    React.useState<number>(totalInventoryUnits);
  const [blockedDates, setBlockedDates] = React.useState<string[]>([]);
  const [availabilityError, setAvailabilityError] = React.useState<
    string | null
  >(null);

  // Server Quote & WhatsApp Link State
  const [isCalculatingQuote, setIsCalculatingQuote] =
    React.useState<boolean>(false);
  const [quote, setQuote] = React.useState<InquiryQuoteData | null>(null);
  const [quoteError, setQuoteError] = React.useState<string | null>(null);
  const [showNightDetails, setShowNightDetails] =
    React.useState<boolean>(false);

  // 1. Availability Integration: Check inventory when dates, stayType, or room count changes
  React.useEffect(() => {
    let isCancelled = false;

    const checkAvailability = async () => {
      setIsCheckingAvailability(true);
      setAvailabilityError(null);

      try {
        const targetCheckIn =
          stayType === "OVERNIGHT" ? checkInDate : daySlotDate;
        const targetCheckOut =
          stayType === "OVERNIGHT" ? checkOutDate : undefined;

        const params = new URLSearchParams({
          unitCategory,
          stayType,
          requestedUnits: String(rooms.length),
        });

        if (stayType === "OVERNIGHT") {
          params.append("checkInDate", targetCheckIn);
          if (targetCheckOut) params.append("checkOutDate", targetCheckOut);
        } else {
          params.append("date", targetCheckIn);
        }

        const targetMonth = targetCheckIn.substring(0, 7);
        params.append("month", targetMonth);

        const res = await fetch(`/api/availability?${params.toString()}`);
        if (!res.ok) {
          throw new Error("Unable to check live availability");
        }

        const data = await res.json();
        if (!isCancelled) {
          setIsAvailable(Boolean(data.isAvailable));
          setAvailableUnitsCount(
            typeof data.availableUnitsCount === "number"
              ? data.availableUnitsCount
              : 0,
          );
          setBlockedDates(
            Array.isArray(data.blockedDatesInMonth)
              ? data.blockedDatesInMonth
              : [],
          );
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn("Availability check fallback:", err);
          setIsAvailable(true);
          setAvailableUnitsCount(totalInventoryUnits);
        }
      } finally {
        if (!isCancelled) {
          setIsCheckingAvailability(false);
        }
      }
    };

    checkAvailability();

    return () => {
      isCancelled = true;
    };
  }, [
    unitCategory,
    stayType,
    checkInDate,
    checkOutDate,
    daySlotDate,
    rooms.length,
    totalInventoryUnits,
  ]);

  // 2. Authoritative Server Quote Generation: Fetch on-screen estimate from POST /api/inquiry/generate
  React.useEffect(() => {
    let isCancelled = false;

    // Validate date logic
    if (stayType === "OVERNIGHT" && checkOutDate <= checkInDate) {
      setQuote(null);
      setQuoteError("Check-out date must be strictly after check-in date");
      return;
    }

    const fetchQuote = async () => {
      setIsCalculatingQuote(true);
      setQuoteError(null);

      try {
        const payload = {
          type: "ROOM",
          unitCategory,
          unitId: unitId && !unitId.startsWith("unit-") ? unitId : undefined,
          stayType,
          checkInDate: stayType === "OVERNIGHT" ? checkInDate : daySlotDate,
          checkOutDate: stayType === "OVERNIGHT" ? checkOutDate : undefined,
          rooms: rooms.map((r, i) => ({
            roomIndex: i + 1,
            adults: r.adults,
            infants: r.infants,
          })),
          guestName: guestName.trim() || undefined,
          guestPhone: guestPhone.trim() || undefined,
          specialRequests: specialRequests.trim() || undefined,
        };

        const res = await fetch("/api/inquiry/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await res.json();

        if (!isCancelled) {
          if (result.success && result.data) {
            setQuote(result.data);
            setQuoteError(null);
          } else {
            setQuote(null);
            setQuoteError(result.error || "Unable to calculate stay quote");
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("Failed to generate quote:", err);
          setQuote(null);
          setQuoteError(
            "Unable to calculate rate breakdown. Please try again.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsCalculatingQuote(false);
        }
      }
    };

    // Debounce quote calculation slightly for rapid input
    const timer = setTimeout(fetchQuote, 250);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [
    unitCategory,
    unitId,
    stayType,
    checkInDate,
    checkOutDate,
    daySlotDate,
    rooms,
    guestName,
    guestPhone,
    specialRequests,
  ]);

  // Handle stay type toggle
  const handleStayTypeChange = (type: "OVERNIGHT" | "DAY_SLOT") => {
    setStayType(type);
    if (type === "OVERNIGHT") {
      if (checkOutDate <= checkInDate) {
        setCheckOutDate(addDays(checkInDate, 1));
      }
    }
  };

  // Handle check-in date change
  const handleCheckInChange = (newInDate: string) => {
    setCheckInDate(newInDate);
    if (checkOutDate <= newInDate) {
      setCheckOutDate(addDays(newInDate, 1));
    }
  };

  // Multi-room Handlers
  const handleAddRoom = () => {
    if (
      rooms.length >= availableUnitsCount ||
      rooms.length >= totalInventoryUnits
    )
      return;
    setRooms((prev) => [
      ...prev,
      { id: `room-${prev.length + 1}`, adults: 2, infants: 0 },
    ]);
  };

  const handleRemoveRoom = (index: number) => {
    if (rooms.length <= 1) return;
    setRooms((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateAdults = (index: number, delta: number) => {
    setRooms((prev) =>
      prev.map((room, i) => {
        if (i !== index) return room;
        const nextVal = Math.min(
          maxAdultsPerRoom,
          Math.max(1, room.adults + delta),
        );
        return { ...room, adults: nextVal };
      }),
    );
  };

  const handleUpdateInfants = (index: number, delta: number) => {
    setRooms((prev) =>
      prev.map((room, i) => {
        if (i !== index) return room;
        const nextVal = Math.min(
          maxInfantsPerRoom,
          Math.max(0, room.infants + delta),
        );
        return { ...room, infants: nextVal };
      }),
    );
  };

  // WhatsApp Action Dispatcher
  const handleVerifyViaWhatsApp = () => {
    if (!quote?.whatsappUrl) {
      // Trigger instant generation if pending
      return;
    }
    window.open(quote.whatsappUrl, "_blank", "noopener,noreferrer");
  };

  const isSoldOut =
    !isAvailable ||
    availableUnitsCount === 0 ||
    rooms.length > availableUnitsCount;
  const canAddMoreRooms =
    rooms.length < availableUnitsCount && rooms.length < totalInventoryUnits;

  return (
    <div
      id="booking-card"
      className={cn(
        "border-border/80 bg-card w-full min-w-0 space-y-6 rounded-2xl border p-5 shadow-sm transition-[box-shadow,border-color] duration-150 sm:p-6",
        className,
      )}
    >
      {/* 1. Header & Live Inventory Status Badge */}
      <div className="border-border/60 space-y-3 border-b pb-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground font-mono text-xs font-semibold tracking-wider uppercase">
            Direct Reservation
          </span>

          {/* Live Inventory Status Chip */}
          {isCheckingAvailability ? (
            <span className="text-muted-foreground bg-surface-subtle border-border/40 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-xs">
              <Loader2 className="text-primary size-3 shrink-0 animate-spin" />
              <span>Checking inventory…</span>
            </span>
          ) : isSoldOut ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 font-mono text-xs font-semibold text-rose-950 dark:bg-rose-950/80 dark:text-rose-200">
              <AlertCircle className="size-3 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>Sold Out</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 font-mono text-xs font-semibold text-emerald-950 dark:bg-emerald-950/80 dark:text-emerald-200">
              <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-emerald-500" />
              <span>
                {availableUnitsCount}&nbsp;{isDome ? "Domes" : "A-Frames"}
                &nbsp;available
              </span>
            </span>
          )}
        </div>

        {/* Pricing Heading */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            Starting from
          </span>
          <span className="text-foreground font-mono text-2xl font-bold tabular-nums sm:text-3xl">
            ₹&nbsp;
            {(stayType === "OVERNIGHT"
              ? overnightBaseRate
              : daySlotBaseRate
            ).toLocaleString("en-IN")}
          </span>
          <span className="text-muted-foreground text-xs font-normal">
            {stayType === "OVERNIGHT" ? "/\u00A0night" : "/\u00A0day slot"}
          </span>
        </div>
      </div>

      {/* 2. Stay Type Selector (Overnight vs Day Slot) */}
      <div className="space-y-2">
        <label className="text-foreground block font-mono text-xs font-semibold tracking-wider uppercase">
          Stay type
        </label>
        <div className="bg-surface-subtle border-border/60 grid grid-cols-2 gap-2 rounded-xl border p-1">
          <button
            type="button"
            onClick={() => handleStayTypeChange("OVERNIGHT")}
            aria-pressed={stayType === "OVERNIGHT"}
            className={cn(
              "cursor-pointer rounded-lg px-3 py-2.5 text-center text-xs font-semibold transition-all duration-150 select-none",
              "ease-[var(--ease-snappy)] active:scale-[0.98]",
              stayType === "OVERNIGHT"
                ? "bg-card text-foreground border-border/60 border shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="block font-sans">Overnight Stay</span>
            <span className="text-muted-foreground mt-0.5 block font-mono text-[10px]">
              12:00&nbsp;PM – 11:00&nbsp;AM
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleStayTypeChange("DAY_SLOT")}
            aria-pressed={stayType === "DAY_SLOT"}
            className={cn(
              "cursor-pointer rounded-lg px-3 py-2.5 text-center text-xs font-semibold transition-all duration-150 select-none",
              "ease-[var(--ease-snappy)] active:scale-[0.98]",
              stayType === "DAY_SLOT"
                ? "bg-card text-foreground border-border/60 border shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="block font-sans">Day Slot</span>
            <span className="text-muted-foreground mt-0.5 block font-mono text-[10px]">
              10:00&nbsp;AM – 3:00&nbsp;PM
            </span>
          </button>
        </div>
      </div>

      {/* 3. Smart Date Pickers (Integrated with Live Availability) */}
      <div className="space-y-3">
        {stayType === "OVERNIGHT" ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="check-in-date"
                className="text-foreground block font-sans text-xs font-semibold"
              >
                Check-in date
              </label>
              <input
                id="check-in-date"
                type="date"
                min={todayStr}
                value={checkInDate}
                onChange={(e) => handleCheckInChange(e.target.value)}
                className="border-border/80 bg-background text-foreground focus:ring-primary w-full rounded-lg border px-3 py-2 font-mono text-base transition-all focus:border-transparent focus:ring-2 focus:outline-none md:text-sm"
              />
              <span className="text-muted-foreground block font-mono text-[11px]">
                Check-in at 12:00&nbsp;PM IST
              </span>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="check-out-date"
                className="text-foreground block font-sans text-xs font-semibold"
              >
                Check-out date
              </label>
              <input
                id="check-out-date"
                type="date"
                min={addDays(checkInDate, 1)}
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                className="border-border/80 bg-background text-foreground focus:ring-primary w-full rounded-lg border px-3 py-2 font-mono text-base transition-all focus:border-transparent focus:ring-2 focus:outline-none md:text-sm"
              />
              <span className="text-muted-foreground block font-mono text-[11px]">
                Check-out at 11:00&nbsp;AM IST
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <label
              htmlFor="day-slot-date"
              className="text-foreground block font-sans text-xs font-semibold"
            >
              Select date
            </label>
            <input
              id="day-slot-date"
              type="date"
              min={todayStr}
              value={daySlotDate}
              onChange={(e) => setDaySlotDate(e.target.value)}
              className="border-border/80 bg-background text-foreground focus:ring-primary w-full rounded-lg border px-3 py-2 font-mono text-base transition-all focus:border-transparent focus:ring-2 focus:outline-none md:text-sm"
            />
            <div className="text-muted-foreground flex items-center gap-1.5 pt-1 font-mono text-[11px]">
              <Clock className="text-primary size-3 shrink-0" />
              <span>
                Standard IST Operating Window: 10:00&nbsp;AM to 3:00&nbsp;PM
                (Same Day)
              </span>
            </div>
          </div>
        )}

        {/* Warning if selected date is known to be blocked */}
        {blockedDates.includes(
          stayType === "OVERNIGHT" ? checkInDate : daySlotDate,
        ) && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              This date has limited or zero category inventory. Please choose
              another date or verify directly on WhatsApp.
            </span>
          </div>
        )}
      </div>

      {/* 4. Multi-Room Selector with Strict Hard Occupancy Caps */}
      <div className="border-border/60 space-y-3 border-t pt-2">
        <div className="flex items-center justify-between gap-2">
          <label className="text-foreground font-mono text-xs font-semibold tracking-wider uppercase">
            Rooms &amp; occupancy
          </label>
          <span className="text-muted-foreground font-mono text-[11px]">
            {rooms.length}&nbsp;{rooms.length === 1 ? "Unit" : "Units"}
          </span>
        </div>

        {/* Rooms Rows */}
        <div className="space-y-3">
          {rooms.map((room, idx) => (
            <div
              key={room.id}
              className="border-border/70 bg-surface-subtle/50 space-y-3 rounded-xl border p-3.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-foreground font-mono text-xs font-semibold">
                  Room {idx + 1}
                </span>

                {rooms.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveRoom(idx)}
                    aria-label={`Remove room ${idx + 1}`}
                    className="text-muted-foreground hover:text-destructive inline-flex cursor-pointer items-center gap-1 text-xs transition-colors active:scale-95"
                  >
                    <Trash2 className="size-3.5" />
                    <span className="hidden sm:inline">Remove</span>
                  </button>
                )}
              </div>

              {/* Steppers Matrix */}
              <div className="grid grid-cols-2 gap-3">
                {/* Adults Stepper */}
                <div className="space-y-1">
                  <span className="text-muted-foreground block font-sans text-[11px] font-medium">
                    Adults (3+ yrs)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateAdults(idx, -1)}
                      disabled={room.adults <= 1}
                      aria-label={`Decrease adults in room ${idx + 1}`}
                      className="border-border/80 bg-background text-foreground hover:bg-surface-subtle flex size-8 cursor-pointer items-center justify-center rounded-md border transition-transform active:scale-95 disabled:pointer-events-none disabled:opacity-40"
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="text-foreground w-6 text-center font-mono text-sm font-bold tabular-nums select-none">
                      {room.adults}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateAdults(idx, 1)}
                      disabled={room.adults >= maxAdultsPerRoom}
                      aria-label={`Increase adults in room ${idx + 1}`}
                      className="border-border/80 bg-background text-foreground hover:bg-surface-subtle flex size-8 cursor-pointer items-center justify-center rounded-md border transition-transform active:scale-95 disabled:pointer-events-none disabled:opacity-40"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                </div>

                {/* Infants Stepper */}
                <div className="space-y-1">
                  <span className="text-muted-foreground block font-sans text-[11px] font-medium">
                    Infants (&lt;3 yrs)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateInfants(idx, -1)}
                      disabled={room.infants <= 0}
                      aria-label={`Decrease infants in room ${idx + 1}`}
                      className="border-border/80 bg-background text-foreground hover:bg-surface-subtle flex size-8 cursor-pointer items-center justify-center rounded-md border transition-transform active:scale-95 disabled:pointer-events-none disabled:opacity-40"
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="text-foreground w-6 text-center font-mono text-sm font-bold tabular-nums select-none">
                      {room.infants}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateInfants(idx, 1)}
                      disabled={room.infants >= maxInfantsPerRoom}
                      aria-label={`Increase infants in room ${idx + 1}`}
                      className="border-border/80 bg-background text-foreground hover:bg-surface-subtle flex size-8 cursor-pointer items-center justify-center rounded-md border transition-transform active:scale-95 disabled:pointer-events-none disabled:opacity-40"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Hard Occupancy Notice */}
              <div className="text-muted-foreground font-mono text-[11px]">
                Hard Cap: Max {maxAdultsPerRoom}&nbsp;Adults &amp;{" "}
                {maxInfantsPerRoom}&nbsp;Infants. Strictly NO extra beds.
              </div>
            </div>
          ))}
        </div>

        {/* Add Another Room Button */}
        <button
          type="button"
          onClick={handleAddRoom}
          disabled={!canAddMoreRooms}
          className={cn(
            "flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed px-3 py-2.5 text-xs font-semibold transition-all select-none",
            "ease-snappy cursor-pointer active:scale-[0.98]",
            canAddMoreRooms
              ? "border-primary/50 text-primary hover:bg-primary/5 hover:border-primary"
              : "border-border/60 text-muted-foreground cursor-not-allowed opacity-50",
          )}
        >
          <Plus className="size-3.5" />
          <span>Add another room</span>
        </button>
        {!canAddMoreRooms && (
          <span className="text-muted-foreground block text-center font-mono text-[11px]">
            Maximum available units reached ({rooms.length}&nbsp;of&nbsp;
            {availableUnitsCount})
          </span>
        )}
      </div>

      {/* 5. Guest Information (Inputs declare text-base md:text-sm for iOS auto-zoom guard) */}
      <div className="border-border/60 space-y-3 border-t pt-2">
        <label className="text-foreground block font-mono text-xs font-semibold tracking-wider uppercase">
          Guest information
        </label>

        <div className="space-y-2.5">
          <div>
            <label
              htmlFor="guest-name"
              className="text-foreground mb-1 block font-sans text-xs font-medium"
            >
              Full name
            </label>
            <input
              id="guest-name"
              type="text"
              placeholder="e.g. Georgekutty"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="border-border/80 bg-background text-foreground placeholder:text-muted-foreground/60 focus:ring-primary w-full rounded-lg border px-3 py-2 text-base transition-all focus:border-transparent focus:ring-2 focus:outline-none md:text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="guest-phone"
              className="text-foreground mb-1 block font-sans text-xs font-medium"
            >
              WhatsApp / phone number
            </label>
            <input
              id="guest-phone"
              type="tel"
              placeholder="e.g. +91 98470 12345"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              className="border-border/80 bg-background text-foreground placeholder:text-muted-foreground/60 focus:ring-primary w-full rounded-lg border px-3 py-2 font-mono text-base transition-all focus:border-transparent focus:ring-2 focus:outline-none md:text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="special-requests"
              className="text-foreground mb-1 block font-sans text-xs font-medium"
            >
              Special requests (optional)
            </label>
            <textarea
              id="special-requests"
              rows={2}
              placeholder="BBQ skewers, arrival timing, campfire…"
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              className="border-border/80 bg-background text-foreground placeholder:text-muted-foreground/60 focus:ring-primary w-full resize-none rounded-lg border px-3 py-2 text-base transition-all focus:border-transparent focus:ring-2 focus:outline-none md:text-sm"
            />
          </div>
        </div>
      </div>

      {/* 6. On-Screen Estimate Breakdown (Zero Client Math - Powered by Server Quote) */}
      <div
        aria-live="polite"
        className="border-border/60 space-y-3 border-t pt-2"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-foreground font-mono text-xs font-semibold tracking-wider uppercase">
            Estimated tariff breakdown
          </span>
          {isCalculatingQuote && (
            <Loader2 className="text-primary size-3 shrink-0 animate-spin" />
          )}
        </div>

        {quoteError ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
            {quoteError}
          </div>
        ) : quote ? (
          <div className="bg-surface-subtle border-border/70 space-y-2.5 rounded-xl border p-3.5 font-mono text-xs">
            {/* Total Rent */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">
                Stay Rent ({quote.totalRooms}&nbsp;
                {quote.totalRooms === 1 ? "Unit" : "Units"}
                {stayType === "OVERNIGHT" &&
                  ` · ${quote.totalNights}\u00A0${quote.totalNights === 1 ? "Night" : "Nights"}`}
                ):
              </span>
              <span className="text-foreground font-bold tabular-nums">
                ₹&nbsp;{Math.round(quote.totalStayRent).toLocaleString("en-IN")}
              </span>
            </div>

            {/* Booking Advance Required */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">
                Required booking advance:
              </span>
              <span className="text-primary font-bold tabular-nums">
                ₹&nbsp;
                {Math.round(quote.requiredAdvanceTotal).toLocaleString("en-IN")}
              </span>
            </div>

            {/* Remaining Balance at Check-in */}
            <div className="border-border/60 flex items-center justify-between gap-2 border-t pt-2">
              <span className="text-muted-foreground">
                Balance due at check-in:
              </span>
              <span className="text-foreground font-bold tabular-nums">
                ₹&nbsp;
                {Math.round(quote.remainingBalance).toLocaleString("en-IN")}
              </span>
            </div>

            {/* Optional Night-by-Night Breakdown Accordion */}
            {stayType === "OVERNIGHT" && quote.nightsBreakdown.length > 0 && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowNightDetails(!showNightDetails)}
                  className="text-primary inline-flex cursor-pointer items-center gap-1 font-sans text-[11px] hover:underline"
                >
                  <span>
                    {showNightDetails
                      ? "Hide night breakdown"
                      : "View night-by-night breakdown"}
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-3 transition-transform",
                      showNightDetails && "rotate-180",
                    )}
                  />
                </button>

                {showNightDetails && (
                  <div className="border-border/40 mt-2 space-y-1.5 border-t pt-2 text-[11px]">
                    {quote.nightsBreakdown.map((n) => (
                      <div
                        key={n.date}
                        className="text-muted-foreground flex items-center justify-between gap-2"
                      >
                        <span>
                          {formatHumanDate(n.date)} ({n.dayOfWeek.slice(0, 3)})
                          {n.appliedModifier && (
                            <span className="text-primary ml-1 text-[10px] font-semibold">
                              ({n.appliedModifier.name})
                            </span>
                          )}
                        </span>
                        <span className="text-foreground tabular-nums">
                          ₹&nbsp;
                          {Math.round(n.effectiveRatePerUnit).toLocaleString(
                            "en-IN",
                          )}{" "}
                          / unit
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="text-muted-foreground pt-1 font-sans text-[10px] leading-normal">
              * Non-binding on-screen estimate. Official invoice &amp; advance
              payment link are confirmed directly by resort managers in WhatsApp
              chat.
            </div>
          </div>
        ) : (
          <div className="bg-surface-subtle border-border/60 text-muted-foreground rounded-xl border p-3.5 font-mono text-xs">
            Select dates to compute live rate estimate…
          </div>
        )}
      </div>

      {/* 7. Primary Action Button: Verify via WhatsApp */}
      <div className="space-y-2 pt-1">
        <Button
          type="button"
          onClick={handleVerifyViaWhatsApp}
          disabled={isSoldOut || isCalculatingQuote || !quote?.whatsappUrl}
          variant="whatsapp"
          className="h-12 w-full cursor-pointer text-sm font-bold shadow-sm transition-transform duration-100 ease-[var(--ease-snappy)] select-none active:scale-[0.98]"
        >
          <SocialIcons.whatsapp className="size-4 shrink-0 fill-current" />
          <span>Verify via WhatsApp</span>
        </Button>

        <p className="text-muted-foreground text-center font-mono text-[11px]">
          Direct reservation with resort managers on WhatsApp
        </p>
      </div>
    </div>
  );
}

export default StayBookingEngine;
