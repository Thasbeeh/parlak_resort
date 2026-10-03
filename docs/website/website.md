# Complete Public Website Requirements (5-Day Scope)

**Core Architectural Rule (Read-Only Frontend):**
The public frontend performs read operations against the database to fetch inventory, pricing, and blocked calendar dates. It **never writes directly to the database**. All inquiries and reservations compile into structured `https://wa.me/` URLs, routing the user to the resort's WhatsApp. Bookings are manually entered into the Admin Panel only after payment verification.

---

## 1. Global Site Elements (Appears on All Pages)

- **Header / Navigation Bar:**
  - Resort Logo.
  - Nav links: **Home**, **Stays & Venues**, **Contact Us**.
  - Social Links Bar (Header/Mobile Drawer):
    - Instagram: `https://www.instagram.com/parlak___`
    - Facebook: `https://www.facebook.com/profile.php?id=61550970517881`
    - YouTube: `https://www.youtube.com/@PARLAK-v9s`
  - Prominent CTA button: **"Explore Stays"** (scrolls to/routes to the listing page).
- **Footer:**
  - Physical Address: **Vallivattom, S.N. Puram, Keralam 680661**
  - Direct Phone: `+91 88919 31123` (`+918891931123`)
  - Official Email: `info.parlakresort@gmail.com`
  - Official Domain: `parlakfarmhouse.com`
  - Google Map Link: [https://maps.app.goo.gl/GJyr7qpHWfVxWXtP9](https://maps.app.goo.gl/GJyr7qpHWfVxWXtP9)
  - Google Plus Code: `75GP+QP Sreenarayanapuram, Keralam`
  - Embedded Google Maps iframe.
  - Operating Hours / Standard Timings (Check-in: 12:00 PM | Check-out: 11:00 AM).
  - Social Profiles: Instagram, Facebook, YouTube.
  - Link/Modal to **Cancellation & Refund Policy** (text fetched dynamically from Admin Settings).
- **Persistent Quick Contact Widget (Bottom-Right Corner):**
  - Fixed floating action container visible across all pages and viewports (high z-index).
  - **WhatsApp Direct Button:** One-tap icon opening `https://wa.me/918891931123?text=Hi%20Parlak%20Resort,%20I%20have%20an%20inquiry`.
  - **Direct Call Button:** One-tap phone icon triggering `tel:+918891931123` for instant telephone inquiries.
  - Subtle hover/pulse animation for high visibility without blocking main content.
- **SEO & Social Meta Tags (OpenGraph for WhatsApp Link Previews):**
  - Dynamic `og:title`, `og:description`, `og:image`, `og:url` configured for every page on `https://parlakfarmhouse.com`.
  - Generates rich media preview cards when any link (`/`, `/stays`, `/stays/:id`) is pasted into WhatsApp or social platforms, showing high-res imagery, room type, and base rates instead of an unformatted plain URL.

### Global Layout Data Contract (`app/(public)/layout.tsx`)

#### Inbound Request Payload (Global Layout)
```typescript
// Incoming HTTP request context resolved by Next.js Server Components
interface GlobalLayoutInboundRequest {
  url: string;                          // e.g. "https://parlakfarmhouse.com/"
  headers: {
    host: string;                       // e.g. "parlakfarmhouse.com"
    "user-agent": string;               // e.g. "Mozilla/5.0 ... WhatsApp/2.24..."
  };
}
```

#### Outbound Server Data Payload (Global Site Context)
```json
{
  "siteMetadata": {
    "resortName": "Parlak Resort",
    "tagline": "Luxury Geodesic Domes, Scenic A-Frames & Banquet Venues",
    "domain": "parlakfarmhouse.com",
    "baseUrl": "https://parlakfarmhouse.com",
    "contact": {
      "phoneDisplay": "+91 88919 31123",
      "phoneDial": "+918891931123",
      "whatsappNumber": "918891931123",
      "email": "info.parlakresort@gmail.com",
      "address": "Vallivattom, S.N. Puram, Keralam 680661",
      "googlePlusCode": "75GP+QP Sreenarayanapuram, Keralam",
      "googleMapLink": "https://maps.app.goo.gl/GJyr7qpHWfVxWXtP9",
      "googleMapsEmbedUrl": "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15705.5!2d76.1868!3d10.2769!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNzXigIFHUCtRUCDiiY4gU3JlZW5hcmF5YW5hcHVyYW0sIEtlcmFsYQ!5e0!3m2!1sen!2sin!4v1"
    },
    "socialLinks": {
      "instagram": "https://www.instagram.com/parlak___",
      "facebook": "https://www.facebook.com/profile.php?id=61550970517881",
      "youtube": "https://www.youtube.com/@PARLAK-v9s"
    },
    "timings": {
      "checkIn": "12:00 PM IST",
      "checkOut": "11:00 AM IST Next Day",
      "restaurantClosing": "10:30 PM IST",
      "poolResidentHours": "Open till 10:00 PM (10:00 PM - 11:00 PM on Event Days)"
    }
  },
  "cancellationPolicySummary": "Cancellations permitted via Resort Admin prior to check-in. Custom refund amount credited after administrative verification. Security deposits (₹2,000/room) are 100% refundable at checkout upon inspection."
}
```

#### Outbound Floating WhatsApp Widget Action Payload
- **Trigger:** Visitor clicks the persistent floating WhatsApp button from any page.
- **Inbound Event:** None (Static Action trigger).
- **Outbound Link Payload:**
```text
https://wa.me/918891931123?text=Hi%20Parlak%20Resort%2C%20I%20have%20an%20inquiry%20regarding%20stay%20and%20event%20bookings.
```
- **Decoded Message:**
```text
Hi Parlak Resort, I have an inquiry regarding stay and event bookings.
```

---

## 2. Page 1: Home / Landing Page (`/`)

- **Hero Section:**
  - Full-width background image with atmospheric tagline.
  - Direct CTA: **"Book Your Stay / Event"** linking directly to the listing page.
- **Dynamic Promotional Banner:**
  - Displays conditionally at the top of the viewport only if an Admin has configured an active Seasonal Promotion (e.g., _"Special Weekend Offer - Book via WhatsApp"_).
- **Curated Highlights Grid:**
  - Displays 3 featured cards: 1 Dome, 1 A-Frame, and 1 Event Hall with base prices and guest capacities to give visitors an instant overview.
- **Property Highlights / Amenities Strip:**
  - Visual badges for standard amenities (Lush Greenery, Pool, Wi-Fi, Food Services till 10:30 PM).
- **Experiences & Activities Showcase Strip:**
  - Visual photo cards highlighting on-property recreation with active vs. upcoming indicators:
    - 🏊‍♂️ **Designer Swimming Pool:** Modern pool flanked by tropical greenery (dedicated resident hours till 10:00 PM).
    - 🔥 **Campfire & BBQ Experience:** Dedicated BBQ grill setup included for every Dome booking; campfire pit under the night sky.
    - 🌿 **Lush Lawn & Recreation:** Manicured open lawns for leisure, badminton, and family unwinding.
    - 🛶 **River Kayaking:** Calm water paddling session — _[Badge: Upcoming / Under Construction]_.
    - 🎭 **Scenic Floating Stage:** Over-water performance and ceremony platform — _[Badge: Upcoming / Under Construction]_.
- **Frequently Asked Questions (Interactive FAQ Accordion):**
  - Accordion addressing the top 5 questions to minimize repetitive admin WhatsApp queries:
    1. _What are standard check-in and check-out timings?_ (Overnight stays: 12:00 PM Check-in, 11:00 AM Next Day Check-out | Day Slots: 10:00 AM to 3:00 PM Same Day).
    2. _How does the ₹2,000 refundable security deposit work?_ (Collected during booking confirmation; 100% refunded at check-out upon standard room inspection).
    3. _Can Event Hall attendees use the swimming pool?_ (Strictly NO. Swimming pool access is reserved exclusively for overnight Dome & A-Frame residents for safety and privacy).
    4. _Are outside food and dining services available?_ (Our on-site restaurant menu is available until 10:30 PM. Outside catering allowed only for private event hall bookings).
    5. _What is the maximum guest limit per unit?_ (Strictly capped at 3 guests for Domes and 5 guests for A-Frames; no extra beds provided).

### Route Data Contract: Home Page (`GET /`)

#### Inbound Request Payload (Page Request)
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

#### Outbound Server Data Payload (RSC / JSON)
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
      "capacityBadge": "Up to 3 Guests (Strict Cap)",
      "basePricePerNight": 3500,
      "defaultDeposit": 2000,
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
      "capacityBadge": "Up to 5 Guests (Strict Cap)",
      "basePricePerNight": 5000,
      "defaultDeposit": 2000,
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
      "defaultDeposit": 5000,
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
      "question": "What are standard check-in and check-out timings?",
      "answer": "Overnight stays check in at 12:00 PM and check out at 11:00 AM next day. Day slots run from 10:00 AM to 3:00 PM same day."
    },
    {
      "question": "How does the ₹2,000 refundable security deposit work?",
      "answer": "A ₹2,000 security deposit per room unit is collected during booking confirmation and 100% refunded at check-out upon standard room inspection."
    },
    {
      "question": "Can Event Hall attendees use the swimming pool?",
      "answer": "Strictly NO. Swimming pool access is reserved exclusively for overnight Dome & A-Frame residents for safety and privacy."
    },
    {
      "question": "Are outside food and dining services available?",
      "answer": "Our on-site restaurant menu is available until 10:30 PM. Outside catering is permitted only for private event hall bookings."
    },
    {
      "question": "What is the maximum guest limit per unit?",
      "answer": "Guest count is strictly capped at 3 guests for Domes and 5 guests for A-Frames. We do not provide extra beds."
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

---

## 3. Page 2: Unified Listing Page (`/stays`)

Instead of splitting rooms and halls into separate pages, all units live under a single filterable listing catalog.

- **Category Filter Tabs:**
  - `[ All ]` | `[ Domes ]` | `[ A-Frames ]` | `[ Event Halls ]`
- **Inventory Cards Grid:**
  - Renders active inventory items fetched from the backend.
  - **Card Elements (Domes & A-Frames):**
    - Thumbnail photo.
    - Unit Type (e.g., "Geodesic Domes", "A-Frames").
    - Capacity badge: `Up to 3 Guests per unit` (Domes) or `Up to 5 Guests per unit` (A-Frames).
    - Base Price per night.
    - CTA button: **"View Details & Book"** (routes to `/stays/:id`).
  - **Card Elements (Event Halls):**
    - Thumbnail photo.
    - Venue Name ("Non-AC Hall" / "AC Hall").
    - Capacity badge: `Up to 1,200 Guests` (Non-AC) or `Up to 2,000 Guests` (AC).
    - Starting slab price.
    - CTA button: **"View Details & Inquire"** (routes to `/stays/:id`).

### Route Data Contract: Unified Listing Page (`GET /stays`)

#### Inbound Request Payload (Catalog Filters & Query Params)
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

#### Outbound Server Data Payload (RSC / Catalog JSON)
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
      "capacityBadge": "Up to 3 Guests per unit",
      "maxCapacity": 3,
      "pricing": {
        "displayRate": 3500,
        "rateLabel": "per night (Overnight)",
        "daySlotRate": 2500,
        "refundableDeposit": 2000
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
      "capacityBadge": "Up to 5 Guests per unit",
      "maxCapacity": 5,
      "pricing": {
        "displayRate": 5000,
        "rateLabel": "per night (Overnight)",
        "daySlotRate": 3500,
        "refundableDeposit": 2000
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
        "startingDeposit": 5000
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
        "startingDeposit": 10000
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

---

## 4. Page 3: Dynamic Unit Detail Page (`/stays/:id`)

A single, reusable React component that conditionally renders UI blocks based on the unit's category (`DOME`, `A_FRAME`, or `HALL`).

### A. Shared Sections (All Types)

- **Image Gallery / Slider:** High-resolution photos of the selected unit type.
- **Title & Description:** Category name, detailed write-up, and key highlights.
- **Mobile Sticky Booking CTA Bar:**
  - Renders persistently at the bottom of the viewport on mobile devices when the main booking card scrolls out of view.
  - Displays: Unit Category + Starting Rate (e.g., `Geodesic Dome · From ₹3,500`) + CTA: **"Check Dates & Book"** (smoothly scrolls back to the date/slot picker).

### B. Conditional Content Blocks

#### When Unit Type is `DOME` or `A_FRAME`:

- **Amenities Grid:**
  - _Standard baseline (hardcoded):_ Electric Kettle, Tea/Coffee/Milk kit, 1L Mineral Water, Toiletries, BBQ Grill Setup.
  - _Dynamic (from Admin):_ AC, Wi-Fi, Attached Bath, Smart TV, Bluetooth Speaker, etc.
- **Pricing & Deposit Note:** Displays nightly rate, day slot rate, and the mandatory ₹2,000 refundable deposit rule.
- **"Request to Book" WhatsApp Engine (Slot & Multi-Room Aware):**
  - **Stay Type Selector (Tabs/Chips):**
    - 🔘 **Overnight Stay (Default):** Standard 12:00 PM Check-in to 11:00 AM Next Day Check-out.
    - 🔘 **Day Slot:** 10:00 AM to 3:00 PM (Same Day).
  - **Smart Date & Time Picker:**
    - If **Overnight**: Shows range date picker (`Check-in Date` ➔ `Check-out Date`).
    - If **Day Slot**: Shows single date picker (`Select Date`) with fixed timing badge `10:00 AM – 3:00 PM`.
    - API checks active inventory using timestamp ranges (`tstzrange && tstzrange`). Dates where available units == 0 are strictly greyed out (`Sold Out`).
  - **Live Inventory Badge:** Dynamically shows remaining units for chosen date/slot (e.g., `🟢 2 Domes available`).
  - **Multi-Room Selector:**
    - UI displays individual rows for each requested room (e.g., "Room 1", "Room 2").
    - Each room row has `+ / -` stepper buttons to set Adult and Infant counts (capped at unit max capacity: 3 for Domes, 5 for A-Frames).
    - **Add/Delete Room Buttons:** Users can click "Add Room" to request multiple units on a single booking. This button dynamically disables if the requested room count exceeds the lowest available inventory for their chosen dates/slot.
  - **Guest Inputs:** Name, Phone Number, Special Requests.
  - **Action Button:** **"Book via WhatsApp"** — compiles room configurations, dates, and selected stay type/slot into a structured text string and opens `https://wa.me/<RESORT_PHONE>?text=...`.

#### When Unit Type is `HALL`:

- **Capacity Details:** Displays maximum venue capacity (1,200 Non-AC / 2,000 AC).
- **Slot Selection UI:**
  - Radio buttons for the fixed time slots:
    - 🔘 Morning Slot (10:00 AM – 3:00 PM)
    - 🔘 Evening Slot (5:00 PM – 10:00 PM)
    - 🔘 Full Day (10:00 AM – 10:00 PM)
- **Dynamic Slab Pricing Display:** Visual table or summary card showing price tiers based on headcounts (e.g., 10-25 pax, 200-300 pax, 400-800 pax).
- **Complimentary Perks Note:** Clear note indicating that larger tiers (e.g., 400+ pax) include a complimentary Dome during event hours.
- **Operational Notes:**
  - Swimming pool is strictly unavailable for event attendees.
  - Add-on options: Waste management, coffee machine, massage chair.
- **"Event Inquiry" WhatsApp Engine:**
  - **Inputs:** Date Picker, Slot Selection, Expected Guest Headcount, Event Type (Wedding, Corporate, Reception), Name, Phone.
  - **Action Button:** **"Inquire via WhatsApp"** — compiles event specifics into a pre-filled WhatsApp message.

### Route Data Contract: Unit Detail Page (`GET /stays/:id`)

#### Inbound Request Payload (Page Route Parameters)
```typescript
// Next.js App Router dynamic route parameters
interface UnitDetailInboundRequest {
  params: Promise<{
    id: string;                         // e.g. "geodesic-dome", "scenic-a-frame", "non-ac-hall"
  }>;
  searchParams: Promise<{
    stayType?: "OVERNIGHT" | "DAY_SLOT";
    date?: string;                      // ISO date: "YYYY-MM-DD"
    slot?: "SLOT_A" | "SLOT_B" | "FULL_DAY";
  }>;
}
```

#### Outbound Server Data Payload A: Room Unit Model (`DOME` / `A_FRAME`)
```json
{
  "unit": {
    "id": "unit-dome-01",
    "slug": "geodesic-dome",
    "name": "Luxury Geodesic Dome",
    "category": "DOME",
    "totalInventoryUnits": 4,
    "maxCapacity": 3,
    "capacityRule": "Hard cap: Maximum 3 Guests. Strictly NO extra beds permitted.",
    "pricing": {
      "overnightBaseRate": 3500,
      "daySlotBaseRate": 2500,
      "weekendRateOverride": 4200,
      "defaultDeposit": 2000,
      "depositRule": "₹2,000 refundable security deposit per room unit collected at confirmation."
    },
    "timings": {
      "overnight": { "checkIn": "12:00 PM IST", "checkOut": "11:00 AM IST Next Day" },
      "daySlot": { "checkIn": "10:00 AM IST", "checkOut": "3:00 PM IST Same Day" }
    },
    "amenities": {
      "standard": [
        "Electric Kettle with Tea/Coffee/Milk Kit",
        "1L Bottled Mineral Water",
        "Essential Toiletries & Towels",
        "Dedicated Outdoor BBQ Grill Setup"
      ],
      "variable": [
        "Climate-Controlled Air Conditioning",
        "High-Speed Wi-Fi",
        "En-suite Modern Attached Bathroom",
        "Smart TV with Streaming Apps",
        "Designer Swimming Pool Access"
      ]
    },
    "gallery": [
      {
        "url": "https://res.cloudinary.com/parlak-resort/image/upload/v1/units/dome_01.webp",
        "alt": "Dome interior with panoramic skylight",
        "caption": "Panoramic Bay Window Facing Lush Riverside Gardens",
        "isFeatured": true,
        "order": 1
      },
      {
        "url": "https://res.cloudinary.com/parlak-resort/image/upload/v1/units/dome_02.webp",
        "alt": "King size bed with ambient lighting inside dome",
        "caption": "Cozy King Bed Setup with Premium Linens",
        "isFeatured": false,
        "order": 2
      }
    ],
    "isActive": true,
    "status": "AVAILABLE"
  },
  "seoMeta": {
    "title": "Luxury Geodesic Dome | Parlak Resort & Farmhouse Keralam",
    "description": "Stay in luxury Geodesic Domes with private BBQ grills and pool access at Parlak Resort, Vallivattom, S.N. Puram, Keralam. Max 3 guests. Book directly on WhatsApp at +91 88919 31123.",
    "ogImage": "https://res.cloudinary.com/parlak-resort/image/upload/v1/units/dome_01.webp",
    "ogUrl": "https://parlakfarmhouse.com/stays/geodesic-dome"
  }
}
```

#### Outbound Server Data Payload B: Venue Unit Model (`HALL`)
```json
{
  "unit": {
    "id": "unit-hall-non-ac",
    "slug": "non-ac-hall",
    "name": "Non-AC Event Hall",
    "category": "HALL",
    "maxCapacity": 1200,
    "capacityRule": "Configurable headcount slabs up to 1,200 attendees.",
    "slotOptions": [
      {
        "slotKey": "SLOT_A",
        "label": "Morning Slot",
        "timing": "10:00 AM – 3:00 PM IST",
        "description": "Ideal for daytime ceremonies, morning receptions, and corporate meetings."
      },
      {
        "slotKey": "SLOT_B",
        "label": "Evening Slot",
        "timing": "5:00 PM – 10:00 PM IST",
        "description": "Perfect for evening dinners, illuminated receptions, and stage programs."
      },
      {
        "slotKey": "FULL_DAY",
        "label": "Full Day Slot",
        "timing": "10:00 AM – 10:00 PM IST",
        "description": "Comprehensive all-day access for grand weddings and cultural conventions."
      }
    ],
    "pricingSlabs": [
      { "id": "slab-01", "name": "10–25 Pax", "minHeadcount": 10, "maxHeadcount": 25, "rate": 10000, "requiredDeposit": 5000 },
      { "id": "slab-02", "name": "26–50 Pax", "minHeadcount": 26, "maxHeadcount": 50, "rate": 16000, "requiredDeposit": 5000 },
      { "id": "slab-03", "name": "51–100 Pax", "minHeadcount": 51, "maxHeadcount": 100, "rate": 24000, "requiredDeposit": 6000 },
      { "id": "slab-04", "name": "101–200 Pax", "minHeadcount": 101, "maxHeadcount": 200, "rate": 35000, "requiredDeposit": 8000 },
      { "id": "slab-05", "name": "201–400 Pax", "minHeadcount": 201, "maxHeadcount": 400, "rate": 46000, "requiredDeposit": 8000 },
      { "id": "slab-06", "name": "401–800 Pax", "minHeadcount": 401, "maxHeadcount": 800, "rate": 58000, "requiredDeposit": 10000 },
      { "id": "slab-07", "name": "801–1200 Pax", "minHeadcount": 801, "maxHeadcount": 1200, "rate": 72000, "requiredDeposit": 15000 }
    ],
    "complimentaryDomeRule": "Bookings for slabs of 400+ attendees are eligible for 1 complimentary attached Dome during event hours, subject to overnight schedule alignment.",
    "amenitiesIncluded": [
      "Standard Banquet Seating & Tables",
      "Elevated Presentation Stage",
      "High-Capacity Diesel Backup Generator",
      "Drinking Water Supply & Restroom Facilities"
    ],
    "policyNotes": [
      "Swimming pool access is strictly excluded for event attendees.",
      "Custom add-ons (Waste Management, Massage Chair, Coffee Machine) available on request."
    ],
    "gallery": [
      {
        "url": "https://res.cloudinary.com/parlak-resort/image/upload/v1/units/hall_01.webp",
        "alt": "Spacious banquet hall setup with wedding stage",
        "caption": "Grand Banquet Space Configured for 800 Guests",
        "isFeatured": true,
        "order": 1
      }
    ],
    "isActive": true,
    "status": "AVAILABLE"
  },
  "seoMeta": {
    "title": "Non-AC Event Hall (Up to 1,200 Pax) | Parlak Resort & Farmhouse Keralam",
    "description": "Host grand weddings and conventions at Parlak Resort, Vallivattom, S.N. Puram, Keralam. Transparent slab pricing and dedicated event time slots.",
    "ogImage": "https://res.cloudinary.com/parlak-resort/image/upload/v1/units/hall_01.webp",
    "ogUrl": "https://parlakfarmhouse.com/stays/non-ac-hall"
  }
}
```

### Sub-Route Data Contract: Live Inventory & Availability API (`GET /api/availability`)

The client date/slot picker queries this read-only API endpoint to check PostgreSQL `tstzrange` availability without making direct database writes.

#### Inbound Query Payload (API Request)
```http
GET /api/availability?unitCategory=DOME&stayType=OVERNIGHT&startDatetime=2026-10-15T06:30:00.000Z&endDatetime=2026-10-16T05:30:00.000Z&requestedUnits=2 HTTP/1.1
Host: parlakfarmhouse.com
Accept: application/json
```

```typescript
// Query parameters schema
interface AvailabilityInboundQuery {
  unitCategory: "DOME" | "A_FRAME" | "HALL";
  unitId?: string;                      // Optional specific unit identifier
  stayType: "OVERNIGHT" | "DAY_SLOT" | "SLOT_A" | "SLOT_B" | "FULL_DAY";
  startDatetime: string;                // ISO-8601 UTC string (e.g. 12:00 PM IST -> 06:30 UTC)
  endDatetime: string;                  // ISO-8601 UTC string (e.g. 11:00 AM IST -> 05:30 UTC)
  requestedUnits?: number;              // Defaults to 1; max equal to total category inventory
}
```

#### Outbound JSON Response (Availability Status)
```json
{
  "isAvailable": true,
  "unitCategory": "DOME",
  "requestedUnits": 2,
  "availableUnitsCount": 3,
  "totalCategoryUnits": 4,
  "stayType": "OVERNIGHT",
  "pricingCalculation": {
    "ratePerUnit": 3500,
    "nights": 1,
    "unitsCount": 2,
    "staySubtotal": 7000,
    "refundableDepositPerUnit": 2000,
    "totalRefundableDeposit": 4000,
    "estimatedGrandTotal": 11000,
    "currency": "INR"
  },
  "blockedDatesInMonth": [
    "2026-10-24",
    "2026-10-25",
    "2026-10-31"
  ]
}
```

---

### WhatsApp Outbound Payload Engine: Stays Reservation (Domes & A-Frames)

When the guest clicks **"Book via WhatsApp"**, the frontend client validates the form state and compiles it into a pre-filled `https://wa.me/` payload.

#### Inbound Client Form State (Pre-Compilation)
```typescript
interface StayBookingFormState {
  unitSlug: "geodesic-dome";
  unitName: "Luxury Geodesic Dome";
  stayType: "OVERNIGHT";
  checkInDate: "2026-10-15";           // 12:00 PM IST
  checkOutDate: "2026-10-16";          // 11:00 AM IST
  rooms: [
    { roomIndex: 1, adults: 3, infants: 1 },
    { roomIndex: 2, adults: 2, infants: 0 }
  ];
  guestName: "Muhammed Rahil";
  guestPhone: "+91 98470 12345";
  specialRequests: "Arriving around 1:00 PM. Please prepare campfire & BBQ skewers.";
  estimatedStayAmount: 7000;           // 2 units * ₹3,500
  requiredDepositTotal: 4000;          // 2 units * ₹2,000 refundable deposit
}
```

#### Outbound Compiled WhatsApp Message (Decoded Text Sample)
```text
*PARLAK RESORT - STAY RESERVATION REQUEST*
────────────────────────────
*Unit Type:* Luxury Geodesic Dome
*Stay Type:* Overnight Stay (12:00 PM Check-in ➔ 11:00 AM Check-out)
*Dates:* 15 Oct 2026 to 16 Oct 2026 (1 Night)

*Requested Rooms (2 Units):*
• Room 1: 3 Adults, 1 Infant
• Room 2: 2 Adults

*Guest Details:*
• Name: Muhammed Rahil
• Contact: +91 98470 12345
• Special Requests: Arriving around 1:00 PM. Please prepare campfire & BBQ skewers.

*Price & Deposit Estimate:*
• Stay Charges: ₹7,000 (2 units × ₹3,500)
• Refundable Security Deposit: ₹4,000 (₹2,000/unit)
• *Estimated Payable at Confirmation:* ₹4,000 (Deposit)

_Note: Max 3 guests per Dome. Deposit is 100% refundable at check-out upon room inspection._
```

#### Outbound Encoded `wa.me` URL
```text
https://wa.me/918891931123?text=*PARLAK%20RESORT%20-%20STAY%20RESERVATION%20REQUEST*%0A%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%0A*Unit%20Type%3A*%20Luxury%20Geodesic%20Dome%0A*Stay%20Type%3A*%20Overnight%20Stay%20(12%3A00%20PM%20Check-in%20%E2%9E%94%2011%3A00%20AM%20Check-out)%0A*Dates%3A*%2015%20Oct%202026%20to%2016%20Oct%202026%20(1%20Night)%0A%0A*Requested%20Rooms%20(2%20Units)%3A*%0A%E2%80%A2%20Room%201%3A%203%20Adults%2C%201%20Infant%0A%E2%80%A2%20Room%202%3A%202%20Adults%0A%0A*Guest%20Details%3A*%0A%E2%80%A2%20Name%3A%20Muhammed%20Rahil%0A%E2%80%A2%20Contact%3A%20%2B91%2098470%2012345%0A%E2%80%A2%20Special%20Requests%3A%20Arriving%20around%201%3A00%20PM.%20Please%20prepare%20campfire%20%26%20BBQ%20skewers.%0A%0A*Price%20%26%20Deposit%20Estimate%3A*%0A%E2%80%A2%20Stay%20Charges%3A%20%E2%82%B97%2C000%20(2%20units%20%C3%97%20%E2%82%B93%2C500)%0A%E2%80%A2%20Refundable%20Security%20Deposit%3A%20%E2%82%B94%2C000%20(%E2%82%B92%2C000%2Funit)%0A%E2%80%A2%20*Estimated%20Payable%20at%20Confirmation%3A*%20%E2%82%B94%2C000%20(Deposit)%0A%0A_Note%3A%20Max%203%20guests%20per%20Dome.%20Deposit%20is%20100%25%20refundable%20at%20check-out%20upon%20room%20inspection._
```

---

### WhatsApp Outbound Payload Engine: Event Hall Inquiries

When the visitor clicks **"Inquire via WhatsApp"**, the frontend compiles the event specifications into a pre-filled WhatsApp inquiry.

#### Inbound Client Form State (Pre-Compilation)
```typescript
interface HallInquiryFormState {
  venueSlug: "non-ac-hall";
  venueName: "Non-AC Event Hall";
  eventDate: "2026-11-20";
  slot: "SLOT_A";                       // Morning Slot (10:00 AM – 3:00 PM)
  expectedHeadcount: 550;
  matchedSlab: "401–800 Pax Slab";
  slabRate: 58000;
  requiredAdvanceDeposit: 10000;
  eventType: "Wedding Reception";
  complimentaryDomeRequested: true;
  guestName: "Aiswarya Lakshmi";
  guestPhone: "+91 97455 67890";
  notes: "Stage decoration team needs entry at 9:00 AM. Inquiring about attached dome.";
}
```

#### Outbound Compiled WhatsApp Message (Decoded Text Sample)
```text
*PARLAK RESORT - EVENT VENUE INQUIRY*
────────────────────────────
*Venue:* Non-AC Event Hall (Max 1,200 Pax)
*Event Date:* 20 Nov 2026
*Time Slot:* Slot A: Morning (10:00 AM – 3:00 PM IST)
*Event Type:* Wedding Reception
*Expected Headcount:* 550 Guests (Slab: 401–800 Pax)

*Organizer Details:*
• Name: Aiswarya Lakshmi
• Contact: +91 97455 67890
• Notes / Setup Requirements: Stage decoration team needs entry at 9:00 AM. Inquiring about attached dome.

*Rate & Deposit Slabs:*
• Slab Base Rate: ₹58,000
• Advance Required Deposit: ₹10,000 (Credited towards bill)
• Attached Dome Request: Yes (Eligible for complimentary dome perk)

_Notice: Swimming pool access is strictly excluded for event attendees. Please confirm availability and bank details for advance deposit._
```

#### Outbound Encoded `wa.me` URL
```text
https://wa.me/918891931123?text=*PARLAK%20RESORT%20-%20EVENT%20VENUE%20INQUIRY*%0A%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%0A*Venue%3A*%20Non-AC%20Event%20Hall%20(Max%201%2C200%20Pax)%0A*Event%20Date%3A*%2020%20Nov%202026%0A*Time%20Slot%3A*%20Slot%20A%3A%20Morning%20(10%3A00%20AM%20%E2%80%93%203%3A00%20PM%20IST)%0A*Event%20Type%3A*%20Wedding%20Reception%0A*Expected%20Headcount%3A*%20550%20Guests%20(Slab%3A%20401%E2%80%93800%20Pax)%0A%0A*Organizer%20Details%3A*%0A%E2%80%A2%20Name%3A%20Aiswarya%20Lakshmi%0A%E2%80%A2%20Contact%3A%20%2B91%2097455%2067890%0A%E2%80%A2%20Notes%20%2F%20Setup%20Requirements%3A%20Stage%20decoration%20team%20needs%20entry%20at%209%3A00%20AM.%20Inquiring%20about%20attached%20dome.%0A%0A*Rate%20%26%20Deposit%20Slabs%3A*%0A%E2%80%A2%20Slab%20Base%20Rate%3A%20%E2%82%B958%2C000%0A%E2%80%A2%20Advance%20Required%20Deposit%3A%20%E2%82%B910%2C000%20(Credited%20towards%20bill)%0A%E2%80%A2%20Attached%20Dome%20Request%3A%20Yes%20(Eligible%20for%20complimentary%20dome%20perk)%0A%0A_Notice%3A%20Swimming%20pool%20access%20is%20strictly%20excluded%20for%20event%20attendees.%20Please%20confirm%20availability%20and%20bank%20details%20for%20advance%20deposit._
```

---

## 5. Page 4: Contact Us Page (`/contact`)

- **Direct Contact Information:**
  - Official WhatsApp direct link button: `https://wa.me/918891931123`
  - Resort direct calling line: `+91 88919 31123` (`tel:+918891931123`)
  - Official email address: `info.parlakresort@gmail.com`
  - Official social profiles:
    - Instagram: [https://www.instagram.com/parlak___](https://www.instagram.com/parlak___)
    - Facebook: [https://www.facebook.com/profile.php?id=61550970517881](https://www.facebook.com/profile.php?id=61550970517881)
    - YouTube: [https://www.youtube.com/@PARLAK-v9s](https://www.youtube.com/@PARLAK-v9s)
- **Location & Directions:**
  - Physical Address: **Vallivattom, S.N. Puram, Keralam 680661**
  - Google Plus Code: **75GP+QP Sreenarayanapuram, Keralam**
  - Direct Map Link: [https://maps.app.goo.gl/GJyr7qpHWfVxWXtP9](https://maps.app.goo.gl/GJyr7qpHWfVxWXtP9)
  - Full-width responsive Google Maps embed.
- **Operational Timings Card:**
  - Standard Stay Check-in: 12:00 PM | Check-out: 11:00 AM.
  - Food availability: Restaurant menu service available until 10:30 PM.
  - Pool hours summary (Standard: till 10:00 PM | Event days: 10:00 PM – 11:00 PM exclusive resident slot).

### Route Data Contract: Contact Us Page (`GET /contact`)

#### Inbound Request Payload (Page Request)
```typescript
// Next.js App Router Server Component Props
interface ContactPageInboundRequest {
  params: Promise<Record<string, never>>;
  searchParams: Promise<{
    inquiryType?: "general" | "stays" | "events";
  }>;
}
```

#### Outbound Server Data Payload (RSC / JSON)
```json
{
  "resortDetails": {
    "officialName": "Parlak Resort",
    "domain": "parlakfarmhouse.com",
    "phones": [
      { "label": "Main Desk & Reservations", "display": "+91 88919 31123", "telUri": "tel:+918891931123" }
    ],
    "whatsapp": {
      "number": "918891931123",
      "actionUrl": "https://wa.me/918891931123?text=Hello%20Parlak%20Resort%20Team%2C%20I%20would%20like%20to%20get%20in%20touch%20regarding%20a%20stay%20or%20event."
    },
    "email": "info.parlakresort@gmail.com",
    "socialLinks": {
      "instagram": "https://www.instagram.com/parlak___",
      "facebook": "https://www.facebook.com/profile.php?id=61550970517881",
      "youtube": "https://www.youtube.com/@PARLAK-v9s"
    },
    "location": {
      "streetAddress": "Vallivattom",
      "area": "S.N. Puram (Sreenarayanapuram)",
      "district": "Thrissur",
      "state": "Keralam",
      "postalCode": "680661",
      "formatted": "Vallivattom, S.N. Puram, Keralam 680661",
      "googlePlusCode": "75GP+QP Sreenarayanapuram, Keralam",
      "googleMapLink": "https://maps.app.goo.gl/GJyr7qpHWfVxWXtP9",
      "geoCoordinates": { "latitude": 10.2769, "longitude": 76.1868 },
      "googleMapsEmbedUrl": "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15705.5!2d76.1868!3d10.2769!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNzXigIFHUCtRUCDiiY4gU3JlZW5hcmF5YW5hcHVyYW0sIEtlcmFsYQ!5e0!3m2!1sen!2sin!4v1"
    }
  },
  "operationalPolicies": {
    "stayTimings": {
      "overnightCheckIn": "12:00 PM IST",
      "overnightCheckOut": "11:00 AM IST Next Day",
      "daySlotCheckIn": "10:00 AM IST",
      "daySlotCheckOut": "3:00 PM IST Same Day"
    },
    "diningService": {
      "menuAvailableUntil": "10:30 PM IST",
      "outsideFoodPolicy": "Outside catering strictly limited to private Event Hall reservations."
    },
    "poolTimings": {
      "regularDays": "Open exclusively for Dome and A-Frame residents until 10:00 PM IST.",
      "eventDays": "Closed during event hours. Overnight residents receive exclusive access from 10:00 PM to 11:00 PM IST.",
      "eventAttendeeRule": "Event Hall attendees are strictly forbidden from entering or using the swimming pool."
    },
    "depositPolicy": "Mandatory ₹2,000 security deposit per room unit collected at booking confirmation and refunded at check-out upon inspection."
  },
  "cancellationPolicy": {
    "policyText": "All cancellations must be requested via WhatsApp with your Booking ID. Refund amounts are assessed by the Admin based on advance notice. Advance deposits for Event Halls are credited toward the booking slab and subject to management review.",
    "lastUpdated": "2026-10-01T00:00:00.000Z"
  },
  "seoMeta": {
    "title": "Contact Us & Directions | Parlak Resort & Farmhouse Keralam",
    "description": "Reach Parlak Resort at Vallivattom, S.N. Puram, Keralam 680661 for stay reservations, venue inquiries, and location directions. Direct call and WhatsApp support at +91 88919 31123.",
    "ogImage": "https://res.cloudinary.com/parlak-resort/image/upload/v1/seo/contact_og.webp",
    "ogUrl": "https://parlakfarmhouse.com/contact"
  }
}
```

#### Outbound Contact Page WhatsApp Action Payload
- **Action:** Visitor taps "Send Direct WhatsApp Message" on the contact page.
- **Outbound Link Payload:**
```text
https://wa.me/918891931123?text=Hello%20Parlak%20Resort%20Team%2C%20I%20would%20like%20to%20get%20in%20touch%20regarding%20a%20stay%20or%20event.
```
- **Decoded Message:**
```text
Hello Parlak Resort Team, I would like to get in touch regarding a stay or event.
```

---

## 6. Summary of the "Click-to-WhatsApp" Architecture

```text
Visitor browses /stays ➔ Selects Unit Category ➔ Views /stays/:id
                         │
                         ▼
Selects Dates ➔ API Confirms Inventory > 0 ➔ Configures Rooms/Guests
                         │
                         ▼
Frontend formats payload into wa.me link (Zero Database Writes)
                         │
                         ▼
Visitor redirected to WhatsApp chat with Resort Admin
                         │
                         ▼
Admin confirms price & collects advance deposit (UPI/Bank)
                         │
                         ▼
Admin opens Admin Panel ➔ Manually creates booking ➔ DB blocks calendar
```

### Comprehensive Public Route & API Payload Inventory

| # | Route / Action | Type | Inbound Parameters / State | Outbound Payload / Destination | Data Source / Side Effects |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | `GET /` | Next.js Page (RSC) | Query: `promo`, `ref` | Home page props: Hero, Promos, Curated Highlights, Experiences, FAQs, SEO metadata | PostgreSQL (Read-Only: Units, Promos, Settings) |
| **2** | `GET /stays` | Next.js Page (RSC) | Query: `category`, `stayType`, `checkIn`, `checkOut` | Catalog props: Filter tabs, active category, Unit cards with base pricing, capacity badges, and photos | PostgreSQL (Read-Only: Active Units) |
| **3** | `GET /stays/:id` | Next.js Page (RSC) | Params: `id` (slug/UUID); Query: `stayType`, `date`, `slot` | Unit detail props: Domes/A-Frames (gallery, amenities, deposit rules) OR Event Halls (slabs, slots, dome perk notes) | PostgreSQL (Read-Only: Unit, Slabs, Settings) |
| **4** | `GET /api/availability` | Next.js Route Handler | Query: `unitCategory`, `stayType`, `startDatetime`, `endDatetime`, `requestedUnits` | JSON: `isAvailable`, `availableUnitsCount`, `pricingCalculation`, `blockedDatesInMonth` | PostgreSQL (Read-Only: `tstzrange` GiST exclusion query) |
| **5** | **WhatsApp Stay Booking** | Client Action (`wa.me`) | Form: Unit, stay type, dates, rooms breakdown (`adults`, `infants`), guest details | Encoded `https://wa.me/` URL with formatted room breakdown, pricing estimate, and ₹2,000 deposit disclosure | Zero DB writes; client-side formatting |
| **6** | **WhatsApp Hall Inquiry** | Client Action (`wa.me`) | Form: Venue, date, slot (A/B/Full Day), headcount, event type, guest details | Encoded `https://wa.me/` URL with headcount slab, required deposit, and complimentary dome request | Zero DB writes; client-side formatting |
| **7** | `GET /contact` | Next.js Page (RSC) | Query: `inquiryType` | Contact props: Resort phones, location, Google Maps iframe embed, operational policies, cancellation policy | PostgreSQL (Read-Only: Settings) |
| **8** | **Floating WhatsApp Widget** | Client Action (`wa.me`) | Static click trigger across all viewports | Encoded `https://wa.me/` general inquiry URL | Zero DB writes; static client link |

