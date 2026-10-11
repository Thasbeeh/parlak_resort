import * as React from "react";
import Link from "next/link";
import { Compass, Home, Sparkles, MessageCircle } from "lucide-react";
import { SITE_CONFIG } from "@/lib/constants";

/**
 * Custom 404 Sanctuary Not-Found Page
 * 
 * - Rendered when a public route or unit record is not found
 * - Upholds the Sanctuary atmospheric aesthetic with Fraunces display typography
 * - Tactile navigation controls guiding the visitor back to Stays Catalog or Sanctuary Home
 */
export default function PublicNotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-20 sm:px-6 lg:px-8">
      <div className="w-full max-w-xl mx-auto text-center space-y-8">
        {/* Eyebrow Chip */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/80 bg-surface-subtle text-muted-foreground text-xs font-mono">
          <Sparkles className="size-3.5 text-primary" />
          <span>404 &bull; Untraveled path</span>
        </div>

        {/* Editorial Fraunces Serif Headline */}
        <div className="space-y-3">
          <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl font-normal tracking-tight text-foreground leading-[1.1]">
            A path unexplored in the sanctuary.
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-md mx-auto">
            The tranquil accommodation, venue, or page you are seeking has either moved or rests beyond our current pathways.
          </p>
        </div>

        {/* Navigation CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {/* Primary: Explore Stays Catalog */}
          <Link
            href="/stays"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-sans font-medium text-sm shadow-sm hover:bg-primary/95 active:scale-[0.98] transition-transform duration-100 ease-[var(--ease-snappy)] select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Compass className="size-4 shrink-0" />
            <span>Explore stays &amp; venues</span>
          </Link>

          {/* Secondary: Return Home */}
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-border/80 bg-background text-foreground font-sans font-medium text-sm hover:bg-surface-subtle active:scale-[0.98] transition-transform duration-100 ease-[var(--ease-snappy)] select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Home className="size-4 text-muted-foreground shrink-0" />
            <span>Return to sanctuary</span>
          </Link>

          {/* WhatsApp Concierge Assistance */}
          <a
            href={SITE_CONFIG.defaultWhatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-muted-foreground hover:text-foreground font-sans text-sm active:scale-[0.98] transition-transform duration-100 ease-[var(--ease-snappy)] select-none"
          >
            <MessageCircle className="size-4 text-emerald-600 shrink-0" />
            <span>Ask concierge</span>
          </a>
        </div>
      </div>
    </div>
  );
}
