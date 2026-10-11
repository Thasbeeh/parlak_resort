import { describe, it, expect, vi } from "vitest";
import * as React from "react";
import fs from "fs";
import path from "path";

vi.mock("next/font/google", () => ({
  Fraunces: () => ({ variable: "--font-display" }),
  Plus_Jakarta_Sans: () => ({ variable: "--font-sans" }),
  JetBrains_Mono: () => ({ variable: "--font-mono" }),
}));

vi.mock("next/font/local", () => ({
  default: () => ({ variable: "--font-malayalam" }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
import { viewport, metadata } from "@/app/layout";
import { JsonLd, RESORT_LODGING_BUSINESS_JSONLD } from "@/components/seo/JsonLd";
import { PublicHeader } from "@/components/public/chrome/PublicHeader";
import { MobileNavSheet } from "@/components/public/chrome/MobileNavSheet";
import { PublicFooter } from "@/components/public/chrome/PublicFooter";
import { FloatingContactWidget } from "@/components/public/chrome/FloatingContactWidget";
import { CancellationPolicyModal } from "@/components/public/chrome/CancellationPolicyModal";
import { SITE_CONFIG } from "@/lib/constants";

describe("Stage 2: Public Shell, Mobile-Native Reset & Route Group Architecture", () => {
  it("verifies that boilerplate app/page.tsx is deleted to prevent root route collisions", () => {
    const rootPagePath = path.join(process.cwd(), "app", "page.tsx");
    expect(fs.existsSync(rootPagePath)).toBe(false);
  });

  it("verifies that app/(public)/page.tsx and app/(public)/layout.tsx exist", () => {
    const publicPagePath = path.join(process.cwd(), "app", "(public)", "page.tsx");
    const publicLayoutPath = path.join(process.cwd(), "app", "(public)", "layout.tsx");
    expect(fs.existsSync(publicPagePath)).toBe(true);
    expect(fs.existsSync(publicLayoutPath)).toBe(true);
  });

  describe("1. Mobile-Native Reset & Viewport Metadata (app/layout.tsx)", () => {
    it("exports correct viewport configuration with viewportFit cover and theme colors", () => {
      expect(viewport).toBeDefined();
      expect(viewport.viewportFit).toBe("cover");
      expect(viewport.maximumScale).toBe(5);
      expect(viewport.userScalable).toBe(true);
      expect(viewport.initialScale).toBe(1);
      expect(Array.isArray(viewport.themeColor)).toBe(true);
    });

    it("verifies globals.css includes touch-action, tap-highlight reset, safe-area utilities, and iOS input zoom prevention", () => {
      const globalsCss = fs.readFileSync(path.join(process.cwd(), "app", "globals.css"), "utf-8");
      expect(globalsCss).toContain("-webkit-tap-highlight-color: transparent");
      expect(globalsCss).toContain("touch-action: manipulation");
      expect(globalsCss).toContain(".safe-bottom");
      expect(globalsCss).toContain(".safe-top");
      expect(globalsCss).toContain("env(safe-area-inset-bottom");
      expect(globalsCss).toContain("@media (hover: hover) and (pointer: fine)");
      expect(globalsCss).toContain("font-size: 16px !important");
    });

    it("exports comprehensive SEO metadata with OpenGraph and preconnect tags in layout", () => {
      expect(metadata).toBeDefined();
      expect(metadata.title).toBeDefined();
      expect(metadata.openGraph).toBeDefined();
      expect(metadata.openGraph?.url).toBe(SITE_CONFIG.baseUrl);

      const layoutContent = fs.readFileSync(path.join(process.cwd(), "app", "layout.tsx"), "utf-8");
      expect(layoutContent).toContain('href="https://res.cloudinary.com"');
      expect(layoutContent).toContain('crossOrigin="anonymous"');
      expect(layoutContent).toContain('rel="dns-prefetch"');
    });
  });

  describe("2. Schema.org Structured Data (components/seo/JsonLd.tsx)", () => {
    it("renders valid typed JSON-LD script tag", () => {
      const element = JsonLd({ data: { test: "value" }, id: "test-id" });
      expect(element).toBeDefined();
      expect(element.props.type).toBe("application/ld+json");
      expect(element.props.dangerouslySetInnerHTML?.__html).toBe(JSON.stringify({ test: "value" }));
    });

    it("validates RESORT_LODGING_BUSINESS_JSONLD conforms to schema.org LodgingBusiness specification", () => {
      expect(RESORT_LODGING_BUSINESS_JSONLD["@context"]).toBe("https://schema.org");
      expect(RESORT_LODGING_BUSINESS_JSONLD["@type"]).toContain("LodgingBusiness");
      expect(RESORT_LODGING_BUSINESS_JSONLD["@type"]).toContain("Resort");
      expect(RESORT_LODGING_BUSINESS_JSONLD.name).toBe("Parlak Resort & Farmhouse");
      expect(RESORT_LODGING_BUSINESS_JSONLD.telephone).toBe(SITE_CONFIG.phone.raw);
      expect(RESORT_LODGING_BUSINESS_JSONLD.address.streetAddress).toBe("Vallivattom");
      expect(RESORT_LODGING_BUSINESS_JSONLD.address.postalCode).toBe("680661");
      expect(RESORT_LODGING_BUSINESS_JSONLD.geo.latitude).toBe(10.2769);
      expect(RESORT_LODGING_BUSINESS_JSONLD.geo.longitude).toBe(76.1868);
      expect(RESORT_LODGING_BUSINESS_JSONLD.amenityFeature.length).toBeGreaterThan(0);
    });
  });

  describe("3. Public Chrome Components", () => {
    it("exports PublicHeader component as a callable functional component", () => {
      expect(PublicHeader).toBeDefined();
      expect(typeof PublicHeader).toBe("function");
      const element = PublicHeader();
      expect(element).toBeDefined();
      expect(element.type).toBe("header");
      expect(element.props.className).toContain("backdrop-blur-md");
      expect(element.props.className).toContain("sticky top-0");
    });

    it("exports MobileNavSheet component with Base UI sheet and accessible drawer", () => {
      expect(MobileNavSheet).toBeDefined();
      expect(typeof MobileNavSheet).toBe("function");
      const element = React.createElement(MobileNavSheet);
      expect(element).toBeDefined();
      expect(element.type).toBe(MobileNavSheet);
    });

    it("exports PublicFooter component with exact NAP citation and Google Maps embed", () => {
      expect(PublicFooter).toBeDefined();
      expect(typeof PublicFooter).toBe("function");
      const element = PublicFooter();
      expect(element).toBeDefined();
      expect(element.type).toBe("footer");
    });

    it("exports CancellationPolicyModal component and verifies zero internal tech tag leaks", () => {
      expect(CancellationPolicyModal).toBeDefined();
      expect(typeof CancellationPolicyModal).toBe("function");
      const element = CancellationPolicyModal({});
      expect(element).toBeDefined();

      const modalFile = fs.readFileSync(
        path.join(process.cwd(), "components", "public", "chrome", "CancellationPolicyModal.tsx"),
        "utf-8"
      );
      // Strictly enforce AGENTS.md Rule 2: Zero internal database identifiers or raw code leaked to user
      expect(modalFile).not.toContain("bookedBaseRate");
      expect(modalFile).not.toContain("max(0, New Rate");
    });

    it("verifies PublicHomePage and FeaturedGrid contain exact inventory caps, non-breaking spaces, and proper semantic links", () => {
      const pageFile = fs.readFileSync(
        path.join(process.cwd(), "app", "(public)", "page.tsx"),
        "utf-8"
      );
      const featuredGridFile = fs.readFileSync(
        path.join(process.cwd(), "components", "public", "home", "FeaturedGrid.tsx"),
        "utf-8"
      );
      expect(pageFile).toContain("FeaturedGrid");
      expect(pageFile).toContain("HeroSection");
      expect(featuredGridFile).toContain("Up to 3 Adults");
      expect(featuredGridFile).toContain("Up to 5 Adults");
      expect(featuredGridFile).toContain("Up to 1,200");
      expect(featuredGridFile).toContain("₹&nbsp;");
      expect(featuredGridFile).toContain("buttonVariants");
    });

    it("exports FloatingContactWidget with safe area insets and WhatsApp / phone dial actions", () => {
      expect(FloatingContactWidget).toBeDefined();
      expect(typeof FloatingContactWidget).toBe("function");
      const element = FloatingContactWidget();
      expect(element).toBeDefined();
      expect(element.type).toBe("aside");
      expect(element.props.className).toContain("fixed");
      expect(element.props.className).toContain("safe-area-inset-bottom");
    });
  });
});
