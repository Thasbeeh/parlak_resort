# API & WhatsApp Engine Specification: Live Inventory & Server-Side Quotes (`inquiry_api.md`)

> **File Scope & Context for AI Agents:**
> - **Target Routes / Handlers:**
>   - `app/api/availability/route.ts` (`GET /api/availability`)
>   - `app/api/inquiry/generate/route.ts` (`POST /api/inquiry/generate`)
>   - `lib/pricing.ts` (Core server-side calculation engine)
> - **Primary Purpose:** Authoritative financial calculation, inventory verification, quote assembly, and WhatsApp outbound message encoding.
> - **Key Mandates Enforced:**
>   - **Zero Client-Side Math:** Pricing calculations, slab matching, and date iterations are **completely removed** from the client to eliminate code duplication, prevent client-side tampering, and establish PostgreSQL as the sole single source of truth.
>   - **On-Screen Estimate Only:** The financial breakdown returned by `POST /api/inquiry/generate` is strictly an on-screen estimate presented on the customer website UI for cost transparency.
>   - **Price-Free WhatsApp Template:** The outbound `wa.me` message template deliberately excludes all pricing figures and advance totals. It transmits strictly verified booking parameters (dates, unit, headcount, guest info) so Admins provide the official quote and payment link directly in WhatsApp chat, eliminating tampering risks.
>   - **Stateless Execution:** Zero inquiry state stored in Redis or database; calculations are strictly on-demand.
>   - **Timezone Invariant:** All calendar dates, day slots, and weekend modifiers are evaluated strictly in `Asia/Kolkata` (IST).
>   - **Strict Date-Bounded Modifiers:** All modifiers (`WEEKEND` and `SEASONAL`) are strictly bounded to explicit date ranges (`startDate` to `endDate`, with `endDate >= startDate` enforced at the database level via `chk_pricemodifier_dates`). Weekend modifiers are bound to operational seasons rather than indefinite open-ended ranges.
>   - **Contiguous Slabs Guarantee:** Rate plans and headcount slabs evaluated by the pricing engine are guaranteed to be perfectly contiguous without gaps or overlaps (`slabs[i].minHeadcount === slabs[i-1].maxHeadcount + 1`), strictly enforced via Zod `superRefine` upon creation/editing in the Admin panel.
>   - **Modifier Hierarchy (Different Types):** Weekend surcharge strictly overrides Seasonal promotions (Weekend has higher priority).
>   - **Same-Type Modifier Resolution (Highest Yield Rule):** Overlapping same-type modifiers resolve by always picking the modifier that results in the highest final price for the resort.
>   - **Input Validation:** The API strictly validates guest capacity, logical dates, and payloads. Invalid requests return a `400 Bad Request` with a human-readable error message.
>   - **Minimum Slab Floor:** Attendee counts below lowest configured slab pay the lowest slab base fee rather than erroring.
>   - **Occupancy Enforcement:** Validates strict adult/infant room limits before quote generation.
>   - **Scope-Based Recalculation & Upgrade Floor:** Baseline booked scopes remain locked to historical snapshots. Upward extensions evaluate against the active Price List, with headcount upgrades isolated using an apples-to-apples algebraic floor ($\max(0, \text{New} - \text{Old Capacity})$).
>   - **Flat Baseline Blocks & Partial Cancellations:** Standard preset slots bill as flat blocks (shortening hours yields no discount); scope reductions (fewer nights, dropped slots, lower headcount slabs) act strictly as Partial Cancellations with zero automatic refunds.
> - **Token Efficiency Note:** Read or edit this file when modifying pricing logic, API payload contracts, WhatsApp message templates, or availability check algorithms.

---

## 1. Architectural Mandates: Why Quote Generation is Handled Server-Side

Client-side quote calculation, slab matching, and WhatsApp message compilation are **completely removed** from the frontend to enforce three non-negotiable architectural mandates:

1. **Eliminate Code Duplication:**
   The client contains zero calculation logic or pricing constants. All complex rules (night-by-night date iteration, day-of-week parsing in `Asia/Kolkata` IST, weekend override over seasonal discounts, Highest Yield resolution for same-type modifiers, slab contiguous matching, minimum slab opening floors, and multi-room occupancy caps) reside solely within the server pricing engine (`lib/pricing.ts`).
2. **Prevent Client-Side Tampering & Price-Free WhatsApp Payload:**
   The financial quote calculated on the server is rendered strictly as an **on-screen estimate** on the website UI. To eliminate any possibility of price spoofing or customer tampering in WhatsApp, the pre-filled `wa.me` message template **deliberately excludes all pricing numbers**. It sends strictly verified reservation parameters (dates, room count, headcount, guest info, special notes) so the Admin provides the official price quote and payment link directly in WhatsApp chat. The server directly verifies all inputs against database constraints (e.g. max capacity ceilings, chronological dates). If validation fails, it returns a `400 Bad Request` with a human-readable error message. If valid, it returns the pricing breakdown for the UI and the pre-encoded parameter-only `https://wa.me/` URL.
3. **Establish Single Source of Truth:**
   Live rates, weekend surcharges (+-%), seasonal promotions, and booking advance requirements are evaluated strictly on the server directly from PostgreSQL.
4. **Zero Persistence (Stateless):**
   No inquiry state is stored in Redis or the database; calculation is entirely stateless and read-only.
5. **Scope-Based Pricing & Extension Invariant:**
   - **Baseline Scope Preservation:** Inquiries generated on the website reflect current active rate plans. Once booked, the customer's contracted scope (dates, hours, and headcount slab) is permanently locked in PostgreSQL (`BookingUnit.bookedBaseRate`, `bookedMinHeadcount`, `bookedMaxHeadcount`). Historical agreed tariffs are insulated from future catalogue changes.
   - **Incremental Scope Expansion (New Active Tariff):** Any subsequent stay extensions (additional nights, extra hours beyond standard preset slots, or additional Day Slots) are calculated dynamically against the server's live active Price List in effect at the time of the request.
   - **Headcount Slab Expansion (The Apples-to-Apples Algebraic Floor):**
     - Adjusting headcount within the original booked slab boundaries ($\text{bookedMinHeadcount} \le \text{Headcount} \le \text{bookedMaxHeadcount}$) leaves rent charges strictly unchanged.
     - Crossing into a higher slab calculates the incremental charge by comparing tiers exclusively within the *current active* Price List with a mathematical floor:
       $$\text{Incremental Charge} = \max(0, \text{ActiveRate}(\text{New Higher Slab}) - \text{ActiveRate}(\text{Original Booked Capacity}))$$
       where `ActiveRate(Original Booked Capacity)` is determined by querying the booking's `bookedMaxHeadcount` against the new active Price List. This isolates true capacity value and guarantees the resort never issues a negative discount if active market rates drop.
   - **Flat Baseline Blocks:** Standard packages (Overnight 12:00 PM – 11:00 AM, Day Slot 10:00 AM – 3:00 PM, Event Hall Morning 10:00 AM – 3:00 PM / Evening 5:00 PM – 10:00 PM) are billed as **flat baseline blocks**. Shortening fractional hours (e.g. checking in at 2:00 PM or departing at 9:00 AM) does *not* reduce the baseline rent charge.
   - **Universal Scope Reductions (Partial Cancellations):** Any reduction in scope—whether dropping a night, dropping a discrete add-on slot, or downgrading to a lower headcount slab—acts strictly as a **Partial Cancellation**. The system does not issue automatic refunds; the baseline rent remains locked, and any refund or adjustment requires manual Admin override.
   - **Grandfathering Orphaned Capacities:** If an active Price List is downsized, historical bookings exceeding the new capacity preserve contracted rates on date shifts (re-evaluating calendar modifiers against the locked base rate), but upward headcount increases are mathematically blocked without an active slab.
6. **Downstream Booking Integrity Guarantees:**
   When verified inquiry parameters are converted into confirmed bookings in the Admin panel:
   - **Unit Tariff Floor:** `BookingUnit.unitPrice` is strictly guarded by PostgreSQL constraint `chk_booking_unit_price` ensuring `unitPrice >= 0`.
   - **Trigger-Driven Net Revenue:** PostgreSQL trigger `trigger_calculate_net_revenue` automatically maintains `Booking.netRevenue = totalPaid - COALESCE(refundAmount, 0)` upon creation, payments, and cancellations/refunds, ensuring downstream financial reporting is always accurate.

---

## 2. Sub-Route Data Contract: Live Inventory & Availability API (`GET /api/availability`)

The client date/slot picker queries this read-only API endpoint to check PostgreSQL `tstzrange` availability without making direct database writes.

- **Purpose:** Pure availability and inventory verification.
- **Contiguous Physical Unit Verification:** The availability algorithm **strictly verifies that at least one specific physical unit ID is free across the entire contiguous date/time range** of the multi-night stay, preventing "split-stay" false availability where different rooms are free on disjoint days.
- **Client-Side Pricing Removed:** Pricing calculations are completely removed from this endpoint. Authoritative quote generation and WhatsApp payload assembly are handled strictly by `POST /api/inquiry/generate`.

### Inbound Query Payload (API Request)
```http
GET /api/availability?unitCategory=DOME&stayType=OVERNIGHT&startDatetime=2026-10-15T06:30:00.000Z&endDatetime=2026-10-16T05:30:00.000Z&requestedUnits=2 HTTP/1.1
Host: parlakfarmhouse.com
Accept: application/json
```

```typescript
// Query parameters schema
interface AvailabilityInboundQuery {
  unitCategory: "DOME" | "A_FRAME" | "HALL" | "NON_AC_HALL" | "AC_HALL";
  unitId?: string;                      // Optional specific unit identifier / venue_id
  stayType: "OVERNIGHT" | "DAY_SLOT" | "MORNING_SLOT" | "EVENING_SLOT"; // Rooms: OVERNIGHT / DAY_SLOT; Halls: MORNING_SLOT / EVENING_SLOT
  startDatetime: string;                // ISO-8601 UTC string (e.g. 12:00 PM IST -> 06:30 UTC)
  endDatetime: string;                  // ISO-8601 UTC string (e.g. 11:00 AM IST -> 05:30 UTC)
  requestedUnits?: number;              // Defaults to 1; max equal to total category inventory
}
```

### Outbound JSON Response: Unit Availability
```json
{
  "isAvailable": true,
  "unitCategory": "DOME",
  "requestedUnits": 2,
  "availableUnitsCount": 3,
  "totalCategoryUnits": 4,
  "stayType": "OVERNIGHT",
  "blockedDatesInMonth": [
    "2026-10-24",
    "2026-10-25",
    "2026-10-31"
  ]
}
```

---

## 3. Sub-Route Data Contract: Server-Side Inquiry & Quote Generation API (`POST /api/inquiry/generate`)

### Inbound JSON Request Schema
```typescript
type InquiryGenerateInboundRequest =
  | {
      type: "ROOM";
      unitCategory: "DOME" | "A_FRAME";
      unitId?: string;
      stayType: "OVERNIGHT" | "DAY_SLOT";
      checkInDate: string; // YYYY-MM-DD (midday IST)
      checkOutDate?: string; // YYYY-MM-DD (required if OVERNIGHT)
      rooms: Array<{
        roomIndex?: number;
        adults: number; // Min 1; Max 3 (Dome) or 5 (A-Frame). Adult: 3+ years
        infants: number; // Max 2 (Dome) or 4 (A-Frame). Infant: Under 3 years (sharing existing bed)
      }>;
      guestName?: string;
      guestPhone?: string;
      specialRequests?: string;
    }
  | {
      type: "HALL";
      unitCategory: "NON_AC_HALL" | "AC_HALL";
      unitId?: string;
      slotType: "MORNING_SLOT" | "EVENING_SLOT";
      eventDate: string; // YYYY-MM-DD
      headcount: number; // Min 1; Max physical capacity (1,200 Non-AC / 2,000 AC). Slabs below lowest tier match floor rate.
      attachedDomeRequested?: boolean;
      guestName?: string;
      guestPhone?: string;
      notes?: string;
    };
```

### Inbound JSON Request Sample A: Room Stay (2 Domes, Overnight)
```json
{
  "type": "ROOM",
  "unitCategory": "DOME",
  "stayType": "OVERNIGHT",
  "checkInDate": "2026-10-15",
  "checkOutDate": "2026-10-16",
  "rooms": [
    { "roomIndex": 1, "adults": 3, "infants": 1 },
    { "roomIndex": 2, "adults": 2, "infants": 0 }
  ],
  "guestName": "Muhammed Rahil",
  "guestPhone": "+91 98470 12345",
  "specialRequests": "Arriving around 1:00 PM. Please prepare campfire & BBQ skewers."
}
```

### Outbound JSON Response Sample A: Room Stay Quote & WhatsApp URL
```json
{
  "success": true,
  "data": {
    "type": "ROOM",
    "unitCategory": "DOME",
    "unitName": "Dome 1",
    "stayType": "OVERNIGHT",
    "checkInDate": "2026-10-15",
    "checkOutDate": "2026-10-16",
    "totalNights": 1,
    "totalRooms": 2,
    "totalAdults": 5,
    "totalInfants": 1,
    "rooms": [
      { "roomIndex": 1, "adults": 3, "infants": 1 },
      { "roomIndex": 2, "adults": 2, "infants": 0 }
    ],
    "nightsBreakdown": [
      {
        "date": "2026-10-15",
        "dayOfWeek": "Thursday",
        "isWeekend": false,
        "baseRatePerUnit": 3500,
        "appliedModifier": null,
        "effectiveRatePerUnit": 3500
      }
    ],
    "totalStayRent": 7000,
    "requiredAdvanceTotal": 4000,
    "remainingBalance": 3000,
    "whatsappMessage": "*PARLAK RESORT - STAY RESERVATION REQUEST*\n────────────────────────────\n*Unit Type:* Luxury Geodesic Dome\n*Stay Type:* Overnight Stay (12:00 PM Check-in ➔ 11:00 AM Check-out)\n*Dates:* 15 Oct 2026 to 16 Oct 2026 (1 Night)\n\n*Requested Rooms (2 Units):*\n• Room 1: 3 Adults, 1 Infant\n• Room 2: 2 Adults\n\n*Guest Details:*\n• Name: Muhammed Rahil\n• Contact: +91 98470 12345\n• Special Requests: Arriving around 1:00 PM. Please prepare campfire & BBQ skewers.\n\n_Note: Max 3 adults & 2 infants per Dome. Strictly NO extra beds. Please confirm availability, official quote, and payment details for booking advance._",
    "whatsappUrl": "https://wa.me/918891931123?text=*PARLAK%20RESORT%20-%20STAY%20RESERVATION%20REQUEST*..."
  }
}
```

### Inbound JSON Request Sample B: Event Hall (550 Pax, Morning Slot)
```json
{
  "type": "HALL",
  "unitCategory": "NON_AC_HALL",
  "slotType": "MORNING_SLOT",
  "eventDate": "2026-11-20",
  "headcount": 550,
  "attachedDomeRequested": true,
  "guestName": "Aiswarya Lakshmi",
  "guestPhone": "+91 97455 67890",
  "notes": "Stage decoration team needs entry at 9:00 AM. Inquiring about attached dome."
}
```

### Outbound JSON Response Sample B: Event Hall Quote & WhatsApp URL
```json
{
  "success": true,
  "data": {
    "type": "HALL",
    "unitCategory": "NON_AC_HALL",
    "venueName": "Non-AC Event Hall",
    "slotType": "MORNING_SLOT",
    "slotLabel": "Morning Slot",
    "slotTimings": "10:00 AM – 3:00 PM IST (Same Day)",
    "eventDate": "2026-11-20",
    "headcount": 550,
    "matchedSlab": {
      "minHeadcount": 401,
      "maxHeadcount": 800,
      "basePrice": 58000,
      "requiredDeposit": 10000,
      "isFloorApplied": false
    },
    "appliedModifier": null,
    "totalVenueRent": 58000,
    "requiredAdvance": 10000,
    "remainingBalance": 48000,
    "attachedDomeRequested": true,
    "attachedDomeStatus": "COMPLIMENTARY",
    "whatsappMessage": "*PARLAK RESORT - EVENT VENUE INQUIRY*\n────────────────────────────\n*Venue:* Non-AC Event Hall (Max 1,200 Pax)\n*Event Date:* 20 Nov 2026\n*Slot Type:* Morning Slot (10:00 AM – 3:00 PM IST)\n*Expected Headcount:* 550 Guests (Slab: 401–800 Pax)\n\n*Organizer Details:*\n• Name: Aiswarya Lakshmi\n• Contact: +91 97455 67890\n• Notes / Setup Requirements: Stage decoration team needs entry at 9:00 AM. Inquiring about attached dome.\n• Attached Dome Request: Yes (Subject to schedule & room inventory clearance)\n\n_Notice: Swimming pool access is strictly excluded for event attendees under all circumstances. Please confirm availability, official quote, and payment details for booking advance._",
    "whatsappUrl": "https://wa.me/918891931123?text=*PARLAK%20RESORT%20-%20EVENT%20VENUE%20INQUIRY*..."
  }
}
```

---

## 4. WhatsApp Outbound Payload Engine

Client-side quote math and text pre-compilation are **completely removed**. When the guest clicks **"Verify via WhatsApp"**, the frontend client passes the user's form parameters directly to `POST /api/inquiry/generate`. The backend calculates rates from the database, validates room occupancy, formats the message, and returns the pre-encoded `https://wa.me/` URL.

### A. Stays Reservation Engine (Domes & A-Frames)

#### Inbound Client Form Submission (No Client-Side Math)
```typescript
interface StayBookingFormState {
  type: "ROOM";
  unitCategory: "DOME" | "A_FRAME";
  stayType: "OVERNIGHT" | "DAY_SLOT";
  checkInDate: "2026-10-15";           // 12:00 PM IST
  checkOutDate: "2026-10-16";          // 11:00 AM IST Next Day
  rooms: [
    { roomIndex: 1, adults: 3, infants: 1 },
    { roomIndex: 2, adults: 2, infants: 0 }
  ];
  guestName: "Muhammed Rahil";
  guestPhone: "+91 98470 12345";
  specialRequests: "Arriving around 1:00 PM. Please prepare campfire & BBQ skewers.";
}
```

#### Server-Generated WhatsApp Message (Decoded Text Sample)
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

_Note: Max 3 adults & 2 infants per Dome. Strictly NO extra beds. Please confirm availability, official quote, and payment details for booking advance._
```

#### Server-Generated Encoded `wa.me` URL (Returned to Frontend)
```text
https://wa.me/918891931123?text=*PARLAK%20RESORT%20-%20STAY%20RESERVATION%20REQUEST*%0A%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%0A*Unit%20Type%3A*%20Luxury%20Geodesic%20Dome%0A*Stay%20Type%3A*%20Overnight%20Stay%20(12%3A00%20PM%20Check-in%20%E2%9E%94%2011%3A00%20AM%20Check-out)%0A*Dates%3A*%2015%20Oct%202026%20to%2016%20Oct%202026%20(1%20Night)%0A%0A*Requested%20Rooms%20(2%20Units)%3A*%0A%E2%80%A2%20Room%201%3A%203%20Adults%2C%201%20Infant%0A%E2%80%A2%20Room%202%3A%202%20Adults%0A%0A*Guest%20Details%3A*%0A%E2%80%A2%20Name%3A%20Muhammed%20Rahil%0A%E2%80%A2%20Contact%3A%20%2B91%2098470%2012345%0A%E2%80%A2%20Special%20Requests%3A%20Arriving%20around%201%3A00%20PM.%20Please%20prepare%20campfire%20%26%20BBQ%20skewers.%0A%0A_Note%3A%20Max%203%20adults%20%26%202%20infants%20per%20Dome.%20Strictly%20NO%20extra%20beds.%20Please%20confirm%20availability%2C%20official%20quote%2C%20and%20payment%20details%20for%20booking%20advance._
```

---

### B. Event Hall Inquiry Engine

#### Inbound Client Form Submission (No Client-Side Math)
```typescript
interface HallInquiryFormState {
  type: "HALL";
  unitCategory: "NON_AC_HALL" | "AC_HALL";
  eventDate: "2026-11-20";
  slotType: "MORNING_SLOT" | "EVENING_SLOT";
  headcount: 550;
  attachedDomeRequested: true;
  guestName: "Aiswarya Lakshmi";
  guestPhone: "+91 97455 67890";
  notes: "Stage decoration team needs entry at 9:00 AM. Inquiring about attached dome.";
}
```

#### Server-Generated WhatsApp Message (Decoded Text Sample)
```text
*PARLAK RESORT - EVENT VENUE INQUIRY*
────────────────────────────
*Venue:* Non-AC Event Hall (Max 1,200 Pax)
*Event Date:* 20 Nov 2026
*Slot Type:* Morning Slot (10:00 AM – 3:00 PM IST)
*Expected Headcount:* 550 Guests (Slab: 401–800 Pax)

*Organizer Details:*
• Name: Aiswarya Lakshmi
• Contact: +91 97455 67890
• Notes / Setup Requirements: Stage decoration team needs entry at 9:00 AM. Inquiring about attached dome.

• Attached Dome Request: Yes (Subject to schedule & room inventory clearance)

_Notice: Swimming pool access is strictly excluded for event attendees under all circumstances. Please confirm availability, official quote, and payment details for booking advance._
```

#### Server-Generated Encoded `wa.me` URL (Returned to Frontend)
```text
https://wa.me/918891931123?text=*PARLAK%20RESORT%20-%20EVENT%20VENUE%20INQUIRY*%0A%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%0A*Venue%3A*%20Non-AC%20Event%20Hall%20(Max%201%2C200%20Pax)%0A*Event%20Date%3A*%2020%20Nov%202026%0A*Slot%20Type%3A*%20Morning%20Slot%20(10%3A00%20AM%20%E2%80%93%203%3A00%20PM%20IST)%0A*Expected%20Headcount%3A*%20550%20Guests%20(Slab%3A%20401%E2%80%93800%20Pax)%0A%0A*Organizer%20Details%3A*%0A%E2%80%A2%20Name%3A%20Aiswarya%20Lakshmi%0A%E2%80%A2%20Contact%3A%20%2B91%2097455%2067890%0A%E2%80%A2%20Notes%20%2F%20Setup%20Requirements%3A%20Stage%20decoration%20team%20needs%20entry%20at%209%3A00%20AM.%20Inquiring%20about%20attached%20dome.%0A%0A%E2%80%A2%20Attached%20Dome%20Request%3A%20Yes%20(Subject%20to%20schedule%20%26%20room%20inventory%20clearance)%0A%0A_Notice%3A%20Swimming%20pool%20access%20is%20strictly%20excluded%20for%20event%20attendees%20under%20all%20circumstances.%20Please%20confirm%20availability%2C%20official%20quote%2C%20and%20payment%20details%20for%20booking%20advance._
```

---

## 5. Summary of the "Click-to-WhatsApp" Architecture

```text
Visitor browses /stays ➔ Selects Unit Category ➔ Views /stays/:id
                         │
                         ▼
Selects Dates ➔ API Confirms Inventory > 0 ➔ Configures Rooms/Guests
                         │
                         ▼
POST /api/inquiry/generate (Server evaluates DB rates & compiles quote)
                         │
                         ▼
Frontend receives verified breakdown & pre-encoded wa.me URL (Zero Client Math)
                         │
                         ▼
Visitor clicks "Verify via WhatsApp" ➔ Redirected to WhatsApp chat with Admin
                         │
                         ▼
Admin confirms price & collects booking advance (UPI/Bank)
                         │
                         ▼
Admin opens Admin Panel ➔ Manually creates booking ➔ DB blocks calendar
```

### Comprehensive Public Route & API Payload Inventory

| # | Route / Action | Type | Inbound Parameters / State | Outbound Payload / Destination | Data Source / Side Effects |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | `GET /` | Next.js Page (RSC) | Query: `promo`, `ref` | Home page props: Hero, Promos, Curated Highlights, Experiences, FAQs, SEO metadata | PostgreSQL (Read-Only: Units, Promos, Settings) |
| **2** | `GET /stays` | Next.js Page (RSC) | Query: `category`, `stayType`, `checkIn`, `checkOut` | Catalog props: Filter tabs, active category, Unit cards with base pricing, capacity badges, and photos | PostgreSQL (Read-Only: Active Units) |
| **3** | `GET /stays/:id` | Next.js Page (RSC) | Params: `id` (slug/UUID); Query: `stayType` (rooms), `slotType` (halls), `date` | Unit detail props: Domes/A-Frames (gallery, amenities, booking advance rules) OR Event Halls (morning & evening slabs, dome bundling notes) | PostgreSQL (Read-Only: Unit, Slabs, Settings) |
| **4** | `GET /api/availability` | Next.js Route Handler | Query: `unitCategory`, `stayType`, `startDatetime`, `endDatetime`, `requestedUnits` | JSON: `isAvailable`, `availableUnitsCount`, `totalCategoryUnits`, `blockedDatesInMonth` | PostgreSQL (Read-Only: `tstzrange` GiST exclusion query) |
| **5** | `POST /api/inquiry/generate` | Next.js Route Handler | Body: `type` ("ROOM" / "HALL"), dates, slot, rooms/headcount, guest details | JSON: verified `pricingBreakdown`, `totalStayRent` / `totalVenueRent`, `requiredAdvance`, `remainingBalance`, `whatsappMessage`, `whatsappUrl` | PostgreSQL (Read-Only: Units, PriceLists, Slabs, Modifiers; zero DB/Redis writes) |
| **6** | **WhatsApp Inquiry Redirect** | Client Action (`wa.me`) | Trigger: "Verify via WhatsApp" click | Opens server-generated pre-encoded `https://wa.me/` URL in WhatsApp | Zero DB writes; client redirect |
| **7** | `GET /contact` | Next.js Page (RSC) | Query: `inquiryType` | Contact props: Resort phones, location, Google Maps iframe embed, operational policies, cancellation policy | PostgreSQL (Read-Only: Settings) |
| **8** | **Floating WhatsApp Widget** | Client Action (`wa.me`) | Static click trigger across all viewports | Encoded `https://wa.me/` general inquiry URL | Zero DB writes; static client link |
