import * as React from "react";
import {
  Mic2,
  Zap,
  Users,
  Wind,
  Droplets,
  Home,
  Waves,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface VenueSpecsGridProps {
  unitCategory: "NON_AC_HALL" | "AC_HALL" | string;
  maxCapacity?: number;
  className?: string;
}

/**
 * VenueSpecsGrid - Event Hall Specifications, Operational Provisions & Pool Exclusion Notice
 * 
 * Enforces:
 * 1. Venue features: Stage specifications, high-capacity diesel generator backup, banquet seating layout.
 * 2. Strict Swimming Pool Exclusion Notice: Prominent callout highlighting that swimming pool access
 *    is strictly forbidden for event attendees under all circumstances.
 * 3. Operational density and single canvas aesthetics per AGENTS.md.
 */
export function VenueSpecsGrid({
  unitCategory,
  maxCapacity = unitCategory === "AC_HALL" ? 2000 : 1200,
  className,
}: VenueSpecsGridProps) {
  const isNonAc = unitCategory !== "AC_HALL";
  const capacityFormatted = maxCapacity.toLocaleString("en-IN");

  const specs = [
    {
      icon: <Mic2 className="size-5 text-primary shrink-0" />,
      title: "Elevated presentation stage",
      badge: "24\u00A0ft \u00D7 16\u00A0ft Dais",
      description:
        "Elevated stage platform engineered for wedding ceremonies, presentations, and live acoustics. Equipped with concealed AV cabling channels, spotlight mounting provisions, and direct green-room access.",
      bullets: [
        "Concealed audio-visual wiring ducts",
        "Overhead presentation backdrop anchoring",
        "Direct organizer & bridal stage entry",
      ],
    },
    {
      icon: <Zap className="size-5 text-primary shrink-0" />,
      title: "Diesel generator backup",
      badge: "100% Continuous power",
      description:
        "Dedicated heavy-duty silent diesel generator backup ensuring zero power interruption for stage sound systems, LED wall projections, banquet lighting, and catering food warmers.",
      bullets: [
        "Automatic mains-failure switchover",
        "Dedicated isolated circuit for stage PA audio",
        "Continuous fuel reservoir on standby",
      ],
    },
    {
      icon: <Users className="size-5 text-primary shrink-0" />,
      title: "Banquet seating layout",
      badge: `Up to ${capacityFormatted}\u00A0Pax`,
      description:
        `Configurable banquet dining tables and cushioned chairs layout accommodating up to ${capacityFormatted}\u00A0attendees with generous central circulation promenades and dedicated buffet service aisles.`,
      bullets: [
        "Round and row banquet table arrangements",
        "Generous 6-foot wide central guest promenade",
        "Dedicated buffet queuing corridors",
      ],
    },
    {
      icon: <Wind className="size-5 text-primary shrink-0" />,
      title: isNonAc ? "Natural cross-ventilation" : "Central HVAC climate control",
      badge: isNonAc ? "Open meadow breeze" : "Chilled acoustic air",
      description: isNonAc
        ? "Soaring 22-foot high ceiling with aerodynamic open gables engineered to draw continuous cool meadow breezes across all banquet seating rows."
        : "Engineered central air-conditioning chillers maintaining uniform 22\u00B0C temperature with sound-insulated ducting for pristine audio clarity.",
      bullets: [
        isNonAc ? "High-volume silent ceiling fans" : "Precision multi-zone climate regulation",
        isNonAc ? "Natural meadow cross-draft geometry" : "Sound-attenuated acoustic envelope",
      ],
    },
    {
      icon: <Droplets className="size-5 text-primary shrink-0" />,
      title: "Restrooms & catering pantry",
      badge: "Executive facilities",
      description:
        "Dedicated executive men's and women's restroom blocks equipped with continuous water supply, plus a separate back-of-house staging pantry for caterers and food service teams.",
      bullets: [
        "Separate multi-stall executive restrooms",
        "Continuous overhead treated water reservoir",
        "Catering preparation pantry with wash sinks",
      ],
    },
    {
      icon: <Home className="size-5 text-primary shrink-0" />,
      title: "Attached dome bundling",
      badge: "\u2265 400\u00A0Pax perk",
      description:
        "Bookings for slabs of 400+ attendees are eligible to request 1 complimentary attached Dome during event hours. For gatherings under 400 Pax, attached domes are available on request.",
      bullets: [
        "Complimentary for \u2265 400\u00A0Pax bookings",
        "Private bridal retreat & preparation quarters",
        "Direct covered pathway to main stage dais",
      ],
    },
  ];

  return (
    <div className={cn("space-y-8", className)}>
      {/* 1. Strict Swimming Pool Exclusion Notice */}
      <div
        role="alert"
        aria-label="Strict Swimming Pool Exclusion Notice"
        className="rounded-2xl border-2 border-amber-500/40 bg-amber-500/5 dark:bg-amber-950/20 p-5 sm:p-6 space-y-3 relative overflow-hidden"
      >
        <div className="flex items-start gap-3.5">
          <div className="size-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
            <Waves className="size-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 font-mono">
                Mandatory venue regulation
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full font-mono">
                <AlertTriangle className="size-3 shrink-0" />
                <span>Zero pool access</span>
              </span>
            </div>
            <h3 className="font-serif text-lg sm:text-xl font-medium text-foreground">
              Strict Swimming Pool Exclusion Notice
            </h3>
            <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed">
              Swimming pool access is strictly forbidden for event attendees under all circumstances. Pool facilities and surrounding sundeck areas are reserved exclusively for resident overnight guests in accordance with resort safety, hygiene, and hospitality governance.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-amber-500/20 text-xs text-foreground/85 font-mono">
          <div className="flex items-start gap-2 bg-background/50 p-2.5 rounded-lg border border-amber-500/20">
            <CheckCircle2 className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>Event attendees prohibited from pool deck</span>
          </div>
          <div className="flex items-start gap-2 bg-background/50 p-2.5 rounded-lg border border-amber-500/20">
            <CheckCircle2 className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>Exclusive privacy preserved for room residents</span>
          </div>
        </div>
      </div>

      {/* 2. Venue Specifications & Feature Matrix */}
      <section aria-labelledby="venue-specs-heading" className="space-y-6">
        <div>
          <h2 id="venue-specs-heading" className="font-serif text-2xl text-foreground font-medium">
            Venue Features &amp; Infrastructure
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Complete architectural provisions, power redundancy, and stage equipment included with venue booking.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {specs.map((spec) => (
            <div
              key={spec.title}
              className="p-5 rounded-2xl bg-card border border-border/70 hover:border-border transition-colors duration-150 space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="size-9 rounded-xl bg-surface-subtle border border-border/60 flex items-center justify-center shrink-0">
                    {spec.icon}
                  </div>
                  <span className="text-[11px] font-semibold font-mono px-2 py-0.5 rounded-md bg-surface-subtle border border-border/60 text-primary">
                    {spec.badge}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground font-sans">
                    {spec.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {spec.description}
                  </p>
                </div>
              </div>

              <ul className="space-y-1.5 pt-2 border-t border-border/50 text-[11px] font-mono text-foreground/80">
                {spec.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-center gap-2">
                    <span className="size-1 rounded-full bg-primary shrink-0" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default VenueSpecsGrid;
