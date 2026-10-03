# Comprehensive Tech Stack & Services Architecture (5-Day Scope)

> **Mandate:** $0 Total Cost across Development, Testing, and Production Deployment. Optimized for rapid delivery within a strict 5-day deadline.

---

## 1. Architectural Strategy: Unified Full-Stack Next.js

Instead of splitting the project into separate frontend, backend, and admin repositories (which causes CORS headaches, duplicate types, and deployment complexity), the entire system will be built as a **Single Full-Stack Monorepo** using Next.js.

```text
parlak_resort/
├── app/
│   ├── (public)/          # Public Website (/, /stays, /stays/[id], /contact)
│   │   ├── layout.tsx     # Public Layout (Navbar, Footer, Floating WhatsApp Widget)
│   │   └── page.tsx
│   ├── admin/             # Secure Admin Panel (/admin/dashboard, /admin/bookings, etc.)
│   │   ├── layout.tsx     # Admin Sidebar & Header
│   │   ├── bookings/
│   │   ├── units/
│   │   └── settings/
│   └── api/               # Minimal Webhooks / External API endpoints
├── components/            # Shared UI components (shadcn/ui, Tailwind)
├── lib/                   # Database client, auth, date helpers, pricing math
└── prisma/                # Schema, custom GiST migrations, seed script
```

---

## 2. Complete Technology Stack Matrix

| Layer | Technology / Service | License / Tier | Key Purpose |
| :--- | :--- | :--- | :--- |
| **Core Framework** | **Next.js 16 (App Router)** | MIT (Open Source) | Unified React Server Components, Server Actions, and SSR |
| **Language** | **TypeScript 5+** | Open Source | End-to-end type safety between database schema and UI forms |
| **Styling** | **Tailwind CSS** | MIT | Rapid styling, zero CSS runtime, built-in responsive utilities |
| **UI Primitives** | **shadcn/ui + Radix UI** | MIT | Accessible Accordion (FAQ), Dialogs (Modals), Tabs, Popovers |
| **Icons** | **Lucide React** | ISC | Modern, lightweight icons across public site and admin panel |
| **Database Engine** | **PostgreSQL 16** | Open Source | Native support for `btree_gist` and `tstzrange` exclusion constraints |
| **Cloud Database** | **Neon Database** | **Free Tier ($0/mo)** | Serverless PostgreSQL with auto-suspend (scale-to-zero) & pooling |
| **ORM / Query Engine**| **Prisma ORM** | Apache 2.0 | Type-safe migrations, seeding, and database queries |
| **Validation** | **Zod 4** | MIT | Runtime schema validation for Server Actions and WhatsApp payloads |
| **Form Handling** | **React Hook Form** | MIT | High-performance uncontrolled form handling with Zod resolvers |
| **Date Arithmetic** | **date-fns** | MIT | Lightweight date math, duration formatting, and IST timezone handling |
| **Client-Side Cache** | **SWR** | MIT | Lightweight (~4 kB) caching with native Next.js integration, zero-config window-focus refetch, and 30s polling |
| **Authentication** | **jose + HTTP-only Cookie** | MIT | Lightweight signed JWT sessions via Web Crypto (zero React 19/Next 16 peer-dep conflicts) |
| **Media & CDN** | **Cloudinary** | **Free Tier ($0/mo)** | Dynamic image upload, auto WebP/AVIF transforms, thumbnail generation, and global media CDN |
| **Hosting & CI/CD** | **Vercel** | **Hobby Tier ($0/mo)** | Auto-deployment from Git, global CDN, serverless execution, free SSL |

---

## 3. Layer-by-Layer Technical Specification

### A. Frontend & UI Stack
- **Next.js 16 App Router (RSC, React 19.2 & Server Actions):**
  - Public pages (`/`, `/stays`, `/stays/:id`) render as fast Server Components with cached database reads. Uses `<ViewTransition>` for smooth native-app-like page transitions.
  - Admin Panel uses Server Actions (`"use server"`) paired with `updateTag()` for instant "read-your-writes" consistency on booking mutations.
  - Auth route protection implemented via `proxy.ts` (Next.js 16 network boundary).
- **Tailwind CSS + shadcn/ui:**
  - Standardized color palette (warm resort greens, luxury neutral accents, dark text).
  - Uses copy-paste Radix primitives: `Accordion` (FAQ), `Dialog` (Booking Edit Modal), `Tabs` (Stay Type: Overnight vs Day Slot), `DropdownMenu`.
- **Client-Side Data Fetching & Sync (SWR):**
  - **Native Vercel Integration:** Developed by Vercel for seamless compatibility with Next.js 16 App Router without React 19 peer-dependency conflicts.
  - **Zero Hydration Boilerplate:** Operates immediately in `"use client"` components without wrapping layouts in heavy providers or configuring hydration boundaries (unlike TanStack Query).
  - **Out-of-the-Box Sync:** Built-in `revalidateOnFocus: true` (instantly updates calendar/metrics when returning from WhatsApp) and `refreshInterval: 30000` (30s background polling).
- **Receipt Printing Engine:**
  - Native CSS `@media print` stylesheets designed to format cleanly on standard A4 or thermal receipt printers right from the browser (`window.print()`), saving hours compared to complex PDF canvas libraries.

---

### B. Database & Concurrency Stack

#### Neon PostgreSQL (Cloud Production)
- **Tier:** Free Forever ($0/month).
- **Compute:** 100 Compute Unit (CU) hours per month. Because Neon scales to zero after 5 minutes of inactivity and the panel is used by only 3 admins, monthly consumption will stay under **15–20 CU-hours**.
- **Storage:** 1 GB storage included (ample for 50,000+ booking records).
- **Egress:** 5 GB outbound data transfer/month (ample for lightweight JSON responses).
#### Connection Strategy (PgBouncer + Direct Migration URL)
Because serverless functions can quickly exhaust PostgreSQL connections, Neon uses built-in PgBouncer. To ensure 100% compatibility with Prisma migrations, the schema uses Prisma's dual-URL pattern:
```prisma
// prisma/schema.prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL") // Pooled PgBouncer URL (for serverless runtime queries)
  directUrl = env("DIRECT_URL")   // Direct unpooled URL (required for migrations & DDL locks)
}
```

#### Database-Level Overlap Protection (GiST Constraint)
Because Prisma's schema DSL does not natively express `EXCLUDE USING gist`, the constraint is applied via a clean custom SQL migration:
1. Run `npx prisma migrate dev --create-only --name add_gist_constraint`
2. Append the SQL snippet into the generated `migration.sql`:
```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "BookingUnit"
ADD CONSTRAINT no_overlapping_unit_bookings
EXCLUDE USING gist (
  "unitId" WITH =,
  tsrange("startDatetime", "endDatetime") WITH &&
)
WHERE (status NOT IN ('CANCELLED'));
```
3. Apply with `npx prisma migrate deploy`.

---

### C. Authentication & Security (Admin Panel)

- **Authentication Method:** Lightweight signed JWT session in HTTP-only cookies using **`jose`** (native Web Crypto, zero peer dependency issues with React 19.2) + **`bcryptjs`** password hashing.
- **Accounts:** Strictly 3 seeded Admin accounts. No public registration or guest login.
- **Route Protection:** Next.js 16 **`proxy.ts`** intercepts all `/admin/*` routes (except `/admin/login`) and validates the signed JWT cookie at the edge. Unauthorized requests instantly redirect to `/admin/login`.

---

### D. Testing & Quality Assurance Stack

| Testing Category | Tool | Scope / What It Tests |
| :--- | :--- | :--- |
| **Unit Testing** | **Vitest** | Pricing calculation engine, seasonal percentage modifiers, slab lookups, time overlap formulas. |
| **Concurrency Testing** | **Node.js Test Script (`scripts/test-race.ts`)** | Simulates 2 simultaneous booking requests for the exact same Dome to verify PostgreSQL throws `409 Conflict`. |
| **Smoke & E2E Testing** | **Playwright** (Local) | Tests the critical path: Loading public `/stays`, selecting dates, generating the WhatsApp URL, and Admin login. |
| **Static Analysis** | **TypeScript Compiler (`tsc`) & ESLint** | Validates types and catches syntax bugs prior to git push. |

---

### E. Hosting, Deployment & DevOps Stack

- **Hosting Platform:** **Vercel (Hobby Tier - Free)**
  - Git integration: Pushing to `main` triggers automated linting, building, and zero-downtime deployment.
  - Automatic HTTPS / SSL certificates issued via Let's Encrypt.
  - Edge network caches public landing pages for instant load times worldwide.
- **Version Control:** **GitHub** (Free private repository + GitHub Actions CI).
- **Environment Variables Management:**
  - Vercel Environment Variables dashboard (`DATABASE_URL`, `DIRECT_URL`, `ADMIN_JWT_SECRET`, `NEXT_PUBLIC_RESORT_PHONE`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`).
  - Synced locally via `.env.local` / `.env`.

---

### F. Media Storage & Image CDN (Cloudinary)

- **Role:** Dedicated media storage and global CDN for dynamic room, venue, and gallery photos uploaded by the Admin.
- **Client Direct Upload:** Browser uploads photos directly to Cloudinary via signed/unsigned REST presets, preventing 3MB payload memory spikes on Vercel Serverless Functions.
- **On-the-Fly Dynamic Transforms:** Auto-generates responsive WebP/AVIF formats and custom thumbnails (`w_400,h_300,c_fill,f_auto,q_auto`) with zero local compute or `sharp` overhead.
- **WhatsApp OpenGraph Compatibility:** Generates immutable public HTTPS URLs scraped cleanly by WhatsApp crawlers for rich link previews.
- **Backend Node SDK (`cloudinary`):** Lightweight Node.js SDK used in Server Actions exclusively for secure signed uploads and image deletion safeguards (`cloudinary.v2.uploader.destroy`).

---

## 4. Free Tier Limits & Safety Assurance

| Service | Free Tier Quota | Parlak Resort Projected Monthly Usage | Safety Margin |
| :--- | :--- | :--- | :--- |
| **Neon Compute** | 100 CU-hours / month | ~12–18 CU-hours (3 admins with scale-to-zero) | **82% Safety Buffer** |
| **Neon Storage** | 1 GB (1,000 MB) | ~15–30 MB (1 year of text booking records) | **97% Safety Buffer** |
| **Neon Egress** | 5 GB / month | < 500 MB / month | **90% Safety Buffer** |
| **Cloudinary Storage** | 25 GB / month | ~90 MB (~60 photos total) | **>99% Safety Buffer** |
| **Cloudinary Bandwidth** | 25 GB / month | ~2.25 GB / month (<1,000 visitors) | **91% Safety Buffer** |
| **Vercel Bandwidth** | 100 GB / month | ~2–5 GB / month (HTML/JS/CSS assets) | **95% Safety Buffer** |
| **Vercel Serverless Exec** | 100 GB-hours / month | < 5 GB-hours / month | **95% Safety Buffer** |
| **Vercel Deployments** | 100 builds / day | ~5–10 builds / day during sprint | **90% Safety Buffer** |

---

## 5. 5-Day Implementation Roadmap

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ DAY 1: Foundation, Database & Auth                                          │
│ • Next.js + Tailwind + shadcn/ui initialization                             │
│ • Prisma Schema: Units, Bookings, BookingUnits, Slabs, Settings             │
│ • PostgreSQL GiST exclusion constraint migration                            │
│ • Seed 3 Admin credentials & Setup Auth Middleware                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ DAY 2: Admin Panel - Units & Pricing Engine                                 │
│ • Dynamic Units CRUD (Max capacity, Amenities checkboxes, Deposit setting)  │
│ • Dynamic Slab Pricing & Required Deposit configuration                     │
│ • Seasonal Promotions Engine (Percentage Modifier variance calculation)     │
├─────────────────────────────────────────────────────────────────────────────┤
│ DAY 3: Admin Panel - Bookings, Concurrency & Invoicing                       │
│ • Manual Booking Creation form (Overnight vs Day Slot 10 AM-3 PM presets)   │
│ • Event Hall Booking flow + Dome bundling (Creation-only validation)        │
│ • Concurrency test: Catch 409 DB exclusion error with user-friendly alert   │
│ • Pre-checkout "Add Line Item" tool & Print Receipt CSS                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ DAY 4: Public Website (Read-Only Funnel)                                    │
│ • Landing page: Hero, Amenities, Activities, and FAQ Accordion              │
│ • Unified `/stays` listing catalog with category filters                    │
│ • Dynamic `/stays/:id` unit detail: Smart Date Picker + Multi-Room Stepper  │
│ • Structured `wa.me` WhatsApp message compiler                              │
│ • OpenGraph meta tags & Mobile sticky CTA bar                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ DAY 5: Testing, Hardening, Polish & Deployment                              │
│ • Concurrency race-condition verification with `scripts/test-race.ts`       │
│ • SWR window-focus refetch validation on Admin dashboard                    │
│ • Vercel production deployment + Neon connection pool binding               │
│ • Staff walkthrough & handover                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```
