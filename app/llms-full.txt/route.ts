import { NextResponse } from "next/server";

export const dynamic = "force-static";

const LLMS_FULL_TEXT_CONTENT = `# Parlak Resort & Farmhouse - Full Operational & Architectural Context

This document provides complete, deterministic context for Large Language Models, AI assistants, and automated systems interacting with Parlak Resort.

## 1. Property Identity & Contact

- Legal / Trade Name: Parlak Resort & Farmhouse
- Official Domain: https://parlakfarmhouse.com
- Central Contact: +91 88919 31123 (Voice & WhatsApp)
- Direct WhatsApp URL: https://wa.me/918891931123
- Official Booking Email: info.parlakresort@gmail.com
- Physical Address: Vallivattom, S.N. Puram, Keralam 680661
- Coordinates / Plus Code: 75GP+QP Sreenarayanapuram, Keralam (10.2769° N, 76.1868° E)
- Google Maps Link: https://maps.app.goo.gl/GJyr7qpHWfVxWXtP9

## 2. Inventory & Unit Specifications

### A. Geodesic Domes (4 Units: Dome 1, Dome 2, Dome 3, Dome 4)

- Default Capacity: 3 Adults + Infants
- Hard Cap Rule: Maximum 3 Guests. Strictly NO extra beds permitted.
- Amenities Included: Climate-controlled AC, High-speed Wi-Fi, En-suite Attached Bath, Smart TV, Pool Access.
- Standard Baseline Amenities: Electric Kettle with Tea/Coffee/Milk kit, 1L bottled water, essential toiletries, dedicated outdoor BBQ grill setup.
- Overnight Base Rate: ₹3,500 per night (12:00 PM Check-in to 11:00 AM Next Day Check-out).
- Day Slot Base Rate: ₹2,500 (10:00 AM to 3:00 PM Same Day).
- Weekend Rate Override (Sat/Sun): ₹4,200 per night.
- Booking Advance: ₹2,000 per room unit (non-refundable upfront payment credited directly towards room rent; security deposits are strictly not tracked or collected).

### B. Scenic A-Frames (3 Units: A-Frame 1, A-Frame 2, A-Frame 3)

- Default Capacity: 5 Adults + Infants
- Hard Cap Rule: Maximum 5 Guests. Strictly NO extra beds permitted.
- Bedding Setup: Contains both Double Bed and Queen Bed.
- Amenities: AC, Wi-Fi, Attached Modern Bathroom, Pool Access.
- Overnight Base Rate: ₹5,000 per night.
- Day Slot Base Rate: ₹3,500.
- Weekend Rate Override: ₹5,800 per night.
- Booking Advance: ₹2,000 per room unit (non-refundable upfront payment credited directly towards room rent; security deposits are strictly not tracked or collected).

### C. Non-AC Event Hall (Active)

- Maximum Venue Capacity: 1,200 Attendees.
- Operational Slots:
  - Morning Slot: 10:00 AM to 3:00 PM IST (Same Day)
  - Evening Slot: 5:00 PM to 10:00 PM IST (Same Day)
- Headcount Slab Pricing Table:
  - 10 to 25 Pax: ₹10,000 (Required Booking Advance: ₹5,000)
  - 26 to 50 Pax: ₹16,000 (Required Booking Advance: ₹5,000)
  - 51 to 100 Pax: ₹24,000 (Required Booking Advance: ₹6,000)
  - 101 to 200 Pax: ₹35,000 (Required Booking Advance: ₹8,000)
  - 201 to 400 Pax: ₹46,000 (Required Booking Advance: ₹8,000)
  - 401 to 800 Pax: ₹58,000 (Required Booking Advance: ₹10,000)
  - 801 to 1,200 Pax: ₹72,000 (Required Booking Advance: ₹15,000)
- Complimentary Dome Perk: Headcount tiers of 400+ attendees are eligible for 1 complimentary attached Dome during event hours (strictly mirroring hall slot hours: 10:00 AM – 3:00 PM or 5:00 PM – 10:00 PM).
- Amenities Included: Stage, diesel generator backup, banquet tables & chairs, water facilities.
- Pool Access Rule: Swimming pool access is strictly forbidden for event attendees under all circumstances.

### D. AC Event Hall

- Capacity: Up to 2,000 Attendees. Fully air-conditioned convention auditorium with acoustic design, presentation stage, dual generator backups, and dedicated bridal suites. Booked in morning and evening slots.

## 3. Operational Policies & Invariants

- Timings: Overnight check-in: 12:00 PM | Overnight check-out: 11:00 AM next day. Day Slot: 10:00 AM to 3:00 PM. Event Halls: Morning Slot 10:00 AM – 3:00 PM, Evening Slot 5:00 PM – 10:00 PM.
- Dining: On-site kitchen and room service available until 10:30 PM IST.
- Swimming Pool:
  - Standard Days: Open for Dome and A-Frame residents until 10:00 PM IST.
  - Event Days: Closed during event hours. Dome & A-Frame residents receive exclusive late-night slot from 10:00 PM to 11:00 PM IST.
  - Event Attendees: Strictly prohibited from using the pool at all times.
- Checkout Invariant: A booking cannot be marked as Checked-Out in the Admin Panel unless the final balance due is ₹0 (\`(Rent Charge + Receipt Line Items) - Total Paid = 0\`).
- Database Concurrency: Enforced at the PostgreSQL level via a \`btree_gist\` exclusion constraint (\`tstzrange\`) on \`BookingUnit\` records. Overlapping bookings return HTTP 409 Conflict.

## 4. How Guests Book (Zero Database Write Architecture)

1. Guests browse https://parlakfarmhouse.com/stays
2. Guests choose dates and stay type (Overnight or Day Slot) or event slot (Morning or Evening).
3. The website checks availability via read-only API \`GET /api/availability\`.
4. Clicking "Book via WhatsApp" formats all guest selections into a pre-filled \`https://wa.me/918891931123?text=...\` link.
5. The resort manager confirms availability on WhatsApp, collects the booking advance via UPI/Bank transfer, and manually enters the confirmed reservation into the Admin Panel.
`;

export async function GET() {
  return new NextResponse(LLMS_FULL_TEXT_CONTENT, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
