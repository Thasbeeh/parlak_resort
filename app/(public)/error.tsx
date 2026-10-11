"use client";

import * as React from "react";
import { useEffect } from "react";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { RotateCcw, Home, Sparkles, MessageCircle } from "lucide-react";
import { SITE_CONFIG } from "@/lib/constants";

interface PublicErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Public Sanctuary Error Boundary
 * 
 * - Catches runtime errors in the (public) route group
 * - Crucial: Re-throws Next.js internal navigation signals (redirects, 404s) via unstable_rethrow
 * - Atmospheric sanctuary aesthetic with Fraunces display typography
 * - Tactile "Try again" action calling reset() and direct concierge escape hatch
 */
export default function PublicError({ error, reset }: PublicErrorProps) {
  // CRITICAL: Protect Next.js internal redirect and notFound signals
  unstable_rethrow(error);

  useEffect(() => {
    // Log unexpected runtime error to console for observability
    console.error("Public sanctuary uncaught error:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="w-full max-w-xl mx-auto text-center space-y-8">
        {/* Subtle Sanctuary Eyebrow Chip */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/80 bg-surface-subtle text-muted-foreground text-xs font-mono">
          <Sparkles className="size-3.5 text-primary" />
          <span>Sanctuary notice</span>
        </div>

        {/* Editorial Fraunces Serif Headline */}
        <div className="space-y-3">
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight text-foreground leading-tight">
            An unexpected moment of pause.
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-md mx-auto">
            Our reservation concierge encountered a momentary interruption while preparing your sanctuary experience.
          </p>
        </div>

        {/* Optional Error Digest Badge for Support Reference */}
        {error.digest && (
          <div className="inline-block px-2.5 py-1 rounded bg-muted/60 border border-border/60 text-[11px] font-mono text-muted-foreground">
            Reference code: {error.digest}
          </div>
        )}

        {/* Tactile Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {/* Primary: Try again */}
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-sans font-medium text-sm shadow-sm hover:bg-primary/95 active:scale-[0.98] transition-transform duration-100 ease-[var(--ease-snappy)] select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RotateCcw className="size-4 shrink-0" />
            <span>Try again</span>
          </button>

          {/* Secondary: Return to Sanctuary */}
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-border/80 bg-background text-foreground font-sans font-medium text-sm hover:bg-surface-subtle active:scale-[0.98] transition-transform duration-100 ease-[var(--ease-snappy)] select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Home className="size-4 text-muted-foreground shrink-0" />
            <span>Return to sanctuary</span>
          </Link>

          {/* Tertiary: WhatsApp Concierge */}
          <a
            href={SITE_CONFIG.defaultWhatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-muted-foreground hover:text-foreground font-sans text-sm active:scale-[0.98] transition-transform duration-100 ease-[var(--ease-snappy)] select-none"
          >
            <MessageCircle className="size-4 text-emerald-600 shrink-0" />
            <span>Reach concierge</span>
          </a>
        </div>
      </div>
    </div>
  );
}
