import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Users,
  Clock,
  Waves,
  ShieldCheck,
  ChevronRight,
  Coffee,
  Droplets,
  Sparkles,
  Flame,
  Wind,
  Wifi,
  Tv,
  Bed,
  Compass,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_UNIT_DETAILS,
  type UnitDetailData,
  type UnitDetailPhoto,
} from "@/components/public/unit-detail/types";
import { UnitHeroGallery } from "@/components/public/unit-detail/UnitHeroGallery";
import { StayBookingEngine } from "@/components/public/unit-detail/StayBookingEngine";
import { HallInquiryEngine } from "@/components/public/unit-detail/HallInquiryEngine";
import { HallBookingEngine } from "@/components/public/unit-detail/HallBookingEngine";
import { VenueSpecsGrid } from "@/components/public/unit-detail/VenueSpecsGrid";
import { StickyMobileBookingBar } from "@/components/public/unit-detail/StickyMobileBookingBar";

interface StayDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    stayType?: string;
    slotType?: string;
    date?: string;
  }>;
}

const SLUG_TO_CATEGORY: Record<string, string> = {
  "geodesic-dome": "DOME",
  "scenic-a-frame": "A_FRAME",
  "non-ac-hall": "NON_AC_HALL",
  "ac-hall": "AC_HALL",
};

const CATEGORY_TO_SLUG: Record<string, string> = {
  DOME: "geodesic-dome",
  A_FRAME: "scenic-a-frame",
  NON_AC_HALL: "non-ac-hall",
  AC_HALL: "ac-hall",
  HALL: "non-ac-hall",
};

/**
 * Resolves unit details by human slug or database UUID, combining
 * live PostgreSQL rate plans with curated showcase content.
 */
async function resolveUnitDetail(slug: string): Promise<UnitDetailData | null> {
  const normalizedSlug = slug.toLowerCase().trim();
  const mappedCategory = SLUG_TO_CATEGORY[normalizedSlug];

  // Check static curated fallback first for baseline template
  let baseDetail = DEFAULT_UNIT_DETAILS[normalizedSlug] || null;

  try {
    // Query database for matching record (by ID, Name, or Category)
    const nameCandidate = normalizedSlug.replace(/-/g, " ");
    const dbUnit = await prisma.unit.findFirst({
      where: {
        OR: [
          { id: slug },
          { name: { equals: nameCandidate, mode: "insensitive" } },
          ...(mappedCategory ? [{ category: mappedCategory }] : []),
        ],
      },
      include: {
        photos: {
          orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
        },
        priceList: {
          include: {
            slabs: {
              orderBy: [{ basePrice: "asc" }],
            },
            modifiers: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    if (dbUnit) {
      const categorySlug = CATEGORY_TO_SLUG[dbUnit.category] || normalizedSlug;
      if (!baseDetail) {
        baseDetail = DEFAULT_UNIT_DETAILS[categorySlug] || DEFAULT_UNIT_DETAILS["geodesic-dome"];
      }

      // Map database photos if present
      const photos: UnitDetailPhoto[] =
        dbUnit.photos.length > 0
          ? dbUnit.photos.map((p, idx) => ({
              id: p.id,
              url: p.url,
              alt: p.altText || p.caption || `${dbUnit.name} photo ${idx + 1}`,
              caption: p.caption || p.description || null,
              isFeatured: p.isFeatured,
              orderIndex: p.orderIndex ?? idx + 1,
            }))
          : baseDetail.photos;

      // Ensure at least one photo is designated featured
      if (!photos.some((p) => p.isFeatured) && photos.length > 0) {
        photos[0].isFeatured = true;
      }

      const overnightSlab = dbUnit.priceList?.slabs?.find((s) => s.stayType === "OVERNIGHT");
      const daySlotSlab = dbUnit.priceList?.slabs?.find((s) => s.stayType === "DAY_SLOT");
      const morningSlab = dbUnit.priceList?.slabs?.find((s) => s.stayType === "MORNING_SLOT");
      const eveningSlab = dbUnit.priceList?.slabs?.find((s) => s.stayType === "EVENING_SLOT");

      const isHall =
        dbUnit.category === "NON_AC_HALL" ||
        dbUnit.category === "AC_HALL" ||
        dbUnit.category === "HALL";

      const displayRate = isHall
        ? morningSlab?.basePrice ? Math.round(morningSlab.basePrice) : baseDetail.pricing.displayRate
        : overnightSlab?.basePrice ? Math.round(overnightSlab.basePrice) : baseDetail.pricing.displayRate;

      return {
        ...baseDetail,
        id: dbUnit.id,
        name: dbUnit.name || baseDetail.name,
        category: dbUnit.category,
        isActive: dbUnit.isActive,
        status: dbUnit.isActive ? "AVAILABLE" : ("INACTIVE" as const),
        maxCapacity: dbUnit.maxCapacity || baseDetail.maxCapacity,
        maxInfants: dbUnit.maxInfants ?? baseDetail.maxInfants,
        pricing: {
          ...baseDetail.pricing,
          displayRate,
          overnightBaseRate: overnightSlab?.basePrice ? Math.round(overnightSlab.basePrice) : baseDetail.pricing.overnightBaseRate,
          daySlotBaseRate: daySlotSlab?.basePrice ? Math.round(daySlotSlab.basePrice) : baseDetail.pricing.daySlotBaseRate,
          hallMorningBaseRate: morningSlab?.basePrice ? Math.round(morningSlab.basePrice) : baseDetail.pricing.hallMorningBaseRate,
          hallEveningBaseRate: eveningSlab?.basePrice ? Math.round(eveningSlab.basePrice) : baseDetail.pricing.hallEveningBaseRate,
          requiredAdvance: overnightSlab?.requiredDeposit
            ? Math.round(overnightSlab.requiredDeposit)
            : baseDetail.pricing.requiredAdvance,
        },
        photos,
      };
    }
  } catch (err) {
    console.warn("Prisma unit detail resolution fallback for slug:", slug, err);
  }

  return baseDetail;
}

export function generateStaticParams() {
  return [
    { slug: "geodesic-dome" },
    { slug: "scenic-a-frame" },
    { slug: "non-ac-hall" },
    { slug: "ac-hall" },
  ];
}

export const dynamicParams = true;

/**
 * Dynamic Metadata Generation per Next.js 16
 */
export async function generateMetadata({ params }: StayDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const unit = await resolveUnitDetail(slug);

  if (!unit) {
    return {
      title: "Stay Not Found | Parlak Resort & Farmhouse",
      description: "The requested accommodation or venue does not exist.",
    };
  }

  return {
    title: unit.seoMeta.title,
    description: unit.seoMeta.description,
    alternates: {
      canonical: `/stays/${unit.slug}`,
    },
    openGraph: {
      title: unit.seoMeta.title,
      description: unit.seoMeta.description,
      url: unit.seoMeta.canonicalUrl,
      siteName: "Parlak Resort & Farmhouse",
      images: [
        {
          url: unit.seoMeta.ogImage,
          width: 1200,
          height: 630,
          alt: `${unit.name} - Parlak Resort Keralam`,
        },
      ],
      locale: "en_IN",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: unit.seoMeta.title,
      description: unit.seoMeta.description,
      images: [unit.seoMeta.ogImage],
    },
  };
}

/**
 * Helper to match icons to amenities
 */
function getAmenityIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("kettle") || lower.includes("coffee") || lower.includes("tea")) {
    return <Coffee className="size-4 text-primary shrink-0" />;
  }
  if (lower.includes("water") || lower.includes("mineral")) {
    return <Droplets className="size-4 text-primary shrink-0" />;
  }
  if (lower.includes("bbq") || lower.includes("grill")) {
    return <Flame className="size-4 text-primary shrink-0" />;
  }
  if (lower.includes("air condition") || lower.includes("ac") || lower.includes("climate")) {
    return <Wind className="size-4 text-primary shrink-0" />;
  }
  if (lower.includes("wi-fi") || lower.includes("wifi") || lower.includes("internet")) {
    return <Wifi className="size-4 text-primary shrink-0" />;
  }
  if (lower.includes("tv") || lower.includes("streaming")) {
    return <Tv className="size-4 text-primary shrink-0" />;
  }
  if (lower.includes("pool") || lower.includes("swimming")) {
    return <Waves className="size-4 text-primary shrink-0" />;
  }
  if (lower.includes("bed") || lower.includes("queen") || lower.includes("double")) {
    return <Bed className="size-4 text-primary shrink-0" />;
  }
  return <Sparkles className="size-4 text-primary shrink-0" />;
}

/**
 * Dynamic Accommodation Stay Detail & Interactive Booking Engine (`/stays/[slug]`)
 */
export default async function StayDetailPage({
  params,
  searchParams,
}: StayDetailPageProps) {
  // Await params & searchParams per Next.js 16 async pattern
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const unit = await resolveUnitDetail(slug);

  if (!unit) {
    notFound();
  }

  const isHall =
    unit.category === "NON_AC_HALL" ||
    unit.category === "AC_HALL" ||
    unit.category === "HALL";

  // Structured schema for search engines (Schema.org HotelRoom or EventVenue)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": isHall ? "EventVenue" : "HotelRoom",
    name: unit.name,
    description: unit.description,
    image: unit.photos.map((p) => p.url),
    url: unit.seoMeta.canonicalUrl,
    occupancy: {
      "@type": "QuantitativeValue",
      maxValue: unit.maxCapacity,
      unitCode: "C62",
    },
    amenityFeature: [
      ...unit.amenities.standard,
      ...unit.amenities.variable,
    ].map((amenity) => ({
      "@type": "LocationFeatureSpecification",
      name: amenity,
      value: true,
    })),
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Search Engine Structured Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 pb-24 md:pb-12 w-full min-w-0">
        {/* 1. Breadcrumbs Trail */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground flex-wrap">
            <li>
              <Link href="/" className="hover:text-foreground transition-colors">
                Home
              </Link>
            </li>
            <li>
              <ChevronRight className="size-3 text-muted-foreground/60" />
            </li>
            <li>
              <Link href="/stays" className="hover:text-foreground transition-colors">
                Stays &amp; Venues
              </Link>
            </li>
            <li>
              <ChevronRight className="size-3 text-muted-foreground/60" />
            </li>
            <li className="font-semibold text-foreground truncate max-w-[200px]" aria-current="page">
              {unit.name}
            </li>
          </ol>
        </nav>

        {/* 2. Hero Header Title & Quick Badges */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary font-mono bg-surface-subtle border border-border/60 px-2.5 py-0.5 rounded-full select-none">
                {unit.categoryLabel}
              </span>

              {unit.isActive ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-950 bg-emerald-100 dark:bg-emerald-950/80 dark:text-emerald-200 px-2.5 py-0.5 rounded-full font-mono select-none">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span>Available</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-950 bg-amber-100 dark:bg-amber-950/80 dark:text-amber-200 px-2.5 py-0.5 rounded-full font-mono select-none">
                  <AlertCircle className="size-3 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>{unit.badge || "Sold Out"}</span>
                </span>
              )}

              <span className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full">
                <Users className="size-3 text-primary shrink-0" />
                <span>{unit.capacityBadge}</span>
              </span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-foreground font-normal tracking-tight">
              {unit.name}
            </h1>
          </div>

          {/* Rate Callout on Desktop */}
          <div className="hidden md:flex flex-col items-end shrink-0">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Starting from
            </span>
            <div className="flex items-baseline gap-1">
              <span className="font-mono tabular-nums text-3xl font-bold text-foreground">
                ₹&nbsp;{unit.pricing.displayRate.toLocaleString("en-IN")}
              </span>
              <span className="text-xs text-muted-foreground font-normal">
                {unit.pricing.rateLabel}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Hero Photo Gallery with 36px–48px Thumbnail Strip & Lightbox */}
        <div className="mb-12">
          <UnitHeroGallery
            photos={unit.photos}
            unitName={unit.name}
            badge={unit.badge}
          />
        </div>

        {/* 4. Two-Column Architectural Canvas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left Column: Specifications, Amenities, and Policies */}
          <div className="lg:col-span-7 xl:col-span-7 space-y-12 min-w-0">
            {/* Overview Section */}
            <section aria-labelledby="overview-heading" className="space-y-4">
              <h2 id="overview-heading" className="font-serif text-2xl text-foreground font-medium">
                Overview &amp; Experience
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {unit.description}
              </p>

              {/* Curated Highlights Chips */}
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground font-mono">
                  Stay highlights
                </h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-foreground/90 font-medium">
                  {unit.highlights.map((highlight) => (
                    <li key={highlight} className="flex items-start gap-2 bg-surface-subtle p-2.5 rounded-lg border border-border/40">
                      <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Hairline Divider */}
            <div className="border-b border-border/60" />

            {/* Specifications Matrix or Venue Specifications */}
            {isHall ? (
              <VenueSpecsGrid
                unitCategory={unit.category}
                maxCapacity={unit.maxCapacity}
              />
            ) : (
              <>
                {/* Specifications Matrix */}
                <section aria-labelledby="specs-heading" className="space-y-4">
                  <h2 id="specs-heading" className="font-serif text-2xl text-foreground font-medium">
                    Unit Specifications
                  </h2>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                    {unit.specifications.bedding && (
                      <div className="p-3 rounded-xl bg-surface-subtle border border-border/60 space-y-1">
                        <span className="text-[11px] text-muted-foreground block font-sans">
                          Bedding Setup
                        </span>
                        <span className="font-semibold text-foreground block">
                          {unit.specifications.bedding}
                        </span>
                      </div>
                    )}

                    {unit.specifications.view && (
                      <div className="p-3 rounded-xl bg-surface-subtle border border-border/60 space-y-1">
                        <span className="text-[11px] text-muted-foreground block font-sans">
                          Surroundings &amp; View
                        </span>
                        <span className="font-semibold text-foreground block">
                          {unit.specifications.view}
                        </span>
                      </div>
                    )}

                    {unit.specifications.climate && (
                      <div className="p-3 rounded-xl bg-surface-subtle border border-border/60 space-y-1">
                        <span className="text-[11px] text-muted-foreground block font-sans">
                          Climate Control
                        </span>
                        <span className="font-semibold text-foreground block">
                          {unit.specifications.climate}
                        </span>
                      </div>
                    )}

                    {unit.specifications.bathroom && (
                      <div className="p-3 rounded-xl bg-surface-subtle border border-border/60 space-y-1">
                        <span className="text-[11px] text-muted-foreground block font-sans">
                          Bath &amp; Sanitization
                        </span>
                        <span className="font-semibold text-foreground block">
                          {unit.specifications.bathroom}
                        </span>
                      </div>
                    )}

                    {unit.specifications.totalInventoryUnits && (
                      <div className="p-3 rounded-xl bg-surface-subtle border border-border/60 space-y-1">
                        <span className="text-[11px] text-muted-foreground block font-sans">
                          Total Category Inventory
                        </span>
                        <span className="font-semibold text-foreground block tabular-nums">
                          {unit.specifications.totalInventoryUnits}&nbsp;Units
                        </span>
                      </div>
                    )}

                    <div className="p-3 rounded-xl bg-surface-subtle border border-border/60 space-y-1">
                      <span className="text-[11px] text-muted-foreground block font-sans">
                        Pool Access
                      </span>
                      <span className="font-semibold text-foreground block">
                        Complimentary
                      </span>
                    </div>
                  </div>
                </section>

                {/* Hairline Divider */}
                <div className="border-b border-border/60" />

                {/* Amenities Grid */}
                <section aria-labelledby="amenities-heading" className="space-y-6">
                  <div>
                    <h2 id="amenities-heading" className="font-serif text-2xl text-foreground font-medium">
                      Amenities &amp; Provisions
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Carefully equipped to guarantee absolute convenience throughout your time with us.
                    </p>
                  </div>

                  {/* Standard Baseline Hardcoded Provisions */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                      Standard in-room provisions
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {unit.amenities.standard.map((amenity) => (
                        <div
                          key={amenity}
                          className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/70 text-xs font-medium text-foreground"
                        >
                          <div className="size-8 rounded-lg bg-surface-subtle border border-border/60 flex items-center justify-center shrink-0">
                            {getAmenityIcon(amenity)}
                          </div>
                          <span>{amenity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic Modern Comforts */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                      Resort features &amp; comforts
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {unit.amenities.variable.map((amenity) => (
                        <div
                          key={amenity}
                          className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/70 text-xs font-medium text-foreground"
                        >
                          <div className="size-8 rounded-lg bg-surface-subtle border border-border/60 flex items-center justify-center shrink-0">
                            {getAmenityIcon(amenity)}
                          </div>
                          <span>{amenity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* Hairline Divider */}
            <div className="border-b border-border/60" />

            {/* Operational Policies & House Standards */}
            <section aria-labelledby="policies-heading" className="space-y-4">
              <h2 id="policies-heading" className="font-serif text-2xl text-foreground font-medium">
                Operational Policies &amp; House Rules
              </h2>

              <div className="space-y-3 text-xs leading-relaxed">
                {/* Timings */}
                <div className="p-4 rounded-xl bg-surface-subtle border border-border/60 space-y-1">
                  <div className="flex items-center gap-2 text-foreground font-semibold font-sans">
                    <Clock className="size-4 text-primary shrink-0" />
                    <span>Standard Operating Windows</span>
                  </div>
                  <p className="text-muted-foreground font-mono text-[11px] mt-1">
                    {unit.policies.timingsRule}
                  </p>
                </div>

                {/* Occupancy Caps */}
                <div className="p-4 rounded-xl bg-surface-subtle border border-border/60 space-y-1">
                  <div className="flex items-center gap-2 text-foreground font-semibold font-sans">
                    <ShieldCheck className="size-4 text-primary shrink-0" />
                    <span>Occupancy &amp; Bedding Law</span>
                  </div>
                  <p className="text-muted-foreground font-mono text-[11px] mt-1">
                    {unit.policies.capacityRule}
                  </p>
                </div>

                {/* Pool Policy */}
                <div className="p-4 rounded-xl bg-surface-subtle border border-border/60 space-y-1">
                  <div className="flex items-center gap-2 text-foreground font-semibold font-sans">
                    <Waves className="size-4 text-primary shrink-0" />
                    <span>Swimming Pool Policy</span>
                  </div>
                  <p className="text-muted-foreground font-mono text-[11px] mt-1">
                    {unit.policies.poolPolicy}
                  </p>
                </div>

                {/* Advance & Cancellation */}
                <div className="p-4 rounded-xl bg-surface-subtle border border-border/60 space-y-1">
                  <div className="flex items-center gap-2 text-foreground font-semibold font-sans">
                    <AlertCircle className="size-4 text-primary shrink-0" />
                    <span>Booking Advance &amp; Cancellation Policy</span>
                  </div>
                  <p className="text-muted-foreground font-mono text-[11px] mt-1">
                    {unit.policies.advancePolicy}&nbsp;{unit.policies.cancellationPolicy}
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Interactive Booking Engine Card (Desktop Sticky) */}
          <div className="lg:col-span-5 xl:col-span-5 w-full min-w-0">
            <div className="lg:sticky lg:top-24">
              {isHall ? (
                <HallInquiryEngine
                  unitCategory={unit.category as "NON_AC_HALL" | "AC_HALL"}
                  venueName={unit.name}
                  unitId={unit.id}
                  maxCapacity={unit.maxCapacity}
                  isActive={unit.isActive}
                  initialSlotType={
                    resolvedSearchParams?.slotType === "EVENING_SLOT"
                      ? "EVENING_SLOT"
                      : resolvedSearchParams?.slotType === "MORNING_SLOT"
                      ? "MORNING_SLOT"
                      : undefined
                  }
                  initialDate={resolvedSearchParams?.date}
                />
              ) : (
                <StayBookingEngine
                  unitCategory={unit.category as "DOME" | "A_FRAME"}
                  unitName={unit.name}
                  totalInventoryUnits={unit.specifications.totalInventoryUnits || (unit.category === "DOME" ? 4 : 3)}
                  overnightBaseRate={unit.pricing.overnightBaseRate || unit.pricing.displayRate}
                  daySlotBaseRate={unit.pricing.daySlotBaseRate || 2500}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      {/* 5. Mobile Sticky Bottom Action Bar */}
      <StickyMobileBookingBar
        unitName={unit.name}
        categoryLabel={unit.categoryLabel}
        startingRate={unit.pricing.displayRate}
        rateLabel={unit.pricing.rateLabel}
        targetElementId="booking-card"
      />
    </div>
  );
}
