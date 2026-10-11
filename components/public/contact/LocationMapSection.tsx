"use client";

import * as React from "react";
import {
  MapPin,
  Navigation,
  Compass,
  Copy,
  Check,
  ExternalLink,
  Car,
} from "lucide-react";
import { SITE_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface LocationMapSectionProps {
  address?: string;
}

export function LocationMapSection({
  address = SITE_CONFIG.address.formatted,
}: LocationMapSectionProps) {
  const [copiedPlusCode, setCopiedPlusCode] = React.useState(false);

  const plusCode = SITE_CONFIG.location.googlePlusCode;
  const mapRoutingUrl = SITE_CONFIG.location.googleMapLink;
  const embedUrl = SITE_CONFIG.location.googleMapsEmbedUrl;
  const coords = SITE_CONFIG.location.coordinates;

  const handleCopyPlusCode = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(plusCode);
      } else if (typeof document !== "undefined") {
        const textarea = document.createElement("textarea");
        textarea.value = plusCode;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedPlusCode(true);
      setTimeout(() => setCopiedPlusCode(false), 2000);
    } catch (err) {
      console.error("Failed to copy Plus Code:", err);
    }
  };

  return (
    <section aria-labelledby="location-heading" className="w-full space-y-6">
      {/* Section Header */}
      <div>
        <span className="text-primary font-malayalam text-xs font-semibold tracking-wider uppercase select-none">
          നമുക്ക് ചോദിച്ച് ചോദിച്ച് പോകാം
        </span>
        <h2
          id="location-heading"
          className="text-foreground mt-1 font-serif text-2xl tracking-tight sm:text-3xl"
        >
          Resort location &amp; accessibility
        </h2>
        <p className="text-muted-foreground mt-1.5 max-w-2xl text-xs leading-relaxed sm:text-sm">
          Nestled along tranquil open meadow grounds in Vallivattom, S.N. Puram.
          Easily reached from the NH 66 highway corridor between Kodungallur and
          Triprayar.
        </p>
      </div>

      {/* Main Grid: Details Sidebar & Interactive Map */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
        {/* Left Column: Address Card & Routing Actions (5 cols) */}
        <div className="border-border/60 bg-card flex flex-col justify-between space-y-5 rounded-xl border p-6 shadow-xs lg:col-span-5">
          <div className="space-y-5">
            {/* Postal Address Block */}
            <div className="flex items-start gap-3.5">
              <div className="bg-primary/10 text-primary mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full">
                <MapPin className="size-5" />
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground block font-sans text-xs font-medium">
                  Postal address
                </span>
                <p className="text-foreground text-sm leading-snug font-semibold sm:text-base">
                  {address}
                </p>
                <p className="text-muted-foreground text-xs">
                  Thrissur district, Keralam, India
                </p>
              </div>
            </div>

            <div className="border-border/50 border-b" />

            {/* Google Plus Code Block */}
            <div className="flex items-start gap-3.5">
              <div className="bg-surface-subtle border-border/60 text-foreground mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border">
                <Compass className="size-5" />
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <span className="text-muted-foreground block font-sans text-xs font-medium">
                  Google Plus code
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <code className="text-foreground bg-surface-subtle border-border/60 rounded border px-2 py-1 font-mono text-xs font-semibold">
                    {plusCode}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyPlusCode}
                    aria-label="Copy Google Plus Code"
                    className="text-primary hover:text-primary/80 inline-flex items-center gap-1 text-[11px] font-medium transition-transform duration-100 ease-[var(--ease-snappy)] select-none active:scale-95"
                  >
                    <span
                      aria-live="polite"
                      className="inline-flex items-center gap-1"
                    >
                      {copiedPlusCode ? (
                        <>
                          <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-emerald-600 dark:text-emerald-400">
                            Copied
                          </span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" />
                          <span>Copy code</span>
                        </>
                      )}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div className="border-border/50 border-b" />

            {/* Geographic Coordinates & Landmark */}
            <div className="flex items-start gap-3.5">
              <div className="bg-surface-subtle border-border/60 text-foreground mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border">
                <Navigation className="size-5" />
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground block font-sans text-xs font-medium">
                  GPS coordinates
                </span>
                <p className="text-foreground font-mono text-xs font-semibold tabular-nums">
                  {coords.latitude.toFixed(4)}°&nbsp;N,{" "}
                  {coords.longitude.toFixed(4)}°&nbsp;E
                </p>
                <div className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                  <Car className="size-3 shrink-0" />
                  <span>Ample dedicated guest parking on site</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button: Open in Google Maps */}
          <div className="border-border/50 border-t pt-4">
            <a
              href={mapRoutingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-xs font-semibold select-none",
                "bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs",
                "transition-transform duration-100 ease-[var(--ease-snappy)] active:scale-[0.98]",
              )}
            >
              <Navigation className="size-4 shrink-0" />
              <span>Get directions on Google Maps</span>
              <ExternalLink className="size-3.5 shrink-0 opacity-80" />
            </a>
          </div>
        </div>

        {/* Right Column: Responsive Interactive Map Embed (7 cols) */}
        <div className="border-border/60 bg-surface-subtle relative flex min-h-[360px] flex-col overflow-hidden rounded-xl border shadow-xs sm:min-h-[420px] lg:col-span-7 lg:min-h-[460px]">
          <iframe
            src={embedUrl}
            width="100%"
            height="100%"
            style={{ border: 0, minHeight: "360px", flex: 1 }}
            allowFullScreen={false}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Parlak Resort Location on Google Maps"
            aria-label="Interactive Google Map showing Parlak Resort location in Vallivattom, Kerala"
            className="h-full w-full flex-1"
          />

          {/* Map Footer Bar with Direct Coordinates Note */}
          <div className="bg-background/90 border-border/60 text-muted-foreground flex items-center justify-between border-t px-4 py-2 font-mono text-[11px] backdrop-blur-sm">
            <span>S.N. Puram, Thrissur</span>
            <a
              href={mapRoutingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-transform duration-100 ease-[var(--ease-snappy)] select-none hover:underline active:scale-95"
            >
              Open large map ↗
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export default LocationMapSection;
