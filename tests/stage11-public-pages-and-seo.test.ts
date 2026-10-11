/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as React from "react";
import fs from "fs";
import path from "path";

// Mock Google Fonts to prevent next/font/google network resolution during test runs
vi.mock("next/font/google", () => ({
  Fraunces: () => ({ variable: "--font-display" }),
  Plus_Jakarta_Sans: () => ({ variable: "--font-sans" }),
  JetBrains_Mono: () => ({ variable: "--font-mono" }),
}));

vi.mock("next/font/local", () => ({
  default: () => ({ variable: "--font-malayalam" }),
}));

// Partially mock next/navigation while preserving actual unstable_rethrow, redirect, notFound
vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return {
    ...actual,
    usePathname: () => "/",
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  };
});

import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { GET as getLlmsTxt } from "@/app/llms.txt/route";
import { GET as getLlmsFullTxt } from "@/app/llms-full.txt/route";
import PublicError from "@/app/(public)/error";
import PublicNotFound from "@/app/(public)/not-found";
import { metadata as rootMetadata } from "@/app/layout";
import { metadata as homeMetadata } from "@/app/(public)/page";
import { metadata as staysMetadata } from "@/app/(public)/stays/page";
import { metadata as contactMetadata } from "@/app/(public)/contact/page";
import { DEFAULT_UNIT_DETAILS } from "@/components/public/unit-detail/types";
import { SITE_CONFIG } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";

describe("Stage 11: SEO Protocols, Generative Engine Optimization & Production Hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Programmatic robots.txt Protocols
  // =========================================================================
  describe("1. Programmatic robots.txt Protocols (app/robots.ts)", () => {
    it("returns compliant Next.js MetadataRoute.Robots structure", () => {
      const robotsConfig = robots();
      expect(robotsConfig).toBeDefined();
      expect(robotsConfig.rules).toBeDefined();
      expect(Array.isArray(robotsConfig.rules)).toBe(true);
    });

    it("restricts search engines from administrative surfaces and internal assets", () => {
      const robotsConfig = robots();
      const rules = Array.isArray(robotsConfig.rules) ? robotsConfig.rules : [robotsConfig.rules];

      // Wildcard crawler rule
      const wildcardRule = rules.find((r) => r.userAgent === "*");
      expect(wildcardRule).toBeDefined();

      const disallowList = Array.isArray(wildcardRule?.disallow)
        ? wildcardRule?.disallow
        : [wildcardRule?.disallow];

      expect(disallowList).toContain("/admin");
      expect(disallowList).toContain("/admin/*");
      expect(disallowList).toContain("/api/admin/*");
      expect(disallowList).toContain("/_next/*");

      const allowList = Array.isArray(wildcardRule?.allow)
        ? wildcardRule?.allow
        : [wildcardRule?.allow];

      expect(allowList).toContain("/");
      expect(allowList).toContain("/stays");
      expect(allowList).toContain("/stays/*");
      expect(allowList).toContain("/contact");
      expect(allowList).toContain("/llms.txt");
      expect(allowList).toContain("/llms-full.txt");
    });

    it("explicitly permits AI discovery crawlers and GEO bots", () => {
      const robotsConfig = robots();
      const rules = Array.isArray(robotsConfig.rules) ? robotsConfig.rules : [robotsConfig.rules];

      const aiRule = rules.find((r) => Array.isArray(r.userAgent) && r.userAgent.includes("GPTBot"));
      expect(aiRule).toBeDefined();

      const aiAgents = aiRule?.userAgent as string[];
      expect(aiAgents).toContain("GPTBot");
      expect(aiAgents).toContain("ChatGPT-User");
      expect(aiAgents).toContain("ClaudeBot");
      expect(aiAgents).toContain("PerplexityBot");
      expect(aiAgents).toContain("Google-Extended");
      expect(aiAgents).toContain("Applebot-Extended");

      const allowList = Array.isArray(aiRule?.allow) ? aiRule?.allow : [aiRule?.allow];
      expect(allowList).toContain("/");
      expect(allowList).toContain("/stays/*");
      expect(allowList).toContain("/contact");
      expect(allowList).toContain("/llms.txt");
      expect(allowList).toContain("/llms-full.txt");

      const disallowList = Array.isArray(aiRule?.disallow) ? aiRule?.disallow : [aiRule?.disallow];
      expect(disallowList).toContain("/admin");
      expect(disallowList).toContain("/admin/*");
    });

    it("references authoritative XML sitemap and primary domain host", () => {
      const robotsConfig = robots();
      expect(robotsConfig.sitemap).toBe(`${SITE_CONFIG.baseUrl}/sitemap.xml`);
      expect(robotsConfig.host).toBe(SITE_CONFIG.baseUrl);
    });
  });

  // =========================================================================
  // 2. Dynamic XML Sitemap Generation
  // =========================================================================
  describe("2. Dynamic XML Sitemap Generation (app/sitemap.ts)", () => {
    it("generates static sanctuary routes with accurate priorities and frequencies", async () => {
      vi.spyOn(prisma.unit, "findMany").mockResolvedValue([]);

      const sitemapEntries = await sitemap();
      expect(Array.isArray(sitemapEntries)).toBe(true);

      const homeEntry = sitemapEntries.find((e) => e.url === SITE_CONFIG.baseUrl);
      expect(homeEntry).toBeDefined();
      expect(homeEntry?.priority).toBe(1.0);
      expect(homeEntry?.changeFrequency).toBe("weekly");

      const staysEntry = sitemapEntries.find((e) => e.url === `${SITE_CONFIG.baseUrl}/stays`);
      expect(staysEntry).toBeDefined();
      expect(staysEntry?.priority).toBe(0.9);
      expect(staysEntry?.changeFrequency).toBe("weekly");

      const contactEntry = sitemapEntries.find((e) => e.url === `${SITE_CONFIG.baseUrl}/contact`);
      expect(contactEntry).toBeDefined();
      expect(contactEntry?.priority).toBe(0.7);
      expect(contactEntry?.changeFrequency).toBe("monthly");
    });

    it("dynamically queries active units from PostgreSQL Neon and binds canonical slugs", async () => {
      const mockUnits = [
        {
          id: "unit-uuid-1",
          name: "Dome 1",
          category: "DOME",
          updatedAt: new Date("2026-10-01T12:00:00.000Z"),
        },
        {
          id: "unit-uuid-2",
          name: "A-Frame 2",
          category: "A_FRAME",
          updatedAt: new Date("2026-10-02T12:00:00.000Z"),
        },
        {
          id: "unit-uuid-3",
          name: "Non-AC Event Hall",
          category: "NON_AC_HALL",
          updatedAt: new Date("2026-10-03T12:00:00.000Z"),
        },
      ];

      const findManySpy = vi
        .spyOn(prisma.unit, "findMany")
        .mockResolvedValue(mockUnits as any);

      const sitemapEntries = await sitemap();

      expect(findManySpy).toHaveBeenCalledWith({
        where: { isActive: true },
        select: { id: true, name: true, category: true, updatedAt: true },
      });

      const domeEntry = sitemapEntries.find(
        (e) => e.url === `${SITE_CONFIG.baseUrl}/stays/dome-1`
      );
      expect(domeEntry).toBeDefined();
      expect(domeEntry?.lastModified).toEqual(new Date("2026-10-01T12:00:00.000Z"));
      expect(domeEntry?.priority).toBe(0.8);
      expect(domeEntry?.changeFrequency).toBe("weekly");

      const aFrameEntry = sitemapEntries.find(
        (e) => e.url === `${SITE_CONFIG.baseUrl}/stays/a-frame-2`
      );
      expect(aFrameEntry).toBeDefined();

      const hallEntry = sitemapEntries.find(
        (e) => e.url === `${SITE_CONFIG.baseUrl}/stays/non-ac-event-hall`
      );
      expect(hallEntry).toBeDefined();
    });

    it("gracefully catches database connection exceptions and returns static routes", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(prisma.unit, "findMany").mockRejectedValue(new Error("Neon connection failed"));

      const sitemapEntries = await sitemap();
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(sitemapEntries.length).toBe(3); // Falls back to the 3 static marketing pages
      expect(sitemapEntries.some((e) => e.url === SITE_CONFIG.baseUrl)).toBe(true);
    });
  });

  // =========================================================================
  // 3. Generative Engine Optimization (GEO) Protocol: llms.txt & llms-full.txt
  // =========================================================================
  describe("3. Generative Engine Optimization (GEO): llms.txt & llms-full.txt", () => {
    it("GET /llms.txt returns 200 with text/plain header and core property facts", async () => {
      const response = await getLlmsTxt();
      expect(response.status).toBe(200);

      const contentType = response.headers.get("content-type");
      expect(contentType).toContain("text/plain");

      const bodyText = await response.text();
      expect(bodyText).toContain("# Parlak Resort & Farmhouse");
      expect(bodyText).toContain("https://parlakfarmhouse.com");
      expect(bodyText).toContain("+91 88919 31123");
      expect(bodyText).toContain("wa.me/918891931123");
      expect(bodyText).toContain("Vallivattom, S.N. Puram, Keralam 680661");

      // Inventory capacity invariants
      expect(bodyText).toContain("Geodesic Domes");
      expect(bodyText).toContain("Maximum 3 Adults");
      expect(bodyText).toContain("Scenic A-Frames");
      expect(bodyText).toContain("Maximum 5 Adults");
      expect(bodyText).toContain("Non-AC Event Hall");
      expect(bodyText).toContain("1,200 attendees");

      // Zero persistence booking invariant
      expect(bodyText).toContain("zero direct database writes");
      expect(bodyText).toContain("https://parlakfarmhouse.com/llms-full.txt");
    });

    it("GET /llms-full.txt returns 200 with unabridged operational manual", async () => {
      const response = await getLlmsFullTxt();
      expect(response.status).toBe(200);

      const contentType = response.headers.get("content-type");
      expect(contentType).toContain("text/plain");

      const bodyText = await response.text();
      expect(bodyText).toContain("# Parlak Resort & Farmhouse - Full Operational & Architectural Context");
      expect(bodyText).toContain("Headcount Slab Pricing Table");
      expect(bodyText).toContain("10 to 25 Pax: ₹10,000");
      expect(bodyText).toContain("801 to 1,200 Pax: ₹72,000");
      expect(bodyText).toContain("Complimentary Dome Perk");
      expect(bodyText).toContain("400+ attendees are eligible for 1 complimentary attached Dome");
      expect(bodyText).toContain("Swimming pool access is strictly forbidden for event attendees");
      expect(bodyText).toContain("btree_gist");
      expect(bodyText).toContain("tstzrange");
      expect(bodyText).toContain("Checkout Invariant");
    });

    it("verifies route handler files exist and avoids public file collision (Next.js E212)", () => {
      const llmsRoutePath = path.join(process.cwd(), "app", "llms.txt", "route.ts");
      const llmsFullRoutePath = path.join(process.cwd(), "app", "llms-full.txt", "route.ts");
      const publicLlmsPath = path.join(process.cwd(), "public", "llms.txt");
      const publicLlmsFullPath = path.join(process.cwd(), "public", "llms-full.txt");

      expect(fs.existsSync(llmsRoutePath)).toBe(true);
      expect(fs.existsSync(llmsFullRoutePath)).toBe(true);
      // To prevent Next.js E212 conflicting-public-file-page error
      expect(fs.existsSync(publicLlmsPath)).toBe(false);
      expect(fs.existsSync(publicLlmsFullPath)).toBe(false);
    });
  });

  // =========================================================================
  // 4. OpenGraph Metadata WhatsApp Scraper Invariants (< 300 KB)
  // =========================================================================
  describe("4. OpenGraph Metadata & WhatsApp Scraper Constraints (< 300 KB)", () => {
    it("ensures root layout metadata specifies 1200x630 WebP OpenGraph image", () => {
      expect(rootMetadata.openGraph).toBeDefined();
      const ogImages = rootMetadata.openGraph?.images;
      expect(ogImages).toBeDefined();
      expect(Array.isArray(ogImages)).toBe(true);

      const primaryOg = Array.isArray(ogImages) ? ogImages[0] : ogImages;
      expect(primaryOg).toMatchObject({
        width: 1200,
        height: 630,
        type: "image/webp",
      });
      expect(typeof (primaryOg as any).url).toBe("string");
      expect((primaryOg as any).url.startsWith("https://")).toBe(true);
    });

    it("ensures public pages specify valid 1200x630 OpenGraph images", () => {
      const checkOg = (meta: any, routeName: string) => {
        expect(meta.openGraph, `${routeName} openGraph`).toBeDefined();
        const images = meta.openGraph.images;
        expect(images, `${routeName} images`).toBeDefined();
        const primary = Array.isArray(images) ? images[0] : images;
        expect(primary.width, `${routeName} width`).toBe(1200);
        expect(primary.height, `${routeName} height`).toBe(630);
        expect(primary.url.startsWith("https://"), `${routeName} https url`).toBe(true);
      };

      checkOg(homeMetadata, "Home");
      checkOg(staysMetadata, "Stays Catalog");
      checkOg(contactMetadata, "Contact");
    });

    it("verifies all curated unit detail showcases define valid WebP OG images", () => {
      const units = Object.values(DEFAULT_UNIT_DETAILS);
      for (const unit of units) {
        expect(unit.seoMeta.ogImage).toBeDefined();
        expect(unit.seoMeta.ogImage.startsWith("https://")).toBe(true);
        expect(unit.seoMeta.ogImage.endsWith(".webp")).toBe(true);
      }
    });

    it("strictly enforces that local public OG image assets do not exceed 300 KB threshold", () => {
      const maxSizeBytes = 300 * 1024; // 300 KB WhatsApp Scraper Ceiling
      const ogDir = path.join(process.cwd(), "public", "og");

      expect(fs.existsSync(ogDir)).toBe(true);
      const files = fs.readdirSync(ogDir).filter((f) => /\.(webp|jpg|jpeg|png)$/i.test(f));
      expect(files.length).toBeGreaterThan(0);

      for (const file of files) {
        const fullPath = path.join(ogDir, file);
        const stat = fs.statSync(fullPath);
        expect(stat.size).toBeLessThanOrEqual(maxSizeBytes);
      }
    });
  });

  // =========================================================================
  // 5. Production Hardening: Error Boundary & 404 Sanctuary UI
  // =========================================================================
  describe("5. Production Hardening: Error Boundary & Custom 404 Page", () => {
    it("PublicError catches standard errors and renders 'Try again' reset action", () => {
      const resetFn = vi.fn();
      const testError = new Error("Mock test error");
      const element = React.createElement(PublicError, { error: testError, reset: resetFn });

      expect(React.isValidElement(element)).toBe(true);
      expect(element.type).toBe(PublicError);

      // Verify file code contains all required sanctuary error boundary invariants
      const errorFile = fs.readFileSync(
        path.join(process.cwd(), "app", "(public)", "error.tsx"),
        "utf-8"
      );
      expect(errorFile).toContain("An unexpected moment of pause.");
      expect(errorFile).toContain("unstable_rethrow");
      expect(errorFile).toContain("reset()");
      expect(errorFile).toContain("Try again");
      expect(errorFile).toContain("Return to sanctuary");
      expect(errorFile).toContain("Reach concierge");
      expect(errorFile).toContain("active:scale-[0.98]");
      expect(errorFile).toContain("font-serif");
    });

    it("PublicError protects Next.js internal notFound() signal via unstable_rethrow", () => {
      const resetFn = vi.fn();
      expect(() => {
        try {
          notFound();
        } catch (err: any) {
          PublicError({ error: err, reset: resetFn });
        }
      }).toThrow();
    });

    it("PublicError protects Next.js internal redirect() signal via unstable_rethrow", () => {
      const resetFn = vi.fn();
      expect(() => {
        try {
          redirect("/stays");
        } catch (err: any) {
          PublicError({ error: err, reset: resetFn });
        }
      }).toThrow();
    });

    it("PublicNotFound renders atmospheric Sanctuary 404 with Fraunces header and navigation buttons", () => {
      const element = PublicNotFound();
      expect(React.isValidElement(element)).toBe(true);
      expect(element.type).toBe("div");

      // Verify file code contains all required sanctuary 404 invariants
      const notFoundFile = fs.readFileSync(
        path.join(process.cwd(), "app", "(public)", "not-found.tsx"),
        "utf-8"
      );
      expect(notFoundFile).toContain("A path unexplored in the sanctuary.");
      expect(notFoundFile).toContain("/stays");
      expect(notFoundFile).toContain("Explore stays &amp; venues");
      expect(notFoundFile).toContain("Return to sanctuary");
      expect(notFoundFile).toContain("Ask concierge");
      expect(notFoundFile).toContain("font-serif");
      expect(notFoundFile).toContain("active:scale-[0.98]");
    });
  });
});
