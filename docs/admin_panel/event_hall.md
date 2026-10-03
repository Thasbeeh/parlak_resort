## Event Hall Management (Slot-Based Gatherings) - Complete Specification

### Two Distinct Venues

- **Dynamic Max Capacity:** The Max Capacity of any Hall is dynamically configured by the Admin when creating or editing the venue in the admin panel.
- **Non-AC Hall** (Default Capacity: 1200) - Set to **Active**.
- **AC Hall** (Default Capacity: 2000 — _currently under construction but accommodated in DB_) - Set to **Inactive**.

### Venue Selection (Event Hall Management)

- **Venue Selection:** When an Admin creates a Hall booking, they must select the specific venue (**Non-AC Hall** or **AC Hall**) from a dropdown, allowing both halls to be booked concurrently by different parties on the same day.
- **Concurrency Rule:** Each hall operates as an independent inventory unit. Non-AC Hall and AC Hall can both be booked for the same date and slot (e.g., both booked for Slot A) by separate parties without triggering an overlap conflict.

### Venue Media & Gallery Management (Halls)

- **Upload Limit:** Maximum 3MB per photo file (immediate client-side validation prevents uploading oversized files).
- **Strictly Sequential Uploads:** Parallel multi-photo uploads are disabled. Photos must be uploaded sequentially (one-by-one) with a visual progress bar to maintain serverless stability and prevent connection timeouts.
- **Auto-Generated Sizes:** The system auto-generates optimized mobile and thumbnail sizes to keep public venue pages fast.
- **Drag-and-Drop Sequencing:** Admin can drag and drop uploaded venue photos to order the presentation of stages, seating setups, and banquet spaces on the website.
- **Featured Cover Photo:** Admin can mark a specific venue photo as "Featured", which sets the primary card thumbnail and OpenGraph preview for the hall.
- **SEO & Accessibility Captions:** Fields for Caption, Alt Text, and Description to label photos (e.g., "Non-AC Hall Banquet Setup - 800 Pax Capacity").
- **Deletion Safeguard:** Requires an "Are you sure?" confirmation dialog before deleting any venue photo.

### Slot-Based Booking Logic

Unlike Domes (which are overnight), Halls are booked strictly by time slots.

- **Slot A:** 10:00 AM to 3:00 PM
- **Slot B:** 5:00 PM to 10:00 PM
- **Rule:** Both slots can be booked on the same day by different parties.

### Dynamic Slab Pricing (Admin Configurable)

Price is based purely on head count, not event type. Admin needs a settings page to add/edit/delete pricing buckets.

- **Example Structure:**
  - Min: 10, Max: 25, Price: ₹10,000
  - Min: 400, Max: 800, Price: ₹58,000, etc.
- **Dynamic Deposit:** When creating a slab, the Admin also defines the specific **Required Deposit** for that slab (e.g., ₹5000 for lower slabs, ₹10,000 for higher slabs). This value is locked into the booking at creation time.

### Attached / Discounted Dome Bundling

- When creating a Hall booking (e.g., for the 400-800 slab), the Admin can select one or more Domes to attach to the event.
- **Creation-Only Rule:** Domes can strictly only be attached to a Hall during the *creation* of the Hall booking. You cannot retroactively attach an existing Dome booking to a Hall.
- There is no hardcoded limit on how many domes can be attached; this is left to Admin discretion.
- **Dynamic Pricing:** The price of the attached Dome is **not** restricted to ₹0. The Admin can dynamically assign a custom price (e.g., ₹0 for fully complimentary, or a discounted rate like ₹2500) for the attached Dome on the Hall's receipt.
- **Calendar & Overlap Rules:**
  - **The Default System Block (Safety First):** If a Dome has an overnight guest leaving at standard 11:00 AM or arriving at standard 12:00 PM, the system will throw an informative **"Overlap Error"** if the Admin tries to attach it to a conflicting Hall slot (e.g., Slot A: 10:00 AM – 3:00 PM). The UI must state the conflicting Booking ID, Guest Name, and colliding hours to prevent double-booking.
  - **The Admin Override (Flexibility):** If the Admin negotiates adjusted timings with the guest (e.g., outgoing guest agrees to check out by 9:00 AM, or incoming guest agrees to check in at 4:00 PM), the Admin opens the overnight booking via Post-Confirmation Edits, updates the check-out/check-in time, and saves it. Once the timeline is cleared, the system allows attaching the Dome to the Hall booking.
  - **Automatic Release:** If the Hall booking is cancelled, the attached complimentary Dome is immediately freed and restored to general room inventory.

### Add-ons & Adjustments (No Product Catalog)

- To save development time, do not build a pre-configured product catalog for the hall (e.g., no database tables for Waste Management, Massage Chair, and Coffee Machine).
- Instead, build a dynamic "Add Line Item" tool on the booking page. The Admin can manually type a description and an amount (e.g., Description: "Waste Management", Amount: ₹1200 | Description: "Massage Chair", Amount: ₹500).
- These manual entries will be saved as individual rows tied to the booking, allowing the system to automatically calculate the final balance.
- **Receipt Generation & Checkout Settlement:** Admin can click "Print Receipt" which dynamically loops through the Base Charge, all Manual Line Items (Food, penalties, activities, Chair damage, Party Blaster Cleaning), the Amount Paid, and outputs the Final Balance Due (with property rules attached).
  - **Zero Balance Due Invariant for Checkout:** When the event slot concludes (Slot A at 3:00 PM, Slot B at 10:00 PM, or Full Day at 10:00 PM), the booking **strictly cannot be marked as `Checked-Out` unless the Final Balance Due is ₹0**. All base charges and post-event line items (damages, cleaning fees) must be fully paid and recorded in `Total Paid` before checkout is allowed.

*(Note: Everything else like tables, standard chairs, generator, and water are included in the base rate. Swimming pool access is strictly excluded for event attendees).*

### Hall Deposits & Cancellations

- **Deposit Rule:** Deposit is an advance payment credited directly towards the event slab price (not returned after the event concludes). The deposit for each Event Hall booking can be entered/adjusted dynamically by the Admin when creating or modifying the reservation.
- **Cancellations & Refunds:**
  - Admin can cancel an Event Hall booking at **any time**.
  - Admin enters a custom "Refund Amount" ($0 \le \text{Refund Amount} \le \text{Total Paid}$) and a cancellation reason. The refund cannot exceed the total amount collected.
  - Cancelling the Hall booking automatically initiates a **cascading release** of any attached Domes back to public room inventory.

### Promotions (Percentage Modifiers)

- To save development time on complex slab pricing overrides, Event Halls strictly use a **Percentage Modifier** for promotions.
- The exact percentage value (e.g., +15%, -10%) is **dynamically assigned by the Admin** when creating the seasonal promotion; it is not hardcoded.
- The system will calculate the standard slab price based on headcount, and then mathematically apply the Admin's defined seasonal variance.
- **Rule:** Event Halls ONLY have Seasonal price variation. There is NO Weekend variation for Event Halls.

---

## 3. Scoped-Out Features (Do Not Build Dedicated UIs for These)

- **Damage/Penalty Tracking:** Do not build a separate system to calculate "Chair damage (₹450/chair)" or "Party Blaster Cleaning (₹2000)".
  - **Solution:** Use the **"Add Line Item"** tool mentioned above to manually add these charges before generating the final bill.
- **Tollman Tracking:** Do not build a staff-assignment feature for the Tollman (required for 100+ guests). Just add it as a text note on the receipt.
- **Food/Catering:** Do not build a catering menu system. The resort outsources this. Use the generic "Custom Bill Adjustments" field for any food totals.

---

## 4. General Core Requirements (Retained from Previous)

- **Authentication:** 3 Admin accounts, seeded in the database. No staff/guest roles.
- **Dashboard:** 30-day Revenue, Today's Check-ins/outs, Resident Guests (overnight Domes/A-Frames), and Event Attendees broken down by Hall and Slot (e.g., Non-AC Hall Slot A, AC Hall Slot B).
- **Booking Management (Domes):**
  - Manual entry (from WhatsApp flow).
  - Multi-unit support (Dome 1 + A-Frame 1 on one bill).
  - Full post-confirmation edit powers (swap rooms, change dates).
- **Cancellation Policy (Domes):** Soft delete method. Admin manually calculates and inputs the refund amount and reason to keep revenue analytics accurate. _(Remember, Hall has no refunds)._
- **Dynamic Unit Capacity Setup:** Max capacity is defined dynamically by the Admin when creating/editing units (Default seed: Domes = 3, A-Frames = 5, Non-AC Hall = 1200, AC Hall = 2000). Amenities configured via Admin checkboxes (with tea, water, and toiletries hardcoded as standard).

---

## Architectural Advice for the Database

To handle the time-slot vs. nightly difference smoothly in your database, use `start_datetime` and `end_datetime` in your `Bookings` table instead of just `check_in_date` and `check_out_date`.

- **A Dome booking becomes:** `2026-10-14 12:00:00` to `2026-10-15 11:00:00`.
- **A Hall booking becomes:** `2026-10-14 10:00:00` to `2026-10-14 15:00:00`.

This allows a single PostgreSQL query to easily check for time overlaps regardless of whether the unit is a Dome or a Hall!
