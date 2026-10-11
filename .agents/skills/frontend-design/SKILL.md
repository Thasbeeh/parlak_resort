---
name: frontend-design
description: Guidance for distinctive, intentional visual design when building new UI or reshaping existing interfaces. Helps with aesthetic direction, typography, palette selection, and avoiding templated AI clichés. Adapted for Next.js App Router and Tailwind CSS.
license: Apache-2.0
metadata:
  author: anthropics
  version: "1.0.0"
---

# Frontend Design

Approach this as the design lead at a high-end design studio known for giving every client a distinct, memorable visual identity. The client has rejected generic, templated proposals and expects a distinctive point of view: make deliberate, opinionated choices about palette, typography, layout, and visual rhythm that are grounded in the project brief.

---

## 1. Ground Your Designs in the Subject Matter

- **Context-First Design:** For **Parlak Resort**, anchor the design in hospitality, tranquility, nature, and luxury domes. A luxury riverside resort requires an earthy, serene, and tactile atmosphere—never a corporate SaaS dashboard or generic marketing template.
- **Audience & Job:** Guests want an effortless, inspiring booking experience (smart calendar, transparent pricing, high-resolution visual previews, seamless WhatsApp handoff). Admins need dense, clear, high-contrast operational controls.
- **Real Content:** Always design around actual room names (e.g., Luxury Dome, Event Hall), IST operational slots (Overnight 12 PM–11 AM vs Day Slot 10 AM–3 PM), and real pricing slabs. Never rely on generic "Lorem Ipsum" or arbitrary placeholders.

---

## 2. Core Visual Principles

### A. The Hero Section
- Open with the most characteristic visual element of the subject—whether an immersive hero photograph, a tranquil ambient visual, or an interactive stay selector.
- Avoid the cliché pattern: a huge arbitrary stat with a tiny subtitle, a purple gradient background, and a generic pill button.

### B. Typography
- **Personality Carrier:** Typography sets the brand tone. Use at most one or two distinct type families (e.g., an elegant editorial serif or high-craft display paired with a clean geometric sans for UI controls).
- **Measure & Line Length:** Keep body copy under 75–80 characters per line. Body text should have comfortable line-height (`leading-relaxed` / `leading-normal`).
- **Avoid Typographic Clichés:**
  - Do NOT arbitrarily italicize or highlight a single random word in headlines.
  - Do NOT use uppercase for every label or tag.
  - Do NOT clutter cards with redundant eyebrow labels.

### C. Visual Structure & Layout
- **Structure is Information:** Borders, dividers, and grouping should communicate hierarchy and relationship, not act as decorative noise.
- **Meaningful Markers:** Do not add numbered markers (`01`, `02`, `03`) unless the content represents a sequential step-by-step process.
- **Restraint (The Chanel Rule):** Review the completed design and remove at least one decorative element, border, or shadow to let the essential content breathe.

---

## 3. Calibration: Avoiding "AI Slop" & Pseudo-Minimalism

Watch out for overused AI design tropes and pseudo-minimalist traps:
1. **The "Everything Card" Trap (Card Soup):** Wrapping every form section, stat, and list row in separate `rounded-xl border shadow-xs` cards. This is Dribbble aesthetic masquerading as minimalism.
2. **The "Explanatory Subtitle" Epidemic:** Adding descriptive helper sentences under every title, heading, and input (e.g., *"Manual WhatsApp reservation entry • Stored directly on booking record"*). If an input is named "Full Name" or "WhatsApp / Phone", it needs no subtitle.
3. **Internal Tech-Stack Signposting:** Leaking backend implementation details onto user screens (e.g., *"Stage 4 Dynamic Tariff Engine"*, *"GIST Overlap Guard Active"*, *"Protected against GiST concurrency collisions"*). Staff needs clean operations, not database architecture badges.
4. **Input Icon Overkill:** Embedding decorative icons inside simple text fields (👤 in Name, 📞 in Phone, ✉️ in Email, 📄 in Notes). Minimalist forms rely on clean typography and labels.
5. **The "Cream & Terracotta" Trap:** `#F4F1EA` warm cream paired with `#D97757` terracotta accent and a high-contrast serif. Ground your palette in authentic river tokens: Wet Basalt Slate, Deep Forest Moss (`oklch(0.32 0.07 148)`), and Lantern Brass (`oklch(0.68 0.12 78)`).
6. **Gratuitous Motion:** Sliding and fading containers on page scroll. Real physical motion triggers only on direct user intent (100–180ms ease-out).

---

## 4. Admin Desk Invariants & True Minimalism Standards

When designing or editing staff interfaces (`app/admin/*`):

### A. Single Canvas Architecture
- Flatten forms, wizards, and desk overviews into a continuous single canvas.
- Replace boxed card containers with subtle 1px structural hairline dividers (`border-b border-border/60`, `divide-y`, `divide-x`).
- **Zero Card Soup:** Never nest a bordered card inside another bordered card (`card > card`).

### B. Integrated Metric Ribbons
- Never render isolated floating metric cards with large padding and solitary numbers.
- Format summaries as a flush, continuous metric ribbon (`grid-cols-4 divide-x border rounded-lg bg-surface-subtle/30`) with compact height ($48\text{px}\text{–}64\text{px}$).

### C. Clean Inputs & Icon Restraint
- Strip decorative icons from inside standard text inputs. Rely on clean, top-aligned text labels with natural sentence case.
- Restrict icons to actionable buttons (`Wrench`, `Plus`, `Search`) and high-entropy status indicators.

### D. Dual-Surface Split & Neutral Sans Headers
- **Admin Cockpit (`app/admin/*`):** Use neutral geometric sans (`Plus Jakarta Sans` / `--font-sans`, `text-xl sm:text-2xl font-bold tracking-tight text-foreground`), tabular alignment, and 1px hairlines. **NEVER use editorial serif display headers (`Fraunces` / `--font-display`) in admin views.**
- **Public Sanctuary (`app/(public)/*`):** Atmospheric, image-led, relaxed spacing, editorial serif display (`Fraunces` / `--font-display`), single-action WhatsApp CTA.

### E. Operational Density (The 8–12 Viewport Invariant)
- On standard administrative displays (1080p), operational desks (`/admin/units`, `/admin/bookings`, `/admin/pricing`) MUST present **8 to 12 primary entity records** without scrolling.
- If fewer than 6 records fit within the viewport due to decorative padding or oversized cards, convert the view into a **High-Density Tabular Matrix** ($h \approx 40\text{px}\text{–}52\text{px}$ per row).

### F. Thumbnail Sizing Law & Empty State Resilience
- Entity preview thumbnails must never exceed **$36\text{px}$ to $48\text{px}$ square chips** (`size-9` to `size-11 rounded border overflow-hidden`).
- Empty states must be compact fallback badges/icons (`N/A` or subtle placeholder icon) that preserve row height. NEVER render a $150\text{px}\text{–}200\text{px}$ placeholder box inside an operational list.

### G. Label Hygiene & Tabular Numerals
- Always use natural sentence case (`Check-in date`, `Total inventory`). NEVER write `ALL CAPS` or Title Cased boilerplate.
- Eliminate boilerplate prefixes (render `Standard Dome Rate Plan`, NEVER `Attached Rate Plan: Standard Dome Rate Plan`).
- Mandatory `font-mono tabular-nums` (`JetBrains Mono`) for all financial figures (`₹&nbsp;4,500`), counts (`12&nbsp;Pax`), time slots (`10:00&nbsp;–&nbsp;15:00`), and dates.
- Mandatory non-breaking spaces between currency symbols and amounts: `₹&nbsp;4,500`; between quantities and units: `3&nbsp;Adults`; in keyboard shortcuts: `⌘&nbsp;K`.

### H. Emil Kowalski Tactile Physics & Mobile-Native
- All interactive triggers must have tactile physical compression: `active:scale-[0.98]` (or `active:scale-95` for icon buttons) with `transition-transform duration-100 ease-[var(--ease-snappy)] select-none`.
- Zero scroll-triggered animations.
- Ensure inputs use `text-base md:text-xs` (16px minimum on mobile touch) to avoid iOS Safari auto-zooming.

---

## 5. Stack Integration: Tailwind CSS & shadcn/ui

- **Color Tokens:** Translate palette choices into semantic CSS variables in `globals.css` (`--background`, `--foreground`, `--primary`, `--accent`) so shadcn/ui components inherit the custom art direction automatically.
- **Tailwind Utility Discipline:** Apply styles using semantic classes (`bg-background text-foreground ring-ring`) rather than hardcoded hex classes (`bg-[#1a1a1a]`).
- **Primacy of Content:** Prioritize large, beautiful imagery (Cloudinary CDN) and crisp typographic rhythm over decorative widgets.

---

## 6. Cross-Platform & Cross-Browser Engineering Invariants (Chrome, Safari, Mac, iPhone, Android)

To guarantee flawless operational rendering and touch ergonomics across Chromium (Chrome on Desktop & Android), Apple WebKit (Safari on macOS, iPhone iOS, and iPadOS), all frontend components must strictly adhere to the following laws:

### A. Mobile Viewports & Native Touch Invariants (iPhone iOS & Android)
1. **Dynamic Viewport Heights:**
   - Use `h-[100dvh]` for app shells, overlays, and slide-over drawers; use `min-h-[100svh]` for hero sections.
   - Eliminates layout jumps when the address bar expands/collapses on Android Chrome, and prevents the bottom toolbar from obscuring content on iOS Safari.
2. **Safe Area Inset Handling (`env(safe-area-inset-*)`):**
   - All fixed bottom controls (sticky WhatsApp bars, mobile thumb bars, folio actions) must incorporate `pb-[calc(1rem+env(safe-area-inset-bottom))]` paired with `viewportFit: "cover"` in `app/layout.tsx` to clear the iPhone Home Indicator and Android gesture pill.
   - Sticky top headers must respect `pt-[env(safe-area-inset-top)]` on notched or Dynamic Island devices.
3. **iOS Zoom Guard on Form Inputs:**
   - Form inputs must ALWAYS compute to $\ge 16\text{px}$ on touch screens (`text-base md:text-xs` or `text-base md:text-sm`).
   - If font size is under 16px, iOS Safari automatically triggers an unrequested viewport zoom on focus that disorients the user.
4. **Sticky Hover Prevention:**
   - Touch devices lack a persistent mouse pointer; tapping triggers `:hover` that remains stuck until another element is tapped.
   - Strictly gate hover effects behind `@media (hover: hover) and (pointer: fine)`.
   - Never apply blanket resets like `*:hover { inherit }` which turn buttons transparent on Safari and touch devices.
5. **Tap Highlight & Selection Guard:**
   - Apply `-webkit-tap-highlight-color: transparent` and `touch-action: manipulation` globally to eliminate delay and gray tap flashes.
   - Apply `select-none [-webkit-user-select:none]` to buttons, tabs, segmented pills, and table row toggles to prevent accidental text selection callouts on repetitive tapping.

### B. Mac & Safari Desktop (WebKit)
1. **The Replaced Element Rule for Inputs:**
   - `<input>` is a browser-replaced element with internal WebKit shadow DOM. It must NEVER have `display: flex`. Always use block or inline-block.
2. **The `h-8` Padding Invariant:**
   - Fixed height $32\text{px}$ (`h-8`) inputs require `py-1` ($4\text{px}$), never `py-2` ($8\text{px}$). $16\text{px}\text{ padding} + 2\text{px}\text{ border} = 18\text{px}$, leaving only $14\text{px}$ in WebKit, vertically displacing text downwards and clipping caret cursors.
3. **The `type="search"` Ban on Admin Filter Bars:**
   - Never use `type="search"`. WebKit injects native search chrome (`::-webkit-search-cancel-button` and magnifying icons) that alters internal padding and misaligns text vertically. Always use `type="text"` with `spellCheck={false}` and custom clear buttons (`X`).
4. **Native Select & Form Control Decoupling:**
   - `<select>` dropdowns must specify `appearance-none [-webkit-appearance:none] pl-2.5 pr-7 py-1 leading-none h-8` paired with an absolute SVG `ChevronDown` to prevent macOS Aqua styling and vertical clipping.
5. **Retina Table Hairline Law (`border-separate border-spacing-0`):**
   - High-density administrative tables inside scroll containers must use `border-separate border-spacing-0` instead of `border-collapse` to avoid subpixel border doubling and disappearing lines on Retina screens.
   - Because WebKit ignores `divide-y` on `<tbody>` under `border-separate`, every `<th>` and `<td>` must explicitly apply `border-b border-border` (or `border-b border-border/60`).
6. **Two-Tier Clean Structural Toolbar Invariant:**
   - Category/status ribbons on Tier 1 with `overflow-x-auto [-webkit-overflow-scrolling:touch]` and brand Deep River Moss active pills (`bg-primary text-primary-foreground font-medium shadow-xs`).
   - Query inputs and counters on Tier 2. Prevents flex-item squashing and horizontal clipping on 13"/14" MacBook viewports.

### C. Chrome & Chromium Desktop & Android
1. **Flexbox & Grid Min-Width Zero (`min-w-0`):**
   - Flex children and CSS grid cells default to `min-width: auto` in Chrome, causing columns with long text, URLs, or monospace numbers to expand beyond screen bounds.
   - Always apply `min-w-0` to flex child containers, KPI card wrappers, and table text columns to enable proper truncation (`truncate`) and prevent horizontal blowout on Android Chrome.
2. **SVG Icon Shrink Guard (`shrink-0`):**
   - Always apply `shrink-0` to SVG icons inside buttons, badges, and table rows to prevent Chromium and WebKit flexbox from flattening icons into ovals when viewports shrink.
3. **Scroll Momentum & Kinetic Containment:**
   - Apply `[-webkit-overflow-scrolling:touch]` and `overscroll-behavior-x: contain` to horizontal tab ribbons to ensure smooth kinetic swiping without inadvertently triggering history swipe navigation on Android or Mac trackpads.
4. **Font Metrics & Numerical Stability (`font-mono tabular-nums`):**
   - Financial figures (`₹&nbsp;4,500`), counts (`12&nbsp;Pax`), times (`10:00–15:00`), and dates must always use `tabular-nums font-mono` to prevent width jitter across Chrome, Safari, and Android default fonts during live polling.

