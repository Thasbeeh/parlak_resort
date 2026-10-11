---
name: vitest
description: Best practices, execution guidelines, and context patterns for writing, running, and reviewing unit tests with Vitest. Use when writing unit tests, configuring test suites, mocking modules, debugging test failures, or running Vitest test runners.
---

# Vitest Unit Testing & AI Workflow Guide

This skill documents guidelines for writing, executing, and reviewing unit tests using **Vitest** in Next.js / TypeScript projects.

---

## 1. Execution & Non-Interactive Command Safety

> [!IMPORTANT]
> **Always run tests with `--no-watch` or `vitest run` in agent/automated environments.**

Vitest enables watch mode by default. Interactive watch mode will hang CLI processes indefinitely when executed by automated agents or CI/CD pipelines.

* **Run all tests once and exit:**
  ```bash
  npx vitest run
  ```
* **Run a specific test file:**
  ```bash
  npx vitest run tests/pricing-and-actions.test.ts
  ```
* **Run matching test pattern:**
  ```bash
  npx vitest run -t "Pricing Engine"
  ```
* **Npm Script shortcut:**
  Ensure `package.json` includes `"test": "vitest run"` and execute:
  ```bash
  npm test
  ```

---

## 2. Providing Context for AI-Generated Tests

When asking or prompting to generate or update tests:
1. **Include the Full Implementation Source:** Provide the target file, imported types, and helper dependencies so the full function signature and contract are clear.
2. **Share Existing Test Conventions:** Reference existing test files in the project (e.g., `tests/*.test.ts`) so naming conventions, assertion styles, and structure match the repository.
3. **Include Vitest & Environment Config:** Supply Vitest configuration details (e.g., globals, setup files, environment settings).
4. **Include Domain Guardrails & `AGENTS.md`:** Pass domain constraints (e.g., pricing rules, IST timezone logic) so test scenarios reflect real business requirements.

---

## 3. Writing Effective Prompts for Tests

* **Avoid Vague Prompts:** Do not ask `"Write tests for pricing.ts"`.
* **Use Specific & Edge-Case Heavy Prompts:**
  * Define explicit scenarios: `"Write tests for calculateModifiedPrice in lib/pricing/resolve-modifiers.ts. Cover positive percentage surges, negative discounts, zero base rates, and IST weekend boundary checks."`
  * State test structure preferences: `"Group tests by function using describe blocks and use short behavior-focused test names."`
  * Specify async / error behavior: `"Assert on rejected promises using .rejects.toThrow() and verify error validation schemas using safeParse()."`

---

## 4. Vitest API Conventions & Common Pitfalls

### Vitest vs. Jest APIs
* **Use Vitest Utilities:** Always use `vi.fn()`, `vi.spyOn()`, and `vi.mock()`. **Never** use `jest.fn()` or `jest.mock()`.
* **Typed Module Mocks:** Prefer dynamic import forms for type-safe module mocking:
  ```ts
  vi.mock(import('../lib/db'), () => ({
    db: { booking: { create: vi.fn() } },
  }));
  ```

### Mock Cleanup & Isolation
* Ensure mocks do not leak between test cases. Reset or restore mocks in setup/teardown:
  ```ts
  afterEach(() => {
    vi.restoreAllMocks();
  });
  ```

### Concise Test Naming
* Avoid long, verbose test names like `"should correctly return the formatted price string when given a valid positive number"`.
* Use concise, scannable, behavior-driven names:
  * `"formats USD price correctly"`
  * `"throws error on negative deposit"`
  * `"returns empty list when no slabs match"`

---

## 5. Reviewing & Verification Checklist

Before accepting AI-generated or newly written tests, verify:

1. **Meaningful Assertions:**
   * ❌ Avoid weak assertions: `expect(result).toBeDefined()` or `expect(result).toBeTruthy()`.
   * ✅ Assert specific values or shape:
     ```ts
     expect(result).toMatchObject({
       finalPrice: 5000,
       isWeekend: true,
     });
     ```
2. **Behavior vs. Implementation:**
   * Test inputs and outputs, not internal implementation steps. Avoid over-mocking internal methods when testing pure logic.
3. **Execution Verification:**
   * Always execute `npx vitest run` to ensure tests actually compile and pass.
