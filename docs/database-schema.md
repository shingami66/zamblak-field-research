# Database Schema Direction

- `accounts` is tenant root
- `account_id` is tenant boundary
- all business tables reference `accounts(id)`
- `projects` is operational only
- `project_financial_settings` is Owner-only
- `participations` is operational only
- `participation_pricing` is Owner-only
- `payments` is Owner-only
- `audit_log` is trigger-backed and client-immutable
- `account_id` consistency triggers are required
- direct client UPDATE on `participations`, `companies`, `projects`, and `respondents` must be denied to prevent state-smuggling
- operational updates must go through controlled RPC/server actions
- `price_snapshot` should not be overwritten on re-acceptance unless Owner runs a separate repricing action with reason and audit
- changing accepted to non-accepted after payments exist requires `review_correction_reason`
- respondents unique mobile index must be partial where `deleted_at` is null
- normalized mobile format is 9665xxxxxxxx
- data retained indefinitely by default, with soft delete/archive

## Status
- **Initial Core Schema Applied**: Defined in `supabase/migrations/202607060001_zamblak_core_schema.sql`. Contains 10 base tables, triggers, helper functions, and two security-invoker views (`project_operational_summary` and `project_financial_summary`). RLS is enabled on all tables. Hardened under FIX-5 and FIX-6. Applied manually via Supabase SQL Editor on target `gdegnwglakyblnmxgiwx` in Northeast Asia (ap-northeast-1).
- **Participation Project-State Enforcement Applied**: `supabase/migrations/202607130001_participation_project_state_guard.sql` was committed and pushed in `0d48fe8ed2d67b2f923a44b59f52a6dab0010577`, then manually applied by Mozfer to the designated currently empty DEV/DEMO database for project `gdegnwglakyblnmxgiwx`. Post-apply verification confirmed `public.enforce_participation_project_state()`, trigger `trg_participation_00_project_state_guard`, `SECURITY DEFINER SET search_path = public`, revoked direct execution for `PUBLIC`, `anon`, and `authenticated`, and preservation of the existing unique index and account-consistency trigger.
- **Participation Membership Write Invariant**: `INSERT`, project reassignment, respondent reassignment creating a new membership, and soft-delete restore require an existing `active`, non-deleted project. Missing, deleted, draft, closed, and cancelled projects fail closed. The guard uses a `FOR SHARE` project-row lock and stable errors `project_not_found`, `project_deleted`, and `project_not_active`. Ordinary non-membership updates and soft deletion remain outside this guard.
- **Verification Boundary**: A controlled zero-UUID missing-project dry-run failed through the expected `project_not_found` path and persisted no test row; no cleanup was required. This records manual database evidence only. It does not claim browser smoke, live application authorization, live concurrency testing, customer production readiness, or Supabase migration-history registration.
- **Role-Safe Read Surfaces Applied (ZAM-WF-001F)**: `supabase/migrations/202607130002_role_safe_read_surfaces.sql` (SHA-256 `AE01C67A188E188533769E946C4965878975381B0E5CB1AF750431028F56EC8D`) was prepared, frozen, and manually applied by Mozfer to designated DEV/DEMO project `gdegnwglakyblnmxgiwx`. Read-only post-apply verification passed for **11** managed functions, **2** managed views, and **23** managed policies.
- **Read-Surface Contract**: Owner base-table SELECT remains owner-only for current permitted rows. Support Helper database access is limited to four support-safe `SECURITY DEFINER` RPCs (`support_participation_operational_rows`, `support_profile_directory`, `support_project_participation_summary`, `support_project_directory`) and must not receive broad base-table reads, pricing, payments, financial-summary visibility, or unapproved sensitive fields.
- **Managed Manifest Evidence**: Final DEV/DEMO managed-manifest MD5 `f950c7ec5024dcf907d36f02df8c78b4`, octets `8238`. Post-apply verification also confirmed fixed `search_path`, EXECUTE ACLs, view structure/dependencies/ACLs, policy identities/expressions, core-table SELECT ACL contract, preserved project-state guard and unique respondent-per-project index, and expected RLS state.
- **Read-Surface Boundary**: DEV/DEMO database evidence only. No browser smoke, live application authorization, customer production readiness, or Supabase migration-history registration is claimed. Residual non-SELECT privileges (for example `MAINTAIN`, `REFERENCES`, `TRIGGER`, `TRUNCATE`) remain a separate deferred security follow-up.

## Companies data contract (approved design — not yet implemented)

**Truth classes:**

1. **Existing committed/applied facts** (core schema + role-safe read surfaces, DEV/DEMO apply evidence as above).
2. **Approved future design** (Mozfer Companies MVP contract) — planned only until gates pass.
3. **Live catalog state** — **unknown for this phase** until `ZAM-COMPANIES-001-LIVE-CATALOG-VERIFY-1` / `DWR-COMP-026` completes metadata-only reconciliation against DEV/DEMO. Do not claim indexes, new constraints, new policies, grants, or Companies RPCs exist before that verification and implementation.

### Existing companies table facts (source: core schema)

`public.companies` currently includes (source migration):

- `id` (uuid PK)
- `account_id` (uuid NOT NULL → accounts)
- `name` (text NOT NULL)
- `contact_person` (text)
- `phone` (text)
- `notes` (text)
- `created_by` / `updated_by` (uuid → profiles)
- `created_at` / `updated_at` (timestamptz)
- `deleted_at` (timestamptz) — **foundation only** for soft-delete storage

Related:

- `projects.company_id` is required and account-consistency with companies fails closed.
- Direct client **UPDATE** on `companies` is denied by design (state-smuggling control); operational mutations must go through controlled RPC/Server Actions.
- After `ZAM-WF-001F`, `sel_companies` is Owner-only for non-deleted rows; `ins_companies` is account-scoped insert with checks. Support Helper does **not** have broad Companies base-table SELECT.

### Approved future Companies design (not implemented)

**User-managed fields (MVP):** `name` (required), `contact_person`, `phone`, `notes` (optional; blank → null).

**Application/RPC validation limits (not existing DB column limits):** name ≤ 120; contact_person ≤ 80; phone 8–15 digits after normalization; notes ≤ 2000.

**Phone (approved model):** optional; digits-only E.164-style storage; strip spaces/`()`/`-`/leading `+`; Saudi `05xxxxxxxx` → `9665xxxxxxxx`; other values must include country code; not unique; error `invalid_company_phone`; display LTR.

**Duplicates (approved model):** database-authoritative normalized active name uniqueness per `account_id` where `deleted_at IS NULL`; atomic block; error `duplicate_company_name`. Future schema task must define one immutable DB normalization authority shared by unique index/constraint and RPCs.

**Not in Companies MVP schema additions:**

- company status enum
- stored company domain
- email / city / address
- payment terms or financial totals on companies
- stored aggregate/count columns

**Lifecycle (approved MVP product):**

- Expose **non-deleted** companies only.
- **No** soft-delete/restore lifecycle mutation path or UI in MVP.
- `deleted_at` remains a column foundation only and does **not** authorize a lifecycle UI or RPC in this phase.

**Mutations (approved):** create and edit only via **Server Action → authenticated RPC**. No direct base-table UPDATE path. No lifecycle RPC.

**Reads (approved):**

- Owner: server-side query helpers + request-scoped authenticated client; RLS authoritative.
- Support Helper: bounded support-safe `SECURITY DEFINER` list/detail RPCs (to be designed); finance-blind; no broad base SELECT.

**Metrics (approved product, query-time only):**

- List: active project count (`projects.deleted_at IS NULL` and `status = 'active'`).
- Detail: active projects (`status = 'active'`); completed projects (`status = 'closed'`, Arabic label `مكتمل`).
- Exclude draft, cancelled, and deleted projects from those metrics.

**Project statuses (existing, authoritative):** `draft`, `active`, `closed`, `cancelled` only. Do not invent a stored `completed` status.

**Implementation gate:** no Companies migration/RPC implementation until live catalog verification and schema/RPC design reviews pass. See `docs/deferred-decisions.md` register `DWR-COMP-001`–`DWR-COMP-028`.
