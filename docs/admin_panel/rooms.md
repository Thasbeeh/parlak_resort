# Rooms & Bookings - Complete Specification

## 1. Authentication & Users

- **Access:** Strictly internal. Maximum 3 Admin accounts (seeded directly into the database with hashed passwords; no "Create User" UI needed to save time).
- **Roles:** All Admins have full access. No staff, housekeeping, or customer accounts.

## 2. Dashboard & Analytics

- **Metrics Cards & Denormalized Revenue Tracking:**
  - **Total Revenue (Last 30 Days):** To prevent database lag from complex on-the-fly math, the database will use a denormalized `net_revenue` column on the `Bookings` table. The backend will calculate and store the final amount (Base + Add-ons - Refunds) whenever a booking is saved/modified. The dashboard simply `SUM`s this single column.
  - **Today's Check-ins & Today's Check-outs.**
  - **Resident Guests (Overnight):** Total count of currently checked-in overnight guests (Strictly filters for Domes and A-Frames; excludes staff and daytime visitors to accurately reflect overnight pool/stay capacity).
  - **Event Attendees (By Hall & Slot):**
    - **Non-AC Hall:** Slot A (10:00 AM – 3:00 PM) Headcount & Slot B (5:00 PM – 10:00 PM) Headcount.
    - **AC Hall:** Slot A (10:00 AM – 3:00 PM) Headcount & Slot B (5:00 PM – 10:00 PM) Headcount.
      _(This detailed separation ensures the Admin knows exactly how many visitors to expect per venue and per operational shift, helping with parking, crowd control, and staff management)._
- **"Live-Feel" Updates (Optimized Fetching):** To protect backend performance and hit the 5-day deadline, avoid aggressive HTTP polling and complex WebSockets.
  - Use a smart data-fetching library (e.g., React Query or SWR).
  - Enable **Refetch on Window Focus** so the calendar and metrics instantly update whenever the Admin switches back to the dashboard tab from WhatsApp.
  - Implement a **relaxed background polling interval** (e.g., 30 seconds) to catch updates from other Admins without thrashing the database with aggregate queries.
  - Use **cache invalidation** to instantly update the UI when the active Admin performs an action (Create/Edit/Cancel).
- **Operational Alerts:** Highlight bookings arriving today where the collected amount (deposit_paid) is less than the required_deposit that was captured from the Unit or Hall Slab at the time of booking.

## 3. Booking Management (The Core Engine)

- **Booking Creation (Manual):** Admins manually enter bookings finalized via WhatsApp.
  - **Preset & Flexible Durations:** Quick preset buttons for **Overnight Stay (12:00 PM – 11:00 AM)** and **Day Slot (10:00 AM – 3:00 PM)**, plus custom time inputs for Admin overrides.
- **Multi-Unit Support ("OYO-Style"):** A single booking ID (e.g., #B001) can contain multiple units (e.g., Dome 1 + A-Frame 2).
- **Post-Confirmation Edits:** Admins have full power to modify a confirmed booking:
  - Change check-in / check-out dates and exact times (defaults to 12:00 PM / 11:00 AM for overnight; editable down to specific hours, e.g., 9:00 AM checkout or 4:00 PM check-in, to clear overlaps for hall event bundles).
  - Swap assigned units (e.g., move a guest from Dome 2 to A-Frame 1 based on availability).
  - Update guest details (Name, Phone, Notes).
- **Guest Database (CRM Approach):** To meet the 5-day deadline, there is no separate relational `Customers` table. Guest details (Name, Phone, Email) are saved as simple flat text columns directly in the `Bookings` table. If a guest returns, the Admin simply re-types their name.
- **Status Flow:** Confirmed ➔ Checked-In ➔ Checked-Out.
  - **No Pending Status:** Since bookings are manually created in the Admin Panel *after* the payment/deposit is successfully collected via WhatsApp, they are instantly recorded as `Confirmed`.
  - **Zero Balance Due Invariant for Checkout:** A booking **strictly cannot be marked as `Checked-Out` unless the Final Balance Due is ₹0**. If any balance remains from room rates or add-on line items (`Total Charges - Total Paid > 0`), the Admin must collect the remaining payment and record it in `Total Paid` before the system permits marking the status as `Checked-Out`. The UI disables the "Check Out" button and displays an alert: *"Cannot check out: Outstanding balance of ₹X,XXX must be collected first."*
- **Cancellations (Soft Delete & Cascading):** Cancelled bookings are removed from the calendar but retained in the database.
  - **Refund UI:** The Admin can cancel at any time and enter a custom "Refund Amount" ($0 \le \text{Refund Amount} \le \text{Total Paid}$) and a "Reason" to balance revenue analytics. Refund cannot exceed the total amount paid.
  - **Cascading Release:** If a parent booking (like a Hall) is cancelled, any child bookings attached to it (e.g., a Complimentary Dome) must automatically be soft-deleted simultaneously to release the blocked inventory back to the public calendar.
- **List View & Search:** A table of all bookings. Searchable by Guest Name, Phone, Email, and Status. Filterable by Check-in Date, Check-out Date, and Specific Unit (e.g., "Dome 3"). Clicking a row opens the full booking details.

## 4. Inventory & Unit Management

- **Unit Setup & Dynamic Capacity:**
  - **Dynamic Max Capacity:** When creating or editing any unit (Dome, A-Frame, or Hall), the Admin explicitly inputs the **Max Capacity** (initial defaults: Domes = 3, A-Frames = 5, Non-AC Hall = 1200, AC Hall = 2000).
  - **Domes (4 units):** Dome 1, Dome 2, Dome 3, Dome 4 (Default Capacity: 3 adults + infants).
  - **A-Frames (3 units):** A-Frame 1, A-Frame 2, A-Frame 3 (Default Capacity: 5 adults + infants). _(Built to support adding 3 upcoming A-Frames dynamically)._
  - **Event Hall:**
    - **Non-AC Hall** (Default Capacity: 1200) - Set to **Active**.
    - **AC Hall** (Default Capacity: 2000) - Set to **Inactive** _(under construction; accommodated in DB for future)_.
    - Separate booking flow. No swimming pool access included for event attendees.
- **Strict Cap (No Extra Beds):** The unit's capacity is strictly capped at its configured Max Capacity.
- **Unit Status:** Admin can toggle units as **Active** or **Inactive** (Inactive shows as "Sold Out" on the website).
- **Dynamic Deposit Setting:** When creating or editing a Dome or A-Frame unit, the Admin must input a **Default Deposit Amount** (e.g., ₹2000). This dynamically dictates the required advance payment for that specific unit.
- **Amenities Configuration:** Selectable checkboxes per unit:
  - **Variable:** Private Pool, AC, Wi-Fi, Smart TV, Bluetooth speaker, Common Refrigerator, UPS, Attached Bathroom, Bed Type (Double / Queen). _(Note: A-Frames include BOTH Double and Queen beds)._
  - **Standard (Hardcoded on frontend for all):** Electric Kettle with Tea/Coffee kit, 1L Mineral Water, Toiletries, BBQ Grill Setup.
- **Date Blocking:** Admin can block out dates for maintenance or resort buyouts (prevents web booking requests).
- **Media & Photo Management (Per Unit):**
  - **Strict Upload Limit:** 3MB maximum per image file. Client-side validation immediately rejects files exceeding 3MB with a clear user warning.
  - **Sequential Upload Queue:** Parallel multi-image uploads are strictly forbidden. Images must be processed and uploaded sequentially (one at a time) with a progress bar to prevent serverless memory spikes and timeout errors.
  - **Automated Resizing & Optimization:** The system auto-generates lightweight mobile and thumbnail dimensions for instant public website loading.
  - **Drag-and-Drop Reordering:** Admin can drag and drop uploaded image tiles to control the exact display sequence in the public website gallery.
  - **"Featured" Photo Badge:** Admin can mark a primary photo as "Featured", designating it as the main card thumbnail and WhatsApp OpenGraph preview image.
  - **SEO & Accessibility Metadata:** Input fields for Caption, Alt Text, and Image Description while uploading or editing photos.
  - **Deletion Safeguard:** A mandatory confirmation modal ("Are you sure you want to delete this photo?") prevents accidental permanent deletion.

## 5. Pricing & Promotions Engine

- **Base Price:** Standard nightly rate (Overnight) and Day Slot rate (10:00 AM – 3:00 PM) configured per unit.
- **Advance Deposit:** Captured dynamically based on the unit's configured Default Deposit Amount (e.g., standard ₹2000) for Domes & A-Frames.
- **Surge & Offer Logic (Conflict Resolution):**
  - **Weekend Rates (Sat/Sun):** Admin can set weekend rates (can be a price hike or a discount).
  - **Seasonal Rates (Date Range):** Admin can schedule multiple future promotions (e.g., Eid Offer).
  - **Overlap Rule (Hardcoded):** If a weekend falls inside a Seasonal Promotion, the **Weekend Rate strictly overrides** the Seasonal Rate for Sat/Sun. The Seasonal Rate applies to weekdays.

## 6. Billing & Folio (Add-ons)

- **Single Payment Tracking:** Admin enters total money collected as a single numeric value (no need to track Cash vs. UPI vs. Card).
- **Pre-Checkout Add-ons & Adjustments (Manual Line Items):**
  - To save development time, do not build a pre-configured product catalog (e.g., no database tables for food menus or kayaking prices).
  - Instead, build a dynamic "Add Line Item" tool on the booking page. The Admin can manually type a description and an amount (e.g., Description: "Food Orders", Amount: ₹1200 | Description: "Kayaking", Amount: ₹500).
  - These manual entries will be saved as individual rows tied to the booking, allowing the system to automatically calculate the final balance and print a beautifully itemized receipt for the guest.
- **Receipt Generation:** Admin can click "Print Receipt" which dynamically loops through the Base Charge, all Manual Line Items (Food, penalties, activities), the Amount Paid, and outputs the Final Balance Due (with property rules attached).

## 7. Settings & Property Policies

- **Standard Timings:** Hardcoded for display: Check-in: 12:00 PM | Check-out: 11:00 AM.
- **Operational Notes (For Receipts/Staff):**
  - **Pool Rules & Event Privacy:**
    - **Standard Days:** Pool is open for Dome and A-Frame residents until 10:00 PM.
    - **Event Days:** Because the pool area is adjacent to the Event Hall, it is closed to swimming during event hours to ensure privacy. Event attendees are never permitted to swim. Dome and A-Frame residents will be granted exclusive late-night pool access from 10:00 PM to 11:00 PM after the event concludes.
- **Cancellation Policy Textbox:** A text area where the Admin can write/paste the official cancellation policy once the company finalizes it. This text will automatically render on the website footer and guest receipts.

## 8. Concurrency & Race Condition Handling (Database Level)

Because multiple Admins will input bookings concurrently from WhatsApp, the system is highly vulnerable to race conditions (e.g., two Admins booking Dome 2 at the exact same millisecond).

- **No Application-Level Locks:** To protect the 5-day sprint, the application will not use complex Redis mutexes or application-level `if(!exists)` checks.
- **PostgreSQL Exclusion Constraints:** The database will handle all concurrency validation. A GiST Exclusion Constraint will be applied to the `Bookings` (or `booking_units`) table ensuring that `unit_id` and the time range (`start_datetime` to `end_datetime`) cannot overlap (`&&`) where the status is active.
- **Error Handling Flow:**
  1. If a race condition occurs, PostgreSQL rejects the second transaction at the kernel level.
  2. The backend catches the SQL error and returns an HTTP 409 Conflict.
  3. The frontend displays a UI alert to the Admin: _"Conflict: This unit was modified by another Admin. Please refresh the calendar."_
