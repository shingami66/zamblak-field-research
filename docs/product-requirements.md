# Product Requirements Document

## Project Info
- Project name: Zamblak Field Research
- Arabic name: زمبلك للأبحاث الميدانية

## Core Product Principles
- Respondent Registry is the heart of the product.
- Store each respondent once.
- One mobile number represents one respondent only.
- Reuse respondent participation history across projects.
- Warn about same-domain participation within 3 months (warning only, do not block).
- Hard block only same respondent inside same active project.
- Accepted forms only count financially.
- Completed/transferred forms do not count financially.
- Owner-only financial control.
- Current codebase recognizes `owner` and `support_helper` roles. Next V1 design phase is Owner-first.

## Free-Text Project Domain Contract
- Project domain is arbitrary trimmed nonblank text between 1 and 120 characters (`chk_projects_domain`).
- Accepts Arabic, English, or mixed text. Blank/whitespace-only input is rejected.

## Product & Domain Status Boundaries

### 1. Current Implemented Truth
- **Recognized Roles:** Current application and database implementations recognize both `owner` and `support_helper` roles.
- **Domain Hierarchy:** Currently `Account → Company → Project → Participation → Research Form` (`ProjectSample` entity is not yet implemented in database schema).
- **Research Forms Status:** Live database submission, detail display, and Owner review foundations are implemented (`submit_research_form`, `review_research_form`, `getResearchForm`, `reviewResearchFormAction`, `/forms/[formId]`). Full end-to-end manual acceptance runtime is not claimed because valid pricing configuration is still required on target participations/projects.
- **Financial & Collections Backend:** Form financial-summary and receivable database foundations exist. Collections database schema and RPC foundations exist (`collections` table, RPCs).
- **Collections UI Workflow:** The current Collections application UI/workflow remains prototype-only and in-memory/`sessionStorage` under namespace `zamblak.forms-prototype.v1`.
- **Form Identifiers:** Current stored form codes remain RF-based (`RF-YYYYMMDD-NNN`). Short display codes (e.g., `001`) are rendered in UI headers.

### 2. Approved Future Product Direction
- **Owner-First Focus:** The next V1 product design phase targets an Owner-first workflow.
- **Target Domain Hierarchy:** `Account → Company → Project → Sample → Participation → Research Form`.
- **Target Human Reference:** Future human-readable form reference direction is `P###-S##-F###` (e.g., `P012-S01-F004`), scoped per sample. This reference format is not yet implemented in code or database.
- **Identifier Boundary:** Raw UUIDs must never be exposed as normal user-facing identifiers.
- **Price & Acceptance Semantics:**
  - Browser-supplied price values are strictly forbidden.
  - Form acceptance consumes an authoritative server-side participation price snapshot (`participation_pricing.price_snapshot`).
  - Before acceptance, an unconfigured/missing price may display `"لم تُحدد بعد"` in the UI.
  - Form acceptance with a missing usable price snapshot must fail with error code `accepted_price_unavailable`.
  - Missing pricing configuration must **never** silently default or fall back to `0.00`.
  - An accepted form must **not** be created with a missing price merely because the UI displayed `"لم تُحدد بعد"`.
- **Multi-Researcher SaaS:** Zamblak will evolve into a professional multi-researcher SaaS platform.

### 3. Legacy Compatibility
- **`support_helper` Role Status:** `support_helper` remains an implemented legacy compatibility role in the codebase and database RLS. Existing `support_helper` code checks and RPC boundaries must **not** be removed in current tasks, but must **not** define new product features.
- **Legacy Form Codes:** Stored `RF-YYYYMMDD-NNN` form codes are preserved until a future sample-domain migration slice.

### 4. Unresolved Decisions
- **Future Multi-Researcher Roles:** Exact future role names, role structures, and permission matrices remain unresolved until operational workflows are approved. (No future role names are invented).
- **Sample Schema Migration Timing:** The exact migration slice timing for creating `project_samples` and backfilling legacy projects remains unresolved.

## Participation Membership Rules
- Respondents may be created, searched, and maintained in the Respondent Registry independently of project activation. Registry existence does not create project participation.
- A draft project may be configured and prepared, including eligibility, quota, dates, domain, company, and other approved project setup.
- Registry preparation and draft project preparation do not create participation membership by themselves.
- Participation membership writes are allowed only when the target project is `active` and `deleted_at IS NULL`.
- Draft projects reject participation `INSERT`, reassignment into the project, and restore of a soft-deleted participation.
- Closed, cancelled, and deleted projects reject participation `INSERT`, reassignment into the project, and restore of a soft-deleted participation.
- Closing a project ends that project's active duplicate-blocking scope for future participation in other projects. It does not permit new participation writes into the closed project.
- This section records a product decision only. Migration design, runtime enforcement, database behavior, and manual smoke are not yet proven here.

## Research Form Submission Semantics (Approved 2026-08-03)

- Exactly one persisted Research Form per Participation remains authoritative and enforced.
- Correction/resubmission of a rejected form updates the existing Research Form; never create a second form for the same Participation.
- The correction workflow is approved product direction, but its detailed contract, state transitions, audit behavior, UI, and implementation remain incomplete; no current task implements it.
- `submitted_date` is the business date on which the interview occurred (interview date).
- `submitted_at` is the server-recorded audit timestamp showing when the form submission was recorded in the system.
- `submitted_date` and `submitted_at` are distinct fields and must not be treated as interchangeable.

Approved data-semantics rules (all apply to Research Form submission semantics; see DEC-FORM-003/004/005/006 in `docs/deferred-decisions.md`):

- `notes` are optional. Leading and trailing whitespace is trimmed. A missing, blank, or whitespace-only `notes` value is canonically stored as SQL **NULL**; an empty string is not the canonical persisted representation of no note. Application, RPC, and database layers must eventually apply the same normalization.
- `submitted_date` must be a **real calendar date** (impossible dates such as `2026-02-31` are invalid) and must **not** be later than the server-authoritative current calendar date. The browser clock is not authoritative.
- Non-null `notes` must not exceed **2000 characters after trimming**. The same bound must eventually be enforced consistently across browser, Server Action, RPC, and database boundaries.
- One logical submission operation uses **one retry-stable idempotency key**. Retrying the same logical submission with the same payload must reuse the same key and may replay the previously completed result. Reusing the same key with a different payload must fail closed as a request conflict. A genuinely new submission operation uses a new key. The key is not permanently fixed to a Participation. Exact key generation is an implementation detail.
- The one-form-per-Participation unique invariant remains the final database safeguard against duplicate forms.

These rules record approved product semantics, not implementation. Current implementation divergence (for example, blank notes normalization differing between code paths, date validation that may accept rollover dates, or a fresh `Date.now()`-based key per invocation attempt) does not authorize code, RPC, SQL, or migration changes and is not a claim that these rules are fully implemented.

## MVP Import, Export, and Reporting Scope
- Excel import remains in MVP. Operational import may be performed when authorized.
- Operational Excel export is approved MVP product scope, but implementation, runtime behavior, server authorization, RLS enforcement, field filtering, and manual export smoke are not yet proven.
- Export generation, storage, and download handling must preserve the same account, project, role, and field boundaries. PII must not leak through logs, URLs or query strings, analytics or telemetry, error messages, temporary files, or unauthorized downloads.
- Operational export must exclude financial data or signals (price per form, pricing records, amounts, totals, dues, payments, settlement data, financial summaries or labels, calculation or billing-trigger results, and accepted-count aggregates that enable financial inference); national ID, identity-document images, date of birth, detailed address or precise location, sensitive free-text notes, cross-project history, internal account IDs, authorization or security metadata, soft-deleted or inactive records, and unauthorized-account data.
- Financial exports remain owner-only, including direct and indirect financial information. UI visibility alone is not authorization.
- Operational export is not permission to export the complete respondent registry or an unrestricted respondent database. Bulk or unrestricted export across projects, accounts, or the full registry is forbidden; only the approved fields for authorized projects, records, and operational purposes may be exported.
- Excel import, operational Excel export, financial export, PDF reports, and analytics are separate capabilities. PDF reports and advanced reporting dashboards or analytics are deferred.

## Tech Stack
- Next.js + TypeScript + Tailwind CSS
- Supabase PostgreSQL
- Supabase Auth
- Supabase RLS
- Next.js Server Actions / RPC for sensitive writes
- Excel import/export in MVP
- PDF deferred
- WhatsApp wa.me manual links in MVP
- FCM deferred for internal notifications only
- Google Stitch may be used later for UI design inspiration, not as business logic source of truth
