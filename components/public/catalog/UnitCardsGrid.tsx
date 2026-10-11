import * as React from "react";
import { Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UnitCardItem } from "./UnitCardItem";
import type { CatalogUnitItem } from "./types";

export interface UnitCardsGridProps {
  units: CatalogUnitItem[];
  className?: string;
  onResetFilter?: () => void;
}

/**
 * UnitCardsGrid - Responsive 3-column / 2-column / 1-column Stays & Venues Matrix
 * 
 * Enforces:
 * 1. Responsive Layout: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6.
 * 2. WebKit Layout Invariant: min-w-0 on grid container and cell items.
 * 3. Resilient Empty State: Preserves structure with high-contrast feedback.
 */
export function UnitCardsGrid({
  units,
  className,
  onResetFilter,
}: UnitCardsGridProps) {
  if (!units || units.length === 0) {
    return (
      <div className="col-span-full py-16 px-4 text-center border border-dashed border-border/80 rounded-2xl bg-surface-subtle/50 my-4 min-w-0 w-full">
        <div className="size-10 rounded-full bg-surface-subtle border border-border/60 mx-auto flex items-center justify-center text-muted-foreground mb-3">
          <Sparkles className="size-5 text-primary" />
        </div>
        <h3 className="font-serif text-lg font-medium text-foreground">
          No stays or venues found in this category
        </h3>
        <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
          We couldn&apos;t find any active units matching this category filter. Try viewing all stays or select a different category.
        </p>
        {onResetFilter && (
          <button
            type="button"
            onClick={onResetFilter}
            className={cn(
              buttonVariants({ variant: "primary", size: "sm" }),
              "mt-4 active:scale-[0.98] transition-transform duration-100 ease-[var(--ease-snappy)] select-none cursor-pointer"
            )}
          >
            View all stays &amp; venues
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      aria-label="Stays and Venues Catalog"
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full min-w-0",
        className
      )}
    >
      {units.map((unit) => (
        <UnitCardItem key={unit.id} unit={unit} />
      ))}
    </div>
  );
}

export default UnitCardsGrid;
