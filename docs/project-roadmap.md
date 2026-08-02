# Project Roadmap & Canonical Direction

## 1. Purpose & Status Vocabulary

This document establishes the canonical product roadmap for Zamblak Field Research. It separates the **Current Delivered Baseline** from the **Approved Forward Roadmap** and links to historical evidence files rather than duplicating commit logs.

### Status Vocabulary
- **COMPLETE:** Fully implemented in source, verified end-to-end, and closed.
- **IN PROGRESS:** Currently active work phase.
- **PARTIALLY DELIVERED:** Functional database, RPC, or application slices delivered, but full workflow is incomplete.
- **NOT STARTED:** Planned future phase with no active execution slice.
- **BLOCKED:** Execution halted pending resolution of a dependency or decision.
- **DEFERRED:** Explicitly postponed to a future milestone by Mozfer decision.

*(Note: DEV/DEMO verification must **NEVER** be described as customer production readiness).*

---

## 2. Current Delivered Baseline

The current DEV/DEMO baseline (verified against source code, migrations, and application routes) includes:

- **Authentication & Shell:** Authenticated application shell with Supabase Auth login at `/login`. Active application profile and account authority are resolved server-side through `public.resolve_current_profile()` via the `resolveCurrentProfile()` application helper.
- **Companies Module:** Full MVP list, create, detail, and edit flows (`/companies`, `/companies/new`, `/companies/[id]`, `/companies/[id]/edit`) backed by database RPCs (`sel_companies`, `ins_companies`, `upd_companies`).
- **Projects Module:** Full MVP list, create, detail, and edit flows (`/projects`, `/projects/new`, `/projects/[id]`, `/projects/[id]/edit`). Owner-only project lifecycle status transitions (`transition_project_status`).
- **Respondent Registry:** Full MVP list, create, detail, and edit flows (`/respondents`, `/respondents/new`, `/respondents/[id]`, `/respondents/[id]/edit`) with unique normalized mobile enforcement (`9665xxxxxxxx`).
- **Participation Assignment:** Participation assignment and 3-month eligibility warning foundations (`create_participation`, `check_respondent_three_month_warning`, `list_project_participations`).
- **One Form Per Participation:** Enforced database 1:1 invariant (`enforce_one_research_form_per_participation`).
- **Research Forms Integration:** Live Research Form submission (`submit_research_form`), detail querying (`getResearchForm`), and Owner review (`review_research_form`) backend foundations and application route (`/forms/[formId]`).
- **Financial & Collections Backend:** Database schema (`research_forms`, `collections`, `collection_allocations`, etc.), read views (`form_financial_summary`, `collection_summary`), and Owner-gated RPCs.

---

## 3. Known Current Limitations

- **Current Live Hierarchy:** Operating under `Account → Company → Project → Participation → Research Form`. Project Sample is **not** physically implemented yet.
- **Collections UI Status:** The current Collections application UI remains an in-memory/`sessionStorage` prototype (`zamblak.forms-prototype.v1`).
- **Financials Display Surface:** `/financials` is an Owner-only mock/demo display surface rendering sample cards.
- **Pricing Setup Prerequisite:** Form review acceptance fails closed with `accepted_price_unavailable` if pricing is unconfigured in `participation_pricing` or `project_financial_settings`. Full manual form acceptance runtime is unclaimed without valid pricing setup.
- **Role Boundary:** The codebase recognizes `owner` and `support_helper`. `support_helper` is legacy compatibility and must **not** define future product design. The next V1 product phase is Owner-first. Multi-researcher SaaS role names and permission matrices remain unresolved.
- **Production Readiness:** All evidence reflects DEV/DEMO environments; production readiness is unclaimed.

---

## 4. Approved Forward Roadmap

### Phase 0: Baseline Reconciliation and Closure
- **Purpose:** Complete canonical documentation reconciliation (`docs/product-requirements.md`, `docs/roles-permissions.md`, `docs/database-schema.md`, `docs/database-migrations.md`, `docs/project-roadmap.md`). Remove contradictions between product, schema, migrations, and roles. Establish a clean documented baseline before new product feature development.
- **Status:** IN PROGRESS

### Phase 1: Product and Workflow Canonicalization
- **Purpose:** Document Owner Researcher operational workflows. Define screen contracts and data contracts for forms, review, financials, and collections. Identify unresolved product decisions without inventing RBAC.
- **Required Delivery Method:** Screen Contract → Data Contract → Wireframe → Visual Specification → One Implementation Slice → Consolidated Review → One Correction → Closure.
- **Status:** NOT STARTED

### Phase 2: Sample Domain Foundation
- **Purpose:** Design the logical and physical `Project Sample` domain. Resolve Sample lifecycle, targets/quotas, assignment, backfill, human reference format, and pricing interactions before writing SQL.
- **Approved Future Hierarchy:** `Account → Company → Project → Sample → Participation → Research Form`
- **Approved Future Form Reference Direction:** `P###-S##-F###` (e.g. `P012-S01-F004`).
- **Implementation Status:** *Neither the physical Sample domain nor the `P###-S##-F###` reference format is currently implemented.*
- **Status:** NOT STARTED

### Phase 3: Design System Consolidation
- **Purpose:** Establish reusable visual tokens, layout rules, interactive states, tables, forms, dialogs, responsive behavior, and accessibility expectations to avoid page-by-page visual improvisation.
- **Status:** NOT STARTED

### Phase 4: Minimal Read Model for Sample Context
- **Purpose:** Introduce the smallest safe read contracts needed to expose Project, Sample, Participation, Respondent, and Research Form context. No broad feature build before the read model is approved.
- **Status:** NOT STARTED

### Phase 5: Core Operational Workflow
- **Purpose:** Complete the full end-to-end Owner-first operational path: `Company → Project → Sample → Respondent → Participation → Research Form → Review`. Incorporate Excel import/export and WhatsApp communication only after their specific workflow contracts are approved.
- **Status:** PARTIALLY DELIVERED

### Phase 6: Financial and Collections Workflow
- **Purpose:** Replace mock/prototype financial UI surfaces with live, server-authoritative workflows connecting accepted forms, receivables, collections, allocations, corrections, and reporting. Preserve Owner-only financial authority with zero browser-supplied pricing.
- **Status:** PARTIALLY DELIVERED

### Phase 7: Multi-Researcher SaaS Design
- **Purpose:** Derive personas, roles, invitations, permissions, and finance blindness from approved operational workflows. Design tenant-safe collaboration and multi-user administration. Role names and final RBAC matrices remain explicitly unresolved until operational workflows are closed.
- **Status:** NOT STARTED

### Phase 8: Quality and Release Preparation
- **Purpose:** Execute automated coverage, manual regression acceptance, cross-account security verification, accessibility, performance testing, operational recovery, migration rollout planning, and final production-readiness review.
- **Status:** NOT STARTED

---

## 5. Deferred and Unresolved Boundaries

- Physical `ProjectSample` table schema, columns, foreign keys, and migration strategy.
- Scoped reference sequence counter mechanism (`P###-S##-F###`).
- Multi-researcher role vocabulary, permission matrix, and delegation policies.
- Live server-backed Collections UI and financial export reports.
- Automated cross-account tenant isolation security test suite.
- Customer production deployment and rollout schedule.

---

## 6. Evidence & Historical Reference Documents

For detailed commit-by-commit history, SQL migration logs, and manual smoke test reports, refer to the following canonical evidence documents:

- **Migration Ledger & Verification:** [`docs/database-migrations.md`](file:///D:/Zamblak/Zamblak-field-research/docs/database-migrations.md)
- **Database Schema & Invariants:** [`docs/database-schema.md`](file:///D:/Zamblak/Zamblak-field-research/docs/database-schema.md)
- **Product Requirements:** [`docs/product-requirements.md`](file:///D:/Zamblak/Zamblak-field-research/docs/product-requirements.md)
- **Roles & Permissions Boundaries:** [`docs/roles-permissions.md`](file:///D:/Zamblak/Zamblak-field-research/docs/roles-permissions.md)
- **Historical Milestones & Smoke Logs:** [`docs/project-status.md`](file:///D:/Zamblak/Zamblak-field-research/docs/project-status.md)
- **Deferred Decisions Register:** [`docs/deferred-decisions.md`](file:///D:/Zamblak/Zamblak-field-research/docs/deferred-decisions.md)
