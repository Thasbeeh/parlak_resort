# Page Specification: Stays & Venues Unified Listing (`/stays`) (`stays.md`)

> **File Scope & Context for AI Agents:**
> - **Target Route / Component:** `app/(public)/stays/page.tsx` (and subcomponents: CategoryFilterTabs, UnitCardsGrid, UnitCardItem).
> - **Primary Purpose:** Unified catalog displaying all resort accommodation and event venues under a single filterable listing, without fragmenting rooms and event spaces into separate pages.
> - **Key Entities & Models Covered:** Active `Unit` inventory (`DOME`, `A_FRAME`, `HALL`), category tabs, base display rates, guest capacity badges, and routing links to dynamic unit detail pages (`/stays/:id`).
> - **Token Efficiency Note:** Read or edit this file when modifying the listing catalog, filtering logic, unit card layouts, or category tab counts. For granular unit details and booking forms, see [unit_detail.md](file:///Users/thasbeeh/Projects/parlak_resort/docs/website/unit_detail.md).

---

## 1. Unified Listing Catalog Architecture

Instead of splitting rooms and halls into separate URLs, all resort units live under a single filterable listing catalog.

### A. Category Filter Tabs
Users can quickly filter units by category chip buttons:
- `[ All ]` — Displays all active accommodation units and event halls.
- `[ Domes ]` — Filters exclusively for Luxury Geodesic Domes.
- `[ A-Frames ]` — Filters exclusively for Scenic A-Frame Chalets.
- `[ Event Halls ]` — Filters exclusively for Banquet & Convention Venues.

### B. Inventory Cards Grid
Renders active inventory items fetched from PostgreSQL:

#### Card Elements for Stays (Domes & A-Frames):
- Featured thumbnail photograph (strictly renders the single `isFeatured: true` image, guaranteed by the 4-step application lifecycle: first upload is true, subsequent default to false, switching executes in a `prisma.$transaction`, and deleting an active featured photo auto-promotes the remaining photo with lowest `orderIndex`).
- Unit Type badge (e.g., *"Geodesic Dome"*, *"A-Frame"*).
- Guest capacity badge: `Up to 3 Adults per unit` (Domes) or `Up to 5 Adults per unit` (A-Frames). Strictly NO extra beds.
- Base price per night (e.g., `From ₹3,500 / night`).
- Standard amenities badges (AC, Wi-Fi, Pool Access, BBQ Setup).
- CTA button: **"View Details & Book"** (routes directly to `/stays/:id`).

#### Card Elements for Event Halls:
- Venue cover photograph (strictly renders the venue's single `isFeatured: true` photo).
- Venue Name (*"Non-AC Event Hall"* / *"AC Grand Ballroom"*).
- Guest capacity badge: `Up to 1,200 Guests` (Non-AC) or `Up to 2,000 Guests` (AC).
- Starting slab price teaser (e.g., `Starting from ₹10,000`, derived from the attached Price List whose headcount slabs are guaranteed contiguous with zero gaps via Zod `superRefine`).
- Status / construction badge (e.g., Non-AC is `AVAILABLE`; AC Hall has badge `Under Construction` with CTA `Coming Soon`).
- CTA button: **"View Details & Inquire"** (routes to `/stays/:id`).

#### Unit Status & Pre-Deactivation Guardrail:
- Only units marked `isActive: true` in PostgreSQL render as `AVAILABLE` with booking CTAs enabled.
- Any unit toggled to `Inactive` renders with a disabled CTA and status badge `Sold Out` (or `Under Construction` / `Coming Soon` for AC Hall).
- The Admin Panel strictly prevents toggling any unit to Inactive if future active bookings exist (`UNIT_HAS_FUTURE_BOOKINGS`), ensuring no active reservations are orphaned.

#### Scope-Based Pricing, Extension & Cancellation Policy:
- **Active Catalogue Rates & Date-Bounded Modifiers:** Displayed rates reflect the active catalogue rate card for new reservations. Both `WEEKEND` and `SEASONAL` modifiers require explicit date ranges (`endDate >= startDate` enforced in PostgreSQL via `chk_pricemodifier_dates`).
- **Baseline Scope Preservation:** Confirmed bookings permanently preserve their agreed rates (`bookedBaseRate`) for the original contracted scope. Historical bookings never suffer retroactive rate increases.
- **Incremental Expansion at Active Rates:** Any subsequent stay extensions (extra nights, early check-in / late check-out hours beyond preset blocks, added Day Slots) or event headcount increases into higher slabs are calculated using the active Price List in effect at the time of modification.
- **Algebraic Floor on Headcount Upgrades:** Headcount upgrades into higher slabs isolate the incremental charge with an algebraic floor ($\max(0, \text{ActiveRate}(\text{New Higher Slab}) - \text{ActiveRate}(\text{Original Booked Capacity}))$), comparing both tiers against the active tariff to prevent negative discounts.
- **Flat Baseline Blocks:** Standard packages (Overnight 12:00 PM – 11:00 AM, Day Slot 10:00 AM – 3:00 PM, Event Hall Morning/Evening Slots) are billed as **flat baseline blocks**. Shortening fractional hours (checking in late or departing early) does not discount the baseline rent.
- **Universal Scope Reductions (Partial Cancellations):** Any reduction in scope (fewer nights, dropped discrete slots, or lower headcount slabs) acts strictly as a **Partial Cancellation**. The system does not issue automatic refunds; the baseline rent remains locked, and any refund or adjustment requires manual administrative review.
- **Grandfathering Orphaned Capacities:** If an active Price List is downsized, historical bookings exceeding the new capacity preserve contracted rates on date shifts, but upward headcount increases are mathematically blocked without an active slab.
- **Downstream Booking Integrity Guarantees:** When inquiries are converted to confirmed reservations, `BookingUnit.unitPrice` is guarded by `chk_booking_unit_price` (`unitPrice >= 0`), and `Booking.netRevenue` is automatically computed and maintained by PostgreSQL trigger `trigger_calculate_net_revenue`.

---

## 2. Route Data Contract: Unified Listing Page (`GET /stays`)

### Inbound Request Payload (Catalog Filters & Query Params)
```typescript
// Incoming URL search params resolved by Next.js Server Components
interface StaysListingInboundRequest {
  params: Promise<Record<string, never>>;
  searchParams: Promise<{
    category?: "ALL" | "DOMES" | "A_FRAMES" | "EVENT_HALLS";
    stayType?: "OVERNIGHT" | "DAY_SLOT";
    checkIn?: string;                   // ISO date string: "YYYY-MM-DD"
    checkOut?: string;                  // ISO date string: "YYYY-MM-DD"
  }>;
}
```

### Outbound Server Data Payload (RSC / Catalog JSON)
```json
{
  "activeFilter": {
    "category": "ALL",
    "stayType": "OVERNIGHT",
    "checkIn": null,
    "checkOut": null
  },
  "categoryTabs": [
    { "key": "ALL", "label": "All Stays & Venues", "count": 4 },
    { "key": "DOMES", "label": "Geodesic Domes", "count": 1 },
    { "key": "A_FRAMES", "label": "A-Frames", "count": 1 },
    { "key": "EVENT_HALLS", "label": "Event Halls", "count": 2 }
  ],
  "units": [
    {
      "id": "unit-dome-01",
      "slug": "geodesic-dome",
      "name": "Luxury Geodesic Dome",
      "category": "DOME",
      "categoryLabel": "Geodesic Dome",
      "capacityBadge": "Up to 3 Adults per unit",
      "maxCapacity": 3,
      "pricing": {
        "displayRate": 3500,
        "rateLabel": "per night (Overnight)",
        "daySlotRate": 2500,
        "advancePayment": 2000
      },
      "featuredPhoto": {
        "url": "https://res.cloudinary.com/parlak-resort/image/upload/v1/units/dome_main.webp",
        "alt": "Panoramic luxury geodesic dome at sunset"
      },
      "amenitiesSummary": ["AC", "Wi-Fi", "Pool Access", "Attached Bath", "BBQ Grill Setup"],
      "isActive": true,
      "status": "AVAILABLE",
      "ctaText": "View Details & Book",
      "detailRoute": "/stays/geodesic-dome"
    },
    {
      "id": "unit-aframe-01",
      "slug": "scenic-a-frame",
      "name": "Scenic A-Frame Chalet",
      "category": "A_FRAME",
      "categoryLabel": "A-Frame",
      "capacityBadge": "Up to 5 Adults per unit",
      "maxCapacity": 5,
      "pricing": {
        "displayRate": 5000,
        "rateLabel": "per night (Overnight)",
        "daySlotRate": 3500,
        "advancePayment": 2000
      },
      "featuredPhoto": {
        "url": "https://res.cloudinary.com/parlak-resort/image/upload/v1/units/aframe_main.webp",
        "alt": "Two-level A-Frame chalet facing the garden"
      },
      "amenitiesSummary": ["Double + Queen Beds", "AC", "Wi-Fi", "Pool Access", "Attached Bath"],
      "isActive": true,
      "status": "AVAILABLE",
      "ctaText": "View Details & Book",
      "detailRoute": "/stays/scenic-a-frame"
    },
    {
      "id": "unit-hall-non-ac",
      "slug": "non-ac-hall",
      "name": "Non-AC Event Hall",
      "category": "HALL",
      "categoryLabel": "Event Hall",
      "capacityBadge": "Up to 1,200 Guests",
      "maxCapacity": 1200,
      "pricing": {
        "displayRate": 10000,
        "rateLabel": "starting slab rate",
        "startingAdvance": 5000
      },
      "featuredPhoto": {
        "url": "https://res.cloudinary.com/parlak-resort/image/upload/v1/units/hall_non_ac_main.webp",
        "alt": "Open banquet hall setup with illuminated stage"
      },
      "amenitiesSummary": ["Stage", "Generator", "Banquet Seating", "Pool Access Excluded"],
      "isActive": true,
      "status": "AVAILABLE",
      "ctaText": "View Details & Inquire",
      "detailRoute": "/stays/non-ac-hall"
    },
    {
      "id": "unit-hall-ac",
      "slug": "ac-hall",
      "name": "AC Grand Ballroom & Hall",
      "category": "HALL",
      "categoryLabel": "Event Hall",
      "capacityBadge": "Up to 2,000 Guests",
      "maxCapacity": 2000,
      "pricing": {
        "displayRate": 18000,
        "rateLabel": "starting slab rate",
        "startingAdvance": 10000
      },
      "featuredPhoto": {
        "url": "https://res.cloudinary.com/parlak-resort/image/upload/v1/units/hall_ac_render.webp",
        "alt": "Modern air-conditioned event auditorium"
      },
      "amenitiesSummary": ["Central AC", "Acoustic Stage", "Generator", "Pool Access Excluded"],
      "isActive": false,
      "status": "INACTIVE",
      "badge": "Under Construction",
      "ctaText": "Coming Soon",
      "detailRoute": "/stays/ac-hall"
    }
  ],
  "seoMeta": {
    "title": "Stays & Venues | Parlak Resort & Farmhouse Keralam",
    "description": "Browse luxury Geodesic Domes, scenic A-Frames, and waterfront banquet event halls at Parlak Resort, Vallivattom, S.N. Puram, Keralam. Check availability and reserve directly via WhatsApp.",
    "ogImage": "https://res.cloudinary.com/parlak-resort/image/upload/v1/seo/stays_catalog_og.webp",
    "ogUrl": "https://parlakfarmhouse.com/stays"
  }
}
```
