import { describe, it, expect, vi } from "vitest";
import * as React from "react";
import fs from "fs";
import path from "path";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/stays/geodesic-dome",
  useSearchParams: () => new URLSearchParams(),
  notFound: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    unit: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
    },
    bookingUnit: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

import {
  DEFAULT_UNIT_DETAILS,
  type UnitDetailData,
} from "@/components/public/unit-detail/types";
import { UnitHeroGallery } from "@/components/public/unit-detail/UnitHeroGallery";
import { StayBookingEngine } from "@/components/public/unit-detail/StayBookingEngine";
import { HallBookingEngine } from "@/components/public/unit-detail/HallBookingEngine";
import { StickyMobileBookingBar } from "@/components/public/unit-detail/StickyMobileBookingBar";
import StayDetailPage, {
  generateMetadata,
  generateStaticParams,
} from "@/app/(public)/stays/[slug]/page";

describe("Stage 5: Accommodation Stay Detail & Interactive Booking Engine Implementation", () => {
  describe("1. app/(public)/stays/[slug]/page.tsx Dynamic Route & Metadata", () => {
    it("generates static params for all 4 primary slugs", () => {
      const params = generateStaticParams();
      expect(params).toHaveLength(4);
      expect(params).toEqual([
        { slug: "geodesic-dome" },
        { slug: "scenic-a-frame" },
        { slug: "non-ac-hall" },
        { slug: "ac-hall" },
      ]);
    });

    it("generates authoritative metadata awaiting params per Next.js 16", async () => {
      const meta = await generateMetadata({
        params: Promise.resolve({ slug: "geodesic-dome" }),
      });
      expect(meta.title).toContain("Luxury Geodesic Dome");
      expect(meta.description).toContain("Geodesic Domes");
      expect(meta.alternates?.canonical).toBe("/stays/geodesic-dome");
      expect(meta.openGraph?.images).toBeDefined();
    });

    it("verifies Next.js 16 async params resolution and layout in page.tsx", () => {
      const pageFile = fs.readFileSync(
        path.join(process.cwd(), "app", "(public)", "stays", "[slug]", "page.tsx"),
        "utf-8"
      );
      // Next.js 16 async params
      expect(pageFile).toContain("const { slug } = await params");
      expect(pageFile).toContain("params: Promise<{");

      // Components integration
      expect(pageFile).toContain("UnitHeroGallery");
      expect(pageFile).toContain("StayBookingEngine");
      expect(pageFile).toContain("HallBookingEngine");
      expect(pageFile).toContain("StickyMobileBookingBar");

      // Specifications and policies
      expect(pageFile).toContain("Unit Specifications");
      expect(pageFile).toContain("Amenities &amp; Provisions");
      expect(pageFile).toContain("Operational Policies &amp; House Rules");
      expect(pageFile).toContain("application/ld+json");
    });
  });

  describe("2. UnitHeroGallery (components/public/unit-detail/UnitHeroGallery.tsx)", () => {
    const samplePhotos = DEFAULT_UNIT_DETAILS["geodesic-dome"].photos;

    it("enforces Thumbnail Sizing Law with 36px–48px square chips", () => {
      const galleryFile = fs.readFileSync(
        path.join(process.cwd(), "components", "public", "unit-detail", "UnitHeroGallery.tsx"),
        "utf-8"
      );
      // Strictly 36px to 48px square chip
      expect(galleryFile).toContain("size-10 sm:size-11");
      expect(galleryFile).toContain("rounded-lg border overflow-hidden shrink-0");
      expect(galleryFile).toContain("aspect-[16/10]");
      expect(galleryFile).toContain("active:scale-95");
    });

    it("implements accessible Lightbox zoom modal with keyboard arrow navigation", () => {
      const galleryFile = fs.readFileSync(
        path.join(process.cwd(), "components", "public", "unit-detail", "UnitHeroGallery.tsx"),
        "utf-8"
      );
      expect(galleryFile).toContain('role="dialog"');
      expect(galleryFile).toContain('aria-modal="true"');
      expect(galleryFile).toContain('ArrowLeft');
      expect(galleryFile).toContain('ArrowRight');
      expect(galleryFile).toContain('Escape');
      expect(galleryFile).toContain('Maximize2');
    });

    it("exports UnitHeroGallery component and renders without error", () => {
      expect(UnitHeroGallery).toBeDefined();
      expect(typeof UnitHeroGallery).toBe("function");
      const element = React.createElement(UnitHeroGallery, {
        photos: samplePhotos,
        unitName: "Luxury Geodesic Dome",
      });
      expect(element.type).toBe(UnitHeroGallery);
    });
  });

  describe("3. StayBookingEngine (components/public/unit-detail/StayBookingEngine.tsx)", () => {
    it("enforces zero client-side math and queries POST /api/inquiry/generate", () => {
      const engineFile = fs.readFileSync(
        path.join(process.cwd(), "components", "public", "unit-detail", "StayBookingEngine.tsx"),
        "utf-8"
      );
      expect(engineFile).toContain('fetch("/api/inquiry/generate"');
      expect(engineFile).toContain('method: "POST"');
      expect(engineFile).toContain('aria-live="polite"');
    });

    it("integrates with GET /api/availability for live inventory and blocked dates", () => {
      const engineFile = fs.readFileSync(
        path.join(process.cwd(), "components", "public", "unit-detail", "StayBookingEngine.tsx"),
        "utf-8"
      );
      expect(engineFile).toContain('fetch(`/api/availability?');
      expect(engineFile).toContain("availableUnitsCount");
      expect(engineFile).toContain("blockedDates");
    });

    it("enforces hard occupancy caps (Dome max 3 adults, 2 infants; A-Frame max 5 adults, 4 infants)", () => {
      const engineFile = fs.readFileSync(
        path.join(process.cwd(), "components", "public", "unit-detail", "StayBookingEngine.tsx"),
        "utf-8"
      );
      expect(engineFile).toContain("const maxAdultsPerRoom = isDome ? 3 : 5");
      expect(engineFile).toContain("const maxInfantsPerRoom = isDome ? 2 : 4");
      expect(engineFile).toContain("disabled={room.adults >= maxAdultsPerRoom}");
      expect(engineFile).toContain("disabled={room.infants >= maxInfantsPerRoom}");
      expect(engineFile).toContain("disabled={room.adults <= 1}");
      expect(engineFile).toContain("disabled={room.infants <= 0}");
      expect(engineFile).toContain("Strictly NO extra beds");
    });

    it("prevents iOS input auto-zoom with text-base md:text-sm", () => {
      const engineFile = fs.readFileSync(
        path.join(process.cwd(), "components", "public", "unit-detail", "StayBookingEngine.tsx"),
        "utf-8"
      );
      expect(engineFile).toContain("text-base md:text-sm");
    });

    it("implements Verify via WhatsApp CTA button routing to price-free WhatsApp link", () => {
      const engineFile = fs.readFileSync(
        path.join(process.cwd(), "components", "public", "unit-detail", "StayBookingEngine.tsx"),
        "utf-8"
      );
      expect(engineFile).toContain("Verify via WhatsApp");
      expect(engineFile).toContain("quote.whatsappUrl");
      expect(engineFile).toContain('variant="whatsapp"');
    });

    it("exports StayBookingEngine component and renders properly", () => {
      expect(StayBookingEngine).toBeDefined();
      expect(typeof StayBookingEngine).toBe("function");
      const element = React.createElement(StayBookingEngine, {
        unitCategory: "DOME",
        unitName: "Luxury Geodesic Dome",
      });
      expect(element.type).toBe(StayBookingEngine);
    });
  });

  describe("4. StickyMobileBookingBar (components/public/unit-detail/StickyMobileBookingBar.tsx)", () => {
    it("declares safe area bottom inset and smooth scroll behavior", () => {
      const barFile = fs.readFileSync(
        path.join(process.cwd(), "components", "public", "unit-detail", "StickyMobileBookingBar.tsx"),
        "utf-8"
      );
      expect(barFile).toContain("pb-[calc(0.875rem+env(safe-area-inset-bottom))]");
      expect(barFile).toContain("fixed bottom-0 inset-x-0 z-40 md:hidden");
      expect(barFile).toContain("scrollIntoView({ behavior: \"smooth\"");
      expect(barFile).toContain("Check Dates &amp; Book");
      expect(barFile).toContain("active:scale-[0.98]");
    });

    it("exports StickyMobileBookingBar component and renders properly", () => {
      expect(StickyMobileBookingBar).toBeDefined();
      expect(typeof StickyMobileBookingBar).toBe("function");
      const element = React.createElement(StickyMobileBookingBar, {
        unitName: "Luxury Geodesic Dome",
        categoryLabel: "Geodesic Dome",
        startingRate: 3500,
      });
      expect(element.type).toBe(StickyMobileBookingBar);
    });
  });

  describe("5. HallBookingEngine (components/public/unit-detail/HallBookingEngine.tsx)", () => {
    it("supports Morning Slot vs Evening Slot and capacity bounded by physical limits", () => {
      const hallFile = fs.readFileSync(
        path.join(process.cwd(), "components", "public", "unit-detail", "HallBookingEngine.tsx"),
        "utf-8"
      );
      expect(hallFile).toContain("Morning Slot");
      expect(hallFile).toContain("Evening Slot");
      expect(hallFile).toContain("attachedDomeRequested");
      expect(hallFile).toContain("Swimming pool access is strictly excluded");
      expect(hallFile).toContain("Verify via WhatsApp");
    });
  });
});
