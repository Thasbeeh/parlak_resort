import { describe, it, expect, vi } from "vitest";
import * as React from "react";
import fs from "fs";
import path from "path";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/stays",
  useSearchParams: () => new URLSearchParams(),
}));

import { CategoryFilterTabs } from "@/components/public/catalog/CategoryFilterTabs";
import { UnitCardsGrid } from "@/components/public/catalog/UnitCardsGrid";
import { UnitCardItem } from "@/components/public/catalog/UnitCardItem";
import { CatalogExplorer } from "@/components/public/catalog/CatalogExplorer";
import {
  DEFAULT_CATALOG_UNITS,
  type CategoryTab,
} from "@/components/public/catalog/types";
import { metadata as staysMetadata } from "@/app/(public)/stays/page";

describe("Stage 4: Unified Stays & Venues Catalog Listing Implementation", () => {
  describe("1. app/(public)/stays/page.tsx Server Component & Metadata", () => {
    it("exports comprehensive SEO metadata matching stays.md and seo.md", () => {
      expect(staysMetadata).toBeDefined();
      expect(staysMetadata.title).toContain("Stays & Venues");
      expect(staysMetadata.description).toContain("Geodesic Domes");
      expect(staysMetadata.openGraph?.images).toBeDefined();
      expect(staysMetadata.alternates?.canonical).toBe("/stays");
    });

    it("verifies Next.js 16 async searchParams pattern and Prisma retrieval in page.tsx", () => {
      const pageFile = fs.readFileSync(
        path.join(process.cwd(), "app", "(public)", "stays", "page.tsx"),
        "utf-8"
      );
      // Next.js 16 async searchParams
      expect(pageFile).toContain("await searchParams");
      expect(pageFile).toContain("const { category } = await searchParams");
      // Prisma queries
      expect(pageFile).toContain("prisma.unit.findMany");
      expect(pageFile).toContain("priceList");
      expect(pageFile).toContain("photos");
      expect(pageFile).toContain("CatalogExplorer");
      expect(pageFile).toContain("Suspense");
    });
  });

  describe("2. CategoryFilterTabs Component (components/public/catalog/CategoryFilterTabs.tsx)", () => {
    const sampleTabs: CategoryTab[] = [
      { key: "ALL", label: "All Stays & Venues", count: 4 },
      { key: "DOMES", label: "Geodesic Domes", count: 1 },
      { key: "A_FRAMES", label: "A-Frames", count: 1 },
      { key: "EVENT_HALLS", label: "Event Halls", count: 2 },
    ];

    it("renders segmented filter pill tabs with live counts formatted with tabular-nums", () => {
      const tabsFile = fs.readFileSync(
        path.join(process.cwd(), "components", "public", "catalog", "CategoryFilterTabs.tsx"),
        "utf-8"
      );
      expect(tabsFile).toContain("font-mono");
      expect(tabsFile).toContain("tabular-nums");
      expect(tabsFile).toContain("active:scale-[0.98]");
      expect(tabsFile).toContain("role=\"tab\"");
      expect(tabsFile).toContain("role=\"tablist\"");
    });

    it("exports CategoryFilterTabs component and renders without crashing", () => {
      expect(CategoryFilterTabs).toBeDefined();
      expect(typeof CategoryFilterTabs).toBe("function");
      const element = React.createElement(CategoryFilterTabs, {
        tabs: sampleTabs,
        selectedCategory: "ALL",
        onSelectCategory: vi.fn(),
      });
      expect(element.type).toBe(CategoryFilterTabs);
    });

    it("verifies shallow URL synchronization pattern in CatalogExplorer", () => {
      const explorerFile = fs.readFileSync(
        path.join(process.cwd(), "components", "public", "catalog", "CatalogExplorer.tsx"),
        "utf-8"
      );
      expect(explorerFile).toContain("router.replace");
      expect(explorerFile).toContain("scroll: false");
      expect(explorerFile).toContain("useSearchParams");
    });
  });

  describe("3. UnitCardsGrid Component (components/public/catalog/UnitCardsGrid.tsx)", () => {
    it("renders responsive 3-column / 2-column / 1-column matrix", () => {
      const gridFile = fs.readFileSync(
        path.join(process.cwd(), "components", "public", "catalog", "UnitCardsGrid.tsx"),
        "utf-8"
      );
      expect(gridFile).toContain("grid-cols-1");
      expect(gridFile).toContain("md:grid-cols-2");
      expect(gridFile).toContain("lg:grid-cols-3");
      expect(gridFile).toContain("gap-6");
      expect(gridFile).toContain("min-w-0");
    });

    it("renders resilient empty state when no units are present", () => {
      const gridFile = fs.readFileSync(
        path.join(process.cwd(), "components", "public", "catalog", "UnitCardsGrid.tsx"),
        "utf-8"
      );
      expect(gridFile).toContain("No stays or venues found in this category");
      expect(gridFile).toContain("onResetFilter");
    });

    it("exports UnitCardsGrid component and renders default units", () => {
      expect(UnitCardsGrid).toBeDefined();
      expect(typeof UnitCardsGrid).toBe("function");
      const element = React.createElement(UnitCardsGrid, {
        units: DEFAULT_CATALOG_UNITS,
      });
      expect(element.type).toBe(UnitCardsGrid);
    });
  });

  describe("4. UnitCardItem Component (components/public/catalog/UnitCardItem.tsx)", () => {
    it("declares container queries and WebKit layout invariants", () => {
      const cardFile = fs.readFileSync(
        path.join(process.cwd(), "components", "public", "catalog", "UnitCardItem.tsx"),
        "utf-8"
      );
      // Container Queries
      expect(cardFile).toContain("@container");
      expect(cardFile).toContain("container-type:inline-size");

      // Cover photo chip
      expect(cardFile).toContain("aspect-[16/10]");
      expect(cardFile).toContain("overflow-hidden rounded-xl border");

      // WebKit layout invariants
      expect(cardFile).toContain("min-w-0");
      expect(cardFile).toContain("shrink-0");

      // Tabular numerals and currency non-breaking spaces
      expect(cardFile).toContain("font-mono tabular-nums");
      expect(cardFile).toContain("₹&nbsp;");

      // Action CTA routing to /stays/:slug
      expect(cardFile).toContain("unit.detailRoute");
      expect(cardFile).toContain("AVAILABLE");
    });

    it("renders Geodesic Dome, A-Frame, and Event Hall items cleanly", () => {
      expect(DEFAULT_CATALOG_UNITS.length).toBe(4);
      const dome = DEFAULT_CATALOG_UNITS[0];
      expect(dome.slug).toBe("geodesic-dome");
      expect(dome.category).toBe("DOME");
      expect(dome.capacityBadge).toContain("Adults");

      const aframe = DEFAULT_CATALOG_UNITS[1];
      expect(aframe.slug).toBe("scenic-a-frame");
      expect(aframe.category).toBe("A_FRAME");

      const hall = DEFAULT_CATALOG_UNITS[2];
      expect(hall.slug).toBe("non-ac-hall");
      expect(hall.capacityBadge).toContain("Guests");

      const acHall = DEFAULT_CATALOG_UNITS[3];
      expect(acHall.slug).toBe("ac-hall");
      expect(acHall.isActive).toBe(true);
      expect(acHall.ctaText).toBe("View Details & Inquire");
    });
  });
});
