# AI Agent Skills & Editor Setup Guide

This guide consolidates the exact code editor extensions and AI agent skills required for the **Parlak Resort** tech stack (Next.js 16 App Router, Tailwind CSS, shadcn/ui, Neon PostgreSQL, Prisma, SWR, Vercel). All irrelevant tools (e.g., AI SDK, Eve, Remotion, React Native, custom auth engines) have been filtered out.

---

## 1. Code Editor Extensions

Install the following extensions in your IDE (VS Code / Cursor) for automated styling validation and formatting:

- **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`): Autocomplete, linting, and hover preview for Tailwind classes.
- **Prettier + Prettier Tailwind Plugin** (`prettier-plugin-tailwindcss`): Automatic class sorting matching official recommended class order.

---

## 2. Next.js 16 Agent Rules (`AGENTS.md`)

Next.js 16 bundles version-matched documentation inside `node_modules/next/dist/docs/`. Ensure `AGENTS.md` exists at the root of your project so AI agents reference accurate App Router and React 19 APIs rather than obsolete training data.

Create or verify `AGENTS.md` in the project root:

```markdown
<!-- BEGIN:nextjs-agent-rules -->

# Next.js 16 Project Instructions

This project uses Next.js 16 App Router with React 19.
Always read the relevant guide in `node_modules/next/dist/docs/` before writing or refactoring any code.
Adhere strictly to modern Server Components, Server Actions (`"use server"`), and App Router conventions.

<!-- END:nextjs-agent-rules -->
```

*(Note: Running `next dev` in Next.js 16.3+ will automatically generate or preserve this block).*

---

## 3. Required AI Agent Skills

Install the filtered agent skills using the unified `npx skills` CLI. These skills provide your coding assistant with specialized context for the exact libraries in use.

### A. Next.js & React Development
Provides the agent with runtime verification and modern Next.js/React 19 patterns:

```bash
# Runtime verification foundation (checks routes and dev server compilation issues)
npx skills add vercel/next.js --skill next-dev-loop

# 40+ rules for Next.js & React performance optimization and composition
npx skills add vercel-labs/agent-skills --skill vercel-react-best-practices

# Best practices covering App Router conventions, RSC boundaries, and data patterns
npx skills add vercel-labs/openreview --skill next-best-practices
```

### B. shadcn/ui Component Registry
Enables the agent to inspect `components.json`, select suitable accessible primitives, and follow composition patterns:

```bash
# Installs shadcn context, CLI command knowledge, and accessibility patterns
npx skills add shadcn/ui
```

### C. Neon Serverless Postgres
Provides documentation and patterns for connection pooling, scale-to-zero compute, and database branching workflows:

```bash
# Neon platform overview, Postgres serverless best practices, and branching workflows
npx skills add neondatabase/agent-skills -s neon -s neon-postgres -s neon-postgres-branches -y
```

### D. Prisma ORM (Schema, Migrations & Client Queries)
Equips the agent with accurate syntax for Prisma CLI commands, schema definitions, migrations, transactions, and client queries:

```bash
# Prisma CLI commands (migrate dev, db seed, studio) and Prisma Client API ($transaction, $queryRaw, CRUD)
npx skills add prisma/skills --skill prisma-cli --skill prisma-client-api
```

### E. UI/UX & Web Design Guidelines
Ensures generated interfaces comply with modern design standards, tap targets, contrast, and accessibility:

```bash
# 100+ rules for accessibility, responsive layout, and UX standards
npx skills add vercel-labs/agent-skills --skill web-design-guidelines
```

### F. Aesthetic Art Direction & Anti-Template Design (`anthropics/skills`)
Guides the agent to create distinctive, bespoke visuals tailored to Parlak Resort (luxury hospitality, nature, tranquility) and prevents generic "AI slop" clichés:

```bash
# Distinctive visual identity, typography hierarchy, cohesive palette, anti-cliché layout design
npx skills add anthropics/skills --skill frontend-design
```

### G. Design Engineering & Tactile Micro-Interactions (`emilkowalski/skills`)
Enforces craft principles for snappy motion, natural deceleration physics, button press feedback, and mobile browser glitch fixes:

```bash
# Core micro-interactions, sub-300ms easing, tactile button press, and mobile web polish
npx skills add emilkowalski/skills --skill emil-design-eng --skill mobile-native
```
*(Note: Omit `animate-expo` and `write-swift` from the Emil Kowalski bundle as they target React Native and iOS, which are outside our Next.js web monorepo scope).*

---

## 4. Quick Installation (All-in-One Command)

To set up all required skills at once, run:

```bash
npx skills add vercel/next.js --skill next-dev-loop && \
npx skills add vercel-labs/agent-skills --skill vercel-react-best-practices && \
npx skills add vercel-labs/openreview --skill next-best-practices && \
npx skills add shadcn/ui && \
npx skills add neondatabase/agent-skills -s neon -s neon-postgres -s neon-postgres-branches -y && \
npx skills add prisma/skills --skill prisma-cli --skill prisma-client-api && \
npx skills add vercel-labs/agent-skills --skill web-design-guidelines && \
npx skills add anthropics/skills --skill frontend-design && \
npx skills add emilkowalski/skills --skill emil-design-eng --skill mobile-native
```

---

## 5. Compatibility & Conflict Resolution Analysis

### A. Do `anthropics/skills@frontend-design` & `emilkowalski/skills` Compete or Conflict?
**No. They operate at completely different layers of the design lifecycle and are mutually reinforcing:**

| Dimension | `anthropics/skills@frontend-design` | `emilkowalski/skills` (`emil-design-eng`) |
| :--- | :--- | :--- |
| **Primary Domain** | **Macro-Design / Art Direction** | **Micro-Design / Interaction Physics** |
| **Core Question** | *"What does the resort brand look and feel like?"* | *"How does the UI respond physically to touch and click?"* |
| **Focus Areas** | Color palettes, typography hierarchy, editorial layout, intentional hero sections, avoiding AI tropes (#F4F1EA cream, generic pill tags). | Custom cubic-beziers, sub-300ms timing, button press feedback (`active:scale-[0.97]`), popover transform origins, avoiding `scale(0)` entrances. |
| **Motion Philosophy** | Discourages decorative clutter and generic scroll fade-ins. | Discourages sluggish `ease-in` curves and animating high-frequency actions. |

**Philosophical Harmony:** Both skills explicitly denounce generic "AI slop." Anthropic prevents templated layouts and repetitive palettes; Emil prevents mushy animations and unresponsive buttons. They do not fight for the same decisions.

---

### B. Do They Compete with `/web-design-guidelines`, `/modern-web-guidance`, and `/shadcn`?
**No. Each has a distinct, specialized mandate within the 5-Layer UI Pipeline:**

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. COMPONENT ARCHITECTURE & PRIMITIVES: /shadcn                            │
│    • Radix UI accessible headless controls (Accordion, Dialog, Tabs)        │
│    • Semantic tokens (bg-background, text-foreground, border-border)        │
│    • Form composition rules (FieldGroup + Field, not arbitrary divs)        │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. ART DIRECTION & BRAND IDENTITY: anthropics/skills@frontend-design        │
│    • Subject matter grounding (Luxury nature resort vs corporate SaaS)      │
│    • Typography scale & pairing (Editorial Display + Geometric Sans)        │
│    • Earthy luxury color palette, asymmetric card rhythm, high-craft hero   │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. MOTION & TACTILE CRAFT: emilkowalski/skills                             │
│    • Tactile button clicks (active:scale-[0.97]), sub-300ms duration limits │
│    • Custom easing curves (--ease-out-quad), origin-aware popovers          │
│    • Mobile native feel (100dvh shells, safe area insets, no tap flash)     │
├─────────────────────────────────────────────────────────────────────────────┤
│ 4. WEB PLATFORM STANDARDS & PERFORMANCE: /modern-web-guidance               │
│    • Native browser APIs before npm bloat (Popover API, :has(), @container)│
│    • Next.js <ViewTransition> for zero-JS-footprint route navigation        │
│    • Core Web Vitals optimization (LCP fetchpriority, INP responsiveness)   │
├─────────────────────────────────────────────────────────────────────────────┤
│ 5. ACCESSIBILITY & COMPLIANCE GATE: /web-design-guidelines                  │
│    • WCAG 2.1 AA contrast verification (4.5:1 text, 3:1 controls)           │
│    • Focus rings, keyboard tab-order, ARIA roles, minimum 44px tap targets  │
│    • Audits output using terse file:line reporting                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### C. Stack Compatibility Matrix (`docs/stack_list.md`)

To keep both skills 100% compliant with the Parlak Resort stack:

1. **Tailwind CSS Translation (Zero Custom CSS Overhead):**
   - Translate Emil's raw CSS easing and active states into Tailwind utilities:
     - `active:scale-[0.97]` for buttons and cards.
     - Custom easing variables in `globals.css` or `tailwind.config.ts` (`cubic-bezier(0.23, 1, 0.32, 1)`).
2. **shadcn/ui + Radix UI over Base UI:**
   - Emil's `pick-ui-library` mentions `base-ui`. In this repository, **`docs/stack_list.md` strictly mandates shadcn/ui + Radix UI**. All primitives (`Dialog`, `Accordion`, `Tabs`, `Popover`) come from `components/ui/*`.
3. **Zero Runtime Motion (React 19.2 & Vercel Free Tier):**
   - Use CSS/Tailwind transitions and native Next.js `<ViewTransition>` instead of bundling large Framer Motion runtimes into Server Components.
4. **Mobile Native Polish for Phone Booking:**
   - Apply Emil's `mobile-native` rules: Set `viewportFit: "cover"`, use `pb-[calc(1rem+env(safe-area-inset-bottom))]` on sticky WhatsApp booking bars, eliminate `-webkit-tap-highlight-color`, and ensure inputs have minimum `text-base` (16px) to avoid iOS viewport zooming.

---

### D. Skill Location in Antigravity IDE
Antigravity discovers workspace customizations located in `.agents/skills/`. When skills are installed or maintained in this repo:
```text
.agents/skills/
├── frontend-design/SKILL.md          # Visual art direction & anti-cliché rules
├── emil-design-eng/SKILL.md          # Interaction physics & animation rules
├── mobile-native/SKILL.md            # Mobile browser fixes & safe area rules
├── shadcn/SKILL.md                   # shadcn component composition
├── web-design-guidelines/SKILL.md    # Accessibility & UX audit
└── ...
```

---

## 6. Verification Checklist

- [ ] `AGENTS.md` is present at the repository root.
- [ ] Tailwind CSS IntelliSense & Prettier plugins are active in the editor.
- [ ] Required workspace skills exist in `.agents/skills/`:
  - `next-dev-loop`
  - `vercel-react-best-practices`
  - `next-best-practices`
  - `shadcn`
  - `neon` / `neon-postgres` / `neon-postgres-branches`
  - `prisma-cli` / `prisma-client-api`
  - `web-design-guidelines`
  - `frontend-design` (Art direction & aesthetic identity)
  - `emil-design-eng` (Motion physics & tactile feedback)
  - `mobile-native` (Mobile web-to-app touch polish)
  - `parlak-domain` (Resort inventory, slab math & WhatsApp logic)
- [ ] UI components strictly adhere to the 5-Layer UI Pipeline.

