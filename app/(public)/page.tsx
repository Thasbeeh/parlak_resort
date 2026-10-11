import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { HeroSection } from "@/components/public/home/HeroSection";
import { PromoBanner, type SeasonalPromotion } from "@/components/public/home/PromoBanner";
import {
  FeaturedGrid,
  DEFAULT_FEATURED_UNITS,
  type FeaturedUnitItem,
} from "@/components/public/home/FeaturedGrid";
import { AmenitiesStrip } from "@/components/public/home/AmenitiesStrip";
import { ExperiencesStrip } from "@/components/public/home/ExperiencesStrip";
import { FaqAccordion } from "@/components/public/home/FaqAccordion";

export const metadata: Metadata = {
  title: "Parlak Resort & Farmhouse | Luxury Domes, A-Frames & Event Venues in Keralam",
  description:
    "Book luxury Geodesic Domes, scenic A-Frames, and expansive event halls at Parlak Resort, Vallivattom, S.N. Puram, Keralam. Direct WhatsApp reservation at +91 88919 31123.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Parlak Resort & Farmhouse | Luxury Domes & Event Venues in Keralam",
    description:
      "Experience luxury Geodesic Domes, scenic A-Frames, and open-air event halls at Vallivattom, S.N. Puram. Transparent pricing & direct WhatsApp booking.",
    url: "https://parlakfarmhouse.com",
    siteName: "Parlak Resort & Farmhouse",
    images: [
      {
        url: "https://res.cloudinary.com/parlak-resort/image/upload/v1/seo/home_og.webp",
        width: 1200,
        height: 630,
        alt: "Parlak Resort Geodesic Domes and Meadow Grounds in Vallivattom, Kerala",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Parlak Resort & Farmhouse | Luxury Domes & Event Venues",
    description:
      "Experience luxury Geodesic Domes, scenic A-Frames, and open-air event halls at Vallivattom, S.N. Puram.",
    images: ["https://res.cloudinary.com/parlak-resort/image/upload/v1/seo/home_og.webp"],
  },
};

/**
 * Public Sanctuary Home Landing Page
 *
 * React Server Component executing parallel database fetches:
 * 1. Active seasonal price modifiers (conditional promotional banner)
 * 2. Active signature accommodation units with featured photos and rate plans
 */
export default async function PublicHomePage() {
  const now = new Date();

  // Parallel database resolution via Promise.all
  const [activePromoRecord, rawUnits] = await Promise.all([
    prisma.priceModifier
      .findFirst({
        where: {
          type: "SEASONAL",
          isActive: true,
          startDate: { lte: now },
          endDate: { gte: now },
        },
        orderBy: {
          percentage: "desc",
        },
      })
      .catch((err) => {
        console.error("Failed to fetch seasonal promotion modifier:", err);
        return null;
      }),

    prisma.unit
      .findMany({
        where: { isActive: true },
        include: {
          photos: {
            orderBy: { orderIndex: "asc" },
          },
          priceList: {
            include: {
              slabs: {
                orderBy: { basePrice: "asc" },
              },
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      })
      .catch((err) => {
        console.error("Failed to fetch active units for homepage:", err);
        return [];
      }),
  ]);

  // Format active promotion for banner
  const activePromotion: SeasonalPromotion | null = activePromoRecord
    ? {
        id: activePromoRecord.id,
        name: activePromoRecord.name,
        percentage: activePromoRecord.percentage,
        startDate: activePromoRecord.startDate,
        endDate: activePromoRecord.endDate,
      }
    : null;

  // Assemble complete 3-card showcase, overlaying live PostgreSQL inventory on top of curated defaults
  const featuredUnits: FeaturedUnitItem[] = DEFAULT_FEATURED_UNITS.map((defaultUnit) => {
    const matchedUnit = rawUnits.find((u) => u.category === defaultUnit.category);
    if (!matchedUnit) return defaultUnit;

    const featuredPhoto =
      matchedUnit.photos.find((p) => p.isFeatured) || matchedUnit.photos[0];
    const lowestSlab = matchedUnit.priceList?.slabs?.[0];

    return {
      ...defaultUnit,
      id: matchedUnit.id,
      startingPrice: lowestSlab?.basePrice ?? defaultUnit.startingPrice,
      photoUrl: featuredPhoto?.url ?? defaultUnit.photoUrl,
      photoAlt: featuredPhoto?.altText ?? defaultUnit.photoAlt,
      capacityBadge:
        defaultUnit.category === "NON_AC_HALL"
          ? `Up to ${matchedUnit.maxCapacity.toLocaleString("en-IN")}\u00A0Attendees`
          : `Up to ${matchedUnit.maxCapacity}\u00A0Adults (Strict Cap)`,
      amenities: matchedUnit.amenities
        ? matchedUnit.amenities.split(",").map((a) => a.trim())
        : defaultUnit.amenities,
    };
  });

  return (
    <div className="flex flex-col min-h-full">
      {/* 1. Conditional Promotional Announcement Banner */}
      <PromoBanner promotion={activePromotion} />

      {/* 2. Atmospheric Hero Canvas with LCP Optimization & Quick Check Bar */}
      <HeroSection />

      {/* 3. Riverfront Amenities Strip */}
      <AmenitiesStrip />

      {/* 4. Curated Signature Living Spaces Grid */}
      <FeaturedGrid units={featuredUnits.length > 0 ? featuredUnits : undefined} />

      {/* 5. Activities & Recreation Showcase Strip */}
      <ExperiencesStrip />

      {/* 6. Frequently Asked Questions Accordion & Schema */}
      <FaqAccordion />
    </div>
  );
}
