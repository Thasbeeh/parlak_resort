---
name: parlak-domain
description: Enforces core domain rules, inventory constraints, slot booking logic, concurrency guarantees, and scope guardrails for the Parlak Resort platform. Use when designing, creating, or modifying booking flows, admin operations, pricing logic, database models, or WhatsApp message payloads.
---

# Parlak Resort Domain Specification & Architectural Guardrails

This skill documents the non-negotiable business rules, domain entities, booking lifecycles, and architectural constraints for the **Parlak Resort** web application and admin management system.

---

## 1. Golden Architectural Rules (5-Day Delivery Guardrails)

1. **Read-Only Public Frontend:**
   - The public website performs **zero direct database writes**.
   - All visitor inquiries and booking requests compile into structured `https://wa.me/` URLs routing directly to the resort's WhatsApp.
   - Bookings enter the database **only** through manual Admin Panel entry after advance payment verification.
2. **Strict Internal Authentication:**
   - Maximum of **3 Admin accounts**, seeded directly into PostgreSQL with hashed passwords.
   - No user registration, no customer accounts, and no role-based permission ladders (no staff/housekeeping roles).
   - Session authentication uses lightweight signed JWTs in HTTP-only cookies (`jose` + Web Crypto).
3. **Lightweight Flat CRM:**
   - Do NOT build a relational `Customers` table.
   - Guest information (`guest_name`, `guest_phone`, `guest_email`, `notes`) is stored as flat columns directly on the `Bookings` record.
4. **No Relational Product Catalogs for Add-ons:**
   - Do NOT build database tables for restaurant menus, kayaking rates, or damage fees.
   - The billing folio strictly uses a manual **"Add Line Item"** tool (`description` + `amount`) stored as simple line items tied to the booking.
5. **Browser-Based Receipt Printing:**
   - No server-side PDF generators (`@react-pdf/renderer`, `puppeteer`, etc.).
   - Invoices are rendered as React components styled with Tailwind CSS `@media print` rules and triggered via `window.print()` / `react-to-print`.

---

## 2. Inventory & Unit Capacity Specifications

| Unit Category         | Total Units                       | Default Capacity   | Max Capacity Rule                                | Amenities & Bedding                                                                             | Default Advance                |
| :-------------------- | :-------------------------------- | :----------------- | :----------------------------------------------- | :---------------------------------------------------------------------------------------------- | :----------------------------- |
| **Geodesic Domes**    | 4 (Dome 1 to 4)                   | 3 Adults + Infants | **Hard Cap:** Max 3 pax. Strictly NO extra beds. | Attached Bath, AC, Wi-Fi, Smart TV, Pool access. Standard: Tea/Coffee kit, 1L Water, BBQ grill. | Dynamic (Set per Price List slab) |
| **A-Frames**          | 3 (A-Frame 1 to 3; expandable)    | 5 Adults + Infants | **Hard Cap:** Max 5 pax. Strictly NO extra beds. | Includes **both Double and Queen beds**. Attached Bath, AC, Wi-Fi, Pool access.                 | Dynamic (Set per Price List slab) |
| **Non-AC Event Hall** | 1 (Active)                        | 1,200 Pax          | Configurable by Admin                            | Seating, stage, generator, banquet space. **Pool access excluded.**                             | Dynamic (Set per pricing slab) |
| **AC Event Hall**     | 1 (Inactive / Under Construction) | 2,000 Pax          | Configurable by Admin                            | Accommodated in DB schema; marked `Inactive` until completed.                                   | Dynamic (Set per pricing slab) |

- **Strict Age Thresholds:**
  - **Adult:** 3+ years (requires adult capacity allocation)
  - **Infant:** Under 3 years (sharing existing bed; no separate bedding provided)
- **Unit Status & Pre-Deactivation Guard:** Active units show on the public site; Inactive units render as "Sold Out". Before deactivating any unit, the system strictly validates that zero future active bookings exist (`endDatetime >= NOW()` AND `status NOT IN ('CANCELLED')`). If future bookings exist, deactivation is blocked (`UNIT_HAS_FUTURE_BOOKINGS`) prompting the Admin to reassign those guests first.
- **Media Management & Featured Photo Lifecycle:** Max 3MB per photo, strictly sequential uploads with progress indicators, and drag-and-drop sequencing. Because Prisma does not support partial unique indexes with `WHERE` clauses, the "at least one and exactly one featured photo per unit" invariant is strictly enforced at the application layer across the full lifecycle:
  1. **First Upload:** If a unit has 0 photos, the first uploaded photo is set to `isFeatured: true`.
  2. **Subsequent Uploads:** Default to `isFeatured: false`.
  3. **Switching Featured:** Runs in an atomic `prisma.$transaction` setting all to false, then target to true.
  4. **Deletion Auto-Promotion:** Deleting an `isFeatured: true` photo atomically promotes the remaining photo with the lowest `orderIndex` to `isFeatured: true`.

---

## 3. Booking Modes & Time-Slot Logic

All bookings in the database must use **`start_datetime`** and **`end_datetime`** (stored in UTC / handled in IST) instead of plain date strings to unify slot and overnight overlap checks.

### A. Domes & A-Frames

1. **Overnight Stay (Default):**
   - Standard timings: **12:00 PM Check-in to 11:00 AM Next-Day Check-out**.
2. **Day Slot:**
   - Fixed timings: **10:00 AM to 3:00 PM (Same Day)**.
3. **Multi-Unit Booking:** A single booking ID (e.g., `#B001`) can contain multiple units (e.g., Dome 1 + A-Frame 2).
4. **Contiguous Physical Unit Availability Rule:** Multi-night availability queries (`GET /api/availability`) **strictly confirm that at least one specific physical unit ID is free for the entire contiguous date range** of the stay to prevent "split-stay" false availability.
5. **Post-Confirmation Scope Changes & Rate Rules:**
   - **Baseline Scope Preservation:** The amount charged for the original contracted stay (initial nights and standard slot hours) is permanently locked to the tariff in effect when the booking was created (`BookingUnit.bookedBaseRate`).
   - **Incremental Scope Expansion (New Active Tariff Rule):** Whenever the scope expands (extra nights, time extensions, additional slots), the incremental addition is calculated strictly using the **new active Price List** currently in effect.
     - To prevent negative-discounts during headcount upgrades, the system enforces an algebraic floor evaluated strictly against the active price list (using `bookedMaxHeadcount` to find the equivalent historical slab):
       $$\text{Incremental Charge} = \max(0, \text{ActiveRate}(\text{New Higher Slab}) - \text{ActiveRate}(\text{Original Booked Capacity}))$$
   - **Scope Reductions & Flat Preset Blocks:**
     - Standard presets (Overnight / Day Slot) are **flat baseline blocks**. Shortening fractional hours within a block does *not* reduce the rent.
     - **Universal Reductions (Partial Cancellation):** Any scope reduction (fewer nights, lower headcount slabs, or dropping a discrete add-on slot) acts strictly as a Partial Cancellation. The system does not auto-refund; Admins must manually override the rent charge to apply cancellation penalties.
   - **Grandfathering Orphaned Capacities:** If an active Price List's max capacity is downsized below an existing booking's capacity, the booking is grandfathered. Date shifts evaluate active modifiers against the grandfathered base rate, but upward headcount mutations are strictly blocked.
   - **Automated Recalculation Formula:**
     $$\text{New Rent Charge} = \text{Original Agreed Rent (Baseline Scope)} + \text{Incremental Charge}$$
   - **Admin Choice:** The UI prompts the Admin with the calculated hybrid total while preserving the option to input a custom rent if a negotiated courtesy is granted.

### B. Event Halls

Booked strictly by time slots (no overnight stays):

- **Morning Slot (`MORNING_SLOT`):** 10:00 AM to 3:00 PM (Same Day).
- **Evening Slot (`EVENING_SLOT`):** 5:00 PM to 10:00 PM (Same Day).
- **Hall Concurrency:** Non-AC Hall and AC Hall operate as distinct inventory items. Both can be booked for the same slot on the same day without collision.

---

## 4. Concurrency Protection & Conflict Resolution

### A. Database-Level Exclusion Constraint

To prevent race conditions when multiple Admins book units simultaneously from WhatsApp, concurrency must be enforced by PostgreSQL via a GiST exclusion constraint on the `booking_units` table:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "BookingUnit"
ADD CONSTRAINT no_overlapping_unit_bookings
EXCLUDE USING gist (
  "unitId" WITH =,
  tstzrange("startDatetime", "endDatetime") WITH &&
)
WHERE (status NOT IN ('CANCELLED'));
```

- **Maintenance Date Blocking:** Maintenance and resort buyouts are inserted directly into `BookingUnit` with `status: 'MAINTENANCE_BLOCKED'` across the blocked timeline. Because `'MAINTENANCE_BLOCKED'` is covered by the exclusion constraint (`status NOT IN ('CANCELLED')`), PostgreSQL natively blocks any concurrent booking attempts at the kernel level.
- **Database-Level Integrity Constraints & Triggers:**
  - **Net Revenue Trigger (`trigger_calculate_net_revenue`):** PostgreSQL `BEFORE INSERT OR UPDATE` trigger on `Booking` automatically sets `NEW."netRevenue" = NEW."totalPaid" - COALESCE(NEW."refundAmount", 0)`. The application layer does not need to manually compute or synchronize `netRevenue`.
  - **Unit Price Floor Guard:** `CONSTRAINT "chk_booking_unit_price" CHECK ("unitPrice" >= 0)` on `BookingUnit` prevents accidental negative unit tariffs.
  - **Strict Modifier Dates:** `CONSTRAINT "chk_pricemodifier_dates" CHECK ("startDate" IS NOT NULL AND "endDate" IS NOT NULL AND "endDate" >= "startDate")` on `PriceModifier` enforces mandatory bounded date ranges across all modifier types (including `WEEKEND`).

### B. Error Handling Flow (Exclusion Violations vs. OCC)

1. **PostgreSQL Exclusion Violations (`23P01 exclusion_violation`):**
   - If two transactions attempt to book or reschedule overlapping unit times, PostgreSQL rejects the transaction at the kernel level with SQL state `23P01`.
   - The backend explicitly catches `23P01` (or Prisma `P2002` targeting the GiST exclusion constraint) and returns an **HTTP 409 Conflict** with error code `UNIT_SCHEDULE_COLLISION` containing the colliding unit ID, unit name, and overlapping time range.
   - **UI Feedback:**
     - Direct room booking or rescheduling collision: _"Cannot save booking: [Unit Name] is already booked during this time window."_
     - Rescheduling an Event Hall with attached Domes: _"Cannot reschedule: Attached Dome [X] is already booked on the new date."_
2. **Multi-Admin Optimistic Concurrency Control (`expectedUpdatedAt`):**
   - All Booking mutations (dates, units, guest info, rent charge, line items, payments, status transitions, cancellations) strictly enforce OCC using `expectedUpdatedAt`.
   - If another Admin modified the booking record concurrently (`booking.updatedAt > expectedUpdatedAt`), the mutation fails OCC verification.
   - The backend returns an **HTTP 409 Conflict** with error code `BOOKING_STALE_RECORD`.
   - **UI Feedback:** _"Conflict: This booking was modified by another Admin. Please refresh to view the latest details."_

---

## 5. Pricing, Promotions & Bundling Engine

### A. Domes & A-Frames

- **Pricing Model:** Support for both per-unit Base Rates and Headcount-based Slabs for Overnight Stay and Day Slot.
- **Night-by-Night Calculation:** Multi-night room stays are calculated **night-by-night**. Each individual night is priced independently based on its calendar date and whether it qualifies as a weekend or falls inside a seasonal promotion. Total stay rent is the exact sum of each night's rate.
- **Weekend Definition (IST-Aware):**
  - **Overnight Stays (12:00 PM – 11:00 AM):** Friday night and Saturday night trigger the `WEEKEND` modifier (standard leisure weekend window).
  - **Day Slots (10:00 AM – 3:00 PM):** Saturday and Sunday daytime trigger the `WEEKEND` modifier.
  - All calendar date evaluations and day-of-week checks are evaluated strictly against **Asia/Kolkata (IST)**.
- **Strict Room Occupancy Limits:**
  - Each room requires at least 1 adult.
  - Adults are strictly capped at 3 for Domes and 5 for A-Frames.
  - Infants are strictly capped at 2 for Domes and 4 for A-Frames.
  - Strictly NO extra beds permitted.
- **Weekend Rates:** Admin-configurable rate override or percentage variance (`+-%`).
- **Seasonal Rates (Date Range):** Percentage or fixed override active across a specified date range (`End Date >= Start Date`).
- **Overlap Hierarchy:** On weekend dates, the **Weekend Rate strictly overrides** the Seasonal Rate.
- **Modifier Priority:** If multiple Season or Weekend price modifiers overlap, the system resolves them by applying the **Algebraic Maximum** (`MAX(modifier1, modifier2)`), e.g., $\max(-10\%, -15\%) = -10\%$; $\max(+10\%, +15\%) = +15\%$. (This intentionally favors resort revenue by applying smaller discounts and higher surges).

### B. Event Halls (Headcount Slabs)

- **Slab Pricing:** Rate is based strictly on headcount buckets, not event type (e.g., 10–25 pax: ₹10,000; 400–800 pax: ₹58,000).
- **Weekend Definition (IST-Aware):** Saturday and Sunday daytime/evening trigger the `WEEKEND` modifier for both `MORNING_SLOT` and `EVENING_SLOT`.
- **Minimum Slab Floor Rule:** If an attendee headcount is below the lowest configured slab's `minHeadcount` (e.g., 5 guests when the lowest slab is 10–25 Pax), the system automatically applies the lowest slab as the minimum baseline venue opening fee rather than returning an error.
- **Physical Capacity Cap Safeguard:** The attendee headcount strictly cannot exceed the venue's configured `PhysicalCapacity` (1,200 Pax for Non-AC Hall, 2,000 Pax for AC Hall).
- **Required Booking Advance:** Configured per slab (e.g., ₹5,000 for lower tiers, ₹10,000 for higher tiers).
- **Headcount Slab Expansion (The Apples-to-Apples Algebraic Floor):**
  - **Within Original Slab:** Adjusting headcount within the original booked slab boundaries ($\text{bookedMinHeadcount} \le \text{Headcount} \le \text{bookedMaxHeadcount}$) leaves the rent charge unchanged.
  - **Crossing to a Higher Slab:** To prevent negative-discounts if overall active prices drop, the system enforces an algebraic floor:
    $$\text{Incremental Charge} = \max(0, \text{ActiveRate}(\text{New Higher Slab}) - \text{ActiveRate}(\text{Original Booked Capacity}))$$
- **Time Extensions vs. Shortening (Flat Baseline Blocks):**
  - **Extra Hours:** Extended event hours are billed using the **new active hourly tariff**.
  - **Shortened Hours:** Standard slot packages (MORNING_SLOT/EVENING_SLOT) are **flat baseline blocks**. Shortening fractional hours does *not* reduce the baseline rent.
- **Scope Reductions & Dropped Slots (Partial Cancellations):**
  - **Universal Reduction Rule:** Any scope reduction (lower headcount slabs, fewer hours/nights, or dropping a discrete add-on slot) acts strictly as a **Partial Cancellation**. The Admin must manually override the rent charge to enforce cancellation penalties.
- **Grandfathering Orphaned Capacities (Date Shifts):**
  - If a Hall Price List is downsized, existing oversized bookings are grandfathered. Date shifts evaluate active modifiers against the grandfathered base rate, but upward headcount mutations are strictly blocked.
- **Overlap & Priority Logic:** Same as Domes & A-Frames; Weekend overrides Seasonal. Overlapping identical-type modifiers are resolved using the **Algebraic Maximum**.

### C. Attached / Discounted Dome Bundling

- **Creation & Updation Rule:** Domes can be bundled, attached, detached, or modified during both the **creation** and **post-confirmation updation** of a Hall booking. When the Hall's hours change, attached child Domes automatically synchronize their start and end datetimes.
- **Pre-Attachment Availability Verification:** The backend exposes a real-time availability check endpoint (`GET /api/admin/bookings/check-availability`) for the target slot/time window (`MORNING_SLOT` 10 AM - 3 PM or `EVENING_SLOT` 5 PM - 10 PM). The UI visually flags which Domes are free to attach vs which have conflicting reservations (showing conflicting booking ID, guest name, and hours) prior to submission.
- **Attached Dome Pricing Tiers:**
  - **Headcount $\ge$ 400 Pax:** Eligible for 1 **Complimentary** attached Dome during event hours (`rent_charge` = ₹0, noted as complimentary subject to schedule and room inventory clearance).
  - **Headcount < 400 Pax:** Available on request; custom price assigned at Admin discretion (bundled into the Hall's `rent_charge`, while the child Dome booking itself is recorded as ₹0 in the DB).
- **Overlap Protection & Exclusion Handling:** If a Dome has a conflicting stay (e.g., overnight guest checking in at 12:00 PM or departing at 11:00 AM), attempting to attach it or reschedule the parent Hall triggers a PostgreSQL `23P01` exclusion violation. The system returns `UNIT_SCHEDULE_COLLISION` and displays: *"Cannot reschedule: Attached Dome [X] is already booked on the new date."*
- **Admin Override:** Admin can adjust the overnight guest's check-in/out hours (e.g., negotiate 9:00 AM checkout) via Post-Confirmation Edits to clear the timeline.
- **Cascading Release (Explicit Database Transaction):** Cancelling a Hall booking automatically triggers an **explicit atomic database transaction** updating all child/attached Domes (`BookingUnit` records where `parentBookingId == id`) to `status = 'CANCELLED'`, instantly releasing them back to public inventory.

### D. Price Lists & Modifier Rules

- **Price & Offer Group:**
  - Configured with `Unit Type` (Dome, A-frame, Non-AC Hall, AC Hall) and `Max Guest Capacity` (Number > 1).
  - Used to categorize and group promotional offers and rate plans.
- **Unique Price List Profile Name:** A Price List is uniquely identified in the database by a **Custom Profile Name** (e.g., "Standard Dome - 2 Pax Plan", "Family Dome - 4 Pax Premium"). The system programmatically converts this to a slug (e.g., `family-dome-4-pax-premium`) to enforce database uniqueness. This allows multiple distinct price plans to exist for units of the exact same type and capacity.
- **Price List Structure:**
  - `Unit Type`: Dome / A-frame / Non-AC Hall / AC Hall.
  - `Max Guest Capacity`: Number (> 1).
  - **Slab Tables by Category:**
    - **Domes & A-Frames:** Overnight Stay (`OVERNIGHT`: 12:00 PM – 11:00 AM) and Day Slot (`DAY_SLOT`: 10:00 AM – 3:00 PM) headcount slab tables.
    - **Event Halls (Non-AC / AC):** Morning Slot (`MORNING_SLOT`: 10:00 AM – 3:00 PM) and Evening Slot (`EVENING_SLOT`: 5:00 PM – 10:00 PM) headcount slab tables.
  - Headcount Slab Fields: `minHeadcount`, `maxHeadcount`, `basePrice`, `requiredAdvance`.
- **Mandatory Attachment on Unit Creation:** When creating any Unit (Dome, A-Frame, or Event Hall), the Admin **must mandatorily attach a Price List** via dropdown.
  - The dropdown is strictly filtered by `Unit Type` (e.g., only Dome price lists appear when editing a Dome).
  - **Validation Safeguard:** The system strictly validates:
    $$\text{PriceList.MaxGuestCapacity} \le \text{Unit.PhysicalCapacity}$$
    (Admin cannot attach a price list designed for more guests than the unit's physical limit).
- **Contiguous Slabs & Completeness (Zod `superRefine` Validation):** Because relational databases cannot natively validate cross-row contiguous ranges without complex triggers, the application layer strictly validates headcount slabs using Zod `superRefine` before saving:
  - Slabs are sorted ascending by `minHeadcount`.
  - The lowest slab must start at `minHeadcount === 1`.
  - Headcount ranges must be perfectly contiguous without gaps or overlaps (`slabs[i].minHeadcount === slabs[i - 1].maxHeadcount + 1`).
  - The highest slab's `maxHeadcount` strictly cannot exceed `PriceList.maxGuestCapacity`.
  - `basePrice > 0` and `0 <= requiredDeposit <= basePrice`.
  - Saves execute inside an atomic `prisma.$transaction` (`deleteMany` followed by `createMany`) preventing intermediate 0-slab states. Every Price List must define slabs for both required slot types.
- **Strict Date Range Requirement for ALL Modifiers:** Both `WEEKEND` and `SEASONAL` modifiers strictly require explicit date ranges (`startDate` IS NOT NULL, `endDate` IS NOT NULL, and `endDate >= startDate`). Weekend modifiers are bound to operational seasons or validity periods rather than indefinite dates, preventing unmonitored indefinite surcharges and enabling audit freezing once expired. Enforced via database constraint `chk_pricemodifier_dates`. Percentage values must be constrained between `-80%` and `+200%`.
- **Modifier Timeline Mutability:** Expired seasonal promotions are permanently locked (read-only archive). Active promotions can have future end dates and percentages adjusted, but past start dates cannot be modified.
- **Price Modifiers & Priority Resolution:**
  - Modifier Types: Seasonal Promotions (Date Range) and Weekend Rates (Sat/Sun).
  - Hierarchy: Weekend Rate strictly overrides Seasonal Promotion on Sat/Sun.
  - Priority: Overlapping modifiers of the same type are resolved using the **Algebraic Maximum** (`MAX(modifier1, modifier2)`), e.g., $\max(-10\%, -15\%) = -10\%$; $\max(+10\%, +15\%) = +15\%$.
- **Post-Save Editing & Attachment Integrity:**
  - **In-Place Atomic Updates:** Admins can edit saved Price Lists and Modifiers inside `prisma.$transaction`. Slabs are replaced atomically (`deleteMany` + `createMany`) to avoid 0-slab downtime.
  - **Rate Snapshotting on Bookings:** Existing bookings store immutable `Booking.rentCharge`, `BookingUnit.unitPrice`, and `BookingUnit.bookedBaseRate`. They never re-query `PriceList` or `PriceSlab` for historical stays, insulating 30-day revenue analytics from catalogue updates.
  - **Hard Physical Capacity Guardrail:** Updating a Price List capacity or slab beyond the physical capacity of any currently attached unit is strictly rejected with a `400 Bad Request`.
  - **Optimistic Concurrency Control:** Updates require `expectedUpdatedAt`; concurrent edits by another Admin return HTTP `409 Conflict`.
  - **Audit Logging:** All edits record `AuditLog` rows capturing `modifiedBy`, `oldValue`, and `newValue`.
  - **Deletion Safeguard:** Deleting a Price List remains strictly restricted (`onDelete: Restrict`) if attached to any units.

---

## 6. Cancellations, Refunds & Billing

1. **Cancellation & Refund Rules (All Units):**
   - Admin can cancel any booking (Dome, A-Frame, or Event Hall) at **any time**.
   - Status set to `CANCELLED`, freeing inventory via PostgreSQL GiST constraint (`WHERE status NOT IN ('CANCELLED')`).
   - Cancelling a parent Hall booking automatically triggers an **explicit atomic database transaction** updating all child/attached Domes to `status = 'CANCELLED'`.
   - Admin enters a custom "Refund Amount" ($0 \le \text{Refund Amount} \le \text{Total Paid}$) and a "Reason".
   - **Automated Net Revenue Trigger:** When refund or payment amounts change, PostgreSQL trigger `trigger_calculate_net_revenue` automatically updates `Booking.netRevenue = totalPaid - refundAmount`. The application layer does not manually recompute this value.
2. **Booking Advance & Checkout Settlement:**
   - Advance payments are non-refundable prepayments credited directly towards total rent (security deposits are strictly NOT tracked or collected).
   - **Unit Price Floor Guard:** `BookingUnit.unitPrice` is protected at the database level by `CONSTRAINT "chk_booking_unit_price" CHECK ("unitPrice" >= 0)`.
   - **Strict Checkout Invariant:** Marking a booking as `CHECKED_OUT` **strictly requires Final Balance Due == ₹0**. All calculations enforce explicit integer rounding (`Math.round()` to nearest Rupee) with an epsilon check (`Math.abs(balance) < 1`) to eliminate floating-point precision artifacts. All base charges, damage fees, and line items must be fully collected in `totalPaid` prior to checkout.
3. **Denormalized Revenue Tracking:**
   - Total 30-Day Revenue metric captures active rent plus retained non-refundable cancellation fees:
     $$\text{Total 30-Day Revenue} = \sum_{\text{Active}} \text{rent\_charge} + \sum_{\text{Cancelled}} (\text{total\_paid} - \text{refund\_amount})$$
   - Maintained with absolute precision by PostgreSQL's `Booking.netRevenue` trigger. Extra charges / line items are strictly for receipt printing and excluded from dashboard rent analytics.

---

## 7. Resort Operational Policies (Hardcoded Rules)

- **Standard Timings:** Check-in: 12:00 PM | Check-out: 11:00 AM.
- **Resident Guests Metric Filter:** Dashboard query for currently checked-in Resident Guests **strictly filters by `stayType = 'OVERNIGHT'`** across Domes and A-Frames (excludes day slots, daytime visitors, and event attendees using attached Domes).
- **Restaurant / Dining:** Menu services available until 10:30 PM.
- **Swimming Pool Policy:**
  - **Event Attendees:** Strictly forbidden from using the pool under any circumstances.
  - **Standard Days:** Pool open for Dome & A-Frame residents until 10:00 PM.
  - **Event Days:** Pool closed during event hours. Dome & A-Frame residents receive an exclusive late-night slot from **10:00 PM to 11:00 PM** after the event concludes.
- **Booking Advance Policy:** The booking advance is strictly dynamic and non-refundable, defined by the Admin when creating each Price List slab (not hardcoded in the codebase). It is credited directly towards room/hall rent at booking confirmation. Security deposits are strictly NOT tracked or collected.
