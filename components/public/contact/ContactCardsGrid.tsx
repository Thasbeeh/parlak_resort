"use client";

import * as React from "react";
import { Phone, Mail, ArrowUpRight } from "lucide-react";
import { WhatsAppIcon, InstagramIcon, FacebookIcon, YoutubeIcon } from "@/components/public/icons/SocialIcons";
import { SITE_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface ContactCardsGridProps {
  phone?: string;
  whatsapp?: string;
  email?: string;
  inquiryType?: "general" | "stays" | "events";
}

export function ContactCardsGrid({
  phone = SITE_CONFIG.phone.display,
  whatsapp = SITE_CONFIG.phone.display,
  email = SITE_CONFIG.email,
  inquiryType = "general",
}: ContactCardsGridProps) {
  // Clean phone number for tel: link
  const rawTelNumber = phone.replace(/[^\d+]/g, "");
  const telUri = `tel:${rawTelNumber.startsWith("+") ? rawTelNumber : `+${rawTelNumber}`}`;

  // Clean WhatsApp number (strip non-digits, normalize 10/11-digit numbers to international format)
  const cleanDigits = whatsapp.replace(/\D/g, "");
  const waNumber =
    cleanDigits.length === 10
      ? `91${cleanDigits}`
      : cleanDigits.length === 11 && cleanDigits.startsWith("0")
      ? `91${cleanDigits.slice(1)}`
      : cleanDigits || SITE_CONFIG.phone.whatsapp;

  // Contextual WhatsApp greeting aligned with docs/website/contact.md
  const waGreeting =
    inquiryType === "stays"
      ? "Hello Parlak Resort Team, I would like to inquire regarding room availability and stays at Parlak Resort."
      : inquiryType === "events"
      ? "Hello Parlak Resort Team, I would like to inquire regarding event venue bookings at Parlak Resort."
      : "Hello Parlak Resort Team, I would like to get in touch regarding a stay or event.";

  const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(waGreeting)}`;

  const mailtoUri = `mailto:${email}`;

  return (
    <section aria-label="Direct contact channels" className="w-full space-y-6">
      {/* 3 Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Card 1: WhatsApp Chat */}
        <div className="group rounded-xl border border-border/60 bg-card p-6 flex flex-col justify-between hover:border-emerald-500/40 hover:shadow-sm transition-all duration-150">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="size-11 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <WhatsAppIcon className="size-5" />
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono">
                Primary channel
              </span>
            </div>

            <div>
              <span className="text-xs font-medium text-muted-foreground block font-sans">
                WhatsApp desk
              </span>
              <p className="mt-1 font-mono text-lg font-semibold tracking-tight text-foreground tabular-nums">
                {whatsapp}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                Instant reservation inquiries, date checks, and on-demand quotation handoff.
              </p>
            </div>
          </div>

          <div className="pt-5 mt-4 border-t border-border/50">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex items-center justify-between w-full px-4 py-2.5 rounded-lg text-xs font-semibold select-none",
                "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs",
                "active:scale-[0.98] transition-transform duration-100 ease-[var(--ease-snappy)]"
              )}
            >
              <span className="flex items-center gap-2">
                <WhatsAppIcon className="size-4 shrink-0" />
                <span>Chat on WhatsApp</span>
              </span>
              <ArrowUpRight className="size-3.5 shrink-0 opacity-80" />
            </a>
          </div>
        </div>

        {/* Card 2: Direct Phone Call */}
        <div className="group rounded-xl border border-border/60 bg-card p-6 flex flex-col justify-between hover:border-primary/40 hover:shadow-sm transition-all duration-150">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="size-11 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Phone className="size-5" />
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-surface-subtle text-muted-foreground font-mono">
                Direct calling
              </span>
            </div>

            <div>
              <span className="text-xs font-medium text-muted-foreground block font-sans">
                Front desk voice line
              </span>
              <p className="mt-1 font-mono text-lg font-semibold tracking-tight text-foreground tabular-nums">
                {phone}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                Direct phone support for immediate arrival coordination and guest inquiries.
              </p>
            </div>
          </div>

          <div className="pt-5 mt-4 border-t border-border/50">
            <a
              href={telUri}
              className={cn(
                "inline-flex items-center justify-between w-full px-4 py-2.5 rounded-lg text-xs font-semibold select-none",
                "bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs",
                "active:scale-[0.98] transition-transform duration-100 ease-[var(--ease-snappy)]"
              )}
            >
              <span className="flex items-center gap-2">
                <Phone className="size-4 shrink-0" />
                <span>Call front desk</span>
              </span>
              <ArrowUpRight className="size-3.5 shrink-0 opacity-80" />
            </a>
          </div>
        </div>

        {/* Card 3: Email Desk */}
        <div className="group rounded-xl border border-border/60 bg-card p-6 flex flex-col justify-between hover:border-border hover:shadow-sm transition-all duration-150">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="size-11 rounded-full bg-surface-subtle text-foreground flex items-center justify-center shrink-0 border border-border/60">
                <Mail className="size-5" />
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-surface-subtle text-muted-foreground font-mono">
                Formal inquiries
              </span>
            </div>

            <div>
              <span className="text-xs font-medium text-muted-foreground block font-sans">
                Official email
              </span>
              <p className="mt-1 font-mono text-sm sm:text-base font-semibold tracking-tight text-foreground break-all">
                {email}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                Corporate venue buyouts, extended shooting requests, and vendor agreements.
              </p>
            </div>
          </div>

          <div className="pt-5 mt-4 border-t border-border/50">
            <a
              href={mailtoUri}
              className={cn(
                "inline-flex items-center justify-between w-full px-4 py-2.5 rounded-lg text-xs font-semibold select-none",
                "border border-border/80 bg-background hover:bg-surface-subtle text-foreground shadow-xs",
                "active:scale-[0.98] transition-transform duration-100 ease-[var(--ease-snappy)]"
              )}
            >
              <span className="flex items-center gap-2">
                <Mail className="size-4 shrink-0" />
                <span>Send email</span>
              </span>
              <ArrowUpRight className="size-3.5 shrink-0 opacity-80" />
            </a>
          </div>
        </div>
      </div>

      {/* Social Media Connectivity Ribbon */}
      <div className="rounded-xl border border-border/60 bg-surface-subtle/50 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="font-medium text-foreground">Social media channels:</span>
          <span>Stay updated with guest experiences and resort stories</span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={SITE_CONFIG.socials.instagram}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 bg-card hover:bg-surface-subtle text-foreground font-medium active:scale-95 transition-[transform,background-color,border-color] duration-150 ease-[var(--ease-snappy)] select-none"
          >
            <InstagramIcon className="size-3.5 text-pink-600 dark:text-pink-400" />
            <span>Instagram</span>
          </a>
          <a
            href={SITE_CONFIG.socials.facebook}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 bg-card hover:bg-surface-subtle text-foreground font-medium active:scale-95 transition-[transform,background-color,border-color] duration-150 ease-[var(--ease-snappy)] select-none"
          >
            <FacebookIcon className="size-3.5 text-blue-600 dark:text-blue-400" />
            <span>Facebook</span>
          </a>
          <a
            href={SITE_CONFIG.socials.youtube}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="YouTube"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 bg-card hover:bg-surface-subtle text-foreground font-medium active:scale-95 transition-[transform,background-color,border-color] duration-150 ease-[var(--ease-snappy)] select-none"
          >
            <YoutubeIcon className="size-3.5 text-red-600 dark:text-red-400" />
            <span>YouTube</span>
          </a>
        </div>
      </div>
    </section>
  );
}

export default ContactCardsGrid;
