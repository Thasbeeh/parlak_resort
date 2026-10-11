<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Parlak Resort Frontend Architecture & Anti-AI-Slop Governance

When designing, building, or modifying frontend interfaces across Parlak Resort, you MUST strictly uphold the following design system invariants (`admin-front-end-2.md`):

### 1. True Operational Minimalism & Single Canvas Architecture

- **Single Canvas over Container Soup:** Flatten forms, wizards, and desk overviews into a continuous single canvas. Replace floating cards with subtle 1px structural hairline dividers (`border-b border-border/60`, `divide-y`, `divide-x`).
- **Zero Card Soup:** Never nest a bordered card inside another bordered card (`card > card`). Ban redundant outer wrappers, inner card trays, and floating boxes.
- **Summary KPI Cards:** Standard modular summary KPI cards (`grid-cols-2 md:grid-cols-4 gap-4`) with top-aligned category labels, icon badges, prominent values, and contextual subtitles are supported. Ensure responsive layouts and clean alignment.

### 2. Elimination of Explanatory Subtitles & Internal Tech Tags

- **Zero Boilerplate Subtitles:** Eliminate explanatory sentences and helper paragraphs under standard form section titles and field labels (e.g. NEVER add "Manual WhatsApp reservation entry • Stored directly on booking record" or "Flat baseline blocks • Standardized IST operating windows"). Let high-contrast labels speak for themselves.
- **Zero Internal Tech Stack Signposting:** Strip developer jargon, stage milestones, and backend implementation notes from user-facing UI (e.g. NEVER render badges or captions like `Stage 4 Dynamic Tariff Engine`, `GIST Overlap Guard Active`, or `Protected against GiST concurrency collisions`). Staff needs operational clarity, not database implementation details.

### 3. Decorative Icon Stripping & Input Cleanliness

- **Clean Inputs:** Strip decorative icons (`👤`, `📞`, `✉️`, `📄`) from inside simple text inputs. Inputs must rely on clean, top-aligned text labels with natural sentence case.
- **Purposeful Glyphs Only:** Restrict icons strictly to actionable buttons (`Wrench`, `Plus`, `Search`) and critical status indicators.

### 4. Dual-Surface Architectural Split & Neutral Sans Headers

- **Admin Cockpit (`app/admin/*`):** High-density, neutral geometric sans (`Plus Jakarta Sans` / `--font-sans`, `text-xl sm:text-2xl font-bold tracking-tight text-foreground`), tabular alignment, 1px hairlines, 0ms client-side filter response, and instant keyboard shortcuts (`⌘K`, `⌘1`–`⌘5`). **NEVER use editorial serif display headers (`Fraunces` / `--font-display`) or marketing-style hero banners in admin views.**
- **Public Sanctuary (`app/(public)/*`):** Atmospheric, image-led, relaxed spacing, editorial serif display (`Fraunces` / `--font-display`), single-action WhatsApp CTA.

### 5. The 8–12 Viewport Invariant (Operational Density)

- On standard administrative displays (1080p), operational desks (`/admin/units`, `/admin/bookings`, `/admin/pricing`) MUST present **8 to 12 primary entity records** without requiring vertical scrolling.
- If fewer than 6 records fit within the viewport due to decorative padding or oversized cards, immediately convert the view into a **High-Density Tabular Matrix** ($h \approx 40\text{px}\text{–}52\text{px}$ per row).

### 6. Thumbnail Sizing Law & Empty State Resilience

- In administrative tables, lists, and operational overviews, entity preview thumbnails MUST NEVER exceed **$36\text{px}$ to $48\text{px}$ square chips** (`size-9` to `size-11 rounded border overflow-hidden`).
- Empty states (e.g. "No cover photo") must be compact fallback badges/icons (`N/A` or subtle placeholder icon) that preserve row height. NEVER render a $150\text{px}\text{–}200\text{px}$ placeholder box inside an operational list.

### 7. Label Hygiene & Typographic Restraint

- **Sentence Case:** Always use natural sentence case for labels, buttons, and table headers (`Check-in date`, `Add line item`, `Total inventory`). NEVER write `ALL CAPS` or Title Cased boilerplate.
- **Eliminate Boilerplate Prefixes:** Display the data directly without redundant prefixes (e.g., render `Standard Dome Rate Plan`, NEVER `Attached Rate Plan: Standard Dome Rate Plan`).
- **Tabular Numerals & Monospace:** Mandatory `font-mono tabular-nums` (`JetBrains Mono`) for all financial figures (`₹&nbsp;4,500`), counts (`12&nbsp;Pax`), time slots (`10:00&nbsp;–&nbsp;15:00`), and dates.
- **Non-Breaking Spaces:** Mandatory between currency symbols and amounts: `₹&nbsp;4,500`; between quantities and units: `3&nbsp;Adults`; in keyboard shortcuts: `⌘&nbsp;K`.
- **Real Typographic Punctuation:** Use curly quotes (`“”`), em/en dashes (`—`, `–`), and real ellipsis (`…`), never `...`.

### 8. Emil Kowalski Interaction Standards & Mobile-Native

- **Tactile Compression:** All interactive triggers (buttons, tabs, stepper controls) must incorporate tactile physical compression: `active:scale-[0.98]` (or `active:scale-95` for icon buttons) with `transition-transform duration-100 ease-[var(--ease-snappy)] select-none`.
- **Zero Scroll Triggers:** Never attach entrance animations to page scroll. Animations trigger strictly on user intent (100–180ms ease-out).
- **Mobile Input Zoom Prevention:** Ensure inputs use `text-base md:text-xs` (16px minimum on mobile touch) to avoid iOS Safari auto-zooming.

### 9. Safari WebKit Layout Invariants (Anti-Layout Corruption)

- **Table Model Invariant:** ALL administrative tables MUST use `border-collapse` (`<table className="w-full border-collapse ...">`). NEVER use `border-separate` combined with `divide-y` on `<tbody>`.
- **Row Divider Law:** Row hairline borders MUST be declared directly on `<tr>` (`className="border-b border-border/60 ..."`), NEVER as `divide-y` on `<tbody>`.
- **Table Cell Text Truncation:** NEVER apply `truncate`, `max-w-*`, or `overflow-hidden` directly to `<td>` or `<th>` (`display: table-cell`). Always wrap cell contents inside an inner block container (`<div className="min-w-0 max-w-[200px] truncate">`).
- **Flex Shell Containment:** Every administrative flex shell level MUST declare `min-w-0 w-full max-w-full`. Administrative content areas must prevent horizontal page blowout with `overflow-x-hidden` at the shell level.
- **Native Select Styling:** All native `<select>` controls must declare `appearance-none [-webkit-appearance:none] text-base md:text-sm` with a paired chevron icon to prevent WebKit widget layout collapse.
