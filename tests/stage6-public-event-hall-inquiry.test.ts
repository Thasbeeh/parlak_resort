import { describe, it, expect, vi } from "vitest";
import * as React from "react";
import fs from "fs";
import path from "path";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/stays/non-ac-hall",
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

import { VenueSpecsGrid } from "@/components/public/unit-detail/VenueSpecsGrid";
import { HallInquiryEngine } from "@/components/public/unit-detail/HallInquiryEngine";
import { HallBookingEngine } from "@/components/public/unit-detail/HallBookingEngine";
import {
  generateMetadata,
  generateStaticParams,
} from "@/app/(public)/stays/[slug]/page";

describe("Stage 6: Event Venues Detail & Inquiry Engine Implementation", () => {
  describe("1. app/(public)/stays/[slug]/page.tsx Conditional Rendering", () => {
    it("generates static params containing both non-ac-hall and ac-hall", () => {
      const params = generateStaticParams();
      expect(params).toContainEqual({ slug: "non-ac-hall" });
      expect(params).toContainEqual({ slug: "ac-hall" });
    });

    it("generates metadata for Non-AC Event Hall awaiting params per Next.js 16", async () => {
      const meta = await generateMetadata({
        params: Promise.resolve({ slug: "non-ac-hall" }),
      });
      expect(meta.title).toContain("Non-AC Event Hall");
      expect(meta.description).toContain("Parlak Resort");
      expect(meta.alternates?.canonical).toBe("/stays/non-ac-hall");
    });

    it("conditionally renders HallInquiryEngine and VenueSpecsGrid when isHall is true", () => {
      const pageFile = fs.readFileSync(
        path.join(process.cwd(), "app", "(public)", "stays", "[slug]", "page.tsx"),
        "utf-8"
      );

      // Imports
      expect(pageFile).toContain("HallInquiryEngine");
      expect(pageFile).toContain("VenueSpecsGrid");

      // Conditional rendering
      expect(pageFile).toContain("<VenueSpecsGrid");
      expect(pageFile).toContain("<HallInquiryEngine");
      expect(pageFile).toContain("isHall");
    });
  });

  describe("2. VenueSpecsGrid (components/public/unit-detail/VenueSpecsGrid.tsx)", () => {
    const specsFile = fs.readFileSync(
      path.join(process.cwd(), "components", "public", "unit-detail", "VenueSpecsGrid.tsx"),
      "utf-8"
    );

    it("renders stage specifications dais, audio conduits, and lighting provisions", () => {
      expect(specsFile).toContain("Elevated presentation stage");
      expect(specsFile).toContain("Dais");
      expect(specsFile).toContain("Concealed audio-visual wiring ducts");
    });

    it("renders high-capacity diesel generator backup ensuring 100% uninterrupted power", () => {
      expect(specsFile).toContain("Diesel generator backup");
      expect(specsFile).toContain("100% Continuous power");
      expect(specsFile).toContain("Automatic mains-failure switchover");
    });

    it("renders banquet seating layout and capacity ceiling", () => {
      expect(specsFile).toContain("Banquet seating layout");
      expect(specsFile).toContain("Round and row banquet table arrangements");
    });

    it("prominently renders the Strict Swimming Pool Exclusion Notice", () => {
      expect(specsFile).toContain("Strict Swimming Pool Exclusion Notice");
      expect(specsFile).toContain("Swimming pool access is strictly forbidden for event attendees under all circumstances");
      expect(specsFile).toContain("Zero pool access");
      expect(specsFile).toContain("Exclusive privacy preserved for room residents");
    });

    it("exports VenueSpecsGrid component and instantiates without error", () => {
      expect(typeof VenueSpecsGrid).toBe("function");
      const element = React.createElement(VenueSpecsGrid, {
        unitCategory: "NON_AC_HALL",
        maxCapacity: 1200,
      });
      expect(element.type).toBe(VenueSpecsGrid);
    });
  });

  describe("3. HallInquiryEngine (components/public/unit-detail/HallInquiryEngine.tsx)", () => {
    const inquiryFile = fs.readFileSync(
      path.join(process.cwd(), "components", "public", "unit-detail", "HallInquiryEngine.tsx"),
      "utf-8"
    );

    it("implements slot selector with Morning Slot (10:00 AM – 3:00 PM) and Evening Slot (5:00 PM – 10:00 PM)", () => {
      expect(inquiryFile).toContain("Morning Slot");
      expect(inquiryFile).toContain("10:00&nbsp;AM – 3:00&nbsp;PM");
      expect(inquiryFile).toContain("Evening Slot");
      expect(inquiryFile).toContain("5:00&nbsp;PM – 10:00&nbsp;PM");
      expect(inquiryFile).toContain("MORNING_SLOT");
      expect(inquiryFile).toContain("EVENING_SLOT");
    });

    it("checks slot availability via GET /api/availability", () => {
      expect(inquiryFile).toContain("/api/availability");
      expect(inquiryFile).toContain("Slot Available");
      expect(inquiryFile).toContain("Slot Reserved");
      expect(inquiryFile).toContain("Checking slot");
    });

    it("contains contiguous slabs reference table with active headcount highlighting", () => {
      expect(inquiryFile).toContain("rate slabs reference");
      expect(inquiryFile).toContain("border-collapse");
      expect(inquiryFile).toContain("border-b border-border/60");
      expect(inquiryFile).toContain("minHeadcount");
      expect(inquiryFile).toContain("maxHeadcount");
    });

    it("implements Minimum Slab Floor rule: Headcount below lowest slab matches opening fee without erroring", () => {
      expect(inquiryFile).toContain("Minimum opening fee applies for headcounts under");
      expect(inquiryFile).toContain("isFloorActive");
      expect(inquiryFile).toContain("Floor applied");
    });

    it("automatically selects attached Dome as complimentary perk for headcount >= 400 Pax and on-request for < 400 Pax", () => {
      expect(inquiryFile).toContain("headcount >= 400");
      expect(inquiryFile).toContain("Complimentary perk");
      expect(inquiryFile).toContain("400&nbsp;Pax");
      expect(inquiryFile).toContain("attachedDomeRequested");
    });

    it("fetches on-screen estimate breakdown from POST /api/inquiry/generate", () => {
      expect(inquiryFile).toContain("/api/inquiry/generate");
      expect(inquiryFile).toContain("Estimated venue quote");
      expect(inquiryFile).toContain("Required booking advance");
      expect(inquiryFile).toContain("Balance due at event");
      expect(inquiryFile).toContain("On-screen estimate only");
    });

    it("provides primary CTA routing to price-free WhatsApp link", () => {
      expect(inquiryFile).toContain("Verify via WhatsApp");
      expect(inquiryFile).toContain("whatsappUrl");
      expect(inquiryFile).toContain("active:scale-[0.98]");
    });

    it("includes the strict pool exclusion notice in the inquiry card", () => {
      expect(inquiryFile).toContain("Swimming pool access is strictly excluded for event attendees under all circumstances");
    });

    it("exports HallInquiryEngine and backward-compatible HallBookingEngine", () => {
      expect(typeof HallInquiryEngine).toBe("function");
      expect(typeof HallBookingEngine).toBe("function");

      const element1 = React.createElement(HallInquiryEngine, {
        unitCategory: "NON_AC_HALL",
        venueName: "Non-AC Event Hall",
      });
      expect(element1.type).toBe(HallInquiryEngine);

      const element2 = React.createElement(HallBookingEngine, {
        unitCategory: "NON_AC_HALL",
        venueName: "Non-AC Event Hall",
      });
      expect(element2.type).toBe(HallBookingEngine);
    });
  });
});
