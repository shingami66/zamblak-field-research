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
- **Read-Surface Boundary**: DEV/DEMO database evidence only. No browser smoke, live application authorization, customer production readiness, or Supabase migration-history registration is claimed for the read-surface apply itself.
- **Core ACL Hardening Applied (`ZAM-SEC-ACL-001`)**: `supabase/migrations/20260715120000_harden_core_acl_defaults.sql` committed/pushed as `846894e` and manually applied to designated DEV/DEMO `gdegnwglakyblnmxgiwx` as `postgres`. Post-apply verification: authenticated **SELECT only** on the ten core tables and two managed views; `anon` and `service_role` hold no privileges on those relations; RLS remains enabled; ten named trigger functions lose client/PUBLIC EXECUTE while attachments (22) are preserved; approved helpers/RPCs remain authenticated-only; internal identity helpers and bootstrap remain non-client-callable; `postgres` GLOBAL and `IN SCHEMA public` default privileges no longer auto-grant tables/sequences/functions to client roles or PUBLIC. Owner smoke passed after apply. Support Helper runtime smoke not performed (P2/nonblocking; support RPC EXECUTE catalog-verified). `supabase_admin` default ACLs intentionally out of scope. Production readiness unclaimed.

## Companies data contract (DB applied on DEV/DEMO; application not yet implemented)

**Truth classes:**

1. **Existing committed/applied facts** (core schema + role-safe read surfaces + ACL hardening, DEV/DEMO apply evidence as above).
2. **Approved future design** (Mozfer Companies MVP contract) — planned; not implemented.
3. **Live catalog state (DEV/DEMO)** — **reconciled PASS** under `DWR-COMP-026` (Mozfer metadata-only run on `gdegnwglakyblnmxgiwx`, PostgreSQL 17.6). Full evidence: `docs/companies-live-catalog-verification.md`. Production readiness not claimed. Companies CRUD RPCs and future uniqueness/phone objects are still **not** present live.

### Existing companies table facts (source + live DEV/DEMO catalog PASS)

`public.companies` includes (source migration **and** live catalog):

- `id` (uuid PK)
- `account_id` (uuid NOT NULL → accounts)
- `name` (text NOT NULL)
- `contact_person` (text)
- `phone` (text)
- `notes` (text)
- `created_by` / `updated_by` (uuid → profiles)
- `created_at` / `updated_at` (timestamptz)
- `deleted_at` (timestamptz) — **foundation only** for soft-delete storage

Live catalog confirmed additionally:

- Owner `postgres`; RLS enabled; forced false; **no financial columns**.
- Indexes: `companies_pkey` only (no secondary indexes).
- FKs NO ACTION to `accounts` / `profiles`.
- Trigger `trg_companies_updated_at` → `set_updated_at()`; Companies audit trigger **absent**.
- Authenticated relation privileges: **SELECT only** (INSERT/UPDATE/DELETE/… false for authenticated, PUBLIC, anon, service_role).
- `sel_companies` Owner-only, account-scoped, non-deleted; `ins_companies` policy exists but authenticated lacks INSERT privilege — do not treat policies as direct client mutation authorization.
- Normalized active name uniqueness, name/phone normalization: **absent** (expected; future design).
- No Companies CRUD RPC name collision; support RPCs that join companies remain finance-blind and authenticated-EXECUTE only.

Related:

- `projects.company_id` is required (`projects_company_id_fkey` → `companies(id)`, ON UPDATE/DELETE NO ACTION); account-consistency with companies fails closed (`check_project_account_consistency`, SECURITY DEFINER, non-client-callable).
- Project status vocabulary live: `draft`, `active`, `closed`, `cancelled`.
- Packet returned no secondary project indexes on `company_id` / `account_id` / `status` / `deleted_at` — **nonblocking** design requirement for company-scoped lookup/count.
- Direct client **UPDATE** on `companies` is denied by design (state-smuggling control); operational mutations must go through controlled RPC/Server Actions.
- Support Helper does **not** have broad Companies base-table SELECT.

### Companies design and DEV/DEMO database implementation

Canonical design: **`docs/companies-schema-rpc-design.md`**. Migration: **`supabase/migrations/20260716120000_companies_mvp_schema_rpc.sql`** — **applied and object-verified on designated DEV/DEMO** `gdegnwglakyblnmxgiwx` (PostgreSQL 17.6). Application wiring is **not** implemented.

**User-managed fields (MVP):** `name` (required), `contact_person`, `phone`, `notes` (optional; blank → null).

**Limits:** name ≤ 120; contact_person ≤ 80; phone 8–15 digits after normalization; notes ≤ 2000.

**Name (live DEV/DEMO):** IMMUTABLE `normalize_company_name`; partial unique index `idx_companies_account_norm_name_active` on `(account_id, normalize_company_name(name)) WHERE deleted_at IS NULL`.

**Phone (live DEV/DEMO):** IMMUTABLE `normalize_company_phone`; CHECK `chk_companies_phone_normalized` (NULL or `^[0-9]{8,15}$`); Saudi `05xxxxxxxx` → `9665xxxxxxxx` only in helper.

**RPCs (live DEV/DEMO):** `list_companies(text,integer,integer)`, `get_company(uuid)`, `create_company(text,text,text,text)`, `update_company(uuid,text,timestamp with time zone,text,text,text)` — required `p_expected_updated_at` before optional defaults; SECURITY DEFINER; `search_path=pg_catalog, public`; authenticated EXECUTE only; finance-free; active/closed project counts.

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
- Support Helper: bounded Companies RPCs on DEV/DEMO (same four functions as Owner); finance-blind; no broad base SELECT.

**Metrics (approved product, query-time only):**

- List: active project count (`projects.deleted_at IS NULL` and `status = 'active'`).
- Detail: active projects (`status = 'active'`); completed projects (`status = 'closed'`, Arabic label `مكتمل`).
- Exclude draft, cancelled, and deleted projects from those metrics.

**Project statuses (existing, authoritative):** `draft`, `active`, `closed`, `cancelled` only. Do not invent a stored `completed` status.

**Implementation gate:** catalog verification **PASS/closed**. Schema/RPC design **complete**. Migration source **complete**. DEV/DEMO apply + eight-object verification **PASS**. **Next:** application contracts/UI (`ZAM-COMPANIES-APP-CONTRACTS-1`); Owner/Support Helper runtime smoke still pending. Production readiness unclaimed. See `docs/deferred-decisions.md` register `DWR-COMP-001`–`DWR-COMP-028`.
