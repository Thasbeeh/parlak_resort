"use client";

import * as React from "react";
import { Sparkles, MessageCircle, X } from "lucide-react";
import { buildWhatsAppUrl } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface SeasonalPromotion {
  id: string;
  name: string;
  percentage: number;
  startDate: Date | string;
  endDate: Date | string;
  description?: string;
}

export interface PromoBannerProps {
  promotion?: SeasonalPromotion | null;
  className?: string;
}

export function PromoBanner({ promotion, className }: PromoBannerProps) {
  const [isDismissed, setIsDismissed] = React.useState(false);

  if (!promotion || isDismissed) {
    return null;
  }

  const endFormatted = React.useMemo(() => {
    try {
      const d = new Date(promotion.endDate);
      return d.toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      });
    } catch {
      return null;
    }
  }, [promotion.endDate]);

  const discountText =
    promotion.percentage < 0
      ? `${Math.abs(promotion.percentage)}%\u00A0off`
      : promotion.percentage > 0
        ? `Seasonal offer (${promotion.percentage}%)`
        : "Special seasonal offer";

  const inquiryUrl = buildWhatsAppUrl(
    `Hi Parlak Resort, I would like to inquire about the ${promotion.name} seasonal promotion.`
  );

  return (
    <aside
      aria-label="Seasonal Promotion"
      className={cn(
        "relative z-30 w-full bg-primary text-primary-foreground border-b border-primary/20 px-4 py-2.5 sm:py-3 transition-all duration-150 ease-[var(--ease-snappy)]",
        className
      )}
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4 text-xs sm:text-sm">
        {/* Promotion Message */}
        <div className="flex items-center gap-2.5 text-center sm:text-left min-w-0">
          <span className="shrink-0 inline-flex items-center justify-center size-6 rounded-full bg-primary-foreground/15 text-primary-foreground">
            <Sparkles className="size-3.5" />
          </span>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-semibold tracking-tight">{promotion.name}</span>
            <span className="hidden sm:inline text-primary-foreground/60">•</span>
            <span className="font-mono tabular-nums text-xs font-medium bg-primary-foreground/20 px-2 py-0.5 rounded text-primary-foreground">
              {discountText}
            </span>
            {endFormatted && (
              <span className="text-xs text-primary-foreground/80 font-mono tabular-nums">
                Valid until {endFormatted}
              </span>
            )}
          </div>
        </div>

        {/* CTA & Dismiss */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={inquiryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-foreground text-primary font-medium text-xs hover:bg-primary-foreground/90 active:scale-[0.98] transition-transform duration-100 ease-[var(--ease-snappy)] select-none shadow-xs"
          >
            <MessageCircle className="size-3.5" />
            <span>Verify via WhatsApp</span>
          </a>
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            aria-label="Dismiss promotional banner"
            className="size-7 rounded-full inline-flex items-center justify-center text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 active:scale-95 transition-transform duration-100 ease-[var(--ease-snappy)] select-none"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

export default PromoBanner;
