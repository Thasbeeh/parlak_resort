import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Users, ArrowRight, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CatalogUnitItem } from "./types";

export interface UnitCardItemProps {
  unit: CatalogUnitItem;
  className?: string;
}

/**
 * UnitCardItem - Architectural Inventory Plate for Stays & Venues
 * 
 * Enforces:
 * 1. Container Queries: Card wrapper declares `container-type: inline-size` (`@container`)
 *    allowing internal metrics and CTAs to adapt seamlessly to 1-col, 2-col, or 3-col grids.
 * 2. Visual Invariants: Cover photo aperture (aspect 16/10 rounded-xl border), category badge,
 *    capacity badge, base rate with non-breaking spaces and font-mono tabular-nums.
 * 3. Safari WebKit Invariants: min-w-0 on flex children to prevent text blowout, shrink-0 on badges.
 * 4. Emil Kowalski Tactile Compression: active:scale-[0.98] on interactive elements.
 */
export function UnitCardItem({ unit, className }: UnitCardItemProps) {
  const isAvailable = unit.isActive && unit.status === "AVAILABLE";

  return (
    <article
      data-unit-id={unit.id}
      data-category={unit.category}
      className={cn(
        "@container [container-type:inline-size] group rounded-2xl border border-border/80 bg-card overflow-hidden flex flex-col justify-between transition-[transform,box-shadow,border-color] duration-200 ease-snappy hover-lift hover:shadow-lg min-w-0 w-full",
        className
      )}
    >
      {/* Top Media Aperture Container */}
      <div className="p-3 sm:p-4 pb-0 min-w-0">
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-border/60 bg-surface-subtle shrink-0">
          <Image
            src={unit.featuredPhoto.url || "https://res.cloudinary.com/parlak-resort/image/upload/v1/units/dome_main.webp"}
            alt={unit.featuredPhoto.alt}
            fill
            sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80 pointer-events-none" />

          {/* Floating Category Badge */}
          <div className="absolute top-2.5 left-2.5 pointer-events-none min-w-0">
            <span className="text-[11px] font-semibold text-white/95 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full uppercase tracking-wider font-mono shrink-0 shadow-xs select-none">
              {unit.categoryLabel}
            </span>
          </div>

          {/* Promotional Tag Chip if Available and Active */}
          {unit.badge && isAvailable && (
            <div className="absolute bottom-2.5 left-2.5 pointer-events-none">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white/95 bg-primary/85 backdrop-blur-md px-2.5 py-0.5 rounded-full shadow-xs font-mono">
                <Sparkles className="size-3 shrink-0" />
                <span>{unit.badge}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between gap-5 min-w-0">
        <div className="space-y-3 min-w-0">
          {/* Unit Name in Fraunces */}
          <h3 className="font-serif text-2xl font-medium text-foreground tracking-tight group-hover:text-primary transition-colors duration-150 min-w-0 truncate">
            {unit.name}
          </h3>

          {/* Capacity Chip */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono min-w-0">
            <span className="inline-flex items-center gap-1.5 bg-surface-subtle px-2.5 py-1 rounded-md border border-border/40 text-foreground shrink-0">
              <Users className="size-3.5 text-primary shrink-0" />
              <span className="tabular-nums">{unit.capacityBadge}</span>
            </span>
          </div>

          {/* Amenities Summary Chips */}
          <div className="flex flex-wrap gap-1.5 pt-1 min-w-0">
            {unit.amenitiesSummary.slice(0, 4).map((amenity) => (
              <span
                key={amenity}
                className="text-[11px] px-2.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium shrink-0 truncate max-w-[200px]"
              >
                {amenity}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom Price & Action Footer */}
        <div className="pt-4 border-t border-border/60 flex flex-col @[360px]:flex-row @[360px]:items-end justify-between gap-3 min-w-0">
          <div className="min-w-0">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-mono font-medium">
              Starting from
            </span>
            <div className="flex flex-wrap items-baseline gap-1.5 min-w-0">
              <span className="font-mono tabular-nums text-2xl font-bold text-foreground">
                ₹&nbsp;{unit.pricing.displayRate.toLocaleString("en-IN")}
              </span>
              <span className="text-xs text-muted-foreground font-normal shrink-0">
                {unit.pricing.rateLabel}
              </span>
            </div>
          </div>

          {/* CTA Action with Tactile Compression */}
          {isAvailable ? (
            <Link
              href={unit.detailRoute}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "w-full @[360px]:w-auto rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap active:scale-[0.98] transition-transform duration-100 ease-snappy select-none border-border/80 shrink-0 group/btn inline-flex items-center justify-center gap-1.5"
              )}
            >
              <span>{unit.ctaText}</span>
              <ArrowRight className="size-3.5 group-hover/btn:translate-x-0.5 transition-transform shrink-0" />
            </Link>
          ) : (
            <span
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "w-full @[360px]:w-auto rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap select-none border-border/60 shrink-0 opacity-60 cursor-not-allowed inline-flex items-center justify-center"
              )}
            >
              <span>{unit.ctaText}</span>
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export default UnitCardItem;
