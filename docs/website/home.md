# Page Specification: Home / Landing Page (`/`) (`home.md`)

> **File Scope & Context for AI Agents:**
> - **Target Route / Component:** `app/(public)/page.tsx` (and subcomponents: Hero, PromoBanner, HighlightsGrid, ExperiencesStrip, FaqAccordion).
> - **Primary Purpose:** Public homepage introducing Parlak Resort, highlighting featured accommodation types, active seasonal promotions, resort experiences (pool, BBQ, lawn, future kayaking), and top visitor FAQs.
> - **Key Entities & Models Covered:** Active `SeasonalPromotion` (banner), featured `Unit` models (Dome, A-Frame, Event Hall), and static/dynamic experiences.
> - **Token Efficiency Note:** Read or edit this file when modifying homepage layout, hero text/images, promotional banner rendering, featured accommodation teaser cards, or FAQ answers. For full stays catalog, see [stays.md](file:///Users/thasbeeh/Projects/parlak_resort/docs/website/stays.md).

---

## 1. Page Sections Overview

### A. Hero Section
- Full-width background image with atmospheric tagline.
- Headline: *"Escape to Nature, Reconnect with Luxury"*
- Subheadline: *"Experience serene Geodesic Domes, scenic A-Frames, and magnificent open-air banquet spaces at Vallivattom, S.N. Puram, Keralam."*
- Direct Primary CTA: **"Book Your Stay / Event"** linking directly to `/stays`.

### B. Dynamic Promotional Banner
- Displays conditionally at the top of the viewport only if an Admin has configured an active Seasonal Promotion (e.g., *"Special Weekend Offer - Verify via WhatsApp"*).
- Fetches active status and expiry date from database model `PriceModifier` (`type: "SEASONAL"` where `startDate <= today <= endDate`, with `endDate >= startDate` strictly enforced via PostgreSQL constraint `chk_pricemodifier_dates`).

### C. Curated Highlights Grid
Displays 3 featured unit cards providing visitors an instant visual and pricing overview (each card strictly renders the unit's single `isFeatured: true` photo, guaranteed across the 4-step photo lifecycle: initial upload true, subsequent false, switching in transaction, and deletion auto-promotion with lowest orderIndex):
1. **Luxury Geodesic Dome:** Base rate from ₹3,500/night; capacity up to 3 Adults (strictly NO extra beds); highlights BBQ grill & pool access.
2. **Scenic A-Frame Chalet:** Base rate from ₹5,000/night; capacity up to 5 Adults (strictly NO extra beds); two-level chalet layout.
3. **Grand Open-Air Banquet Hall:** Starting slab rate from ₹10,000 (derived from the attached Price List with Zod `superRefine` contiguous slabs); capacity up to 1,200 Attendees.

### D. Property Highlights & Amenities Strip
- Visual badges for standard resort amenities: Lush Greenery, Designer Pool, Wi-Fi, On-Site Food Services till 10:30 PM.

### E. Experiences & Activities Showcase Strip
Visual photo cards showcasing recreation across the resort with active vs. upcoming indicators:
- 🏊‍♂️ **Designer Swimming Pool:** Modern pool flanked by tropical greenery (dedicated resident hours till 10:00 PM; exclusive 10:00 PM–11:00 PM slot on event days). Status: `ACTIVE`.
- 🔥 **Campfire & BBQ Experience:** Dedicated BBQ grill setup included for every Dome booking; campfire pit under the night sky. Status: `ACTIVE`.
- 🌿 **Lush Lawn & Recreation:** Manicured open lawns for leisure, badminton, and family unwinding. Status: `ACTIVE`.
- 🛶 **River Kayaking:** Calm water paddling session along the picturesque riverbank. Status: `UPCOMING` (Badge: *Upcoming / Under Construction*).
- 🎭 **Scenic Floating Stage:** Over-water performance and ceremony platform for grand celebrations. Status: `UPCOMING` (Badge: *Upcoming / Under Construction*).

### F. Frequently Asked Questions (Interactive FAQ Accordion)
Interactive accordion addressing the top 5 questions to minimize repetitive WhatsApp queries:
1. *What are standard check-in and gathering timings?*
   - Overnight stays: 12:00 PM Check-in, 11:00 AM Next Day Check-out.
   - Day Slots: 10:00 AM to 3:00 PM Same Day.
   - Event Halls: Morning Slot (10:00 AM – 3:00 PM) | Evening Slot (5:00 PM – 10:00 PM).
2. *How does the booking advance payment, stay extension, and scope reduction work?*
   - A dynamic booking advance is determined based on the attached rate plan or headcount slab at booking confirmation. It is non-refundable and credited directly toward your total room or hall rent (security deposits are strictly not tracked or collected). Confirmed bookings permanently preserve their agreed rates for the contracted scope (`bookedBaseRate`). Any subsequent stay extensions (extra nights, extra hours beyond preset blocks, added day slots) or event headcount increases crossing into higher slabs are calculated using the active Price List in effect at the time of the request. Headcount upgrades isolate the incremental cost with an algebraic floor ($\max(0, \text{ActiveRate}(\text{New Higher Slab}) - \text{ActiveRate}(\text{Original Booked Capacity}))$). Standard preset packages (Overnight 12 PM – 11 AM, Day Slot 10 AM – 3 PM, Event Slots) are billed as **flat baseline blocks**; shortening fractional hours yields no discount. Any scope reductions (fewer nights, dropped slots, or lower headcount slabs) act strictly as **Partial Cancellations** without automated refunds, subject to manual management review. All confirmed records enforce non-negative tariffs (`unitPrice >= 0`) and automatic PostgreSQL trigger calculations for `netRevenue = totalPaid - refundAmount`.
3. *Can Event Hall attendees use the swimming pool?*
   - Strictly NO under any circumstances. Swimming pool access is reserved exclusively for overnight Dome & A-Frame residents for safety and privacy.
4. *Are outside food and dining services available?*
   - Our on-site restaurant menu is available until 10:30 PM. Outside catering is permitted only for private event hall bookings.
5. *What is the maximum guest limit per unit?*
   - Adults are strictly capped at 3 for Domes and 5 for A-Frames. Infants are capped at 2 for Domes and 4 for A-Frames. Strictly NO extra beds provided.

---

## 2. Route Data Contract: Home Page (`GET /`)

### Inbound Request Payload (Page Request)
```typescript
// Next.js App Router Server Component Props
interface HomePageInboundRequest {
  params: Promise<Record<string, never>>;
  searchParams: Promise<{
    promo?: string;                     // e.g. "EID2026" or "WEEKEND10"
    ref?: string;                       // e.g. "whatsapp" or "instagram"
  }>;
}
```

### Outbound Server Data Payload (RSC / JSON)
```json
{
  "promotionalBanner": {
    "id": "promo-monsoon-2026",
    "title": "Monsoon Serenity Offer",
    "description": "Book any weekday stay via WhatsApp and receive a complimentary evening tea basket!",
    "badge": "Special Promotion",
    "isActive": true,
    "validUntil": "2026-10-31T18:29:59.000Z"
  },
  "hero": {
    "headline": "Escape to Nature, Reconnect with Luxury",
    "subheadline": "Experience serene Geodesic Domes, scenic A-Frames, and magnificent open-air banquet spaces at Vallivattom, S.N. Puram, Keralam.",
    "ctaText": "Book Your Stay / Event",
    "ctaLink": "/stays",
    "backgroundImageUrl": "https://res.cloudinary.com/parlak-resort/image/upload/v1/hero/lush_waterfront_hero.webp"
  },
  "curatedHighlights": [
    {
      "id": "unit-dome-featured",
      "slug": "geodesic-dome",
      "name": "Luxury Geodesic Dome",
      "category": "Dome",
      "capacityBadge": "Up to 3 Adults (Strict Cap)",
      "basePricePerNight": 3500,
      "defaultAdvance": 2000,
      "featuredPhoto": {
        "url": "https://res.cloudinary.com/parlak-resort/image/upload/v1/units/dome_featured.webp",
        "alt": "Panoramic window view of Geodesic Dome at night"
      },
      "amenitiesSummary": ["AC", "Wi-Fi", "Pool Access", "Complimentary BBQ Grill Kit", "Attached Bath"],
      "ctaRoute": "/stays/geodesic-dome"
    },
    {
      "id": "unit-aframe-featured",
      "slug": "scenic-a-frame",
      "name": "Scenic A-Frame Chalet",
      "category": "A-Frame",
      "capacityBadge": "Up to 5 Adults (Strict Cap)",
      "basePricePerNight": 5000,
      "defaultAdvance": 2000,
      "featuredPhoto": {
        "url": "https://res.cloudinary.com/parlak-resort/image/upload/v1/units/aframe_featured.webp",
        "alt": "Two-level A-Frame chalet nestled in greenery"
      },
      "amenitiesSummary": ["Double + Queen Beds", "AC", "Wi-Fi", "Pool Access", "Attached Bath"],
      "ctaRoute": "/stays/scenic-a-frame"
    },
    {
      "id": "unit-hall-featured",
      "slug": "non-ac-hall",
      "name": "Grand Open-Air Banquet Hall",
      "category": "Event Hall",
      "capacityBadge": "Up to 1,200 Attendees",
      "startingSlabPrice": 10000,
      "defaultAdvance": 5000,
      "featuredPhoto": {
        "url": "https://res.cloudinary.com/parlak-resort/image/upload/v1/units/hall_featured.webp",
        "alt": "Spacious banquet hall setup with stage and lighting"
      },
      "amenitiesSummary": ["Stage", "Generator", "Banquet Seating", "Pool Access Excluded"],
      "ctaRoute": "/stays/non-ac-hall"
    }
  ],
  "experiences": [
    {
      "title": "Designer Swimming Pool",
      "description": "Modern pool flanked by tropical greenery. Reserved exclusively for overnight stay residents.",
      "operationalNote": "Open till 10:00 PM (10:00 PM - 11:00 PM during event days)",
      "status": "ACTIVE",
      "imageUrl": "https://res.cloudinary.com/parlak-resort/image/upload/v1/experiences/pool.webp"
    },
    {
      "title": "Campfire & BBQ Experience",
      "description": "Dedicated BBQ grill setup included for every Dome booking; campfire pit under the night sky.",
      "operationalNote": "Provided with charcoal kit & skewers",
      "status": "ACTIVE",
      "imageUrl": "https://res.cloudinary.com/parlak-resort/image/upload/v1/experiences/campfire.webp"
    },
    {
      "title": "Lush Lawn & Recreation",
      "description": "Manicured open lawns for leisure, badminton, and family unwinding.",
      "operationalNote": "Open all day for resident guests",
      "status": "ACTIVE",
      "imageUrl": "https://res.cloudinary.com/parlak-resort/image/upload/v1/experiences/lawn.webp"
    },
    {
      "title": "River Kayaking",
      "description": "Calm water paddling session along the picturesque riverbank.",
      "operationalNote": "Launch platform in development",
      "status": "UPCOMING",
      "imageUrl": "https://res.cloudinary.com/parlak-resort/image/upload/v1/experiences/kayaking.webp"
    },
    {
      "title": "Scenic Floating Stage",
      "description": "Over-water performance and ceremony platform for unforgettable celebrations.",
      "operationalNote": "Under construction",
      "status": "UPCOMING",
      "imageUrl": "https://res.cloudinary.com/parlak-resort/image/upload/v1/experiences/floating_stage.webp"
    }
  ],
  "faqs": [
    {
      "question": "What are standard check-in and gathering timings?",
      "answer": "Overnight stays check in at 12:00 PM and check out at 11:00 AM next day. Day slots run from 10:00 AM to 3:00 PM same day. Event Halls operate strictly on slot gatherings: Morning Slot (10:00 AM – 3:00 PM) and Evening Slot (5:00 PM – 10:00 PM)."
    },
    {
      "question": "How does the booking advance payment, stay extension, and scope reduction work?",
      "answer": "Booking advances are dynamically determined by the attached rate plan or headcount slab at booking confirmation, non-refundable, and credited directly towards your room or venue rent (no security deposits tracked). Confirmed bookings preserve agreed baseline rates. Stay extensions (extra nights, extra hours beyond preset blocks, added day slots) and event headcount upgrades to higher slabs are calculated using the active price list in effect at modification time, with upgrades isolated using an algebraic floor (max(0, New Rate - Old Capacity Rate)). Standard packages are billed as flat baseline blocks (shortened hours yield no discount). Reductions in scope (fewer nights, dropped slots, lower headcount slabs) act strictly as Partial Cancellations subject to management review rather than automatic refunds. All bookings enforce non-negative tariffs (unitPrice >= 0) and automatic PostgreSQL trigger maintenance for netRevenue."
    },
    {
      "question": "Can Event Hall attendees use the swimming pool?",
      "answer": "Strictly NO under any circumstances. Swimming pool access is reserved exclusively for overnight Dome & A-Frame residents for safety and privacy."
    },
    {
      "question": "Are outside food and dining services available?",
      "answer": "Our on-site restaurant menu is available until 10:30 PM. Outside catering is permitted only for private event hall bookings."
    },
    {
      "question": "What is the maximum guest limit per unit?",
      "answer": "Guest count is strictly capped at 3 adults and 2 infants for Domes, and 5 adults and 4 infants for A-Frames. We strictly do not provide extra beds."
    }
  ],
  "seoMeta": {
    "title": "Parlak Resort & Farmhouse | Luxury Domes, A-Frames & Event Venues in Keralam",
    "description": "Book luxury Geodesic Domes, scenic A-Frames, and expansive event halls at Parlak Resort, Vallivattom, S.N. Puram, Keralam. Direct WhatsApp reservation at +91 88919 31123.",
    "ogImage": "https://res.cloudinary.com/parlak-resort/image/upload/v1/seo/home_og.webp",
    "ogUrl": "https://parlakfarmhouse.com"
  }
}
```
