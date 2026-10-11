"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  Compass,
} from "lucide-react";
import {
  InstagramIcon,
  FacebookIcon,
  YoutubeIcon,
} from "@/components/public/icons/SocialIcons";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { buttonVariants } from "@/components/ui/button";
import { AdminBrandLogo } from "@/components/admin/AdminBrandLogo";
import { SITE_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Home", sub: "Sanctuary overview & experiences" },
  { href: "/stays", label: "Stays & Venues", sub: "Geodesic domes, chalets & event halls" },
  { href: "/contact", label: "Contact Us", sub: "Location, hotline & directions" },
] as const;

/**
 * MobileNavSheet - Architectural Drawer with Japanese Ma Negative Space
 * 
 * Enforces:
 * 1. Mobile-Native Touch Ergonomics: Strict >= 48px tap targets throughout.
 * 2. Ma Discipline: Generous breathing room, quiet typography, 1px structural hairlines.
 * 3. Safe-Area Inset Handling: pb-[calc(1rem+env(safe-area-inset-bottom))] for bottom bar clearance.
 * 4. Emil Kowalski Tactile Physics: active:scale-[0.98] on buttons and navigation items.
 */
export function MobileNavSheet() {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  const handleLinkClick = () => {
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <button
            type="button"
            className="md:hidden flex items-center justify-center size-10 rounded-full border border-border/80 bg-card/85 text-foreground shadow-sm backdrop-blur-md hover:bg-card active:scale-95 transition-all duration-100 ease-[var(--ease-snappy)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Open navigation menu"
          />
        }
      >
        <Menu className="size-5 text-foreground" />
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-[88vw] sm:max-w-md p-0 flex flex-col bg-background/98 backdrop-blur-xl border-l border-border/80 shadow-2xl overflow-y-auto"
      >
        {/* Header with authentic brand logo */}
        <SheetHeader className="px-6 py-5 border-b border-border/60 flex flex-row items-center justify-between shrink-0">
          <SheetTitle className="sr-only">Parlak Resort Navigation</SheetTitle>
          <Link
            href="/"
            onClick={handleLinkClick}
            className="flex items-center active:scale-[0.98] transition-transform select-none"
          >
            <AdminBrandLogo variant="full" size="sm" priority />
          </Link>
        </SheetHeader>

        {/* Navigation items (>= 48px tap targets with Japanese Ma spacing) */}
        <div className="flex-1 px-5 py-6 flex flex-col justify-between gap-6">
          <div className="flex flex-col gap-1">
            <span className="px-3 pb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-mono select-none">
              Sanctuary Index
            </span>

            <nav className="flex flex-col divide-y divide-border/40 border-y border-border/40" aria-label="Mobile Navigation">
              {NAV_LINKS.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleLinkClick}
                    className={cn(
                      "min-h-[56px] px-3 py-3 rounded-lg flex flex-col justify-center select-none transition-all duration-100 ease-[var(--ease-snappy)] active:scale-[0.98]",
                      isActive
                        ? "bg-primary/10 text-primary font-semibold border-l-2 border-primary"
                        : "text-foreground hover:bg-surface-subtle"
                    )}
                  >
                    <span className="text-base font-medium tracking-tight">
                      {item.label}
                    </span>
                    <span className="text-xs text-muted-foreground font-normal">
                      {item.sub}
                    </span>
                  </Link>
                );
              })}
            </nav>

            {/* Coordinates & Quick Info Block */}
            <div className="mt-6 px-3 py-3 rounded-xl bg-surface-subtle/60 border border-border/50 flex flex-col gap-2.5 text-xs text-muted-foreground font-mono">
              <div className="flex items-start gap-2">
                <MapPin className="size-3.5 text-primary shrink-0 mt-0.5" />
                <span className="leading-snug">Vallivattom, S.N. Puram, Kerala • 10.25°&nbsp;N, 76.18°&nbsp;E</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="size-3.5 text-primary shrink-0" />
                <span>Overnight check-in: {SITE_CONFIG.policies.timings.overnight.checkIn} IST</span>
              </div>
            </div>
          </div>

          {/* Social icons row (>= 48px tap targets) */}
          <div className="px-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-mono mb-2.5 select-none">
              Social Channels
            </p>
            <div className="flex items-center gap-3">
              <a
                href={SITE_CONFIG.socials.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="size-12 rounded-xl border border-border/70 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-subtle active:scale-95 transition-all"
              >
                <InstagramIcon className="size-5 shrink-0" />
              </a>
              <a
                href={SITE_CONFIG.socials.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="size-12 rounded-xl border border-border/70 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-subtle active:scale-95 transition-all"
              >
                <FacebookIcon className="size-5 shrink-0" />
              </a>
              <a
                href={SITE_CONFIG.socials.youtube}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="size-12 rounded-xl border border-border/70 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-subtle active:scale-95 transition-all"
              >
                <YoutubeIcon className="size-5 shrink-0" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Drawer Actions (Respecting Safe Area) */}
        <div className="p-4 border-t border-border/60 bg-muted/20 flex flex-col gap-2.5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] shrink-0">
          <a
            href={SITE_CONFIG.defaultWhatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "whatsapp", size: "lg" }),
              "w-full min-h-[48px] h-12 text-base font-semibold shadow-md active:scale-[0.98]"
            )}
          >
            <MessageCircle className="size-5 shrink-0" />
            <span>Verify via WhatsApp</span>
          </a>

          <a
            href={SITE_CONFIG.phone.telUri}
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "w-full min-h-[48px] h-12 text-base font-medium active:scale-[0.98] border-border/80"
            )}
          >
            <Phone className="size-4 shrink-0 text-primary" />
            <span className="font-mono tabular-nums">{SITE_CONFIG.phone.display}</span>
          </a>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default MobileNavSheet;
