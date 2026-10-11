import * as React from "react";
import Link from "next/link";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  ExternalLink,
  ShieldCheck,
  Compass,
  Waves,
} from "lucide-react";
import {
  InstagramIcon,
  FacebookIcon,
  YoutubeIcon,
} from "@/components/public/icons/SocialIcons";
import { AdminBrandLogo } from "@/components/admin/AdminBrandLogo";
import { CancellationPolicyModal } from "@/components/public/chrome/CancellationPolicyModal";
import { SITE_CONFIG } from "@/lib/constants";

/**
 * PublicFooter - Architectural Colophon & Operational Index
 * 
 * Enforces:
 * 1. 4-Column Architectural Grid:
 *    - Column 1: Identity, Philosophy & Social Channels
 *    - Column 2: Exact Location, Geographic Coordinates & Google Maps
 *    - Column 3: Direct Reservation Desk & Communications
 *    - Column 4: Operating Windows, Exclusivity Standards & Pool Policy
 * 2. Tabular Integrity: Monospace digits (font-mono tabular-nums) for timings, phones, and coordinates.
 * 3. Bottom Colophon: 1px hairline divider with dynamic CancellationPolicyModal trigger.
 */
export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-card border-t border-border/60 text-foreground pt-16 pb-12 sm:pb-16 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main 4-Column Architectural Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8 pb-12 border-b border-border/60">
          {/* Column 1: Identity & Sanctuary Philosophy */}
          <div className="flex flex-col gap-4">
            <Link
              href="/"
              className="inline-block active:scale-[0.98] transition-transform w-fit"
              aria-label="Parlak Resort Home"
            >
              <AdminBrandLogo variant="full" size="md" />
            </Link>
            <p className="text-xs leading-relaxed text-muted-foreground max-w-xs">
              A serene waterfront sanctuary in Vallivattom featuring luxury Geodesic Domes, scenic A-Frame chalets, open-air banquet lawns, and bespoke hospitality.
            </p>

            {/* Social Channels with Tactile Micro-Physics */}
            <div className="flex items-center gap-2 pt-2">
              <a
                href={SITE_CONFIG.socials.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow Parlak Resort on Instagram"
                className="size-9 rounded-lg border border-border/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-subtle active:scale-95 transition-all"
              >
                <InstagramIcon className="size-4 shrink-0" />
              </a>
              <a
                href={SITE_CONFIG.socials.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow Parlak Resort on Facebook"
                className="size-9 rounded-lg border border-border/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-subtle active:scale-95 transition-all"
              >
                <FacebookIcon className="size-4 shrink-0" />
              </a>
              <a
                href={SITE_CONFIG.socials.youtube}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow Parlak Resort on YouTube"
                className="size-9 rounded-lg border border-border/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-subtle active:scale-95 transition-all"
              >
                <YoutubeIcon className="size-4 shrink-0" />
              </a>
            </div>
          </div>

          {/* Column 2: Exact Location & Coordinates */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground font-mono">
              Property Coordinates &amp; Location
            </h3>
            <div className="flex flex-col gap-2.5 text-xs text-muted-foreground">
              <div className="flex items-start gap-2.5">
                <MapPin className="size-4 shrink-0 text-primary mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground">
                    Parlak Resort &amp; Farmhouse
                  </p>
                  <p className="leading-relaxed">{SITE_CONFIG.address.formatted}</p>
                  <p className="font-mono text-[11px] text-muted-foreground/90">
                    Plus Code: {SITE_CONFIG.location.googlePlusCode}
                  </p>
                  <p className="font-mono text-[11px] text-muted-foreground/90">
                    10.25°&nbsp;N, 76.18°&nbsp;E • Thrissur Dist.
                  </p>
                  <a
                    href={SITE_CONFIG.location.googleMapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary hover:underline text-[11px] pt-1 font-medium select-none"
                  >
                    <span>View on Google Maps</span>
                    <ExternalLink className="size-3 shrink-0" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Direct Reservation Desk */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground font-mono">
              Direct Reservation Desk
            </h3>
            <div className="flex flex-col gap-3 text-xs text-muted-foreground">
              <div className="flex items-start gap-2.5">
                <Phone className="size-4 shrink-0 text-primary mt-0.5" />
                <div className="space-y-0.5">
                  <span className="block text-[11px] text-muted-foreground">Direct Hotline / Reservations:</span>
                  <a
                    href={SITE_CONFIG.phone.telUri}
                    className="font-mono tabular-nums font-semibold text-foreground hover:text-primary transition-colors whitespace-nowrap text-sm"
                  >
                    +91&nbsp;88919&nbsp;31123
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Compass className="size-4 shrink-0 text-primary mt-0.5" />
                <div className="space-y-0.5">
                  <span className="block text-[11px] text-muted-foreground">Direct WhatsApp Desk:</span>
                  <a
                    href={SITE_CONFIG.defaultWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-primary hover:underline transition-colors whitespace-nowrap text-xs font-medium"
                  >
                    Chat with Resort Managers →
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Mail className="size-4 shrink-0 text-primary" />
                <a
                  href={`mailto:${SITE_CONFIG.email}`}
                  className="font-mono text-foreground hover:text-primary transition-colors truncate text-xs"
                >
                  {SITE_CONFIG.email}
                </a>
              </div>
            </div>
          </div>

          {/* Column 4: Standard Operating Windows */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground font-mono">
              Operational Standards
            </h3>
            <div className="flex flex-col gap-2.5 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <Clock className="size-4 shrink-0 text-primary mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold text-foreground block font-sans">
                    Overnight Stays
                  </span>
                  <p className="font-mono tabular-nums text-[11px]">
                    Check-in: {SITE_CONFIG.policies.timings.overnight.checkIn} IST
                  </p>
                  <p className="font-mono tabular-nums text-[11px]">
                    Check-out: {SITE_CONFIG.policies.timings.overnight.checkOut} IST
                  </p>
                </div>
              </div>

              <div className="pt-1 space-y-0.5 pl-6 border-l border-border/60 ml-2">
                <span className="font-semibold text-foreground block font-sans">
                  Day Slot Packages
                </span>
                <p className="font-mono tabular-nums text-[11px]">
                  {SITE_CONFIG.policies.timings.daySlot.checkIn} – {SITE_CONFIG.policies.timings.daySlot.checkOut} IST
                </p>
              </div>

              <div className="pt-1 space-y-0.5 pl-6 border-l border-border/60 ml-2">
                <span className="font-semibold text-foreground block font-sans">
                  Resident Pool Access
                </span>
                <p className="text-[11px] leading-relaxed">
                  Complimentary for Domes &amp; A-Frames. Strictly excluded for Event Hall attendees.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Colophon Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground font-mono">
          <p className="text-center sm:text-left">
            ©&nbsp;{currentYear} Parlak Resort &amp; Farmhouse. All rights reserved.
          </p>

          <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center font-sans">
            <CancellationPolicyModal />
            <span className="text-border/80 select-none">•</span>
            <Link
              href="/contact"
              className="hover:text-foreground active:scale-95 transition-all"
            >
              Contact Us
            </Link>
            <span className="text-border/80 select-none">•</span>
            <Link
              href="/stays"
              className="hover:text-foreground active:scale-95 transition-all"
            >
              Stays &amp; Venues
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default PublicFooter;
