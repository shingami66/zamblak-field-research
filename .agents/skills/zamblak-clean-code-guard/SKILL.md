---
name: zamblak-clean-code-guard
description: Practical clean-code and architecture sanity guard for Zamblak production code. Governs code readability, boundary validation, test integrity, error handling, and dependency minimization under AGENTS.md.
---

# Zamblak Clean Code Guard

## Purpose & Scope
This skill provides a practical, repository-aware judgment layer for production code quality and refactoring in Zamblak. It is applied after non-trivial production code changes or refactoring, acting as a sanity check before final independent review.

### Authority Boundaries & Non-Goals
- **Advisory Quality Gate:** Evaluates code clarity, cohesion, error resilience, and maintainability.
- **NOT Product Authority:** Does not invent product requirements or modify business scope.
- **Cannot Override Domain Guards:** Security, multi-tenancy, database migrations, and RTL UX rules take precedence over general clean-code preferences.
- **No Style-Only Churn:** Does not demand cosmetic reformatting or mass stylistic rewrites of working code.
- **No Arbitrary Architecture Overhauls:** Opposes massive speculative abstractions or premature framework rewrites.
- **Exempt Scopes:** Does not block documentation-only, conceptual, or governance tasks.

---

## 1. Core Engineering Principles

### Read Before Writing & Match Context
- Always read the target file and its neighboring pattern before modifying code.
- Match existing repository patterns, conventions, and file structures unless there is an approved, documented reason to improve them.
- Separate unrelated cleanup or formatting changes from the specific requested fix or feature.

### Domain-Driven Naming & Intent
- Identifiers, variables, types, and functions must clearly communicate their domain intent in the context of Zamblak field research.
- Avoid vague abbreviations, generic placeholders (e.g. `data1`, `temp`, `doProcess`), or misleading names.

### Modularity, Cohesion & Simplicity (KISS & YAGNI)
- Keep functions and components cohesive and focused on a single responsibility.
- Prefer Keep It Simple, Stupid (KISS) and You Aren't Gonna Need It (YAGNI).
- **Beware Premature Abstraction:** Do not extract an abstraction merely because two blocks of code happen to look similar. Wait until a shared concept clearly emerges across three distinct use cases.
- Remove dead, obsolete, or speculative code immediately rather than leaving commented-out blocks or unused helpers.

---

## 2. Trust Boundaries & Error Handling

### Validate at Boundaries, Not Everywhere
- Perform strict, schema-driven validation (e.g. using Zod) at **external trust boundaries**:
  - Incoming HTTP requests in Route Handlers.
  - User arguments in Server Actions.
  - Data returned from external third-party APIs.
- Avoid layering redundant, defensive null-checks or type guards in internal functions that operate on already-validated domain data.

### Robust Error Resilience
- **Never Swallow Errors:** Broad, empty `catch` blocks that silently return empty arrays or null are forbidden.
- Always handle errors meaningfully: log structured context server-side and return user-safe, typed error objects to the client.
- **Never Fake Success:** Never return hardcoded mock successes, canned responses, or dummy data to bypass genuine failures in production paths.

---

## 3. Dependency & API Hygiene

### Verify Library APIs Against Installed Versions
- Verify that methods, hooks, and configuration options exist in the repository's installed package versions (e.g. Next.js 16, React 19, Supabase JS v2).
- Do not use deprecated APIs or speculative options inferred from other frameworks.

### Zero Unnecessary Dependencies
- Do not introduce new third-party packages when standard Web APIs, Node.js built-ins, or existing repository dependencies easily solve the problem.
- Every new package adds maintenance, security audit, and bundle size overhead.

---

## 4. Testing & Refactoring Integrity

### Preserve Observable Behavior
- Refactoring must strictly preserve observable behavior, API response shapes, error contracts, and UI semantics unless an explicit change is requested.

### Test Honesty & Rigor
- **Never Weaken Tests to Pass:** Disabling tests, removing assertions, widening thresholds, or mocking away the core system under test to manufacture a passing green build is strictly forbidden.
- Tests must reflect authentic failure and success conditions.

---

## 5. Review Checklist (PASS/HOLD Criteria)

When applying this guard to changed production code, verify:
1. **Context & Consistency:** Does the change conform to surrounding repository patterns?
2. **Naming & Intent:** Do names accurately convey domain behavior?
3. **Simplicity:** Is the implementation the simplest viable solution without speculative bloat?
4. **Boundary Validation:** Are inputs validated at entry points with Zod schemas?
5. **Error Honesty:** Are errors handled explicitly without broad swallows or fake success mocks?
6. **API Verification:** Are all imported library APIs verified against installed versions?
7. **Dependency Restraint:** Has unnecessary package addition been avoided?
8. **Test Integrity:** Are existing tests intact, authentic, and unweakened?
