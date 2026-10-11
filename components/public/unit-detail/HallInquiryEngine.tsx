"use client";

import * as React from "react";
import {
  Calendar,
  Clock,
  Users,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Waves,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SocialIcons } from "@/components/public/icons/SocialIcons";
import { SITE_CONFIG } from "@/lib/constants";

export interface HallInquiryEngineProps {
  unitCategory: "NON_AC_HALL" | "AC_HALL" | string;
  venueName: string;
  unitId?: string;
  maxCapacity?: number;
  isActive?: boolean;
  initialSlotType?: "MORNING_SLOT" | "EVENING_SLOT";
  initialDate?: string;
  className?: string;
}

export interface HallQuoteData {
  totalVenueRent: number;
  requiredAdvance: number;
  remainingBalance: number;
  matchedSlab: {
    minHeadcount: number;
    maxHeadcount: number;
    basePrice: number;
    requiredDeposit: number;
    isFloorApplied: boolean;
  };
  appliedModifier: {
    name: string;
    type: string;
    percentage: number;
  } | null;
  attachedDomeRequested: boolean;
  attachedDomeStatus: "COMPLIMENTARY" | "ON_REQUEST" | "NOT_REQUESTED";
  whatsappMessage: string;
  whatsappUrl: string;
}

interface SlabReference {
  minHeadcount: number;
  maxHeadcount: number;
  rate: number;
  requiredAdvance: number;
  complimentaryDome: boolean;
}

const DEFAULT_SLABS: Record<
  "NON_AC_HALL" | "AC_HALL",
  Record<"MORNING_SLOT" | "EVENING_SLOT", SlabReference[]>
> = {
  NON_AC_HALL: {
    MORNING_SLOT: [
      { minHeadcount: 10, maxHeadcount: 25, rate: 10000, requiredAdvance: 5000, complimentaryDome: false },
      { minHeadcount: 26, maxHeadcount: 50, rate: 16000, requiredAdvance: 5000, complimentaryDome: false },
      { minHeadcount: 51, maxHeadcount: 100, rate: 24000, requiredAdvance: 6000, complimentaryDome: false },
      { minHeadcount: 101, maxHeadcount: 200, rate: 35000, requiredAdvance: 8000, complimentaryDome: false },
      { minHeadcount: 201, maxHeadcount: 400, rate: 46000, requiredAdvance: 8000, complimentaryDome: false },
      { minHeadcount: 401, maxHeadcount: 800, rate: 58000, requiredAdvance: 10000, complimentaryDome: true },
      { minHeadcount: 801, maxHeadcount: 1200, rate: 72000, requiredAdvance: 15000, complimentaryDome: true },
    ],
    EVENING_SLOT: [
      { minHeadcount: 10, maxHeadcount: 25, rate: 15000, requiredAdvance: 5000, complimentaryDome: false },
      { minHeadcount: 26, maxHeadcount: 50, rate: 22000, requiredAdvance: 5000, complimentaryDome: false },
      { minHeadcount: 51, maxHeadcount: 100, rate: 32000, requiredAdvance: 6000, complimentaryDome: false },
      { minHeadcount: 101, maxHeadcount: 200, rate: 45000, requiredAdvance: 8000, complimentaryDome: false },
      { minHeadcount: 201, maxHeadcount: 400, rate: 58000, requiredAdvance: 8000, complimentaryDome: false },
      { minHeadcount: 401, maxHeadcount: 800, rate: 72000, requiredAdvance: 10000, complimentaryDome: true },
      { minHeadcount: 801, maxHeadcount: 1200, rate: 90000, requiredAdvance: 15000, complimentaryDome: true },
    ],
  },
  AC_HALL: {
    MORNING_SLOT: [
      { minHeadcount: 100, maxHeadcount: 500, rate: 75000, requiredAdvance: 15000, complimentaryDome: true },
      { minHeadcount: 501, maxHeadcount: 2000, rate: 150000, requiredAdvance: 30000, complimentaryDome: true },
    ],
    EVENING_SLOT: [
      { minHeadcount: 100, maxHeadcount: 500, rate: 100000, requiredAdvance: 20000, complimentaryDome: true },
      { minHeadcount: 501, maxHeadcount: 2000, rate: 200000, requiredAdvance: 40000, complimentaryDome: true },
    ],
  },
};

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
 * HallInquiryEngine - Interactive Event Venue Inquiry & Server-Side Slabs Quote Engine
 * 
 * Enforces:
 * 1. Zero Client-Side Math: Client never calculates rates or modifiers; queries POST /api/inquiry/generate.
 * 2. Slot Gatherings: Morning Slot (10:00 AM – 3:00 PM) vs Evening Slot (5:00 PM – 10:00 PM).
 * 3. Date picker checking slot availability via GET /api/availability.
 * 4. Contiguous Slabs Reference Table with active headcount row highlight.
 * 5. Minimum Slab Floor Rule: Headcount below lowest slab matches opening fee rather than erroring.
 * 6. Attached Dome Request: Automatically selected as complimentary perk if headcount >= 400 Pax; on-request if < 400 Pax.
 * 7. Strict Swimming Pool Exclusion Notice.
 * 8. Price-Free WhatsApp Inquiry CTA.
 */
export function HallInquiryEngine({
  unitCategory,
  venueName,
  unitId,
  maxCapacity = unitCategory === "AC_HALL" ? 2000 : 1200,
  isActive = true,
  initialSlotType,
  initialDate,
  className,
}: HallInquiryEngineProps) {
  const resolvedCategory: "NON_AC_HALL" | "AC_HALL" =
    unitCategory === "AC_HALL" ? "AC_HALL" : "NON_AC_HALL";
  const todayStr = React.useMemo(() => getTodayIST(), []);

  // Form State
  const [slotType, setSlotType] = React.useState<"MORNING_SLOT" | "EVENING_SLOT">(
    initialSlotType || "MORNING_SLOT"
  );
  const [eventDate, setEventDate] = React.useState<string>(initialDate || todayStr);
  const [headcount, setHeadcount] = React.useState<number>(150);
  const [attachedDomeRequested, setAttachedDomeRequested] = React.useState<boolean>(false);
  const [hasManuallyToggledDome, setHasManuallyToggledDome] = React.useState<boolean>(false);

  // Slabs table toggle
  const [showSlabsTable, setShowSlabsTable] = React.useState<boolean>(false);

  // Availability State
  const [isCheckingAvailability, setIsCheckingAvailability] = React.useState<boolean>(false);
  const [isSlotAvailable, setIsSlotAvailable] = React.useState<boolean | null>(null);

  // Organizer details
  const [guestName, setGuestName] = React.useState<string>("");
  const [guestPhone, setGuestPhone] = React.useState<string>("");
  const [notes, setNotes] = React.useState<string>("");

  // Server Quote State
  const [isCalculatingQuote, setIsCalculatingQuote] = React.useState<boolean>(false);
  const [quote, setQuote] = React.useState<HallQuoteData | null>(null);
  const [quoteError, setQuoteError] = React.useState<string | null>(null);

  // Contiguous Slabs for reference
  const currentCategorySlabs = DEFAULT_SLABS[resolvedCategory] || DEFAULT_SLABS.NON_AC_HALL;
  const currentSlotSlabs = currentCategorySlabs[slotType] || [];
  const lowestSlabMin = currentSlotSlabs[0]?.minHeadcount ?? 10;
  const isFloorActive = headcount < lowestSlabMin && headcount > 0;

  // Attached Dome Perk Trigger:
  // Automatically select as complimentary perk when entering headcount >= 400 Pax tier; on-request if < 400 Pax.
  const prevHeadcountRef = React.useRef<number>(headcount);
  React.useEffect(() => {
    const prev = prevHeadcountRef.current;
    if (headcount >= 400 && prev < 400) {
      setAttachedDomeRequested(true);
    } else if (headcount < 400 && prev >= 400 && !hasManuallyToggledDome) {
      setAttachedDomeRequested(false);
    }
    prevHeadcountRef.current = headcount;
  }, [headcount, hasManuallyToggledDome]);

  // Check Slot Availability via GET /api/availability
  React.useEffect(() => {
    let isCancelled = false;
    if (!isActive || !eventDate) return;

    const checkAvailability = async () => {
      setIsCheckingAvailability(true);
      try {
        const query = new URLSearchParams({
          unitCategory: resolvedCategory,
          stayType: slotType,
          date: eventDate,
          requestedUnits: "1",
        });
        if (unitId) query.set("unitId", unitId);

        const res = await fetch(`/api/availability?${query.toString()}`);
        if (!res.ok) throw new Error("Availability query failed");
        const json = await res.json();

        if (!isCancelled) {
          setIsSlotAvailable(Boolean(json.isAvailable));
        }
      } catch (err) {
        if (!isCancelled) {
          // Graceful fallback: do not lock user out on network failure
          setIsSlotAvailable(true);
        }
      } finally {
        if (!isCancelled) {
          setIsCheckingAvailability(false);
        }
      }
    };

    const timer = setTimeout(checkAvailability, 200);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [resolvedCategory, unitId, slotType, eventDate, isActive]);

  // Fetch Authoritative Hall Quote from POST /api/inquiry/generate
  React.useEffect(() => {
    let isCancelled = false;

    if (!isActive) {
      setQuote(null);
      return;
    }

    // Capacity validation: Headcount between 1 and maxCapacity.
    // Minimum Slab Floor rule: Headcount below lowest slab matches opening fee rather than erroring!
    if (!headcount || headcount < 1 || headcount > maxCapacity) {
      setQuote(null);
      if (headcount > maxCapacity) {
        setQuoteError(`Headcount exceeds physical capacity of ${maxCapacity.toLocaleString("en-IN")}\u00A0Pax`);
      } else if (headcount < 0) {
        setQuoteError("Please enter an attendee headcount of at least 1\u00A0Pax");
      } else {
        // Headcount is 0 or empty while typing: show neutral prompt
        setQuoteError(null);
      }
      return;
    }

    const fetchQuote = async () => {
      setIsCalculatingQuote(true);
      setQuoteError(null);

      try {
        const payload = {
          type: "HALL",
          unitCategory: resolvedCategory,
          unitId: unitId || undefined,
          slotType,
          eventDate,
          headcount: Number(headcount),
          attachedDomeRequested,
          guestName: guestName.trim() || undefined,
          guestPhone: guestPhone.trim() || undefined,
          notes: notes.trim() || undefined,
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
            setQuoteError(result.error || "Unable to calculate venue quote");
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("Failed to generate venue quote:", err);
          setQuote(null);
          setQuoteError("Unable to calculate rate breakdown. Please try again.");
        }
      } finally {
        if (!isCancelled) {
          setIsCalculatingQuote(false);
        }
      }
    };

    const timer = setTimeout(fetchQuote, 250);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [resolvedCategory, unitId, slotType, eventDate, headcount, attachedDomeRequested, guestName, guestPhone, notes, maxCapacity, isActive]);

  const handleVerifyViaWhatsApp = () => {
    if (!quote?.whatsappUrl) return;
    window.open(quote.whatsappUrl, "_blank", "noopener,noreferrer");
  };

  if (!isActive) {
    return (
      <div
        id="booking-card"
        className={cn(
          "rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-4 min-w-0 w-full text-center",
          className
        )}
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
          Temporarily Unavailable
        </span>
        <h3 className="font-serif text-xl font-medium text-foreground">
          {venueName}
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          This venue is currently not accepting automated online inquiries. Please contact our reservations desk directly for custom dates and special arrangements.
        </p>
        <Button
          type="button"
          onClick={() => window.open(SITE_CONFIG.defaultWhatsAppUrl, "_blank")}
          variant="outline"
          className="w-full text-xs font-semibold active:scale-[0.98] transition-transform duration-100 ease-snappy select-none"
        >
          Contact Reservations Desk
        </Button>
      </div>
    );
  }

  return (
    <div
      id="booking-card"
      className={cn(
        "rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm space-y-6 min-w-0 w-full transition-[box-shadow,border-color] duration-150",
        className
      )}
    >
      {/* 1. Header & Live Availability Badge */}
      <div className="space-y-3 pb-4 border-b border-border/60">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
            Event venue inquiry
          </span>

          {isCheckingAvailability ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-mono bg-surface-subtle px-2.5 py-1 rounded-full">
              <Loader2 className="size-3 animate-spin text-primary" />
              <span>Checking slot…</span>
            </span>
          ) : isSlotAvailable === false ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-950 bg-rose-100 dark:bg-rose-950/80 dark:text-rose-200 px-2.5 py-1 rounded-full font-mono select-none">
              <AlertCircle className="size-3 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>Slot Reserved</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-950 bg-emerald-100 dark:bg-emerald-950/80 dark:text-emerald-200 px-2.5 py-1 rounded-full font-mono select-none">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>Slot Available</span>
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-1.5">
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Starting slab rate
          </span>
          <span className="font-mono tabular-nums text-2xl sm:text-3xl font-bold text-foreground">
            ₹&nbsp;{unitCategory === "NON_AC_HALL" ? "10,000" : "75,000"}
          </span>
        </div>
      </div>

      {/* 2. Slot Selector (Morning vs Evening) */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-foreground font-mono block">
          Event gathering slot
        </label>
        <div className="grid grid-cols-2 gap-2 p-1 bg-surface-subtle rounded-xl border border-border/60">
          <button
            type="button"
            onClick={() => setSlotType("MORNING_SLOT")}
            className={cn(
              "py-2.5 px-3 rounded-lg text-xs font-semibold transition-transform duration-100 ease-[var(--ease-snappy)] select-none cursor-pointer text-center active:scale-[0.98]",
              slotType === "MORNING_SLOT"
                ? "bg-card text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="block font-sans">Morning Slot</span>
            <span className="block text-[10px] text-muted-foreground font-mono mt-0.5">
              10:00&nbsp;AM – 3:00&nbsp;PM
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSlotType("EVENING_SLOT")}
            className={cn(
              "py-2.5 px-3 rounded-lg text-xs font-semibold transition-transform duration-100 ease-[var(--ease-snappy)] select-none cursor-pointer text-center active:scale-[0.98]",
              slotType === "EVENING_SLOT"
                ? "bg-card text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="block font-sans">Evening Slot</span>
            <span className="block text-[10px] text-muted-foreground font-mono mt-0.5">
              5:00&nbsp;PM – 10:00&nbsp;PM
            </span>
          </button>
        </div>
      </div>

      {/* 3. Event Date Picker with Slot Availability Check */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor="event-date" className="text-xs font-semibold text-foreground block font-sans">
            Event date
          </label>
          <input
            id="event-date"
            type="date"
            min={todayStr}
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-base md:text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
          />

          {isSlotAvailable === false && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-800 dark:text-rose-200">
              <AlertCircle className="size-3.5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <span>
                This gathering slot is reserved for the selected date. Please pick an alternative date or try the {slotType === "MORNING_SLOT" ? "Evening" : "Morning"} Slot.
              </span>
            </div>
          )}
        </div>

        {/* 4. Attendee Headcount Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="headcount" className="text-xs font-semibold text-foreground font-sans">
              Expected attendees (headcount)
            </label>
            <span className="text-[11px] font-mono text-muted-foreground">
              Max {maxCapacity.toLocaleString("en-IN")}&nbsp;Pax
            </span>
          </div>
          <input
            id="headcount"
            type="number"
            min={1}
            max={maxCapacity}
            value={headcount || ""}
            onChange={(e) => setHeadcount(Number(e.target.value))}
            className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-base md:text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
          />

          {/* Minimum Slab Floor Rule Callout */}
          {isFloorActive && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-subtle border border-border/60 text-[11px] text-muted-foreground font-mono">
              <Info className="size-3.5 text-primary shrink-0" />
              <span>
                Minimum opening fee applies for headcounts under {lowestSlabMin}&nbsp;Pax.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 5. Contiguous Slabs Reference Table */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setShowSlabsTable((prev) => !prev)}
          className="flex items-center justify-between w-full py-1.5 px-2.5 rounded-lg bg-surface-subtle/80 hover:bg-surface-subtle border border-border/60 text-xs font-medium text-foreground transition-colors cursor-pointer select-none active:scale-[0.99]"
        >
          <span className="font-mono text-[11px]">
            {slotType === "MORNING_SLOT" ? "Morning Slot" : "Evening Slot"} rate slabs reference
          </span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
            <span>{showSlabsTable ? "Hide table" : "Show table"}</span>
            {showSlabsTable ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </span>
        </button>

        {showSlabsTable && (
          <div className="rounded-xl border border-border/70 overflow-hidden bg-background">
            <table className="w-full border-collapse text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-border/60 bg-surface-subtle/60 text-muted-foreground text-[11px]">
                  <th className="py-2 px-3 font-semibold">Headcount</th>
                  <th className="py-2 px-3 font-semibold">Base rate</th>
                  <th className="py-2 px-3 font-semibold">Advance</th>
                  <th className="py-2 px-3 font-semibold text-right">Perk</th>
                </tr>
              </thead>
              <tbody>
                {currentSlotSlabs.map((slab) => {
                  const isCurrent =
                    headcount >= slab.minHeadcount && headcount <= slab.maxHeadcount;
                  const isFloorRow = isFloorActive && slab.minHeadcount === lowestSlabMin;

                  return (
                    <tr
                      key={`${slab.minHeadcount}-${slab.maxHeadcount}`}
                      className={cn(
                        "border-b border-border/60 transition-colors",
                        isCurrent || isFloorRow
                          ? "bg-primary/10 font-bold text-foreground"
                          : "hover:bg-surface-subtle/30 text-foreground/80"
                      )}
                    >
                      <td className="py-2 px-3">
                        <div className="truncate flex items-center gap-1.5">
                          {(isCurrent || isFloorRow) && (
                            <span className="size-1.5 rounded-full bg-primary shrink-0" />
                          )}
                          <span>
                            {slab.minHeadcount}–{slab.maxHeadcount}&nbsp;Pax
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-3 tabular-nums">
                        <div className="truncate">
                          ₹&nbsp;{slab.rate.toLocaleString("en-IN")}
                        </div>
                      </td>
                      <td className="py-2 px-3 tabular-nums">
                        <div className="truncate text-muted-foreground">
                          ₹&nbsp;{slab.requiredAdvance.toLocaleString("en-IN")}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="truncate">
                          {slab.complimentaryDome ? (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                              Free Dome
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">
                              On-request
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Attached Dome Perk Trigger Checkbox */}
      <div className="p-3.5 rounded-xl border border-border/70 bg-surface-subtle/50 space-y-2">
        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={attachedDomeRequested}
            onChange={(e) => {
              setAttachedDomeRequested(e.target.checked);
              setHasManuallyToggledDome(true);
            }}
            className="mt-0.5 size-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
          />
          <div className="text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-foreground font-sans">
                Request attached Dome during event hours
              </span>
              {headcount >= 400 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/20 px-1.5 py-0.2 rounded-md font-mono">
                  <Sparkles className="size-2.5" />
                  <span>Complimentary perk (&#8805;&nbsp;400&nbsp;Pax)</span>
                </span>
              )}
            </div>
            <span className="text-[11px] text-muted-foreground font-mono block mt-0.5">
              {headcount >= 400
                ? "Automatically included as 1 complimentary attached Dome (\u2265 400 Pax). Subject to schedule & room inventory clearance."
                : "Available on request (Subject to schedule & room inventory clearance)."}
            </span>
          </div>
        </label>
      </div>

      {/* 7. Strict Swimming Pool Exclusion Notice Banner */}
      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
        <Waves className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <span className="leading-relaxed">
          <strong className="font-semibold">Notice:</strong> Swimming pool access is strictly excluded for event attendees under all circumstances. Pool facilities remain reserved exclusively for resident overnight guests.
        </span>
      </div>

      {/* 8. Organizer Inputs */}
      <div className="space-y-3 pt-2 border-t border-border/60">
        <label className="text-xs font-semibold uppercase tracking-wider text-foreground font-mono block">
          Organizer information
        </label>
        <div className="space-y-2.5">
          <input
            type="text"
            placeholder="Organizer Name (e.g. Aiswarya Lakshmi)"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-base md:text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
          />
          <input
            type="tel"
            placeholder="Contact Phone (e.g. +91 97455 67890)"
            value={guestPhone}
            onChange={(e) => setGuestPhone(e.target.value)}
            className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-base md:text-sm font-mono text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
          />
          <textarea
            rows={2}
            placeholder="Setup requirements, entry timing, catering notes…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-base md:text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors resize-none"
          />
        </div>
      </div>

      {/* 9. On-Screen Estimate Breakdown (Zero Client-Side Math) */}
      <div aria-live="polite" className="space-y-3 pt-2 border-t border-border/60">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground font-mono">
            Estimated venue quote
          </span>
          {isCalculatingQuote && <Loader2 className="size-3 animate-spin text-primary shrink-0" />}
        </div>

        {quoteError ? (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-200">
            {quoteError}
          </div>
        ) : quote ? (
          <div className="p-3.5 rounded-xl bg-surface-subtle border border-border/70 space-y-2.5 font-mono text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <span>Matched slab:</span>
                {quote.matchedSlab.isFloorApplied && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded">
                    Floor applied
                  </span>
                )}
              </span>
              <span className="font-semibold text-foreground tabular-nums">
                {quote.matchedSlab.minHeadcount}–{quote.matchedSlab.maxHeadcount}&nbsp;Pax
              </span>
            </div>

            {quote.appliedModifier && (
              <div className="flex items-center justify-between gap-2 text-[11px] text-primary">
                <span>{quote.appliedModifier.name}:</span>
                <span className="font-bold tabular-nums">
                  {quote.appliedModifier.percentage > 0 ? "+" : ""}
                  {quote.appliedModifier.percentage}%
                </span>
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Estimated venue rent:</span>
              <span className="font-bold text-foreground text-sm tabular-nums">
                ₹&nbsp;{Math.round(quote.totalVenueRent).toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Required booking advance:</span>
              <span className="font-bold text-primary tabular-nums">
                ₹&nbsp;{Math.round(quote.requiredAdvance).toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
              <span className="text-muted-foreground">Balance due at event:</span>
              <span className="font-bold text-foreground tabular-nums">
                ₹&nbsp;{Math.round(quote.remainingBalance).toLocaleString("en-IN")}
              </span>
            </div>

            {quote.attachedDomeRequested && (
              <div className="text-[11px] text-muted-foreground pt-1.5 border-t border-border/40 font-sans flex items-center justify-between">
                <span>Attached Dome status:</span>
                <span className="font-semibold text-foreground">
                  {quote.attachedDomeStatus === "COMPLIMENTARY" ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                      Complimentary (₹&nbsp;0)
                    </span>
                  ) : (
                    <span className="text-primary font-mono">On Request</span>
                  )}
                </span>
              </div>
            )}

            <div className="text-[10px] text-muted-foreground font-sans pt-1">
              On-screen estimate only. Official quote and payment details confirmed directly via WhatsApp.
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-surface-subtle border border-border/60 text-xs text-muted-foreground font-mono">
            Enter headcount to view authoritative slab quote…
          </div>
        )}
      </div>

      {/* 10. Primary CTA Routing to Price-Free WhatsApp Link */}
      <div className="space-y-2 pt-1">
        <Button
          type="button"
          onClick={handleVerifyViaWhatsApp}
          disabled={isCalculatingQuote || !quote?.whatsappUrl || isSlotAvailable === false}
          variant="whatsapp"
          className="w-full h-12 text-sm font-bold active:scale-[0.98] transition-transform duration-100 ease-[var(--ease-snappy)] select-none shadow-sm cursor-pointer"
        >
          <SocialIcons.whatsapp className="size-4 shrink-0 fill-current" />
          <span>
            {isSlotAvailable === false ? "Slot Reserved for Selected Date" : "Verify via WhatsApp"}
          </span>
        </Button>
      </div>
    </div>
  );
}

export default HallInquiryEngine;
