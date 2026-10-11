"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Phone } from "lucide-react";
import { SITE_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * FloatingContactWidget - Tactile Floating Action Controller
 *
 * Persistent thumb-zone contact widget pinned to the bottom-right viewport.
 * Provides zero-latency access to direct phone dialing and verified WhatsApp chat.
 * Enforces:
 * 1. Safe Area Inset Handling: pb-[calc(1rem+env(safe-area-inset-bottom))]
 * 2. Emil Kowalski Tactile Physics: active:scale-90 with snappy bezier deceleration.
 * 3. Online Status Pulse Beacon: Subtle emerald status indicator.
 */
export function FloatingContactWidget() {
  const pathname = usePathname();
  const isStayDetail =
    Boolean(pathname?.startsWith("/stays/")) &&
    pathname?.split("/").filter(Boolean).length === 2;

  return (
    <aside
      aria-label="Quick Contact Actions"
      className={cn(
        "fixed bottom-0 right-4 sm:right-6 z-50 flex flex-col items-end gap-2.5",
        "pr-[calc(env(safe-area-inset-right,0px))] print:hidden select-none pointer-events-none transition-[padding] duration-200",
        isStayDetail
          ? "pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] md:pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]"
          : "pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]"
      )}
    >
      {/* 1. Quick Call Action */}
      <a
        href={SITE_CONFIG.phone.telUri}
        aria-label={`Call Parlak Resort at ${SITE_CONFIG.phone.display}`}
        className="pointer-events-auto group relative flex items-center justify-center size-11 sm:size-12 rounded-full bg-card/95 hover:bg-card text-foreground border border-border/80 shadow-lg hover:shadow-xl active:scale-90 transition-all duration-150 ease-[var(--ease-snappy)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Phone className="size-5 text-primary group-hover:scale-110 transition-transform duration-150 shrink-0" />
        {/* Desktop Hover Label */}
        <span className="hidden lg:group-hover:inline-block absolute right-full mr-3 px-2.5 py-1 rounded-md bg-foreground text-background text-xs font-mono tabular-nums whitespace-nowrap shadow-md pointer-events-none transition-opacity duration-150">
          Call {SITE_CONFIG.phone.display}
        </span>
      </a>

      {/* 2. Primary WhatsApp Floating CTA */}
      <a
        href={SITE_CONFIG.defaultWhatsAppUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with Parlak Resort on WhatsApp"
        className="pointer-events-auto group relative flex items-center justify-center size-12 sm:size-14 rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-white shadow-xl hover:shadow-2xl active:scale-90 transition-all duration-150 ease-[var(--ease-snappy)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]"
      >
        {/* Online Status Pulse Beacon */}
        <span className="absolute top-0.5 right-0.5 flex size-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
          <span className="relative inline-flex rounded-full size-3 bg-emerald-400 border-2 border-white" />
        </span>

        {/* Crisp Official WhatsApp Vector */}
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          stroke="currentColor"
          strokeWidth="0"
          fill="currentColor"
          className="size-6 sm:size-7 drop-shadow-xs group-hover:scale-110 transition-transform duration-150 shrink-0"
          aria-hidden="true"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.456h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>

        {/* Desktop Hover Label */}
        <span className="hidden lg:group-hover:inline-block absolute right-full mr-3 px-2.5 py-1 rounded-md bg-foreground text-background text-xs font-mono whitespace-nowrap shadow-md pointer-events-none transition-opacity duration-150">
          WhatsApp Inquiries
        </span>
      </a>
    </aside>
  );
}

export default FloatingContactWidget;
