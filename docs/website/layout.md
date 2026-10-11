# Global Layout & Navigation Specification (`layout.md`)

> **File Scope & Context for AI Agents:**
> - **Target File / Component:** `app/(public)/layout.tsx` (and global components: Header, Footer, Persistent Contact Widget).
> - **Primary Purpose:** Defines universal chrome, navigation bars, footer legal/contact information, persistent floating WhatsApp widgets, and root SEO/OpenGraph metadata across all public routes.
> - **Key Architecture Covered:** Core architectural principle governing the public site (read-only frontend, complete elimination of client-side quote math, zero direct database writes).
> - **Token Efficiency Note:** Consult or edit this file when modifying global site navigation, footer contact details, the floating contact drawer, or site-wide layout wrappers. For specific page contents, see [home.md](file:///Users/thasbeeh/Projects/parlak_resort/docs/website/home.md), [stays.md](file:///Users/thasbeeh/Projects/parlak_resort/docs/website/stays.md), [unit_detail.md](file:///Users/thasbeeh/Projects/parlak_resort/docs/website/unit_detail.md), or [contact.md](file:///Users/thasbeeh/Projects/parlak_resort/docs/website/contact.md).

---

## 1. Core Architectural Principle: Server-Side Quote Generation & Stateless Inquiries

The public website operates under a strict separation of concerns: the frontend is a **pure presentation and interaction layer** that performs read operations against the database for catalog display and availability checking. It **never performs pricing or quote math, and never writes directly to the database**.

All pricing calculations, headcount slab matching, night-by-night modifier resolutions, required advance calculations, and WhatsApp URL compilations are **handled strictly on the server side** via `POST /api/inquiry/generate`.

### Why Client-Side Quote Calculation is Completely Removed

Client-side quote calculation has been completely eliminated from the frontend architecture to satisfy three foundational engineering mandates:

1. **Eliminates Code Duplication:**
   - Pricing domain rules (night-by-night date iterations, day-of-week parsing in `Asia/Kolkata` IST, weekend override over seasonal discounts, algebraic maximum resolution `MAX(m1, m2)`, contiguous slab matching guaranteed by Zod `superRefine`, date-bounded modifiers via `chk_pricemodifier_dates`, minimum slab opening floors, and multi-room occupancy caps) reside exclusively in a single, authoritative server engine (`lib/pricing.ts`).
   - The React client contains zero lines of duplicate calculation logic, lookup tables, or discount math. If pricing models, slab boundaries, or promotional percentages are modified in the Admin Panel or database, those changes take effect immediately across all users without requiring frontend code edits, bundle recompilations, or cache invalidations.

2. **Prevents Client-Side Tampering:**
   - In a client-side calculation model, tech-savvy users can inspect network payloads, manipulate JavaScript state in browser memory, modify form values via DevTools, or forge URL parameters to fabricate quotes with artificially reduced rents or zero booking advances.
   - Under this server-side architecture, the frontend client only transmits raw inquiry parameters (`checkInDate`, `checkOutDate`, `rooms`, `headcount`, `slotType`, `guestName`). The server validates all boundaries against PostgreSQL, queries active rate cards directly from the database, executes the authoritative calculation, formats the standardized WhatsApp text, and returns the pre-encoded `https://wa.me/` URL. The user cannot alter or forge the financial quote.

3. **Single Source of Truth & Database Integrity:**
   - The PostgreSQL database (via Prisma models `Unit`, `PriceList`, `PriceSlab`, `PriceModifier`) and the server pricing engine represent the sole authoritative financial source.
   - Eliminates synchronization discrepancies between mobile browsers, desktop web, slow networks, stale Service Workers, or cached JavaScript bundles.
   - **Downstream Integrity Guarantees:** When inquiries are converted to confirmed bookings in the Admin Panel, `BookingUnit.unitPrice` is guarded by `chk_booking_unit_price` (`unitPrice >= 0`), and `Booking.netRevenue` is automatically calculated and kept consistent by PostgreSQL trigger `trigger_calculate_net_revenue`.
   - **Zero Persistence / Stateless:** No inquiry state is stored in Redis or the database; calculations are executed entirely stateless and on-demand. All inquiries and reservations route the user to the resort's WhatsApp via the server-generated `https://wa.me/` URL with the action button verbiage **"Verify via WhatsApp"**. Bookings are manually entered into the Admin Panel only after payment verification.

4. **Scope-Based Recalculation & Flat Baseline Blocks Architecture:**
   - **Baseline Scope Preservation:** Initial contracted bookings permanently lock their agreed tariff (`bookedBaseRate`).
   - **Incremental Expansion at Active Rates:** Stay extensions (extra nights, extra hours beyond preset blocks, added Day Slots) evaluate against the active Price List in effect at the time of modification. Headcount upgrades into higher slabs isolate the incremental charge with an algebraic floor ($\max(0, \text{New} - \text{Old Capacity})$).
   - **Flat Baseline Blocks:** Standard preset packages (Overnight 12 PM – 11 AM, Day Slot 10 AM – 3 PM, Event Hall slots) are billed as flat blocks; shortening hours or early checkout yields no deduction.
   - **Universal Scope Reductions (Partial Cancellations):** Any reduction in scope (fewer nights, dropped slots, or lower headcount slabs) acts strictly as a Partial Cancellation with zero automated refunds, subject to manual administrative review.

---

## 2. Global Site Elements (Rendered Across All Pages)

- **Header / Navigation Bar:**
  - Resort Logo (Parlak Resort brand mark).
  - Navigation links: **Home** (`/`), **Stays & Venues** (`/stays`), **Contact Us** (`/contact`).
  - Social Links Bar (Header / Mobile Drawer):
    - Instagram: `https://www.instagram.com/parlak___`
    - Facebook: `https://www.facebook.com/profile.php?id=61550970517881`
    - YouTube: `https://www.youtube.com/@PARLAK-v9s`
  - Prominent CTA button: **"Explore Stays"** (routes directly to `/stays`).

- **Footer:**
  - Physical Address: **Vallivattom, S.N. Puram, Keralam 680661**
  - Direct Calling Phone: `+91 88919 31123` (`+918891931123`)
  - Official Inquiries Email: `info.parlakresort@gmail.com`
  - Official Domain: `parlakfarmhouse.com`
  - Google Map Link: [https://maps.app.goo.gl/GJyr7qpHWfVxWXtP9](https://maps.app.goo.gl/GJyr7qpHWfVxWXtP9)
  - Google Plus Code: `75GP+QP Sreenarayanapuram, Keralam`
  - Embedded Google Maps responsive iframe.
  - Standard Operating Timings summary (Overnight Check-in: 12:00 PM IST | Check-out: 11:00 AM IST Next Day).
  - Social Profiles: Instagram, Facebook, YouTube.
  - Link/Modal to **Cancellation & Refund Policy** (text fetched dynamically from Admin Settings).

- **Persistent Quick Contact Widget (Bottom-Right Corner):**
  - Fixed floating action container visible across all pages and viewports (high z-index).
  - **WhatsApp Direct Button:** One-tap icon opening `https://wa.me/918891931123?text=Hi%20Parlak%20Resort,%20I%20have%20an%20inquiry`.
  - **Direct Call Button:** One-tap phone icon triggering `tel:+918891931123` for instant telephone inquiries.
  - Subtle hover/pulse animation for high visibility without blocking main content.

- **SEO & Social Meta Tags (OpenGraph for WhatsApp Link Previews):**
  - Dynamic `og:title`, `og:description`, `og:image`, `og:url` configured for every page on `https://parlakfarmhouse.com`.
  - Generates rich media preview cards when any link (`/`, `/stays`, `/stays/:id`) is pasted into WhatsApp or social platforms, showing high-res imagery, room type, and base rates instead of an unformatted plain URL.

---

## 3. Global Layout Data Contract (`app/(public)/layout.tsx`)

### Inbound Request Payload (Global Layout)
```typescript
// Incoming HTTP request context resolved by Next.js Server Components
interface GlobalLayoutInboundRequest {
  url: string;                          // e.g. "https://parlakfarmhouse.com/"
  headers: {
    host: string;                       // e.g. "parlakfarmhouse.com"
    "user-agent": string;               // e.g. "Mozilla/5.0 ... WhatsApp/2.24..."
  };
}
```

### Outbound Server Data Payload (Global Site Context)
```json
{
  "siteMetadata": {
    "resortName": "Parlak Resort",
    "tagline": "Luxury Geodesic Domes, Scenic A-Frames & Banquet Venues",
    "domain": "parlakfarmhouse.com",
    "baseUrl": "https://parlakfarmhouse.com",
    "contact": {
      "phoneDisplay": "+91 88919 31123",
      "phoneDial": "+918891931123",
      "whatsappNumber": "918891931123",
      "email": "info.parlakresort@gmail.com",
      "address": "Vallivattom, S.N. Puram, Keralam 680661",
      "googlePlusCode": "75GP+QP Sreenarayanapuram, Keralam",
      "googleMapLink": "https://maps.app.goo.gl/GJyr7qpHWfVxWXtP9",
      "googleMapsEmbedUrl": "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15705.5!2d76.1868!3d10.2769!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNzXigIFHUCtRUCDiiY4gU3JlZW5hcmF5YW5hcHVyYW0sIEtlcmFsYQ!5e0!3m2!1sen!2sin!4v1"
    },
    "socialLinks": {
      "instagram": "https://www.instagram.com/parlak___",
      "facebook": "https://www.facebook.com/profile.php?id=61550970517881",
      "youtube": "https://www.youtube.com/@PARLAK-v9s"
    },
    "timings": {
      "checkIn": "12:00 PM IST",
      "checkOut": "11:00 AM IST Next Day",
      "restaurantClosing": "10:30 PM IST",
      "poolResidentHours": "Open till 10:00 PM (10:00 PM - 11:00 PM on Event Days)"
    }
  },
  "cancellationPolicySummary": "Cancellations permitted via Resort Admin prior to check-in. Custom refund amount credited after administrative verification (recalculated automatically via PostgreSQL netRevenue trigger). Required booking advance payments are dynamically defined per Price List slab, non-refundable, and credited directly towards total rent (security deposits are strictly not tracked or collected). Confirmed reservations preserve agreed baseline tariffs. Stay extensions (extra nights, extra hours, added day slots) and event headcount increases into higher slabs are calculated using the active Price List at modification time (with an algebraic floor for upgrades). Standard preset packages are billed as flat baseline blocks (shortened hours yield no discount). Reductions in scope (fewer nights, dropped slots, lower headcount slabs) act strictly as Partial Cancellations with no automated refunds."
}
```

### Outbound Floating WhatsApp Widget Action Payload
- **Trigger:** Visitor clicks the persistent floating WhatsApp button from any page.
- **Inbound Event:** None (Static Action trigger).
- **Outbound Link Payload:**
```text
https://wa.me/918891931123?text=Hi%20Parlak%20Resort%2C%20I%20have%20an%20inquiry%20regarding%20stay%20and%20event%20bookings.
```
- **Decoded Message:**
```text
Hi Parlak Resort, I have an inquiry regarding stay and event bookings.
```
