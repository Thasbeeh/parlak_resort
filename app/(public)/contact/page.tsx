import * as React from "react";
import type { Metadata } from "next";
import { getResortSettings, getCancellationPolicy } from "@/actions/settings";
import { ContactCardsGrid } from "@/components/public/contact/ContactCardsGrid";
import { LocationMapSection } from "@/components/public/contact/LocationMapSection";
import { OperationalPoliciesCard } from "@/components/public/contact/OperationalPoliciesCard";
import { SITE_CONFIG } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Contact Us & Directions | Parlak Resort & Farmhouse Keralam",
  description:
    "Reach Parlak Resort at Vallivattom, S.N. Puram, Keralam 680661 for stay reservations, venue inquiries, and location directions. Direct call and WhatsApp support at +91 88919 31123.",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "Contact Us & Directions | Parlak Resort & Farmhouse Keralam",
    description:
      "Reach Parlak Resort at Vallivattom, S.N. Puram, Keralam 680661 for stay reservations, venue inquiries, and location directions. Direct call and WhatsApp support at +91 88919 31123.",
    url: "https://parlakfarmhouse.com/contact",
    siteName: "Parlak Resort & Farmhouse",
    images: [
      {
        url: "https://res.cloudinary.com/parlak-resort/image/upload/v1/seo/contact_og.webp",
        width: 1200,
        height: 630,
        alt: "Parlak Resort Location & Contact Desk",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Us & Directions | Parlak Resort & Farmhouse Keralam",
    description:
      "Reach Parlak Resort at Vallivattom, S.N. Puram, Keralam 680661 for stay reservations, venue inquiries, and location directions.",
    images: [
      "https://res.cloudinary.com/parlak-resort/image/upload/v1/seo/contact_og.webp",
    ],
  },
};

interface ContactPageProps {
  params?: Promise<Record<string, never>>;
  searchParams?: Promise<{
    inquiryType?: "general" | "stays" | "events";
  }>;
}

/**
 * Public Contact, Location & Operational Policies Page (`/contact`)
 *
 * Next.js App Router Server Component:
 * - Fetches live resort settings (`Setting.resort_profile`) and cancellation guidelines from PostgreSQL Neon.
 * - Provides one-tap direct contact action cards (WhatsApp, Voice, Email).
 * - Delivers location directions with responsive interactive Google Maps embed.
 * - Displays standardized operating shift timings and resort exclusivity policies.
 * - Embeds accessible dynamic Cancellation Policy modal.
 */
export default async function ContactPage(props: ContactPageProps) {
  // Resolve async searchParams per Next.js 16 conventions and docs/website/contact.md
  const resolvedSearchParams = props.searchParams
    ? await props.searchParams
    : undefined;
  const inquiryType = resolvedSearchParams?.inquiryType;

  // Parallel retrieval of resort settings and cancellation policy from PostgreSQL Neon
  const [resortSettings, cancellationPolicyText] = await Promise.all([
    getResortSettings().catch((err) => {
      console.error("Failed to load resort settings for /contact:", err);
      return {
        resortName: SITE_CONFIG.name,
        tagline: SITE_CONFIG.tagline,
        phone: SITE_CONFIG.phone.display,
        whatsapp: SITE_CONFIG.phone.display,
        email: SITE_CONFIG.email,
        address: SITE_CONFIG.address.formatted,
        overnightCheckIn: SITE_CONFIG.policies.timings.overnight.checkIn,
        overnightCheckOut: SITE_CONFIG.policies.timings.overnight.checkOut,
        daySlotCheckIn: SITE_CONFIG.policies.timings.daySlot.checkIn,
        daySlotCheckOut: SITE_CONFIG.policies.timings.daySlot.checkOut,
        diningUntil: SITE_CONFIG.policies.timings.dining.menuAvailableUntil,
        poolUntil: "10:00 PM IST",
      };
    }),
    getCancellationPolicy().catch((err) => {
      console.error("Failed to load cancellation policy for /contact:", err);
      return undefined;
    }),
  ]);

  // Clean dynamic telephone for schema
  const cleanTelephone = resortSettings.phone
    ? resortSettings.phone.replace(/[^\d+]/g, "")
    : SITE_CONFIG.phone.raw;

  // Schema.org structured data for Resort / LodgingBusiness
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Resort",
    name: resortSettings.resortName || SITE_CONFIG.name,
    description:
      "Reach Parlak Resort at Vallivattom, S.N. Puram, Keralam 680661 for stay reservations, venue inquiries, and location directions.",
    url: `${SITE_CONFIG.baseUrl}/contact`,
    telephone: cleanTelephone,
    email: resortSettings.email || SITE_CONFIG.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE_CONFIG.address.line1,
      addressLocality: SITE_CONFIG.address.locality,
      addressRegion: SITE_CONFIG.address.state,
      postalCode: SITE_CONFIG.address.postalCode,
      addressCountry: "IN",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: SITE_CONFIG.location.coordinates.latitude,
      longitude: SITE_CONFIG.location.coordinates.longitude,
    },
    hasMap: SITE_CONFIG.location.googleMapLink,
  };

  return (
    <div className="flex min-h-full flex-col">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Main Sanctuary Contact Shell */}
      <main className="mx-auto w-full max-w-7xl min-w-0 space-y-12 px-4 py-10 sm:space-y-16 sm:px-6 sm:py-16 lg:px-8">
        {/* Page Header with Monumental Fraunces */}
        <div className="max-w-3xl">
          <div className="text-primary flex items-center gap-2 font-mono text-xs font-semibold tracking-wider uppercase select-none">
            <span>Parlak Resort &amp; Farmhouse</span>
            <span className="text-muted-foreground/40 font-normal">·</span>
            <span className="text-muted-foreground font-malayalam">
              കേറി വാടാ മക്കളെ...
            </span>
          </div>
          <h1 className="text-foreground mt-3 font-serif text-4xl tracking-tight sm:text-6xl">
            Contact us &amp; directions
          </h1>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed sm:text-base">
            Reach our reservations desk directly for room availability checks,
            private event hall bookings, and arrival coordination. We operate
            single-action WhatsApp inquiry handoffs with live confirmation.
          </p>
        </div>

        {/* 1. Direct Contact Cards Grid */}
        <ContactCardsGrid
          phone={resortSettings.phone}
          whatsapp={resortSettings.whatsapp}
          email={resortSettings.email}
          inquiryType={inquiryType}
        />

        {/* Hairline Divider */}
        <div className="border-border/60 border-b" />

        {/* 2. Location & Interactive Google Maps Section */}
        <LocationMapSection address={resortSettings.address} />

        {/* Hairline Divider */}
        <div className="border-border/60 border-b" />

        {/* 3. Operational Timings, Dining, Pool Exclusivity & Cancellation Modal */}
        <OperationalPoliciesCard
          timings={{
            overnightCheckIn: resortSettings.overnightCheckIn,
            overnightCheckOut: resortSettings.overnightCheckOut,
            daySlotCheckIn: resortSettings.daySlotCheckIn,
            daySlotCheckOut: resortSettings.daySlotCheckOut,
            diningUntil: resortSettings.diningUntil,
            poolUntil: resortSettings.poolUntil,
          }}
          cancellationPolicyText={cancellationPolicyText}
        />
      </main>
    </div>
  );
}
