import * as React from "react";
import { Suspense } from "react";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CatalogExplorer } from "@/components/public/catalog/CatalogExplorer";
import {
  DEFAULT_CATALOG_UNITS,
  type CatalogUnitItem,
  type CategoryTab,
  type CategoryTabKey,
} from "@/components/public/catalog/types";
import { ShieldCheck, MessageCircle, Clock, Waves } from "lucide-react";

export const metadata: Metadata = {
  title: "Stays & Venues | Parlak Resort & Farmhouse Keralam",
  description:
    "Browse luxury Geodesic Domes, scenic A-Frames, and waterfront banquet event halls at Parlak Resort, Vallivattom, S.N. Puram, Keralam. Check availability and reserve directly via WhatsApp.",
  alternates: {
    canonical: "/stays",
  },
  openGraph: {
    title: "Stays & Venues | Parlak Resort & Farmhouse Keralam",
    description:
      "Browse luxury Geodesic Domes, scenic A-Frames, and waterfront banquet event halls at Parlak Resort, Vallivattom, S.N. Puram, Keralam. Check availability and reserve directly via WhatsApp.",
    url: "https://parlakfarmhouse.com/stays",
    siteName: "Parlak Resort & Farmhouse",
    images: [
      {
        url: "https://res.cloudinary.com/parlak-resort/image/upload/v1/seo/stays_catalog_og.webp",
        width: 1200,
        height: 630,
        alt: "Parlak Resort Stays & Venues Catalog - Geodesic Domes, A-Frames and Event Halls",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Stays & Venues | Parlak Resort & Farmhouse Keralam",
    description:
      "Browse luxury Geodesic Domes, scenic A-Frames, and waterfront banquet event halls at Parlak Resort, Vallivattom, S.N. Puram, Keralam.",
    images: [
      "https://res.cloudinary.com/parlak-resort/image/upload/v1/seo/stays_catalog_og.webp",
    ],
  },
};

interface StaysPageProps {
  searchParams: Promise<{
    category?: string;
  }>;
}

/**
 * Unified Stays & Venues Catalog Listing (`/stays`)
 *
 * Server Component executing Next.js 16 async searchParams pattern:
 * - Retrieves active inventory units, price lists, slabs, and photos via Prisma.
 * - Computes live counts for segmented category tabs (All, Domes, A-Frames, Event Halls).
 * - Enforces zero client math with single-source-of-truth rates.
 * - Renders CatalogExplorer inside a Suspense boundary for instant shallow URL synchronization.
 */
export default async function StaysPage({ searchParams }: StaysPageProps) {
  // 1. Next.js 16 async searchParams resolution
  const { category } = await searchParams;

  const normalizedCategory = category?.toUpperCase();
  const initialCategory: CategoryTabKey =
    normalizedCategory &&
    ["ALL", "DOMES", "A_FRAMES", "EVENT_HALLS"].includes(normalizedCategory)
      ? (normalizedCategory as CategoryTabKey)
      : "ALL";

  // 2. Fetch live units from PostgreSQL via Prisma
  const rawUnits = await prisma.unit.findMany({
      include: {
        photos: {
          orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
        },
        priceList: {
          include: {
            slabs: {
              orderBy: [{ basePrice: "asc" }],
            },
          },
        },
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    })
    .catch((err) => {
      console.error("Failed to fetch units from database for /stays:", err);
      return [];
    });

  // 3. Assemble catalog units, overlaying live PostgreSQL inventory on top of curated defaults
  const catalogUnits: CatalogUnitItem[] = DEFAULT_CATALOG_UNITS.map(
    (defaultUnit) => {
      const matchedUnit = rawUnits.find(
        (u) => u.category === defaultUnit.category,
      );
      if (!matchedUnit) return defaultUnit;

      const featuredPhoto =
        matchedUnit.photos.find((p) => p.isFeatured) || matchedUnit.photos[0];
      const isHall =
        defaultUnit.category === "NON_AC_HALL" ||
        defaultUnit.category === "AC_HALL" ||
        defaultUnit.category === "HALL";

      const overnightSlab = matchedUnit.priceList?.slabs?.find(
        (s) => s.stayType === "OVERNIGHT",
      );
      const daySlotSlab = matchedUnit.priceList?.slabs?.find(
        (s) => s.stayType === "DAY_SLOT",
      );
      const hallSlotSlab = matchedUnit.priceList?.slabs?.find(
        (s) => s.stayType === "MORNING_SLOT",
      );

      const targetSlab = isHall
        ? hallSlotSlab || matchedUnit.priceList?.slabs?.[0]
        : overnightSlab || matchedUnit.priceList?.slabs?.[0];

      const isAvailable = matchedUnit.isActive;

      return {
        ...defaultUnit,
        id: matchedUnit.id,
        name: matchedUnit.name || defaultUnit.name,
        isActive: matchedUnit.isActive,
        status: isAvailable ? "AVAILABLE" : ("INACTIVE" as const),
        badge: !isAvailable
          ? defaultUnit.badge || "Sold Out"
          : defaultUnit.badge,
        ctaText: !isAvailable
          ? defaultUnit.ctaText === "Coming Soon"
            ? "Coming Soon"
            : "Sold Out"
          : defaultUnit.ctaText,
        maxCapacity: matchedUnit.maxCapacity,
        capacityBadge:
          defaultUnit.category === "NON_AC_HALL" ||
          defaultUnit.category === "AC_HALL"
            ? `Up to ${matchedUnit.maxCapacity.toLocaleString("en-IN")}\u00A0Guests`
            : `Up to ${matchedUnit.maxCapacity}\u00A0Adults per unit`,
        pricing: {
          ...defaultUnit.pricing,
          displayRate: targetSlab?.basePrice
            ? Math.round(targetSlab.basePrice)
            : defaultUnit.pricing.displayRate,
          daySlotRate: daySlotSlab?.basePrice
            ? Math.round(daySlotSlab.basePrice)
            : defaultUnit.pricing.daySlotRate,
          advancePayment: targetSlab?.requiredDeposit
            ? Math.round(targetSlab.requiredDeposit)
            : defaultUnit.pricing.advancePayment,
        },
        featuredPhoto: featuredPhoto
          ? {
              url: featuredPhoto.url,
              alt:
                featuredPhoto.altText ||
                featuredPhoto.caption ||
                defaultUnit.featuredPhoto.alt,
            }
          : defaultUnit.featuredPhoto,
        amenitiesSummary: matchedUnit.amenities
          ? matchedUnit.amenities
              .split(",")
              .map((a) => a.trim())
              .filter(Boolean)
          : defaultUnit.amenitiesSummary,
      };
    },
  );

  // 4. Calculate live counts for category filter tabs
  const countAll = catalogUnits.length;
  const countDomes = catalogUnits.filter((u) => u.category === "DOME").length;
  const countAFrames = catalogUnits.filter(
    (u) => u.category === "A_FRAME",
  ).length;
  const countHalls = catalogUnits.filter(
    (u) =>
      u.category === "NON_AC_HALL" ||
      u.category === "AC_HALL" ||
      u.category === "HALL",
  ).length;

  const categoryTabs: CategoryTab[] = [
    { key: "ALL", label: "All Stays & Venues", count: countAll },
    { key: "DOMES", label: "Geodesic Domes", count: countDomes },
    { key: "A_FRAMES", label: "A-Frames", count: countAFrames },
    { key: "EVENT_HALLS", label: "Event Halls", count: countHalls },
  ];

  // 5. JSON-LD structured schema for search engines
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Parlak Resort Stays & Venues",
    description:
      "Browse luxury Geodesic Domes, scenic A-Frames, and open-air event halls at Parlak Resort, Vallivattom, S.N. Puram, Keralam.",
    itemListElement: catalogUnits.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      description: item.capacityBadge,
      url: `https://parlakfarmhouse.com${item.detailRoute}`,
      image: item.featuredPhoto.url,
    })),
  };

  return (
    <div className="flex min-h-full flex-col">
      {/* Structured Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Main Sanctuary Catalog Shell */}
      <main className="mx-auto w-full max-w-7xl min-w-0 px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        {/* Page Hero Header with Monumental Fraunces */}
        <div className="mb-8 max-w-3xl sm:mb-12">
          <span className="text-primary font-mono text-xs font-semibold tracking-wider uppercase select-none">
            Parlak Resort &amp; Farmhouse
          </span>
          <h1 className="text-foreground mt-2 font-serif text-4xl tracking-tight sm:text-6xl">
            Stays &amp; Event Venues
          </h1>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed sm:text-base">
            Choose between private geodesic domes, scenic two-level A-frame
            chalets, and expansive convention halls. Real-time availability
            verification directly via WhatsApp with transparent pricing.
          </p>
        </div>

        {/* Hairline Divider */}
        <div className="border-border/60 mb-8 border-b sm:mb-10" />

        {/* Dynamic Catalog Section with 0ms Tab Switching & Shallow URL Sync */}
        <section
          aria-label="Stays and Venues Listings"
          className="pb-16 sm:pb-24"
        >
          <Suspense
            fallback={
              <div className="text-muted-foreground flex w-full items-center justify-center py-16 font-mono text-sm">
                Loading catalog inventory…
              </div>
            }
          >
            <CatalogExplorer
              initialUnits={catalogUnits}
              categoryTabs={categoryTabs}
              initialCategory={initialCategory}
            />
          </Suspense>
        </section>

        {/* Operational Policies & Guest Standards Ribbon (Continuous Structural Strip) */}
        <section
          aria-label="Resort Policies and Booking Standards"
          className="border-border/60 text-muted-foreground grid grid-cols-1 gap-6 border-t pt-10 font-mono text-xs sm:pt-12 md:grid-cols-4"
        >
          <div className="bg-surface-subtle/50 border-border/50 flex items-start gap-3.5 rounded-xl border p-4">
            <div className="bg-primary/10 text-primary border-primary/20 flex size-9 shrink-0 items-center justify-center rounded-lg border">
              <Clock className="size-4 shrink-0" />
            </div>
            <div>
              <span className="text-foreground block font-sans text-sm font-semibold">
                Standard Timings
              </span>
              <p className="mt-1 leading-relaxed">
                Overnight: 12:00&nbsp;PM – 11:00&nbsp;AM.
                <br />
                Day slot: 10:00&nbsp;AM – 3:00&nbsp;PM.
              </p>
            </div>
          </div>

          <div className="bg-surface-subtle/50 border-border/50 flex items-start gap-3.5 rounded-xl border p-4">
            <div className="bg-primary/10 text-primary border-primary/20 flex size-9 shrink-0 items-center justify-center rounded-lg border">
              <Waves className="size-4 shrink-0" />
            </div>
            <div>
              <span className="text-foreground block font-sans text-sm font-semibold">
                Resident Pool Access
              </span>
              <p className="mt-1 leading-relaxed">
                Complimentary for Domes &amp; A-Frames.
                <br />
                Strictly excluded for Event Hall attendees.
              </p>
            </div>
          </div>

          <div className="bg-surface-subtle/50 border-border/50 flex items-start gap-3.5 rounded-xl border p-4">
            <div className="bg-primary/10 text-primary border-primary/20 flex size-9 shrink-0 items-center justify-center rounded-lg border">
              <ShieldCheck className="size-4 shrink-0" />
            </div>
            <div>
              <span className="text-foreground block font-sans text-sm font-semibold">
                Strict Physical Caps
              </span>
              <p className="mt-1 leading-relaxed">
                Max 3 Adults per Dome.
                <br />
                Max 5 Adults per A-Frame.
                <br />
                No extra beds.
              </p>
            </div>
          </div>

          <div className="bg-surface-subtle/50 border-border/50 flex items-start gap-3.5 rounded-xl border p-4">
            <div className="bg-primary/10 text-primary border-primary/20 flex size-9 shrink-0 items-center justify-center rounded-lg border">
              <MessageCircle className="size-4 shrink-0" />
            </div>
            <div>
              <span className="text-foreground block font-sans text-sm font-semibold">
                Direct WhatsApp Booking
              </span>
              <p className="mt-1 leading-relaxed">
                Parameter-only transmission.
                <br />
                Instant verification with resort managers.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
