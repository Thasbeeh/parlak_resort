"use client";

import * as React from "react";
import {
  Clock,
  Utensils,
  Waves,
  CreditCard,
  AlertCircle,
  FileText,
  CalendarCheck,
} from "lucide-react";
import { SITE_CONFIG } from "@/lib/constants";
import { CancellationModal } from "@/components/public/contact/CancellationModal";

export interface OperationalPoliciesCardProps {
  timings?: {
    overnightCheckIn?: string;
    overnightCheckOut?: string;
    daySlotCheckIn?: string;
    daySlotCheckOut?: string;
    diningUntil?: string;
    poolUntil?: string;
  };
  cancellationPolicyText?: string;
}

export function OperationalPoliciesCard({
  timings,
  cancellationPolicyText,
}: OperationalPoliciesCardProps) {
  const overnightIn =
    timings?.overnightCheckIn || SITE_CONFIG.policies.timings.overnight.checkIn;
  const overnightOut =
    timings?.overnightCheckOut ||
    SITE_CONFIG.policies.timings.overnight.checkOut;
  const daySlotIn =
    timings?.daySlotCheckIn || SITE_CONFIG.policies.timings.daySlot.checkIn;
  const daySlotOut =
    timings?.daySlotCheckOut || SITE_CONFIG.policies.timings.daySlot.checkOut;
  const diningUntil =
    timings?.diningUntil ||
    SITE_CONFIG.policies.timings.dining.menuAvailableUntil;
  const poolUntil = timings?.poolUntil || "10:00 PM IST";

  return (
    <section aria-labelledby="policies-heading" className="w-full space-y-6">
      {/* Section Header */}
      <div>
        <span className="text-primary font-malayalam text-xs font-semibold tracking-wider select-none">
          ഭയം വേണ്ട, ജാഗ്രത മതി
        </span>
        <h2
          id="policies-heading"
          className="text-foreground mt-1 font-serif text-2xl tracking-tight sm:text-3xl"
        >
          Resort policies &amp; guest guidelines
        </h2>
        <p className="text-muted-foreground mt-1.5 max-w-2xl text-xs leading-relaxed sm:text-sm">
          Clear operating windows, resident pool exclusivity rules, and
          transparent reservation terms designed to guarantee peaceful stays for
          all residents.
        </p>
      </div>

      {/* Main Container with 1px Hairline Structural Grid */}
      <div className="border-border/60 bg-card divide-border/60 divide-y overflow-hidden rounded-xl border shadow-xs">
        {/* Tier 1: Operating Timings Matrix */}
        <div className="space-y-4 p-6">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full">
              <Clock className="size-4" />
            </div>
            <div>
              <h3 className="text-foreground font-sans text-sm font-semibold">
                Operating shift timings
              </h3>
              <p className="text-muted-foreground text-xs">
                Strict check-in and check-out windows enforced across all
                inventory categories
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-3">
            {/* Overnight */}
            <div className="bg-surface-subtle border-border/50 space-y-1 rounded-lg border p-3.5">
              <span className="text-muted-foreground block font-sans text-xs font-medium">
                Standard overnight stay
              </span>
              <p className="text-foreground font-mono text-sm font-semibold tabular-nums">
                {overnightIn} – {overnightOut}
              </p>
              <p className="text-muted-foreground text-[11px]">
                Check-in 12:00&nbsp;PM IST – Check-out 11:00&nbsp;AM IST next
                day
              </p>
            </div>

            {/* Day Slot */}
            <div className="bg-surface-subtle border-border/50 space-y-1 rounded-lg border p-3.5">
              <span className="text-muted-foreground block font-sans text-xs font-medium">
                Day slot stay
              </span>
              <p className="text-foreground font-mono text-sm font-semibold tabular-nums">
                {daySlotIn} – {daySlotOut}
              </p>
              <p className="text-muted-foreground text-[11px]">
                Same-day occupancy strictly between 10:00&nbsp;AM and
                3:00&nbsp;PM IST
              </p>
            </div>

            {/* Event Hall Slots */}
            <div className="bg-surface-subtle border-border/50 space-y-1 rounded-lg border p-3.5">
              <span className="text-muted-foreground block font-sans text-xs font-medium">
                Event hall sessions
              </span>
              <p className="text-foreground font-mono text-xs font-semibold tabular-nums">
                Morning: 10:00&nbsp;AM – 3:00&nbsp;PM
                <br />
                Evening: 5:00&nbsp;PM – 10:00&nbsp;PM
              </p>
              <p className="text-muted-foreground text-[11px]">
                Sanitized turnaround windows enforced between sessions
              </p>
            </div>
          </div>
        </div>

        {/* Tier 2: Dining & Swimming Pool Exclusivity */}
        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
          {/* Dining Policies */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="bg-surface-subtle border-border/60 text-foreground flex size-9 shrink-0 items-center justify-center rounded-full border">
                <Utensils className="size-4" />
              </div>
              <h3 className="text-foreground font-sans text-sm font-semibold">
                Dining &amp; kitchen services
              </h3>
            </div>
            <ul className="text-muted-foreground space-y-2 text-xs leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full" />
                <span>
                  <strong className="text-foreground">
                    Restaurant kitchen service:
                  </strong>{" "}
                  Menu orders and dining room table service available until{" "}
                  <span className="text-foreground font-mono tabular-nums">
                    {diningUntil}
                  </span>
                  .
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full" />
                <span>
                  <strong className="text-foreground">Catering policy:</strong>{" "}
                  Outside food and external catering are strictly restricted to
                  private Event Hall bookings.
                </span>
              </li>
            </ul>
          </div>

          {/* Swimming Pool Exclusivity */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="bg-surface-subtle border-border/60 text-foreground flex size-9 shrink-0 items-center justify-center rounded-full border">
                <Waves className="size-4" />
              </div>
              <h3 className="text-foreground font-sans text-sm font-semibold">
                Swimming pool resident access
              </h3>
            </div>
            <ul className="text-muted-foreground space-y-2 text-xs leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-600 dark:text-emerald-400" />
                <span>
                  <strong className="text-foreground">
                    Resident exclusivity:
                  </strong>{" "}
                  Open exclusively for Dome and A-Frame residents until{" "}
                  <span className="text-foreground font-mono tabular-nums">
                    {poolUntil}
                  </span>
                  .
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-600 dark:text-amber-400" />
                <span>
                  <strong className="text-foreground">Event days:</strong> Pool
                  closes during public event sessions. Overnight stay residents
                  receive exclusive late-night access from{" "}
                  <span className="text-foreground font-mono tabular-nums">
                    10:00&nbsp;PM to 11:00&nbsp;PM IST
                  </span>
                  .
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-destructive mt-1.5 size-1.5 shrink-0 rounded-full" />
                <span>
                  <strong className="text-destructive font-semibold">
                    Strict boundary:
                  </strong>{" "}
                  Event Hall attendees are strictly forbidden from entering or
                  using the swimming pool under all circumstances.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Tier 3: Booking Advance, Tariff Locking & Scope Modifications */}
        <div className="space-y-4 p-6">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full">
              <CreditCard className="size-4" />
            </div>
            <div>
              <h3 className="text-foreground font-sans text-sm font-semibold">
                Booking advance &amp; scope adjustment policy
              </h3>
              <p className="text-muted-foreground text-xs">
                Universal baseline pricing standards and reservation
                modification rules
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 pt-1 text-xs md:grid-cols-3">
            {/* Advance Payment */}
            <div className="bg-surface-subtle border-border/50 space-y-1.5 rounded-lg border p-3.5">
              <div className="text-foreground flex items-center gap-1.5 font-semibold">
                <CalendarCheck className="text-primary size-3.5 shrink-0" />
                <span>Advance payment mandate</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Dynamic booking advance configured per Price List slab,
                collected at booking confirmation and credited directly towards
                total rent (non-refundable; security deposits are strictly not
                tracked or collected).
              </p>
            </div>

            {/* Flat Baseline Blocks */}
            <div className="bg-surface-subtle border-border/50 space-y-1.5 rounded-lg border p-3.5">
              <div className="text-foreground flex items-center gap-1.5 font-semibold">
                <Clock className="text-primary size-3.5 shrink-0" />
                <span>Flat baseline blocks</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Standard packages are billed as flat baseline blocks. Shortening
                fractional hours or checking out early yields no rate deduction.
                Confirmed bookings preserve agreed contracted rates.
              </p>
            </div>

            {/* Scope Reductions */}
            <div className="bg-surface-subtle border-border/50 space-y-1.5 rounded-lg border p-3.5">
              <div className="text-foreground flex items-center gap-1.5 font-semibold">
                <AlertCircle className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>Scope reductions</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Any reduction in scope (fewer nights, dropped slots, or lower
                headcount slabs) acts strictly as a Partial Cancellation with no
                automated refunds; adjustments require Admin manual review.
              </p>
            </div>
          </div>
        </div>

        {/* Tier 4: Dynamic Cancellation Modal Bar */}
        <div className="bg-surface-subtle/40 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileText className="text-primary size-4 shrink-0" />
              <h4 className="text-foreground font-sans text-sm font-semibold">
                Cancellation &amp; refund guidelines
              </h4>
            </div>
            <p className="text-muted-foreground text-xs">
              Review authoritative management review processes, advance
              forfeitures, and cancellation instructions.
            </p>
          </div>

          <div className="shrink-0">
            <CancellationModal
              policyText={cancellationPolicyText}
              trigger={
                <button
                  type="button"
                  className="border-border bg-card hover:bg-surface-subtle text-foreground inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-semibold shadow-xs transition-transform duration-100 ease-[var(--ease-snappy)] select-none active:scale-[0.98]"
                >
                  <FileText className="text-primary size-3.5 shrink-0" />
                  <span>View cancellation policy</span>
                </button>
              }
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default OperationalPoliciesCard;
