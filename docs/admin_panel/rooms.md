# Rooms & Bookings - Complete Specification

## 1. Authentication & Users

- **Access:** Strictly internal. Maximum 3 Admin accounts (seeded directly into the database with hashed passwords; no "Create User" UI needed to save time).
- **Roles:** All Admins have full access. No staff, housekeeping, or customer accounts.

## 2. Dashboard & Analytics

- **Metrics Cards & Denormalized Revenue Tracking:**
  - **Total Revenue (Last 30 Days):** Revenue tracking captures active stay rent plus non-refundable retained fees from cancellations, calculated as:
    $$\text{Total 30-Day Revenue} = \sum_{\text{Active}} \text{rent\_charge} + \sum_{\text{Cancelled}} (\text{total\_paid} - \text{refund\_amount})$$
    This guarantees that retained cancellation income is never lost from financial metrics. Extra charges / line items are strictly for receipt generation and excluded from dashboard rent analytics.
  - **Database Trigger for Net Revenue (`netRevenue`):** The `netRevenue` field (`totalPaid - COALESCE(refundAmount, 0)`) is automatically calculated and maintained directly by a PostgreSQL `BEFORE INSERT OR UPDATE` trigger (`trigger_calculate_net_revenue`). Next.js Server Actions and Prisma do not need to manually compute this value, eliminating synchronization bugs and guaranteeing financial consistency even during concurrent updates or manual cancellations.
  - **Today's Check-ins & Today's Check-outs.**
  - **Resident Guests (Overnight):** Total count of currently checked-in overnight guests. **Strictly filters by `stayType = 'OVERNIGHT'`** across Domes and A-Frames (excludes staff, day slots, and daytime Event Hall guests resting in attached complimentary Domes) to accurately reflect overnight stay and pool capacity.
  - **Event Attendees (By Hall & Slot):**
    - **Non-AC Hall:** Morning Slot (10:00 AM – 3:00 PM) Headcount & Evening Slot (5:00 PM – 10:00 PM) Headcount.
    - **AC Hall:** Morning Slot (10:00 AM – 3:00 PM) Headcount & Evening Slot (5:00 PM – 10:00 PM) Headcount.
      _(This detailed separation ensures the Admin knows exactly how many visitors to expect per venue and per operational shift, helping with parking, crowd control, and staff management)._
- **"Live-Feel" Updates (Optimized Fetching):** To protect backend performance and hit the 5-day deadline, avoid aggressive HTTP polling and complex WebSockets.
  - Use a smart data-fetching library (e.g., React Query or SWR).
  - Enable **Refetch on Window Focus** so the calendar and metrics instantly update whenever the Admin switches back to the dashboard tab from WhatsApp.
  - Implement a **relaxed background polling interval** (e.g., 30 seconds) to catch updates from other Admins without thrashing the database with aggregate queries.
  - Use **cache invalidation** to instantly update the UI when the active Admin performs an action (Create/Edit/Cancel).
- **Operational Alerts:** Highlight bookings arriving today where the collected amount (`advance_paid`) is less than the `required_advance` that was captured from the Unit or Hall Slab at the time of booking.

## 3. Booking Management (The Core Engine)

- **Booking Creation (Manual):** Admins manually enter bookings finalized via WhatsApp.
  - **Preset & Flexible Durations:** Quick preset buttons for **Overnight Stay (12:00 PM – 11:00 AM)** and **Day Slot (10:00 AM – 3:00 PM)**, plus custom time inputs for Admin overrides.
- **Multi-Unit Support ("OYO-Style"):** A single booking ID (e.g., #B001) can contain multiple units (e.g., Dome 1 + A-Frame 2).
- **Post-Confirmation Edits:** Admins have full power to modify a confirmed booking:
  - Change check-in / check-out dates and exact times (defaults to 12:00 PM / 11:00 AM for overnight; editable down to specific hours, e.g., 9:00 AM checkout or 4:00 PM check-in, to clear overlaps for hall event bundles).
  - **Date, Time & Slot Changes (Scope-Based Recalculation):**
    - **Baseline Scope Preservation (Contracted Dates & Hours):** The amount collected for the original contracted stay is permanently locked to the tariff in effect when the booking was created (`BookingUnit.bookedBaseRate`). Confirmed nights and standard hours never suffer retroactive rate hikes.
    - **Incremental Scope Expansion (New Active Tariff Rule):** 
      1. **Extra Nights (Stay Extension):** Additional nights are priced dynamically using the **new active Price List** currently in effect.
      2. **Time Extension (Extra Hours / Early Check-In / Late Check-Out):** Additional hours extended beyond standard preset timings are calculated against the **new active hourly tariff**.
      3. **Additional Day Slot:** Calculated strictly using the **new active Price List's Day Slot rate**.
    - **Trimming Hours vs. Dropped Slots:**
      - **Shortened Fractional Hours:** Standard preset packages (Overnight 12 PM - 11 AM, Day Slot 10 AM - 3 PM) are billed as **flat baseline blocks**. Shortening the check-in/out hours (e.g. 4 PM check-in or 9 AM check-out) to clear overlaps does *not* reduce the baseline rent charge.
    - **Scope Reductions (Partial Cancellations):**
      - **Universal Reduction Rule:** If a guest reduces their scope (e.g., dropping a night from a 3-night stay, or completely dropping a discrete Day Slot add-on), it acts strictly as a **Partial Cancellation**. The system does *not* auto-refund reductions. The Admin must manually override the `rentCharge` or apply an adjustment line item to enforce the property's cancellation penalty.
    - **Automated Recalculation Formula & Admin Prompt:**
      The UI automatically computes the hybrid total:
      $$\text{New Rent Charge} = \text{Original Rent (Baseline Scope)} + \text{Incremental Charges (Current Active Price List)}$$
      The UI prompts the Admin with the exact transparent breakdown:
      - *"Baseline Stay: ₹X,XXX (Agreed tariff preserved)"*
      - *"Extension (+N nights / +H hours / +Day Slot): +₹Y,YYY (Calculated at current active tariff)"*
      - Options: **"Apply Recalculated Rent (₹Z,ZZZ)"** OR **"Keep Custom Rent (₹W,WWW)"** (allowing Admin manual overrides if a special courtesy is granted).
  - Swap assigned units (e.g., move a guest from Dome 2 to A-Frame 1 based on availability).
  - Update guest details (Name, Phone, Notes).
- **Guest Database (CRM Approach):** To meet the 5-day deadline, there is no separate relational `Customers` table. Guest details (Name, Phone, Email) are saved as simple flat text columns directly in the `Bookings` table. If a guest returns, the Admin simply re-types their name.
- **Status Flow:** Confirmed ➔ Checked-In ➔ Checked-Out.
  - **No Pending Status:** Since bookings are manually created in the Admin Panel *after* the booking advance payment is successfully collected via WhatsApp, they are instantly recorded as `Confirmed`.
  - **Zero Balance Due Invariant for Checkout:** A booking **strictly cannot be marked as `Checked-Out` unless the Final Balance Due is ₹0**. The final balance is calculated as `(Rent Charge + Receipt Line Items) - Total Paid`. All currency math enforces explicit integer rounding (`Math.round()` to nearest Rupee) with an epsilon check (`Math.abs(balance) < 1`) to prevent floating-point precision artifacts (e.g. `0.000000000001`) from blocking checkout. If a customer negotiates not to pay a charge or an extra fee is waived, the Admin can reduce the balance by adjusting extra charges or editing the rent charge directly so the balance reaches ₹0 before check-out is permitted. The UI disables the "Check Out" button and displays an alert: *"Cannot check out: Outstanding balance of ₹X,XXX must be collected or adjusted to ₹0 first."*
- **Multi-Admin Optimistic Concurrency Control (All Booking Mutations):**
  - All booking mutations (editing dates/times, swapping assigned units, updating guest details, editing rent charges, adding/adjusting line items, recording payments, status transitions, and cancellations) **strictly enforce Optimistic Concurrency Control (OCC)** using the record's `expectedUpdatedAt` timestamp.
  - If another Admin has updated the booking concurrently (`booking.updatedAt > expectedUpdatedAt`), the mutation is rejected with an HTTP `409 Conflict` (error code: `BOOKING_STALE_RECORD`).
  - This strictly eliminates "Last Write Wins" race conditions (e.g., Admin B overwriting a payment recorded milliseconds earlier by Admin A).
  - The UI alerts the Admin: *"Conflict: This booking was modified by another Admin. Please refresh to view the latest details."*
- **Cancellations (Soft Delete & Explicit Transaction):** Cancelled bookings are removed from the calendar but retained in the database (`status = 'CANCELLED'`).
  - **Refund UI:** The Admin can cancel at any time and enter a custom "Refund Amount" ($0 \le \text{Refund Amount} \le \text{Total Paid}$) and a "Reason" to balance revenue analytics. Refund cannot exceed the total amount paid. When updated, the database trigger `trigger_calculate_net_revenue` automatically recomputes `Booking.netRevenue = totalPaid - refundAmount` at the PostgreSQL level.
  - **Explicit Database Transaction Cascading:** Because cancellations are soft-deletes (`status = 'CANCELLED'`), database FK `onDelete: Cascade` does not trigger on status updates. The cancellation mutation **must explicitly run an atomic database transaction** updating the parent booking and all child/bundled bookings (`BookingUnit` records where `parentBookingId == id`) to `status = 'CANCELLED'` to guarantee that attached inventory is instantly released.
- **List View & Search:** A table of all bookings. Searchable by Guest Name, Phone, Email, and Status. Filterable by Check-in Date, Check-out Date, and Specific Unit (e.g., "Dome 3"). Clicking a row opens the full booking details.

## 4. Inventory & Unit Management

- **Unit Setup & Dynamic Capacity:**
  - **Dynamic Max Capacity:** When creating or editing any unit (Dome, A-Frame, or Hall), the Admin explicitly inputs the **Max Capacity** (Adults) and **Max Infants**. (Initial defaults: Domes = 3 Adults / 2 Infants, A-Frames = 5 Adults / 4 Infants, Non-AC Hall = 1200, AC Hall = 2000).
  - **Domes (4 units):** Dome 1, Dome 2, Dome 3, Dome 4 (Default Capacity: 3 adults. Infants strictly capped at 2).
  - **A-Frames (3 units):** A-Frame 1, A-Frame 2, A-Frame 3 (Default Capacity: 5 adults. Infants strictly capped at 4). _(Built to support adding 3 upcoming A-Frames dynamically)._
  - **Event Hall:**
    - **Non-AC Hall** (Default Capacity: 1200) - Set to **Active**.
    - **AC Hall** (Default Capacity: 2000) - Set to **Inactive** _(under construction; accommodated in DB for future)_.
    - Separate booking flow. No swimming pool access included for event attendees.
- **Strict Cap (No Extra Beds):** The unit's capacity is strictly capped at its configured Max Capacity.
- **Unit Status & Pre-Deactivation Guard:**
  - Admin can toggle units as **Active** or **Inactive** (Inactive units show as "Sold Out" on the public website).
  - **Mandatory Pre-Deactivation Future Booking Check:** Before toggling any unit to `Inactive`, the system strictly executes a database validation query checking for existing future active bookings (`endDatetime >= NOW()` AND `status NOT IN ('CANCELLED')`).
  - **Blocking Guardrail:** If any future active bookings exist, the deactivation request is strictly blocked with an HTTP `400 Bad Request` (error code: `UNIT_HAS_FUTURE_BOOKINGS`) returning the count, booking IDs, and scheduled dates.
  - The UI displays an informative blocking alert: *"Cannot deactivate unit: [Unit Name] has [N] future confirmed booking(s). Please reassign these guests to other rooms first."*
- **Mandatory Price List Attachment:**
  - When creating or editing any unit (Dome, A-Frame, or Hall), the Admin **must mandatorily attach a Price List (Rate Plan)** selected from a dropdown.
  - **Dropdown Filtering:** The dropdown dynamically filters to show only Price Lists matching the unit's category (e.g., only Dome price lists appear when configuring a Dome).
  - **Capacity Safeguard Validation:** The system strictly validates:
    $$\text{PriceList.MaxGuestCapacity} \le \text{Unit.PhysicalCapacity}$$
    (Prevents assigning a rate plan designed for more guests than the unit's physical limit).
  - **Dynamic Booking Advance & Pricing:** The required booking advance and base rates/slabs are determined directly by the attached Price List (dynamically configured per slab by the Admin when creating the price list; not hardcoded). The advance is a non-refundable upfront payment credited directly towards total unit rent (security deposits are strictly NOT tracked or collected).
- **Amenities Configuration:** Selectable checkboxes per unit:
  - **Variable:** Private Pool, AC, Wi-Fi, Smart TV, Bluetooth speaker, Common Refrigerator, UPS, Attached Bathroom, Bed Type (Double / Queen). _(Note: A-Frames include BOTH Double and Queen beds)._
  - **Standard (Hardcoded on frontend for all):** Electric Kettle with Tea/Coffee kit, 1L Mineral Water, Toiletries, BBQ Grill Setup.
- **Date Blocking (Maintenance & Buyouts):** Admin can block out dates for maintenance or resort buyouts. Maintenance blocks are **inserted directly into `BookingUnit` with `status: 'MAINTENANCE_BLOCKED'`** across the specified time window. Because `BookingUnit` is guarded by the database GiST exclusion constraint (`status NOT IN ('CANCELLED')`), PostgreSQL natively rejects any concurrent booking attempts on maintenance-blocked dates at the kernel level.
- **Media & Photo Management (Per Unit):**
  - **Strict Upload Limit:** 3MB maximum per image file. Client-side validation immediately rejects files exceeding 3MB with a clear user warning.
  - **Sequential Upload Queue:** Parallel multi-image uploads are strictly forbidden. Images must be processed and uploaded sequentially (one at a time) with a progress bar to prevent serverless memory spikes and timeout errors.
  - **Automated Resizing & Optimization:** The system auto-generates lightweight mobile and thumbnail dimensions for instant public website loading.
  - **Drag-and-Drop Reordering:** Admin can drag and drop uploaded image tiles to control the exact display sequence in the public website gallery.
  - **"Featured" Photo Badge & Lifecycle (Strict Exclusivity):** Admin can mark a primary photo as "Featured", designating it as the main card thumbnail and WhatsApp OpenGraph preview image. Because Prisma's migration engine does not support partial unique indexes with `WHERE` clauses, the rule of "at least one and exactly one featured photo per unit" is strictly enforced in the application layer (Next.js Server Actions) across the entire photo lifecycle:
    1. **First Upload:** If a unit has 0 existing photos, the first uploaded photo is automatically marked `isFeatured: true`.
    2. **Subsequent Uploads:** All subsequent photo uploads default to `isFeatured: false`.
    3. **Switching Featured:** Marking another photo as featured runs inside an atomic `prisma.$transaction` (setting `isFeatured: false` for all photos of that unit, then `isFeatured: true` for the target photo).
    4. **Deletion Auto-Promotion:** When deleting a photo, if the photo being deleted is `isFeatured: true`, the system automatically promotes the remaining photo with the lowest `orderIndex` to `isFeatured: true` within an atomic transaction. This guarantees every unit with photos always has exactly one featured cover photo.
  - **SEO & Accessibility Metadata:** Input fields for Caption, Alt Text, and Image Description while uploading or editing photos.
  - **Deletion Safeguard:** A mandatory confirmation modal ("Are you sure you want to delete this photo?") prevents accidental permanent deletion.

## 5. Pricing Lists & Promotions Engine

- **Price & Offer Groups:** Grouped by `Unit Type` (Dome, A-Frame, Non-AC Hall, AC Hall) and `Max Guest Capacity` (> 1) for managing promotional tiers.
- **Centralized Price Lists:**
  - **Unique Profile Name:** Each Price List is created with a unique descriptive name (e.g., "Standard Dome - 2 Pax Plan", "Family Dome - 4 Pax Premium") converted to a slug in the database for uniqueness.
  - **Unit Type & Max Guest Capacity:** Specifies compatible category and maximum allowed guests.
  - **Mandatory Slot Types Rule:** Every Price List for Domes & A-Frames must define valid, contiguous slabs for **both** required slot types: **Overnight Stay (12:00 PM – 11:00 AM)** and **Day Slot (10:00 AM – 3:00 PM)**.
  - **Contiguous Slabs & Bounds Rule (Zod `superRefine` Validation):**
    - Because relational databases cannot natively enforce cross-row gapless contiguous ranges without complex deferred triggers, this rule is strictly validated at the application layer via Zod `superRefine` in Next.js Server Actions prior to executing database transactions:
      - The array of slabs is sorted ascending by `minHeadcount`.
      - The lowest slab must start at `minHeadcount === 1`.
      - Headcount ranges must be contiguous without gaps or overlaps (`slabs[i].minHeadcount === slabs[i - 1].maxHeadcount + 1`).
      - The highest slab's `maxHeadcount` strictly cannot exceed `PriceList.maxGuestCapacity`.
      - Base price must be $> ₹0$ and `requiredDeposit` must be between $₹0$ and `basePrice`.
    - Slab updates execute inside an atomic `prisma.$transaction` (`deleteMany` followed by `createMany`) so that 0-slab states or incomplete configurations are never visible to the system.
- **Multi-Night Stay Modifier Calculation:**
  - Evaluated **night-by-night**: For multi-night room stays, each individual night is priced independently based on its calendar date and whether it qualifies as a weekend or falls inside a seasonal promotion. Total stay rent is the exact sum of each night's rate.
- **Price Modifiers (Surge & Promotional Rates):**
  - **Weekend Definition (IST-Aware):**
    - **Overnight Stays (12:00 PM – 11:00 AM):** Friday night and Saturday night trigger the `WEEKEND` modifier (representing the standard resort getaway weekend).
    - **Day Slots (10:00 AM – 3:00 PM):** Saturday and Sunday daytime trigger the `WEEKEND` modifier.
    - All calendar dates and day-of-week checks are evaluated strictly against **Asia/Kolkata (IST)**.
  - **Strict Date Range Requirement for ALL Modifiers:** Both `WEEKEND` and `SEASONAL` modifiers strictly require explicit date ranges (`startDate` IS NOT NULL, `endDate` IS NOT NULL, and `endDate >= startDate`). Weekend modifiers are bound to operational seasons or validity windows rather than indefinite dates, preventing unmonitored indefinite surcharges and enabling audit freezing once expired. This is enforced at the database level via `CONSTRAINT "chk_pricemodifier_dates" CHECK ("startDate" IS NOT NULL AND "endDate" IS NOT NULL AND "endDate" >= "startDate")`.
  - **Weekend Rates:** Configured as a percentage variance (`+-%`) applied to the rates of the attached price list across the modifier's active date range.
  - **Seasonal Promotions (Date Range):** Percentage modifier (`+-%`) active across a specified date range (`End Date >= Start Date`).
  - **Percentage Bounds Safeguard:** Percentage modifier values must fall within the range:
    $$-80\% \le \text{percentage} \le +200\%$$
    (Strictly prevents extreme negative discount exploits or zero-rent corruptions).
  - **Timeline Constraints (Lock Past Dates):**
    - **Expired Modifiers:** Once a modifier's `endDate` has passed in `Asia/Kolkata` (`endDate < today`), it is permanently locked (read-only) for historical audit preservation.
    - **Active Modifiers:** Promotions currently underway (`startDate <= today <= endDate`) can have their future `endDate` extended/shortened and `percentage` updated, but their past `startDate` strictly cannot be modified.
  - **Overlap Hierarchy (Different Types):** If a weekend falls inside an active Seasonal Promotion, the **Weekend variance strictly overrides** the Seasonal variance (Weekend has higher priority).
  - **Same-Type Modifier Resolution (Highest Yield Rule):** If multiple seasonal modifiers overlap, or multiple weekend modifiers overlap, the system resolves them by always picking the modifier that results in the **highest final price** for the resort. For example:
    - **Two Hikes (+50% vs +20%):** It picks +50% (Maximized revenue).
    - **Two Discounts (-10% vs -30%):** It picks -10% (Minimizes the loss, resulting in a higher final price).
    - **Hike vs Discount (+20% vs -10%):** It picks the +20% hike (Maximized revenue).
- **Strict Room Occupancy Validation & Age Thresholds:**
  - **Age Thresholds:**
    - **Adult:** 3+ years
    - **Infant:** Under 3 years (sharing existing bed; no separate bedding provided)
  - Each room requires at least 1 adult.
  - Adults are strictly capped at 3 for Domes and 5 for A-Frames.
  - Infants are strictly capped at 2 for Domes and 4 for A-Frames.
  - Strictly NO extra beds provided.
- **Post-Save Editing & Attachment Integrity:**
  - **In-Place Atomic Updates:** Admins can edit saved Price Lists (slabs, base rates, deposits, max capacity) and Price Modifiers even when actively attached to units. All slab replacements run atomically within a `prisma.$transaction` (`deleteMany` + `createMany`), guaranteeing zero intermediate downtime where the pricing engine encounters 0 slabs.
  - **Booking Financial Decoupling (Snapshotting):** Existing confirmed bookings store immutable financial snapshots (`Booking.rentCharge`, `BookingUnit.unitPrice`, and `BookingUnit.bookedBaseRate`). Existing bookings **never** dynamically query the `PriceList` or `PriceSlab` tables for historical stays, insulating 30-day revenue analytics and folios from future catalogue edits.
  - **Hard Physical Capacity Guardrail:** Updating a Price List's `maxGuestCapacity` or any slab's `maxHeadcount` beyond the physical capacity of any currently attached unit is strictly rejected with a `400 Bad Request` listing the conflicting units (Admin must adjust unit physical capacities or detach the unit first).
  - **Multi-Admin Optimistic Concurrency Control:** Price list and modifier edits require the client's `expectedUpdatedAt` timestamp. If another Admin updated the record concurrently, the save is rejected with an HTTP `409 Conflict`, prompting the Admin to refresh.
  - **Audit Logging:** Every price list or modifier update creates an immutable `AuditLog` entry capturing `action: "UPDATE_PRICE_LIST" | "UPDATE_PRICE_MODIFIER"`, `modifiedBy`, `oldValue`, and `newValue`.
  - **Deletion Safeguard:** While in-place editing is supported, **deleting** a Price List remains strictly restricted (`onDelete: Restrict`) if attached to any units.

## 6. Billing & Folio (Add-ons)

- **Total Billed Amount (Rent Only):** The total billed amount tracked in the system is **Dome / Unit rent only** (`Base rate of unit × No of units × duration`). The system defaults this calculation upon booking creation, and the Admin can edit this rent charge at any time.
- **Unit Price Floor Guard:** `BookingUnit.unitPrice` is protected at the database level by a CHECK constraint (`chk_booking_unit_price` ensuring `unitPrice >= 0`) to prevent accidental negative unit tariffs from corrupting stay calculations.
- **Single Payment & Net Revenue Tracking:** Admin enters total money collected as a single numeric value (`Total Paid`). The denormalized field `Booking.netRevenue` is automatically computed and kept strictly synchronized by a PostgreSQL `BEFORE INSERT OR UPDATE` trigger (`trigger_calculate_net_revenue`: `NEW.netRevenue = NEW.totalPaid - COALESCE(NEW.refundAmount, 0)`), relieving application code of manual recomputation during payments or refunds.
- **Extra Charges & Manual Line Items (Receipt Generation ONLY):**
  - To save development time and avoid complex catalog models, extra charges (e.g., Food orders, Kayaking, damages) are added via a dynamic "Add Line Item" tool on the booking page.
  - **Strict Scope Rule:** Extra charges are added **strictly for receipt generation purposes**. Extra charges are **NEVER tracked as billed or paid in dashboard metrics or financial reporting**.
  - These entries are saved as a lightweight `JSONB` array tied to the booking (`receipt_line_items`).
- **Receipt Generation:** Receipt is generated strictly **after payment is done & verified**. Admin clicks "Print Receipt", which itemizes the agreed Rent Charge, all Manual Line Items (food, activities, damages/adjustments), the Total Amount Paid, and confirms a ₹0 Final Balance Due (with property rules attached).

## 7. Settings & Property Policies

- **Standard Timings:** Hardcoded for display: Check-in: 12:00 PM | Check-out: 11:00 AM.
- **Operational Notes (For Receipts/Staff):**
  - **Pool Rules & Event Privacy:**
    - **Standard Days:** Pool is open for Dome and A-Frame residents until 10:00 PM.
    - **Event Days:** Because the pool area is adjacent to the Event Hall, it is closed to swimming during event hours to ensure privacy. Event attendees are never permitted to swim. Dome and A-Frame residents will be granted exclusive late-night pool access from 10:00 PM to 11:00 PM after the event concludes.
- **Cancellation Policy Textbox:** A text area where the Admin can write/paste the official cancellation policy once the company finalizes it. This text will automatically render on the website footer and guest receipts.

## 8. Concurrency & Race Condition Handling (Database Level)

Because multiple Admins will input bookings concurrently from WhatsApp, the system is highly vulnerable to race conditions (e.g., two Admins booking Dome 2 at the exact same millisecond).

- **PostgreSQL Exclusion Constraints (Per-Unit):** The database handles all concurrency validation. A GiST Exclusion Constraint is applied to the `BookingUnit` junction table (`booking_units`) ensuring:
  ```sql
  EXCLUDE USING gist (
    "unitId" WITH =,
    tstzrange("startDatetime", "endDatetime") WITH &&
  )
  WHERE (status NOT IN ('CANCELLED'));
  ```
  The constraint **strictly uses `tstzrange`** (timestamp with time zone range) to ensure timezone conversions across UTC and Asia/Kolkata (IST) never shift range boundaries or cause false collisions/double-bookings.
- **No Automated Buffer System:** The system deliberately does not enforce automated turnover buffers or cleaning lockout periods. Admins manually adjust check-in/out hours as needed to fit operational turnover and room bundling, with the database GiST constraint guarding against real collisions.
- **Error Handling Flow (Exclusion Violations vs. OCC):**
  1. **PostgreSQL Exclusion Violations (`23P01 exclusion_violation`):**
     - If two transactions attempt to book or reschedule overlapping unit time ranges, PostgreSQL rejects the transaction at the kernel level with SQL state `23P01`.
     - The backend explicitly catches `23P01` (or Prisma error code `P2002` targeting the GiST exclusion constraint) and returns a distinct HTTP `409 Conflict` with error code `UNIT_SCHEDULE_COLLISION` containing the conflicting unit ID, unit name, and colliding time window.
     - **Specific UI Feedback:**
       - Direct room booking/rescheduling collision: *"Cannot save booking: [Unit Name] is already booked during this time window."*
       - Rescheduling with attached units (e.g. Hall with Domes): *"Cannot reschedule: Attached Dome [X] is already booked on the new date."*
  2. **Optimistic Concurrency Control (`expectedUpdatedAt`):**
     - If another Admin modified the booking record while it was open in the editor, the update fails OCC verification.
     - The backend returns an HTTP `409 Conflict` with error code `BOOKING_STALE_RECORD`.
     - **Specific UI Feedback:** *"Conflict: This booking was modified by another Admin. Please refresh to view the latest details."*
