import * as React from "react";
import { Palmtree, Waves, Wifi, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";

interface AmenityItem {
  icon: React.ElementType;
  title: string;
  description: string;
}

const RESORT_AMENITIES: AmenityItem[] = [
  {
    icon: Palmtree,
    title: "Lush greenery",
    description: "Coconut groves and tranquil tropical gardens overlooking open meadows",
  },
  {
    icon: Waves,
    title: "Designer pool",
    description: "Exclusive resident swimming access till 10:00\u00A0PM daily",
  },
  {
    icon: Wifi,
    title: "High-speed Wi-Fi",
    description: "Seamless wireless connectivity across all domes and chalets",
  },
  {
    icon: UtensilsCrossed,
    title: "Food services till 10:30\u00A0PM",
    description: "Fresh kitchen menu and room service available till 10:30\u00A0PM",
  },
];

export interface AmenitiesStripProps {
  className?: string;
}

/**
 * AmenitiesStrip - Continuous Structural Architectural Ribbon
 * 
 * Enforces:
 * 1. Single Canvas Architecture: Continuous ribbon with 1px vertical structural hairline dividers (divide-x).
 * 2. Zero Card Soup: Eliminates isolated floating card boxes.
 * 3. Deep River Moss Accents: Tactile icon apertures with refined typographic hierarchy.
 */
export function AmenitiesStrip({ className }: AmenitiesStripProps) {
  return (
    <section
      aria-label="Resort Amenities"
      className={cn(
        "py-10 sm:py-14 border-y border-border/60 bg-surface-subtle/40 content-visibility-auto select-none",
        className
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border/60 border border-border/60 rounded-2xl bg-card/60 backdrop-blur-xs overflow-hidden">
          {RESORT_AMENITIES.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="flex items-start gap-4 p-5 sm:p-6 transition-colors duration-150 hover:bg-surface-subtle/80"
              >
                <div className="shrink-0 size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                  <Icon className="size-5 shrink-0" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default AmenitiesStrip;
