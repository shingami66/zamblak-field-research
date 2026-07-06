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

### Persona Validation
- **Primary Persona**: The 65-year-old independent field researcher. UX must be Arabic-first, senior-friendly, and highly accessible.
- **Secondary Persona**: The `support_helper` (operational assistance).

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

## Output Format
Product and design reviews must conclude with a structured PASS/HOLD format detailing:
- PRD Alignment
- MVP Boundary Check
- Acceptance Criteria completeness
- Zamblak Domain verification
