---
name: zamblak-test-guard
description: Specialist quality and behavioral integrity guard for Zamblak test code. Governs test realism, boundary mocking, assertion depth, async completeness, and prevention of manufactured test passes under AGENTS.md.
---

# Zamblak Test Guard

## Purpose & Scope
This skill provides a specialist judgment and review layer for test code in Zamblak. It evaluates the behavioral validity, resilience, and assertion rigor of newly written or refactored automated tests before they ship, ensuring tests provide genuine verification rather than false confidence.

### Authority Boundaries & Non-Goals
- **Advisory Test Quality Gate:** Reviews test structure, mock boundaries, assertion depth, and regression coverage.
- **Does NOT Run Tests:** This skill is a code-review guard; it does not execute test runners, configure CI pipelines, or manage runner harnesses.
- **NOT Production Code Authority:** Production code quality and refactoring sanity remain the sole domain of `zamblak-clean-code-guard`.
- **NOT Product Authority:** Does not invent product requirements, acceptance criteria, or business workflows.
- **Zero Database/Secret Authority:** Does not authorize live Supabase database access, migration execution, or viewing `.env` secrets.
- **No Style-Only Churn:** Does not block tasks for minor cosmetic formatting, test title aesthetics, or non-functional preferences.

---

## 1. Activation & Routing Triggers

### When to Route `zamblak-test-guard`:
- New automated tests are written (unit, integration, UI, or contract tests).
- Existing test suites are materially edited, restructured, or refactored.
- A task explicitly requests a review of test coverage or test quality.
- Non-trivial implementation work introduces or updates tests alongside production code.

### When NOT to Route:
- Running an existing test suite (execution alone does not require test code review).
- Production-code-only reviews where no tests were added or modified (route `zamblak-clean-code-guard`).
- Documentation-only or governance tasks.
- CI / GitHub Actions workflow configuration.
- Test runner installation or framework upgrade tasks.

---

## 2. Twelve Core Testing Rules

### 1. Test Observable Behavior, Not Implementation Details
- Assert user-visible, caller-visible, API-visible, or database-persisted outcomes.
- Avoid asserting that specific internal helper functions or private methods were invoked, unless the helper represents a genuine, documented system boundary. Tests coupled to internal refactoring details break without behavioral regressions.

### 2. Mock Only Real System Boundaries
- Appropriate mock targets:
  - Network / HTTP requests (e.g. external REST endpoints, third-party webhooks).
  - External third-party SDKs.
  - Database client boundary when application business logic is tested in isolation.
  - Filesystem I/O or temporary runtime directories.
  - Time, timers, or random number generators where deterministic control is necessary.
- **Forbidden:** Never mock internal domain entities, validation schemas, or pure domain helpers merely to achieve unit isolation.

### 3. Use Real Domain & State Objects
- Construct realistic DTOs, domain models, form input payloads, and session contexts wherever practical.
- Mocking state objects with partial or arbitrary shapes risks hiding schema drifts, missing mandatory fields, or typing regressions.

### 4. Every Test Must Catch a Distinct Meaningful Failure
- Avoid redundant near-duplicate tests that exercise identical execution paths with trivial string variations.
- Use parameterized, table-driven test cases when validating multiple input/output permutations for the same logic.

### 5. Do Not Test Framework Guarantees
- Avoid tests that merely verify built-in framework behavior:
  - Do not test that React renders elements or passes standard props.
  - Do not test that Zod validates primitives according to official Zod documentation.
  - Do not test that Next.js App Router performs standard routing.
  - Do not test that Vitest or Node's test runner evaluates boolean assertions.
- Focus test assertions exclusively on Zamblak custom business logic, domain rules, state machines, and error handling layered on top of the framework.

### 6. Protect Regression Tests
- Any test written to reproduce a confirmed defect or incident must remain in the test suite permanently.
- Regression tests must not be deleted or bypassed unless the underlying product capability is intentionally deprecated or removed by an authorized product decision.
- Preserve concise issue or regression context in test descriptions when helpful.

### 7. Never Weaken Tests to Manufacture PASS
The following practices are strictly forbidden:
- Deleting or commenting out assertions to make a failing suite pass.
- Broadening assertion thresholds or accepting `any` to mask unexpected return values.
- Replacing real business logic or integration boundaries with shallow mocks solely to turn builds green.
- Skipping or disabling failing tests (`test.skip`) without explicit, approved justification.
- Hardcoding implementation return values to match arbitrary test fixtures.

### 8. Avoid Snapshot Abuse
- Prefer targeted, semantic assertions (e.g., asserting specific text content, accessibility roles, error messages, or state values).
- Large markup snapshots are brittle, often updated blindly without review, and create maintenance noise without proving correctness.

### 9. Asynchronous Tests Must Prove Completion
- Always properly `await` asynchronous promises, user events, Server Actions, and state transitions.
- Avoid arbitrary, timing-based sleeps (`setTimeout(..., 500)`) when deterministic waiting mechanisms (`waitFor`, event dispatch promises, or completion callbacks) exist.

### 10. Test Security & Tenant Trust Boundaries Explicitly
When security-sensitive, authentication, or multi-tenant code is modified, tests must explicitly verify failure paths:
- Unauthenticated requests fail closed (401 / unauthorized error).
- Cross-tenant requests with invalid `account_id` fail closed (403 / not found).
- Insecure direct object reference (IDOR) attempts via URL manipulation are blocked.
- Suspended or deleted user profiles (`active = false`, `deleted_at IS NOT NULL`) cannot perform actions.
- Legacy `support_helper` cannot access financial tables or financial calculation routes.
- *Routing:* Route `zamblak-security-privacy-guard` alongside this test guard when reviewing security test coverage.

### 11. Match Test Depth to the Subject Under Test
- If database schema, migration constraints, RLS policies, triggers, or PostgreSQL functions are the subject under test, unit mocks are insufficient evidence.
- Testing real database invariants requires database verification; route `zamblak-db-rls-migration-guard` and `zamblak-supabase-data-engineering` for database and query verification.
- This skill does not authorize direct SQL execution or live Supabase mutations.

### 12. Match Zamblak's Existing Test Stack
- Inspect surrounding test patterns before authoring or reviewing tests.
- Zamblak uses:
  - TypeScript and JavaScript.
  - Vitest-compatible test suites for UI and component tests (`src/**/*.test.tsx`, React Testing Library).
  - Node.js built-in test runner (`node:test`, `node:assert`) for deterministic host, delegation, and governance acceptance tests.
- Match existing repository conventions rather than introducing unapproved test libraries or alternative assertion styles.

---

## 3. Review Behavior & Severity Classification

When evaluating changed or generated test files, classify findings into three strict severities:

1. **`BLOCKING`**:
   - Tests falsely claim safety while masking genuine defects.
   - Assertions deleted, weakened, or skipped to manufacture a passing build.
   - Sensitive security, multi-tenant (`account_id`), or financial boundaries left completely unverified in modified security-critical code.
   - Brittle implementation-detail coupling that will immediately break on standard refactors.

2. **`MATERIAL`**:
   - Excessive or unrealistic mocking that conceals schema mismatches or domain errors.
   - Flaky asynchronous tests relying on race conditions or non-deterministic sleeps.
   - Missing negative / failure-case test coverage for error-handling branches.

3. **`MINOR`**:
   - Worthwhile maintainability improvements (e.g., refactoring duplicate setup into table-driven cases).
   - Minor description clarity or test organization refinements that do not affect behavioral verification.

---

## 4. Cross-Skill Routing Integration

- **Changed Production Code:** Route `zamblak-clean-code-guard`.
- **Changed / New Test Code:** Route `zamblak-test-guard`.
- **Security & Multi-Tenant Tests:** Route `zamblak-test-guard` + `zamblak-security-privacy-guard`.
- **Database & Migration Tests:** Route `zamblak-test-guard` + `zamblak-db-rls-migration-guard`.
- **Runtime Supabase Client Tests:** Route `zamblak-test-guard` + `zamblak-supabase-data-engineering`.
- **Smallest Relevant Stack:** Never route all guards simultaneously; select only the specific guards required by the task surface.
