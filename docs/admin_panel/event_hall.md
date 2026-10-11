## Event Hall Management (Slot-Based Gatherings) - Complete Specification

### Two Distinct Venues

- **Dynamic Max Capacity:** The Max Capacity of any Hall is dynamically configured by the Admin when creating or editing the venue in the admin panel.
- **Non-AC Hall** (Default Capacity: 1200) - Set to **Active**.
- **AC Hall** (Default Capacity: 2000 — _currently under construction but accommodated in DB_) - Set to **Inactive**.
- **Unit Status & Pre-Deactivation Guard:**
  - Admin can toggle a hall venue as **Active** or **Inactive** (Inactive shows as "Sold Out" on the public website).
  - **Mandatory Pre-Deactivation Future Booking Check:** Before toggling any hall to `Inactive`, the system strictly executes a database validation query checking for existing future active bookings (`endDatetime >= NOW()` AND `status NOT IN ('CANCELLED')`).
  - **Blocking Guardrail:** If any future active bookings exist, the deactivation request is strictly blocked with an HTTP `400 Bad Request` (error code: `UNIT_HAS_FUTURE_BOOKINGS`) returning the count, booking IDs, and scheduled event dates.
  - The UI displays an alert: *"Cannot deactivate venue: [Venue Name] has [N] future confirmed booking(s). Please reschedule or cancel these events before deactivating."*
- **Mandatory Price List Attachment:**
  - When creating or editing an Event Hall unit, the Admin **must mandatorily attach a Price List** selected from a dropdown.
  - **Dropdown Filtering:** The dropdown strictly filters to display only Price Lists matching the hall category (`Non-AC Hall` or `AC Hall`).
  - **Capacity Safeguard Validation:** The system strictly validates:
    $$\text{PriceList.MaxGuestCapacity} \le \text{Unit.PhysicalCapacity}$$
    (Admin cannot attach a rate plan exceeding the physical capacity of the hall).

### Venue Selection (Event Hall Management)

- **Venue Selection:** When an Admin creates a Hall booking, they must select the specific venue (**Non-AC Hall** or **AC Hall**) from a dropdown, allowing both halls to be booked concurrently by different parties on the same day.
- **Concurrency Rule:** Each hall operates as an independent inventory unit. Non-AC Hall and AC Hall can both be booked for the same date and booking mode (e.g., both booked for DAY_SLOT) by separate parties without triggering an overlap conflict.

### Venue Media & Gallery Management (Halls)

- **Upload Limit:** Maximum 3MB per photo file (immediate client-side validation prevents uploading oversized files).
- **Strictly Sequential Uploads:** Parallel multi-photo uploads are disabled. Photos must be uploaded sequentially (one-by-one) with a visual progress bar to maintain serverless stability and prevent connection timeouts.
- **Auto-Generated Sizes:** The system auto-generates optimized mobile and thumbnail sizes to keep public venue pages fast.
- **Drag-and-Drop Sequencing:** Admin can drag and drop uploaded venue photos to order the presentation of stages, seating setups, and banquet spaces on the website.
- **Featured Cover Photo & Lifecycle (Strict Exclusivity):** Admin can mark a specific venue photo as "Featured", which sets the primary card thumbnail and OpenGraph preview for the hall. Because Prisma's migration engine does not support partial unique indexes with `WHERE` clauses, the rule of "at least one and exactly one featured photo per unit" is strictly enforced in the application layer (Next.js Server Actions) across the full photo lifecycle:
  1. **First Upload:** If a hall has 0 existing photos, the first uploaded photo is automatically set to `isFeatured: true`.
  2. **Subsequent Uploads:** All subsequent photo uploads default to `isFeatured: false`.
  3. **Switching Featured:** Marking another photo as featured runs inside an atomic `prisma.$transaction` (setting `isFeatured: false` for all photos belonging to that venue, then `isFeatured: true` for the chosen photo).
  4. **Deletion Auto-Promotion:** When deleting a photo, if the photo being deleted is `isFeatured: true`, the system automatically promotes the remaining photo with the lowest `orderIndex` to `isFeatured: true` inside an atomic transaction. This guarantees that every venue with photos always has exactly one featured cover image.
- **SEO & Accessibility Captions:** Fields for Caption, Alt Text, and Description to label photos (e.g., "Non-AC Hall Banquet Setup - 800 Pax Capacity").
- **Deletion Safeguard:** Requires an "Are you sure?" confirmation dialog before deleting any venue photo.

### Booking Modes: MORNING_SLOT & EVENING_SLOT

Event Halls strictly operate on two designated gathering slots (no overnight stays):

- **MORNING_SLOT:** 10:00 AM to 3:00 PM (Same Day - Standard Preset)
- **EVENING_SLOT:** 5:00 PM to 10:00 PM (Same Day - Standard Preset)
- **Admin-Adjustable Slot Timings:** Standard slot timings are convenient presets. The Admin has full flexibility to manually adjust/override exact start and end hours (e.g. setting 11:30 AM to 4:00 PM) during booking creation or post-confirmation edits.
- **No Automated Buffer Handling:** The system strictly does **not** implement automated buffer windows or automated turnover blocks. Buffer/turnover time management is left entirely to Admin operational discretion. Concurrency and schedule validity are enforced at the database level via the PostgreSQL GiST exclusion constraint on active unit time ranges.
- **Rule:** Both halls operate as independent inventory units. Non-AC Hall and AC Hall can each be booked for `MORNING_SLOT` or `EVENING_SLOT` on the same day without colliding with each other.

### Dynamic Slab Pricing (Centralized Price Lists)

Price is based purely on head count, not event type. Configured via the centralized **Price Lists** settings:

- **No Event Type Tracking:** Event Type (e.g., Wedding, Corporate, Reception, Birthday) is strictly NOT tracked, stored, or selected in the database or admin UI. Pricing and booking configuration depend purely on attendee headcount slabs, booking duration (`MORNING_SLOT` vs `EVENING_SLOT`), and flat organizer contact details.
- **Centralized Price List Profile:** Each Hall Price List is identified by a unique Custom Profile Name (slugified in the database, e.g., `non-ac-hall-grand-plan`) and categorized under `Unit Type: Non-AC Hall` or `AC Hall`.
- **Slab Tables for Both Booking Modes (Mandatory Slot Types):**
  - **Mandatory Slot Types Rule:** Every Hall Price List must define valid, contiguous headcount slabs for **both** gathering slots:
    - **Morning Slot Section (10:00 AM – 3:00 PM):** Headcount Slab table (`MinHeadcount`, `MaxHeadcount`, `BasePrice`, `DefaultAdvanceAmount`).
    - **Evening Slot Section (5:00 PM – 10:00 PM):** Headcount Slab table (`MinHeadcount`, `MaxHeadcount`, `BasePrice`, `DefaultAdvanceAmount`).
- **Contiguous Slabs & Bounds Rule (Zod `superRefine` Validation):**
  - Because relational databases cannot natively validate cross-row gapless contiguous ranges without complex deferred triggers, this rule is strictly validated at the application layer via Zod `superRefine` in Next.js Server Actions prior to saving to the database:
    - The array of slabs is sorted ascending by `minHeadcount`.
    - Headcount ranges must be perfectly contiguous with zero gaps or overlaps:
      $$\text{slabs}[i].\text{minHeadcount} === \text{slabs}[i-1].\text{maxHeadcount} + 1$$
    - Slabs must have `minHeadcount >= 1` (the lowest slab can start at 1 or an opening tier like 10 Pax; attendee counts below the lowest slab trigger the Minimum Slab Floor rule below).
    - The highest slab's `maxHeadcount` strictly cannot exceed `PriceList.maxGuestCapacity`.
    - Base price must be $> ₹0$ and `requiredDeposit` must be between $₹0$ and `basePrice`.
  - Slab updates execute inside an atomic `prisma.$transaction` (`deleteMany` followed by `createMany`) so that incomplete or 0-slab states are never exposed.
- **Minimum Slab Floor Rule:** If the attendee headcount is below the lowest configured slab's `minHeadcount` (e.g., 5 attendees when the lowest slab is 10–25 Pax), the system automatically matches the lowest slab as the minimum baseline venue opening fee rather than returning an error.
- **Maximum Capacity Cap Safeguard:** The attendee headcount strictly cannot exceed the unit's configured `PhysicalCapacity` (1,200 Pax for Non-AC Hall, 2,000 Pax for AC Hall). Any headcount exceeding this physical ceiling is rejected.
- **Example Structure:**
  - Min: 10, Max: 25, Price: ₹10,000, Advance: ₹5,000
  - Min: 26, Max: 50, Price: ₹16,000, Advance: ₹5,000
  - Min: 401, Max: 800, Price: ₹58,000, Advance: ₹10,000, etc.
- **Dynamic Booking Advance:** Each slab configures its own **Default Advance Amount**, captured and locked into the booking at creation time.

### Attached / Discounted Dome Bundling

- When creating or editing an Event Hall booking, the Admin can select one or more Domes to attach or detach from the event.
- **Creation & Updation Rule:** Domes can be attached, detached, or modified during both initial booking **creation** and post-confirmation **updation**. When an Event Hall's date or timings are modified, all attached Domes automatically sync and mirror the Hall's new hours.
  - **Scope-Based Recalculation (Headcount Increases, Time & Slot Extensions):**
    - **Baseline Scope Preservation:** The amount collected for the original contracted event (agreed slot hours and initial headcount slab) is permanently locked to the tariff in effect when the booking was created (`BookingUnit.bookedBaseRate`, `bookedMinHeadcount`, `bookedMaxHeadcount`).
    - **Headcount Slab Expansion (The Apples-to-Apples Algebraic Floor):**
      - **Within Original Slab:** If the organizer adjusts headcount within the boundaries of the original booked slab ($\text{bookedMinHeadcount} \le \text{Headcount} \le \text{bookedMaxHeadcount}$), the rent charge remains strictly unchanged.
      - **Crossing to a Higher Slab:** To prevent negative-discounts if overall active prices drop, the system isolates the upgrade cost by comparing values strictly within the *same* active tariff version with a mathematical floor:
        $$\text{Incremental Charge} = \max(0, \text{ActiveRate}(\text{New Higher Slab}) - \text{ActiveRate}(\text{Original Booked Capacity}))$$
        *(Note: `ActiveRate(Original Booked Capacity)` is found by evaluating the booking's `bookedMaxHeadcount` against the current active Price List, ensuring the math works even if historical slab boundaries were changed).*
    - **Time Extensions vs. Shortening (Flat Baseline Blocks):**
      - **Extra Hours:** If the event runs beyond standard slot hours, extra hours are billed using the **new active hourly tariff**.
      - **Shortened Hours:** Standard slot packages (e.g., MORNING_SLOT 10 AM - 3 PM) are billed as **flat baseline blocks**. Shortening the fractional hours for operational reasons (e.g., 11 AM - 3 PM) does *not* reduce the baseline rent charge.
    - **Scope Reductions & Dropped Slots (Partial Cancellations):**
      - **Universal Reduction Rule:** Any reduction in scope—whether dropping to a lower headcount slab, cancelling a day/night, or dropping an entirely distinct add-on slot (e.g., cancelling an attached Evening Slot)—acts strictly as a **Partial Cancellation**.
      - The system does *not* auto-refund reductions. The original rent charge remains locked, and the Admin must manually override the `rentCharge` or apply a negative adjustment line item to enforce the property's specific cancellation penalty.
    - **Grandfathering Orphaned Capacities (Date Shifts):**
      - If a Hall Price List is downsized (e.g. from 1200 Pax to 800 Pax max), existing 1,000 Pax bookings are preserved via their immutable financial snapshots.
      - If the Admin shifts the event date to January, the system evaluates the new calendar dates against the current active weekend/seasonal modifiers and applies them mathematically against the grandfathered `bookedBaseRate`.
      - **Strict Block on Upward Headcount Mutations:** While date shifts are permitted, attempting to *increase* the headcount on this grandfathered booking (e.g. 1000 to 1100 Pax) is mathematically blocked because no matching active slab exists.
    - **Automated Recalculation Formula & Admin Prompt:**
      The UI computes the transparent hybrid total:
      $$\text{New Rent Charge} = \text{Original Venue Rent (Baseline Scope)} + \text{Incremental Charge}$$
      The UI alerts the Admin with the exact breakdown:
      - *"Baseline Venue Fee: ₹X,XXX (Agreed tariff preserved)"*
      - *"Incremental Expansion (+Higher Slab / +Extra Hours / +Additional Slot): +₹Y,YYY (Calculated at current active tariff)"*
      - Options: **"Apply Recalculated Rent (₹Z,ZZZ)"** OR **"Keep Custom Rent (₹W,WWW)"** (giving Admin full override power).
  - **Multi-Admin Optimistic Concurrency Control (Booking Mutations):** All Hall booking mutations (dates, slot hours, headcount, attached Domes, rent charges, line items, payments, status changes, and cancellations) strictly enforce Optimistic Concurrency Control (OCC) using `expectedUpdatedAt`. Concurrent edits by another Admin reject with HTTP `409 Conflict` (error code: `BOOKING_STALE_RECORD`). The UI alerts: *"Conflict: This booking was modified by another Admin. Please refresh to view the latest details."*
- There is no hardcoded limit on how many domes can be attached; this is left to Admin discretion.
- **Pre-Attachment Availability Verification:**
  - Before attaching any Dome to a Hall booking, the Admin UI dynamically queries the backend and displays the real-time availability of every Dome for that exact slot/time window (e.g. 10:00 AM – 3:00 PM for `MORNING_SLOT` or 5:00 PM – 10:00 PM for `EVENING_SLOT`).
  - **Visual Status Badges:** Domes are clearly marked as **Available** (free to attach) or **Unavailable** (colliding with an existing reservation, e.g. *"Booked by #B042 Anand P (Overnight: 12:00 PM – 11:00 AM)"*).
  - This prevents Admin trial-and-error by exposing conflicts upfront before form submission.
- **Dynamic Pricing:** The Admin can dynamically assign a custom price (e.g., ₹0 for fully complimentary, or a discounted rate like ₹2500) for the attached Dome, which is bundled into the Hall's `rent_charge`. The Dome booking itself is strictly recorded as ₹0 in the database.
- **Calendar & Overlap Rules:**
  - **Exact Hour Booking:** When a Dome is attached to an Event Hall booking, its `start_datetime` and `end_datetime` **strictly mirror the Event Hall's hours** (e.g., 10:00 AM to 3:00 PM for `MORNING_SLOT` or 5:00 PM to 10:00 PM for `EVENING_SLOT`). It does not block the entire day.
  - **The Default System Block & Exclusion Violation Handling:**
    - If a Dome has an overnight guest leaving at standard 11:00 AM or arriving at standard 12:00 PM, attaching it to a conflicting Hall booking or rescheduling an existing event triggers a PostgreSQL GiST constraint violation (`23P01 exclusion_violation`).
    - The backend explicitly catches `23P01` (or Prisma `P2002` GiST constraint target) and returns a distinct HTTP `409 Conflict` with error code `UNIT_SCHEDULE_COLLISION`.
    - **Distinct UI Feedback:**
      - When attaching a conflicting Dome: *"Cannot attach Dome [X]: Collides with reservation #[ID] ([Guest Name], [Start Time] – [End Time])."*
      - When rescheduling an Event Hall with attached Domes: *"Cannot reschedule: Attached Dome [X] is already booked on the new date."*
      - (This avoids misleading Admins with generic "modified by another Admin" OCC alerts).
  - **The Admin Override (Flexibility):** If the Admin negotiates adjusted timings with the guest (e.g., outgoing guest agrees to check out by 9:00 AM, or incoming guest agrees to check in at 4:00 PM), the Admin opens the overnight booking via Post-Confirmation Edits, updates the check-out/check-in time, and saves it. Once the timeline is cleared, the system allows attaching the Dome to the Hall booking.
  - **Automatic Release (Explicit Database Transaction):** If the Hall booking is cancelled (`status = 'CANCELLED'`), the cancellation logic **must explicitly run an atomic database transaction** updating the parent booking and all attached child Domes (`BookingUnit` records where `parentBookingId == id`) to `status = 'CANCELLED'`, instantly freeing the rooms back to general room inventory.

### Add-ons & Adjustments (Receipt Generation ONLY)

- **Total Billed Amount (Venue Rent Only):** The total billed amount tracked in system and dashboard metrics is **Hall Rent only** (matched slab rate with applicable weekend/seasonal `+-%` variance). By default, this is calculated by the system against the booking, and the Admin can manually edit/override the rent charge.
- **Unit Price Floor Guard:** `BookingUnit.unitPrice` is protected at the database level by a CHECK constraint (`chk_booking_unit_price` ensuring `unitPrice >= 0`) to prevent accidental negative tariffs.
- **Extra Charges & Manual Line Items (No Product Catalog):**
  - To save development time, do not build a pre-configured product catalog (e.g., no database tables for Waste Management, Massage Chair, Coffee Machine, or damage fees).
  - Instead, use the dynamic "Add Line Item" tool on the booking page. The Admin can manually type a description and an amount (e.g., Description: "Waste Management", Amount: ₹1200 | Description: "Massage Chair", Amount: ₹500).
  - **Strict Scope Rule:** Extra charges are added **strictly for receipt generation purposes**. Extra charges are **NEVER tracked as billed or paid in dashboard metrics or revenue analytics**.
  - These entries are saved as a lightweight `JSONB` array tied to the booking (`receipt_line_items`).
- **Receipt Generation & Checkout Settlement:**
  - **Receipt Generation:** Receipts are generated strictly **after payment is done and verified**. Admin clicks "Print Receipt" which itemizes the agreed Hall Rent Charge, all Manual Line Items (activities, cleaning, damages), Total Amount Paid, and confirms a ₹0 Final Balance Due.
  - **Zero Balance Due Invariant for Checkout:** When the booking duration concludes (MORNING_SLOT at 3:00 PM or EVENING_SLOT at 10:00 PM), the booking **strictly cannot be marked as `Checked-Out` unless the Final Balance Due is ₹0** (`(Rent Charge + Receipt Line Items) - Total Paid = 0`). All calculations enforce explicit integer rounding (`Math.round()` to nearest Rupee) with an epsilon check (`Math.abs(balance) < 1`) to eliminate floating-point precision artifacts. If a customer negotiated not to pay an extra charge or a fee is waived, the Admin can reduce the balance by adjusting extra charges (deleting or entering negative adjustment line items) or editing the rent charge directly so the balance reaches ₹0 before check-out is permitted.

*(Note: Everything else like tables, standard chairs, generator, and water are included in the base rate. Swimming pool access is strictly excluded for event attendees).*

### Hall Advance Payments & Cancellations

- **Advance Payment Rule:** The booking advance is strictly a non-refundable upfront payment credited directly towards the event slab rent (not returned after the event concludes; security deposits are strictly NOT tracked or collected). The advance amount for each Event Hall booking can be entered/adjusted dynamically by the Admin when creating or modifying the reservation.
- **Cancellations & Refunds (Explicit Database Transaction):**
  - Admin can cancel an Event Hall booking at **any time**.
  - Admin enters a custom "Refund Amount" ($0 \le \text{Refund Amount} \le \text{Total Paid}$) and a cancellation reason. The refund cannot exceed the total amount collected.
  - **Automatic Net Revenue Recalculation:** The PostgreSQL trigger `trigger_calculate_net_revenue` automatically recomputes `Booking.netRevenue = totalPaid - refundAmount` on insert or update, relieving application code of manual revenue calculations.
  - Cancelling the Hall booking automatically initiates an **explicit database transaction** updating the parent booking and all child/attached Domes (`BookingUnit` records where `parentBookingId == id`) to `status = 'CANCELLED'`, releasing the inventory back to the public room calendar.

### Seasonal & Weekend Pricing (Price Modifiers on Slabs)

- Just like Domes and A-Frames, Event Halls support **both Seasonal and Weekend pricing variation** using Admin-defined percentage modifiers (`+-%`).
- **Weekend Definition (IST-Aware):** For Event Halls (`MORNING_SLOT` and `EVENING_SLOT`), Saturday and Sunday are weekend days. All calendar date evaluations and day-of-week checks are calculated strictly in **Asia/Kolkata (IST)**.
- **Strict Date Range Requirement for ALL Modifiers:** Both `WEEKEND` and `SEASONAL` modifiers strictly require explicit date ranges (`startDate` IS NOT NULL, `endDate` IS NOT NULL, and `endDate >= startDate`). Weekend modifiers are bound to operational seasons or validity periods rather than indefinite dates, preventing unmonitored indefinite surcharges and enabling audit freezing once expired. Enforced in PostgreSQL via `CONSTRAINT "chk_pricemodifier_dates" CHECK ("startDate" IS NOT NULL AND "endDate" IS NOT NULL AND "endDate" >= "startDate")`.
- **Weekend Pricing:** A percentage variance (`+-%`) is configured for weekend bookings (Sat/Sun) active across the modifier's date range. The website and booking engine automatically apply this `+-%` variance across **all slab rates** for that venue.
- **Seasonal Promotions:** Admin can schedule seasonal promotions with a `+-%` percentage modifier over a date range (`End Date >= Start Date`). The percentage modifier applies mathematically across all slab rates for the venue during that period.
- **Percentage Bounds Safeguard:** Percentage modifier values must fall within the range:
  $$-80\% \le \text{percentage} \le +200\%$$
  (Strictly prevents extreme negative discount exploits or zero-rent corruptions).
- **Timeline Constraints (Lock Past Dates):**
  - **Expired Modifiers:** Once a modifier's `endDate` has passed in `Asia/Kolkata` (`endDate < today`), it is permanently locked (read-only) for historical audit preservation.
  - **Active Modifiers:** Promotions currently underway (`startDate <= today <= endDate`) can have their future `endDate` extended/shortened and `percentage` updated, but their past `startDate` strictly cannot be modified.
- **Overlap Rule (Different Types):** If a weekend falls inside an active Seasonal Promotion, the **Weekend variance strictly overrides** the Seasonal variance for Sat/Sun (Weekend has higher priority).
- **Priority & Conflict Resolution (Highest Yield Rule):** If multiple seasonal modifiers overlap, or multiple weekend modifiers overlap, the system resolves them by always picking the modifier that results in the **highest final price** for the resort. For example:
  - **Two Hikes (+50% vs +20%):** It picks +50% (Maximized revenue).
  - **Two Discounts (-10% vs -30%):** It picks -10% (Minimizes the loss, resulting in a higher final price).
  - **Hike vs Discount (+20% vs -10%):** It picks the +20% hike (Maximized revenue).
- **Post-Save Editing & Attachment Integrity:**
  - **In-Place Atomic Updates:** Admins can edit saved Event Hall Price Lists (slabs, base rates, deposits, max capacity) and Price Modifiers even when actively attached to hall venues. All slab replacements run atomically within a `prisma.$transaction` (`deleteMany` + `createMany`), guaranteeing zero intermediate downtime where the pricing engine encounters 0 slabs.
  - **Booking Financial Decoupling (Snapshotting):** Existing confirmed bookings store immutable financial snapshots (`Booking.rentCharge`, `BookingUnit.unitPrice`, and `BookingUnit.bookedBaseRate`). Existing bookings **never** dynamically query the `PriceList` or `PriceSlab` tables for historical events, insulating 30-day revenue analytics and folios from future catalogue edits.
  - **Hard Physical Capacity Guardrail:** Updating a Hall Price List's `maxGuestCapacity` or any slab's `maxHeadcount` beyond the physical capacity of any currently attached venue (1,200 Pax for Non-AC Hall, 2,000 Pax for AC Hall) is strictly rejected with a `400 Bad Request` listing the conflicting venue.
  - **Multi-Admin Optimistic Concurrency Control:** Price list and modifier edits require the client's `expectedUpdatedAt` timestamp. If another Admin updated the record concurrently, the save is rejected with an HTTP `409 Conflict`, prompting the Admin to refresh.
  - **Audit Logging:** Every price list or modifier update creates an immutable `AuditLog` entry capturing `action: "UPDATE_PRICE_LIST" | "UPDATE_PRICE_MODIFIER"`, `modifiedBy`, `oldValue`, and `newValue`.
  - **Deletion Safeguard:** While in-place editing is supported, **deleting** an Event Hall Price List remains strictly restricted (`onDelete: Restrict`) if attached to any active or inactive hall.

---

## 3. Scoped-Out Features (Do Not Build Dedicated UIs for These)

- **Damage/Penalty Tracking:** Do not build a separate system to calculate "Chair damage (₹450/chair)" or "Party Blaster Cleaning (₹2000)".
  - **Solution:** Use the **"Add Line Item"** tool mentioned above to manually add these charges before generating the final bill.
- **Tollman Tracking:** Do not build a staff-assignment feature for the Tollman (required for 100+ guests). Just add it as a text note on the receipt.
- **Food/Catering:** Do not build a catering menu system. The resort outsources this. Use the generic "Custom Bill Adjustments" field for any food totals.

---

## 4. General Core Requirements (Retained from Previous)

- **Authentication:** 3 Admin accounts, seeded in the database. No staff/guest roles.
- **Dashboard:** 30-day Revenue calculated as $\text{Total 30-Day Revenue} = \sum_{\text{Active}} \text{rent\_charge} + \sum_{\text{Cancelled}} (\text{total\_paid} - \text{refund\_amount})$ (automatically kept consistent by the PostgreSQL `BEFORE INSERT OR UPDATE` trigger on `Booking.netRevenue`; extra charges excluded from rent analytics), Today's Check-ins/outs, Resident Guests (strictly filtered by `stayType = 'OVERNIGHT'` across Domes/A-Frames), and Event Attendees broken down by Hall and Booking Mode (e.g., Non-AC Hall MORNING_SLOT / EVENING_SLOT, AC Hall MORNING_SLOT / EVENING_SLOT).
- **Booking Management (Domes):**
  - Manual entry (from WhatsApp flow).
  - Multi-unit support (Dome 1 + A-Frame 1 on one bill).
  - Full post-confirmation edit powers (swap rooms, change dates).
- **Cancellation Policy (Domes):** Soft delete method. Admin manually calculates and inputs the refund amount and reason to keep revenue analytics accurate.
- **Dynamic Unit Capacity Setup:** Max capacity is defined dynamically by the Admin when creating/editing units (Default seed: Domes = 3, A-Frames = 5, Non-AC Hall = 1200, AC Hall = 2000). Amenities configured via Admin checkboxes (with tea, water, and toiletries hardcoded as standard).

---

## Architectural Advice for the Database

To handle the time-slot vs. nightly difference smoothly in your database, use `start_datetime` and `end_datetime` in your `BookingUnit` table (`startDatetime` and `endDatetime` in Prisma) instead of just `check_in_date` and `check_out_date`.

- **An OVERNIGHT booking (Domes / A-Frames) becomes:** `2026-10-14 12:00:00` to `2026-10-15 11:00:00`.
- **A DAY_SLOT booking (Domes / A-Frames) becomes:** `2026-10-14 10:00:00` to `2026-10-14 15:00:00`.
- **A MORNING_SLOT booking (Event Halls) becomes:** `2026-10-14 10:00:00` to `2026-10-14 15:00:00`.
- **An EVENING_SLOT booking (Event Halls) becomes:** `2026-10-14 17:00:00` to `2026-10-14 22:00:00`.

This allows a single PostgreSQL query and a GiST exclusion constraint (`EXCLUDE USING gist ("unitId" WITH =, tstzrange("startDatetime", "endDatetime") WITH &&) WHERE (status NOT IN ('CANCELLED'))`) to easily check for time overlaps regardless of whether the unit is a Dome or a Hall!
