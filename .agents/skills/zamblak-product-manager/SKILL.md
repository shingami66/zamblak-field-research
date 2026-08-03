---
name: zamblak-product-manager
description: Product oversight framework for Zamblak, grounded in PRD-development orchestration. Validates requirements, success metrics, and domain logic.
---

# Zamblak Product Manager

## Purpose
Align technical implementations with the Zamblak PRD and business objectives. Serves as the bridge between raw discovery/problem statements and engineering user stories, preventing the "build what's in my head" trap without evidence. Grounded strictly in `prd-development` frameworks.

## When to Use
Use during feature planning, scoping, architecture design, or when generating/reviewing technical requirements before implementation.

## Product Manager Framework

### Problem Statement Validation
- Ensure every feature traces back to a clear problem statement.
- Identify *who* has the problem, *what* it is, and *why* it matters.

### Persona and Role Validation

- **Primary current design persona:** Owner Researcher.
- **Initial real-world user:** the senior independent field researcher. UX must remain Arabic-first, senior-friendly, and highly accessible.
- **Current implementation recognizes:** `owner` and `support_helper`.
- **`support_helper`:** an implemented legacy compatibility role **only**; it is **not** an approved secondary persona for designing new product workflows, new domain architecture, new role matrices, or future SaaS behavior.
- **Existing `support_helper` behavior** must not be casually removed, broken, or broadened.
- **Future multi-researcher** personas, roles, role names, workflows, and permission matrices remain explicitly unresolved; do **not** invent Field Researcher, Data Auditor, Finance Admin, Interviewer, Supervisor, Collector, or any other future role.
- **A current code role is not automatically a future product persona.**

### Strategic Context & Success Metrics
- Define why the feature matters *now*.
- Define clear success metrics (e.g., primary metric, secondary metrics, guardrails) before writing code.

### MVP & Out-of-Scope Boundaries
- Strictly enforce MVP limits.
- Explicitly document what is *NOT* being built (Out of Scope).
- Protect against scope creep.

### Epic / Hypothesis Structure & Acceptance Criteria
- Frame features as testable epic hypotheses.
- Break down into clear user stories using standard workflow/CRUD patterns.
- Every user story must have explicit, testable Acceptance Criteria.

### Dependency & Risk Mapping
- Map technical dependencies, UI dependencies, and unresolved design decisions (Deferred Decisions).
- Evaluate stakeholder and user-value alignment.
- Anti-scope-creep checks: Call out and defer features that exceed MVP goals.

## Zamblak Domain Rules
**Important**: Do not implement or reference generic CRM/ERP business logic from other projects. Zamblak is exclusively a Field Research system. The following terminology is FORBIDDEN as an implementation concept here: Quotations, Invoices, VAT, ZATCA, service bookings, supplier costing.
- **Respondent Registry**: The heart of the product. Store respondents once.
- **Normalized Mobile**: One normalized mobile number = one respondent per account.
- **Participation Warnings**: Same-domain participation within 3 months is a *warning only*.
- **Duplicate Blocks**: Same respondent in the *same active project* is a *hard block*.
- **Accepted-Only Billing**: Only `accepted` forms count financially. `completed`/`transferred` do not.
- **Role Limits**: Owner-only financial control. Support Helper is operational only.

## Product Delivery Sequence Gate

For workflow and product slices, preserve this required order:

Screen Contract → Data Contract → Wireframe → Visual Specification → One Implementation Slice → Consolidated Review → One Correction → Closure

1. Do not skip a stage.
2. Do not recommend a later stage until the current stage passes its required governance and review gates.
3. Do not combine multiple stages into one artifact unless the task explicitly authorizes the combination AND the roadmap permits it AND authority and evidence boundaries remain clear AND the combined scope remains bounded.
4. Before recommending the next stage, confirm the current artifact:
   - exists;
   - is correctly classified;
   - is registered and linked from the correct entry point or index;
   - has passed its required independent review;
   - has no unresolved product decision blocking progression;
   - has synchronized roadmap status where required;
   - has preserved Mozfer decision authority;
   - has completed any required commit or push gate in the current lifecycle.
5. A document existing does not automatically mean its delivery stage is complete.
6. A draft may remain pending Mozfer Arabic-copy approval when copy is not a blocker, but the report must state that boundary.
7. Mozfer remains final authority for product behavior, workflow decisions, Arabic copy, labels, terminology, final practical acceptance, and manual browser smoke.
8. The next recommended task must be the nearest unfinished stage in the approved delivery sequence.

## Temporary Implementation Guard

Prevent product contracts and product recommendations from canonizing temporary implementation. Explicitly classify and protect against treating these as final product truth:

- prototype/sessionStorage behavior;
- mock/demo financial surfaces;
- legacy route mirrors;
- current raw or truncated UUID presentation;
- legacy RF codes as future SaaS references;
- temporary Arabic wording and temporary success/error copy;
- current component names, component structure, or page layout;
- navigation adjacency;
- test fixtures and seed data;
- static source presence without runtime acceptance;
- a migration file without verified apply evidence;
- current `support_helper` behavior as future persona design;
- pre-Sample structures as if Sample-aware.

The agent must explicitly distinguish: 1) approved product truth; 2) current implementation evidence; 3) temporary UI; 4) mock/demo UI; 5) prototype behavior; 6) historical evidence; and 7) future/non-live direction. A contract must not silently upgrade categories 2–7 into approved product truth.

## Product Ripple Review

Before PASS on product or workflow documentation, require checks for:

- problem and user-goal alignment;
- Owner-first persona alignment;
- current role versus future persona distinction;
- authority classification and artifact registration;
- roadmap phase and active-slice impact;
- deferred-decision impact;
- upstream and downstream workflow dependencies;
- whether Project Sample is being assumed before Phase 2;
- whether future roles are being invented;
- whether temporary implementation is being canonized;
- whether the next recommended task respects the delivery sequence;
- whether Mozfer-owned Arabic copy or product decisions were silently finalized;
- whether required review or synchronization gates remain incomplete.

Required result:

- Include a concise Product Ripple result in applicable reports.
- Return HOLD when progression requires an unresolved Mozfer decision, or when the current artifact is orphaned, unregistered, or governance-incomplete.
- Do not use PASS WITH WARN to bypass a product, role, authority, or progression blocker.

## Output Format
Product and design reviews must conclude with a structured PASS/HOLD format detailing:
- PRD Alignment
- MVP Boundary Check
- Acceptance Criteria completeness
- Zamblak Domain verification
