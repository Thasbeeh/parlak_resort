# Parlak Resort Admin & Design System Specification

> **Architectural Standard & UI Design System**  
> **Target Framework:** Next.js 16 (React 19.2) • Tailwind CSS v4 • Base UI / Radix • TypeScript 5+  
> **Core Skills Referenced:** `parlak-domain` • `frontend-design` • `emil-design-eng` • `modern-web-guidance` • `web-design-guidelines` • `mobile-native`  
> **Guiding Mandate:** Zero AI Slop. High tactile craft, immediate perceived speed, and rooted riverside hospitality.

---

## 1. Executive Design Manifesto & Anti-AI-Slop Governance

Most AI-generated frontend code degenerates into generic templates: warm cream paired with terracotta, cards nested within cards with blurry drop shadows, gratuitous scroll-fade animations, and decorative UI widgets that slow down actual work. 

The **Parlak Resort** design system is strictly engineered against these clichés:

```
┌──────────────────────────────────────────────┬──────────────────────────────────────────────┐
│            THE "AI SLOP" CLICHÉ              │            PARLAK RESORT REALITY             │
├──────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ 1. The "Cream & Terracotta" Default          │ Wet Basalt Slate, Forest Moss & Lantern Brass│
│    #F4F1EA cream + #D97757 terracotta paired │ Grounded in Kerala riverside flora, dark     │
│    with generic Playfair Display serif.      │ timber, and warm evening dusk ambience.      │
├──────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ 2. The "Everything Card" Epidemic            │ Architectural Structural Linework:           │
│    Wrapping every stat, form field, and      │ Crisp 1px hairlines, structural dividers,    │
│    table row in floating rounded-2xl cards.  │ and generous negative space. Zero card soup. │
├──────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ 3. Gratuitous Scroll Motion                  │ Emil Kowalski Perceived Speed Framework:     │
│    Sliding and fading every container on     │ Zero scroll triggers. Motion responds strictly│
│    page scroll via heavy JS libraries.       │ to user intent (100–220ms, ease-out curves). │
├──────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ 4. Typographic Posturing                     │ Purposeful Editorial Rhythm:                 │
│    Arbitrarily italicizing *one* word in a   │ Natural casing, strict hierarchy, and body   │
│    heading; over-tracked uppercase tags.     │ line lengths strictly capped under 70ch.     │
├──────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ 5. Homogenous SaaS Look for All Screens      │ Intentional Dual-Surface Split:              │
│    Using identical airy landing page styles  │ • Public Web: Tactile riverside sanctuary.   │
│    inside the operational booking desk.      │ • Admin Desk: Dense, high-contrast cockpit.  │
└──────────────────────────────────────────────┴──────────────────────────────────────────────┘
```

### The Dual-Surface Architectural Split

```
                              ┌─────────────────────────────┐
                              │     ATOMIC DESIGN TOKENS    │
                              │  OKLCH Colors, Radius, Font │
                              └──────────────┬──────────────┘
                                             │
                     ┌───────────────────────┴───────────────────────┐
                     ▼                                               ▼
      ┌──────────────────────────────┐                ┌──────────────────────────────┐
      │   PUBLIC SANCTUARY (GUESTS)  │                │    ADMIN COCKPIT (STAFF)     │
      ├──────────────────────────────┤                ├──────────────────────────────┤
      │ • Route: app/(public)/*      │                │ • Route: app/admin/*         │
      │ • High atmosphere, image-led │                │ • High density tabular grid  │
      │ • Generous breathing room    │                │ • Zero latency (0ms filter)  │
      │ • Editorial display serif    │                │ • Clean functional borders   │
      │ • Single-action WhatsApp CTA │                │ • Instant OCC & GiST traps   │
      │ • Read-only server quotes    │                │ • Native @media print bills  │
      └──────────────────────────────┘                └──────────────────────────────┘
```

---

## 2. Colours & Surface Tokens (OKLCH Precision)

Tailwind CSS v4 allows defining color tokens using the perceptual **OKLCH** color space. This prevents banding and maintains uniform perceptual contrast across both light and dark operational modes.

### A. Core Palette Philosophy
- **Wet Basalt Slate (`--foreground`):** Deep charcoal with a subtle forest-green undertone (`oklch(0.22 0.02 140)`). Never pure `#000000`.
- **Deep Forest Moss (`--primary`):** Authoritative, calm green representing riverside vegetation (`oklch(0.32 0.07 148)`).
- **Alabaster Stone Canvas (`--background`):** Warm, tactile mineral paper surface (`oklch(0.985 0.005 85)`). Never cold `#ffffff`.
- **Lantern Brass (`--color-brass`):** Dusk lantern glow accent for interactive focus rings and active status indicators (`oklch(0.68 0.12 78)`).
- **Subtle Surface Tint (`--surface-subtle`):** Flat background for table rows and input trays (`oklch(0.96 0.008 85)`).

### B. Tailwind CSS v4 Configuration (`app/globals.css`)

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --font-display: var(--font-display);
  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);

  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-surface-subtle: var(--surface-subtle);
  
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);

  /* Animation Timing Easing Tokens */
  --ease-snappy: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-spring: cubic-bezier(0.32, 0.72, 0, 1);
}

:root {
  /* Sanctuary / Admin Light Mode (Warm Alabaster Stone) */
  --background: oklch(0.985 0.005 85);
  --foreground: oklch(0.22 0.02 140);
  --surface-subtle: oklch(0.96 0.008 85);
  
  --card: oklch(0.99 0.003 85);
  --card-foreground: oklch(0.22 0.02 140);
  --popover: oklch(0.99 0.003 85);
  --popover-foreground: oklch(0.22 0.02 140);
  
  --primary: oklch(0.32 0.07 148);              /* Deep River Moss */
  --primary-foreground: oklch(0.99 0.005 85);
  
  --secondary: oklch(0.94 0.012 80);            /* River sand tone */
  --secondary-foreground: oklch(0.25 0.03 140);
  
  --muted: oklch(0.94 0.008 85);
  --muted-foreground: oklch(0.48 0.02 140);     /* High contrast muted text (WCAG AAA) */
  
  --accent: oklch(0.93 0.015 85);
  --accent-foreground: oklch(0.22 0.02 140);
  
  --border: oklch(0.89 0.012 85);               /* Tactile hairline divider */
  --input: oklch(0.89 0.012 85);
  --ring: oklch(0.68 0.12 78);                  /* Warm Lantern Brass */
  
  --destructive: oklch(0.55 0.20 25);           /* Crisp Crimson */
  --destructive-foreground: oklch(0.99 0 0);
  --warning: oklch(0.68 0.16 65);               /* Deep Amber */
  --warning-foreground: oklch(0.18 0.05 65);
  --success: oklch(0.52 0.14 145);              /* Emerald Moss */
  --success-foreground: oklch(0.99 0 0);

  --radius: 0.5rem;                             /* 8px base radius */
}

.dark {
  /* Admin Night Shift / Twilight Mode (Wet Basalt Slate) */
  --background: oklch(0.18 0.02 145);
  --foreground: oklch(0.96 0.008 85);
  --surface-subtle: oklch(0.22 0.025 145);
  
  --card: oklch(0.20 0.022 145);
  --card-foreground: oklch(0.96 0.008 85);
  --popover: oklch(0.20 0.022 145);
  --popover-foreground: oklch(0.96 0.008 85);
  
  --primary: oklch(0.88 0.05 148);
  --primary-foreground: oklch(0.18 0.02 145);
  
  --secondary: oklch(0.26 0.025 145);
  --secondary-foreground: oklch(0.96 0.008 85);
  
  --muted: oklch(0.26 0.02 145);
  --muted-foreground: oklch(0.68 0.02 145);
  
  --accent: oklch(0.26 0.025 145);
  --accent-foreground: oklch(0.96 0.008 85);
  
  --border: oklch(0.28 0.02 145);
  --input: oklch(0.28 0.02 145);
  --ring: oklch(0.68 0.12 78);
  
  --destructive: oklch(0.62 0.22 25);
  --destructive-foreground: oklch(0.99 0 0);
  --warning: oklch(0.72 0.16 65);
  --warning-foreground: oklch(0.18 0.05 65);
  --success: oklch(0.60 0.15 145);
  --success-foreground: oklch(0.99 0 0);
}
```

---

## 3. Typography & Tabular Data System

Typographic discipline provides clarity and structure. Every typeface has a designated responsibility.

### A. Font Families & Roles
1. **Editorial Display:** **`Fraunces`** (`--font-display`).  
   - Used for: Public hero headlines, room names (`Geodesic Dome 01`), and high-level page titles.  
   - Personality: Soft-cornered, organic, British-colonial architectural dignity.
2. **Interface & Controls:** **`Plus Jakarta Sans`** (`--font-sans`).  
   - Used for: Admin sidebar, form labels, inputs, table headers, and button triggers.  
   - Personality: Geometric, high x-height, neutral, exceptionally readable at 11px–13px.
3. **Tabular & Monospace:** **`JetBrains Mono`** (`--font-mono`).  
   - Used for: Currency amounts (`₹4,500`), booking IDs (`#B001`), time slots (`12:00 PM – 11:00 AM`), and telephone numbers (`+91 98765 43210`).  
   - Personality: Fixed-width numbers (`tabular-nums`) ensuring column figures line up across all screen sizes.

### B. Typographic Scale & Hierarchy Table

| Token | Class Name | Size / Line-Height | Weight | Tracking | Usage & Rules |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Hero Display** | `font-display text-4xl sm:text-5xl` | 36px/44px → 48px/56px | 400 | `-0.02em` | Public Hero title only. `text-wrap: balance`. |
| **Section Title** | `font-display text-2xl sm:text-3xl` | 24px/32px → 30px/38px | 500 | `-0.015em` | Page headers & unit titles. Never italicize arbitrary words. |
| **Card Header** | `font-sans text-base sm:text-lg` | 16px/24px → 18px/26px | 600 | `-0.01em` | Admin widget titles, unit card names. |
| **Body Standard** | `font-sans text-sm` | 14px/20px | 400 | `normal` | Body paragraphs, modal descriptions. Measure `< 68ch`. |
| **Form Label** | `font-sans text-xs` | 12px/16px | 600 | `+0.01em` | Input field labels, filter headers. Natural casing. |
| **Tabular Metric** | `font-mono text-sm sm:text-base` | 14px/20px → 16px/24px | 600 | `normal` | Financial figures (`₹24,000`), folio calculations. |
| **Micro Tag** | `font-mono text-[11px]` | 11px/14px | 500 | `+0.03em` | Status badges, timestamps, slot boundaries. |

### C. Anti-Cliché Typographic Rules (Web Interface Guidelines)
- **Real Punctuation:** Always use typographic ellipses (`…`), never three dots (`...`). Use curly quotes (`“` and `”`).
- **Non-Breaking Spaces:** Mandatory between currency symbols and amounts: `₹&nbsp;4,500`; between unit counts: `3&nbsp;Adults`; in shortcut keys: `⌘&nbsp;K`.
- **No Arbitrary Italics:** Do NOT arbitrarily italicize a single word like *Experience* or *Luxury* in headings.
- **Natural Casing:** Do NOT write form labels or buttons in `ALL CAPS`. Use clean sentence case (`Check-in date`, `Add line item`).

---

## 4. Spacing, Spatial Rhythm & The "Anti-Card" Discipline

AI templates create layout bloat by wrapping every element in a rounded box with diffuse drop-shadows. The Parlak design system enforces architectural linework and structural restraint.

```
AI SLOP PATTERN (CONTAINER SOUP)          PARLAK STRUCTURAL LINEWORK
┌─────────────────────────────────┐        ┌─────────────────────────────────┐
│ ┌─────────────────────────────┐ │        │ Geodesic Dome 01        ₹4,500  │
│ │ ┌─────────────────────────┐ │ │        │ Overnight Stay • Max 3 Adults   │
│ │ │ Stat: 4 Units Free      │ │ │        ├─────────────────────────────────┤
│ │ └─────────────────────────┘ │ │        │ A-Frame Villa 02        ₹6,500  │
│ └─────────────────────────────┘ │        │ Overnight Stay • Max 5 Adults   │
└─────────────────────────────────┘        └─────────────────────────────────┘
Nested rounded boxes & drop shadows        Clean 1px hairlines & tabular rhythm
```

### A. The 4px Spatial Grid
- `space-1` (4px): Micro gaps between icons and labels.
- `space-2` (8px): Padding inside compact table cells, gap between filter pills.
- `space-3` (12px): Standard form element padding (`px-3 py-2`).
- `space-4` (16px): Gaps between form fields, padding inside table cells.
- `space-6` (24px): Standard container padding, sheet drawer inner padding.
- `space-8` (32px): Gap between operational dashboard sections.

### B. The Chanel Restraint Rule
When building any component or page:
1. Examine every border, badge, and container.
2. Remove at least **one decorative border or background card**.
3. Let the white space and typographic weight communicate the boundary.

### C. Border Radius Hierarchy
- **Base UI Controls (`--radius: 0.5rem`):** Buttons, text inputs, dropdowns, and date pickers use `rounded-md` (6px) or `rounded-lg` (8px).
- **Badges & Pills:** `rounded` (4px) or `rounded-full` (for status dots only).
- **Surface Sheets & Modals:** `rounded-lg` (8px).  
- **Rule:** Never use cartoonish `rounded-3xl` (24px) or `rounded-2xl` on administrative dashboards.

---

## 5. Buttons & Tactile Controls (Emil Kowalski Physics)

Buttons must communicate physical tactility. Under user compression, buttons must exhibit an immediate physical press feedback (`active:scale-[0.98]`).

### A. The Animation Decision Framework
| User Frequency | Motion Budget | Technical Rule |
| :--- | :--- | :--- |
| **100+ times / day** (Admin table filters, pagination, row actions) | **0ms (Instant)** | Never animate. Zero transition delay. |
| **Tens of times / day** (Button clicks, hover states, menu options) | **100ms – 150ms** | Tactile scale + color shift via `var(--ease-snappy)`. |
| **Occasional** (Opening booking folio drawer, dialog confirmation) | **180ms – 220ms** | Natural deceleration via `var(--ease-spring)`. |
| **Keyboard interactions** (`Tab`, `Enter`, `Escape`) | **0ms (Instant)** | Never animate keyboard-initiated focus or dismissal. |

### B. Micro-Interaction Polish (`Before | After | Why`)

| Before (Generic Template) | After (Emil Kowalski Polish) | Why |
| :--- | :--- | :--- |
| `transition-all duration-300` | `transition-[transform,background-color] duration-150 ease-[var(--ease-snappy)]` | `transition-all` triggers costly layout recalculations. Specific properties maintain 120fps. |
| Button without `:active` | `active:scale-[0.98]` | Real physical buttons compress when pressed. Users perceive instant tactile feedback. |
| Outline on click | `focus-visible:ring-2 focus-visible:ring-ring focus:outline-none` | Focus rings must show on keyboard navigation, never when clicking with a mouse. |
| Button label text selectable | `select-none` | On mobile touch devices, rapid tapping or long-press will highlight button text without this. |

### C. Complete Tactile Button Implementation

In strict accordance with [`shadcn`](file:///Users/thasbeeh/Projects/parlak_resort/.agents/skills/shadcn/SKILL.md) and [`emil-design-eng`](file:///Users/thasbeeh/Projects/parlak_resort/.agents/skills/emil-design-eng/SKILL.md), buttons do not maintain an internal `isLoading` or `isPending` prop. Instead, loading states are composed declaratively using `<Spinner data-icon="inline-start" />` alongside standard HTML `disabled` and `aria-busy` attributes.

```tsx
// components/ui/button.tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center font-medium select-none outline-none",
    "rounded-md border text-sm transition-[transform,background-color,border-color,opacity] duration-150 ease-[var(--ease-snappy)]",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
    "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground border-transparent hover:bg-primary/95 shadow-xs",
        secondary: "bg-secondary text-secondary-foreground border-border/50 hover:bg-secondary/80",
        outline: "bg-transparent text-foreground border-border hover:bg-surface-subtle hover:border-foreground/20",
        ghost: "bg-transparent text-foreground border-transparent hover:bg-surface-subtle",
        destructive: "bg-destructive text-destructive-foreground border-transparent hover:bg-destructive/90 shadow-xs",
        whatsapp: "bg-[#25D366] text-white border-transparent hover:bg-[#20ba5a] shadow-xs active:scale-[0.97]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-6 text-base font-semibold",
        compact: "h-7 px-2.5 text-xs font-mono", // Dedicated Admin Table Actions
        icon: "size-9 p-0", // Square sizing via size-9 (no w-9 h-9)
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
```

#### Canonical Button Composition Patterns
```tsx
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Search, Printer, Plus } from "lucide-react";

// 1. Loading state with Spinner composition (Button has no isLoading prop)
<Button disabled={isSubmitting} aria-busy={isSubmitting ? "true" : undefined}>
  {isSubmitting && <Spinner data-icon="inline-start" />}
  {isSubmitting ? "Confirming Booking…" : "Confirm Booking"}
</Button>

// 2. Button with prefix/suffix icons (Icons use data-icon; components manage icon size)
<Button variant="outline">
  <Printer data-icon="inline-start" />
  Print 80mm Receipt
</Button>

// 3. Icon-only action button (Explicit aria-label required for WCAG 2.2 AA)
<Button size="icon" variant="ghost" aria-label="Add new price slab">
  <Plus />
</Button>
```

---

## 6. Inputs & Form Controls

Form inputs must provide clear state feedback, eliminate mobile browser quirks, and support rapid keyboard data entry for high-volume resort desk operations.

### A. Mobile-Native Input Rules
- **iOS Zoom Guard:** Input font size must be `text-base` (16px) on mobile viewports to prevent iOS Safari from zooming the screen on focus. Desktop viewports drop to `text-sm` (14px): `text-base md:text-sm`.
- **Never Block Paste:** `onPaste` handlers must never call `preventDefault()`. Desk admins frequently copy/paste phone numbers, UTR reference codes, and guest details from WhatsApp.
- **Spellcheck Hygiene:** Disable spellcheck on email, phone numbers, and reservation IDs (`spellCheck={false}`).
- **Numeric Optimization:** Currency and headcount inputs must specify `inputMode="numeric" pattern="[0-9]*"` to trigger the numeric keypad on touch devices.
- **Placeholders:** Always conclude placeholders with typographic ellipses (`…`) illustrating example patterns (e.g. `placeholder="e.g. 98765 43210…"`).

### B. Standard Form Layout Primitives (`FieldGroup` + `Field`)
In accordance with [`shadcn`](file:///Users/thasbeeh/Projects/parlak_resort/.agents/skills/shadcn/SKILL.md), all form layouts must use `FieldGroup` and `Field`. Raw `div` containers with `space-y-*` or `grid gap-*` are strictly forbidden for form composition.

```tsx
import {
  FieldGroup,
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

// Standard Field layout with validation pairing
<FieldGroup>
  <Field data-invalid={Boolean(errors.guestName)}>
    <FieldLabel htmlFor="guestName">Guest Full Name</FieldLabel>
    <Input
      id="guestName"
      placeholder="e.g. Rahul Sharma…"
      aria-invalid={Boolean(errors.guestName)}
      {...register("guestName")}
    />
    <FieldDescription>Name as shown on government photo ID.</FieldDescription>
    {errors.guestName && <FieldError>{errors.guestName.message}</FieldError>}
  </Field>
</FieldGroup>
```

### C. Input Groups (`InputGroup`, `InputGroupAddon`, `InputGroupInput`)
Never use raw `Input` inside an `InputGroup`. Prefix adornments (like Indian Rupee `₹`) and inline action buttons are composed using `InputGroup` primitives:

```tsx
// components/ui/currency-input.tsx
import * as React from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: number;
  onChange: (val: number) => void;
  isError?: boolean;
}

export function CurrencyInput({
  value,
  onChange,
  className,
  isError,
  ...props
}: CurrencyInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    onChange(raw ? parseInt(raw, 10) : 0);
  };

  return (
    <InputGroup className={cn("w-full", className)}>
      <InputGroupAddon>
        <span className="font-mono text-sm text-muted-foreground select-none" aria-hidden="true">
          ₹
        </span>
      </InputGroupAddon>
      <InputGroupInput
        type="text"
        inputMode="numeric"
        spellCheck={false}
        value={value ? value.toLocaleString("en-IN") : ""}
        onChange={handleChange}
        aria-invalid={isError ? "true" : undefined}
        className="font-mono text-base md:text-sm tabular-nums"
        placeholder="0…"
        {...props}
      />
    </InputGroup>
  );
}
```

#### Search Input with Inline Action Button
```tsx
import { InputGroup, InputGroupInput, InputGroupAddon } from "@/components/ui/input-group";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

<InputGroup>
  <InputGroupInput
    type="search"
    placeholder="Search guest phone or booking ID…"
    className="text-base md:text-sm"
  />
  <InputGroupAddon>
    <Button size="icon" variant="ghost" aria-label="Execute search">
      <Search />
    </Button>
  </InputGroupAddon>
</InputGroup>
```

### D. Option Sets via `ToggleGroup` (2–7 Choices)
Never manually loop `<Button>` elements with custom active states. Option sets (such as selecting Stay Type or Unit Category) must use `ToggleGroup` and `ToggleGroupItem`:

```tsx
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Field, FieldLabel } from "@/components/ui/field";

<Field>
  <FieldLabel id="stay-type-label">Stay Type / Operational Slot</FieldLabel>
  <ToggleGroup
    aria-labelledby="stay-type-label"
    spacing={2}
    value={stayType}
    onValueChange={(val) => val && setStayType(val as "OVERNIGHT" | "DAY_SLOT")}
  >
    <ToggleGroupItem value="OVERNIGHT" className="text-xs font-mono">
      Overnight (12 PM – 11 AM)
    </ToggleGroupItem>
    <ToggleGroupItem value="DAY_SLOT" className="text-xs font-mono">
      Day Slot (10 AM – 3 PM)
    </ToggleGroupItem>
  </ToggleGroup>
</Field>
```

### E. Grouping Add-Ons via `FieldSet` & `FieldLegend`
Related checkboxes (amenities, campfire, extra mattresses) must be grouped using semantic `FieldSet` and `FieldLegend`, not unstyled `div`s with custom headers:

```tsx
import { FieldSet, FieldLegend, FieldGroup, Field, FieldLabel } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";

<FieldSet>
  <FieldLegend variant="label">Additional Services & Experiences</FieldLegend>
  <FieldGroup className="gap-3 pt-2">
    <Field orientation="horizontal">
      <Checkbox id="campfire" {...register("hasCampfire")} />
      <FieldLabel htmlFor="campfire" className="font-normal text-xs">
        Evening Riverside Campfire (+₹1,500)
      </FieldLabel>
    </Field>
    <Field orientation="horizontal">
      <Checkbox id="kayaking" {...register("hasKayaking")} />
      <FieldLabel htmlFor="kayaking" className="font-normal text-xs">
        River Kayaking Experience Pass (+₹1,000 / couple)
      </FieldLabel>
    </Field>
  </FieldGroup>
</FieldSet>

---

## 7. Tables & High-Density Operational Grids

The Admin dashboard is an operational tool used daily to verify arrivals, adjust rents, and print receipts. Tables require high information density, fixed headers, and tabular figures.

### A. Operational Grid Rules
1. **Vertical Compactness:** Row height strictly clamped to `py-2.5 px-3` (approx. 44px total row height).
2. **Fixed Column Alignment:**
   - Booking IDs & Room Numbers: Left-aligned, `font-mono text-xs`.
   - Guest Names & Contacts: Left-aligned, `font-sans text-xs`.
   - Dates & Slot Times: Left-aligned, `font-mono text-xs`.
   - Currency & Payments: Right-aligned, `font-mono text-xs tabular-nums`.
   - Status Badges: Center or Left-aligned pill.
   - Row Actions: Right-aligned compact button.
3. **No Layout Shifts on Filter:** Searching by phone or filtering by status must update table rows immediately without fade or slide transitions.

### B. Complete Admin Data Table Layout

```tsx
// components/admin/bookings-table.tsx
import { format } from "date-fns";
import { CalendarX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";

interface BookingItem {
  id: string; // e.g., "B-1082"
  guestName: string;
  guestPhone: string;
  unitNames: string[];
  stayType: "OVERNIGHT" | "DAY_SLOT";
  startDatetime: Date;
  endDatetime: Date;
  rentCharge: number;
  totalPaid: number;
  status: "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED";
}

export function BookingsTable({
  bookings,
  onOpenBooking,
}: {
  bookings: BookingItem[];
  onOpenBooking: (id: string) => void;
}) {
  return (
    <div className="w-full overflow-x-auto rounded-md border border-border bg-background">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-border bg-surface-subtle/80 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider select-none">
            <th className="py-2.5 px-3">Booking ID</th>
            <th className="py-2.5 px-3">Guest Details</th>
            <th className="py-2.5 px-3">Units & Slot</th>
            <th className="py-2.5 px-3">Dates (IST)</th>
            <th className="py-2.5 px-3 text-right">Rent / Due</th>
            <th className="py-2.5 px-3">Status</th>
            <th className="py-2.5 px-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60 text-xs">
          {bookings.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-12">
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <CalendarX className="size-8" />
                    </EmptyMedia>
                    <EmptyTitle>No reservations found</EmptyTitle>
                    <EmptyDescription>
                      No reservations match the selected operational filters or date window.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </td>
            </tr>
          ) : (
            bookings.map((booking) => {
              const balanceDue = booking.rentCharge - booking.totalPaid;
              return (
                <tr
                  key={booking.id}
                  className="hover:bg-surface-subtle/50 transition-colors duration-75"
                >
                  <td className="py-2.5 px-3 font-mono font-medium text-foreground/80">
                    #{booking.id.slice(-6)}
                  </td>
                  <td className="py-2.5 px-3 font-sans">
                    <div className="font-medium text-foreground">{booking.guestName}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">{booking.guestPhone}</div>
                  </td>
                  <td className="py-2.5 px-3 font-sans">
                    <span className="font-medium text-foreground">{booking.unitNames.join(", ")}</span>
                    <span className="block text-[10px] text-muted-foreground">
                      {booking.stayType === "OVERNIGHT" ? "Overnight (12P–11A)" : "Day Slot (10A–3P)"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-muted-foreground">
                    <div>{format(booking.startDatetime, "dd MMM yyyy")}</div>
                    <div className="text-[10px] text-muted-foreground/70">
                      {format(booking.startDatetime, "hh:mm a")} – {format(booking.endDatetime, "hh:mm a")}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    <div className="text-foreground font-medium">
                      ₹{booking.rentCharge.toLocaleString("en-IN")}
                    </div>
                    <div className={balanceDue > 0 ? "text-amber-600 font-semibold text-[11px]" : "text-muted-foreground text-[11px]"}>
                      {balanceDue > 0 ? `Due: ₹${balanceDue.toLocaleString("en-IN")}` : "Settled"}
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={booking.status} />
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <Button
                      size="compact"
                      variant="outline"
                      onClick={() => onOpenBooking(booking.id)}
                    >
                      Manage
                    </Button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 8. Status Badges & Domain Indicators

Status badges must convey state clearly through distinct colors, borders, and text labels without relying on high-saturation neons or arbitrary pill colors. In accordance with [`shadcn`](file:///Users/thasbeeh/Projects/parlak_resort/.agents/skills/shadcn/SKILL.md), badges compose the canonical `<Badge>` primitive rather than custom styled `span` tags.

### A. Domain State Matrix (`parlak-domain`)

| Domain Status | Semantic Meaning | Color Token & Styling |
| :--- | :--- | :--- |
| **`CONFIRMED`** | Advance paid; reservation locked in DB via GiST constraint. | `bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20` |
| **`CHECKED_IN`** | Guest physically on premises (resident overnight or day slot). | `bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20` |
| **`CHECKED_OUT`** | Balance settled to zero; stay completed. | `bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20` |
| **`CANCELLED`** | Inventory released back to pool; refund recorded. | `bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20` |
| **`MAINTENANCE_BLOCKED`** | Unit undergoing maintenance; calendar blocked in GiST. | `bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20` |

### B. Status Badge Component

```tsx
// components/ui/status-badge.tsx
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type BookingStatus =
  | "CONFIRMED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "CANCELLED"
  | "MAINTENANCE_BLOCKED";

const statusStyles: Record<BookingStatus, { label: string; className: string }> = {
  CONFIRMED: {
    label: "Confirmed",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
  CHECKED_IN: {
    label: "Checked In",
    className: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
  },
  CHECKED_OUT: {
    label: "Checked Out",
    className: "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  },
  MAINTENANCE_BLOCKED: {
    label: "Maintenance",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: BookingStatus;
  className?: string;
}) {
  const config = statusStyles[status] || {
    label: status,
    className: "bg-muted text-muted-foreground border-border",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide border uppercase select-none",
        config.className,
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
```

---

## 9. Modal & Sheet Patterns (Base UI Primitives)

To keep Admins focused on operations, mutations (such as editing booking dates, adding folio line items, and recording cash payments) happen in **Slide-Over Sheets** rather than separate pages. Destructive confirmations use **Centered Dialogs**.

### A. The Motion Physics of Surfaces (`emil-design-eng`)
- **Natural Entrance:** Dialog surfaces must enter from `scale-[0.96]` and `opacity-0` to `scale-100` and `opacity-100`. Surfaces in the real world never emerge from a geometric singularity (`scale(0)`).
- **Duration:** 180ms – 220ms with a decelerating spring curve (`var(--ease-spring)`).
- **No Manual Z-Index:** All overlays manage their own stacking via Base UI / shadcn compound portals. Manual `z-50` overrides are prohibited.
- **Accessible Titles:** Every `Dialog`, `Sheet`, and `Drawer` component **strictly requires a Title** (`DialogTitle`, `SheetTitle`) for screen reader navigation (WCAG 2.2 Level AA). If visually hidden, apply `className="sr-only"`.

### B. Slide-Over Sheet (Right Drawer)
Used for the **Booking Folio & Quick Settlement Drawer**, composed via shadcn's Base UI `Sheet`:

```tsx
// components/admin/booking-sheet.tsx
import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

export function BookingSheet({
  isOpen,
  onClose,
  title,
  description,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="sm:max-w-md flex flex-col justify-between">
        <div>
          <SheetHeader className="pb-4 border-b border-border">
            <SheetTitle className="font-display text-lg text-foreground font-medium">
              {title}
            </SheetTitle>
            {description && (
              <SheetDescription className="text-xs text-muted-foreground">
                {description}
              </SheetDescription>
            )}
          </SheetHeader>
          <div className="py-4 overflow-y-auto max-h-[calc(100dvh-140px)]">
            {children}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

### C. Concurrency Conflict Banners (OCC & GiST)
Rather than a generic modal dialog, display inline alerts with clear operational context using shadcn's `<Alert>` component. Never build custom styled callout `div`s.

```tsx
// components/admin/collision-alert.tsx
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface CollisionAlertProps {
  type: "UNIT_SCHEDULE_COLLISION" | "BOOKING_STALE_RECORD";
  details?: {
    unitName?: string;
    conflictingRange?: string;
  };
  onRefresh?: () => void;
}

export function CollisionAlert({ type, details, onRefresh }: CollisionAlertProps) {
  if (type === "UNIT_SCHEDULE_COLLISION") {
    return (
      <Alert variant="destructive" className="border-amber-600/30 bg-amber-500/10 text-amber-900 dark:text-amber-200">
        <AlertTriangle />
        <AlertTitle className="text-amber-950 dark:text-amber-100 font-semibold">
          Unit Collision Trapped (PostgreSQL GiST)
        </AlertTitle>
        <AlertDescription className="text-xs leading-relaxed">
          {details?.unitName
            ? `Cannot reserve ${details.unitName}: Unit is already booked during ${details.conflictingRange}.`
            : "Cannot save: Another reservation occupies this unit for the requested window."}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive" className="flex items-center justify-between border-red-600/30 bg-red-500/10 text-red-900 dark:text-red-200">
      <div className="flex items-center gap-3">
        <RefreshCw />
        <div>
          <AlertTitle className="text-red-950 dark:text-red-100 font-semibold">
            Concurrent Record Conflict
          </AlertTitle>
          <AlertDescription className="text-xs">
            This booking was modified concurrently by another Admin. Refresh to load the latest data.
          </AlertDescription>
        </div>
      </div>
      {onRefresh && (
        <Button size="sm" variant="outline" onClick={onRefresh} className="shrink-0 ml-4">
          Refresh Record
        </Button>
      )}
    </Alert>
  );
}
```

---

## 10. Form Conventions & Validation

Resort front-desk workflows demand rapid, error-tolerant keyboard data entry. Forms must eliminate layout reflows, prevent accidental loss of guest details, and provide crystal-clear inline feedback.

### A. Architectural Form Rules ([`shadcn`](file:///Users/thasbeeh/Projects/parlak_resort/.agents/skills/shadcn/SKILL.md) & [`web-design-guidelines`](file:///Users/thasbeeh/Projects/parlak_resort/.agents/skills/web-design-guidelines/SKILL.md))
1. **Uncontrolled Forms via React Hook Form:** Keeps typing responsive and eliminates per-keystroke re-renders on low-powered mobile devices. Fields register directly via `register("fieldName")`.
2. **Dual-Attribute Validation Pairing:** 
   - Apply `data-invalid` on the `<Field>` wrapper to style the label, description, and borders.
   - Apply `aria-invalid="true"` directly on the interactive control (`<Input>`, `<InputGroupInput>`).
   - For disabled states, pair `data-disabled` on `<Field>` with `disabled` on the control.
3. **No Disabled Submit Buttons Prior to Request:** 
   - Submit buttons stay clickable while an admin enters data. Disabling buttons confuses users when a required field is missing.
   - Clicking submit with invalid data automatically scrolls and shifts focus to the first invalid field.
   - Only during an in-flight server request does the button become `disabled` and display `<Spinner data-icon="inline-start" />` with `aria-busy="true"`.
4. **Never Block Paste:** `onPaste` handlers must never call `preventDefault()`. Front desk staff frequently copy/paste phone numbers, transaction UTR codes, and guest names directly from WhatsApp chats.
5. **Zero-Zoom Mobile Guard:** All form controls enforce `text-base md:text-sm` (16px font size on mobile viewports) to eliminate iOS Safari viewport zoom.
6. **Typographic Placeholders:** All placeholder attributes must conclude with typographic ellipses (`…`) illustrating example data patterns (e.g. `placeholder="e.g. Rahul Sharma…"`).
7. **Single Hit Target for Radios & Checkboxes:** Labels and checkboxes share a contiguous click/tap target with no dead zones.
8. **Spellcheck Hygiene:** Disable browser spellcheck on phone numbers, guest names, booking IDs, and promo codes (`spellCheck={false}`).
9. **Unsaved Changes Guard (`isDirty`):** Forms register a `beforeunload` listener when dirty to prevent accidental tab closing or navigation during multi-step reservation entry.

### B. Complete Operational Form: Manual Reservation Entry (`ManualBookingForm`)

```tsx
// components/admin/manual-booking-form.tsx
"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import {
  FieldGroup,
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Calendar, Phone, User, Users } from "lucide-react";

// 1. Zod v4 Domain Validation Contract
const manualBookingSchema = z.object({
  guestName: z.string().trim().min(3, "Guest name must be at least 3 characters"),
  guestPhone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  stayType: z.enum(["OVERNIGHT", "DAY_SLOT"]),
  headcount: z.coerce
    .number()
    .int()
    .positive("Headcount must be at least 1 guest")
    .max(2000, "Maximum resort capacity is 2,000 guests"),
  rentCharge: z.coerce
    .number()
    .int()
    .positive("Rent charge must be greater than zero"),
  advancePaid: z.coerce
    .number()
    .int()
    .nonnegative("Advance payment cannot be negative"),
  hasCampfire: z.boolean().default(false),
  hasKayaking: z.boolean().default(false),
});

type ManualBookingValues = z.infer<typeof manualBookingSchema>;

export function ManualBookingForm({
  onSubmitBooking,
  isSubmitting,
}: {
  onSubmitBooking: (values: ManualBookingValues) => Promise<void>;
  isSubmitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isDirty },
  } = useForm<ManualBookingValues>({
    resolver: zodResolver(manualBookingSchema),
    defaultValues: {
      guestName: "",
      guestPhone: "",
      stayType: "OVERNIGHT",
      headcount: 2,
      rentCharge: 12000,
      advancePaid: 3000,
      hasCampfire: false,
      hasKayaking: false,
    },
  });

  // 2. Warn before accidental window close or route navigation if form is dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  return (
    <form
      onSubmit={handleSubmit(onSubmitBooking)}
      className="flex flex-col gap-6"
      noValidate
    >
      <FieldGroup>
        {/* Guest Full Name */}
        <Field data-invalid={Boolean(errors.guestName)}>
          <FieldLabel htmlFor="guestName">Guest Full Name</FieldLabel>
          <Input
            id="guestName"
            type="text"
            autoComplete="name"
            placeholder="e.g. Rahul Sharma…"
            aria-invalid={Boolean(errors.guestName)}
            {...register("guestName")}
          />
          <FieldDescription>As stated on official ID for check-in.</FieldDescription>
          {errors.guestName && <FieldError>{errors.guestName.message}</FieldError>}
        </Field>

        {/* WhatsApp Mobile Number */}
        <Field data-invalid={Boolean(errors.guestPhone)}>
          <FieldLabel htmlFor="guestPhone">WhatsApp Contact Number</FieldLabel>
          <Input
            id="guestPhone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            spellCheck={false}
            placeholder="e.g. 9876543210…"
            aria-invalid={Boolean(errors.guestPhone)}
            {...register("guestPhone")}
          />
          <FieldDescription>Used for automated PDF receipt & location dispatch.</FieldDescription>
          {errors.guestPhone && <FieldError>{errors.guestPhone.message}</FieldError>}
        </Field>

        {/* Stay Type (Option set via ToggleGroup) */}
        <Controller
          control={control}
          name="stayType"
          render={({ field }) => (
            <Field>
              <FieldLabel id="stay-type-label">Operational Slot / Stay Type</FieldLabel>
              <ToggleGroup
                aria-labelledby="stay-type-label"
                spacing={2}
                value={field.value}
                onValueChange={(val) => val && field.onChange(val)}
                className="w-full justify-start"
              >
                <ToggleGroupItem value="OVERNIGHT" className="text-xs font-mono">
                  Overnight (12 PM – 11 AM)
                </ToggleGroupItem>
                <ToggleGroupItem value="DAY_SLOT" className="text-xs font-mono">
                  Day Slot (10 AM – 3 PM)
                </ToggleGroupItem>
              </ToggleGroup>
            </Field>
          )}
        />

        {/* Guest Headcount */}
        <Field data-invalid={Boolean(errors.headcount)}>
          <FieldLabel htmlFor="headcount">Total Guest Headcount</FieldLabel>
          <Input
            id="headcount"
            type="number"
            inputMode="numeric"
            min={1}
            max={2000}
            aria-invalid={Boolean(errors.headcount)}
            {...register("headcount")}
          />
          <FieldDescription>Domes cap at 3 pax; A-Frames cap at 5 pax.</FieldDescription>
          {errors.headcount && <FieldError>{errors.headcount.message}</FieldError>}
        </Field>
      </FieldGroup>

      {/* Financial Settlement Strip */}
      <FieldGroup className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Agreed Total Rent Charge */}
        <Controller
          control={control}
          name="rentCharge"
          render={({ field }) => (
            <Field data-invalid={Boolean(errors.rentCharge)}>
              <FieldLabel htmlFor="rentCharge">Total Agreed Tariff</FieldLabel>
              <CurrencyInput
                id="rentCharge"
                value={field.value}
                onChange={field.onChange}
                isError={Boolean(errors.rentCharge)}
              />
              {errors.rentCharge && <FieldError>{errors.rentCharge.message}</FieldError>}
            </Field>
          )}
        />

        {/* Advance Received */}
        <Controller
          control={control}
          name="advancePaid"
          render={({ field }) => (
            <Field data-invalid={Boolean(errors.advancePaid)}>
              <FieldLabel htmlFor="advancePaid">Advance Payment Received</FieldLabel>
              <CurrencyInput
                id="advancePaid"
                value={field.value}
                onChange={field.onChange}
                isError={Boolean(errors.advancePaid)}
              />
              {errors.advancePaid && <FieldError>{errors.advancePaid.message}</FieldError>}
            </Field>
          )}
        />
      </FieldGroup>

      {/* Grouping Add-On Services via FieldSet + FieldLegend */}
      <FieldSet>
        <FieldLegend variant="label">Add-on Experiences & Services</FieldLegend>
        <FieldGroup className="gap-3 pt-2">
          <Field orientation="horizontal">
            <Checkbox id="hasCampfire" {...register("hasCampfire")} />
            <FieldLabel htmlFor="hasCampfire" className="font-normal text-xs cursor-pointer">
              Riverside Campfire setup (+₹1,500)
            </FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <Checkbox id="hasKayaking" {...register("hasKayaking")} />
            <FieldLabel htmlFor="hasKayaking" className="font-normal text-xs cursor-pointer">
              River Kayaking Pass (+₹1,000 / couple)
            </FieldLabel>
          </Field>
        </FieldGroup>
      </FieldSet>

      {/* Form Submission Dock */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
          aria-busy={isSubmitting ? "true" : undefined}
          className="w-full sm:w-auto"
        >
          {isSubmitting && <Spinner data-icon="inline-start" />}
          {isSubmitting ? "Locking Reservation…" : "Confirm & Dispatch WhatsApp Receipt"}
        </Button>
      </div>
    </form>
  );
}
```

---

## 11. Responsive Architecture & Multi-Device Breakpoints

Resort administrators manage bookings across three distinct environments: desktop PCs at the front desk, iPads/tablets while walking the property, and mobile smartphones when responding to guest inquiries on WhatsApp. 

The interface adapts responsively across these three tiers without relying on AI templates or clumsy horizontal overflow bugs.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                RESPONSIVE BREAKPOINT TIERS                             │
├────────────────────────┬───────────────────────────────┬───────────────────────────────┤
│ DESKTOP (≥ 1024px)     │ TABLET (768px – 1023px)       │ MOBILE (< 768px)              │
├────────────────────────┼───────────────────────────────┼───────────────────────────────┤
│ • 260px fixed sidebar  │ • 68px collapsed icon rail    │ • Top header + slide drawer   │
│ • Full 7-column table  │ • Horizontal scroll table with│ • Stacked Record Tiles        │
│ • Multi-column forms   │   sticky ID column            │   (Table-to-Tile reflow)      │
│ • Multi-pane drawers   │ • 2-column form reflow        │ • Single-column stacked forms │
│ • Hover tooltips & HUD │ • Touch targets ≥ 44px        │ • Sticky bottom CTA bar       │
└────────────────────────┴───────────────────────────────┴───────────────────────────────┘
```

---

### A. Desktop Layout (≥ 1024px / `lg` and `xl`)

Desktop is the primary workstation for heavy administrative operations (bulk slot configuration, price slab editing, folio reconciliation, and receipt printing).

```
┌──────────────┬──────────────────────────────────────────────────────────────┐
│  SIDEBAR     │  STICKY TOP HEADER (Resort Status • Date • Admin Profile)    │
│  (260px)     ├──────────────────────────────────────────────────────────────┤
│              │  BREADCRUMB & PAGE TITLE                       [+ New Booking]│
│  • Dashboard ├──────────────────────────────────────────────────────────────┤
│  • Bookings  │  OPERATIONAL METRICS STRIP (4-Column Stat Grid)              │
│  • Units     │  [30D Revenue]   [Check-ins Today]   [Check-outs]   [Domes]  │
│  • Pricing   ├──────────────────────────────────────────────────────────────┤
│  • Settings  │  DATA TABLE (Full 7-Column Density)                          │
│              │  ID │ Guest │ Units │ Slot / Times │ Rent / Due │ Status │ Act│
│  [⌘K Search] │  ──────────────────────────────────────────────────────────  │
│  [Logout]    │  Row height: py-2.5 px-3 • font-mono tabular-nums • 0ms sync │
└──────────────┴──────────────────────────────────────────────────────────────┘
```

1. **Persistent Sidebar (`w-64 shrink-0`):**
   - Anchored to the left with `position: sticky; top: 0; h-screen`.
   - Displays resort brandmark, operational status indicator (e.g. `🟢 System Online`), navigation links with Lucide icons, and keyboard shortcut triggers (`⌘K Quick Search`).
2. **High-Density Operational Table:**
   - Displays all 7 columns simultaneously: `Booking ID`, `Guest Details`, `Units & Slot`, `Dates (IST)`, `Rent & Due`, `Status`, and `Actions`.
   - Compact row heights (`py-2.5 px-3` / ~44px total height) allowing 12–15 records above the fold.
3. **Multi-Column Forms (`grid-cols-2` and `grid-cols-3`):**
   - Headcount slabs, slot presets, and date-range pickers are arranged in logical multi-column rows to minimize vertical page scrolling.
4. **Desktop Navigation Physics:**
   - Keyboard navigation is fully supported (`Tab` sequence, `Enter` to activate, `Escape` to close drawers).
   - Zero animation on keyboard navigation per `emil-design-eng`.

---

### B. Tablet Layout (768px – 1023px / `md`)

Tablets (such as Apple iPad, iPad Pro, and Android tablets) are used by managers doing inventory checks and inspecting geodesic domes in person.

```
┌──────┬──────────────────────────────────────────────────────────────────────┐
│ ICON │  STICKY HEADER (Active View Title • Search • Admin Avatar)           │
│ RAIL ├──────────────────────────────────────────────────────────────────────┤
│ 68px │  METRICS GRID (Reflows to 2x2 Grid)                                  │
│      │  [30D Revenue]    [Check-ins Today]                                  │
│ • 📊 │  [Check-outs]     [Overnight Domes]                                  │
│ • 📅 ├──────────────────────────────────────────────────────────────────────┤
│ • 🏕️ │  SCROLLABLE TABLE CONTAINER (Sticky ID + Edge Scroll Shadows)       │
│ • 🏷️ │  [#B001 📌] │ Guest Details │ Units & Slot │ Dates │ Due │ Status ➔ │
│ • ⚙️ │  ─────────────────────────────────────────────────────────────────── │
│      │  Horizontal touch swipe with sticky ID & action columns              │
└──────┴──────────────────────────────────────────────────────────────────────┘
```

1. **Collapsible Icon Rail (`w-[68px]`):**
   - The desktop 260px sidebar automatically collapses to a 68px icon rail to save 192px of horizontal screen width.
   - Icons show Base UI tooltips on hover or tap-hold, originating from `transform-origin: left`.
2. **Metrics Reflow:**
   - 4-column metric strips reflow cleanly into a balanced 2x2 grid (`grid-cols-2`).
3. **Table with Sticky Anchor Column:**
   - The table container uses `overflow-x-auto` with a sticky left column:
     ```css
     .sticky-table-cell {
       position: sticky;
       left: 0;
       background-color: var(--background);
       z-index: 10;
       box-shadow: 1px 0 0 var(--border);
     }
     ```
   - Admins can scroll horizontally through payment and slot columns while the guest/booking identifier stays locked on the left.
4. **Touch Target Enforcement:**
   - All interactive controls expand to minimum 44px height (`h-11`) to ensure reliable finger tap targets without accidental misclicks.

---

### C. Mobile Layout (< 768px / `sm` and Mobile Viewports)

Mobile phones (iPhones and Android devices) are used by staff on the go, often directly after receiving a guest message on WhatsApp.

```
┌─────────────────────────────────────────────────────────────┐
│ ☰  PARLAK RESORT                [🔍 Search]  [🟢 3 Online]  │ ➔ Top Header
├─────────────────────────────────────────────────────────────┤
│ Bookings Desk                     [+ Manual Booking]        │
├─────────────────────────────────────────────────────────────┤
│ FILTER TABS: [All (18)]  [Check-ins (4)]  [Checked-out (6)] │
├─────────────────────────────────────────────────────────────┤
│ STACKED RECORD TILE (Table-to-Card Reflow):                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ #B-1082               [CONFIRMED]            [⋮ Action] │ │
│ │ Rahul Sharma                                            │ │
│ │ +91 98765 43210 (Tap to Call / WhatsApp)                │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Geodesic Dome 01, A-Frame 02 • Overnight Stay           │ │
│ │ 12 Oct 2026, 12:00 PM → 13 Oct 2026, 11:00 AM (IST)     │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Total: ₹14,500                    Balance Due: ₹4,500   │ │
│ │                                                         │ │
│ │ [ Manage Folio & Payment ]                              │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ [ + Quick Booking ]  [ 📊 Dashboard ]  [ 🏕️ Units ]        │ ➔ Safe Thumb Bar
└─────────────────────────────────────────────────────────────┘
```

---

### D. What Happens to Tables on Smaller Screens?

Standard web tables break completely on mobile viewports—forcing horizontal scrollbars that cause accidental body scrolling or shrinking text to unreadable sizes.

#### The Parlak Solution: Hybrid Table-to-Tile Reflow

Using Tailwind responsive utilities, the markup renders a **Dense Tabular Grid on Desktop/Tablet** (`hidden md:table`) and automatically reflows into **Stacked Record Tiles on Mobile** (`block md:hidden`).

```tsx
// components/admin/responsive-bookings-list.tsx
import { format } from "date-fns";
import { Phone, ExternalLink } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";

interface BookingRecord {
  id: string;
  guestName: string;
  guestPhone: string;
  unitNames: string[];
  stayType: "OVERNIGHT" | "DAY_SLOT";
  startDatetime: Date;
  endDatetime: Date;
  rentCharge: number;
  totalPaid: number;
  status: "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED" | "MAINTENANCE_BLOCKED";
}

export function ResponsiveBookingsList({
  bookings,
  onManageFolio,
}: {
  bookings: BookingRecord[];
  onManageFolio: (id: string) => void;
}) {
  return (
    <div className="w-full">
      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. DESKTOP & TABLET VIEW (Rendered md and above)              */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="hidden md:block overflow-x-auto rounded-md border border-border bg-background">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface-subtle text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <th className="py-2.5 px-3">Booking ID</th>
              <th className="py-2.5 px-3">Guest Details</th>
              <th className="py-2.5 px-3">Units & Slot</th>
              <th className="py-2.5 px-3">Stay Dates (IST)</th>
              <th className="py-2.5 px-3 text-right">Rent / Due</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-xs">
            {bookings.map((b) => (
              <tr key={b.id} className="hover:bg-surface-subtle/50 transition-colors">
                <td className="py-2.5 px-3 font-mono font-medium">#{b.id.slice(-6)}</td>
                <td className="py-2.5 px-3 font-sans">
                  <div className="font-medium text-foreground">{b.guestName}</div>
                  <div className="text-[11px] text-muted-foreground font-mono">{b.guestPhone}</div>
                </td>
                <td className="py-2.5 px-3 font-sans">
                  <div>{b.unitNames.join(", ")}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {b.stayType === "OVERNIGHT" ? "Overnight Stay" : "Day Slot (10A–3P)"}
                  </div>
                </td>
                <td className="py-2.5 px-3 font-mono text-muted-foreground">
                  <div>{format(b.startDatetime, "dd MMM yyyy")}</div>
                  <div className="text-[10px] text-muted-foreground/70">
                    {format(b.startDatetime, "hh:mm a")} – {format(b.endDatetime, "hh:mm a")}
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                  <div className="text-foreground">₹{b.rentCharge.toLocaleString("en-IN")}</div>
                  <div className={b.rentCharge - b.totalPaid > 0 ? "text-amber-600 font-semibold" : "text-muted-foreground"}>
                    {b.rentCharge - b.totalPaid > 0 ? `Due: ₹${(b.rentCharge - b.totalPaid).toLocaleString("en-IN")}` : "Settled"}
                  </div>
                </td>
                <td className="py-2.5 px-3">
                  <StatusBadge status={b.status} />
                </td>
                <td className="py-2.5 px-3 text-right">
                  <Button size="compact" variant="outline" onClick={() => onManageFolio(b.id)}>
                    Manage
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2. MOBILE VIEW (Rendered strictly below 768px / block md:hidden) */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 md:hidden">
        {bookings.map((b) => {
          const balanceDue = b.rentCharge - b.totalPaid;
          return (
            <article
              key={b.id}
              className="rounded-lg border border-border bg-background p-4 shadow-xs flex flex-col gap-3"
            >
              {/* Header: ID + Status */}
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <span className="font-mono text-xs font-semibold text-foreground/80">
                  #{b.id.slice(-6)}
                </span>
                <StatusBadge status={b.status} />
              </div>

              {/* Guest Information */}
              <div>
                <h4 className="font-sans text-sm font-semibold text-foreground">
                  {b.guestName}
                </h4>
                <a
                  href={`tel:${b.guestPhone}`}
                  className="mt-0.5 inline-flex items-center gap-1.5 font-mono text-xs text-primary hover:underline"
                >
                  <Phone className="size-3" />
                  <span>{b.guestPhone}</span>
                </a>
              </div>

              {/* Units & Slot Dates */}
              <div className="rounded bg-surface-subtle p-2.5 text-xs flex flex-col gap-1 border border-border/40">
                <div className="font-medium text-foreground">
                  {b.unitNames.join(", ")}
                </div>
                <div className="text-[11px] text-muted-foreground font-mono">
                  {format(b.startDatetime, "dd MMM")} ({format(b.startDatetime, "h a")}) →{" "}
                  {format(b.endDatetime, "dd MMM")} ({format(b.endDatetime, "h a")})
                </div>
              </div>

              {/* Financial Summary & Direct Manage Action */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="block text-[10px] text-muted-foreground uppercase tracking-wider">
                    Balance Due
                  </span>
                  <span
                    className={`font-mono text-sm font-semibold tabular-nums ${
                      balanceDue > 0 ? "text-amber-600" : "text-muted-foreground"
                    }`}
                  >
                    {balanceDue > 0 ? `₹${balanceDue.toLocaleString("en-IN")}` : "Settled (₹0)"}
                  </span>
                </div>

                <Button
                  size="sm"
                  variant="primary"
                  className="h-9 px-4 text-xs font-medium"
                  onClick={() => onManageFolio(b.id)}
                >
                  Manage Folio
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
```

---

### E. What Happens to Forms on Smaller Screens?

On desktop, forms like the **Manual Booking Entry Form** or **Headcount Slab Builder** use multi-column grids. On mobile and tablet screens:

1. **Linear Single-Column Flow:**
   - Multi-column grids (`grid-cols-2`, `grid-cols-3`) collapse to `grid-cols-1`.
   - Fieldsets are grouped into distinct visual sections separated by subtle 1px dividers rather than nested floating boxes.
2. **Sticky Bottom Action Tray (Safe Area Aware):**
   - On long forms and modal drawers, the submit action is docked to the bottom of the viewport:
     ```tsx
     <div className="sticky bottom-0 inset-x-0 bg-background/95 backdrop-blur-md p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-border flex items-center justify-end gap-3 z-20">
       <Button variant="outline" onClick={onCancel}>Cancel</Button>
       <Button
         variant="primary"
         type="submit"
         disabled={isSubmitting}
         aria-busy={isSubmitting ? "true" : undefined}
       >
         {isSubmitting && <Spinner data-icon="inline-start" />}
         Confirm Booking
       </Button>
     </div>
     ```
   - Admins never have to scroll past 10 fields just to find the submit button.
3. **Virtual Keyboard Scroll Protection:**
   - The form container enforces `scroll-padding-bottom: 6rem`.
   - When the iOS or Android software keyboard opens, the focused input automatically scrolls into full view above the keyboard.
4. **Zero-Zoom Font Enforcement:**
   - All inputs strictly enforce `text-base md:text-sm` (16px on mobile viewports) to eliminate iOS Safari's automatic viewport zoom on focus.

---

### F. What Happens to Navigation on Smaller Screens?

Navigation adapts to screen size to keep essential actions within reach:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        NAVIGATION TRANSFORMATION                       │
├────────────────────┬────────────────────┬──────────────────────────────┤
│ DESKTOP (≥ 1024px) │ TABLET (768–1023px)│ MOBILE (< 768px)             │
├────────────────────┼────────────────────┼──────────────────────────────┤
│ Persistent 260px   │ 68px Icon Rail     │ Top Header + Hamburger Sheet │
│ left sidebar       │ with hover/tap     │ Drawer + Thumb-zone Bottom   │
│ with full labels   │ tooltips           │ Navigation Bar for top tabs  │
└────────────────────┴────────────────────┴──────────────────────────────┘
```

1. **Mobile Header (`h-14 flex items-center justify-between`):**
   - Sticky top bar featuring the Parlak brand icon, active view title, and a high-contrast hamburger menu button (`size-9 p-0`).
2. **Slide-Out Sheet Navigation:**
   - Tapping the hamburger menu triggers a Base UI/Radix Sheet sliding in from the left (`data-[state=open]:slide-in-from-left duration-200`).
   - Width is clamped to `w-[82vw] max-w-xs h-[100dvh]`.
   - Uses `overscroll-behavior: contain` to prevent background page pull-to-refresh glitches.
3. **Mobile Thumb-Zone Quick Bar:**
   - For high-frequency day-to-day operations, the bottom bar provides instant 1-tap access to the 3 main views:
     - 📊 **Dashboard** (`/admin/dashboard`)
     - 📅 **Bookings** (`/admin/bookings`)
     - 🏕️ **Units** (`/admin/units`)
   - Uses `h-14 pb-[env(safe-area-inset-bottom)]` to sit comfortably above the iPhone home indicator.

---

### G. Mobile-Native Touch & Viewport Standard (`mobile-native`)

To ensure the web app feels like an installed native application on iOS and Android devices, the following global properties are enforced in the codebase:

```css
/* app/globals.css - Mobile Native Normalization */
@layer base {
  html {
    /* Eliminate 300ms tap delay */
    touch-action: manipulation;
    /* Remove grey/blue tap highlights in Safari and Chrome */
    -webkit-tap-highlight-color: transparent;
  }

  /* Prevent sticky hover styles from staying stuck after a touch tap */
  @media (hover: none) and (pointer: coarse) {
    *:hover {
      background-color: inherit;
      color: inherit;
      border-color: inherit;
    }
  }

  /* Prevent awkward text selection when tapping interactive buttons */
  button, a, [role="button"], th {
    user-select: none;
    -webkit-user-select: none;
  }
}
```

```tsx
// app/layout.tsx - Viewport & Notch Configuration
import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover", // Required to activate env(safe-area-inset-*)
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf8" },
    { media: "(prefers-color-scheme: dark)", color: "#171a18" },
  ],
};
```

---

## 12. Native `@media print` Receipt Engine

In accordance with [parlak-domain Section 1.5](file:///Users/thasbeeh/Projects/parlak_resort/.agents/skills/parlak-domain/SKILL.md), invoices are styled directly in CSS without relying on heavy PDF rendering libraries. The layout formats cleanly on both 80mm thermal roll printers and standard A4 paper.

```css
/* Print Media Styles in app/globals.css */
@media print {
  /* Suppress all web chrome, sidebars, headers, and buttons */
  header, nav, aside, button, .no-print {
    display: none !important;
  }
  
  body {
    background: white !important;
    color: black !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  
  .printable-receipt {
    width: 100% !important;
    max-width: 80mm !important; /* Standard 3-inch thermal POS receipt width */
    margin: 0 auto !important;
    padding: 8px !important;
    font-family: var(--font-mono) !important;
    font-size: 11px !important;
    line-height: 1.3 !important;
    box-shadow: none !important;
    border: none !important;
  }
  
  .printable-receipt table {
    width: 100% !important;
    border-collapse: collapse !important;
  }
  
  .printable-receipt th,
  .printable-receipt td {
    padding: 3px 0 !important;
    border-bottom: 1px dashed #222 !important;
  }
  
  .printable-receipt .receipt-total {
    border-top: 1px solid #000 !important;
    border-bottom: 2px solid #000 !important;
    font-weight: 700 !important;
  }
}
```

---

## 13. Component Verification Checklist

Before creating or approving any UI component in the Parlak Resort repository, verify it against this checklist:

- [ ] **No AI Palette Fallback:** Avoid `#F4F1EA` warm cream and `#D97757` terracotta. Use the OKLCH river palette.
- [ ] **Restraint (Chanel Rule):** Does the component avoid unnecessary wrapper cards, badges, or drop shadows?
- [ ] **Tactile Press:** Do all clickable elements feature `active:scale-[0.98]` and `select-none`?
- [ ] **Mobile Zoom Prevention:** Are all input font sizes `text-base` (16px) on mobile viewports?
- [ ] **Tabular Alignment:** Are all currency amounts (`₹`), timestamps, and phone numbers styled with `tabular-nums` and `font-mono`?
- [ ] **Accessible Labelling:** Do all icon-only buttons include an `aria-label`?
- [ ] **Zero Scroll Motion:** Are animations tied strictly to user interactions (clicks, taps, drawer openings) rather than scroll events?
- [ ] **Non-Breaking Spaces:** Are amounts formatted with `₹&nbsp;X,XXX` to prevent orphaned currency symbols?

---

## 14. Frontend Architecture & Engineering Standards

Synthesizing [`parlak-domain`](file:///Users/thasbeeh/Projects/parlak_resort/.agents/skills/parlak-domain/SKILL.md), [`admin-front-end.md`](file:///Users/thasbeeh/Projects/parlak_resort/docs/admin_panel/admin-front-end.md), [`modern-web-guidance`](file:///Users/thasbeeh/.gemini/config/plugins/modern-web-guidance-plugin/skills/modern-web-guidance/SKILL.md), and [`web-design-guidelines`](file:///Users/thasbeeh/Projects/parlak_resort/.agents/skills/web-design-guidelines/SKILL.md), the Parlak Resort frontend is structured for extreme runtime reliability, zero subscription bloat ($0 cost tier), and high perceived speed.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND ARCHITECTURE TIERS                     │
├────────────────────────────────────────────────────────────────────────┤
│ 1. EDGE / NETWORK BOUNDARY: middleware.ts (jose Web Crypto JWT verify) │
├────────────────────────────────────────────────────────────────────────┤
│ 2. SERVER LAYER: Next.js 16 RSC (Direct Prisma queries + Zero API hop) │
├────────────────────────────────────────────────────────────────────────┤
│ 3. MUTATION LAYER: Next.js Server Actions ("use server" + revalidate)  │
├────────────────────────────────────────────────────────────────────────┤
│ 4. CLIENT SYNC LAYER: SWR (fallbackData + revalidateOnFocus + 30s poll)│
├────────────────────────────────────────────────────────────────────────┤
│ 5. FORM LAYER: React Hook Form + Zod v4 shared schemas (uncontrolled)  │
├────────────────────────────────────────────────────────────────────────┤
│ 6. PRESENTATION LAYER: Base UI / Radix primitives + Tailwind CSS v4    │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 14.1 Component Organisation & Layering

Components are organized into strict concentric layers of responsibility. Lower layers must never depend on higher layers:

```
components/
├── ui/                   # Layer 1: Primitive headless & token wrappers (Domain-Agnostic)
│   ├── button.tsx        # Tactile buttons with active:scale-[0.98]
│   ├── input.tsx         # Inputs with mobile 16px font guard
│   ├── currency-input.tsx# Fixed ₹ prefix + integer formatting
│   ├── dialog.tsx        # Radix / Base UI accessible dialogs
│   ├── sheet.tsx         # Slide-over drawers for rapid mutations
│   ├── tabs.tsx          # Segmented stay-type controls
│   ├── status-badge.tsx  # Semantic state pills
│   └── table.tsx         # High-density operational table primitives
│
├── shared/               # Layer 2: Cross-cutting composite widgets
│   ├── collision-alert.tsx # GiST 409 & OCC stale record inline traps
│   ├── date-range-picker.tsx # Calendar bounds for IST slots
│   ├── empty-state.tsx   # Graceful zero-record placeholders
│   ├── metric-tile.tsx   # Top operational metric display cards
│   └── print-wrapper.tsx # Native @media print frame controller
│
└── admin/                # Layer 3: Domain-specific compound features
    ├── AdminSidebar.tsx  # Desktop 260px sidebar / Tablet 68px rail
    ├── AdminHeader.tsx   # Sticky top operational status & profile bar
    ├── BookingRow.tsx    # High-density tabular booking row
    ├── FolioSheet.tsx    # Slide-over folio & line-item settlement drawer
    ├── SlabsTable.tsx    # Headcount slab builder with contiguous checks
    └── UnitCard.tsx      # Inventory management & photo queue cards
```

#### Colocation Rules
- **Route-Exclusive Components:** If a component is used exclusively within a single route (e.g. `/admin/pricing/new`), it is colocated directly within that route's `_components/` directory:
  ```text
  app/admin/pricing/new/
  ├── _components/
  │   ├── SlabRowInput.tsx
  │   └── SlabContiguityWarning.tsx
  └── page.tsx
  ```
- **Cross-Route Components:** If a component is used across multiple admin routes (e.g. `FolioSheet`, `CollisionAlert`), it belongs in `components/admin/` or `components/shared/`.

---

### 14.2 Feature & Module Structure (Domain Colocation)

The monorepo organizes domain capabilities horizontally across `actions/`, `schemas/`, `lib/`, and `app/admin/`:

```text
parlak_resort/
├── actions/                  # Next.js Server Actions ("use server")
│   ├── auth.ts               # Login credential verification & JWT cookie issue
│   ├── bookings.ts           # Booking creation, post-confirmation edits, folio
│   ├── units.ts              # Unit status toggle, maintenance blocking
│   └── pricing.ts            # Price list creation, slab replacement, modifiers
│
├── schemas/                  # Shared Zod v4 validation contracts
│   ├── auth.ts               # Login credentials schema
│   ├── booking.ts            # Booking parameters, line items, payments
│   ├── unit.ts               # Unit capacity caps & photo metadata
│   └── pricing.ts            # Headcount slabs & contiguous range schemas
│
├── lib/                      # Core business logic & infrastructure utilities
│   ├── db.ts                 # Prisma Client singleton with PgBouncer binding
│   ├── auth.ts               # JWT signing & verification via jose (Web Crypto)
│   ├── pricing.ts            # Single source of truth for pricing & slab math
│   ├── dates.ts              # IST timezone arithmetic via date-fns
│   └── utils.ts              # cn() class merging utility
│
└── app/admin/                # Admin App Router views
    ├── layout.tsx            # Root admin shell (Sidebar + Header + SafeViewport)
    ├── dashboard/page.tsx    # RSC operational cockpit + SWR metrics
    ├── bookings/
    │   ├── page.tsx          # Bookings data table + search/filter
    │   ├── new/page.tsx      # Manual WhatsApp booking creation wizard
    │   └── [id]/print/page.tsx # Pure CSS printable invoice view
    ├── units/
    │   ├── page.tsx          # Unit catalog list & status switches
    │   └── [id]/page.tsx     # Cloudinary gallery & unit capacity editor
    ├── pricing/
    │   ├── page.tsx          # Price lists overview table
    │   ├── new/page.tsx      # Create headcount slab wizard
    │   ├── [id]/page.tsx     # Edit existing slabs with contiguous validation
    │   └── modifiers/page.tsx# Weekend & seasonal percentage variance manager
    └── settings/page.tsx     # Resort profile & seeded admin credentials
```

---

### 14.3 State Management Philosophy (URL-First & Least State)

With only 3 seeded administrators and a strict $0 tier mandate, heavy client-side global state managers (such as Redux, Zustand, or Jotai) add unnecessary bundle bloat and out-of-sync bugs. 

Parlak Resort implements the **Principle of Least State**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        STATE DISCIPLINE MATRIX                         │
├───────────────────┬────────────────────────────┬───────────────────────┤
│ STATE CATEGORY    │ STORAGE MEDIUM             │ EXAMPLES              │
├───────────────────┼────────────────────────────┼───────────────────────┤
│ 1. Filter / Search│ URL Search Params          │ ?status=CONFIRMED     │
│    (Shareable)    │ (?key=value)               │ &unit=DOMES&q=98765   │
├───────────────────┼────────────────────────────┼───────────────────────┤
│ 2. Server Data    │ RSC + SWR Cache            │ Bookings list, revenue│
│    (Authoritative)│ (revalidateOnFocus)        │ metrics, unit status  │
├───────────────────┼────────────────────────────┼───────────────────────┤
│ 3. Ephemeral UI   │ React useState / useReducer│ Drawer open/close,    │
│    (Transient)    │                            │ active tab, modal open│
├───────────────────┼────────────────────────────┼───────────────────────┤
│ 4. Form Drafts    │ React Hook Form state      │ Unsaved slab edits,   │
│    (Uncontrolled) │ (isDirty tracking)         │ folio line item rows  │
└───────────────────┴────────────────────────────┴───────────────────────┘
```

#### URL Search Params as the Single Source of Truth
Filter state, search queries, pagination, and active tabs are stored exclusively in the browser URL via `useSearchParams` and `useRouter`:
- **Shareable operational state:** An admin can copy the URL `https://resort.parlak.in/admin/bookings?status=CHECKED_IN&date=today` and send it to another admin on WhatsApp.
- **Back/Forward browser navigation:** Works out-of-the-box without state desynchronization.
- **Zero synchronization boilerplate:** Eliminates synchronization bugs between filter buttons and table data queries.

---

### 14.4 Server-State & Data-Fetching Approach (RSC + SWR Hybrid)

To stay comfortably within Neon Postgres's Free Tier (100 CU-hours/month with auto-suspend after 5 minutes of inactivity), **WebSockets and continuous long-polling are strictly forbidden**.

Instead, Parlak Resort implements an **RSC Initial Render + SWR On-Demand Sync** pattern:

```
                            Visitor / Admin Navigation
                                       │
                                       ▼
                       Next.js React Server Component (RSC)
                                       │
                         Queries Neon Postgres via Prisma
                                       │
                                       ▼
               Passes serialized data to Client Component as `fallbackData`
                                       │
                                       ▼
                     Client Component initializes SWR:
                     useSWR(cacheKey, fetcher, { fallbackData })
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
           revalidateOnFocus: true                refreshInterval: 30000
       Syncs INSTANTLY when admin             Background poll every 30s
       switches back from WhatsApp            (preserves Neon sleep hours)
```

#### SWR Client Implementation
```tsx
// hooks/use-admin-bookings.ts
"use client";

import useSWR from "swr";
import { type BookingRecord } from "@/schemas/booking";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch operational bookings");
  return res.json();
};

export function useAdminBookings(initialData: BookingRecord[], queryParams: string) {
  const { data, error, isLoading, mutate } = useSWR<BookingRecord[]>(
    `/api/admin/bookings?${queryParams}`,
    fetcher,
    {
      fallbackData: initialData,
      revalidateOnFocus: true,      // Instantly refetches when returning from WhatsApp
      refreshInterval: 30000,        // 30-second silent background poll
      dedupingInterval: 5000,        // Prevents burst requests
    }
  );

  return {
    bookings: data ?? initialData,
    isLoading,
    isError: error,
    refreshBookings: () => mutate(),
  };
}
```

#### Mutation Revalidation Cycle
When an admin performs a mutation via a Server Action (`recordPayment`, `cancelBooking`, `createUnitBlock`):
1. The Server Action executes in an atomic database transaction.
2. The Server Action calls `revalidatePath('/admin/bookings')` to invalidate the Next.js server cache.
3. The client calls `mutate()` on the SWR key to update client views with zero layout shifts.

---

### 14.5 Form Handling Architecture (React Hook Form)

To maintain 60/120fps UI performance and avoid sluggish typing on low-powered mobile devices, all forms are implemented using **uncontrolled components with React Hook Form**.

#### Principles
1. **Uncontrolled by Default:** Form fields register directly via `register("fieldName")`. React does NOT re-render the form component on every keystroke.
2. **Dynamic Folio Line Items via `useFieldArray`:**
   - Pre-checkout bills use `useFieldArray` to append, edit, and remove manual line items (e.g. "Kayaking rental: ₹500", "Extra breakfast: ₹700") with immediate local Rupee summation.
3. **Dirty Form Guard (`isDirty`):**
   - If an admin edits pricing slabs or customer details and attempts to navigate away, the system intercepts navigation via a browser dialog preventing accidental data loss:
     ```tsx
     useEffect(() => {
       const handleBeforeUnload = (e: BeforeUnloadEvent) => {
         if (isDirty) e.preventDefault();
       };
       window.addEventListener("beforeunload", handleBeforeUnload);
       return () => window.removeEventListener("beforeunload", handleBeforeUnload);
     }, [isDirty]);
     ```

---

### 14.6 Validation Strategy (Zod v4 Shared Contract)

Validation logic is never duplicated. A single Zod schema defines the contract for both client-side form validation and server-side action validation.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        UNIFIED VALIDATION PIPELINE                     │
├────────────────────────────────────────────────────────────────────────┤
│                       Shared Zod Schema in schemas/                    │
│                                     │                                  │
│                 ┌───────────────────┴───────────────────┐              │
│                 ▼                                       ▼              │
│       Client-Side Resolver                    Server-Side Action       │
│  @hookform/resolvers/zod                  schema.safeParse(formData)   │
│  • Instant inline field errors            • Kernel security boundary   │
│  • Contiguity range warnings              • Database injection guard   │
│  • iOS numeric keypad enforcement         • Type-safe parsed payload   │
└────────────────────────────────────────────────────────────────────────┘
```

#### Contiguous Headcount Slab Validator Example
Relational databases cannot natively validate contiguous ranges across multiple rows. The Zod schema enforces this business invariant before data reaches Prisma:

```ts
// schemas/pricing.ts
import { z } from "zod";

export const priceSlabSchema = z.object({
  minHeadcount: z.coerce.number().int().positive("Minimum headcount must be at least 1"),
  maxHeadcount: z.coerce.number().int().positive("Maximum headcount must be positive"),
  basePrice: z.coerce.number().int().nonnegative("Base price cannot be negative"),
  requiredAdvance: z.coerce.number().int().nonnegative("Advance cannot be negative"),
});

export const priceListFormSchema = z
  .object({
    profileName: z.string().min(3, "Profile name must be at least 3 characters"),
    unitType: z.enum(["DOMES", "A_FRAMES", "NON_AC_HALL", "AC_HALL"]),
    maxGuestCapacity: z.coerce.number().int().positive(),
    overnightSlabs: z.array(priceSlabSchema).min(1, "At least one slab required"),
  })
  .superRefine((data, ctx) => {
    // 1. Sort slabs by minHeadcount
    const sorted = [...data.overnightSlabs].sort((a, b) => a.minHeadcount - b.minHeadcount);

    // 2. Invariant: Lowest slab must start at 1
    if (sorted[0].minHeadcount !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["overnightSlabs", 0, "minHeadcount"],
        message: "The first slab must start at min headcount 1",
      });
    }

    // 3. Invariant: Slabs must be contiguous without gaps or overlaps
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const current = sorted[i];

      if (current.minHeadcount !== prev.maxHeadcount + 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["overnightSlabs", i, "minHeadcount"],
          message: `Slab gap/overlap detected: Slab ${i + 1} must start at ${prev.maxHeadcount + 1}`,
        });
      }
    }
  });
```

---

### 14.7 Error Handling & Concurrency Traps

To handle multi-admin concurrency cleanly, errors are treated as first-class domain results rather than unhandled exceptions.

#### Standardized Server Action Result Monad
All Server Actions return a typed result object:

```ts
// lib/actions.ts
export type ActionResult<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: {
        code: "UNIT_SCHEDULE_COLLISION" | "BOOKING_STALE_RECORD" | "VALIDATION_ERROR" | "INTERNAL_ERROR";
        message: string;
        details?: Record<string, unknown>;
        fieldErrors?: Record<string, string[]>;
      };
    };
```

#### Trapping PostgreSQL GiST Overlaps & OCC Stale Records
When multiple admins submit overlapping bookings or modify the same record concurrently:

```ts
// actions/bookings.ts
"use server";

import { prisma } from "@/lib/db";
import { type ActionResult } from "@/lib/actions";

export async function updateBookingDates(
  bookingId: string,
  expectedUpdatedAt: Date,
  newStart: Date,
  newEnd: Date
): Promise<ActionResult<{ updated: boolean }>> {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Optimistic Concurrency Control (OCC) Check
      const existing = await tx.booking.findUnique({
        where: { id: bookingId },
        select: { updatedAt: true },
      });

      if (!existing || existing.updatedAt.getTime() > expectedUpdatedAt.getTime()) {
        return {
          success: false,
          error: {
            code: "BOOKING_STALE_RECORD",
            message: "Conflict: This booking was modified concurrently by another Admin.",
          },
        };
      }

      // 2. Perform Mutation (Triggers PostgreSQL GiST exclusion constraint)
      await tx.bookingUnit.updateMany({
        where: { bookingId },
        data: { startDatetime: newStart, endDatetime: newEnd },
      });

      await tx.booking.update({
        where: { id: bookingId },
        data: { updatedAt: new Date() },
      });

      return { success: true, data: { updated: true } };
    });
  } catch (error: any) {
    // 3. Trap PostgreSQL 23P01 Exclusion Violation / Prisma P2002
    if (error.code === "P2002" || error.message?.includes("no_overlapping_unit_bookings") || error.code === "23P01") {
      return {
        success: false,
        error: {
          code: "UNIT_SCHEDULE_COLLISION",
          message: "Unit Schedule Collision: One or more selected units are already reserved for this time window.",
        },
      };
    }

    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred while updating the reservation." },
    };
  }
}
```

---

### 14.8 Authentication & Edge Route Protection (`jose` Web Crypto)

To prevent compatibility issues between React 19.2, Next.js 16, and third-party auth providers, authentication is built using native **Web Crypto API via `jose`**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATION ARCHITECTURE                     │
├────────────────────────────────────────────────────────────────────────┤
│ • Accounts: Strictly 3 seeded Admins in PostgreSQL (No public signup)  │
│ • Passwords: Salted & hashed using bcryptjs                            │
│ • Tokens: Signed HS256 JWT containing { sub, username, role: "ADMIN" } │
│ • Storage: HTTP-only, Secure, SameSite=Lax cookie: `admin_token`       │
│ • Enforcement: Edge middleware (middleware.ts) on all /admin/* routes  │
└────────────────────────────────────────────────────────────────────────┘
```

#### Edge Middleware Implementation
```ts
// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET || "parlak-secret-key-32-chars-minimum");

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow public admin login and public website routes
  if (pathname === "/admin/login" || !pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // 2. Check for HTTP-only JWT session cookie
  const token = request.cookies.get("admin_token")?.value;

  if (!token) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // 3. Verify signed token at the edge using Web Crypto
    await jwtVerify(token, JWT_SECRET);
    return NextResponse.next();
  } catch (err) {
    // Token expired or invalid signature -> clear cookie and redirect
    const response = NextResponse.redirect(new URL("/admin/login", request.url));
    response.cookies.delete("admin_token");
    return response;
  }
}

export const config = {
  matcher: ["/admin/:path*"],
};
```

---

### 14.9 Reusable Component Strategy & Compound Pattern

Components in Parlak Resort follow the **Compound Component Pattern** built on top of accessible Radix and Base UI primitives:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      REUSABLE COMPONENT HIERARCHY                      │
├────────────────────────────────────────────────────────────────────────┤
│ Layer 1: Headless Core (Accessible primitives: Radix UI / Base UI)     │
│          • Manages focus traps, keyboard arrow navigation, ARIA states │
│                                                                        │
│ Layer 2: Styled Atoms (components/ui/*)                                │
│          • Injects Tailwind CSS v4 OKLCH tokens & tactile active press │
│          • Standardizes h-10 desktop / 16px mobile input guard         │
│                                                                        │
│ Layer 3: Domain Compounds (components/admin/*)                         │
│          • Composes primitives into complete domain experiences        │
│          • Example: FolioDrawer (Sheets + LineItemArray + ReceiptPrint)│
└────────────────────────────────────────────────────────────────────────┘
```

#### Compound Component Example: The Folio Drawer (`FolioDrawer`)
Instead of assembling dialogs, forms, and calculation tables from scratch across different pages, the Folio Drawer is packaged as a reusable compound component:

```tsx
// Usage in any admin view:
<FolioDrawer bookingId={selectedId} isOpen={isOpen} onClose={closeDrawer}>
  <FolioDrawer.Summary />
  <FolioDrawer.UnitTariffTable />
  <FolioDrawer.AddLineItemTool />
  <FolioDrawer.PaymentLedger />
  <FolioDrawer.SettlementActions onCheckOutSuccess={refreshBookings} />
</FolioDrawer>
```

This guarantees that folio calculations, integer Rupee rounding, zero-balance checks before checkout, and `@media print` receipts behave with absolute consistency everywhere in the application.

---

## 15. Non-Functional Requirements & Operational Governance

To ensure the Parlak Resort admin panel remains robust, accessible, secure, and compliant over its lifecycle, the application enforces the following non-functional engineering standards:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      NON-FUNCTIONAL STANDARDS MATRIX                   │
├─────────────────────┬──────────────────────────┬───────────────────────┤
│ PILLAR              │ SPECIFICATION / STANDARD │ TARGET BENCHMARK      │
├─────────────────────┼──────────────────────────┼───────────────────────┤
│ 1. Accessibility    │ WCAG 2.2 AA & 508        │ 100% Keyboard & ARIA  │
│ 2. Performance      │ Core Web Vitals + $0 Tier│ LCP < 1.2s • INP <100ms│
│ 3. Browser Support  │ Modern Evergreen 2024–26 │ Chrome, Safari, FF    │
│ 4. Security         │ Edge JWT + GiST Isolation│ Zero XSS • Zero CSRF  │
│ 5. Audit & Telemetry│ Immutable AuditLog table │ 100% Mutation Diffing │
└─────────────────────┴──────────────────────────┴───────────────────────┘
```

---

### 15.1 Accessibility (WCAG 2.2 Level AA & Section 508)

The Admin Panel adheres strictly to **WCAG 2.2 Level AA** standards and Vercel's Web Interface Guidelines ([`web-design-guidelines`](file:///Users/thasbeeh/Projects/parlak_resort/.agents/skills/web-design-guidelines/SKILL.md)).

#### A. Semantic Structure & Screen Reader Tree
1. **Semantic HTML First:**
   - Navigational anchors use `<Link>` / `<a>`; interactive triggers use `<button type="button">`; tabular grids use `<table>`, `<thead>`, `<tbody>`, `<th>`, `<td>`.
   - Never use `<div onClick>` or `<span onClick>` for interactive elements.
2. **Accessible Dialogs, Drawers & Popovers ([`shadcn`](file:///Users/thasbeeh/Projects/parlak_resort/.agents/skills/shadcn/SKILL.md)):**
   - Every `Dialog`, `Sheet`, and `Drawer` component **must include an accessible title** (`DialogTitle`, `SheetTitle`). If visually hidden, apply `className="sr-only"`.
   - Modals trap keyboard focus automatically and restore focus to the triggering element upon dismissal (`Escape` key supported natively).
3. **Descriptive Labelling:**
   - Icon-only buttons (e.g. `X` close, `⋮` menu, `🔍` search) **must have an explicit `aria-label`** (e.g. `aria-label="Close folio drawer"`).
   - Decorative icons must specify `aria-hidden="true"`.
4. **Asynchronous Feedback:**
   - Concurrency warnings, OCC conflict banners, and live receipt status updates use `aria-live="polite"` to announce updates to screen readers without interrupting active speech.

#### B. Color Contrast & Optical Legibility
1. **Contrast Ratios (OKLCH Verified):**
   - Normal text (`14px` / `16px`): Exceeds `4.5:1` contrast ratio against `--background`.
   - Large headings (`24px+`): Exceeds `3.0:1` contrast ratio.
   - Active UI boundaries and focus rings: Exceeds `3.0:1` contrast ratio against adjacent surfaces.
   - High-contrast muted text: `--muted-foreground` (`oklch(0.48 0.02 140)`) achieves a `7.1:1` AAA contrast ratio on alabaster paper surfaces.
2. **Focus Visibility:**
   - Interactive elements enforce visible focus rings: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1`.
   - Bare `outline: none` is strictly forbidden unless paired with a replacement focus ring. Mouse clicks do not trigger focus rings (gated via `:focus-visible`).

#### C. Motion Accessibility (`prefers-reduced-motion`)
- When a user enables reduced motion at the OS level, all micro-interactions, scale compressions, and slide-over animations are disabled:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, ::before, ::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
  ```

---

### 15.2 Performance Expectations & Zero-Cost Budgets

The system operates under a strict **$0 Total Cost mandate** across Vercel Hobby and Neon Postgres Free tiers ([`stack_list.md`](file:///Users/thasbeeh/Projects/parlak_resort/docs/stack_list.md)). Performance optimization directly preserves free-tier quotas while guaranteeing sub-second response times.

#### A. Core Web Vitals (CWV) Targets
| Metric | Benchmark Target | Architectural Mechanism |
| :--- | :--- | :--- |
| **Largest Contentful Paint (LCP)** | **< 1.2s** (Desktop) / **< 1.8s** (Mobile) | React Server Components render initial HTML directly from server memory. |
| **Interaction to Next Paint (INP)** | **< 100ms** (Snappy) | Emil Kowalski tactile physics; uncontrolled React Hook Form inputs. |
| **Cumulative Layout Shift (CLS)** | **0.00** (Zero Shift) | Explicit image aspect ratios (`16:10`); tabular font metrics; table skeleton loaders. |
| **First Contentful Paint (FCP)** | **< 0.8s** | Zero client-side CSS-in-JS runtime; pure Tailwind CSS v4 utility classes. |

#### B. Bundle Size & Dependency Budgets
- **Client JavaScript Budget:** Strictly **< 85 kB gzipped** for the main admin layout and table routes.
- **Zero Heavy PDF Engines:** Invoices use native `@media print` CSS formatted via browser `window.print()`. This saves **~450 kB** of client bundle size compared to `@react-pdf/renderer` or PDF.js.
- **Zero Runtime Animation Engines:** Eliminates Framer Motion / GSAP (~35–60 kB). Uses native CSS transforms and `@theme` timing functions.
- **Zero Client-Side Math Duplication:** Pricing slab evaluation and night-by-night calculations run on the server in `lib/pricing.ts`.

#### C. Cloud Database CPU Budget (Neon Postgres Scale-to-Zero)
- **Quota:** 100 Compute Unit (CU) hours per month on Neon Free Tier.
- **Auto-Suspend:** Neon scales to zero after **5 minutes of inactivity**.
- **Preservation Strategy:**
  - **Zero WebSockets / Long-Polling:** Continuous polling would keep the compute node awake 24/7 (exhausting 720 CU-hours/mo).
  - **SWR On-Demand Polling:** SWR pauses background polling when the browser tab is hidden and refetches only when the window regains focus (`revalidateOnFocus: true`), keeping active compute under **15–20 CU-hours/month** (an 80%+ safety buffer).

#### D. Media Pipeline Budget (Cloudinary Free Tier)
- **Quota:** 25 GB monthly bandwidth / 25 GB storage.
- **Client Direct Upload:** Browser uploads photos directly to Cloudinary using unsigned/signed REST presets with client-side 3MB file limits. Bypasses Vercel serverless function memory and execution time limits.
- **On-the-Fly Optimization:** Cloudinary generates WebP/AVIF formats and responsive thumbnails automatically via URL parameters (`f_auto,q_auto,w_800`).

---

### 15.3 Browser Support & Baseline Web Compatibility

The admin interface targets modern evergreen desktop and mobile browsers used by resort staff, adhering to the Web Platform Baseline standard ([`modern-web-guidance`](file:///Users/thasbeeh/.gemini/config/plugins/modern-web-guidance-plugin/skills/modern-web-guidance/SKILL.md)):

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SUPPORTED BROWSER MATRIX                        │
├───────────────────────────────┬─────────────────┬──────────────────────┤
│ BROWSER PLATFORM              │ MINIMUM VERSION │ ENGINE               │
├───────────────────────────────┼─────────────────┼──────────────────────┤
│ Google Chrome (Desktop & Android)│ Chrome 120+   │ Blink / V8           │
│ Apple Safari (macOS & iOS/iPadOS)│ Safari 17.0+  │ WebKit / Nitro       │
│ Mozilla Firefox               │ Firefox 120+    │ Gecko / SpiderMonkey │
│ Microsoft Edge                │ Edge 120+       │ Blink / V8           │
└───────────────────────────────┴─────────────────┴──────────────────────┘
```

#### Required Modern Web APIs
- **OKLCH Color Space:** Native CSS color representation for uniform perceptual contrast.
- **CSS Container Queries & `:has()`:** Enables component-level responsive styling for table cards and input groups.
- **Dynamic Viewport Units:** `100dvh` (drawers and sheets) and `100svh` (login and hero viewports).
- **Web Crypto API (`crypto.subtle`):** Native edge cryptographic verification for `jose` JWT sessions without Node.js polyfills.
- **Touch Manipulation:** `touch-action: manipulation` to eliminate 300ms mobile tap delays.

---

### 15.4 Security Considerations & Cryptographic Integrity

Because the Admin Panel controls financial records, guest personally identifiable information (PII), and live room reservations, security is enforced across all architectural layers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SECURITY PERIMETER LAYERS                       │
├────────────────────────────────────────────────────────────────────────┤
│ 1. EDGE FIREWALL: Vercel DDoS protection + Strict HTTPS redirect       │
├────────────────────────────────────────────────────────────────────────┤
│ 2. REVERSE PROXY / MIDDLEWARE: Jose Web Crypto JWT signature check    │
├────────────────────────────────────────────────────────────────────────┤
│ 3. CREDENTIAL SECURITY: Bcryptjs salted hashing (Cost factor 12)       │
├────────────────────────────────────────────────────────────────────────┤
│ 4. SESSION ENCLAVE: HTTP-only, Secure, SameSite=Lax cookie storage     │
├────────────────────────────────────────────────────────────────────────┤
│ 5. MUTATION BOUNDARY: Next.js Server Actions native CSRF origin check  │
├────────────────────────────────────────────────────────────────────────┤
│ 6. DATABASE ISOLATION: GiST exclusion constraints & check constraints  │
└────────────────────────────────────────────────────────────────────────┘
```

#### A. Administrative Account Enclave
- **Strict 3-Admin Cap:** Exactly 3 administrative accounts seeded directly in PostgreSQL.
- **Zero Public Registration:** No customer account tables, no registration endpoints, and no self-service password reset forms.
- **Password Hashing:** Passwords hashed with `bcryptjs` using 12 salt rounds.

#### B. Session Authentication & Token Protection
- **JWT Cryptography:** Signed HS256 tokens using `jose` with an environment secret (`ADMIN_JWT_SECRET` ≥ 32 characters).
- **Session Cookie Attributes:**
  ```http
  Set-Cookie: admin_token=<signed-jwt>; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800
  ```
- **XSS Immunity:** Zero session tokens or credentials stored in `localStorage` or `sessionStorage`. Malicious client scripts cannot extract the session token.
- **CSRF Protection:** Server Actions natively enforce Same-Origin request headers, neutralizing Cross-Site Request Forgery.

#### C. Concurrency & Database-Level Isolation
- **PostgreSQL GiST Constraint:** Physical inventory protection (`no_overlapping_unit_bookings` using `btree_gist` and `tstzrange`) runs at the database kernel level. Even if two admins submit bookings simultaneously via different tabs, PostgreSQL rejects the second transaction with error `23P01`.
- **Optimistic Concurrency Control (OCC):** Every booking mutation validates `expectedUpdatedAt`. Stale updates return HTTP `409 Conflict` (`BOOKING_STALE_RECORD`).
- **Database Floor Guard:** Database CHECK constraint `chk_booking_unit_price` (`unitPrice >= 0`) prevents negative room tariffs.

#### D. Content Security & Hardening Headers
Enforced via Next.js configuration (`next.config.ts`):
```ts
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },                      // Anti-clickjacking
  { key: "X-Content-Type-Options", value: "nosniff" },            // MIME-sniffing prevention
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];
```

---

### 15.5 Analytics, Telemetry & Audit Trail Requirements

To provide operational transparency across the 3 resort managers, all critical transactions record immutable audit entries ([`parlak-domain`](file:///Users/thasbeeh/Projects/parlak_resort/.agents/skills/parlak-domain/SKILL.md)).

#### A. The Immutable Audit Log Schema
Whenever an admin modifies a reservation, alters pricing slabs, or applies a maintenance block, the action creates an immutable row in the `AuditLog` table within the same atomic Prisma transaction:

```prisma
model AuditLog {
  id            String   @id @default(cuid())
  timestamp     DateTime @default(now())
  adminUsername String   // e.g. "admin_john"
  action        String   // "CREATE_BOOKING" | "UPDATE_DATES" | "RECORD_PAYMENT" | "CANCEL_BOOKING" | "UPDATE_SLABS"
  entityType    String   // "BOOKING" | "PRICE_LIST" | "PRICE_SLAB" | "UNIT"
  entityId      String   // Target primary key
  diff          Json     // JSONB payload capturing { before: {...}, after: {...} }
  ipAddress     String?
  userAgent     String?

  @@index([entityType, entityId])
  @@index([timestamp])
}
```

#### B. Real-Time Operational Cockpit Metrics
The Admin Dashboard (`/admin/dashboard`) derives operational metrics directly from PostgreSQL without requiring third-party analytics services:

1. **Rolling 30-Day Net Revenue:**
   - Evaluated as:
     $$\text{Net Revenue} = \sum_{\text{Active}} \text{rent\_charge} + \sum_{\text{Cancelled}} (\text{total\_paid} - \text{refund\_amount})$$
   - Maintained automatically via the PostgreSQL `trigger_calculate_net_revenue` database trigger.
2. **Resident Overnight Guests (IST-Aware):**
   - Query strictly filters `stayType = 'OVERNIGHT'` across Domes and A-Frames on the current calendar date in `Asia/Kolkata`. Excludes event attendees and daytime visitors.
3. **Daily Arrival & Departure Schedule:**
   - Check-ins: `startDatetime` between `12:00 PM` today and `11:00 AM` tomorrow.
   - Check-outs: `endDatetime` matching today with outstanding balance dues flagged in amber (`Due > ₹0`).
4. **Event Hall Shift Operations Dual Cards (`HallShiftCards.tsx`):**
   - Operational headcount monitoring for Non-AC Hall (Active Venue) and AC Hall (Under Construction) across Morning (10:00–15:00) and Evening (17:00–22:00) shifts.
   - **Card Architecture (`rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs`):**
     - **Header Row:**
       - Left: `size-10 rounded-xl` icon container (`Building2` in emerald for active, muted for construction) paired with Title (`Non–AC Event Hall` / `AC Event Hall`) and capacity subtitle (`Max Capacity: 1,200 Pax` in `font-mono text-xs tabular-nums`).
       - Right: Rounded pill status badge (`Active Venue` in emerald `bg-emerald-500/10 border-emerald-500/25` vs `Under Construction` in amber `bg-amber-500/10 border-amber-500/25`).
     - **Nested Shift Trays (`grid grid-cols-1 sm:grid-cols-2 gap-3`):**
       - Dual warm alabaster trays (`rounded-xl border border-border/50 bg-surface-subtle/70 dark:bg-surface-subtle/40 p-3.5`).
       - Tray Header: Sun icon in amber (`Morning Shift 10:00–15:00`) / Moon icon in violet (`Evening Shift 17:00–22:00`) with slot hours in `font-mono text-xs tabular-nums`.
       - Tray Metric: Prominent headcount number in `font-mono text-2xl font-bold tracking-tight text-foreground tabular-nums` with `Pax` label.
       - Tray Subtitle: `0 Attendees (No Event Scheduled)` or `{headcount} Attendees (Event Active)`.

#### C. Operational Telemetry & Error Logging
- All API and Server Action failures log structured JSON errors to stdout, captured by Vercel Serverless Logs:
  ```json
  {
    "level": "WARN",
    "timestamp": "2026-10-08T07:25:00Z",
    "event": "CONCURRENCY_COLLISION_TRAPPED",
    "unitId": "dome_02",
    "admin": "admin_sarah",
    "error": "UNIT_SCHEDULE_COLLISION"
  }
  ```
- GiST 409 collisions and OCC stale records are monitored as operational events rather than unhandled application exceptions.

---

## 16. Cross-Platform & Cross-Browser Engineering Invariants (Chrome, Safari, Mac, iPhone, Android)

To ensure seamless operational fidelity and tactile ergonomics across Chromium (Chrome on macOS, Windows, Linux, and Android) and Apple WebKit (Safari on macOS, iPhone iOS, and iPadOS), all administrative desks, cockpits, and mobile views must adhere to the following layout and rendering laws:

### A. The Two-Tier Clean Structural Toolbar Invariant
All operational desks and tabular cockpits (`/admin/dashboard` Today's Operational Roster, `/admin/units`, `/admin/pricing`, `/admin/bookings`) MUST implement the canonical **Two-Tier Clean Structural Toolbar** separated by a subtle 1px divider (`border-b border-border/60 pb-2` or `px-4 py-2.5 sm:px-5 border-b border-border/60`):
- **Tier 1 (Category / Status Ribbon):**
  - Full-width scroll container with horizontal kinetic touch scrolling: `<div className="flex items-center justify-between gap-2 overflow-x-auto [-webkit-overflow-scrolling:touch] overscroll-x-contain">`.
  - Inner tray: `<div className="border border-border/80 bg-surface-subtle/50 inline-flex shrink-0 items-center rounded-lg border p-0.5 gap-0.5">`.
  - **Selected Tab Pill:** Deep River Moss (`bg-primary text-primary-foreground font-medium shadow-xs px-3 py-1 text-xs rounded-md`) with snappy physical compression (`active:scale-[0.98] select-none`).
  - **Inactive Tab:** `text-muted-foreground hover:text-foreground hover:bg-surface-subtle/80 px-3 py-1 text-xs font-medium rounded-md transition-colors`.
  - *Never* place the ribbon and search input in a crammed single-row flex container with `shrink-0`, which breaks WebKit flex layouts on MacBook displays and wraps unpredictably on Android tablets.
- **Tier 2 (Secondary Query Controls & Record Counter):**
  - Search input wrapper on the left: `<div className="relative w-full min-w-0 sm:max-w-xs">`.
  - Record counter or action controls on the right: `<div className="text-muted-foreground font-mono text-xs tabular-nums select-none">`.

### B. Input Box Sizing & WebKit Vertical Padding Law
- **The Replaced Element Rule:** An `<input>` is a replaced element with an internal WebKit shadow DOM. It must NEVER have `display: flex`. Use block or inline-block formatting.
- **The `h-8` Padding Invariant:** When an input has a fixed height of `h-8` ($32\text{px}$), vertical padding MUST be `py-1` ($4\text{px}$), NEVER `py-2` ($8\text{px}$). 
  - *Failure mode:* $16\text{px}\text{ padding} + 2\text{px}\text{ border} = 18\text{px}$, leaving only $14\text{px}$ for text. WebKit shifts text downward, clipping characters and caret cursors at the bottom border.
  - *Enforcement in `components/ui/input.tsx`:* Dynamically applies `py-1` whenever `h-8` is specified and no custom `py-*` is passed.
- **The `type="search"` Ban on Filter Bars:** NEVER use `type="search"` for table filters. In WebKit/Safari, `type="search"` injects browser-native search chrome (`::-webkit-search-cancel-button` and magnifying icons) that alters internal padding, misaligns text vertically, and clashes with custom clear buttons. Always use `type="text"` with `spellCheck={false}`.
- **Clear Buttons:** Interactive clear buttons (`X`) inside inputs must use `appearance-none bg-transparent p-0 border-0 flex size-5 items-center justify-center select-none active:scale-[0.98]` to eliminate default WebKit button padding and misalignments.

### C. Native Form Control Decoupling (`<select>` & `<button>`)
- **Native Select Elimination:** Any `<select>` dropdown must specify `appearance-none [-webkit-appearance:none] pl-2.5 pr-7 py-1 leading-none h-8` paired with an absolute SVG `ChevronDown` (`pointer-events-none absolute right-2 size-3.5 text-muted-foreground`). This prevents macOS Safari and iOS from applying dated Aqua system gradients and misaligning vertical heights.
- **Icon Buttons & Touch Targets:** Always apply `shrink-0` to SVG icons inside buttons, badges, and table rows to prevent WebKit and Chromium flexbox from squishing icons into ovals.

### D. Retina & WebKit Table Hairline Law (`border-separate`)
- On Apple Retina displays (subpixel rendering in WebKit), scrollable table wrappers (`overflow-x-auto rounded-lg border border-border`) with `border-collapse` frequently suffer from subpixel border collapse bugs (borders bleeding past container corners, missing row dividers, or doubled 2px borders).
- Furthermore, with `border-separate border-spacing-0`, WebKit **ignores** `divide-y` on `<tbody>` (since `<tr>` elements cannot render borders in separated table models).
- **Mandatory Table Rule:** Tables inside scroll containers MUST use:
  ```html
  <table className="w-full border-separate border-spacing-0 text-left text-xs">
    <thead>
      <tr className="bg-surface-subtle/60 text-muted-foreground border-b border-border">
        <th className="border-b border-border px-3 py-2.5">...</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td className="border-b border-border/60 px-3 py-2.5">...</td>
      </tr>
    </tbody>
  </table>
  ```
  Every `<th>` and `<td>` explicitly retains `border-b border-border` (or `border-b border-border/60`) to guarantee crisp 1px lines across Retina screens in all browser engines.

### E. Mobile Viewports & Native Touch Invariants (iPhone iOS & Android)
1. **Dynamic Viewport Heights:**
   - Use `h-[100dvh]` for app shells, overlays, and slide-over drawers; use `min-h-[100svh]` for hero sections.
   - Eliminates layout jumps when the address bar expands/collapses on Android Chrome, and prevents the bottom toolbar from obscuring content on iOS Safari.
2. **Safe Area Inset Handling (`env(safe-area-inset-*)`):**
   - All fixed bottom controls (sticky WhatsApp bars, mobile thumb bars, folio actions) must incorporate `pb-[calc(1rem+env(safe-area-inset-bottom))]` paired with `viewportFit: "cover"` in `app/layout.tsx` to clear the iPhone Home Indicator and Android gesture pill.
   - Sticky top headers must respect `pt-[env(safe-area-inset-top)]` on notched or Dynamic Island devices.
3. **iOS Zoom Guard on Form Inputs:**
   - Form inputs must ALWAYS compute to $\ge 16\text{px}$ on touch screens (`text-base md:text-xs` or `text-base md:text-sm`).
   - If font size is under 16px, iOS Safari automatically triggers an unrequested viewport zoom on focus that disorients the user.
4. **Tap Highlight & Selection Guard:**
   - Apply `-webkit-tap-highlight-color: transparent` and `touch-action: manipulation` globally to eliminate delay and gray tap flashes.
   - Apply `select-none [-webkit-user-select:none]` to buttons, tabs, segmented pills, and table row toggles to prevent accidental text selection callouts on repetitive tapping.

### F. Touch & Sticky Hover Prevention Law (iOS, iPadOS, Android)
- Touch devices lack a persistent mouse pointer; tapping triggers `:hover` that remains stuck until another element is tapped.
- Strictly gate hover effects behind `@media (hover: hover) and (pointer: fine)`.
- NEVER apply blanket CSS resets like `*:hover { inherit }` which turn buttons and card surfaces transparent on Safari and touch devices.

### G. Chromium & Android Flex/Grid Resiliency
1. **Flexbox & Grid Min-Width Zero (`min-w-0`):**
   - Flex children and CSS grid cells default to `min-width: auto` in Chrome, causing columns with long text, URLs, or monospace numbers to expand beyond screen bounds.
   - Always apply `min-w-0` to flex child containers, KPI card wrappers, and table text columns to enable proper truncation (`truncate`) and prevent horizontal blowout on Android Chrome.
2. **SVG Icon Shrink Guard (`shrink-0`):**
   - Always apply `shrink-0` to SVG icons inside buttons, badges, and table rows to prevent Chromium and WebKit flexbox from flattening icons into ovals when viewports shrink.
3. **Font Metrics & Numerical Stability (`font-mono tabular-nums`):**
   - Financial figures (`₹&nbsp;4,500`), counts (`12&nbsp;Pax`), times (`10:00–15:00`), and dates must always use `tabular-nums font-mono` to prevent width jitter across Chrome, Safari, and Android default fonts during live polling.





