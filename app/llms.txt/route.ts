import { NextResponse } from "next/server";

export const dynamic = "force-static";

const LLMS_TEXT_CONTENT = `# Parlak Resort & Farmhouse

> Luxury waterfront resort and farmhouse in Vallivattom, S.N. Puram, Keralam offering Geodesic Domes, A-Frames, and Banquet Event Venues.

## Essential Information

- **Domain:** https://parlakfarmhouse.com
- **WhatsApp & Phone:** +91 88919 31123 (wa.me/918891931123)
- **Email:** info.parlakresort@gmail.com
- **Address:** Vallivattom, S.N. Puram, Keralam 680661
- **Google Plus Code:** 75GP+QP Sreenarayanapuram, Keralam
- **Google Maps:** https://maps.app.goo.gl/GJyr7qpHWfVxWXtP9
- **Socials:** Instagram (@parlak___), Facebook, YouTube

## Accommodations & Hard Capacity Rules

- **Geodesic Domes:** 4 Units. Hard Cap: Maximum 3 Adults + Infants. Strictly NO extra beds. Attached Bath, AC, Wi-Fi, Pool Access, BBQ Grill Setup. Base Rate: ₹3,500/night (Overnight), ₹2,500 (Day Slot: 10 AM - 3 PM). ₹2,000 booking advance (credited towards stay).
- **Scenic A-Frames:** 3 Units. Hard Cap: Maximum 5 Adults + Infants. Both Double & Queen beds included. Strictly NO extra beds. Attached Bath, AC, Wi-Fi, Pool Access. Base Rate: ₹5,000/night (Overnight), ₹3,500 (Day Slot). ₹2,000 booking advance (credited towards stay).

## Event Venues & Slabs

- **Non-AC Event Hall:** Active. Max capacity 1,200 attendees. Booked in slots (Morning Slot: 10 AM - 3 PM, Evening Slot: 5 PM - 10 PM same day). Slabs: 10-25 pax (₹10,000), up to 801-1,200 pax (₹72,000). Slabs of 400+ pax qualify for complimentary attached Dome.
- **AC Event Hall:** 2,000 max capacity. Central AC convention auditorium for grand weddings and banquets. Booked in morning (10 AM - 3 PM) and evening (5 PM - 10 PM) slots.

## Important Operational Policies

- **Check-in / Check-out:** Overnight: 12:00 PM Check-in, 11:00 AM Check-out next day. Day Slot: 10:00 AM to 3:00 PM same day. Event Halls: Morning Slot (10:00 AM – 3:00 PM), Evening Slot (5:00 PM – 10:00 PM).
- **Swimming Pool:** Strictly forbidden for Event Hall attendees. Open for Dome & A-Frame residents until 10:00 PM (10:00 PM - 11:00 PM on event days).
- **Dining:** Menu orders available until 10:30 PM IST.
- **Booking Flow:** The website performs zero direct database writes. All reservations compile into structured WhatsApp links routing directly to +91 88919 31123.

## Full Context

- Detailed Documentation & Policy Manual: https://parlakfarmhouse.com/llms-full.txt
`;

export async function GET() {
  return new NextResponse(LLMS_TEXT_CONTENT, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
