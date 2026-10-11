/**
 * Parlak Resort - Catalog Listing Data Contracts & Types
 * 
 * Defines entities, filter keys, pricing structures, and default showcase units
 * adhering to docs/website/stays.md and docs/website/unit_detail.md.
 */

export type CategoryTabKey = "ALL" | "DOMES" | "A_FRAMES" | "EVENT_HALLS";

export interface CategoryTab {
  key: CategoryTabKey;
  label: string;
  count: number;
}

export interface CatalogUnitPricing {
  displayRate: number;
  rateLabel: string; // e.g. "/ night" or "starting slab"
  daySlotRate?: number;
  advancePayment?: number;
}

export interface CatalogUnitPhoto {
  url: string;
  alt: string;
}

export interface CatalogUnitItem {
  id: string;
  slug: string;
  name: string;
  category: "DOME" | "A_FRAME" | "NON_AC_HALL" | "AC_HALL" | string;
  categoryLabel: string;
  capacityBadge: string;
  maxCapacity: number;
  pricing: CatalogUnitPricing;
  featuredPhoto: CatalogUnitPhoto;
  amenitiesSummary: string[];
  isActive: boolean;
  status: "AVAILABLE" | "INACTIVE" | "SOLD_OUT";
  badge?: string;
  ctaText: string;
  detailRoute: string;
}

/**
 * Curated fallback catalog items matching docs/website/stays.md
 * Guarantees zero downtime and resilient build rendering if database connection is suspended.
 */
export const DEFAULT_CATALOG_UNITS: CatalogUnitItem[] = [
  {
    id: "unit-dome-01",
    slug: "geodesic-dome",
    name: "Luxury Geodesic Dome",
    category: "DOME",
    categoryLabel: "Geodesic Dome",
    capacityBadge: "Up to 3\u00A0Adults per unit",
    maxCapacity: 3,
    pricing: {
      displayRate: 3500,
      rateLabel: "/\u00A0night",
      daySlotRate: 2500,
      advancePayment: 2000,
    },
    featuredPhoto: {
      url: "https://res.cloudinary.com/parlak-resort/image/upload/v1/units/dome_main.webp",
      alt: "Panoramic luxury geodesic dome at sunset with warm ambient lighting",
    },
    amenitiesSummary: ["AC", "Wi-Fi", "Pool Access", "Attached Bath", "BBQ Grill Setup"],
    isActive: true,
    status: "AVAILABLE",
    badge: "Popular stay",
    ctaText: "View Details & Book",
    detailRoute: "/stays/geodesic-dome",
  },
  {
    id: "unit-aframe-01",
    slug: "scenic-a-frame",
    name: "Scenic A-Frame Chalet",
    category: "A_FRAME",
    categoryLabel: "A-Frame Chalet",
    capacityBadge: "Up to 5\u00A0Adults per unit",
    maxCapacity: 5,
    pricing: {
      displayRate: 5000,
      rateLabel: "/\u00A0night",
      daySlotRate: 3500,
      advancePayment: 2000,
    },
    featuredPhoto: {
      url: "https://res.cloudinary.com/parlak-resort/image/upload/v1/units/aframe_main.webp",
      alt: "Two-level A-Frame chalet facing lush meadow gardens",
    },
    amenitiesSummary: ["Double + Queen Beds", "AC", "Wi-Fi", "Pool Access", "Attached Bath"],
    isActive: true,
    status: "AVAILABLE",
    badge: "Family suite",
    ctaText: "View Details & Book",
    detailRoute: "/stays/scenic-a-frame",
  },
  {
    id: "unit-hall-non-ac",
    slug: "non-ac-hall",
    name: "Non-AC Event Hall",
    category: "NON_AC_HALL",
    categoryLabel: "Event Hall",
    capacityBadge: "Up to 1,200\u00A0Guests",
    maxCapacity: 1200,
    pricing: {
      displayRate: 10000,
      rateLabel: "/\u00A0slot",
      advancePayment: 5000,
    },
    featuredPhoto: {
      url: "https://res.cloudinary.com/parlak-resort/image/upload/v1/units/hall_non_ac_main.webp",
      alt: "Open banquet hall setup with illuminated presentation stage",
    },
    amenitiesSummary: ["Presentation Stage", "Diesel Generator", "Banquet Seating", "Pool Access Excluded"],
    isActive: true,
    status: "AVAILABLE",
    badge: "Grand celebrations",
    ctaText: "View Details & Inquire",
    detailRoute: "/stays/non-ac-hall",
  },
  {
    id: "unit-hall-ac",
    slug: "ac-hall",
    name: "AC Grand Ballroom & Hall",
    category: "AC_HALL",
    categoryLabel: "Event Hall",
    capacityBadge: "Up to 2,000\u00A0Guests",
    maxCapacity: 2000,
    pricing: {
      displayRate: 75000,
      rateLabel: "/\u00A0slot",
      advancePayment: 15000,
    },
    featuredPhoto: {
      url: "https://res.cloudinary.com/parlak-resort/image/upload/v1/units/hall_ac_render.webp",
      alt: "Modern air-conditioned event auditorium architectural render",
    },
    amenitiesSummary: ["Central AC", "Acoustic Stage", "Diesel Generator", "Pool Access Excluded"],
    isActive: true,
    status: "AVAILABLE",
    badge: "Grand Convention",
    ctaText: "View Details & Inquire",
    detailRoute: "/stays/ac-hall",
  },
];
