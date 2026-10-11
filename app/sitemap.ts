import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_CONFIG } from "@/lib/constants";

/**
 * Dynamic XML Sitemap generator for Parlak Resort & Farmhouse
 * 
 * Complies with Next.js 16 MetadataRoute specification and docs/website/seo.md:
 * - Emits static sanctuary marketing landing pages (Home, Stays Catalog, Contact Us)
 * - Dynamically queries active inventory units from PostgreSQL Neon (prisma.unit.findMany({ where: { isActive: true } }))
 * - Maps unit slugs to canonical dynamic URLs (/stays/:slug)
 * - Implements graceful fallback to static routes if database connectivity fails
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_CONFIG.baseUrl;

  // Static marketing pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/stays`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  // Dynamic active units from PostgreSQL Neon
  try {
    const units = await prisma.unit.findMany({
      where: { isActive: true },
      select: { id: true, name: true, category: true, updatedAt: true },
    });

    const dynamicRoutes: MetadataRoute.Sitemap = units.map((unit) => {
      const slug = unit.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      return {
        url: `${baseUrl}/stays/${slug}`,
        lastModified: unit.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
      };
    });

    return [...staticRoutes, ...dynamicRoutes];
  } catch (error) {
    console.error("Failed to fetch dynamic units for sitemap:", error);
    return staticRoutes;
  }
}
