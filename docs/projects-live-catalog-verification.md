# Projects live DEV/DEMO catalog verification gate

- **Task:** `ZAM-PROJECTS-LIVE-CATALOG-VERIFY-1` (+ PUBLIC ACL fix `8f45129`)
- **Packet status:** **manually executed** (Mozfer) and **reviewed PASS WITH WARN**
- **Gate decision:** **PASS WITH WARN** — design may proceed (`docs/projects-schema-rpc-design.md`)
- **Designated DEV/DEMO project ref:** `gdegnwglakyblnmxgiwx`
- **Live PostgreSQL:** **17.6**; session role `postgres`
- **Authority:** `ZAM-PROJECTS-MVP-SCOPE-REVIEW-1` (PASS WITH WARN); committed migrations; Mozfer-reviewed live catalog export (metadata only; **not** committed as a repository artifact)
- **Production readiness:** **not claimed**

### Live run result (reviewed PASS WITH WARN)

| Field | Value |
|---|---|
| Runner | Mozfer, Supabase SQL Editor, DEV/DEMO only |
| Project | `gdegnwglakyblnmxgiwx` |
| PG | **17.6** |
| Writes | None |
| Business rows | None |
| Review | PASS WITH WARN (soft-deleted Company gap; no lifecycle transition RPC; support directory not product API) |
| Soft-deleted Company rejected by trigger? | **No** (definition gap; design closes in migration) |
| Projects CRUD RPCs | **Absent** |
| Live index | `idx_projects_account_company_status_live` present |
| Next | Schema/RPC design recorded; next implementation: `ZAM-PROJECTS-SCHEMA-RPC-MIGRATION-1` |

---

## 1. Purpose

Reconcile the **live DEV/DEMO PostgreSQL catalog** for the **Projects domain** against committed source assumptions **before** any Projects schema/RPC design or migration work.

This packet must verify:

- the installed `public.projects` table contract;
- constraints, indexes, triggers, RLS, and ACLs;
- account/company consistency enforcement;
- project status / domain / resident-type enums;
- `project_financial_settings` separation (Owner-only finance);
- existing operational/support project RPCs and views;
- exact function security posture;
- **absence** of Projects CRUD RPCs;
- whether the live consistency function rejects a **soft-deleted Company** parent;
- the live Companies-added index `public.idx_projects_account_company_status_live`.

This packet does **not**:

- design or implement Projects RPCs;
- apply migrations;
- invent live results;
- claim production readiness;
- authorize Projects application work without a later design PASS;
- include application or browser smoke.

---

## 2. DEV/DEMO-only warning

| Rule | Requirement |
|---|---|
| Environment | **DEV/DEMO only** |
| Supabase project ref | **`gdegnwglakyblnmxgiwx`** (confirm in Dashboard before run) |
| Runner | **Mozfer only**, Supabase SQL Editor |
| Writes | **None** |
| Business rows | **None** — no `SELECT` of domain table row data |
| Secrets | Do not print connection strings, JWTs, service-role keys, or `.env` values |
| Production | **Not authorized** for this packet |

---

## 3. Exact Supabase project ref

```text
gdegnwglakyblnmxgiwx
```

PostgreSQL does not expose the Supabase project ref as a server setting. Mozfer must **manually** confirm the Dashboard project matches this ref before running the packet.

---

## 4. Manual run instructions (Mozfer)

1. Open the Supabase **DEV/DEMO** project: **`gdegnwglakyblnmxgiwx`**.
2. Open **SQL Editor**.
3. Confirm the selected role is **`postgres`** (or the SQL Editor superuser role that can read all of `pg_catalog`).
4. Confirm you are **not** on a customer production project.
5. Create a new query. Paste the **complete** SQL packet in [§ Metadata-only SQL packet](#15-metadata-only-sql-packet) (from the first `--` header through the final `;`).
6. Run it **once**. Expect a **single** result grid with ordered sections (`section_order` 1…).
7. Do **not** modify the packet or run isolated write statements.
8. Export the result as **CSV** where possible, or provide complete screenshots / full result text.
9. Stop **immediately** if any SQL error occurs.
10. Do **not** rerun repeatedly after an error.
11. Send the **full** result to the controller for PASS / WARN / HOLD review.
12. Do **not** start Projects migration/RPC design from this packet alone.
13. Do **not** perform application or browser smoke as part of this gate.

**Next controlled task after export exists:** `ZAM-PROJECTS-LIVE-CATALOG-VERIFY-RUN-1` (result review).

---

## 5. Safety contract (mandatory)

| Rule | Requirement |
|---|---|
| Packet type | **Metadata / catalog only** (`pg_catalog`, privilege helpers, `pg_get_*` definition text) |
| DDL | Forbidden (`CREATE` / `ALTER` / `DROP` / …) |
| DML | Forbidden (`INSERT` / `UPDATE` / `DELETE` / `MERGE`) |
| Privilege changes | Forbidden (`GRANT` / `REVOKE` / `SECURITY LABEL`) |
| Role switch | Forbidden (`SET ROLE`) |
| Temp tables / write transactions | Forbidden |
| Business-data dumps | Forbidden (no row data from `projects`, `companies`, `participations`, respondents, payments, etc.) |
| Service-role / JWT impersonation | Forbidden |
| Function definitions | May be returned via `pg_get_functiondef` / `pg_get_triggerdef` (definition text only, not business rows) |

**Explicit statements:**

- This packet performs **no business-row writes**.
- This packet includes **no application smoke**, no browser checks, and no auth-user enumeration.

---

## 6. Documented source assumptions (static; not live evidence)

From committed migrations (primarily `202607060001_zamblak_core_schema.sql`, `202607130001_participation_project_state_guard.sql`, `202607130002_role_safe_read_surfaces.sql`, `20260715120000_harden_core_acl_defaults.sql`, `20260716120000_companies_mvp_schema_rpc.sql`):

### 6.1 `public.projects` (expected from source)

| Column | Expected type / notes |
|---|---|
| `id` | `uuid` PK, default `gen_random_uuid()` |
| `account_id` | `uuid` NOT NULL → `accounts(id)` |
| `company_id` | `uuid` NOT NULL → `companies(id)` |
| `name` | `text` NOT NULL |
| `domain` | `text` NOT NULL; CHECK `telecom\|banking\|insurance\|product\|other` |
| `status` | `text` NOT NULL DEFAULT `'draft'`; CHECK `draft\|active\|closed\|cancelled` |
| `start_date` / `end_date` | `date` nullable; CHECK end ≥ start when both set |
| `quota` | `integer` nullable; ≥ 0 |
| `min_age` / `max_age` | `integer` nullable; ≥ 0; max ≥ min |
| `required_resident_type` | `text` NOT NULL DEFAULT `'any'`; CHECK `any\|saudi\|non_saudi\|unknown` |
| `eligibility_notes` | `text` nullable |
| `requires_three_month_warning` | `boolean` NOT NULL DEFAULT `true` |
| `whatsapp_template_ar` / `whatsapp_template_en` | `text` nullable |
| `notes` | `text` nullable (operational) |
| `created_by` / `updated_by` | `uuid` → `profiles(id)` nullable |
| `created_at` / `updated_at` | `timestamptz` NOT NULL, default `now()` |
| `deleted_at` | `timestamptz` nullable (soft-delete foundation only) |

**Expected absences on `projects`:**

- no financial columns (`price_*`, payment, settlement, wage, due amount, etc.);
- no Projects CRUD RPCs in source;
- no UPDATE/DELETE RLS policies on `projects` (direct client UPDATE denied by design).

### 6.2 Triggers / consistency (expected from source)

| Object | Source expectation |
|---|---|
| `trg_projects_updated_at` | BEFORE UPDATE → `set_updated_at()` |
| `trg_projects_account_consistency` | BEFORE INSERT OR UPDATE → `check_project_account_consistency()` |
| `check_project_account_consistency()` | SECURITY DEFINER; fail-closed if company missing or account mismatch |
| Soft-deleted company rejection | **Not proven in source** — function checks company existence/account match only; **does not** reference `companies.deleted_at` in the committed body. Live packet must confirm and flag. |

### 6.3 Index (expected after Companies apply)

| Index | Source expectation |
|---|---|
| `public.idx_projects_account_company_status_live` | `(account_id, company_id, status) WHERE deleted_at IS NULL` from `20260716120000_companies_mvp_schema_rpc.sql` |

Pre-Companies catalog historically reported **no** secondary project indexes; this packet must re-verify live presence after Companies apply.

### 6.4 Policies / ACLs (expected from source + ACL hardening)

| Object | Source expectation |
|---|---|
| `sel_projects` | SELECT TO `authenticated`: Owner + account match + `deleted_at IS NULL` |
| `ins_projects` | INSERT WITH CHECK: account match + **`status = 'draft'`** + non-deleted + created_by rules |
| UPDATE/DELETE policies on `projects` | **Absent** |
| Authenticated table privileges | **SELECT only** (no INSERT/UPDATE/DELETE/TRUNCATE/…) |
| `anon` / `service_role` | No relation privileges on `projects` |

### 6.5 `public.project_financial_settings` (finance separation)

| Expectation | Source |
|---|---|
| Separate table from `projects` | Core schema design decision |
| Financial columns only here | e.g. `price_per_accepted_form`, settlement fields |
| Owner-only SELECT/INSERT/UPDATE policies | `sel_pfs_owner`, `ins_pfs_owner`, `upd_pfs_owner` |
| Account consistency vs project | `check_pfs_account_consistency` |
| Support Helper | Must **not** gain PFS SELECT via support RPCs |

### 6.6 Existing project-related functions / views (not Projects CRUD)

| Name | Role posture (source) | Purpose |
|---|---|---|
| `support_project_directory(integer,integer)` | SH only | Thin operational directory |
| `support_project_participation_summary(uuid,integer,integer)` | SH only | Participation totals only |
| `support_participation_operational_rows(...)` | SH only | Participation domain (adjacent) |
| `project_operational_summary` | Owner (security_invoker + is_owner filter) | Review-derived operational counts |
| `project_financial_summary` | Owner | Financial — must remain Owner-only |
| `enforce_participation_project_state()` | Non-client; trigger-backed | Participation write gate on active project |

**Projects CRUD names expected absent:**

- `list_projects`, `get_project`, `create_project`, `update_project`, `transition_project_status`
- and close name collisions (e.g. `public` functions whose names match those exact stems)

### 6.7 Product role note (not live DB claim)

- Owner: full operational project management; finance is Owner-only and **out of Projects MVP**.
- Support Helper: may add/edit **non-financial** project details per `docs/roles-permissions.md`; finance-blind.

---

## 7. Packet sections (output contract)

The SQL returns **one result set**. Each row:

| Column | Meaning |
|---|---|
| `section_order` | Integer sort key |
| `section_key` | Stable section id |
| `item_key` | Row identity within section |
| `payload` | `jsonb` object for export |

### Section map

| Order | `section_key` | Contents |
|---|---|---|
| 1 | `A_environment` | PG version, roles, database, schema, timestamp; recorded project ref string |
| 2 | `B_projects_relation` | exists, kind, owner, RLS enabled/forced, ACL text |
| 3 | `B_projects_columns` | name, ordinal, type, nullability, default, identity/generated |
| 4 | `B_projects_constraints` | all constraints + `pg_get_constraintdef` |
| 5 | `B_projects_indexes` | all indexes + definitions; flags for live company/status index |
| 6 | `B_projects_triggers` | non-internal triggers + timing/events/function |
| 7 | `B_projects_trigger_defs` | `pg_get_triggerdef` for each projects trigger |
| 8 | `C_consistency_function` | live consistency function identity, SECURITY, volatility, parallel, `search_path`, EXECUTE ACLs, **full `pg_get_functiondef`** |
| 9 | `C_soft_delete_company_gap` | **heuristic flags only** from definition text — **not** a PASS claim |
| 10 | `C_updated_at_function` | `set_updated_at` identity, SECURITY, `search_path`, grants, full definition |
| 11 | `D_pfs_relation` | `project_financial_settings` relation identity |
| 12 | `D_pfs_columns` | PFS columns (types only; no row data) |
| 13 | `D_pfs_constraints` | PFS constraints |
| 14 | `D_pfs_policies` | PFS RLS policies |
| 15 | `D_pfs_grants` | PFS privileges for anon/authenticated/service_role/postgres |
| 16 | `E_policies_projects` | all RLS policies on `projects` (USING / WITH CHECK) |
| 17 | `E_grants_projects` | privileges for anon/authenticated/service_role/postgres |
| 18 | `F_views_project` | operational + financial summary views; `security_invoker` option; definitions |
| 19 | `G_functions_project_namespace` | project/support/participation-related functions + full definitions |
| 20 | `G_function_execute_acls` | EXECUTE ACLs for selected functions |
| 21 | `H_crud_rpc_absence` | explicit presence/absence rows for each CRUD candidate name |
| 22 | `I_index_live_flag` | dedicated check for `idx_projects_account_company_status_live` |
| 23 | `J_companies_selector_rpcs` | `list_companies` / `get_company` metadata + definitions (no RPC execution) |
| 24 | `K_participation_state_guard` | `enforce_participation_project_state` + attached participation triggers |
| 25 | `Z_packet_meta` | packet id, safety flags, non-claims |

### Consistency-function review questions (controller)

Using **section 8** full definition + **section 9** heuristics only, determine:

| # | Question | How to answer from export |
|---|---|---|
| 1 | Missing Company fails closed? | Definition raises when company row is not found |
| 2 | Cross-account Company fails closed? | Definition requires `NEW.account_id` match company `account_id` |
| 3 | Soft-deleted Company rejected? | Definition must explicitly require non-deleted company; **if not stated, do not mark PASS for this item** |
| 4 | `account_id` state-smuggling blocked? | Trigger runs BEFORE INSERT/UPDATE; mismatch raises exception |
| 5 | `search_path` safely fixed? | `search_path_config` present and non-mutable session-dependent |

**Do not pre-label soft-delete behavior PASS.** Report the exact definition text and apply the table above after the live run.

---

## 8. Expected catalog findings (review checklist)

Use after Mozfer’s export. **Do not treat this document as a completed live PASS.**

### A — Environment

| Check | Expected |
|---|---|
| Dashboard project | Operator confirms `gdegnwglakyblnmxgiwx` |
| PostgreSQL | **17.x** (DEV/DEMO previously recorded 17.6) |
| `current_user` | Typically `postgres` for catalog-wide visibility |
| `current_schema` | Usually `public` |

### B — `projects` table

| Check | Expected (from source) |
|---|---|
| Exists | ordinary table `public.projects` |
| Owner | `postgres` |
| RLS enabled | true |
| RLS forced | may be false |
| Columns | exact set in §6.1; **no financial columns** |
| Status CHECK | includes only `draft`, `active`, `closed`, `cancelled` |
| Domain CHECK | telecom/banking/insurance/product/other |
| Resident CHECK | any/saudi/non_saudi/unknown |
| PK | on `id` |
| FKs | account, company, created_by/updated_by profiles |
| company_id | NOT NULL |

### Indexes

| Check | Expected |
|---|---|
| PK index | present |
| `idx_projects_account_company_status_live` | **Present** after Companies apply: `(account_id, company_id, status) WHERE deleted_at IS NULL` |
| Other secondary indexes | report live; not automatic HOLD |

### Triggers

| Check | Expected |
|---|---|
| updated_at trigger | present → `set_updated_at` |
| account consistency trigger | present → `check_project_account_consistency` |
| Audit trigger on projects | **Absent** in source (confirm live) |

### Consistency function / soft-delete gap

| Check | Expected from source (not a live claim) |
|---|---|
| Function exists | SECURITY DEFINER |
| search_path | fixed (`public` or `pg_catalog, public` class) |
| Client EXECUTE | **false** for PUBLIC/anon/authenticated/service_role (trigger-only) |
| Missing / cross-account company | fail closed in definition |
| Soft-deleted company | **Live unknown until export reviewed.** Source body does not reference `companies.deleted_at`. **Never pre-label soft-delete PASS.** |

### `set_updated_at` (Projects updated_at trigger function)

| Check | Expected from source |
|---|---|
| Attached trigger | Projects BEFORE UPDATE uses `set_updated_at` |
| Definition / SECURITY / search_path / EXECUTE | Return live metadata; client EXECUTE typically false |

### Policies / grants on `projects`

| Check | Expected |
|---|---|
| `sel_projects` | Owner-only + account + non-deleted |
| `ins_projects` | draft-only insert check (policy may exist without INSERT privilege) |
| UPDATE/DELETE policies | **Absent** |
| authenticated | SELECT true; INSERT/UPDATE/DELETE/TRUNCATE false |
| anon / service_role | all checked privileges false |
| postgres | owner/superuser posture (report live) |

### PFS separation

| Check | Expected |
|---|---|
| Relation exists | separate from projects |
| Financial columns | present only on PFS, not on projects |
| Owner policies | SELECT/INSERT/UPDATE Owner-scoped |
| Support SH | no PFS exposure via support function return types |
| `project_financial_summary` | Owner-only; **outside Projects MVP** |
| `project_operational_summary` | Owner-oriented; **must not** become SH product API; accepted/rejected counts may be finance-adjacent |

### Support RPCs / Companies selector / participation guard

| Check | Expected |
|---|---|
| `support_project_directory` | present; SECURITY DEFINER; authenticated EXECUTE only; no finance columns; not full product list API |
| `support_project_participation_summary` | present; totals only |
| `support_participation_operational_rows` | present; finance-blind |
| `list_companies` / `get_company` | present (Companies MVP); authenticated EXECUTE; finance-free definitions |
| `enforce_participation_project_state` | present; non-client; active + non-deleted project gate |
| Projects CRUD RPCs | **Absent** (explicit rows with count 0) |

---

## 9. PASS interpretation

Mark **PASS** when:

1. Operator confirmed project **`gdegnwglakyblnmxgiwx`**.
2. Packet ran read-only with **no** writes and **no** business-row dumps.
3. `public.projects` matches source contract materially (columns, CHECKs, FKs, NOT NULL `company_id`).
4. Status/domain/resident enums match source vocabulary.
5. No financial columns on `projects`.
6. RLS enabled; Owner-only SELECT posture; authenticated SELECT-only privileges; no unexpected client mutation privilege.
7. Consistency function present, SECURITY DEFINER, non-client-callable.
8. PFS is separate and Owner-oriented.
9. Support project functions remain finance-free in signatures/definitions.
10. Projects CRUD candidates are **absent** (or only expected non-CRUD support names).
11. `idx_projects_account_company_status_live` is present with expected columns/predicate **or** its absence is recorded as **WARN** with design impact (should be present post-Companies apply).

**Soft-delete company rejection is not part of automatic PASS.** Controllers must answer review question #3 from the live definition only. If soft-delete is not rejected, classify **WARN** (design must close) when all other PASS criteria hold — never invent a soft-delete PASS.

---

## 10. WARN interpretation

Record **PASS WITH WARN** when mandatory PASS items hold but any of:

1. Soft-deleted Company parent is **not** rejected by consistency function (do **not** call this PASS).
2. Lifecycle status transitions are not enforced beyond CHECK values (expected).
3. Projects CRUD RPCs remain absent (expected before design) — informational WARN only if reviewers need the absence highlighted.
4. Index `idx_projects_account_company_status_live` definition differs cosmetically but still covers live company/status counts.
5. `support_project_directory` is incomplete as a future unified product API (expected; do not reuse as sole list surface).
6. Extra non-financial indexes/comments exist but do not change security.
7. Trigger/function names differ cosmetically but definitions preserve contract.

WARNs must be precise and must **not** hide HOLD conditions.

---

## 11. HOLD conditions (post-run)

Mark **HOLD** (block Projects schema/RPC design) if any:

1. Wrong Supabase project or production target.
2. Material schema mismatch (missing required columns, wrong types/nullability, unexpected financial columns on `projects`).
3. Status/domain/resident vocabulary differs from approved source CHECK sets in a product-breaking way.
4. `company_id` nullable, wrong FK target, or destructive FK action conflicting with product rules.
5. Account/company consistency function missing, invoker-only when it must be definer, open EXECUTE to client roles, or mutable/unsafe `search_path`.
6. Unexpected authenticated/anon/service_role INSERT/UPDATE/DELETE/TRUNCATE (or equivalent) on `projects` or PFS.
7. Support Helper can SELECT PFS or receive pricing/payment fields from support RPCs/views.
8. Unexpected Projects CRUD RPC already present with conflicting shape (collision) without design authority.
9. RLS disabled on `projects` (or forced state that breaks expected isolation without explanation).
10. Packet performed writes or returned business-row dumps (protocol invalid).
11. Results incomplete / unreadable so catalog truth cannot be established.

---

## 12. Evidence-export instructions

After a clean run:

1. Export the full result grid (CSV preferred) labeled:

   ```text
   ZAM-PROJECTS-LIVE-CATALOG-VERIFY-1_gdegnwglakyblnmxgiwx_<date>
   ```

2. Store outside the repository or in Mozfer’s evidence vault (do **not** commit raw dumps containing accidental secrets).
3. Record in the later result-close task: PASS / PASS WITH WARN / HOLD, PostgreSQL version, runner, and key findings.
4. Do not commit SQL Editor exports as migration history.

---

## 13. Explicit non-claims

- No business-row writes.
- No application smoke.
- No production readiness.
- No authorization to implement Projects UI/RPCs until catalog review PASS and subsequent design PASS.
- Static source assumptions in this document are **not** live evidence.

---

## 14. Exact next task after Mozfer runs it

| Outcome | Next task |
|---|---|
| Packet prepared / export delivered | **`ZAM-PROJECTS-LIVE-CATALOG-VERIFY-RUN-1`** (controller review of export) |
| Review **PASS** or **PASS WITH WARN** | `ZAM-PROJECTS-SCHEMA-RPC-DESIGN-1` |
| Review **HOLD** | Narrow recovery / evidence repair (do not design RPCs) |

**Do not** start `ZAM-PROJECTS-SCHEMA-RPC-MIGRATION-1` until design is frozen.
**This document alone does not claim the live catalog was verified.**

---

## 15. Metadata-only SQL packet

```sql
-- =============================================================================
-- ZAM-PROJECTS-LIVE-CATALOG-VERIFY-1
-- Live DEV/DEMO catalog verification packet (metadata only)
-- Operator-confirmed Supabase project ref: gdegnwglakyblnmxgiwx
-- Safety: READ-ONLY catalog inventory. No DML/DDL/GRANT/REVOKE.
-- No business-row SELECT from domain tables.
-- Runner: Mozfer only. DEV/DEMO only. PostgreSQL 17.x.
-- Output: one ordered result set (section_order, section_key, item_key, payload)
--
-- PUBLIC ACL note:
--   PostgreSQL PUBLIC is ACL grantee OID 0 (not a role).
--   Never pass 'PUBLIC'/'public' to has_table_privilege / has_function_privilege.
--   Use aclexplode(COALESCE(relacl/proacl, acldefault(...))) WHERE grantee = 0.
-- =============================================================================

WITH
params AS (
  SELECT
    'gdegnwglakyblnmxgiwx'::text AS supabase_project_ref,
    'ZAM-PROJECTS-LIVE-CATALOG-VERIFY-1'::text AS packet_id,
    ARRAY[
      'list_projects',
      'get_project',
      'create_project',
      'update_project',
      'transition_project_status'
    ]::text[] AS crud_name_candidates
),

-- ---------------------------------------------------------------------------
-- A. Environment identity
-- ---------------------------------------------------------------------------
section_a AS (
  SELECT
    1 AS section_order,
    'A_environment'::text AS section_key,
    'identity'::text AS item_key,
    jsonb_build_object(
      'current_database', current_database(),
      'current_schema', current_schema(),
      'current_user', current_user,
      'session_user', session_user,
      'server_version', current_setting('server_version', true),
      'server_version_num', current_setting('server_version_num', true)::integer,
      'server_timestamp_utc', (now() AT TIME ZONE 'utc'),
      'supabase_project_ref_recorded', (SELECT supabase_project_ref FROM params),
      'note', 'Operator must confirm SQL Editor Dashboard project matches supabase_project_ref_recorded'
    ) AS payload
),

-- ---------------------------------------------------------------------------
-- B. projects relation
-- ---------------------------------------------------------------------------
section_b_relation AS (
  SELECT
    2 AS section_order,
    'B_projects_relation'::text AS section_key,
    'relation'::text AS item_key,
    CASE
      WHEN c.oid IS NULL THEN jsonb_build_object('exists', false, 'regclass', 'public.projects')
      ELSE jsonb_build_object(
        'exists', true,
        'schema', n.nspname,
        'name', c.relname,
        'oid', c.oid,
        'relkind', c.relkind,
        'relkind_label', CASE c.relkind
          WHEN 'r' THEN 'ordinary_table'
          WHEN 'p' THEN 'partitioned_table'
          WHEN 'v' THEN 'view'
          WHEN 'm' THEN 'materialized_view'
          ELSE c.relkind::text
        END,
        'owner', pg_catalog.pg_get_userbyid(c.relowner),
        'rls_enabled', c.relrowsecurity,
        'rls_forced', c.relforcerowsecurity,
        'relacl', c.relacl::text
      )
    END AS payload
  FROM (SELECT 1) AS seed
  LEFT JOIN pg_catalog.pg_class AS c
    ON c.oid = to_regclass('public.projects')
  LEFT JOIN pg_catalog.pg_namespace AS n
    ON n.oid = c.relnamespace
),

section_b_columns AS (
  SELECT
    3 AS section_order,
    'B_projects_columns'::text AS section_key,
    a.attname AS item_key,
    jsonb_build_object(
      'column_name', a.attname,
      'ordinal_position', a.attnum,
      'data_type', pg_catalog.format_type(a.atttypid, a.atttypmod),
      'udt_name', t.typname,
      'not_null', a.attnotnull,
      'default_expr', pg_catalog.pg_get_expr(ad.adbin, ad.adrelid),
      'is_identity', CASE WHEN a.attidentity = '' THEN false ELSE true END,
      'identity_kind', NULLIF(a.attidentity, ''),
      'is_generated', CASE WHEN a.attgenerated = '' THEN false ELSE true END,
      'generated_kind', NULLIF(a.attgenerated, ''),
      'is_dropped', a.attisdropped
    ) AS payload
  FROM pg_catalog.pg_attribute AS a
  JOIN pg_catalog.pg_class AS c
    ON c.oid = a.attrelid
  JOIN pg_catalog.pg_namespace AS n
    ON n.oid = c.relnamespace
  JOIN pg_catalog.pg_type AS t
    ON t.oid = a.atttypid
  LEFT JOIN pg_catalog.pg_attrdef AS ad
    ON ad.adrelid = a.attrelid
   AND ad.adnum = a.attnum
  WHERE n.nspname = 'public'
    AND c.relname = 'projects'
    AND a.attnum > 0
    AND NOT a.attisdropped
),

section_b_constraints AS (
  SELECT
    4 AS section_order,
    'B_projects_constraints'::text AS section_key,
    con.conname AS item_key,
    jsonb_build_object(
      'constraint_name', con.conname,
      'constraint_type', con.contype,
      'constraint_type_label', CASE con.contype
        WHEN 'p' THEN 'primary_key'
        WHEN 'u' THEN 'unique'
        WHEN 'c' THEN 'check'
        WHEN 'f' THEN 'foreign_key'
        WHEN 'x' THEN 'exclusion'
        ELSE con.contype::text
      END,
      'definition', pg_catalog.pg_get_constraintdef(con.oid, true),
      'convalidated', con.convalidated,
      'condeferrable', con.condeferrable,
      'condeferred', con.condeferred,
      'fk_update_action', CASE con.confupdtype
        WHEN 'a' THEN 'no_action'
        WHEN 'r' THEN 'restrict'
        WHEN 'c' THEN 'cascade'
        WHEN 'n' THEN 'set_null'
        WHEN 'd' THEN 'set_default'
        ELSE NULL
      END,
      'fk_delete_action', CASE con.confdeltype
        WHEN 'a' THEN 'no_action'
        WHEN 'r' THEN 'restrict'
        WHEN 'c' THEN 'cascade'
        WHEN 'n' THEN 'set_null'
        WHEN 'd' THEN 'set_default'
        ELSE NULL
      END,
      'foreign_table', CASE
        WHEN con.contype = 'f' THEN (
          SELECT n2.nspname || '.' || c2.relname
          FROM pg_catalog.pg_class AS c2
          JOIN pg_catalog.pg_namespace AS n2 ON n2.oid = c2.relnamespace
          WHERE c2.oid = con.confrelid
        )
        ELSE NULL
      END
    ) AS payload
  FROM pg_catalog.pg_constraint AS con
  JOIN pg_catalog.pg_class AS c
    ON c.oid = con.conrelid
  JOIN pg_catalog.pg_namespace AS n
    ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'projects'
),

section_b_indexes AS (
  SELECT
    5 AS section_order,
    'B_projects_indexes'::text AS section_key,
    i.relname AS item_key,
    jsonb_build_object(
      'schema', n.nspname,
      'table', t.relname,
      'index_name', i.relname,
      'is_unique', ix.indisunique,
      'is_primary', ix.indisprimary,
      'is_valid', ix.indisvalid,
      'is_ready', ix.indisready,
      'definition', pg_catalog.pg_get_indexdef(ix.indexrelid),
      'is_live_company_status_index',
        (i.relname = 'idx_projects_account_company_status_live'),
      'columns', (
        SELECT jsonb_agg(a.attname ORDER BY ord.ordinality)
        FROM unnest(ix.indkey) WITH ORDINALITY AS ord(attnum, ordinality)
        JOIN pg_catalog.pg_attribute AS a
          ON a.attrelid = ix.indrelid
         AND a.attnum = ord.attnum
      )
    ) AS payload
  FROM pg_catalog.pg_index AS ix
  JOIN pg_catalog.pg_class AS t
    ON t.oid = ix.indrelid
  JOIN pg_catalog.pg_namespace AS n
    ON n.oid = t.relnamespace
  JOIN pg_catalog.pg_class AS i
    ON i.oid = ix.indexrelid
  WHERE n.nspname = 'public'
    AND t.relname = 'projects'
),

section_b_triggers AS (
  SELECT
    6 AS section_order,
    'B_projects_triggers'::text AS section_key,
    tr.tgname AS item_key,
    jsonb_build_object(
      'trigger_name', tr.tgname,
      'enabled', tr.tgenabled,
      'timing', CASE
        WHEN (tr.tgtype & 2) = 2 THEN 'BEFORE'
        WHEN (tr.tgtype & 64) = 64 THEN 'INSTEAD OF'
        ELSE 'AFTER'
      END,
      'events', concat_ws(
        ',',
        CASE WHEN (tr.tgtype & 4) = 4 THEN 'INSERT' END,
        CASE WHEN (tr.tgtype & 8) = 8 THEN 'DELETE' END,
        CASE WHEN (tr.tgtype & 16) = 16 THEN 'UPDATE' END,
        CASE WHEN (tr.tgtype & 32) = 32 THEN 'TRUNCATE' END
      ),
      'level', CASE WHEN (tr.tgtype & 1) = 1 THEN 'ROW' ELSE 'STATEMENT' END,
      'function_schema', pn.nspname,
      'function_name', p.proname,
      'function_identity_args', pg_catalog.pg_get_function_identity_arguments(p.oid),
      'tgdeferrable', tr.tgdeferrable,
      'tginitdeferred', tr.tginitdeferred
    ) AS payload
  FROM pg_catalog.pg_trigger AS tr
  JOIN pg_catalog.pg_class AS c
    ON c.oid = tr.tgrelid
  JOIN pg_catalog.pg_namespace AS n
    ON n.oid = c.relnamespace
  JOIN pg_catalog.pg_proc AS p
    ON p.oid = tr.tgfoid
  JOIN pg_catalog.pg_namespace AS pn
    ON pn.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'projects'
    AND NOT tr.tgisinternal
),

section_b_trigger_defs AS (
  SELECT
    7 AS section_order,
    'B_projects_trigger_defs'::text AS section_key,
    tr.tgname AS item_key,
    jsonb_build_object(
      'trigger_name', tr.tgname,
      'definition', pg_catalog.pg_get_triggerdef(tr.oid, true)
    ) AS payload
  FROM pg_catalog.pg_trigger AS tr
  JOIN pg_catalog.pg_class AS c
    ON c.oid = tr.tgrelid
  JOIN pg_catalog.pg_namespace AS n
    ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'projects'
    AND NOT tr.tgisinternal
),

-- ---------------------------------------------------------------------------
-- C. Account/company consistency function + soft-delete gap flags
-- ---------------------------------------------------------------------------
section_c_consistency AS (
  SELECT
    8 AS section_order,
    'C_consistency_function'::text AS section_key,
    pn.nspname || '.' || p.proname || '(' || pg_catalog.pg_get_function_identity_arguments(p.oid) || ')' AS item_key,
    jsonb_build_object(
      'function_schema', pn.nspname,
      'function_name', p.proname,
      'identity_arguments', pg_catalog.pg_get_function_identity_arguments(p.oid),
      'result_type', pg_catalog.pg_get_function_result(p.oid),
      'owner', pg_catalog.pg_get_userbyid(p.proowner),
      'language', l.lanname,
      'prosecdef', p.prosecdef,
      'security', CASE WHEN p.prosecdef THEN 'DEFINER' ELSE 'INVOKER' END,
      'provolatile', p.provolatile,
      'volatility', CASE p.provolatile
        WHEN 'i' THEN 'IMMUTABLE'
        WHEN 's' THEN 'STABLE'
        WHEN 'v' THEN 'VOLATILE'
        ELSE p.provolatile::text
      END,
      'proparallel', p.proparallel,
      'parallel_safety', CASE p.proparallel
        WHEN 's' THEN 'SAFE'
        WHEN 'r' THEN 'RESTRICTED'
        WHEN 'u' THEN 'UNSAFE'
        ELSE p.proparallel::text
      END,
      'proconfig', p.proconfig,
      'search_path_config', (
        SELECT cfg
        FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
        WHERE cfg LIKE 'search_path=%'
        LIMIT 1
      ),
      -- PUBLIC is ACL grantee OID 0; never pass role name 'PUBLIC'/'public' to has_*_privilege
      'execute_public', (
        SELECT EXISTS (
          SELECT 1
          FROM pg_catalog.aclexplode(
            COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))
          ) AS acl
          WHERE acl.grantee = 0
            AND acl.privilege_type = 'EXECUTE'
        )
      ),
      'execute_anon', has_function_privilege('anon', p.oid, 'EXECUTE'),
      'execute_authenticated', has_function_privilege('authenticated', p.oid, 'EXECUTE'),
      'execute_service_role', has_function_privilege('service_role', p.oid, 'EXECUTE'),
      'definition', pg_catalog.pg_get_functiondef(p.oid)
    ) AS payload
  FROM pg_catalog.pg_proc AS p
  JOIN pg_catalog.pg_namespace AS pn
    ON pn.oid = p.pronamespace
  JOIN pg_catalog.pg_language AS l
    ON l.oid = p.prolang
  WHERE pn.nspname = 'public'
    AND p.proname = 'check_project_account_consistency'
),

section_c_soft_delete_gap AS (
  SELECT
    9 AS section_order,
    'C_soft_delete_company_gap'::text AS section_key,
    'analysis'::text AS item_key,
    CASE
      WHEN p.oid IS NULL THEN jsonb_build_object(
        'function_found', false,
        'note', 'check_project_account_consistency missing — HOLD candidate',
        'soft_delete_company_rejected', null,
        'do_not_pre_label_soft_delete_pass', true
      )
      ELSE jsonb_build_object(
        'function_found', true,
        'do_not_pre_label_soft_delete_pass', true,
        'definition_mentions_deleted_at',
          (pg_catalog.pg_get_functiondef(p.oid) ILIKE '%deleted_at%'),
        'definition_mentions_companies_deleted_at_literal',
          (pg_catalog.pg_get_functiondef(p.oid) ILIKE '%deleted_at%'),
        'heuristic_only', true,
        'review_questions', jsonb_build_array(
          'missing_company_fails_closed',
          'cross_account_company_fails_closed',
          'soft_deleted_company_rejected',
          'account_id_state_smuggling_blocked',
          'search_path_safely_fixed'
        ),
        'interpretation',
          'Answer soft_deleted_company_rejected only from full definition in C_consistency_function. Never mark soft-delete PASS without explicit non-deleted company check in the definition.'
      )
    END AS payload
  FROM (SELECT 1) AS seed
  LEFT JOIN pg_catalog.pg_proc AS p
    ON p.oid = to_regprocedure('public.check_project_account_consistency()')
),

-- G. updated_at function attached to Projects trigger
section_c_updated_at AS (
  SELECT
    10 AS section_order,
    'C_updated_at_function'::text AS section_key,
    pn.nspname || '.' || p.proname || '(' || pg_catalog.pg_get_function_identity_arguments(p.oid) || ')' AS item_key,
    jsonb_build_object(
      'function_schema', pn.nspname,
      'function_name', p.proname,
      'identity_arguments', pg_catalog.pg_get_function_identity_arguments(p.oid),
      'result_type', pg_catalog.pg_get_function_result(p.oid),
      'owner', pg_catalog.pg_get_userbyid(p.proowner),
      'language', l.lanname,
      'prosecdef', p.prosecdef,
      'security', CASE WHEN p.prosecdef THEN 'DEFINER' ELSE 'INVOKER' END,
      'volatility', CASE p.provolatile
        WHEN 'i' THEN 'IMMUTABLE' WHEN 's' THEN 'STABLE' WHEN 'v' THEN 'VOLATILE'
        ELSE p.provolatile::text
      END,
      'proconfig', p.proconfig,
      'search_path_config', (
        SELECT cfg
        FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
        WHERE cfg LIKE 'search_path=%'
        LIMIT 1
      ),
      'execute_public', (
        SELECT EXISTS (
          SELECT 1
          FROM pg_catalog.aclexplode(
            COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))
          ) AS acl
          WHERE acl.grantee = 0
            AND acl.privilege_type = 'EXECUTE'
        )
      ),
      'execute_anon', has_function_privilege('anon', p.oid, 'EXECUTE'),
      'execute_authenticated', has_function_privilege('authenticated', p.oid, 'EXECUTE'),
      'execute_service_role', has_function_privilege('service_role', p.oid, 'EXECUTE'),
      'execute_postgres', has_function_privilege('postgres', p.oid, 'EXECUTE'),
      'attached_to_projects_trigger', EXISTS (
        SELECT 1
        FROM pg_catalog.pg_trigger AS tr
        JOIN pg_catalog.pg_class AS c ON c.oid = tr.tgrelid
        JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = 'projects'
          AND NOT tr.tgisinternal
          AND tr.tgfoid = p.oid
      ),
      'definition', pg_catalog.pg_get_functiondef(p.oid)
    ) AS payload
  FROM pg_catalog.pg_proc AS p
  JOIN pg_catalog.pg_namespace AS pn ON pn.oid = p.pronamespace
  JOIN pg_catalog.pg_language AS l ON l.oid = p.prolang
  WHERE pn.nspname = 'public'
    AND p.proname = 'set_updated_at'
),

-- ---------------------------------------------------------------------------
-- D. project_financial_settings separation
-- ---------------------------------------------------------------------------
section_d_pfs_relation AS (
  SELECT
    11 AS section_order,
    'D_pfs_relation'::text AS section_key,
    'relation'::text AS item_key,
    CASE
      WHEN c.oid IS NULL THEN jsonb_build_object('exists', false, 'regclass', 'public.project_financial_settings')
      ELSE jsonb_build_object(
        'exists', true,
        'schema', n.nspname,
        'name', c.relname,
        'owner', pg_catalog.pg_get_userbyid(c.relowner),
        'relkind', c.relkind,
        'rls_enabled', c.relrowsecurity,
        'rls_forced', c.relforcerowsecurity,
        'relacl', c.relacl::text
      )
    END AS payload
  FROM (SELECT 1) AS seed
  LEFT JOIN pg_catalog.pg_class AS c
    ON c.oid = to_regclass('public.project_financial_settings')
  LEFT JOIN pg_catalog.pg_namespace AS n
    ON n.oid = c.relnamespace
),

section_d_pfs_columns AS (
  SELECT
    12 AS section_order,
    'D_pfs_columns'::text AS section_key,
    a.attname AS item_key,
    jsonb_build_object(
      'column_name', a.attname,
      'ordinal_position', a.attnum,
      'data_type', pg_catalog.format_type(a.atttypid, a.atttypmod),
      'not_null', a.attnotnull,
      'default_expr', pg_catalog.pg_get_expr(ad.adbin, ad.adrelid)
    ) AS payload
  FROM pg_catalog.pg_attribute AS a
  JOIN pg_catalog.pg_class AS c
    ON c.oid = a.attrelid
  JOIN pg_catalog.pg_namespace AS n
    ON n.oid = c.relnamespace
  LEFT JOIN pg_catalog.pg_attrdef AS ad
    ON ad.adrelid = a.attrelid
   AND ad.adnum = a.attnum
  WHERE n.nspname = 'public'
    AND c.relname = 'project_financial_settings'
    AND a.attnum > 0
    AND NOT a.attisdropped
),

section_d_pfs_constraints AS (
  SELECT
    13 AS section_order,
    'D_pfs_constraints'::text AS section_key,
    con.conname AS item_key,
    jsonb_build_object(
      'constraint_name', con.conname,
      'constraint_type', con.contype,
      'definition', pg_catalog.pg_get_constraintdef(con.oid, true),
      'convalidated', con.convalidated
    ) AS payload
  FROM pg_catalog.pg_constraint AS con
  JOIN pg_catalog.pg_class AS c
    ON c.oid = con.conrelid
  JOIN pg_catalog.pg_namespace AS n
    ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'project_financial_settings'
),

section_d_pfs_policies AS (
  SELECT
    14 AS section_order,
    'D_pfs_policies'::text AS section_key,
    pol.polname AS item_key,
    jsonb_build_object(
      'policy_name', pol.polname,
      'command', pol.polcmd,
      'command_label', CASE pol.polcmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
        ELSE pol.polcmd::text
      END,
      'roles', (
        SELECT coalesce(jsonb_agg(pg_catalog.pg_get_userbyid(r.roleid) ORDER BY r.roleid), '[]'::jsonb)
        FROM unnest(pol.polroles) AS r(roleid)
      ),
      'qual', pg_catalog.pg_get_expr(pol.polqual, pol.polrelid),
      'with_check', pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid),
      'permissive', pol.polpermissive
    ) AS payload
  FROM pg_catalog.pg_policy AS pol
  JOIN pg_catalog.pg_class AS c
    ON c.oid = pol.polrelid
  JOIN pg_catalog.pg_namespace AS n
    ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'project_financial_settings'
),

section_d_pfs_grants AS (
  SELECT
    15 AS section_order,
    'D_pfs_grants'::text AS section_key,
    r.rolname || ':' || priv.privilege AS item_key,
    jsonb_build_object(
      'relation', 'public.project_financial_settings',
      'grantee', r.rolname,
      'privilege', priv.privilege,
      'has_privilege', CASE
        WHEN rel.oid IS NULL THEN NULL
        WHEN r.rolname = 'PUBLIC' THEN EXISTS (
          SELECT 1
          FROM pg_catalog.aclexplode(
            COALESCE(rel.relacl, pg_catalog.acldefault('r', rel.relowner))
          ) AS acl
          WHERE acl.grantee = 0
            AND acl.privilege_type = priv.privilege
        )
        ELSE has_table_privilege(r.rolname, rel.oid, priv.privilege)
      END
    ) AS payload
  FROM (VALUES
    ('PUBLIC'),
    ('anon'),
    ('authenticated'),
    ('service_role'),
    ('postgres')
  ) AS r(rolname)
  CROSS JOIN (VALUES
    ('SELECT'),
    ('INSERT'),
    ('UPDATE'),
    ('DELETE'),
    ('TRUNCATE'),
    ('REFERENCES'),
    ('TRIGGER')
  ) AS priv(privilege)
  LEFT JOIN pg_catalog.pg_class AS rel
    ON rel.oid = to_regclass('public.project_financial_settings')
),

-- ---------------------------------------------------------------------------
-- E. projects policies + grants
-- ---------------------------------------------------------------------------
section_e_policies AS (
  SELECT
    16 AS section_order,
    'E_policies_projects'::text AS section_key,
    pol.polname AS item_key,
    jsonb_build_object(
      'policy_name', pol.polname,
      'command', pol.polcmd,
      'command_label', CASE pol.polcmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
        ELSE pol.polcmd::text
      END,
      'roles', (
        SELECT coalesce(jsonb_agg(pg_catalog.pg_get_userbyid(r.roleid) ORDER BY r.roleid), '[]'::jsonb)
        FROM unnest(pol.polroles) AS r(roleid)
      ),
      'qual', pg_catalog.pg_get_expr(pol.polqual, pol.polrelid),
      'with_check', pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid),
      'permissive', pol.polpermissive
    ) AS payload
  FROM pg_catalog.pg_policy AS pol
  JOIN pg_catalog.pg_class AS c
    ON c.oid = pol.polrelid
  JOIN pg_catalog.pg_namespace AS n
    ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'projects'
),

section_e_grants AS (
  SELECT
    17 AS section_order,
    'E_grants_projects'::text AS section_key,
    r.rolname || ':' || priv.privilege AS item_key,
    jsonb_build_object(
      'relation', 'public.projects',
      'grantee', r.rolname,
      'privilege', priv.privilege,
      'has_privilege', CASE
        WHEN rel.oid IS NULL THEN NULL
        WHEN r.rolname = 'PUBLIC' THEN EXISTS (
          SELECT 1
          FROM pg_catalog.aclexplode(
            COALESCE(rel.relacl, pg_catalog.acldefault('r', rel.relowner))
          ) AS acl
          WHERE acl.grantee = 0
            AND acl.privilege_type = priv.privilege
        )
        ELSE has_table_privilege(r.rolname, rel.oid, priv.privilege)
      END
    ) AS payload
  FROM (VALUES
    ('PUBLIC'),
    ('anon'),
    ('authenticated'),
    ('service_role'),
    ('postgres')
  ) AS r(rolname)
  CROSS JOIN (VALUES
    ('SELECT'),
    ('INSERT'),
    ('UPDATE'),
    ('DELETE'),
    ('TRUNCATE'),
    ('REFERENCES'),
    ('TRIGGER')
  ) AS priv(privilege)
  LEFT JOIN pg_catalog.pg_class AS rel
    ON rel.oid = to_regclass('public.projects')
),

-- ---------------------------------------------------------------------------
-- F. Project-related views
-- ---------------------------------------------------------------------------
section_f_views AS (
  SELECT
    18 AS section_order,
    'F_views_project'::text AS section_key,
    c.relname AS item_key,
    jsonb_build_object(
      'schema', n.nspname,
      'name', c.relname,
      'relkind', c.relkind,
      'owner', pg_catalog.pg_get_userbyid(c.relowner),
      'relacl', c.relacl::text,
      'reloptions', c.reloptions,
      'security_invoker_option', (
        SELECT opt
        FROM unnest(COALESCE(c.reloptions, ARRAY[]::text[])) AS opt
        WHERE opt LIKE 'security_invoker%'
        LIMIT 1
      ),
      'select_public', (
        SELECT EXISTS (
          SELECT 1
          FROM pg_catalog.aclexplode(
            COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))
          ) AS acl
          WHERE acl.grantee = 0
            AND acl.privilege_type = 'SELECT'
        )
      ),
      'select_anon', has_table_privilege('anon', c.oid, 'SELECT'),
      'select_authenticated', has_table_privilege('authenticated', c.oid, 'SELECT'),
      'select_service_role', has_table_privilege('service_role', c.oid, 'SELECT'),
      'select_postgres', has_table_privilege('postgres', c.oid, 'SELECT'),
      'definition', pg_catalog.pg_get_viewdef(c.oid, true),
      'review_notes', CASE c.relname
        WHEN 'project_operational_summary' THEN
          'Must not automatically become Support Helper product API; accepted/rejected counts may be finance-adjacent'
        WHEN 'project_financial_summary' THEN
          'Outside Projects MVP; Owner financial surface only'
        ELSE NULL
      END
    ) AS payload
  FROM pg_catalog.pg_class AS c
  JOIN pg_catalog.pg_namespace AS n
    ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('v', 'm')
    AND c.relname IN (
      'project_operational_summary',
      'project_financial_summary'
    )
),

-- ---------------------------------------------------------------------------
-- G. Project / support function namespace + EXECUTE ACLs
-- ---------------------------------------------------------------------------
section_g_functions AS (
  SELECT
    19 AS section_order,
    'G_functions_project_namespace'::text AS section_key,
    pn.nspname || '.' || p.proname || '(' || pg_catalog.pg_get_function_identity_arguments(p.oid) || ')' AS item_key,
    jsonb_build_object(
      'function_schema', pn.nspname,
      'function_name', p.proname,
      'identity_arguments', pg_catalog.pg_get_function_identity_arguments(p.oid),
      'result_type', pg_catalog.pg_get_function_result(p.oid),
      'owner', pg_catalog.pg_get_userbyid(p.proowner),
      'language', l.lanname,
      'prosecdef', p.prosecdef,
      'security', CASE WHEN p.prosecdef THEN 'DEFINER' ELSE 'INVOKER' END,
      'volatility', CASE p.provolatile
        WHEN 'i' THEN 'IMMUTABLE'
        WHEN 's' THEN 'STABLE'
        WHEN 'v' THEN 'VOLATILE'
        ELSE p.provolatile::text
      END,
      'parallel_safety', CASE p.proparallel
        WHEN 's' THEN 'SAFE'
        WHEN 'r' THEN 'RESTRICTED'
        WHEN 'u' THEN 'UNSAFE'
        ELSE p.proparallel::text
      END,
      'proconfig', p.proconfig,
      'search_path_config', (
        SELECT cfg
        FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
        WHERE cfg LIKE 'search_path=%'
        LIMIT 1
      ),
      'definition', pg_catalog.pg_get_functiondef(p.oid)
    ) AS payload
  FROM pg_catalog.pg_proc AS p
  JOIN pg_catalog.pg_namespace AS pn
    ON pn.oid = p.pronamespace
  JOIN pg_catalog.pg_language AS l
    ON l.oid = p.prolang
  WHERE pn.nspname = 'public'
    AND (
      p.proname IN (
        'check_project_account_consistency',
        'check_pfs_account_consistency',
        'support_project_directory',
        'support_project_participation_summary',
        'support_participation_operational_rows',
        'support_profile_directory',
        'enforce_participation_project_state',
        'is_owner',
        'is_support_helper',
        'current_account_id',
        'current_profile_id',
        'current_profile_role',
        'current_account_matches',
        'current_profile_matches',
        'set_updated_at'
      )
      OR p.proname LIKE '%project%'
      OR p.proname LIKE 'list_project%'
      OR p.proname LIKE 'get_project%'
      OR p.proname LIKE 'create_project%'
      OR p.proname LIKE 'update_project%'
      OR p.proname LIKE 'transition_project%'
    )
),

section_g_execute_acls AS (
  SELECT
    20 AS section_order,
    'G_function_execute_acls'::text AS section_key,
    pn.nspname || '.' || p.proname || '(' || pg_catalog.pg_get_function_identity_arguments(p.oid) || '):' || r.rolname AS item_key,
    jsonb_build_object(
      'function_schema', pn.nspname,
      'function_name', p.proname,
      'identity_arguments', pg_catalog.pg_get_function_identity_arguments(p.oid),
      'grantee', r.rolname,
      'execute', CASE
        WHEN r.rolname = 'PUBLIC' THEN EXISTS (
          SELECT 1
          FROM pg_catalog.aclexplode(
            COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))
          ) AS acl
          WHERE acl.grantee = 0
            AND acl.privilege_type = 'EXECUTE'
        )
        ELSE has_function_privilege(r.rolname, p.oid, 'EXECUTE')
      END
    ) AS payload
  FROM pg_catalog.pg_proc AS p
  JOIN pg_catalog.pg_namespace AS pn
    ON pn.oid = p.pronamespace
  CROSS JOIN (VALUES
    ('PUBLIC'),
    ('anon'),
    ('authenticated'),
    ('service_role'),
    ('postgres')
  ) AS r(rolname)
  WHERE pn.nspname = 'public'
    AND p.proname IN (
      'check_project_account_consistency',
      'check_pfs_account_consistency',
      'support_project_directory',
      'support_project_participation_summary',
      'support_participation_operational_rows',
      'enforce_participation_project_state',
      'set_updated_at',
      'list_companies',
      'get_company',
      'list_projects',
      'get_project',
      'create_project',
      'update_project',
      'transition_project_status'
    )
),

-- ---------------------------------------------------------------------------
-- H. Projects CRUD RPC absence (one explicit row per candidate)
-- ---------------------------------------------------------------------------
section_h_crud_absence AS (
  SELECT
    21 AS section_order,
    'H_crud_rpc_absence'::text AS section_key,
    cand.fname AS item_key,
    jsonb_build_object(
      'candidate_name', cand.fname,
      'present', (
        SELECT EXISTS (
          SELECT 1
          FROM pg_catalog.pg_proc AS p
          JOIN pg_catalog.pg_namespace AS pn ON pn.oid = p.pronamespace
          WHERE pn.nspname = 'public'
            AND p.proname = cand.fname
        )
      ),
      'public_function_count', (
        SELECT count(*)::integer
        FROM pg_catalog.pg_proc AS p
        JOIN pg_catalog.pg_namespace AS pn ON pn.oid = p.pronamespace
        WHERE pn.nspname = 'public'
          AND p.proname = cand.fname
      ),
      'matches', (
        SELECT coalesce(
          jsonb_agg(
            jsonb_build_object(
              'identity_arguments', pg_catalog.pg_get_function_identity_arguments(p.oid),
              'result_type', pg_catalog.pg_get_function_result(p.oid),
              'security', CASE WHEN p.prosecdef THEN 'DEFINER' ELSE 'INVOKER' END,
              'search_path_config', (
                SELECT cfg
                FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
                WHERE cfg LIKE 'search_path=%'
                LIMIT 1
              ),
              'execute_authenticated', has_function_privilege('authenticated', p.oid, 'EXECUTE'),
              'execute_anon', has_function_privilege('anon', p.oid, 'EXECUTE'),
              'execute_service_role', has_function_privilege('service_role', p.oid, 'EXECUTE')
            )
            ORDER BY pg_catalog.pg_get_function_identity_arguments(p.oid)
          ),
          '[]'::jsonb
        )
        FROM pg_catalog.pg_proc AS p
        JOIN pg_catalog.pg_namespace AS pn ON pn.oid = p.pronamespace
        WHERE pn.nspname = 'public'
          AND p.proname = cand.fname
      ),
      'absence_representation',
        'present=false and public_function_count=0 means the exact function name was not found in public',
      'expected_for_mvp_gate', 'absent'
    ) AS payload
  FROM params AS par
  CROSS JOIN LATERAL unnest(par.crud_name_candidates) AS cand(fname)
),

-- ---------------------------------------------------------------------------
-- I. Dedicated live index flag
-- ---------------------------------------------------------------------------
section_i_index_flag AS (
  SELECT
    22 AS section_order,
    'I_index_live_flag'::text AS section_key,
    'idx_projects_account_company_status_live'::text AS item_key,
    jsonb_build_object(
      'index_name', 'idx_projects_account_company_status_live',
      'exists', (
        SELECT EXISTS (
          SELECT 1
          FROM pg_catalog.pg_class AS i
          JOIN pg_catalog.pg_namespace AS n ON n.oid = i.relnamespace
          JOIN pg_catalog.pg_index AS ix ON ix.indexrelid = i.oid
          JOIN pg_catalog.pg_class AS t ON t.oid = ix.indrelid
          WHERE n.nspname = 'public'
            AND t.relname = 'projects'
            AND i.relname = 'idx_projects_account_company_status_live'
        )
      ),
      'definition', (
        SELECT pg_catalog.pg_get_indexdef(ix.indexrelid)
        FROM pg_catalog.pg_class AS i
        JOIN pg_catalog.pg_namespace AS n ON n.oid = i.relnamespace
        JOIN pg_catalog.pg_index AS ix ON ix.indexrelid = i.oid
        JOIN pg_catalog.pg_class AS t ON t.oid = ix.indrelid
        WHERE n.nspname = 'public'
          AND t.relname = 'projects'
          AND i.relname = 'idx_projects_account_company_status_live'
        LIMIT 1
      ),
      'source_expectation',
        'CREATE INDEX ... ON public.projects (account_id, company_id, status) WHERE deleted_at IS NULL'
    ) AS payload
),

-- ---------------------------------------------------------------------------
-- J. Companies selector RPCs (metadata only; do not execute)
-- ---------------------------------------------------------------------------
section_j_companies_selector AS (
  SELECT
    23 AS section_order,
    'J_companies_selector_rpcs'::text AS section_key,
    pn.nspname || '.' || p.proname || '(' || pg_catalog.pg_get_function_identity_arguments(p.oid) || ')' AS item_key,
    jsonb_build_object(
      'function_schema', pn.nspname,
      'function_name', p.proname,
      'identity_arguments', pg_catalog.pg_get_function_identity_arguments(p.oid),
      'result_type', pg_catalog.pg_get_function_result(p.oid),
      'owner', pg_catalog.pg_get_userbyid(p.proowner),
      'prosecdef', p.prosecdef,
      'security', CASE WHEN p.prosecdef THEN 'DEFINER' ELSE 'INVOKER' END,
      'volatility', CASE p.provolatile
        WHEN 'i' THEN 'IMMUTABLE' WHEN 's' THEN 'STABLE' WHEN 'v' THEN 'VOLATILE'
        ELSE p.provolatile::text
      END,
      'search_path_config', (
        SELECT cfg
        FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
        WHERE cfg LIKE 'search_path=%'
        LIMIT 1
      ),
      'execute_public', (
        SELECT EXISTS (
          SELECT 1
          FROM pg_catalog.aclexplode(
            COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))
          ) AS acl
          WHERE acl.grantee = 0
            AND acl.privilege_type = 'EXECUTE'
        )
      ),
      'execute_anon', has_function_privilege('anon', p.oid, 'EXECUTE'),
      'execute_authenticated', has_function_privilege('authenticated', p.oid, 'EXECUTE'),
      'execute_service_role', has_function_privilege('service_role', p.oid, 'EXECUTE'),
      'definition', pg_catalog.pg_get_functiondef(p.oid),
      'review_notes',
        'Inspect definition for owner/support access checks, active-only companies, and absence of financial fields. Do not EXECUTE the RPC in this gate.'
    ) AS payload
  FROM pg_catalog.pg_proc AS p
  JOIN pg_catalog.pg_namespace AS pn ON pn.oid = p.pronamespace
  WHERE pn.nspname = 'public'
    AND p.proname IN ('list_companies', 'get_company')
),

section_j_companies_selector_absence AS (
  SELECT
    23 AS section_order,
    'J_companies_selector_rpcs'::text AS section_key,
    cand.fname AS item_key,
    jsonb_build_object(
      'function_name', cand.fname,
      'present', EXISTS (
        SELECT 1
        FROM pg_catalog.pg_proc AS p
        JOIN pg_catalog.pg_namespace AS pn ON pn.oid = p.pronamespace
        WHERE pn.nspname = 'public' AND p.proname = cand.fname
      ),
      'note', 'Explicit absence/presence marker for Companies selector dependency'
    ) AS payload
  FROM (VALUES ('list_companies'), ('get_company')) AS cand(fname)
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc AS p
    JOIN pg_catalog.pg_namespace AS pn ON pn.oid = p.pronamespace
    WHERE pn.nspname = 'public' AND p.proname = cand.fname
  )
),

-- ---------------------------------------------------------------------------
-- K. Participation project-state guard (metadata only; no writes)
-- ---------------------------------------------------------------------------
section_k_participation_guard AS (
  SELECT
    24 AS section_order,
    'K_participation_state_guard'::text AS section_key,
    pn.nspname || '.' || p.proname || '(' || pg_catalog.pg_get_function_identity_arguments(p.oid) || ')' AS item_key,
    jsonb_build_object(
      'function_schema', pn.nspname,
      'function_name', p.proname,
      'identity_arguments', pg_catalog.pg_get_function_identity_arguments(p.oid),
      'result_type', pg_catalog.pg_get_function_result(p.oid),
      'owner', pg_catalog.pg_get_userbyid(p.proowner),
      'prosecdef', p.prosecdef,
      'security', CASE WHEN p.prosecdef THEN 'DEFINER' ELSE 'INVOKER' END,
      'volatility', CASE p.provolatile
        WHEN 'i' THEN 'IMMUTABLE' WHEN 's' THEN 'STABLE' WHEN 'v' THEN 'VOLATILE'
        ELSE p.provolatile::text
      END,
      'search_path_config', (
        SELECT cfg
        FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
        WHERE cfg LIKE 'search_path=%'
        LIMIT 1
      ),
      'execute_public', (
        SELECT EXISTS (
          SELECT 1
          FROM pg_catalog.aclexplode(
            COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))
          ) AS acl
          WHERE acl.grantee = 0
            AND acl.privilege_type = 'EXECUTE'
        )
      ),
      'execute_anon', has_function_privilege('anon', p.oid, 'EXECUTE'),
      'execute_authenticated', has_function_privilege('authenticated', p.oid, 'EXECUTE'),
      'execute_service_role', has_function_privilege('service_role', p.oid, 'EXECUTE'),
      'definition', pg_catalog.pg_get_functiondef(p.oid),
      'review_notes',
        'Verify participation writes require active and non-deleted projects; no participation DML in this packet'
    ) AS payload
  FROM pg_catalog.pg_proc AS p
  JOIN pg_catalog.pg_namespace AS pn ON pn.oid = p.pronamespace
  WHERE pn.nspname = 'public'
    AND p.proname = 'enforce_participation_project_state'
),

section_k_participation_triggers AS (
  SELECT
    24 AS section_order,
    'K_participation_state_guard'::text AS section_key,
    'trigger:' || tr.tgname AS item_key,
    jsonb_build_object(
      'table_schema', n.nspname,
      'table_name', c.relname,
      'trigger_name', tr.tgname,
      'enabled', tr.tgenabled,
      'function_schema', pn.nspname,
      'function_name', p.proname,
      'definition', pg_catalog.pg_get_triggerdef(tr.oid, true)
    ) AS payload
  FROM pg_catalog.pg_trigger AS tr
  JOIN pg_catalog.pg_class AS c ON c.oid = tr.tgrelid
  JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
  JOIN pg_catalog.pg_proc AS p ON p.oid = tr.tgfoid
  JOIN pg_catalog.pg_namespace AS pn ON pn.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'participations'
    AND NOT tr.tgisinternal
    AND p.proname = 'enforce_participation_project_state'
),

-- ---------------------------------------------------------------------------
-- Z. Packet meta
-- ---------------------------------------------------------------------------
section_z AS (
  SELECT
    25 AS section_order,
    'Z_packet_meta'::text AS section_key,
    'meta'::text AS item_key,
    jsonb_build_object(
      'packet_id', (SELECT packet_id FROM params),
      'supabase_project_ref_recorded', (SELECT supabase_project_ref FROM params),
      'read_only', true,
      'business_row_selects', false,
      'ddl_dml', false,
      'application_smoke', false,
      'production_readiness_claimed', false,
      'live_catalog_verified_claimed', false,
      'soft_delete_company_pass_claimed', false,
      'next_task_after_export', 'ZAM-PROJECTS-LIVE-CATALOG-VERIFY-RUN-1',
      'next_task_if_review_pass', 'ZAM-PROJECTS-SCHEMA-RPC-DESIGN-1',
      'notes', ARRAY[
        'Metadata/catalog only',
        'Do not pre-label soft-deleted company rejection as PASS',
        'Do not treat support_project_directory as full Projects list API',
        'project_financial_summary is outside Projects MVP',
        'Do not EXECUTE list_companies/get_company in this gate',
        'PUBLIC ACL uses grantee OID 0 via aclexplode; never has_*_privilege role name PUBLIC'
      ]
    ) AS payload
)

SELECT section_order, section_key, item_key, payload
FROM section_a
UNION ALL SELECT * FROM section_b_relation
UNION ALL SELECT * FROM section_b_columns
UNION ALL SELECT * FROM section_b_constraints
UNION ALL SELECT * FROM section_b_indexes
UNION ALL SELECT * FROM section_b_triggers
UNION ALL SELECT * FROM section_b_trigger_defs
UNION ALL SELECT * FROM section_c_consistency
UNION ALL SELECT * FROM section_c_soft_delete_gap
UNION ALL SELECT * FROM section_c_updated_at
UNION ALL SELECT * FROM section_d_pfs_relation
UNION ALL SELECT * FROM section_d_pfs_columns
UNION ALL SELECT * FROM section_d_pfs_constraints
UNION ALL SELECT * FROM section_d_pfs_policies
UNION ALL SELECT * FROM section_d_pfs_grants
UNION ALL SELECT * FROM section_e_policies
UNION ALL SELECT * FROM section_e_grants
UNION ALL SELECT * FROM section_f_views
UNION ALL SELECT * FROM section_g_functions
UNION ALL SELECT * FROM section_g_execute_acls
UNION ALL SELECT * FROM section_h_crud_absence
UNION ALL SELECT * FROM section_i_index_flag
UNION ALL SELECT * FROM section_j_companies_selector
UNION ALL SELECT * FROM section_j_companies_selector_absence
UNION ALL SELECT * FROM section_k_participation_guard
UNION ALL SELECT * FROM section_k_participation_triggers
UNION ALL SELECT * FROM section_z
ORDER BY section_order, item_key;
```

---

## 16. Source migration references (static)

| Migration | Relevance |
|---|---|
| `supabase/migrations/202607060001_zamblak_core_schema.sql` | `projects`, PFS, CHECKs, consistency trigger, base policies |
| `supabase/migrations/202607130001_participation_project_state_guard.sql` | active-project participation guard |
| `supabase/migrations/202607130002_role_safe_read_surfaces.sql` | Owner SELECT, support project RPCs, views, hardened policies |
| `supabase/migrations/20260715120000_harden_core_acl_defaults.sql` | authenticated SELECT-only on core tables |
| `supabase/migrations/20260716120000_companies_mvp_schema_rpc.sql` | `idx_projects_account_company_status_live` |

---

## 17. After Mozfer run (template for later result-close)

| Field | Value |
|---|---|
| Runner | Mozfer |
| Project | `gdegnwglakyblnmxgiwx` |
| Decision | _pending_ |
| PG version | _from export_ |
| Soft-delete company gap | _from sections C_consistency + C_soft_delete — never pre-label PASS_ |
| Live company/status index | _from section I_ |
| CRUD RPC absence | _from section H (`present` / count)_ |
| Companies selector RPCs | _from section J_ |
| Participation guard | _from section K_ |
| Next task after export | `ZAM-PROJECTS-LIVE-CATALOG-VERIFY-RUN-1` |
| Next after review PASS | `ZAM-PROJECTS-SCHEMA-RPC-DESIGN-1` |
