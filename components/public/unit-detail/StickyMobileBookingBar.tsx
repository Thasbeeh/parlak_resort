"use client";

import * as React from "react";
import { ArrowUp, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface StickyMobileBookingBarProps {
  unitName: string;
  categoryLabel: string;
  startingRate: number;
  rateLabel?: string;
  targetElementId?: string;
  className?: string;
}

/**
 * StickyMobileBookingBar - Mobile Bottom Pill CTA
 * 
 * Enforces:
 * 1. Safe Area Insets: Anchored to viewport bottom with `padding-bottom: env(safe-area-inset-bottom)`
 *    to avoid overlap with iPhone home indicator bar (per mobile-native skill).
 * 2. Visual Density: Displays Unit Category/Name, starting rate with non-breaking spaces,
 *    and a high-contrast action CTA.
 * 3. Smooth Scroll: Clicking "Check Dates & Book" smoothly scrolls the viewport to the booking card.
 * 4. Emil Kowalski Tactile Compression: Buttons feature `active:scale-[0.98]`.
 */
export function StickyMobileBookingBar({
  unitName,
  categoryLabel,
  startingRate,
  rateLabel = "/\u00A0night",
  targetElementId = "booking-card",
  className,
}: StickyMobileBookingBarProps) {
  const [isVisible, setIsVisible] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const targetEl = document.getElementById(targetElementId);

      if (!targetEl) {
        setIsVisible(scrollY > 200);
        return;
      }

      const rect = targetEl.getBoundingClientRect();
      const isTargetInView = rect.top < window.innerHeight && rect.bottom > 0;

      // Show when scrolled past initial hero (> 200px) AND booking engine is NOT already in view
      setIsVisible(scrollY > 200 && !isTargetInView);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [targetElementId]);

  // Smooth scroll handler targeting the interactive booking engine
  const handleScrollToBooking = React.useCallback(() => {
    const el = document.getElementById(targetElementId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      // Focus first input for accessibility
      const firstInput = el.querySelector<HTMLInputElement | HTMLButtonElement>(
        "input, button, select"
      );
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 400);
      }
    }
  }, [targetElementId]);

  return (
    <aside
      aria-label="Mobile booking action bar"
      className={cn(
        "fixed bottom-0 inset-x-0 z-40 md:hidden pointer-events-none",
        "px-4 pb-[calc(0.875rem+env(safe-area-inset-bottom))] pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))]",
        "transition-all duration-300 ease-[var(--ease-snappy)]",
        isVisible
          ? "translate-y-0 opacity-100 visible pointer-events-auto"
          : "translate-y-[calc(100%+3rem)] opacity-0 invisible pointer-events-none",
        className
      )}
    >
      <div className="pointer-events-auto flex items-center justify-between gap-3 max-w-lg mx-auto min-w-0 bg-background/95 dark:bg-card/95 backdrop-blur-md border border-border/80 rounded-2xl shadow-xl p-3.5 px-4">
        {/* Rate & Category Label */}
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block truncate">
            {categoryLabel}
          </span>
          <div className="flex items-baseline gap-1 min-w-0">
            <span className="font-mono tabular-nums text-base sm:text-lg font-bold text-foreground">
              ₹&nbsp;{startingRate.toLocaleString("en-IN")}
            </span>
            <span className="text-xs text-muted-foreground font-normal shrink-0">
              {rateLabel}
            </span>
          </div>
        </div>

        {/* Primary Action Button */}
        <Button
          type="button"
          onClick={handleScrollToBooking}
          size="sm"
          className="h-10 px-4 text-xs font-bold active:scale-[0.98] transition-transform duration-100 ease-[var(--ease-snappy)] select-none shrink-0"
        >
          <Calendar className="size-3.5 shrink-0" />
          <span>Check Dates &amp; Book</span>
        </Button>
      </div>
    </aside>
  );
}

export default StickyMobileBookingBar;
