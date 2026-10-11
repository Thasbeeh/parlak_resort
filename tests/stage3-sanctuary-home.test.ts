import { describe, it, expect, vi } from "vitest";
import * as React from "react";
import fs from "fs";
import path from "path";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));

import { HeroSection } from "@/components/public/home/HeroSection";
import { QuickCheckBar } from "@/components/public/home/QuickCheckBar";
import { PromoBanner } from "@/components/public/home/PromoBanner";
import { FeaturedGrid } from "@/components/public/home/FeaturedGrid";
import { AmenitiesStrip } from "@/components/public/home/AmenitiesStrip";
import { ExperiencesStrip } from "@/components/public/home/ExperiencesStrip";
import { FaqAccordion, HOME_FAQS, HOME_FAQ_JSONLD } from "@/components/public/home/FaqAccordion";
import { metadata as homeMetadata } from "@/app/(public)/page";

describe("Stage 3: Sanctuary Home Landing Page Implementation", () => {
  describe("1. app/(public)/page.tsx Server Component & Metadata", () => {
    it("exports comprehensive page metadata matching home.md and seo.md", () => {
      expect(homeMetadata).toBeDefined();
      expect(homeMetadata.title).toContain("Parlak Resort & Farmhouse");
      expect(homeMetadata.description).toContain("Geodesic Domes");
      expect(homeMetadata.openGraph?.images).toBeDefined();
    });

    it("verifies Promise.all parallel database queries in page.tsx", () => {
      const pageFile = fs.readFileSync(
        path.join(process.cwd(), "app", "(public)", "page.tsx"),
        "utf-8"
      );
      expect(pageFile).toContain("Promise.all");
      expect(pageFile).toContain("prisma.priceModifier");
      expect(pageFile).toContain("prisma.unit");
      expect(pageFile).toContain("SEASONAL");
    });
  });

  describe("2. HeroSection Component (components/public/home/HeroSection.tsx)", () => {
    it("renders full-canvas atmospheric hero with Fraunces headline and priority LCP optimization", () => {
      const heroFile = fs.readFileSync(
        path.join(process.cwd(), "components", "public", "home", "HeroSection.tsx"),
        "utf-8"
      );
      expect(heroFile).toContain("min-h-[100svh]");
      expect(heroFile).toContain("font-serif");
      expect(heroFile).toContain("Just be in the, നല്ല നേരം");
      expect(heroFile).toContain("priority={true}");
      expect(heroFile).toContain('fetchPriority="high"');
      expect(heroFile).toContain("/stays");
      expect(heroFile).toContain("QuickCheckBar");
    });

    it("exports HeroSection component", () => {
      expect(HeroSection).toBeDefined();
      expect(typeof HeroSection).toBe("function");
      const element = React.createElement(HeroSection);
      expect(element.type).toBe(HeroSection);
    });
  });

  describe("3. QuickCheckBar Component (components/public/home/QuickCheckBar.tsx)", () => {
    it("contains 4 segments: Category, Check-in, Check-out, Guests and routes to /stays", () => {
      const barFile = fs.readFileSync(
        path.join(process.cwd(), "components", "public", "home", "QuickCheckBar.tsx"),
        "utf-8"
      );
      expect(barFile).toContain("quick-check-category");
      expect(barFile).toContain("quick-check-in");
      expect(barFile).toContain("quick-check-out");
      expect(barFile).toContain("quick-check-guests");
      expect(barFile).toContain("/stays?");
      expect(barFile).toContain("appearance-none");
    });

    it("exports QuickCheckBar component", () => {
      expect(QuickCheckBar).toBeDefined();
      expect(typeof QuickCheckBar).toBe("function");
      const element = React.createElement(QuickCheckBar);
      expect(element.type).toBe(QuickCheckBar);
    });
  });

  describe("4. PromoBanner Component (components/public/home/PromoBanner.tsx)", () => {
    it("exports PromoBanner component", () => {
      expect(PromoBanner).toBeDefined();
      expect(typeof PromoBanner).toBe("function");
      const element = React.createElement(PromoBanner, { promotion: null });
      expect(element.type).toBe(PromoBanner);
    });

    it("defines SeasonalPromotion interface and renders conditionally based on active modifier", () => {
      const promoFile = fs.readFileSync(
        path.join(process.cwd(), "components", "public", "home", "PromoBanner.tsx"),
        "utf-8"
      );
      expect(promoFile).toContain("SeasonalPromotion");
      expect(promoFile).toContain("buildWhatsAppUrl");
      expect(promoFile).toContain("Verify via WhatsApp");
    });
  });

  describe("5. FeaturedGrid Component (components/public/home/FeaturedGrid.tsx)", () => {
    it("curates the 3 signature living spaces with non-breaking spaces and capacity rules", () => {
      const gridFile = fs.readFileSync(
        path.join(process.cwd(), "components", "public", "home", "FeaturedGrid.tsx"),
        "utf-8"
      );
      expect(gridFile).toContain("Luxury Geodesic Dome");
      expect(gridFile).toContain("Scenic A-Frame Chalet");
      expect(gridFile).toContain("Grand Open-Air Banquet Hall");
      expect(gridFile).toContain("Up to 3 Adults (Strict Cap)");
      expect(gridFile).toContain("Up to 5 Adults (Strict Cap)");
      expect(gridFile).toContain("Up to 1,200 Attendees");
      expect(gridFile).toContain("₹&nbsp;");
      expect(gridFile).toContain("3500");
      expect(gridFile).toContain("5000");
      expect(gridFile).toContain("10000");
    });

    it("exports FeaturedGrid component", () => {
      expect(FeaturedGrid).toBeDefined();
      expect(typeof FeaturedGrid).toBe("function");
      const element = React.createElement(FeaturedGrid);
      expect(element.type).toBe(FeaturedGrid);
    });
  });

  describe("6. AmenitiesStrip Component (components/public/home/AmenitiesStrip.tsx)", () => {
    it("displays the 4 essential riverfront amenities with visual badges", () => {
      const stripFile = fs.readFileSync(
        path.join(process.cwd(), "components", "public", "home", "AmenitiesStrip.tsx"),
        "utf-8"
      );
      expect(stripFile).toContain("Lush greenery");
      expect(stripFile).toContain("Designer pool");
      expect(stripFile).toContain("High-speed Wi-Fi");
      expect(stripFile).toContain("Food services till 10:30");
    });

    it("renders AmenitiesStrip functional component", () => {
      const element = AmenitiesStrip({});
      expect(element).toBeDefined();
      expect(element.type).toBe("section");
    });
  });

  describe("7. ExperiencesStrip Component (components/public/home/ExperiencesStrip.tsx)", () => {
    it("displays recreation cards with active and upcoming indicators", () => {
      const expFile = fs.readFileSync(
        path.join(process.cwd(), "components", "public", "home", "ExperiencesStrip.tsx"),
        "utf-8"
      );
      expect(expFile).toContain("Designer Swimming Pool");
      expect(expFile).toContain("Campfire & BBQ Experience");
      expect(expFile).toContain("Lush Lawn & Recreation");
      expect(expFile).toContain("Wetland Kayaking");
      expect(expFile).toContain("Scenic Floating Stage");
      expect(expFile).toContain("Active experience");
      expect(expFile).toContain("Upcoming / Under construction");
    });

    it("renders ExperiencesStrip functional component", () => {
      const element = ExperiencesStrip({});
      expect(element).toBeDefined();
      expect(element.type).toBe("section");
    });
  });

  describe("8. FaqAccordion Component (components/public/home/FaqAccordion.tsx)", () => {
    it("includes all 5 core questions covering timings, advance payments, pool exclusivity, dining, and occupancy caps", () => {
      expect(HOME_FAQS).toHaveLength(5);
      expect(HOME_FAQS[0].question).toContain("check-in and gathering timings");
      expect(HOME_FAQS[1].question).toContain("advance payment");
      expect(HOME_FAQS[2].question).toContain("swimming pool");
      expect(HOME_FAQS[3].question).toContain("outside food and dining");
      expect(HOME_FAQS[4].question).toContain("maximum guest limit");
    });

    it("includes valid FAQPage JSON-LD structured data schema", () => {
      expect(HOME_FAQ_JSONLD["@context"]).toBe("https://schema.org");
      expect(HOME_FAQ_JSONLD["@type"]).toBe("FAQPage");
      expect(HOME_FAQ_JSONLD.mainEntity).toHaveLength(5);
      expect(HOME_FAQ_JSONLD.mainEntity[0]["@type"]).toBe("Question");
    });

    it("exports FaqAccordion component", () => {
      expect(FaqAccordion).toBeDefined();
      expect(typeof FaqAccordion).toBe("function");
      const element = React.createElement(FaqAccordion);
      expect(element.type).toBe(FaqAccordion);
    });
  });

  describe("9. Below-the-fold content-visibility: auto Performance", () => {
    it("verifies content-visibility-auto is declared in globals.css and used in below-the-fold components", () => {
      const globalsCss = fs.readFileSync(
        path.join(process.cwd(), "app", "globals.css"),
        "utf-8"
      );
      expect(globalsCss).toContain("content-visibility: auto");
      expect(globalsCss).toContain("contain-intrinsic-size: 1px 700px");

      const amenitiesFile = fs.readFileSync(
        path.join(process.cwd(), "components", "public", "home", "AmenitiesStrip.tsx"),
        "utf-8"
      );
      const featuredFile = fs.readFileSync(
        path.join(process.cwd(), "components", "public", "home", "FeaturedGrid.tsx"),
        "utf-8"
      );
      const expFile = fs.readFileSync(
        path.join(process.cwd(), "components", "public", "home", "ExperiencesStrip.tsx"),
        "utf-8"
      );
      const faqFile = fs.readFileSync(
        path.join(process.cwd(), "components", "public", "home", "FaqAccordion.tsx"),
        "utf-8"
      );

      expect(amenitiesFile).toContain("content-visibility-auto");
      expect(featuredFile).toContain("content-visibility-auto");
      expect(expFile).toContain("content-visibility-auto");
      expect(faqFile).toContain("content-visibility-auto");
    });
  });
});
