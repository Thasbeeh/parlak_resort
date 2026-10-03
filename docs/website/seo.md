# Comprehensive SEO & Generative Engine Optimization (GEO) Plan

**Project:** Parlak Resort & Farmhouse  
**Primary Domain:** `https://parlakfarmhouse.com`  
**Official Email:** `info.parlakresort@gmail.com`  
**Official Phone / WhatsApp:** `+91 88919 31123` (`918891931123`)  
**Physical Address:** Vallivattom, S.N. Puram, Keralam 680661  
**Google Plus Code:** `75GP+QP Sreenarayanapuram, Keralam`  
**Google Maps Location:** [https://maps.app.goo.gl/GJyr7qpHWfVxWXtP9](https://maps.app.goo.gl/GJyr7qpHWfVxWXtP9)  
**Social Profiles:**  
- Instagram: [https://www.instagram.com/parlak___](https://www.instagram.com/parlak___)  
- Facebook: [https://www.facebook.com/profile.php?id=61550970517881](https://www.facebook.com/profile.php?id=61550970517881)  
- YouTube: [https://www.youtube.com/@PARLAK-v9s](https://www.youtube.com/@PARLAK-v9s)  

---

## 1. Executive SEO Strategy & Architecture

To establish maximum visibility on organic search engines (Google, Bing) and emerging AI/LLM discovery engines (Perplexity, ChatGPT Search, Claude, Google Gemini), Parlak Resort employs a dual-pillar strategy:

1. **Traditional Technical & Local SEO:**
   - Server-Side Rendered (SSR) HTML via Next.js 16 App Router.
   - Full OpenGraph metadata optimized specifically for WhatsApp chat previews (rich cards).
   - Rich JSON-LD Structured Data (`LodgingBusiness`, `EventVenue`, `FAQPage`, `BreadcrumbList`).
   - Automated dynamic `robots.ts` and `sitemap.ts` pulling active inventory directly from PostgreSQL via Prisma.
2. **Generative Engine Optimization (GEO):**
   - Native implementation of the standardized `llms.txt` and `llms-full.txt` protocols.
   - Delivers concise, deterministic, hallucination-free resort facts, room capacities, pricing slabs, and WhatsApp reservation instructions directly to AI bots.

---

## 2. Global Metadata Architecture (`app/layout.tsx`)

Next.js 16 App Router provides centralized metadata resolution using `metadataBase`.

```typescript
// app/layout.tsx
import type { Metadata } from 'next';
import { SITE_CONFIG } from '@/lib/constants';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.baseUrl),
  title: {
    default: `${SITE_CONFIG.name} | Luxury Domes, A-Frames & Event Venues in Keralam`,
    template: `%s | ${SITE_CONFIG.name}`,
  },
  description:
    'Experience luxury Geodesic Domes, scenic A-Frame chalets, and grand banquet event halls at Parlak Resort & Farmhouse in Vallivattom, S.N. Puram, Keralam. Direct WhatsApp reservation at +91 88919 31123.',
  keywords: [
    'Parlak Resort',
    'Parlak Farmhouse',
    'Geodesic Dome Stay Kerala',
    'A-Frame Chalet Kerala',
    'S.N. Puram Resort',
    'Vallivattom Resort',
    'Sreenarayanapuram Resort',
    'Event Hall S.N. Puram',
    'Wedding Venue Thrissur',
    'Banquet Hall Kerala',
    'Waterfront Stay Kerala',
    'Resort with Pool Kerala',
  ],
  authors: [{ name: SITE_CONFIG.name, url: SITE_CONFIG.baseUrl }],
  creator: SITE_CONFIG.name,
  publisher: SITE_CONFIG.name,
  formatDetection: {
    telephone: true,
    address: true,
    email: true,
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: SITE_CONFIG.baseUrl,
    siteName: SITE_CONFIG.name,
    title: `${SITE_CONFIG.name} | Luxury Domes & Event Venues in Keralam`,
    description:
      'Book luxury Geodesic Domes, scenic A-Frames, and open-air event halls at Parlak Resort, Vallivattom, S.N. Puram. Transparent pricing & direct WhatsApp booking.',
    images: [
      {
        url: 'https://res.cloudinary.com/parlak-resort/image/upload/v1/seo/parlak_og_main.webp',
        width: 1200,
        height: 630,
        alt: 'Parlak Resort Geodesic Domes and Riverside Grounds',
        type: 'image/webp',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_CONFIG.name} | Luxury Domes & Event Venues`,
    description:
      'Book luxury Geodesic Domes, scenic A-Frames, and open-air event halls at Parlak Resort, Vallivattom, S.N. Puram.',
    images: ['https://res.cloudinary.com/parlak-resort/image/upload/v1/seo/parlak_og_main.webp'],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};
```

---

## 3. Page-Level Dynamic Metadata System

Every route resolves contextual metadata using Next.js `generateMetadata()` to generate rich previews when links are shared in WhatsApp chats.

### WhatsApp Link Preview Requirements
- **Aspect Ratio:** 1.91:1 (ideal dimensions: `1200 × 630 px`).
- **File Size:** Strictly **< 300 KB** (WhatsApp scraper rejects images exceeding 300 KB).
- **Format:** Optimized WebP or JPEG delivered via Cloudinary CDN.
- **Protocol:** Absolute HTTPS URLs only.

### Route Metadata Matrix

| Route | Title Tag | Meta Description | OpenGraph Image |
| :--- | :--- | :--- | :--- |
| `/` | `Parlak Resort & Farmhouse \| Luxury Domes & Event Venues in Keralam` | Experience Geodesic Domes, A-Frames, and banquet halls at Vallivattom, S.N. Puram. Direct WhatsApp booking. | `parlak_og_main.webp` (1200x630) |
| `/stays` | `Stays & Venues Catalog \| Parlak Resort` | Explore luxury Geodesic Domes (max 3 pax), A-Frames (max 5 pax), and 1,200-capacity event halls. | `stays_catalog_og.webp` (1200x630) |
| `/stays/geodesic-dome` | `Luxury Geodesic Dome (Max 3 Pax) \| Parlak Resort` | Private AC Dome with BBQ grill setup, attached bath, and swimming pool access. From ₹3,500/night. | `dome_featured.webp` (1200x630) |
| `/stays/scenic-a-frame` | `Scenic A-Frame Chalet (Max 5 Pax) \| Parlak Resort` | Two-level chalet featuring Double and Queen beds with pool access. From ₹5,000/night. | `aframe_featured.webp` (1200x630) |
| `/stays/non-ac-hall` | `Non-AC Event Hall (Up to 1,200 Pax) \| Parlak Resort` | Grand open-air banquet space with stage and generator backup. Slab pricing from ₹10,000. | `hall_featured.webp` (1200x630) |
| `/contact` | `Contact Us & Directions \| Parlak Resort & Farmhouse` | Reach Parlak Resort at Vallivattom, S.N. Puram, Keralam 680661. Call/WhatsApp +91 88919 31123. | `contact_og.webp` (1200x630) |

---

## 4. Structured Data (JSON-LD) Schemas

Injected via `<script type="application/ld+json">` to secure Google Rich Snippets, Local Pack rankings, and Google Maps Knowledge Panels.

### A. Master Resort Business Schema (`LodgingBusiness` & `Resort`)
Placed in `app/(public)/layout.tsx`:

```json
{
  "@context": "https://schema.org",
  "@type": ["Resort", "LodgingBusiness"],
  "@id": "https://parlakfarmhouse.com/#resort",
  "name": "Parlak Resort & Farmhouse",
  "legalName": "Parlak Resort",
  "url": "https://parlakfarmhouse.com",
  "logo": "https://parlakfarmhouse.com/logo.png",
  "image": "https://res.cloudinary.com/parlak-resort/image/upload/v1/seo/parlak_og_main.webp",
  "description": "Luxury waterfront farmhouse and eco-resort in Vallivattom, S.N. Puram, Keralam featuring Geodesic Domes, A-Frame chalets, designer swimming pool, and banquet event halls.",
  "telephone": "+918891931123",
  "email": "info.parlakresort@gmail.com",
  "priceRange": "₹₹",
  "currenciesAccepted": "INR",
  "paymentAccepted": "Cash, UPI, Bank Transfer",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Vallivattom",
    "addressLocality": "S.N. Puram (Sreenarayanapuram)",
    "addressRegion": "Keralam",
    "postalCode": "680661",
    "addressCountry": "IN"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 10.2769,
    "longitude": 76.1868
  },
  "hasMap": "https://maps.app.goo.gl/GJyr7qpHWfVxWXtP9",
  "sameAs": [
    "https://www.instagram.com/parlak___",
    "https://www.facebook.com/profile.php?id=61550970517881",
    "https://www.youtube.com/@PARLAK-v9s",
    "https://maps.app.goo.gl/GJyr7qpHWfVxWXtP9"
  ],
  "checkinTime": "12:00",
  "checkoutTime": "11:00",
  "amenityFeature": [
    { "@type": "LocationFeatureSpecification", "name": "Designer Swimming Pool", "value": true },
    { "@type": "LocationFeatureSpecification", "name": "Campfire & BBQ Grill Setup", "value": true },
    { "@type": "LocationFeatureSpecification", "name": "Free High-Speed Wi-Fi", "value": true },
    { "@type": "LocationFeatureSpecification", "name": "Attached Modern Bathrooms", "value": true },
    { "@type": "LocationFeatureSpecification", "name": "Climate Controlled AC", "value": true }
  ]
}
```

### B. Event Venue Schema (`EventVenue`)
Injected on `/stays/non-ac-hall`:

```json
{
  "@context": "https://schema.org",
  "@type": "EventVenue",
  "name": "Parlak Resort Non-AC Event Hall",
  "url": "https://parlakfarmhouse.com/stays/non-ac-hall",
  "maximumAttendeeCapacity": 1200,
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Vallivattom",
    "addressLocality": "S.N. Puram",
    "addressRegion": "Keralam",
    "postalCode": "680661",
    "addressCountry": "IN"
  },
  "amenityFeature": [
    { "@type": "LocationFeatureSpecification", "name": "Presentation Stage", "value": true },
    { "@type": "LocationFeatureSpecification", "name": "High-Capacity Diesel Generator", "value": true },
    { "@type": "LocationFeatureSpecification", "name": "Banquet Seating", "value": true },
    { "@type": "LocationFeatureSpecification", "name": "Swimming Pool Access", "value": false }
  ]
}
```

### C. Interactive FAQ Accordion Schema (`FAQPage`)
Injected on the Home page (`app/(public)/page.tsx`):

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What are standard check-in and check-out timings?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Overnight stays check in at 12:00 PM IST and check out at 11:00 AM IST next day. Day slots run from 10:00 AM to 3:00 PM IST same day."
      }
    },
    {
      "@type": "Question",
      "name": "How does the ₹2,000 refundable security deposit work?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A ₹2,000 security deposit per room unit is collected during booking confirmation and 100% refunded at check-out upon standard room inspection."
      }
    },
    {
      "@type": "Question",
      "name": "Can Event Hall attendees use the swimming pool?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Strictly NO. Swimming pool access is reserved exclusively for overnight Dome and A-Frame residents for safety and privacy."
      }
    },
    {
      "@type": "Question",
      "name": "Are outside food and dining services available?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Our on-site restaurant menu is available until 10:30 PM IST. Outside catering is permitted only for private event hall bookings."
      }
    },
    {
      "@type": "Question",
      "name": "What is the maximum guest limit per unit?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Guest count is strictly capped at 3 guests for Domes and 5 guests for A-Frames. Extra beds are strictly prohibited."
      }
    }
  ]
}
```

---

## 5. `robots.txt` Specification (`app/robots.ts`)

Next.js 16 App Router generates `robots.txt` programmatically via `app/robots.ts`:

```typescript
// app/robots.ts
import { MetadataRoute } from 'next';
import { SITE_CONFIG } from '@/lib/constants';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/stays', '/stays/*', '/contact', '/llms.txt', '/llms-full.txt'],
        disallow: ['/admin', '/admin/*', '/api/admin/*', '/_next/*'],
      },
      // Explicit allowance for AI discovery crawlers
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'ClaudeBot',
          'PerplexityBot',
          'Google-Extended',
          'Applebot-Extended',
        ],
        allow: ['/', '/stays/*', '/contact', '/llms.txt', '/llms-full.txt'],
        disallow: ['/admin', '/admin/*'],
      },
    ],
    sitemap: `${SITE_CONFIG.baseUrl}/sitemap.xml`,
    host: SITE_CONFIG.baseUrl,
  };
}
```

---

## 6. Dynamic `sitemap.xml` Specification (`app/sitemap.ts`)

Automatically generates XML sitemaps including all static landing pages and active inventory units from PostgreSQL.

```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { SITE_CONFIG } from '@/lib/constants';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_CONFIG.baseUrl;

  // Static marketing pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/stays`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];

  // Dynamic active units from PostgreSQL
  try {
    const units = await prisma.unit.findMany({
      where: { isActive: true },
      select: { id: true, category: true, updatedAt: true },
    });

    const dynamicRoutes: MetadataRoute.Sitemap = units.map((unit) => {
      const slug = unit.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return {
        url: `${baseUrl}/stays/${slug}`,
        lastModified: unit.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.8,
      };
    });

    return [...staticRoutes, ...dynamicRoutes];
  } catch (error) {
    console.error('Failed to fetch dynamic units for sitemap:', error);
    return staticRoutes;
  }
}
```

---

## 7. Generative Engine Optimization: `llms.txt`

The `llms.txt` specification creates a curated markdown summary for AI agents (Perplexity, ChatGPT, Claude, Gemini, Cursor) looking for factual resort data.

### Implementation: `app/llms.txt/route.ts`
Can be served dynamically via a Next.js Route Handler or as a static file in `public/llms.txt`:

```markdown
# Parlak Resort & Farmhouse

> Luxury waterfront resort and farmhouse in Vallivattom, S.N. Puram, Keralam offering Geodesic Domes, A-Frames, and Banquet Event Venues.

## Essential Information
- **Domain:** https://parlakfarmhouse.com
- **WhatsApp & Phone:** +91 88919 31123 (wa.me/918891931123)
- **Email:** info.parlakresort@gmail.com
- **Address:** Vallivattom, S.N. Puram, Keralam 680661
- **Google Plus Code:** 75GP+QP Sreenarayanapuram, Keralam
- **Google Maps:** https://maps.app.goo.gl/GJyr7qpHWfVxWXtP9
- **Socials:** Instagram (@parlak___), Facebook, YouTube

## Accommodations & Hard Capacity Rules
- **Geodesic Domes:** 4 Units. Hard Cap: Maximum 3 Adults + Infants. Strictly NO extra beds. Attached Bath, AC, Wi-Fi, Pool Access, BBQ Grill Setup. Base Rate: ₹3,500/night (Overnight), ₹2,500 (Day Slot: 10 AM - 3 PM). ₹2,000 refundable deposit.
- **Scenic A-Frames:** 3 Units. Hard Cap: Maximum 5 Adults + Infants. Both Double & Queen beds included. Strictly NO extra beds. Attached Bath, AC, Wi-Fi, Pool Access. Base Rate: ₹5,000/night (Overnight), ₹3,500 (Day Slot). ₹2,000 refundable deposit.

## Event Venues & Slabs
- **Non-AC Event Hall:** Active. Max capacity 1,200 attendees. Booked in slots (Slot A: 10 AM - 3 PM, Slot B: 5 PM - 10 PM, Full Day: 10 AM - 10 PM). Slabs: 10-25 pax (₹10,000), up to 801-1,200 pax (₹72,000). Slabs of 400+ pax qualify for complimentary attached Dome.
- **AC Event Hall:** 2,000 capacity (Under Construction).

## Important Operational Policies
- **Check-in / Check-out:** Overnight: 12:00 PM Check-in, 11:00 AM Check-out next day. Day Slot: 10:00 AM to 3:00 PM same day.
- **Swimming Pool:** Strictly forbidden for Event Hall attendees. Open for Dome & A-Frame residents until 10:00 PM (10:00 PM - 11:00 PM on event days).
- **Dining:** Menu orders available until 10:30 PM IST.
- **Booking Flow:** The website performs zero direct database writes. All reservations compile into structured WhatsApp links routing directly to +91 88919 31123.

## Full Context
- Detailed Documentation & Policy Manual: https://parlakfarmhouse.com/llms-full.txt
```

---

## 8. Generative Engine Optimization: `llms-full.txt`

Served via `app/llms-full.txt/route.ts` or `public/llms-full.txt`. It contains the complete, unabridged operational manual of the property, including exact slab pricing, deposit amounts, refund policies, and WhatsApp compilation schemas.

```markdown
# Parlak Resort & Farmhouse - Full Operational & Architectural Context

This document provides complete, deterministic context for Large Language Models, AI assistants, and automated systems interacting with Parlak Resort.

## 1. Property Identity & Contact
- Legal / Trade Name: Parlak Resort & Farmhouse
- Official Domain: https://parlakfarmhouse.com
- Central Contact: +91 88919 31123 (Voice & WhatsApp)
- Direct WhatsApp URL: https://wa.me/918891931123
- Official Booking Email: info.parlakresort@gmail.com
- Physical Address: Vallivattom, S.N. Puram, Keralam 680661
- Coordinates / Plus Code: 75GP+QP Sreenarayanapuram, Keralam (10.2769° N, 76.1868° E)
- Google Maps Link: https://maps.app.goo.gl/GJyr7qpHWfVxWXtP9

## 2. Inventory & Unit Specifications
### A. Geodesic Domes (4 Units: Dome 1, Dome 2, Dome 3, Dome 4)
- Default Capacity: 3 Adults + Infants
- Hard Cap Rule: Maximum 3 Guests. Strictly NO extra beds permitted.
- Amenities Included: Climate-controlled AC, High-speed Wi-Fi, En-suite Attached Bath, Smart TV, Pool Access.
- Standard Baseline Amenities: Electric Kettle with Tea/Coffee/Milk kit, 1L bottled water, essential toiletries, dedicated outdoor BBQ grill setup.
- Overnight Base Rate: ₹3,500 per night (12:00 PM Check-in to 11:00 AM Next Day Check-out).
- Day Slot Base Rate: ₹2,500 (10:00 AM to 3:00 PM Same Day).
- Weekend Rate Override (Sat/Sun): ₹4,200 per night.
- Security Deposit: ₹2,000 per room unit (100% refundable at check-out upon standard room inspection).

### B. Scenic A-Frames (3 Units: A-Frame 1, A-Frame 2, A-Frame 3)
- Default Capacity: 5 Adults + Infants
- Hard Cap Rule: Maximum 5 Guests. Strictly NO extra beds permitted.
- Bedding Setup: Contains both Double Bed and Queen Bed.
- Amenities: AC, Wi-Fi, Attached Modern Bathroom, Pool Access.
- Overnight Base Rate: ₹5,000 per night.
- Day Slot Base Rate: ₹3,500.
- Weekend Rate Override: ₹5,800 per night.
- Security Deposit: ₹2,000 per room unit (100% refundable at check-out).

### C. Non-AC Event Hall (Active)
- Maximum Venue Capacity: 1,200 Attendees.
- Operational Slots:
  - Slot A: 10:00 AM to 3:00 PM IST
  - Slot B: 5:00 PM to 10:00 PM IST
  - Full Day: 10:00 AM to 10:00 PM IST
- Headcount Slab Pricing Table:
  - 10 to 25 Pax: ₹10,000 (Required Advance Deposit: ₹5,000)
  - 26 to 50 Pax: ₹16,000 (Required Advance Deposit: ₹5,000)
  - 51 to 100 Pax: ₹24,000 (Required Advance Deposit: ₹6,000)
  - 101 to 200 Pax: ₹35,000 (Required Advance Deposit: ₹8,000)
  - 201 to 400 Pax: ₹46,000 (Required Advance Deposit: ₹8,000)
  - 401 to 800 Pax: ₹58,000 (Required Advance Deposit: ₹10,000)
  - 801 to 1,200 Pax: ₹72,000 (Required Advance Deposit: ₹15,000)
- Complimentary Dome Perk: Headcount tiers of 400+ attendees are eligible for 1 complimentary attached Dome during event hours.
- Amenities Included: Stage, diesel generator backup, banquet tables & chairs, water facilities.
- Pool Access Rule: Swimming pool access is strictly forbidden for event attendees.

### D. AC Event Hall (Under Construction)
- Capacity: 2,000 Attendees. Marked Inactive in database until construction concludes.

## 3. Operational Policies & Invariants
- Timings: Overnight check-in: 12:00 PM | Overnight check-out: 11:00 AM next day.
- Dining: On-site kitchen and room service available until 10:30 PM IST.
- Swimming Pool:
  - Standard Days: Open for Dome and A-Frame residents until 10:00 PM IST.
  - Event Days: Closed during event hours. Dome & A-Frame residents receive exclusive late-night slot from 10:00 PM to 11:00 PM IST.
  - Event Attendees: Strictly prohibited from using the pool at all times.
- Checkout Invariant: A booking cannot be marked as Checked-Out in the Admin Panel unless the final balance due is ₹0.
- Database Concurrency: Enforced at the PostgreSQL level via a `btree_gist` exclusion constraint (`tstzrange`) on `BookingUnit` records. Overlapping bookings return HTTP 409 Conflict.

## 4. How Guests Book (Zero Database Write Architecture)
1. Guests browse https://parlakfarmhouse.com/stays
2. Guests choose dates and stay type (Overnight or Day Slot).
3. The website checks availability via read-only API `GET /api/availability`.
4. Clicking "Book via WhatsApp" formats all guest selections into a pre-filled `https://wa.me/918891931123?text=...` link.
5. The resort manager confirms availability on WhatsApp, collects the advance deposit via UPI/Bank transfer, and manually enters the confirmed reservation into the Admin Panel.
```

---

## 9. Technical SEO & Core Web Vitals Optimization

To guarantee sub-second page loads and 95+ Google Lighthouse scores:

1. **Largest Contentful Paint (LCP) Optimization:**
   - Preload hero images using Next.js Image component with `priority` and `fetchPriority="high"`.
   - Deliver all unit gallery photos via Cloudinary CDN with automatic format negotiation (`f_auto`) and quality compression (`q_auto`).
2. **Cumulative Layout Shift (CLS) Prevention:**
   - Explicit `width` and `height` properties on all image containers.
   - Use CSS `aspect-ratio: 16/9` on card thumbnails to prevent layout jumps before images hydrate.
3. **Interaction to Next Paint (INP) Optimization:**
   - Keep public components as React Server Components (RSC) by default.
   - Limit `"use client"` directives strictly to date pickers, room stepper counters, and FAQ accordions.
4. **Semantic HTML5 & Accessibility:**
   - Exactly one `<h1>` per page.
   - Semantic landmarks: `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`.
   - Descriptive `alt` attributes on all photo gallery items (e.g., `"Interior of Geodesic Dome at Parlak Resort with panoramic window"`).
5. **Local Business Citations:**
   - Exact NAP consistency (Name, Address, Phone):  
     **Name:** Parlak Resort & Farmhouse  
     **Address:** Vallivattom, S.N. Puram, Keralam 680661  
     **Phone:** +91 88919 31123  
     **Map:** [https://maps.app.goo.gl/GJyr7qpHWfVxWXtP9](https://maps.app.goo.gl/GJyr7qpHWfVxWXtP9)  
     **Plus Code:** `75GP+QP Sreenarayanapuram, Keralam`  

---

## 10. SEO Implementation Checklist

- [ ] Create `app/robots.ts` with user-agent rules and sitemap link.
- [ ] Create `app/sitemap.ts` with static routes and Prisma dynamic unit slugs.
- [ ] Create `public/llms.txt` and `public/llms-full.txt` (or Route Handlers).
- [ ] Implement `JsonLd` component in `components/seo/JsonLd.tsx`.
- [ ] Add `LodgingBusiness` structured data to `app/(public)/layout.tsx`.
- [ ] Add `FAQPage` structured data to `app/(public)/page.tsx`.
- [ ] Add `EventVenue` structured data to `/stays/non-ac-hall`.
- [ ] Verify OpenGraph WhatsApp preview rendering with images under 300 KB.
- [ ] Validate sitemap and robots endpoints via Google Search Console and Bing Webmaster Tools.
