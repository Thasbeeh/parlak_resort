import type { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/lib/constants";

/**
 * Programmatic robots.txt configuration for Parlak Resort & Farmhouse
 * 
 * Complies with Next.js 16 MetadataRoute specification and docs/website/seo.md:
 * - Disallows private administrative cockpit routes (/admin, /admin/*, /api/admin/*) and build internals (/_next/*)
 * - Allows public marketing routes, stays catalog, contact, and GEO LLM endpoints
 * - Explicitly grants crawling access to AI discovery bots (GPTBot, ClaudeBot, PerplexityBot, etc.)
 * - Binds the authoritative XML sitemap location
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/stays",
          "/stays/*",
          "/contact",
          "/llms.txt",
          "/llms-full.txt",
        ],
        disallow: ["/admin", "/admin/*", "/api/admin/*", "/_next/*"],
      },
      // Explicit allowance for AI discovery crawlers
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "ClaudeBot",
          "PerplexityBot",
          "Google-Extended",
          "Applebot-Extended",
        ],
        allow: ["/", "/stays", "/stays/*", "/contact", "/llms.txt", "/llms-full.txt"],
        disallow: ["/admin", "/admin/*", "/api/admin/*"],
      },
    ],
    sitemap: `${SITE_CONFIG.baseUrl}/sitemap.xml`,
    host: SITE_CONFIG.baseUrl,
  };
}
