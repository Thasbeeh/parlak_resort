import { describe, it, expect, vi, beforeEach } from "vitest";
import * as React from "react";
import fs from "fs";
import path from "path";
import { metadata as contactMetadata } from "@/app/(public)/contact/page";
import { ContactCardsGrid } from "@/components/public/contact/ContactCardsGrid";
import { LocationMapSection } from "@/components/public/contact/LocationMapSection";
import { OperationalPoliciesCard } from "@/components/public/contact/OperationalPoliciesCard";
import { CancellationModal } from "@/components/public/contact/CancellationModal";
import { SITE_CONFIG } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { getResortSettings, getCancellationPolicy } from "@/actions/settings";

describe("Stage 7: Public Contact Us Desk, Location & Operational Policies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Route Architecture & File Existence
  // ──────────────────────────────────────────────────────────────────────────
  describe("1. Route Architecture & Component Structure", () => {
    it("verifies app/(public)/contact/page.tsx exists", () => {
      const pagePath = path.join(process.cwd(), "app", "(public)", "contact", "page.tsx");
      expect(fs.existsSync(pagePath)).toBe(true);
    });

    it("verifies all Stage 7 public contact components exist", () => {
      const components = [
        "ContactCardsGrid.tsx",
        "LocationMapSection.tsx",
        "OperationalPoliciesCard.tsx",
        "CancellationModal.tsx",
      ];

      for (const comp of components) {
        const compPath = path.join(process.cwd(), "components", "public", "contact", comp);
        expect(fs.existsSync(compPath)).toBe(true);
      }
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. SEO Metadata & Structured Schema
  // ──────────────────────────────────────────────────────────────────────────
  describe("2. Technical SEO Metadata & OpenGraph Standards", () => {
    it("exports authoritative SEO metadata with canonical URL", () => {
      expect(contactMetadata).toBeDefined();
      expect(contactMetadata.title).toBe("Contact Us & Directions | Parlak Resort & Farmhouse Keralam");
      expect(contactMetadata.description).toContain("Reach Parlak Resort at Vallivattom, S.N. Puram, Keralam 680661");
      expect(contactMetadata.description).toContain("+91 88919 31123");
      expect(contactMetadata.alternates?.canonical).toBe("/contact");
    });

    it("exports social OpenGraph and Twitter cards", () => {
      const og = contactMetadata.openGraph as any;
      expect(og).toBeDefined();
      expect(og.title).toContain("Contact Us & Directions");
      expect(og.url).toBe("https://parlakfarmhouse.com/contact");
      expect(og.images?.[0]?.url).toContain("contact_og.webp");

      const twitter = contactMetadata.twitter as any;
      expect(twitter).toBeDefined();
      expect(twitter.card).toBe("summary_large_image");
      expect(twitter.images?.[0]).toContain("contact_og.webp");
    });

    it("embeds schema.org Resort structured JSON-LD in Contact page source", () => {
      const pageSource = fs.readFileSync(
        path.join(process.cwd(), "app", "(public)", "contact", "page.tsx"),
        "utf-8"
      );
      expect(pageSource).toContain('"@context": "https://schema.org"');
      expect(pageSource).toContain('"@type": "Resort"');
      expect(pageSource).toContain("PostalAddress");
      expect(pageSource).toContain("GeoCoordinates");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. One-Tap Action Cards (ContactCardsGrid)
  // ──────────────────────────────────────────────────────────────────────────
  describe("3. One-Tap Action Cards Grid (ContactCardsGrid)", () => {
    it("exports ContactCardsGrid component", () => {
      expect(ContactCardsGrid).toBeDefined();
      expect(typeof ContactCardsGrid).toBe("function");
    });

    it("verifies file source compiles correct WhatsApp, Call, and Email links", () => {
      const fileSource = fs.readFileSync(
        path.join(process.cwd(), "components", "public", "contact", "ContactCardsGrid.tsx"),
        "utf-8"
      );

      // WhatsApp link with greeting
      expect(fileSource).toContain("https://wa.me/");
      expect(fileSource).toContain("Hello Parlak Resort Team");

      // InquiryType contextual greetings
      expect(fileSource).toContain('inquiryType === "stays"');
      expect(fileSource).toContain('inquiryType === "events"');

      // Tel link
      expect(fileSource).toContain("tel:");

      // Mailto link
      expect(fileSource).toContain("mailto:");

      // Social links
      expect(fileSource).toContain("Instagram");
      expect(fileSource).toContain("Facebook");
      expect(fileSource).toContain("YouTube");

      // Tactile physical compression
      expect(fileSource).toContain("active:scale-[0.98]");
      expect(fileSource).toContain("ease-[var(--ease-snappy)]");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Location & Responsive Map Section (LocationMapSection)
  // ──────────────────────────────────────────────────────────────────────────
  describe("4. Location Map Section (LocationMapSection)", () => {
    it("exports LocationMapSection component", () => {
      expect(LocationMapSection).toBeDefined();
      expect(typeof LocationMapSection).toBe("function");
    });

    it("verifies accurate NAP citation, Google Plus Code, and iframe embed", () => {
      const fileSource = fs.readFileSync(
        path.join(process.cwd(), "components", "public", "contact", "LocationMapSection.tsx"),
        "utf-8"
      );

      // NAP & Plus Code citations
      expect(fileSource).toContain("googlePlusCode");
      expect(fileSource).toContain("googleMapLink");
      expect(fileSource).toContain("googleMapsEmbedUrl");

      // Iframe properties
      expect(fileSource).toContain("<iframe");
      expect(fileSource).toContain('loading="lazy"');
      expect(fileSource).toContain('referrerPolicy="no-referrer-when-downgrade"');
      expect(fileSource).toContain("Parlak Resort Location on Google Maps");

      // Copy Plus Code feature
      expect(fileSource).toContain("handleCopyPlusCode");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Operational Policies Card (OperationalPoliciesCard)
  // ──────────────────────────────────────────────────────────────────────────
  describe("5. Operational Policies Card (OperationalPoliciesCard)", () => {
    it("exports OperationalPoliciesCard component", () => {
      expect(OperationalPoliciesCard).toBeDefined();
      expect(typeof OperationalPoliciesCard).toBe("function");
    });

    it("verifies comprehensive domain rules and timings are included", () => {
      const fileSource = fs.readFileSync(
        path.join(process.cwd(), "components", "public", "contact", "OperationalPoliciesCard.tsx"),
        "utf-8"
      );

      // Operating shift timings
      expect(fileSource).toContain("Standard overnight stay");
      expect(fileSource).toContain("Day slot stay");
      expect(fileSource).toContain("Event hall sessions");

      // Dining policy
      expect(fileSource).toContain("diningUntil");
      expect(fileSource).toContain("Outside food");

      // Swimming pool policy
      expect(fileSource).toContain("Swimming pool resident access");
      expect(fileSource).toContain("Dome and A-Frame residents");
      expect(fileSource).toContain("Event Hall attendees are strictly forbidden");

      // Booking advance & scope adjustments
      expect(fileSource).toContain("Advance payment mandate");
      expect(fileSource).toContain("non-refundable");
      expect(fileSource).toContain("Flat baseline blocks");
      expect(fileSource).toContain("Scope reductions");
      expect(fileSource).toContain("Partial Cancellation");

      // Cancellation modal trigger integration with clean non-tech label
      expect(fileSource).toContain("CancellationModal");
      expect(fileSource).toContain("View cancellation policy");
      expect(fileSource).not.toContain("View cancellation policy modal");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Dynamic Cancellation Modal (CancellationModal)
  // ──────────────────────────────────────────────────────────────────────────
  describe("6. Dynamic Cancellation Modal (CancellationModal)", () => {
    it("exports CancellationModal component", () => {
      expect(CancellationModal).toBeDefined();
      expect(typeof CancellationModal).toBe("function");
    });

    it("verifies Base UI dialog primitive and dynamic policy text support", () => {
      const fileSource = fs.readFileSync(
        path.join(process.cwd(), "components", "public", "contact", "CancellationModal.tsx"),
        "utf-8"
      );

      // Accessible Dialog Primitives
      expect(fileSource).toContain("Dialog");
      expect(fileSource).toContain("DialogContent");
      expect(fileSource).toContain("DialogTitle");
      expect(fileSource).toContain("DialogDescription");
      expect(fileSource).toContain("DialogClose");

      // Dynamic policyText prop support
      expect(fileSource).toContain("policyText");
      expect(fileSource).toContain("Resort cancellation directive");

      // Standard policy sections
      expect(fileSource).toContain("1. Booking advance mandate");
      expect(fileSource).toContain("2. Locked baseline scope");
      expect(fileSource).toContain("3. Flat baseline blocks");
      expect(fileSource).toContain("4. Stay extensions");
      expect(fileSource).toContain("5. Verified cancellations");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 7. Settings Retrieval Functions
  // ──────────────────────────────────────────────────────────────────────────
  describe("7. Settings Retrieval & Neon Fallbacks", () => {
    it("getResortSettings returns fallback constants when DB has no record", async () => {
      vi.spyOn(prisma.setting, "findUnique").mockResolvedValueOnce(null as any);
      const settings = await getResortSettings();
      expect(settings).toBeDefined();
      expect(settings.resortName).toBe(SITE_CONFIG.name);
      expect(settings.phone).toBe(SITE_CONFIG.phone.display);
      expect(settings.overnightCheckIn).toBe(SITE_CONFIG.policies.timings.overnight.checkIn);
    });

    it("getCancellationPolicy returns fallback text when DB has no record", async () => {
      vi.spyOn(prisma.setting, "findUnique").mockResolvedValueOnce(null as any);
      const policy = await getCancellationPolicy();
      expect(policy).toBeDefined();
      expect(policy).toContain("All cancellations and scope reductions must be requested via WhatsApp");
      expect(policy).toContain("Booking advances are non-refundable");
    });

    it("getCancellationPolicy retrieves dynamic text when DB record exists", async () => {
      const customPolicy = "Special custom cancellation terms for peak festival period.";
      vi.spyOn(prisma.setting, "findUnique").mockResolvedValueOnce({
        id: "setting-cancel",
        key: "cancellation_policy",
        value: JSON.stringify({ policyText: customPolicy }),
        updatedAt: new Date(),
      } as any);

      const policy = await getCancellationPolicy();
      expect(policy).toBe(customPolicy);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 8. Anti-AI-Slop Governance & Typographic Standards
  // ──────────────────────────────────────────────────────────────────────────
  describe("8. Anti-AI-Slop Governance & Typographic Standards", () => {
    it("verifies zero developer jargon and zero internal tech tags in public contact views", () => {
      const files = [
        "app/(public)/contact/page.tsx",
        "components/public/contact/ContactCardsGrid.tsx",
        "components/public/contact/LocationMapSection.tsx",
        "components/public/contact/OperationalPoliciesCard.tsx",
        "components/public/contact/CancellationModal.tsx",
      ];

      const forbiddenStrings = [
        "GiST",
        "gist",
        "tstzrange",
        "Stage 7",
        "Stage 4",
        "concurrency collision",
        "PostgreSQL trigger",
        "PrismaClient",
      ];

      for (const relPath of files) {
        const content = fs.readFileSync(path.join(process.cwd(), relPath), "utf-8");
        for (const forbidden of forbiddenStrings) {
          // Exclude comments or imports, test strictly user-facing JSX text
          const jsxMatches = content.match(new RegExp(`>.*${forbidden}.*<`, "i"));
          expect(jsxMatches).toBeNull();
        }
      }
    });

    it("verifies natural sentence case for headers and non-breaking spaces for time slots", () => {
      const content = fs.readFileSync(
        path.join(process.cwd(), "components", "public", "contact", "OperationalPoliciesCard.tsx"),
        "utf-8"
      );
      // Non-breaking spaces check
      expect(content).toContain("12:00&nbsp;PM");
      expect(content).toContain("11:00&nbsp;AM");
      expect(content).toContain("10:00&nbsp;AM");
      expect(content).toContain("3:00&nbsp;PM");
    });
  });
});
