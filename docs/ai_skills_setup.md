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
npx skills add vercel-labs/agent-skills --skill web-design-guidelines
```

---

## 5. Antigravity IDE Compatibility & Conflict Resolution

### A. Skill Location in Antigravity
Antigravity discovers workspace customizations located in `.agents/`. When installing skills via `npx skills`, ensure they are placed in or symlinked to:
```text
.agents/skills/<skill_name>/SKILL.md
```
*(If `npx skills` installs to `.skills/` by default, move or link the folder into `.agents/skills/` for Antigravity to auto-detect them).*

### B. Precedence Hierarchy (Resolving Overlaps)
If guidance from general React/Next skills conflicts with version-specific features:
1. **Top Priority:** Next.js 16 bundled documentation (`node_modules/next/dist/docs/` referenced via `AGENTS.md`).
2. **Second Priority:** `shadcn/ui` composition rules, `prisma` schema conventions, and `components.json`.
3. **Third Priority:** General `vercel-react-best-practices` and `web-design-guidelines`.

---

## 6. Verification Checklist

- [ ] `AGENTS.md` is present at the repository root.
- [ ] Skills reside in `.agents/skills/<skill_name>/SKILL.md` for Antigravity detection.
- [ ] Tailwind CSS IntelliSense & Prettier plugins are active in the editor.
- [ ] Running `npx skills list` shows the installed skills:
  - `next-dev-loop`
  - `vercel-react-best-practices`
  - `next-best-practices`
  - `shadcn/ui`
  - `neon` / `neon-postgres` / `neon-postgres-branches`
  - `prisma-cli` / `prisma-client-api`
  - `web-design-guidelines`
  - `parlak-domain` (custom domain & business logic guardrails)
