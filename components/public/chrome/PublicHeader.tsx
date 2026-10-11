"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone } from "lucide-react";
import { AdminBrandLogo } from "@/components/admin/AdminBrandLogo";
import { MobileNavSheet } from "@/components/public/chrome/MobileNavSheet";
import { SITE_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/stays", label: "Stays & Venues" },
  { href: "/contact", label: "Contact Us" },
] as const;

/**
 * PublicHeader - Architectural Monograph Navigation Bar
 *
 * Enforces (Option A - Unified Floating Capsule Dock):
 * 1. Borderless Frosted Canopy: Seamless transition to page content without a horizontal hairline border.
 * 2. Unified Floating Nav Capsule: Dedicated frosted dock (bg-card/85 border border-border/80 shadow-sm)
 *    guaranteeing WCAG AAA contrast (10:1+) regardless of hero photo background or scroll position.
 * 3. Protected Quick Action Capsules: Direct dial phone pill encased in frosted dock.
 * 4. Mobile Ergonomics: Seamless MobileNavSheet trigger with 48px touch target.
 */
export function PublicHeader() {
  const pathname = usePathname();

  return (
    <header className="bg-background/50 supports-[-webkit-backdrop-filter]:bg-background/40 supports-[backdrop-filter]:bg-background/40 sticky top-0 isolate z-50 w-full transform-gpu pt-[env(safe-area-inset-top,0px)] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] backdrop-blur-md backdrop-saturate-150 transition-[background-color,box-shadow] duration-200 [-webkit-backdrop-filter:blur(12px)_saturate(150%)] [-webkit-backface-visibility:hidden]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-6 lg:px-8">
        {/* Left: Authentic Brand Mark */}
        <div className="flex shrink-0 items-center gap-4 lg:gap-6">
          <Link
            href="/"
            className="focus-visible:ring-ring flex shrink-0 items-center gap-3 rounded-lg transition-transform duration-100 ease-[var(--ease-snappy)] select-none focus-visible:ring-2 focus-visible:outline-none active:scale-[0.98]"
            aria-label="Parlak Resort Home"
          >
            <AdminBrandLogo
              variant="full"
              size="md"
              priority
              className="lg:h-12 lg:w-auto"
              fullClassName="lg:h-12 lg:w-auto"
            />
          </Link>
        </div>

        {/* Center: Desktop Unified Floating Nav Capsule */}
        <nav
          className="border-border/80 bg-card/85 hidden items-center gap-1 rounded-full border p-1.5 shadow-sm backdrop-blur-md md:flex"
          aria-label="Main Navigation"
        >
          {NAV_LINKS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-150 ease-[var(--ease-snappy)] select-none active:scale-[0.98]",
                  isActive
                    ? "text-primary-foreground bg-primary font-semibold shadow-xs"
                    : "text-foreground/75 hover:text-foreground hover:bg-background",
                )}
              >
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right: Direct Dial Pill, Social Quick Bar & Mobile Drawer */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Direct Dial Quick Link */}
          <a
            href={SITE_CONFIG.phone.telUri}
            className="border-border/80 text-foreground/85 hover:bg-card hover:text-foreground hidden items-center gap-1.5 rounded-full px-3.5 py-1.5 font-mono text-xs font-medium tabular-nums shadow-sm backdrop-blur-md transition-all select-none active:scale-[0.98] lg:inline-flex"
            aria-label={`Call ${SITE_CONFIG.phone.display}`}
          >
            <Phone className="text-primary size-3 shrink-0" />
            <span>{SITE_CONFIG.phone.display}</span>
          </a>

          {/* Mobile Sheet Drawer Trigger */}
          <MobileNavSheet />
        </div>
      </div>
    </header>
  );
}

export default PublicHeader;
