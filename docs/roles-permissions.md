# Roles and Permissions

## Product & Role Status Boundaries

### 1. Current Implemented Truth
- **Implemented Roles:** Current application and database implementations recognize both `owner` and `support_helper` roles.
- **Owner Authority & Financial Scope:** Owner holds exclusive financial authority boundaries. Live Research Form review foundations are implemented in code and database. Form financial-summary and Collections database/RPC foundations exist. The current `/financials` page renders mock/demo display data, while the Collections application UI remains an in-memory/`sessionStorage` prototype. Live payment-recording UI and financial-report export are authorized Owner capabilities but must not be claimed as fully implemented or runtime-accepted application workflows.
- **Support Helper Authority:** `support_helper` can perform finance-blind operational actions (e.g., Company create/edit, non-financial project directory views, respondent management).
- **Server Resolution:** Application authority is resolved on the server from the authenticated user's active, non-deleted database profile and account membership. Browser state, form inputs, URL parameters, and role labels are never trusted as authority.
- **Client Posture:** Normal application requests use the authenticated user-session Supabase client under RLS; no service-role client is used in normal application flows.

### 2. Approved Future Product Direction
- **Owner-First V1 Focus:** Approved product direction for the next V1 design phase is Owner-first.
- **Multi-Researcher SaaS:** Zamblak will evolve from an Owner-first tool into a professional multi-researcher SaaS platform.
- **Finance Blindness:** Non-financial operations (interviews, field data collection, respondent registration) will maintain strict finance blindness.
- **Zero Browser Financial Authority:** Browser-supplied pricing or financial authority is forbidden. Price calculations and financial snapshots are computed authoritatively on the server.

### 3. Legacy Compatibility
- **`support_helper` Role Status:** `support_helper` is an implemented legacy compatibility role in the current application and database RLS.
- **Preservation Rule:** Existing `support_helper` code checks, RPC boundaries, and permissions must **NOT** be deleted or broken in current work to prevent runtime regressions.
- **Design Rule:** `support_helper` must **NOT** define new product features or new domain model architectures.

### 4. Unresolved Decisions
- **Future Multi-Researcher Roles:** Exact future role structures, role names, and permission matrices for the multi-researcher SaaS platform remain explicitly **UNRESOLVED** until operational workflows are approved. No invented role names or speculative matrices are adopted prematurely.
- **Role Onboarding Workflows:** Multi-researcher invitation and onboarding workflows will be designed in a future role-model milestone.

## Authority Resolution

- Application authority is resolved server-side from the authenticated user's active, non-deleted database profile and account membership.
- `public.resolve_current_profile()` via the `resolveCurrentProfile()` helper is the current profile-resolution boundary.
- Browser role labels, account IDs, profile IDs, form inputs, URL parameters, and redirects are never trusted as authority.
- Normal application flows use the authenticated user-session Supabase client under RLS; no service-role client is used in normal application paths.
- RLS and authenticated RPC enforcement remain authoritative. See [security-foundation.md](./security-foundation.md) for the full security boundary.

## Current Authenticated Route and Capability Matrix (`ZAM-AUTH-001D` — Implemented)

| Capability | `owner` | `support_helper` (Legacy) | Current Boundary |
| :--- | :---: | :---: | :--- |
| Protected dashboard `/` | Yes | Yes | Responsive authenticated shell; no fake metrics. |
| `/companies` list | Yes | Yes | **Implemented** MVP list + search + pagination (RPC). |
| `/companies/new` | Yes | Yes | **Implemented** create (Server Action → RPC). |
| `/companies/[id]` | Yes | Yes | **Implemented** detail (operational fields + counts). |
| `/companies/[id]/edit` | Yes | Yes | **Implemented** edit + optimistic concurrency (Server Action → RPC). |
| `/projects` list | Yes | Yes | **Implemented** list (RPC); finance-blind. |
| `/projects/new` | Yes | Yes | **Implemented** create (Server Action → RPC). |
| `/projects/[projectId]` detail | Yes | Yes | **Implemented** detail; finance-blind. |
| `/projects/[projectId]/edit` | Yes | Yes | **Implemented** edit (Server Action → RPC). |
| Project lifecycle transitions | Yes | **No** | Owner-only (`transition_project_status`); Support Helper has no lifecycle mutation authority. |
| Participation assignment `/projects/[projectId]/participants`, `/projects/[projectId]/add-respondent` | Yes | Yes | **Implemented** assignment + three-month/eligibility warning foundations (`create_participation`, `check_respondent_three_month_warning`); finance-blind. |
| `/respondents` list/create/detail/edit | Yes | Yes | **Implemented** Respondent Registry CRUD (Server Action → RPC); finance-blind. |
| Research Forms `/forms*` | Yes | **No** | Owner-only routes (non-Owner redirects to `/forbidden`). `/forms` list is server/source-backed; `/forms/new` and `/forms/[formId]` detail/review are server/RPC-backed (`submit_research_form`, `getResearchForm`, `review_research_form`); these live surfaces are not backed by the sessionStorage prototype. The sessionStorage prototype (`zamblak.forms-prototype.v1`) backs only the Collections UI and the legacy route mirrors `/forms/participants/[participantId]` and `/forms/projects/[projectId]`. Full acceptance runtime is not claimed without valid pricing. |
| Collections `/collections*` | Yes | **No** | Owner-only routes (non-Owner redirects to `/forbidden`). Prototype-only sessionStorage UI; Owner-gated database/RPC foundations exist. |
| Controlled `/financials` | Yes | **No** | Owner-only route (Non-Owner access redirects to `/forbidden`). Renders mock/demo financial display data; not a live financial ledger or completed payment workflow. |
| Account menu | Yes | Yes | Server-resolved profile context. |
| Logout | Yes | Yes | Current browser session only (`scope: "local"`) → `/login`. |

Companies, Projects, and Respondent Registry modules are implemented in the application. `/forms*`, `/collections*`, and `/financials` are Owner-only routes; `support_helper` receives no finance, pricing, payment, or Owner-only review authority. Full payment-recording UI, financial ledger workflows, and server-backed Collections UI are not claimed.

## Companies Permissions (MVP — Implemented)

### Owner (Implemented)

| Action | Allowed | Enforcement |
| :--- | :---: | :--- |
| List / search companies | Yes | Server-side helpers + request-scoped authenticated Supabase client; RLS remains authoritative |
| View company detail | Yes | Same |
| Create company | Yes | Server Action → authenticated RPC |
| Edit `name`, `contact_person`, `phone`, `notes` | Yes | Server Action → authenticated RPC |
| Soft-delete / restore | **No** (MVP) | Deferred (`DWR-COMP-001`–`003`) |
| Companies financial ledger | **No** | Finance stays off Companies UI |
| View operational project summaries | Yes | Non-financial project aggregates only |

### Support Helper (Legacy Compatibility — Implemented)

| Action | Allowed | Enforcement |
| :--- | :---: | :--- |
| List / search companies | Yes | Authenticated Companies list/detail RPCs (bounded; finance-free) |
| View company detail | Yes | Same RPCs |
| Create company | Yes | Server Action → authenticated RPC |
| Edit the same four operational fields | Yes | Server Action → authenticated RPC |
| Soft-delete / restore | **No** | — |
| Broad Companies base-table SELECT | **No** | Owner-only base SELECT posture remains |
| Direct base-table mutation / UPDATE | **No** | Denied by design |
| Finance (prices, payments, due amounts, summaries) | **No** | **Finance-blind** |
| Operational notes view/edit | Yes | Explicit approval recorded for MVP |

### Companies Mutation and Authority Invariants
- All create/edit mutations: **Server Action → authenticated RPC**.
- Unified RPCs for Owner and Support Helper (see [companies-schema-rpc-design.md](./companies-schema-rpc-design.md)). Owner-only base-table SELECT (`sel_companies`) remains; Support Helper must not gain broad Companies SELECT.
- No direct client or direct base-table UPDATE path; authenticated relation privileges remain SELECT-only.
- No browser-supplied trusted `account_id`, role, profile, ownership, or finance authority.

## Verified Database Read Surface (DEV/DEMO, `ZAM-WF-001F`)

Database evidence from the applied `202607130002_role_safe_read_surfaces.sql`:
- Owner base-table SELECT remains Owner-only for permitted rows; operational and financial summary views remain Owner-scoped.
- Support Helper access is limited to four approved support-safe `SECURITY DEFINER` RPCs:
  - `support_participation_operational_rows(uuid, integer, integer)`
  - `support_profile_directory(integer, integer)`
  - `support_project_participation_summary(uuid, integer, integer)`
  - `support_project_directory(integer, integer)`
- Support Helper must not receive broad base-table reads, pricing, payments, financial summaries, or review-only/sensitive respondent fields beyond that safe RPC surface.

## Access and Onboarding Authority

Binding policy: `INVITATION_OR_ADMIN_SEED_ONLY`.
- The one-time first-Owner bootstrap created exactly one initial account and one active, non-deleted Owner through a privileged SQL-owner-only path.
- Existing-account access is invitation or controlled administrative seed only. Public self-service signup and arbitrary account creation are disabled for MVP.

## Projects Permissions (MVP — Implemented)

- Projects list, create, detail, and edit are implemented in the application, backed by authenticated RPCs; Projects is not list-only, pending, or a placeholder.
- Project lifecycle transitions remain **Owner-only** (`transition_project_status`); Support Helper has no lifecycle mutation authority.
- Support Helper project access remains bounded and finance-blind (no prices, dues, payments, or financial summaries).
- No browser-supplied trusted ownership, tenant, or finance authority.

## Respondent and Participation Boundaries

- Respondent Registry list, create, detail, and edit are implemented under `/respondents*` (Server Action → authenticated RPC).
- Participation assignment and three-month/eligibility warning foundations exist (`create_participation`, `check_respondent_three_month_warning`, `list_project_participations`), callable by Owner and Support Helper through bounded authenticated RPCs.
- Account and project consistency checks remain mandatory; tenant scoping is enforced.
- Finance-blind operational access must not expose prices, accepted amounts, payment details, financial summaries, or Owner-only review data.
- No future field-worker role is invented here.

## Research Form Boundary

- Live Research Form submission is **Owner-only** (`submit_research_form`); Owner-gated.
- Exactly one persisted Research Form per Participation is enforced across all statuses (`idx_rf_unique_participation`).
- Visible review decisions are Accept and Reject; Owner review authority is current (`review_research_form`, `getResearchForm`, `/forms/[formId]`).
- Browser-supplied price is forbidden; accepted pricing is resolved authoritatively from server/database sources.
- Acceptance fails closed (`accepted_price_unavailable`) when usable pricing is absent; no silent `0.00` fallback.
- Support Helper receives no pricing, accepted-price snapshots, financial totals, or Owner-only review authority.
- Successful manual acceptance is not claimed without valid pricing evidence.
- Detailed enforcement: [security-foundation.md](./security-foundation.md), [database-schema.md](./database-schema.md).

## Financials and Collections

- Owner holds exclusive financial authority.
- `/financials` is Owner-only; non-Owner access redirects to `/forbidden`. It renders mock/demo data and is not a live financial ledger or completed payment workflow.
- Research Form financial-summary and Collections database/RPC foundations exist and are Owner-gated.
- The Collections application UI remains prototype-only and `sessionStorage`-backed (`zamblak.forms-prototype.v1`); prototype routes do not prove live server-backed payment recording.
- Live payment-recording UI and financial-report export are not fully implemented or runtime-accepted.
- Support Helper receives no financial route, wording, pricing, payment, due amount, or financial-summary authority.

## Current Versus Future Product Boundary

Current live hierarchy:

`Account → Company → Project → Participation → Research Form`

Approved future logical hierarchy:

`Account → Company → Project → Sample → Participation → Research Form`

- **Project Sample is not implemented**; no current Sample permissions exist.
- Future Sample permissions depend on the future role/workflow design.
- `P###-S##-F###` is future reference direction only.
- No physical Sample schema or RBAC model is authorized here.

## Accuracy Boundaries

All role, route, and database statements above reflect the DEV/DEMO baseline (source code and applied migrations at the time of writing). Production readiness, finalized future multi-researcher roles, an implemented Sample module, a completed financial ledger, and a server-backed Collections UI are **not** claimed.
