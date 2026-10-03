---
name: parlak-domain
description: Enforces core domain rules, inventory constraints, slot booking logic, concurrency guarantees, and scope guardrails for the Parlak Resort platform. Use when designing, creating, or modifying booking flows, admin operations, pricing logic, database models, or WhatsApp message payloads.
---

# Parlak Resort Domain Specification & Architectural Guardrails

This skill documents the non-negotiable business rules, domain entities, booking lifecycles, and architectural constraints for the **Parlak Resort** web application and admin management system.

---

## 1. Golden Architectural Rules (5-Day Delivery Guardrails)

1. **Read-Only Public Frontend:**
   * The public website performs **zero direct database writes**.
   * All visitor inquiries and booking requests compile into structured `https://wa.me/` URLs routing directly to the resort's WhatsApp.
   * Bookings enter the database **only** through manual Admin Panel entry after payment/deposit verification.
2. **Strict Internal Authentication:**
   * Maximum of **3 Admin accounts**, seeded directly into PostgreSQL with hashed passwords.
   * No user registration, no customer accounts, and no role-based permission ladders (no staff/housekeeping roles).
   * Session authentication uses lightweight signed JWTs in HTTP-only cookies (`jose` + Web Crypto).
3. **Lightweight Flat CRM:**
   * Do NOT build a relational `Customers` table.
   * Guest information (`guest_name`, `guest_phone`, `guest_email`, `notes`) is stored as flat columns directly on the `Bookings` record.
4. **No Relational Product Catalogs for Add-ons:**
   * Do NOT build database tables for restaurant menus, kayaking rates, or damage fees.
   * The billing folio strictly uses a manual **"Add Line Item"** tool (`description` + `amount`) stored as simple line items tied to the booking.
5. **Browser-Based Receipt Printing:**
   * No server-side PDF generators (`@react-pdf/renderer`, `puppeteer`, etc.).
   * Invoices are rendered as React components styled with Tailwind CSS `@media print` rules and triggered via `window.print()` / `react-to-print`.

---

## 2. Inventory & Unit Capacity Specifications

| Unit Category | Total Units | Default Capacity | Max Capacity Rule | Amenities & Bedding | Default Deposit |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Geodesic Domes** | 4 (Dome 1 to 4) | 3 Adults + Infants | **Hard Cap:** Max 3 pax. Strictly NO extra beds. | Attached Bath, AC, Wi-Fi, Smart TV, Pool access. Standard: Tea/Coffee kit, 1L Water, BBQ grill. | ₹2,000 (Refundable) |
| **A-Frames** | 3 (A-Frame 1 to 3; expandable) | 5 Adults + Infants | **Hard Cap:** Max 5 pax. Strictly NO extra beds. | Includes **both Double and Queen beds**. Attached Bath, AC, Wi-Fi, Pool access. | ₹2,000 (Refundable) |
| **Non-AC Event Hall** | 1 (Active) | 1,200 Pax | Configurable by Admin | Seating, stage, generator, banquet space. **Pool access excluded.** | Dynamic (Set per pricing slab) |
| **AC Event Hall** | 1 (Inactive / Under Construction) | 2,000 Pax | Configurable by Admin | Accommodated in DB schema; marked `Inactive` until completed. | Dynamic (Set per pricing slab) |

* **Unit Status:** Active units show on the public site; Inactive units render as "Sold Out".
* **Media Management:** Max 3MB per photo, strictly sequential uploads with progress indicators, drag-and-drop ordering, and a "Featured" photo badge.

---

## 3. Booking Modes & Time-Slot Logic

All bookings in the database must use **`start_datetime`** and **`end_datetime`** (stored in UTC / handled in IST) instead of plain date strings to unify slot and overnight overlap checks.

### A. Domes & A-Frames
1. **Overnight Stay (Default):**
   * Standard timings: **12:00 PM Check-in to 11:00 AM Next-Day Check-out**.
2. **Day Slot:**
   * Fixed timings: **10:00 AM to 3:00 PM (Same Day)**.
3. **Multi-Unit Booking:** A single booking ID (e.g., `#B001`) can contain multiple units (e.g., Dome 1 + A-Frame 2).

### B. Event Halls
Booked strictly by time slots:
* **Slot A:** 10:00 AM to 3:00 PM.
* **Slot B:** 5:00 PM to 10:00 PM.
* **Full Day:** 10:00 AM to 10:00 PM.
* **Hall Concurrency:** Non-AC Hall and AC Hall operate as distinct inventory items. Both can be booked for the same slot on the same day without collision.

---

## 4. Concurrency Protection & Conflict Resolution

### A. Database-Level Exclusion Constraint
To prevent race conditions when multiple Admins book units simultaneously from WhatsApp, concurrency must be enforced by PostgreSQL via a GiST exclusion constraint on the `booking_units` table:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE booking_units
ADD CONSTRAINT no_overlapping_unit_bookings
EXCLUDE USING gist (
  unit_id WITH =,
  tstzrange(start_datetime, end_datetime) WITH &&
)
WHERE (status NOT IN ('CANCELLED'));
```

### B. Error Handling Flow
1. If two admins attempt to book overlapping unit times, PostgreSQL rejects the second transaction with an exclusion constraint violation.
2. The backend catches the SQL error and returns an **HTTP 409 Conflict**.
3. The frontend displays: *"Conflict: This unit was modified by another Admin. Please refresh the calendar."*

---

## 5. Pricing, Promotions & Bundling Engine

### A. Domes & A-Frames
* **Base Rates:** Configured per unit for Overnight Stay and Day Slot.
* **Weekend Rates (Sat/Sun):** Admin-configurable rate override.
* **Seasonal Rates (Date Range):** Percentage or fixed override.
* **Overlap Hierarchy:** If a weekend falls inside a Seasonal Promotion, the **Weekend Rate strictly overrides** the Seasonal Rate for Sat/Sun.

### B. Event Halls (Headcount Slabs)
* **Slab Pricing:** Rate is based strictly on headcount buckets, not event type (e.g., 10–25 pax: ₹10,000; 400–800 pax: ₹58,000).
* **Required Deposit:** Configured per slab (e.g., ₹5,000 for lower tiers, ₹10,000 for higher tiers).
* **Seasonal Promotions:** Event Halls use a **Percentage Modifier** (e.g., +15%, -10%). There are **NO weekend rate variations** for halls.

### C. Attached / Discounted Dome Bundling
* **Creation-Only Rule:** Domes can strictly only be bundled during the **creation** of a Hall booking.
* **Custom Pricing:** Admin can assign any custom price for attached Domes (₹0 for complimentary, or discounted rate).
* **Overlap Protection:** If a Dome has a conflicting overnight stay (arriving 12:00 PM or departing 11:00 AM), the system throws an overlap error displaying conflicting Booking ID and colliding hours.
* **Admin Override:** Admin can adjust the overnight guest's check-in/out hours (e.g., negotiate 9:00 AM checkout) via Post-Confirmation Edits to clear the timeline.
* **Cascading Release:** Cancelling a Hall booking automatically soft-deletes and releases attached Domes back to public inventory.

---

## 6. Cancellations, Refunds & Billing

1. **Cancellation & Refund Rules (All Units):**
   * Admin can cancel any booking (Dome, A-Frame, or Event Hall) at **any time**.
   * Status set to `CANCELLED`, freeing inventory via PostgreSQL GiST constraint.
   * Cancelling a Hall booking automatically triggers a **cascading release** of all attached child Domes.
   * Admin enters a custom "Refund Amount" ($0 \le \text{Refund Amount} \le \text{Total Paid}$) and a "Reason".
2. **Advance Deposit & Checkout Settlement:**
   * Deposits are advance payments credited towards the total bill (not returned post-stay/event).
   * **Strict Checkout Invariant:** Marking a booking as `CHECKED_OUT` **strictly requires Final Balance Due == ₹0**. All base charges, damage fees, and line items must be fully collected in `totalPaid` prior to checkout.
3. **Denormalized Revenue Tracking:**
   * The `Bookings` table maintains a `net_revenue` column (`totalPaid - refundAmount` or retained revenue).
   * Dashboard KPI displays `SUM(net_revenue)` for the last 30 days without recalculating historical math.

---

## 7. Resort Operational Policies (Hardcoded Rules)

* **Standard Timings:** Check-in: 12:00 PM | Check-out: 11:00 AM.
* **Restaurant / Dining:** Menu services available until 10:30 PM.
* **Swimming Pool Policy:**
  * **Event Attendees:** Strictly forbidden from using the pool under any circumstances.
  * **Standard Days:** Pool open for Dome & A-Frame residents until 10:00 PM.
  * **Event Days:** Pool closed during event hours. Dome & A-Frame residents receive an exclusive late-night slot from **10:00 PM to 11:00 PM** after the event concludes.
* **Deposit Policy:** ₹2,000 refundable security deposit per room unit collected at confirmation and refunded at checkout upon inspection.
