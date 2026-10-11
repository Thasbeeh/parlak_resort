# Page Specification: Dynamic Unit Detail Page (`/stays/:id`) (`unit_detail.md`)

> **File Scope & Context for AI Agents:**
> - **Target Route / Component:** `app/(public)/stays/[id]/page.tsx` (and subcomponents: GallerySlider, AmenitiesGrid, BookingCardRoom, BookingCardHall, MobileStickyCta).
> - **Primary Purpose:** Dynamic, reusable unit detail template that renders rich photos, amenities, capacity rules, and the interactive booking inquiry card tailored conditionally for Accommodation (`DOME` / `A_FRAME`) or Event Venues (`HALL`).
> - **Key Business Rules Enforced:**
>   - **Zero Client-Side Math:** Client does NOT calculate rates or lookup slabs. Form parameters are sent to `POST /api/inquiry/generate` to construct authoritative quotes.
>   - **Occupancy Hard Caps:** Max 3 Adults/2 Infants (Dome), Max 5 Adults/4 Infants (A-Frame); Min 1 Adult/room; strictly NO extra beds.
>   - **Hall Slabs & Ceilings:** Strictly contiguous slabs (`Slab[n].MinHeadcount == Slab[n-1].MaxHeadcount + 1`); Minimum Slab Floor applies below lowest slab; physical capacity ceiling (1,200 Pax Non-AC / 2,000 Pax AC).
>   - **Attached Dome Bundling:** Complimentary for $\ge 400$ Pax; on-request for $< 400$ Pax.
>   - **Pool Exclusion:** Strictly forbidden for Event Hall attendees under all circumstances.
> - **Token Efficiency Note:** Read or edit this file when modifying detail page layout, room stepper controls, hall headcount inputs, amenity presentations, or unit-specific UI validation. For the backend calculation engine, see [inquiry_api.md](file:///Users/thasbeeh/Projects/parlak_resort/docs/website/inquiry_api.md).

---

## 1. Page Architecture & Shared UI Components

A single Next.js App Router dynamic route (`/stays/:id`) resolves the slug/UUID and renders shared elements alongside unit-specific conditional blocks.

### A. Shared Sections (All Categories)
- **High-Resolution Image Gallery / Slider & Featured Cover Photo:** Full-width responsive photo carousel with thumbnail previews, lightbox viewing, and photo captions. The primary cover slide and preview image is designated by `isFeatured: true`. Exactly one featured photo per unit is strictly guaranteed at all times by the Admin panel's application lifecycle (first upload sets featured, subsequent default to false, switching executes in a `prisma.$transaction`, and deleting a featured photo auto-promotes the remaining photo with the lowest `orderIndex`).
- **Title, Category Badge & Description:** Official name, category tag (*"Geodesic Dome"*, *"A-Frame Chalet"*, or *"Event Hall"*), and comprehensive descriptive write-up.
- **Mobile Sticky Booking CTA Bar:**
  - Persistently pins to the bottom of mobile viewports when the main desktop booking card scrolls out of view.
  - Displays: Unit Category + Starting Rate (e.g., `Geodesic Dome · From ₹3,500`) + Action CTA: **"Check Dates & Book"** (smoothly scrolls back to the booking card).

---

## 2. Conditional Booking Engines

### A. Accommodation Units (`DOME` or `A_FRAME`)

- **Amenities Grid:**
  - *Standard Baseline (Hardcoded):* Electric Kettle with Tea/Coffee/Milk kit, 1L Bottled Mineral Water, Essential Toiletries & Towels, Dedicated Outdoor BBQ Grill Setup.
  - *Dynamic (from Admin):* Climate-Controlled AC, High-Speed Wi-Fi, Attached Modern Bathroom, Smart TV with Streaming, Swimming Pool Access.
- **Pricing & Advance Breakdown (Server-Generated On-Screen Estimate):**
  - **Zero Client-Side Math:** Client-side pricing calculations, slab matching, and date iterations are **completely removed** to eliminate code duplication, prevent client-side tampering, and establish PostgreSQL as the sole single source of truth.
  - When the visitor selects stay type, dates, and room configurations, the frontend queries `POST /api/inquiry/generate`.
  - The backend server evaluates live database rates, performs night-by-night modifier resolutions across active date-bounded modifiers (both `WEEKEND` and `SEASONAL` require explicit `startDate` and `endDate` ranges where `endDate >= startDate`, enforced by database constraint `chk_pricemodifier_dates`), applies the Algebraic Maximum for overlapping modifiers, and returns the estimated stay rent, required advance, remaining balance (displayed on the customer UI as an on-screen estimate only), alongside a parameter-only pre-compiled WhatsApp link (excluding prices to prevent tampering).
  - **Scope Extension, Flat Baseline Blocks & Cancellation Policy:**
    - **Baseline Scope Preservation:** Confirmed reservations permanently lock in agreed rates (`bookedBaseRate`) for the contracted stay.
    - **Extensions at Active Rates:** Any subsequent stay extensions (additional nights, early check-in / late check-out hours beyond standard presets, or additional Day Slots) are priced dynamically using the active Price List in effect at the time of the request.
    - **Flat Baseline Blocks:** Standard preset packages (Overnight 12:00 PM – 11:00 AM, Day Slot 10:00 AM – 3:00 PM) are billed as **flat baseline blocks**. Shortening fractional hours (checking in late or departing early) does *not* reduce the baseline rent charge.
    - **Universal Scope Reductions (Partial Cancellations):** Any scope reduction (dropping a night or completely dropping an add-on Day Slot) acts strictly as a **Partial Cancellation**. The system never auto-refunds reductions; baseline rent remains locked, and adjustments require Admin manual override.
  - **Downstream Booking Settlement:** When converted to confirmed reservations, `BookingUnit.unitPrice` is guarded by `chk_booking_unit_price` (`unitPrice >= 0`), and `Booking.netRevenue` is automatically calculated by PostgreSQL trigger `trigger_calculate_net_revenue`.
- **"Request to Book" WhatsApp Engine (Slot & Multi-Room Aware):**
  - **Stay Type Selector (Tabs/Chips):**
    - 🔘 **Overnight Stay (Default):** Standard 12:00 PM Check-in to 11:00 AM Next Day Check-out.
    - 🔘 **Day Slot:** 10:00 AM to 3:00 PM (Same Day).
  - **Smart Date & Time Picker:**
    - If **Overnight**: Shows range date picker (`Check-in Date` ➔ `Check-out Date`).
    - If **Day Slot**: Shows single date picker (`Select Date`) with fixed timing badge `10:00 AM – 3:00 PM`.
    - API checks active inventory using timestamp ranges (`tstzrange && tstzrange`). Dates where available units == 0 are strictly greyed out (`Sold Out`).
  - **Live Inventory Badge:** Dynamically shows remaining units for chosen date/slot (e.g., `🟢 2 Domes available`).
  - **Multi-Room Selector (Strict Occupancy Caps):**
    - UI displays individual rows for each requested room (e.g., "Room 1", "Room 2").
    - Each room row has `+ / -` stepper buttons to set Adult and Infant counts:
      - Each room requires at least 1 adult.
      - Adults are capped at 3 for Domes and 5 for A-Frames.
      - Infants are capped at 2 for Domes and 4 for A-Frames.
      - Strictly NO extra beds permitted.
    - **Add/Delete Room Buttons:** Users can click "Add Room" to request multiple units on a single booking. This button dynamically disables if the requested room count exceeds the lowest available inventory for their chosen dates/slot.
  - **Guest Inputs:** Name, Phone Number, Special Requests.
  - **Action Button:** **"Verify via WhatsApp"** — submits the form payload to `POST /api/inquiry/generate` which generates the on-screen estimate breakdown, compiles the parameter-only WhatsApp inquiry message (excluding prices to prevent tampering), and returns the pre-encoded `https://wa.me/` URL for immediate redirect.

---

### B. Event Venue Units (`HALL`)

- **Capacity Details:** Displays venue capacity up to physical limits (1,200 Non-AC / 2,000 AC). Slabs start at 1 Pax.
- **Gathering Slot Selection UI (`MORNING_SLOT` / `EVENING_SLOT`):**
  - Radio buttons for the booking slot:
    - 🔘 **Morning Slot (`MORNING_SLOT`):** 10:00 AM to 3:00 PM (Same Day). Ideal for daytime banquets, morning ceremonies, and conferences.
    - 🔘 **Evening Slot (`EVENING_SLOT`):** 5:00 PM to 10:00 PM (Same Day). Ideal for wedding receptions, dinner banquets, and evening celebrations.
  - _Note: Event Halls strictly operate on slot gatherings; overnight stays are NOT available for Event Halls._
- **Dynamic Slab Pricing Display (Venue-Specific):**
  - **Zero Client-Side Math:** Client-side slab matching, modifier calculations, and quote assembly are **completely removed** to eliminate code duplication, prevent client-side tampering, and establish PostgreSQL as the sole single source of truth.
  - Visual table or summary card organized by slot mode (`MORNING_SLOT` and `EVENING_SLOT`) displaying price tiers and required booking advances based on headcount ranges (e.g., 10–25 pax, 26–50 pax, ..., 801–1,200 pax) derived from the hall's attached Price List.
  - **Contiguous Slabs Rule (Zod `superRefine` Guaranteed):** Headcount slab ranges rendered on the venue page are guaranteed to be strictly contiguous with zero gaps or overlaps (`slabs[i].minHeadcount === slabs[i-1].maxHeadcount + 1`), starting at 1 (or floor) and strictly bounded by the venue's attached Price List capacity via Zod `superRefine` validation on the Admin backend.
  - **Minimum Slab Floor Safeguard:** Headcount must be $\ge 1$. If an attendee headcount is below the lowest configured slab's `minHeadcount` (e.g., 5 guests when the lowest slab is 10–25 Pax), the system automatically applies the lowest slab as the minimum baseline venue opening fee rather than returning an error.
  - **Maximum Capacity Cap Safeguard:** The attendee headcount strictly cannot exceed the venue's configured `PhysicalCapacity` (1,200 Pax for Non-AC Hall, 2,000 Pax for AC Hall). Inputs above this ceiling are rejected.
  - **Weekend Definition (IST-Aware & Date-Bounded):** Saturday and Sunday daytime/evening trigger the `WEEKEND` modifier for both `MORNING_SLOT` and `EVENING_SLOT`, evaluated strictly against **Asia/Kolkata (IST)**. Both `WEEKEND` and `SEASONAL` modifiers are strictly bounded by explicit date ranges (`endDate >= startDate` enforced at the database level via `chk_pricemodifier_dates`).
  - **Modifier Priority & Resolution:** Weekend variance strictly overrides Seasonal promotion variance on Sat/Sun. Overlapping same-type modifiers resolve via Algebraic Maximum (`MAX(m1, m2)`), favoring resort revenue.
  - **Headcount Slab Expansion & Scope Recalculation Policy:**
    - **Baseline Scope Preservation:** Initial venue reservations lock in the rate for the booked slot and contracted headcount slab (`bookedBaseRate`, `bookedMinHeadcount`, `bookedMaxHeadcount`).
    - **Within Original Slab:** Adjusting headcount within the original booked slab boundaries ($\text{bookedMinHeadcount} \le \text{Headcount} \le \text{bookedMaxHeadcount}$) leaves rent charges strictly unchanged.
    - **Crossing to a Higher Slab (The Apples-to-Apples Algebraic Floor):** To isolate the upgrade cost and protect against negative discounts if active rates drop, the incremental fee is evaluated exclusively within the current active Price List:
      $$\text{Incremental Charge} = \max(0, \text{ActiveRate}(\text{New Higher Slab}) - \text{ActiveRate}(\text{Original Booked Capacity}))$$
      where `ActiveRate(Original Booked Capacity)` is determined by querying the booking's `bookedMaxHeadcount` against the new active Price List.
    - **Time Extensions vs. Shortened Hours (Flat Baseline Blocks):** Gathering slots (10:00 AM – 3:00 PM or 5:00 PM – 10:00 PM) are billed as **flat baseline blocks**. Shortening fractional hours does not reduce rent. Extra gathering hours beyond standard slots are billed at the new active hourly tariff.
    - **Universal Scope Reductions (Partial Cancellations):** Reducing headcount to a lower slab or dropping a discrete slot acts strictly as a **Partial Cancellation** with no automated refunds; adjustments require Admin manual override.
    - **Grandfathering Orphaned Capacities:** Downsized price lists grandfather booked capacities on date shifts (recalculating modifiers), but upward headcount increases are mathematically blocked without an active slab.
- **Attached / Complimentary Dome Bundling Note:**
  - **Headcount $\ge$ 400 Pax:** Bookings for slabs of 400+ attendees are eligible to request 1 **Complimentary** attached Dome during event hours (`rent_charge` = ₹0, noted as complimentary subject to schedule and room inventory clearance).
  - **Headcount < 400 Pax:** Available on request; noted in the inquiry that an attached dome was requested and is subject to admin availability and negotiated rates (no arbitrary fee auto-injected into the automated base quote).
  - Attached Domes strictly mirror the Event Hall slot hours (`MORNING_SLOT`: 10:00 AM – 3:00 PM or `EVENING_SLOT`: 5:00 PM – 10:00 PM), subject to room inventory availability and timeline clearance with overnight guests.
- **Operational Notes:**
  - Swimming pool access is strictly excluded for event attendees under all circumstances.
  - Base rent includes tables, standard chairs, backup generator, and water supply.
  - Custom add-on options (Waste Management, Massage Chair, Coffee Machine) are available upon request and itemized manually on the folio strictly for receipt generation.
- **"Event Inquiry" WhatsApp Engine:**
  - **Inputs:** Date Picker, Gathering Slot (`MORNING_SLOT` or `EVENING_SLOT`), Expected Guest Headcount, Name, Phone, Attached Dome Request checkbox, Special Notes / Setup Requirements. *(Note: Event Type is strictly omitted / not tracked).*
  - **Action Button:** **"Verify via WhatsApp"** — submits the event parameters to `POST /api/inquiry/generate`, which computes the on-screen estimate breakdown, formats the parameter-only inquiry message (excluding prices), and returns the pre-encoded `https://wa.me/` URL for immediate redirect.

---

## 3. Route Data Contract: Unit Detail Page (`GET /stays/:id`)

### Inbound Request Payload (Page Route Parameters)
```typescript
// Next.js App Router dynamic route parameters
interface UnitDetailInboundRequest {
  params: Promise<{
    id: string;                         // e.g. "geodesic-dome", "scenic-a-frame", "non-ac-hall"
  }>;
  searchParams: Promise<{
    stayType?: "OVERNIGHT" | "DAY_SLOT";        // For room stays (Domes & A-Frames)
    slotType?: "MORNING_SLOT" | "EVENING_SLOT"; // For Event Halls
    date?: string;                              // ISO date: "YYYY-MM-DD"
  }>;
}
```

### Outbound Server Data Payload A: Room Unit Model (`DOME` / `A_FRAME`)
```json
{
  "unit": {
    "id": "unit-dome-01",
    "slug": "geodesic-dome",
    "name": "Luxury Geodesic Dome",
    "category": "DOME",
    "totalInventoryUnits": 4,
    "maxCapacity": 3,
    "capacityRule": "Hard cap: Maximum 3 Adults and 2 Infants. Strictly NO extra beds permitted.",
    "pricing": {
      "overnightBaseRate": 3500,
      "daySlotBaseRate": 2500,
      "weekendVariancePercentage": 20,
      "weekendRule": "Admin-defined +-% variance applied directly to base rates for weekend (Friday/Saturday night for overnight; Saturday/Sunday for day slots) stays.",
      "activePromotion": {
        "id": "promo-monsoon-2026",
        "name": "Monsoon Seasonal Special",
        "percentageValue": -10,
        "rule": "Website applies percentage value (+ or -) configured per-unit directly to room rates (e.g. ₹3,500 base rate with -10% modifier = ₹3,150 effective rate). Weekend variance strictly overrides seasonal promotion variance on Sat/Sun. If multiple seasonal modifiers overlap, the system resolves them by applying the Algebraic Maximum (MAX(modifier1, modifier2))."
      },
      "requiredAdvance": 2000,
      "advanceRule": "Dynamic booking advance defined per Price List slab, collected at booking confirmation and credited directly towards total rent (non-refundable; no security deposits collected)."
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
        "Swimming Pool Access"
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
    "description": "Stay in luxury Geodesic Domes with private BBQ grills and pool access at Parlak Resort, Vallivattom, S.N. Puram, Keralam. Max 3 adults. Book directly on WhatsApp at +91 88919 31123.",
    "ogImage": "https://res.cloudinary.com/parlak-resort/image/upload/v1/units/dome_01.webp",
    "ogUrl": "https://parlakfarmhouse.com/stays/geodesic-dome"
  }
}
```

### Outbound Server Data Payload B: Venue Unit Model (`HALL`)
```json
{
  "unit": {
    "id": "unit-hall-non-ac",
    "slug": "non-ac-hall",
    "name": "Non-AC Event Hall",
    "category": "HALL",
    "maxCapacity": 1200,
    "capacityRule": "Configurable headcount slabs up to 1,200 attendees. Swimming pool access is strictly excluded under all circumstances.",
    "slotOptions": [
      {
        "slotType": "MORNING_SLOT",
        "label": "Morning Slot",
        "timing": "10:00 AM – 3:00 PM IST (Same Day)",
        "description": "Ideal for daytime ceremonies, morning banquets, and daytime corporate meetings."
      },
      {
        "slotType": "EVENING_SLOT",
        "label": "Evening Slot",
        "timing": "5:00 PM – 10:00 PM IST (Same Day)",
        "description": "Ideal for wedding receptions, dinner celebrations, and evening entertainment events."
      }
    ],
    "pricingSlabsRule": "Pricing slabs are configured via the attached Price List for the venue, categorized under Morning Slot (10:00 AM – 3:00 PM) and Evening Slot (5:00 PM – 10:00 PM), with contiguous headcount ranges: Slab[n].MinHeadcount == Slab[n-1].MaxHeadcount + 1. AC Hall maintains its own attached Price List.",
    "weekendVariancePercentage": 10,
    "weekendRule": "Admin-defined +-% variance applied across all slab rates for weekend (Sat/Sun) events.",
    "activePromotion": {
      "id": "promo-monsoon-2026",
      "name": "Monsoon Seasonal Promotion",
      "percentageValue": -10,
      "rule": "Website applies percentage value (+ or -) configured per-unit directly to each slab rate (e.g. ₹58,000 base slab with -10% modifier = ₹52,200 effective rate). Weekend variance strictly overrides seasonal promotion variance on Sat/Sun. If multiple seasonal modifiers overlap, the system resolves them by applying the Algebraic Maximum (MAX(modifier1, modifier2))."
    },
    "pricingSlabs": [
      { "id": "slab-morning-01", "stayType": "MORNING_SLOT", "name": "10–25 Pax (Morning)", "minHeadcount": 10, "maxHeadcount": 25, "rate": 10000, "requiredAdvance": 5000 },
      { "id": "slab-morning-02", "stayType": "MORNING_SLOT", "name": "26–50 Pax (Morning)", "minHeadcount": 26, "maxHeadcount": 50, "rate": 16000, "requiredAdvance": 5000 },
      { "id": "slab-morning-03", "stayType": "MORNING_SLOT", "name": "51–100 Pax (Morning)", "minHeadcount": 51, "maxHeadcount": 100, "rate": 24000, "requiredAdvance": 6000 },
      { "id": "slab-morning-04", "stayType": "MORNING_SLOT", "name": "101–200 Pax (Morning)", "minHeadcount": 101, "maxHeadcount": 200, "rate": 35000, "requiredAdvance": 8000 },
      { "id": "slab-morning-05", "stayType": "MORNING_SLOT", "name": "201–400 Pax (Morning)", "minHeadcount": 201, "maxHeadcount": 400, "rate": 46000, "requiredAdvance": 8000 },
      { "id": "slab-morning-06", "stayType": "MORNING_SLOT", "name": "401–800 Pax (Morning)", "minHeadcount": 401, "maxHeadcount": 800, "rate": 58000, "requiredAdvance": 10000 },
      { "id": "slab-morning-07", "stayType": "MORNING_SLOT", "name": "801–1200 Pax (Morning)", "minHeadcount": 801, "maxHeadcount": 1200, "rate": 72000, "requiredAdvance": 15000 },
      { "id": "slab-evening-01", "stayType": "EVENING_SLOT", "name": "10–25 Pax (Evening)", "minHeadcount": 10, "maxHeadcount": 25, "rate": 15000, "requiredAdvance": 5000 },
      { "id": "slab-evening-02", "stayType": "EVENING_SLOT", "name": "26–50 Pax (Evening)", "minHeadcount": 26, "maxHeadcount": 50, "rate": 22000, "requiredAdvance": 5000 },
      { "id": "slab-evening-03", "stayType": "EVENING_SLOT", "name": "51–100 Pax (Evening)", "minHeadcount": 51, "maxHeadcount": 100, "rate": 32000, "requiredAdvance": 6000 },
      { "id": "slab-evening-04", "stayType": "EVENING_SLOT", "name": "101–200 Pax (Evening)", "minHeadcount": 101, "maxHeadcount": 200, "rate": 45000, "requiredAdvance": 8000 },
      { "id": "slab-evening-05", "stayType": "EVENING_SLOT", "name": "201–400 Pax (Evening)", "minHeadcount": 201, "maxHeadcount": 400, "rate": 58000, "requiredAdvance": 8000 },
      { "id": "slab-evening-06", "stayType": "EVENING_SLOT", "name": "401–800 Pax (Evening)", "minHeadcount": 401, "maxHeadcount": 800, "rate": 72000, "requiredAdvance": 10000 },
      { "id": "slab-evening-07", "stayType": "EVENING_SLOT", "name": "801–1200 Pax (Evening)", "minHeadcount": 801, "maxHeadcount": 1200, "rate": 90000, "requiredAdvance": 15000 }
    ],
    "complimentaryDomeRule": "Bookings for slabs of 400+ attendees are eligible to request 1 complimentary attached Dome during event hours (strictly mirroring hall slot timings: 10:00 AM – 3:00 PM or 5:00 PM – 10:00 PM, subject to room inventory availability and schedule alignment).",
    "amenitiesIncluded": [
      "Standard Banquet Seating & Tables",
      "Elevated Presentation Stage",
      "High-Capacity Diesel Backup Generator",
      "Drinking Water Supply & Restroom Facilities"
    ],
    "policyNotes": [
      "Swimming pool access is strictly excluded for event attendees under all circumstances.",
      "Custom add-ons (Waste Management, Massage Chair, Coffee Machine) available on request and itemized manually on folio for receipt printing only.",
      "Booking advance is non-refundable and credited directly towards total venue rent (no security deposits tracked).",
      "Standard slot packages are billed as flat baseline blocks (shortening hours yields no discount). Scope reductions act as Partial Cancellations subject to management review.",
      "PostgreSQL trigger automatically maintains Booking.netRevenue = totalPaid - refundAmount; BookingUnit.unitPrice >= 0 is strictly enforced at database level."
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
