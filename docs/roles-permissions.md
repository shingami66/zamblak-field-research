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

## Current Authenticated Route Access (`ZAM-AUTH-001D` — Implemented)

| Capability | `owner` | `support_helper` (Legacy) | Current Boundary |
| :--- | :---: | :---: | :--- |
| Protected dashboard `/` | Yes | Yes | Responsive authenticated shell; no fake metrics. |
| `/companies` list | Yes | Yes | **Implemented** MVP list + search + pagination. |
| `/companies/new` | Yes | Yes | **Implemented** create (Server Action → RPC). |
| `/companies/[id]` | Yes | Yes | **Implemented** detail (operational fields + counts). |
| `/companies/[id]/edit` | Yes | Yes | **Implemented** edit + optimistic concurrency. |
| `/projects` module | Yes | Yes | **Implemented** project list, create, detail, and edit flows. Lifecycle transitions remain Owner-only; Support Helper access remains finance-blind and bounded. |
| Account menu | Yes | Yes | Server-resolved profile context. |
| Logout | Yes | Yes | Current browser session only (`scope: "local"`) → `/login`. |
| Controlled `/financials` | Yes | No | Owner-only route (Non-Owner access redirects to `/forbidden`). Renders mock/demo financial display data; Collections links lead to prototype flows. Not a live financial ledger or completed payment workflow. |

Companies and Projects modules are implemented in the application. `/financials` is an Owner-only route rendering mock/demo data; full payment-recording UI and financial ledger workflows are not claimed.

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
- Unified RPCs for Owner and Support Helper (see [`docs/companies-schema-rpc-design.md`](file:///D:/Zamblak/Zamblak-field-research/docs/companies-schema-rpc-design.md)). Owner-only base-table SELECT (`sel_companies`) remains; Support Helper must not gain broad Companies SELECT.
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
