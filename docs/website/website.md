# Parlak Resort Public Website Architecture & Page Directory

> **AI Agent Navigation & Token Optimization Guide:**
> This repository uses modular, page-wise documentation to drastically reduce token consumption. **Do NOT load the entire documentation set.** Instead, consult only the specific page file relevant to your current task using the directory below.

---

## 1. Core Architectural Mandate: Server-Side Quote Generation

The public website operates under a strict separation of concerns:
- **Read-Only Frontend:** The client reads database inventory and blocked calendar dates via Next.js Server Components and route handlers. It **never writes directly to the database**.
- **Server-Side Quote Generation & On-Screen Estimate:** Pricing calculations, slab matching, and night-by-night modifier resolutions are handled on the server side via `POST /api/inquiry/generate`. This calculation is strictly a **non-binding on-screen estimate** displayed in the customer UI for transparency. Because Price Lists and Price Modifiers can be updated post-save by Admins, the live PostgreSQL catalogue rates in the Admin Panel at the time of manual booking entry and advance payment verification are strictly authoritative.
- **Price-Free WhatsApp Message Template:** To prevent price tampering, spoofing, or customer-edited figures, the pre-filled WhatsApp message template **deliberately excludes quote prices and advance amounts**. It transmits strictly the booking parameters (dates, unit category, room/headcount, guest info, special requests). The Admin verifies the live catalogue price, confirms availability, and sends the advance payment link directly in WhatsApp chat.
- **Zero Client-Side Math:** Client-side quote calculation is **completely removed** to:
  1. **Eliminate Code Duplication:** Domain logic lives exclusively in `lib/pricing.ts`.
  2. **Prevent Client-Side Tampering:** Malicious users cannot forge or edit prices via browser dev tools or URL tampering.
  3. **Establish Single Source of Truth:** Live pricing, weekend surcharges (+-%), and seasonal promotions are evaluated strictly on the server directly from PostgreSQL.
  4. **Zero Persistence / Stateless:** No inquiry state is stored in Redis or the database; calculation is entirely stateless and read-only.
- **Contiguous Physical Unit Availability:** Availability queries (`GET /api/availability`) **strictly confirm that at least one specific physical unit ID is free for the entire contiguous date range** of the multi-night stay, preventing "split-stay" false positives where different rooms are free on disjoint nights.
- **Unit Status & Inactive Visibility:** Inactive units render as "Sold Out" on the public catalog and are strictly excluded from date availability checks and inquiry estimates. The Admin Panel enforces a strict pre-deactivation guard ensuring zero future active bookings exist before any unit can be toggled to Inactive.
- **Kernel-Level Inventory Alignment:** Availability queries (`GET /api/availability`) mirror the authoritative PostgreSQL GiST exclusion constraint (`tstzrange` with `23P01` violation trapping), ensuring public inquiries and WhatsApp handoffs reflect guaranteed non-overlapping physical inventory.
- **Strict Age Thresholds:**
  - **Adult:** 3+ years (requires adult capacity allocation)
  - **Infant:** Under 3 years (sharing existing bed; no separate bedding provided)
- **Currency & Integer Rounding:** All estimated amounts rendered on the client UI enforce explicit integer rounding (`Math.round()` to nearest Rupee) to prevent decimal precision artifacts.
- **Verification Verbiage:** The primary action button on all booking cards is consistently labeled **"Verify via WhatsApp"**.

---

## 2. Page-Wise Documentation Directory

| Page / Subsystem | Markdown Spec File | Target Route / Component | Primary Scope & AI Agent Trigger |
| :--- | :--- | :--- | :--- |
| **Global Layout & Navigation** | [layout.md](file:///Users/thasbeeh/Projects/parlak_resort/docs/website/layout.md) | `app/(public)/layout.tsx` | Site header, navigation bar, social links, footer, persistent floating WhatsApp widget, root SEO meta tags, and global layout data contracts. |
| **Page 1: Home Page** | [home.md](file:///Users/thasbeeh/Projects/parlak_resort/docs/website/home.md) | `app/(public)/page.tsx` | Hero banner, active seasonal promo banner, curated accommodation highlights (Dome, A-Frame, Hall), amenities strip, experiences showcase, and FAQ accordion. |
| **Page 2: Stays Listing** | [stays.md](file:///Users/thasbeeh/Projects/parlak_resort/docs/website/stays.md) | `app/(public)/stays/page.tsx` | Unified filterable catalog (`ALL`, `DOMES`, `A_FRAMES`, `EVENT_HALLS`), responsive unit card grid, base prices, capacity badges, and routing CTAs. |
| **Page 3: Dynamic Unit Detail** | [unit_detail.md](file:///Users/thasbeeh/Projects/parlak_resort/docs/website/unit_detail.md) | `app/(public)/stays/[id]/page.tsx` | Photo gallery slider, mobile sticky booking CTA bar, conditional Room booking card (multi-room selector, occupancy caps, date picker) and Hall inquiry card (slots, contiguous slabs, minimum floor, attached dome bundling). |
| **Inquiry APIs & Pricing Engine** | [inquiry_api.md](file:///Users/thasbeeh/Projects/parlak_resort/docs/website/inquiry_api.md) | `app/api/availability/route.ts`<br>`app/api/inquiry/generate/route.ts`<br>`lib/pricing.ts` | Authoritative pricing engine, `GET /api/availability` (`tstzrange` check), `POST /api/inquiry/generate` data contract, WhatsApp message formatting, and route inventory. |
| **Page 4: Contact Us** | [contact.md](file:///Users/thasbeeh/Projects/parlak_resort/docs/website/contact.md) | `app/(public)/contact/page.tsx` | Direct WhatsApp/phone links, Google Maps interactive embed, operating timings card, swimming pool resident policies, and cancellation guidelines. |
| **SEO & OpenGraph Standards** | [seo.md](file:///Users/thasbeeh/Projects/parlak_resort/docs/website/seo.md) | `app/(public)/**/page.tsx` | Technical SEO checklist, structured schema JSON-LD, metadata generation, and social media card standards. |

---

## 3. High-Level Click-to-WhatsApp Flow

```text
Visitor browses /stays ➔ Selects Unit Category ➔ Views /stays/:id
                         │
                         ▼
Selects Dates ➔ API Confirms Inventory > 0 ➔ Configures Rooms/Guests
                         │
                         ▼
POST /api/inquiry/generate (Server evaluates DB rates & compiles quote)
                         │
                         ▼
Frontend receives verified breakdown & pre-encoded wa.me URL (Zero Client Math)
                         │
                         ▼
Visitor clicks "Verify via WhatsApp" ➔ Redirected to WhatsApp chat with Admin
                         │
                         ▼
Admin verifies live catalogue price in Admin Panel & collects booking advance (UPI/Bank)
                         │
                         ▼
Admin manually creates confirmed booking in Admin Panel ➔ DB blocks calendar
```
