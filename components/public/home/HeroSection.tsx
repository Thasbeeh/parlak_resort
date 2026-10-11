import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Compass, MessageCircle } from "lucide-react";
import { QuickCheckBar } from "./QuickCheckBar";
import { buttonVariants } from "@/components/ui/button";
import { SITE_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface HeroSectionProps {
  headline?: string;
  subheadline?: string;
  heroImageUrl?: string;
}

/**
 * HeroSection - Tropical Architectural Monograph Hero Viewport
 *
 * Enforces:
 * 1. Four-Corner Perimeter Framing:
 *    - Top-Left: Geographic coordinates (10.25° N, 76.18° E • Vallivattom, Keralam)
 *    - Top-Right: Operational window (Sanctuary • IST 12:00 PM Check-in)
 * 2. Monumental Fraunces Display: High-contrast optical serif with soft italicized emphasis.
 * 3. Emil Kowalski Tactile Physics: active:scale-[0.98] with snappy bezier transitions.
 * 4. Next/Image LCP Optimization: priority={true}, fetchPriority="high", sizes="100vw".
 * 5. Integrated Availability Dock: Seamlessly docks the flush QuickCheckBar.
 */
export function HeroSection({
  headline = "Just be in the, നല്ല നേരം",
  subheadline = "Leave the clocks behind. Between the quiet open meadows of Vallivattom, star-lit domes, and sun-dappled A-frames, find your own quiet slice of peace.",
  heroImageUrl = "/images/hero/hero.jpg",
}: HeroSectionProps) {
  return (
    <section className="relative -mt-16 flex min-h-screen min-h-[100svh] min-h-[100dvh] w-full flex-col justify-between overflow-hidden bg-stone-950 sm:-mt-20">
      {/* 1. Optimized Atmospheric LCP Background Image */}
      <div className="absolute inset-0 z-0 overflow-hidden [transform:translateZ(0)] isolate">
        <Image
          src={heroImageUrl || "/images/hero/hero.jpg"}
          alt="Lush open meadows and serene grounds of Parlak Resort in Vallivattom, Kerala"
          fill
          priority={true}
          fetchPriority="high"
          sizes="100vw"
          quality={90}
          className="scale-105 object-cover object-center transition-transform duration-1000 ease-out"
        />
        {/* Multilayered Natural Vignette Scrim */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/35 to-black/80" />
        <div className="from-background absolute inset-0 bg-gradient-to-t via-transparent to-transparent opacity-90" />
      </div>

      {/* 3. Hero Centerpiece Typography */}
      <div className="relative z-10 mx-auto my-auto flex max-w-5xl flex-col items-center px-4 pt-20 pb-10 text-center sm:px-6 sm:pt-28 sm:pb-14 md:pt-32 lg:px-8">
        {/* Monumental Editorial Serif Headline in Fraunces */}
        <h1 className="max-w-5xl font-serif text-4xl leading-[1.08] font-normal tracking-tight text-white drop-shadow-md sm:text-6xl sm:leading-[1.04] md:text-7xl lg:text-8xl">
          {headline.includes(",") ? (
            <>
              {headline.split(",")[0]},
              <br className="hidden sm:inline" />
              <span className="font-malayalam block font-normal text-white/95 italic sm:ml-3 sm:inline">
                {headline.split(",").slice(1).join(",").trim()}
              </span>
            </>
          ) : (
            headline
          )}
        </h1>

        {/* Atmospheric Subtitle with Japanese Ma Spacing */}
        <p className="mt-5 max-w-2xl text-base leading-relaxed font-light text-white/90 drop-shadow-xs sm:mt-6 sm:text-lg md:text-xl">
          {subheadline}
        </p>

        {/* Direct Call-to-Actions */}
        <div className="mt-8 flex w-full flex-col items-center gap-3.5 sm:mt-10 sm:w-auto sm:flex-row">
          <Link
            href="/stays"
            className={cn(
              buttonVariants({ variant: "primary", size: "lg" }),
              "bg-primary hover:bg-primary/95 text-primary-foreground h-12 w-full px-8 text-base font-semibold shadow-lg transition-transform duration-100 ease-[var(--ease-snappy)] select-none active:scale-[0.98] sm:w-auto",
            )}
          >
            <Compass className="size-5 shrink-0" />
            <span>Book Your Stay / Event</span>
          </Link>

          <a
            href={SITE_CONFIG.defaultWhatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "whatsapp", size: "lg" }),
              "h-12 w-full px-7 text-base font-semibold shadow-lg transition-transform duration-100 ease-[var(--ease-snappy)] select-none active:scale-[0.98] sm:w-auto",
            )}
          >
            <MessageCircle className="size-5 shrink-0" />
            <span>Verify via WhatsApp</span>
          </a>
        </div>
      </div>

      {/* 4. Bottom Quick Check Availability Bar Dock */}
      <div className="relative z-20 mx-auto w-full max-w-6xl px-4 pt-2 pb-8 sm:px-6 sm:pb-12 lg:px-8">
        <QuickCheckBar />
      </div>
    </section>
  );
}

export default HeroSection;
