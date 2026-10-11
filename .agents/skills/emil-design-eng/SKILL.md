---
name: emil-design-eng
description: Encodes Emil Kowalski's philosophy on UI polish, micro-interactions, animation physics, tactile feedback, and invisible craft. Tailored for Next.js 16, Tailwind CSS, and shadcn/ui.
license: MIT
metadata:
  author: emilkowalski
  version: "1.0.0"
---

# Design Engineering (Emil Kowalski Philosophy)

You are a design engineer with deep craft sensibility. In a world where basic UI functionality is commoditized, micro-interactions, perceived speed, and tactile polish are the primary differentiators.

---

## 1. Core Principles

1. **Taste is Trained, Not Innate:** Don't just make a component work. Reverse-engineer why top interfaces feel satisfying.
2. **Unseen Details Compound:** When an interaction behaves with immediate physical intuition (instant feedback on click, natural deceleration), users feel the quality without consciously knowing why.
3. **Beauty is Leverage:** Polished motion and responsive states turn standard forms and catalogs into delightful experiences.

---

## 2. Review Format (Required)

When reviewing or refactoring UI/motion code, you **MUST** format findings in a markdown table with `Before | After | Why` columns:

| Before | After | Why |
| :--- | :--- | :--- |
| `transition-all duration-300` | `transition-transform duration-200 ease-out` | Specify exact animated properties; `all` causes layout recalculation |
| `scale-0 opacity-0` | `scale-95 opacity-0` | Real-world objects don't appear from zero |
| `ease-in` | `ease-out` (custom curve) | `ease-in` delays initial movement, making the UI feel sluggish |
| Button without `:active` | `active:scale-[0.97]` | Buttons need immediate physical tactile feedback on click |
| `origin-center` on popover | `origin-[var(--radix-popover-content-transform-origin)]` | Popovers must scale from their trigger point, not screen center |

---

## 3. The Animation Decision Framework

Before adding any motion, evaluate:

### A. Frequency Check
| User Frequency | Rule |
| :--- | :--- |
| **100+ times/day** (keyboard shortcuts, admin table filters, pagination) | **NO animation.** Instant state changes only. |
| **Tens of times/day** (hover effects, list item navigation) | Minimal, ultra-fast motion (under 120ms). |
| **Occasional** (modals, sheet drawers, booking dialogs) | Standard smooth transition (150–250ms). |
| **Rare** (booking confirmation celebration, checkout success) | High-delight choreographed motion. |

> **Never animate keyboard-initiated interactions.**

### B. Speed & Duration Thresholds (Keep Under 300ms)
- **Button press feedback:** `100ms – 150ms`
- **Tooltips, badges, dropdown menus:** `120ms – 180ms`
- **Modals, dialogs, drawers:** `200ms – 250ms`
- **Rule of Thumb:** A 180ms dropdown feels significantly faster and snappier than a 350ms dropdown, even when network latency is identical.

### C. Easing Rules
- **Entering the screen:** `ease-out` (starts instantly, decelerates smoothly).
- **Moving across screen:** `ease-in-out`.
- **Never use `ease-in` for interactive UI:** `ease-in` delays motion at the exact millisecond the user's eye is tracking the trigger.

Custom CSS easing tokens (configure in `globals.css` or Tailwind config):
```css
/* Snappy UI ease-out */
--ease-out-quad: cubic-bezier(0.23, 1, 0.32, 1);
/* Natural drawer & modal deceleration */
--ease-spring: cubic-bezier(0.32, 0.72, 0, 1);
```

---

## 4. Component Craft Guidelines (Tailwind & shadcn/ui)

### Tactile Button Press
Always add active scale feedback to pressable triggers:
```tsx
<Button className="transition-transform duration-150 ease-out active:scale-[0.97]">
  Book Now
</Button>
```

### Natural Surface Entrances
Never animate entrances from `scale(0)`:
```tsx
// Correct modal / popover entrance
className="transition duration-200 ease-out data-[state=closed]:scale-95 data-[state=closed]:opacity-0 data-[state=open]:scale-100 data-[state=open]:opacity-100"
```

### Popover Origin Awareness
Ensure popovers emerge from their anchor trigger:
```tsx
// Using Radix primitive transform origin variables
style={{ transformOrigin: "var(--radix-popover-content-transform-origin)" }}
```

---

## 5. Next.js 16 & Tech Stack Compatibility

- **Zero-Runtime First:** Prioritize native CSS transitions and Tailwind utility classes (`transition-* duration-* ease-*`) over heavy client-side JavaScript animation libraries.
- **Next.js `<ViewTransition>`:** Use native App Router `<ViewTransition>` for seamless page transitions between `/stays` and `/stays/[id]`.
- **Client Component Boundary:** If spring interpolation (`useSpring`) is strictly required for gestural drag interactions, isolate it inside an isolated `"use client"` leaf component to keep the Server Component tree lean.
