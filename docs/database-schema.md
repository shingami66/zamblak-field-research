# Database Schema Direction & Status

## Status Boundaries & Implementation Truth

### 1. Current Live DEV/DEMO Hierarchy
The current physical schema deployed on designated DEV/DEMO follows this hierarchy:
`Account → Company → Project → Participation → Research Form`

### 2. Current Live Entity Inventory
Installed and verified across the 19 applied migrations (`202607060001` through `20260730102500`):
- `accounts`: Tenant root boundary (`account_id`).
- `profiles`: User identity linked to Supabase Auth (`auth.users`).
- `companies`: Client/Sponsor companies (`sel_companies`, CRUD RPCs).
- `projects`: Operational projects (`draft`, `active`, `closed`, `cancelled`).
- `project_financial_settings`: Owner-only project pricing (`price_per_accepted_form`).
- `respondents`: Unique mobile respondent registry (`9665xxxxxxxx`).
- `participations`: Respondent-to-project operational link.
- `participation_pricing`: Owner-only participation price override (`price_snapshot`).
- `payments`: Owner-only payment ledger entries.
- `audit_log`: Trigger-backed client-immutable audit log.
- `research_forms`: Persisted research form submissions (`RF-YYYYMMDD-NNN`).
- `collections`: Owner-only receivables/settlement entries.
- `collection_allocation_revisions`: Revision history for collection allocations.
- `collection_allocations`: Payment-to-form allocation mappings.
- `idempotency_keys`: Idempotent mutation claims tracker.

### 3. Enforced Schema Invariants
- **No Physical Sample Entity Yet:** `ProjectSample` is not currently implemented in the database schema. Participations reference `projects(id)` directly.
- **One Form Per Participation:** Exactly one persisted `ResearchForm` row is allowed per `Participation` across all review statuses (`enforce_one_research_form_per_participation`).
- **Stored Identifiers:** Form references remain stored as RF-formatted strings (`RF-YYYYMMDD-NNN`).
- **UUID Exposure Boundary:** Raw UUIDs are internal database keys and must not be exposed as primary user-facing references.
- **Live Form Foundations:** Submission (`submit_research_form`), detail querying (`getResearchForm`), and Owner review (`review_research_form`) are live in database RPCs and Next.js application routes (`/forms/[formId]`).
- **Live Projects Module:** Project list, create, detail, and edit flows are implemented in the application. Status lifecycle transitions (`transition_project_status`) are Owner-only.
- **Collections & Receivables Status:** Form financial-summary views (`form_financial_summary`) and Collections schema/RPC foundations exist in Supabase. The current Collections application UI remains an in-memory/`sessionStorage` prototype (`zamblak.forms-prototype.v1`). Full end-to-end runtime acceptance is not claimed while valid pricing setup remains unconfigured for tested participations.

### 4. Authoritative Price Lookup & Acceptance Semantics
Current price lookup behavior inside `review_research_form` RPC (`20260730102500_fix_review_form_price_lookup.sql`):
1. **Primary Lookup:** `participation_pricing.price_snapshot` (for `participation_id = research_form.participation_id`).
2. **Fallback Lookup:** `project_financial_settings.price_per_accepted_form` (for `project_id = research_form.project_id`).
3. **Missing Price Rejection:** If both values are NULL, `review_research_form` fails closed and throws error `accepted_price_unavailable`.
4. **Authoritative Snapshot:** Upon successful form acceptance, `v_price` is saved to `research_forms.accepted_price_snapshot` as immutable historical evidence.
- **Security Rule:** Browser-supplied price values are strictly forbidden.
- **Zero-Price Protection:** Missing pricing configuration must **never** silently fall back or default to `0.00`.
- **UI Null State:** Before acceptance, unconfigured forms may display `"لم تُحدد بعد"` in UI summaries, but acceptance will fail unless an authoritative price snapshot or project fallback is configured in the database.

### 5. Database Migration Ledger Status
- **Applied Inventory:** 19 migration files in `supabase/migrations/` (from `202607060001_zamblak_core_schema.sql` to `20260730102500_fix_review_form_price_lookup.sql`).
- **Migration Repair:** `20260730102500` was applied to designated DEV/DEMO, catalog-verified, and registered as `applied` in remote `supabase_migrations` history.
- **Boundary Note:** Catalog verification of `20260730102500` confirms SQL correctness but does not claim successful form acceptance where pricing configuration is missing.

---

## Approved Future Product Direction (Non-Live Logical Design)

### Target Logical Hierarchy
The approved future SaaS product direction requires introducing `ProjectSample`:
`Account → Company → Project → Sample → Participation → Research Form`

### Target Reference Format
- **Future Human Reference:** `P###-S##-F###` (e.g., `P012-S01-F004`), scoped per sample.
- **Implementation Status:** Not implemented in physical database schema or code yet.
- **Migration Requirement:** Existing `RF-YYYYMMDD-NNN` references will require a backfill and compatibility strategy during the physical sample-domain migration slice.

---

## Unresolved Physical Schema Decisions

The following physical database schema details remain explicitly **UNRESOLVED** until physical migration design slices are authorized:
- Exact physical table name and column definition for Sample (e.g. `project_samples`).
- Physical table structure for sample-level financial settings (e.g. `project_sample_financial_settings`).
- Foreign key placement and migration strategy for `participations.sample_id`.
- Sample lifecycle and status vocabulary.
- Whether multiple Samples may be active simultaneously per project.
- Quota vs. Sample target modeling.
- Participation backfill and default-Sample assignment strategy.
- Sequence-generation mechanism for atomic `P###-S##-F###` counters.
- Final migration slice order and deployment timing.

*(Do not prematurely invent or execute physical DDL for unresolved sample tables).*

---

## Historical Implementation Evidence

- `accounts` is tenant root (`account_id` is tenant boundary).
- All business tables reference `accounts(id)`.
- `projects` is operational; `project_financial_settings` is Owner-only.
- `participations` is operational; `participation_pricing` is Owner-only.
- `payments` is Owner-only; `audit_log` is trigger-backed and client-immutable.
- Account-consistency triggers enforce strict tenant isolation.
- Direct client UPDATE on `participations`, `companies`, `projects`, and `respondents` is denied to prevent state-smuggling.
- Operational updates must go through controlled RPC/Server Actions.
- Respondents unique mobile index is partial where `deleted_at IS NULL` (normalized format `9665xxxxxxxx`).

### Historical DB Apply Logs
- **Initial Core Schema Applied**: Defined in `202607060001_zamblak_core_schema.sql`. Contains 10 base tables, triggers, helper functions, and two views (`project_operational_summary` and `project_financial_summary`). Hardened under FIX-5 and FIX-6 on DEV/DEMO (`gdegnwglakyblnmxgiwx`).
- **Participation Project-State Enforcement Applied**: `202607130001_participation_project_state_guard.sql` installed `enforce_participation_project_state()` and `trg_participation_00_project_state_guard` on DEV/DEMO.
- **Role-Safe Read Surfaces Applied (ZAM-WF-001F)**: `202607130002_role_safe_read_surfaces.sql` installed 11 managed functions, 2 views, and 23 policies on DEV/DEMO.
- **Core ACL Hardening Applied (`ZAM-SEC-ACL-001`)**: `20260715120000_harden_core_acl_defaults.sql` hardened authenticated privileges to SELECT-only on core tables.
- **Companies MVP Schema & RPCs Applied**: `20260716120000_companies_mvp_schema_rpc.sql` installed Companies RPCs (`list_companies`, `get_company`, `create_company`, `update_company`). Application CRUD implemented.
- **Projects MVP Schema & RPCs Applied**: `20260716160000_projects_mvp_schema_rpc.sql` and `20260716170000_projects_mvp_rpc_corrections.sql` installed Projects RPCs (`list_projects`, `get_project`, `create_project`, `update_project`, `transition_project_status`). Application list/create/detail/edit flows implemented.
- **Respondents MVP Schema & RPCs Applied**: `20260717120000_respondents_mvp_schema_rpc.sql` installed Respondents RPCs on DEV/DEMO.
- **Forms & Collections Schema & RPCs Applied**: `20260723120000` through `20260723150000` installed `research_forms`, `collections`, `collection_allocation_revisions`, `collection_allocations`, `idempotency_keys`, views, and RPCs.
- **One Form Per Participation Guard Applied**: `20260723170000_enforce_one_research_form_per_participation.sql` enforced 1:1 form-to-participation constraint.
- **Review Form Price-Lookup Fix Applied**: `20260730102500_fix_review_form_price_lookup.sql` corrected review RPC price lookup.
