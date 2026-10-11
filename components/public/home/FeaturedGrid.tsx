import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Users, Bed, Sparkles, ArrowRight, Calendar } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FeaturedUnitItem {
  id: string;
  slug: string;
  name: string;
  category: "DOME" | "A_FRAME" | "NON_AC_HALL" | "AC_HALL" | string;
  categoryLabel: string;
  tag?: string;
  capacityBadge: string;
  beddingInfo?: string;
  startingPrice: number;
  priceUnit: "/ night" | "/ slot";
  photoUrl: string;
  photoAlt: string;
  amenities: string[];
  ctaRoute: string;
}

export const DEFAULT_FEATURED_UNITS: FeaturedUnitItem[] = [
  {
    id: "unit-dome-featured",
    slug: "geodesic-dome",
    name: "Luxury Geodesic Dome",
    category: "DOME",
    categoryLabel: "Geodesic Dome",
    tag: "Popular stay",
    capacityBadge: "Up to 3 Adults (Strict Cap)",
    beddingInfo: "1 King Bed • Stargazing skylight",
    startingPrice: 3500,
    priceUnit: "/ night",
    photoUrl:
      "https://res.cloudinary.com/parlak-resort/image/upload/v1/units/dome_featured.webp",
    photoAlt:
      "Panoramic window view of Geodesic Dome at night with warm interior lighting",
    amenities: [
      "AC",
      "Wi-Fi",
      "Pool Access",
      "Complimentary BBQ Grill Kit",
      "Attached Bath",
    ],
    ctaRoute: "/stays/geodesic-dome",
  },
  {
    id: "unit-aframe-featured",
    slug: "scenic-a-frame",
    name: "Scenic A-Frame Chalet",
    category: "A_FRAME",
    categoryLabel: "A-Frame Chalet",
    tag: "Family suite",
    capacityBadge: "Up to 5 Adults (Strict Cap)",
    beddingInfo: "Double + Queen Beds (Two levels)",
    startingPrice: 5000,
    priceUnit: "/ night",
    photoUrl:
      "https://res.cloudinary.com/parlak-resort/image/upload/v1/units/aframe_featured.webp",
    photoAlt: "Two-level A-Frame chalet nestled in meadow greenery",
    amenities: [
      "Double + Queen Beds",
      "AC",
      "Wi-Fi",
      "Pool Access",
      "Attached Bath",
    ],
    ctaRoute: "/stays/scenic-a-frame",
  },
  {
    id: "unit-hall-featured",
    slug: "non-ac-hall",
    name: "Grand Open-Air Banquet Hall",
    category: "NON_AC_HALL",
    categoryLabel: "Banquet Hall",
    tag: "Grand celebrations",
    capacityBadge: "Up to 1,200 Attendees",
    beddingInfo: "Morning / Evening slots available",
    startingPrice: 10000,
    priceUnit: "/ slot",
    photoUrl:
      "https://res.cloudinary.com/parlak-resort/image/upload/v1/units/hall_featured.webp",
    photoAlt:
      "Spacious open-air banquet hall setup with stage, generator, and lighting",
    amenities: [
      "Presentation Stage",
      "Diesel Generator",
      "Banquet Seating",
      "Pool Access Excluded",
    ],
    ctaRoute: "/stays/non-ac-hall",
  },
];

export interface FeaturedGridProps {
  units?: FeaturedUnitItem[];
  className?: string;
}

/**
 * FeaturedGrid - Architectural Exhibition Gallery for Living Spaces
 *
 * Enforces:
 * 1. Monograph Plate Numbering: Subtle 01, 02, 03 indexing.
 * 2. Tabular Integrity: Monospace rates (font-mono tabular-nums) with non-breaking spaces.
 * 3. 16:10 Photographic Apertures: Smooth 700ms ease-out hover scale.
 * 4. Emil Kowalski Tactile Physics: active:scale-[0.98] with snappy response.
 */
export function FeaturedGrid({
  units = DEFAULT_FEATURED_UNITS,
  className,
}: FeaturedGridProps) {
  const displayUnits = units.length >= 3 ? units : DEFAULT_FEATURED_UNITS;

  return (
    <section
      aria-label="Signature Living Spaces"
      className={cn(
        "content-visibility-auto mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8",
        className,
      )}
    >
      {/* Section Header with Monumental Fraunces */}
      <div className="mb-12 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <span className="text-primary font-malayalam text-xs font-semibold tracking-wider select-none">
            സമാധാനം ആണ് main...
          </span>
          <h2 className="text-foreground mt-2 font-serif text-3xl tracking-tight sm:text-4xl lg:text-5xl">
            Curated Living Spaces
          </h2>
          <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">
            Each space at Parlak Resort is intentionally designed to blend
            pastoral serenity with refined comforts.
          </p>
        </div>
        <Link
          href="/stays"
          className="text-primary hover:text-primary/80 group inline-flex items-center gap-1.5 text-sm font-semibold select-none"
        >
          <span>Explore all inventory</span>
          <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-1" />
        </Link>
      </div>

      {/* 3-Card Exhibition Gallery */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {displayUnits.map((unit, index) => {
          const indexFormatted = String(index + 1).padStart(2, "0");

          return (
            <article
              key={unit.id}
              className="group border-border/80 bg-card hover-lift flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-200 ease-[var(--ease-snappy)] hover:shadow-lg"
            >
              {/* Image Aperture with Aspect Ratio */}
              <div className="bg-surface-subtle relative aspect-[16/10] w-full overflow-hidden">
                <Image
                  src={unit.photoUrl}
                  alt={unit.photoAlt}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                  className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                {/* Index Number & Category Floating Badges */}
                <div className="pointer-events-none absolute top-3 right-3 left-3 flex items-center justify-between">
                  <span className="rounded-full bg-black/60 px-2.5 py-1 font-mono text-[11px] font-semibold tracking-wider text-white/95 uppercase shadow-xs backdrop-blur-md">
                    {indexFormatted}&nbsp;/&nbsp;{unit.categoryLabel}
                  </span>
                  {unit.tag && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/95 px-2.5 py-1 font-mono text-[11px] font-medium text-emerald-950 shadow-xs dark:bg-emerald-950/90 dark:text-emerald-200">
                      <Sparkles className="size-3 shrink-0" />
                      <span>{unit.tag}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Card Content Body */}
              <div className="flex flex-1 flex-col justify-between gap-6 p-6">
                <div className="space-y-3">
                  <h3 className="text-foreground group-hover:text-primary font-serif text-2xl font-medium tracking-tight transition-colors duration-150">
                    {unit.name}
                  </h3>

                  {/* Capacity & Bedding Chips */}
                  <div className="text-muted-foreground flex flex-wrap gap-2 font-mono text-xs">
                    <span className="bg-surface-subtle border-border/40 text-foreground inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1">
                      <Users className="text-primary size-3.5 shrink-0" />
                      <span className="tabular-nums">{unit.capacityBadge}</span>
                    </span>
                    {unit.beddingInfo && (
                      <span className="bg-surface-subtle border-border/40 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1">
                        {unit.category === "NON_AC_HALL" ? (
                          <Calendar className="text-primary size-3.5 shrink-0" />
                        ) : (
                          <Bed className="text-primary size-3.5 shrink-0" />
                        )}
                        <span>{unit.beddingInfo}</span>
                      </span>
                    )}
                  </div>

                  {/* Amenities Badges */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {unit.amenities.slice(0, 4).map((amenity) => (
                      <span
                        key={amenity}
                        className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-[11px] font-medium"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bottom Price & Action Footer */}
                <div className="border-border/60 flex items-center justify-between gap-3 border-t pt-4">
                  <div>
                    <span className="text-muted-foreground block font-mono text-[10px] font-medium tracking-wider uppercase">
                      Starting from
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-foreground font-mono text-2xl font-bold tabular-nums">
                        ₹&nbsp;{unit.startingPrice.toLocaleString("en-IN")}
                      </span>
                      <span className="text-muted-foreground text-xs font-normal">
                        {unit.priceUnit}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={unit.ctaRoute}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "border-border/80 group/btn rounded-lg px-4 py-2 text-xs font-semibold transition-transform duration-100 ease-[var(--ease-snappy)] select-none active:scale-[0.98]",
                    )}
                  >
                    <span>View details</span>
                    <ArrowRight className="size-3 shrink-0 transition-transform group-hover/btn:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default FeaturedGrid;
