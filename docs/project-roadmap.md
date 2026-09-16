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
- **Companies Module:** Full MVP list, create, detail, and edit flows (`/companies`, `/companies/new`, `/companies/[id]`, `/companies/[id]/edit`) backed by database RPCs (`list_companies`, `get_company`, `create_company`, `update_company`).
- **Projects Module:** Full MVP list, create, detail, and edit flows (`/projects`, `/projects/new`, `/projects/[id]`, `/projects/[id]/edit`). New Projects default to `active` on creation (commit `966c98a feat(projects): create new projects as active`; DEC-PROJECT-001; Mozfer browser acceptance PASS). Owner-only project lifecycle status transitions (`transition_project_status`).
- **Respondent Registry:** Full MVP list, create, detail, and edit flows (`/respondents`, `/respondents/new`, `/respondents/[id]`, `/respondents/[id]/edit`) with unique normalized mobile enforcement (`9665xxxxxxxx`).
- **Participation Assignment:** Participation assignment and 3-month eligibility warning foundations (`create_participation`, `check_respondent_three_month_warning`, `list_project_participations`).
- **One Form Per Participation:** Database invariant introduced by migration `20260723170000_enforce_one_research_form_per_participation.sql`. Unique index `idx_rf_unique_participation` enforces exactly one `research_forms` row per `participation_id` across all statuses; `submit_research_form` uses `attempt_number = 1` and maps duplicate insertions to `duplicate_participation`.
- **Research Forms Implementation Slice:** Live Research Form submission (`/forms/new`, `CreateResearchFormClient`, Server Action, `submit_research_form`), detail querying (`getResearchForm`, `/forms/[formId]`), and Owner review (`review_research_form`). Visual presentation refined under approved specification (commit `39ea371 feat(forms): refine research form submission UI`; Mozfer browser acceptance PASS).
- **Shared UI Primitives:** Reusable components including data tables, responsive mobile cards, summary cards, status badges, state displays (loading, empty, error), form controls, success notice banners with auto-dismiss (commit `613811f feat(ui): auto-dismiss success notices`), and accessibility foundations.
- **Financial & Collections Backend:** Database schema (`research_forms`, `collections`, `collection_allocations`, etc.), read views (`form_financial_summary`, `collection_summary`), and Owner-gated RPCs.

---

## 3. Known Current Limitations & Semantic Debt

- **Current Physical Hierarchy:** Operating under 5-tier `Account → Company → Project → Participation → Research Form`. Project Sample is **not** physically implemented yet.
- **Research Form Semantic Gaps (Retained Phase 1 Debt):**
  - *Blank Notes Canonicalization (DEC-FORM-003):* Application normalizes blank/whitespace notes to `null`, but the database RPC may still persist empty strings (`btrim(COALESCE(p_notes, ''))`). Cross-layer SQL NULL consistency remains incomplete.
  - *Interview Date Validity & Future-Date Guard (DEC-FORM-004):* `submitted_date` (calendar interview date) validation accepts calendar rollovers in some paths and lacks server-authoritative non-future enforcement relative to server time.
  - *Notes Length Bound (DEC-FORM-005):* The approved 2000-character trimmed notes maximum is not yet enforced across browser, Server Action, RPC, and database boundaries.
  - *Logical Submission Idempotency (DEC-FORM-006):* The application slice now generates and owns one retry-stable key per canonical logical submission, validates explicit keys at the Server Action/RPC boundary, and rotates the key when the canonical payload changes (commit `0807c7b`). Database replay/conflict semantics and runtime/manual acceptance remain separate evidence boundaries.
- **Collections UI Status:** The current Collections application UI remains an in-memory/`sessionStorage` prototype (`zamblak.forms-prototype.v1`).
- **Financials Display Surface:** `/financials` is an Owner-only mock/demo display surface rendering sample cards.
- **Pricing Setup Prerequisite:** Form review acceptance fails closed with `accepted_price_unavailable` if pricing is unconfigured in `participation_pricing` or `project_financial_settings`. Full manual form acceptance runtime is unclaimed without valid pricing setup.
- **Success-Notice Auto-Dismiss Retention:** Shared success notices auto-dismiss after ≈4 seconds (commit `613811f`). Manual browser check remains non-blocking retained acceptance debt.
- **Role Boundary:** The codebase recognizes `owner` and `support_helper`. `support_helper` is legacy compatibility and must **not** define future product design. The next V1 product phase is Owner-first. Multi-researcher SaaS role names and permission matrices remain unresolved.
- **Production Readiness:** All evidence reflects DEV/DEMO environments; customer production readiness is unclaimed.

---

## 4. Continuous Quality Architecture

Zamblak enforces continuous quality controls across **every** phase rather than deferring quality to the end of the project:

- **Automated Testing:** Unit, integration, and component tests accompany every functional change (`zamblak-test-guard`).
- **Independent Review Delegation:** Every mutating task requires fresh independent Antigravity Reviewer inspection (`zamblak-review-delegation`, `zamblak-opencodereview`) before landing.
- **Security & Tenant Isolation:** Continuous enforcement of `account_id` tenant boundaries, RLS policies, PII protection, and IDOR/BOLA prevention (`zamblak-security-privacy-guard`).
- **Practical Accessibility:** Semantic HTML, keyboard operability, high-contrast focus, and multi-cue status indicators applied continuously (`zamblak-ui-rtl-senior-ux-guard`).
- **Performance Discipline:** Continuous awareness of query cost, indexing, bundle size, and rendering bottlenecks (`zamblak-nextjs-performance-engineering`, `zamblak-postgres-query-index-guidance`).
- **Migration Verification:** Strict gatekeeping for database DDL, RLS, and migration ledger alignment (`zamblak-db-rls-migration-guard`).

The final roadmap phase represents **System-Wide Release Hardening and Production Readiness Review**, not the introduction of quality practices.

---

## 5. Approved Forward Roadmap

### Phase 0: Baseline Reconciliation and Closure
- **Purpose:** Complete canonical documentation reconciliation (`docs/product-requirements.md`, `docs/roles-permissions.md`, `docs/database-schema.md`, `docs/database-migrations.md`, `docs/project-roadmap.md`). Remove contradictions between product, schema, migrations, and roles. Establish a clean documented baseline before new product feature development.
- **Status:** COMPLETE
- **Closure Boundary:** Canonical documentation reconciliation is complete for the current DEV/DEMO baseline. Product requirements, roles, current/future hierarchy, schema, migrations, security, Forms-versus-Collections backing, and evidence boundaries are aligned.

### Phase 1: Product and Workflow Canonicalization
- **Purpose:** Document Owner Researcher operational workflows. Define screen contracts and data contracts for forms, review, financials, and collections. Establish formal delivery gates.
- **Required Delivery Method:** Screen Contract → Data Contract → Wireframe → Visual Specification → One Implementation Slice → Consolidated Review → One Correction → Closure.
- **Status:** COMPLETE
- **Closure Summary:** Formally closed on 2026-08-22 on its first bounded slice — the Owner Researcher Research Form submission workflow (`/forms/new`), which completed the full required delivery sequence:
  - Screen Contract approved by Mozfer (2026-08-22).
  - Data Contract approved by Mozfer (2026-08-03).
  - Wireframe approved by Mozfer (2026-08-03).
  - Visual Specification approved by Mozfer (2026-08-03).
  - One Implementation Slice committed (`39ea371 feat(forms): refine research form submission UI`).
  - Consolidated independent review completed clean.
  - Correction gate satisfied without invented churn.
  - Manual browser acceptance: PASS BY MOZFER for `/forms/new` presentation and submission flows.
- **Boundaries at Closure:** Remaining semantic debt (DEC-FORM-003 to 005), the delivered DEC-FORM-006 application slice, and future workflow contracts (review, financials, collections) transition to explicit downstream roadmap phases. DEV/DEMO verification only; production readiness not claimed.

### Phase 2: Research Form Submission Semantic Hardening
- **Purpose:** Bounded follow-up slice to align approved DEC-FORM-003 through DEC-FORM-006 semantics across application, RPC, and database boundaries before Sample implementation.
- **Key Deliverables:**
  - Standardize blank notes to SQL NULL across browser, Server Action, RPC (`submit_research_form`), and table constraints (DEC-FORM-003).
  - Enforce calendar-valid, non-future `submitted_date` validation relative to server date (DEC-FORM-004).
  - Enforce 2000-character trimmed notes maximum across all layers (DEC-FORM-005).
  - Implement retry-stable logical-operation idempotency keys with same-payload replay and conflict fail-closed behavior (DEC-FORM-006); application key ownership and validation are implemented in the first bounded slice (commit `0807c7b`), while database/runtime evidence remains separate.
  - Preserve one-form-per-Participation invariant without altering approved UI workflows.
- **Status:** IN PROGRESS — DEC-FORM-006 application slice implemented; DEC-FORM-003/004/005 and cross-layer/runtime evidence remain.

### Phase 3: Sample Domain Design
- **Purpose:** Pure domain and logical design phase for `Project Sample`. Resolve product rules, lifecycle, target/quota mechanics, participation links, human reference format (`P###-S##-F###`), pricing interactions, and deletion/history policies.
- **Strict Boundary:** Logical design only. No SQL migrations, physical table creation, or code mutations are authorized in this phase.
- **Status:** NOT STARTED

### Phase 4: Sample Physical Foundation & Backfill
- **Purpose:** Physical database schema and migration implementation for the approved Sample domain.
- **Key Deliverables:**
  - Create `project_samples` table with strict tenant boundary (`account_id`) and foreign keys.
  - Implement Row Level Security (RLS) policies and triggers.
  - Implement sequence/reference generation infrastructure for `P###-S##-F###`.
  - Design and execute safe, idempotent backfill migration for legacy projects and existing participations.
  - Rigorous migration apply, rollback plan, and catalog verification gates.
- **Dependency:** Blocked on approved Phase 3 Sample Domain Design.
- **Status:** NOT STARTED

### Phase 5: Design System Consolidation
- **Purpose:** Consolidate existing working UI primitives into a cohesive, documented Zamblak Design System to avoid ad-hoc styling during subsequent feature expansion.
- **Key Deliverables:**
  - Consolidate color tokens, typography scales, spacing units, and Arabic RTL layout primitives.
  - Standardize component library: buttons, inputs, form groups, data tables, mobile cards, status badges, banners, modal dialogs, and drawer sheets.
  - Unify interactive state handling: loading skeletons, empty states, validation errors, and server failure notices.
  - Enforce WCAG AA accessibility, visible focus rings, touch targets (≥44px), and bidirectional (bidi) content rules.
- **Scope Clarification:** Consolidation and harmonization of existing primitives, **not** a ground-up UI rewrite. Explicit prerequisite before broad operational UI builds.
- **Status:** NOT STARTED

### Phase 6: Sample-Aware Read Model
- **Purpose:** Introduce the smallest safe read contracts, queries, and views needed to expose Project, Sample, Participation, Respondent, and Research Form context.
- **Key Deliverables:**
  - Server-side read queries and views integrating the 6-tier hierarchy: `Account → Company → Project → Sample → Participation → Research Form`.
  - Support legacy and backfilled sample views without leaking cross-tenant data.
  - Expose human-readable `P###-S##-F###` references alongside legacy `RF-` codes.
- **Dependency:** Blocked on Phase 4 Physical Foundation and Phase 5 Design System Consolidation.
- **Status:** NOT STARTED

### Phase 7: Authoritative Pricing Foundation
- **Purpose:** Implement the authoritative pricing configuration prerequisite required before Research Form acceptance can be fully operationalized.
- **Key Deliverables:**
  - Server-authoritative pricing configuration at project (`project_financial_settings`) and participation (`participation_pricing`) levels.
  - Ensure form acceptance workflows reliably capture authoritative server price snapshots rather than failing closed with `accepted_price_unavailable`.
  - Zero browser pricing authority; missing pricing never silently defaults to `0.00`.
- **Prerequisite Role:** Placed immediately prior to Phase 8 so that the full `Form → Review → Accepted` operational loop can complete without blocking on the later full financial management phase.
- **Status:** NOT STARTED

### Phase 8: Core Operational Workflow (Review & Correction)
- **Purpose:** Complete the full end-to-end Owner-first operational lifecycle: `Company → Project → Sample → Respondent → Participation → Research Form → Review / Correction`.
- **Key Deliverables:**
  - Form review workflow with Owner-only acceptance, rejection, and price snapshotting.
  - Same-record correction and resubmission workflow updating the existing persisted Research Form (DEC-FORM-001; one-form-per-Participation preserved).
  - Streamlined researcher operational data entry and status tracking.
  - Decoupled from third-party communication and file export integrations to keep the operational core bounded and unblocked.
- **Status:** PARTIALLY DELIVERED

### Phase 9: Live Financials & Collections Modernization
- **Purpose:** Replace mock/demo financial UI surfaces and prototype collections storage with live, server-authoritative workflows.
- **Key Deliverables:**
  - Replace `/financials` mock cards with live financial aggregation backed by accepted form price snapshots.
  - Replace `sessionStorage` Collections prototype (`zamblak.forms-prototype.v1`) with live database-backed collection records, receipts, and allocation tracking.
  - Preserve Owner-exclusive financial control and accepted-only financial counting invariants.
  - Financial audit logging and reconciliation views.
- **Status:** PARTIALLY DELIVERED

### Phase 10: Import / Export & Communications Integrations
- **Purpose:** Add productivity integrations for bulk data handling and respondent communication without entangling them in core operational workflow gates.
- **Key Deliverables:**
  - Bulk Excel import/export for respondents, participation rosters, and sample targets.
  - Structured WhatsApp communication dispatch for respondent coordination and reminder notices.
  - File parsing safety, virus/size validation, and communication rate limiting.
- **Status:** NOT STARTED

### Phase 11: Multi-Researcher SaaS Design
- **Purpose:** Evolve Zamblak from an Owner-first single-researcher tool into a multi-researcher SaaS platform.
- **Key Deliverables:**
  - Persona definitions, invitation flows, user administration, and account profile settings.
  - Multi-researcher role-based access control (RBAC) and permission matrices.
  - Operational finance-blindness for non-owner researchers (preserving `support_helper` legacy compatibility or deprecating it cleanly under a formal migration plan).
- **Status:** NOT STARTED

### Phase 12: Final Release Hardening & Production Readiness
- **Purpose:** Execute system-wide validation, verification, and hardening across all application tiers prior to customer production deployment.
- **Key Deliverables:**
  - End-to-end automated regression test suite execution across full operational lifecycles.
  - Cross-account tenant isolation penetration testing (validating zero data leakage under all RLS policies).
  - System-wide accessibility compliance audit (WCAG AA, screen readers, keyboard-only flows).
  - Performance benchmarking under load (server response, database query efficiency, index utilization).
  - Operational disaster recovery, backup, and failover verification.
  - Production deployment rollout plan and formal Mozfer Production Readiness Review.
- **Status:** NOT STARTED

---

## 6. Deferred and Unresolved Boundaries

The following areas remain intentionally deferred or unresolved; no implementation may proceed without explicit Mozfer decision:

- Physical `ProjectSample` table schema, column definitions, and migration schedule (governed by Phase 3 & 4).
- Scoped reference sequence counter mechanism (`P###-S##-F###`) and overflow policy.
- Multi-researcher role vocabulary, permission matrix, and delegation policies (governed by Phase 11).
- Live server-backed Collections UI and financial export reports (governed by Phase 9).
- Customer production deployment and rollout schedule (governed by Phase 12).
- WhatsApp Business API credentials, phone number verification, and webhook infrastructure.
- Offline mobile caching and background synchronization.

---

## 7. Canonical Evidence & Reference Documents

For detailed commit-by-commit history, SQL migration ledgers, and manual smoke test reports, refer to canonical repository authority:

- **Migration Ledger & Verification:** [`database-migrations.md`](./database-migrations.md)
- **Database Schema & Invariants:** [`database-schema.md`](./database-schema.md)
- **Product Requirements:** [`product-requirements.md`](./product-requirements.md)
- **Roles & Permissions Boundaries:** [`roles-permissions.md`](./roles-permissions.md)
- **Deferred Decisions Register:** [`deferred-decisions.md`](./deferred-decisions.md)
- **Historical Milestones & Smoke Logs:** [`project-status.md`](./project-status.md)
- **Screen Contracts:** [`docs/contracts/research-form-submission-screen-contract.md`](./contracts/research-form-submission-screen-contract.md)
- **Data Contracts:** [`docs/contracts/research-form-submission-data-contract.md`](./contracts/research-form-submission-data-contract.md)

