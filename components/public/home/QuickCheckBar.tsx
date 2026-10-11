"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronDown } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getISTDateString, addDaysToISTDate } from "@/lib/date-utils";

export interface QuickCheckBarProps {
  className?: string;
}

/**
 * QuickCheckBar - Flush Architectural Availability Console
 * 
 * Enforces (AGENTS.md & Emil Kowalski standards):
 * 1. Proportional Console Layout: Dedicated flex segments + 1px hairline dividers; eliminates guest count truncation.
 * 2. Decorative Icon Stripping: Clean, top-aligned text labels with natural sentence case (no icon clutter).
 * 3. Typographic Restraint: Natural sentence case, tabular numerals (font-mono tabular-nums), non-breaking spaces.
 * 4. Mobile WebKit Zoom Prevention: Inputs compute to >= 16px on mobile (text-base md:text-sm).
 * 5. Emil Kowalski Tactile Physics: active:scale-[0.98] with snappy bezier curves.
 * 6. IST Timezone Awareness: Evaluates dates strictly against Asia/Kolkata.
 */
export function QuickCheckBar({ className }: QuickCheckBarProps) {
  const router = useRouter();

  // Initialize dates strictly in Asia/Kolkata (IST)
  const todayStr = React.useMemo(() => getISTDateString(new Date()), []);
  const defaultCheckIn = React.useMemo(() => addDaysToISTDate(todayStr, 1), [todayStr]);
  const defaultCheckOut = React.useMemo(() => addDaysToISTDate(todayStr, 2), [todayStr]);

  const [category, setCategory] = React.useState<string>("ALL");
  const [checkIn, setCheckIn] = React.useState<string>(defaultCheckIn);
  const [checkOut, setCheckOut] = React.useState<string>(defaultCheckOut);
  const [guests, setGuests] = React.useState<string>("2");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (category && category !== "ALL") {
      params.set("category", category);
    }
    if (category === "DOMES" || category === "A_FRAMES") {
      params.set("stayType", "OVERNIGHT");
    }
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    if (guests) params.set("guests", guests);

    router.push(`/stays?${params.toString()}`);
  };

  return (
    <form
      onSubmit={handleSearch}
      aria-label="Availability check"
      className={cn(
        "w-full bg-card/95 backdrop-blur-md border border-border/80 rounded-2xl shadow-xl p-2 sm:p-2.5 lg:p-2 transition-all duration-150",
        className
      )}
    >
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:flex lg:items-center gap-2 sm:gap-2.5 lg:gap-0">
        {/* Segment 1: Category Selection */}
        <div className="col-span-2 sm:col-span-2 lg:col-span-1 lg:flex-[1.25] lg:min-w-0 flex flex-col justify-center rounded-xl px-3.5 py-2 sm:py-2.5 hover:bg-muted/40 transition-colors duration-150">
          <label
            htmlFor="quick-check-category"
            className="block text-xs font-medium text-muted-foreground select-none mb-1"
          >
            Accommodation
          </label>
          <div className="relative flex items-center">
            <select
              id="quick-check-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="appearance-none [-webkit-appearance:none] w-full bg-transparent text-base md:text-sm font-medium text-foreground pr-7 focus:outline-none cursor-pointer truncate"
            >
              <option value="ALL" className="bg-card text-foreground">All stays &amp; venues</option>
              <option value="DOMES" className="bg-card text-foreground">Luxury geodesic domes (Max&nbsp;3)</option>
              <option value="A_FRAMES" className="bg-card text-foreground">Scenic A-frames (Max&nbsp;5)</option>
              <option value="EVENT_HALLS" className="bg-card text-foreground">Grand event halls (Max&nbsp;1,200)</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-1.5 size-4 text-muted-foreground/80 shrink-0" />
          </div>
        </div>

        {/* Hairline Divider 1 */}
        <div className="hidden lg:block w-px h-8 bg-border/60 shrink-0 self-center mx-1" aria-hidden="true" />

        {/* Segment 2: Check-in Date */}
        <div className="col-span-1 lg:flex-1 lg:min-w-0 flex flex-col justify-center rounded-xl px-3.5 py-2 sm:py-2.5 hover:bg-muted/40 transition-colors duration-150">
          <label
            htmlFor="quick-check-in"
            className="block text-xs font-medium text-muted-foreground select-none mb-1"
          >
            Check-in date
          </label>
          <div className="relative flex items-center">
            <input
              id="quick-check-in"
              type="date"
              min={todayStr}
              value={checkIn}
              onChange={(e) => {
                const newCheckIn = e.target.value;
                setCheckIn(newCheckIn);
                if (newCheckIn && (!checkOut || newCheckIn >= checkOut)) {
                  setCheckOut(addDaysToISTDate(newCheckIn, 1));
                }
              }}
              onClick={(e) => {
                try {
                  e.currentTarget.showPicker?.();
                } catch {}
              }}
              className="appearance-none [-webkit-appearance:none] w-full bg-transparent text-base md:text-sm font-mono tabular-nums font-medium text-foreground focus:outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-90 dark:[&::-webkit-calendar-picker-indicator]:invert"
            />
          </div>
        </div>

        {/* Hairline Divider 2 */}
        <div className="hidden lg:block w-px h-8 bg-border/60 shrink-0 self-center mx-1" aria-hidden="true" />

        {/* Segment 3: Check-out Date */}
        <div className="col-span-1 lg:flex-1 lg:min-w-0 flex flex-col justify-center rounded-xl px-3.5 py-2 sm:py-2.5 hover:bg-muted/40 transition-colors duration-150">
          <label
            htmlFor="quick-check-out"
            className="block text-xs font-medium text-muted-foreground select-none mb-1"
          >
            Check-out date
          </label>
          <div className="relative flex items-center">
            <input
              id="quick-check-out"
              type="date"
              min={checkIn ? addDaysToISTDate(checkIn, 1) : addDaysToISTDate(todayStr, 1)}
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              onClick={(e) => {
                try {
                  e.currentTarget.showPicker?.();
                } catch {}
              }}
              className="appearance-none [-webkit-appearance:none] w-full bg-transparent text-base md:text-sm font-mono tabular-nums font-medium text-foreground focus:outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-90 dark:[&::-webkit-calendar-picker-indicator]:invert"
            />
          </div>
        </div>

        {/* Hairline Divider 3 */}
        <div className="hidden lg:block w-px h-8 bg-border/60 shrink-0 self-center mx-1" aria-hidden="true" />

        {/* Segment 4: Guests */}
        <div className="col-span-2 sm:col-span-1 lg:flex-1 lg:min-w-0 flex flex-col justify-center rounded-xl px-3.5 py-2 sm:py-2.5 hover:bg-muted/40 transition-colors duration-150">
          <label
            htmlFor="quick-check-guests"
            className="block text-xs font-medium text-muted-foreground select-none mb-1"
          >
            Guests
          </label>
          <div className="relative flex items-center">
            <select
              id="quick-check-guests"
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
              className="appearance-none [-webkit-appearance:none] w-full bg-transparent text-base md:text-sm font-medium text-foreground pr-7 focus:outline-none cursor-pointer truncate"
            >
              <option value="1" className="bg-card text-foreground">1&nbsp;Adult</option>
              <option value="2" className="bg-card text-foreground">2&nbsp;Adults</option>
              <option value="3" className="bg-card text-foreground">3&nbsp;Adults (Dome max)</option>
              <option value="4" className="bg-card text-foreground">4&nbsp;Adults</option>
              <option value="5" className="bg-card text-foreground">5&nbsp;Adults (A-Frame max)</option>
              <option value="6" className="bg-card text-foreground">6+&nbsp;Adults (Multi-unit)</option>
              <option value="50" className="bg-card text-foreground">50+&nbsp;Pax (Event hall)</option>
              <option value="100" className="bg-card text-foreground">100+&nbsp;Pax (Event hall)</option>
              <option value="400" className="bg-card text-foreground">400+&nbsp;Pax (Grand event)</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-1.5 size-4 text-muted-foreground/80 shrink-0" />
          </div>
        </div>

        {/* Segment 5: Search Action */}
        <div className="col-span-2 sm:col-span-1 lg:flex-none p-1 lg:p-0 lg:pl-2 flex items-end sm:self-end lg:self-center">
          <button
            type="submit"
            className={cn(
              buttonVariants({ variant: "primary", size: "default" }),
              "h-12 w-full lg:w-auto px-6 rounded-xl font-semibold shadow-md active:scale-[0.98] transition-transform duration-100 ease-[var(--ease-snappy)] select-none shrink-0 inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/95 text-primary-foreground text-sm cursor-pointer"
            )}
          >
            <Search className="size-4 shrink-0" />
            <span className="whitespace-nowrap">Check availability</span>
          </button>
        </div>
      </div>
    </form>
  );
}

export default QuickCheckBar;
