# Page Specification: Contact Us Page (`/contact`) (`contact.md`)

> **File Scope & Context for AI Agents:**
> - **Target Route / Component:** `app/(public)/contact/page.tsx` (and subcomponents: ContactDetails, LocationMapEmbed, OperationalPoliciesCard, CancellationPolicyCard).
> - **Primary Purpose:** Public contact, location, and guest assistance page providing direct communication links, directions with interactive Google Maps embed, resort operational policies, and cancellation guidelines.
> - **Key Entities & Models Covered:** Resort settings (phone, WhatsApp, email, address, coordinates), dynamic `cancellationPolicy`, and standard check-in/pool operating hours.
> - **Token Efficiency Note:** Read or edit this file when modifying resort contact details, map coordinates, directions, policies display, or general WhatsApp contact links.

---

## 1. Page Content & UI Components

### A. Direct Contact Information
- **Official WhatsApp Direct Link Button:** `https://wa.me/918891931123` (Triggers one-tap chat with pre-filled greeting).
- **Resort Direct Calling Line:** `+91 88919 31123` (`tel:+918891931123`).
- **Official Email Address:** `info.parlakresort@gmail.com`.
- **Official Social Profiles:**
  - Instagram: [https://www.instagram.com/parlak___](https://www.instagram.com/parlak___)
  - Facebook: [https://www.facebook.com/profile.php?id=61550970517881](https://www.facebook.com/profile.php?id=61550970517881)
  - YouTube: [https://www.youtube.com/@PARLAK-v9s](https://www.youtube.com/@PARLAK-v9s)

### B. Location & Directions
- **Physical Postal Address:** **Vallivattom, S.N. Puram, Keralam 680661**
- **Google Plus Code:** **75GP+QP Sreenarayanapuram, Keralam**
- **Direct Google Map Link:** [https://maps.app.goo.gl/GJyr7qpHWfVxWXtP9](https://maps.app.goo.gl/GJyr7qpHWfVxWXtP9)
- **Interactive Google Maps Embed:** Full-width responsive iframe showing pinned resort location at coordinates `10.2769, 76.1868`.

### C. Operational Policies Card
- **Stay Timings:**
  - Standard Overnight: Check-in 12:00 PM IST | Check-out 11:00 AM IST Next Day.
  - Day Slots: 10:00 AM to 3:00 PM IST Same Day.
  - Event Hall Slots: Morning Slot (10:00 AM – 3:00 PM) | Evening Slot (5:00 PM – 10:00 PM).
- **Food & Dining:** On-site restaurant menu service available until 10:30 PM. Outside catering permitted only for private event hall bookings.
- **Swimming Pool Policy:**
  - Regular Days: Open exclusively for Dome and A-Frame residents until 10:00 PM.
  - Event Days: Closed during event hours. Overnight residents receive exclusive access from 10:00 PM to 11:00 PM.
  - Event Attendee Rule: Event Hall attendees are strictly forbidden from entering or using the swimming pool under all circumstances.
- **Advance Payment Policy:** Dynamic booking advance configured per Price List slab, collected at booking confirmation and credited directly towards total rent (non-refundable; security deposits are strictly not tracked or collected). Rate plans strictly enforce contiguous headcount slabs via Zod `superRefine`.
- **Extension & Scope Modification Policy:** Confirmed reservations permanently lock in agreed rates for the original contracted scope (`bookedBaseRate`). All modifiers (`WEEKEND` and `SEASONAL`) are strictly bounded to explicit date ranges (`endDate >= startDate` via `chk_pricemodifier_dates`). Any stay extensions (extra nights, early check-in / late check-out hours beyond preset blocks, or additional Day Slots) and event headcount increases crossing into higher slabs are calculated using the active Price List in effect at the time of modification. Headcount upgrades into higher slabs isolate the incremental charge with an algebraic floor ($\max(0, \text{ActiveRate}(\text{New Higher Slab}) - \text{ActiveRate}(\text{Original Booked Capacity}))$) to prevent negative discounts.
- **Flat Baseline Blocks Policy:** Standard preset packages (Overnight 12:00 PM – 11:00 AM, Day Slot 10:00 AM – 3:00 PM, Event Hall Morning 10:00 AM – 3:00 PM / Evening 5:00 PM – 10:00 PM) are billed as flat baseline blocks. Shortening fractional hours (e.g., checking in late or checking out early) does not discount or reduce the baseline rent charge.
- **Scope Reductions & Partial Cancellations:** Any reduction in scope—including shortening nights, dropping a discrete add-on slot, or downgrading to a lower headcount slab—acts strictly as a **Partial Cancellation**. The system does not issue automatic refunds; the baseline rent remains locked, and any refund or adjustment is assessed manually by Resort Administration under official cancellation terms. Confirmed records enforce non-negative tariffs (`unitPrice >= 0`), with PostgreSQL trigger `trigger_calculate_net_revenue` automatically computing and maintaining `netRevenue = totalPaid - refundAmount`.

### D. Cancellation Policy Card
Displays dynamic cancellation text fetched from Admin Settings. All cancellations and scope reductions are reviewed manually by Management; booking advances are non-refundable and credited toward agreed rent. PostgreSQL triggers maintain net revenue metrics with mathematical precision.

---

## 2. Route Data Contract: Contact Us Page (`GET /contact`)

### Inbound Request Payload (Page Request)
```typescript
// Next.js App Router Server Component Props
interface ContactPageInboundRequest {
  params: Promise<Record<string, never>>;
  searchParams: Promise<{
    inquiryType?: "general" | "stays" | "events";
  }>;
}
```

### Outbound Server Data Payload (RSC / JSON)
```json
{
  "resortDetails": {
    "officialName": "Parlak Resort",
    "domain": "parlakfarmhouse.com",
    "phones": [
      { "label": "Main Desk & Reservations", "display": "+91 88919 31123", "telUri": "tel:+918891931123" }
    ],
    "whatsapp": {
      "number": "918891931123",
      "actionUrl": "https://wa.me/918891931123?text=Hello%20Parlak%20Resort%20Team%2C%20I%20would%20like%20to%20get%20in%20touch%20regarding%20a%20stay%20or%20event."
    },
    "email": "info.parlakresort@gmail.com",
    "socialLinks": {
      "instagram": "https://www.instagram.com/parlak___",
      "facebook": "https://www.facebook.com/profile.php?id=61550970517881",
      "youtube": "https://www.youtube.com/@PARLAK-v9s"
    },
    "location": {
      "streetAddress": "Vallivattom",
      "area": "S.N. Puram (Sreenarayanapuram)",
      "district": "Thrissur",
      "state": "Keralam",
      "postalCode": "680661",
      "formatted": "Vallivattom, S.N. Puram, Keralam 680661",
      "googlePlusCode": "75GP+QP Sreenarayanapuram, Keralam",
      "googleMapLink": "https://maps.app.goo.gl/GJyr7qpHWfVxWXtP9",
      "geoCoordinates": { "latitude": 10.2769, "longitude": 76.1868 },
      "googleMapsEmbedUrl": "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15705.5!2d76.1868!3d10.2769!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNzXigIFHUCtRUCDiiY4gU3JlZW5hcmF5YW5hcHVyYW0sIEtlcmFsYQ!5e0!3m2!1sen!2sin!4v1"
    }
  },
  "operationalPolicies": {
    "stayTimings": {
      "overnightCheckIn": "12:00 PM IST",
      "overnightCheckOut": "11:00 AM IST Next Day",
      "daySlotCheckIn": "10:00 AM IST",
      "daySlotCheckOut": "3:00 PM IST Same Day",
      "eventHallMorningSlot": "10:00 AM – 3:00 PM IST",
      "eventHallEveningSlot": "5:00 PM – 10:00 PM IST"
    },
    "diningService": {
      "menuAvailableUntil": "10:30 PM IST",
      "outsideFoodPolicy": "Outside catering strictly limited to private Event Hall reservations."
    },
    "poolTimings": {
      "regularDays": "Open exclusively for Dome and A-Frame residents until 10:00 PM IST.",
      "eventDays": "Closed during event hours. Overnight residents receive exclusive access from 10:00 PM to 11:00 PM IST.",
      "eventAttendeeRule": "Event Hall attendees are strictly forbidden from entering or using the swimming pool under any circumstances."
    },
    "advancePaymentPolicy": "Dynamic booking advance configured per Price List slab, collected at booking confirmation and credited directly towards total rent (non-refundable; security deposits are strictly not tracked or collected).",
    "extensionPolicy": "Stay extensions, extra hours beyond preset blocks, added day slots, and event headcount upgrades to higher slabs are evaluated against the active Price List at the time of request. Upgrades to higher slabs isolate the incremental cost with an algebraic floor (max(0, New Rate - Old Capacity Rate)). Standard preset packages are billed as flat baseline blocks (shortened hours yield no discount).",
    "scopeReductionPolicy": "Reductions in scope (fewer nights, dropped slots, or lower headcount slabs) act strictly as Partial Cancellations with no automatic refunds; adjustments require Admin manual review. Confirmed records enforce non-negative tariffs (unitPrice >= 0) with automatic PostgreSQL trigger maintenance for netRevenue."
  },
  "cancellationPolicy": {
    "policyText": "All cancellations and scope reductions must be requested via WhatsApp with your Booking ID. Baseline scope rent remains locked to original contracted rates. Standard packages are billed as flat baseline blocks with no deductions for shortened hours. Reductions in nights, slots, or headcount slabs are treated as Partial Cancellations; refund amounts are assessed manually by Management based on advance notice. Booking advances are non-refundable and credited directly towards booking rent.",
    "lastUpdated": "2026-10-06T00:00:00.000Z"
  },
  "seoMeta": {
    "title": "Contact Us & Directions | Parlak Resort & Farmhouse Keralam",
    "description": "Reach Parlak Resort at Vallivattom, S.N. Puram, Keralam 680661 for stay reservations, venue inquiries, and location directions. Direct call and WhatsApp support at +91 88919 31123.",
    "ogImage": "https://res.cloudinary.com/parlak-resort/image/upload/v1/seo/contact_og.webp",
    "ogUrl": "https://parlakfarmhouse.com/contact"
  }
}
```

### Outbound Contact Page WhatsApp Action Payload
- **Action:** Visitor taps "Send Direct WhatsApp Message" on the contact page.
- **Outbound Link Payload:**
```text
https://wa.me/918891931123?text=Hello%20Parlak%20Resort%20Team%2C%20I%20would%20like%20to%20get%20in%20touch%20regarding%20a%20stay%20or%20event.
```
- **Decoded Message:**
```text
Hello Parlak Resort Team, I would like to get in touch regarding a stay or event.
```
