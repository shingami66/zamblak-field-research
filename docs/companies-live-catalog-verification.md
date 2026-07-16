# Companies live DEV/DEMO catalog verification gate

- **Task family:** `ZAM-COMPANIES-001-LIVE-CATALOG-VERIFY` / deferred register `DWR-COMP-026`
- **Packet status:** **manually executed** (Mozfer) and **review PASS** on designated DEV/DEMO
- **Gate decision:** **PASS** — `DWR-COMP-026` **closed**
- **Designated DEV/DEMO project ref:** `gdegnwglakyblnmxgiwx`
- **Live PostgreSQL:** 17.6 (`server_version_num` 170006); session `current_user` / `session_user` / `current_database` = `postgres`
- **Authority:** Mozfer-approved Companies MVP contract; committed migrations; Mozfer-reviewed live catalog export (metadata only)

---

## Live run result (reviewed PASS)

| Field | Value |
|---|---|
| **Runner** | Mozfer, Supabase SQL Editor, DEV/DEMO only |
| **Project** | `gdegnwglakyblnmxgiwx` |
| **Run type** | Metadata-only packet from this document |
| **Writes** | None (no DML, DDL, grants, or other writes) |
| **Business rows** | None read |
| **Review** | Human review against PASS/HOLD checklist — **no HOLD condition triggered** |
| **Raw export** | Reviewed as evidence; **not** a repository migration artifact and not committed as SQL history |
| **Companies implementation** | **Not started** (no migration created/applied; no Companies RPC implemented) |
| **Production readiness** | **Not claimed** (DEV/DEMO catalog evidence only) |
| **Next controlled step** | Design recorded in `docs/companies-schema-rpc-design.md`. Next: `ZAM-COMPANIES-SCHEMA-RPC-MIGRATION-1` |

### Live findings summary

**Companies relation**

- `public.companies` ordinary table; owner `postgres`; RLS enabled; RLS forced false.
- Relation ACL: owner full; **authenticated SELECT only**.
- Columns exactly: `id`, `account_id`, `name`, `contact_person`, `phone`, `notes`, `created_by`, `updated_by`, `created_at`, `updated_at`, `deleted_at`.
- **No financial columns.**
- PK `companies_pkey(id)`.
- FKs: `account_id` → `accounts(id)` NO ACTION; `created_by` / `updated_by` → `profiles(id)` NO ACTION.
- Indexes returned: **`companies_pkey` only** (no secondary indexes).
- Trigger: `trg_companies_updated_at` → `set_updated_at()`.
- Companies audit trigger: **absent**.

**Projects contract**

- `projects.company_id` uuid **NOT NULL**.
- FK `projects_company_id_fkey`: `company_id` → `companies(id)`, ON UPDATE/DELETE **NO ACTION**.
- Status vocabulary: `draft`, `active`, `closed`, `cancelled`.
- `trg_projects_account_consistency` present; `check_project_account_consistency()` is **SECURITY DEFINER**, `search_path=public`, fail-closed parent company/account validation, **no client EXECUTE** grants.
- Packet returned **no** matching secondary project indexes on `company_id` / `account_id` / `status` / `deleted_at` — record as **nonblocking design requirement**.

**Policies and privileges**

- `sel_companies`: authenticated, Owner-only, account-scoped, `deleted_at IS NULL`.
- `ins_companies` policy exists, but **direct INSERT is unavailable** because authenticated lacks table INSERT privilege.
- No UPDATE / DELETE / ALL policy on companies.
- Projects: same Owner SELECT posture; insert policies must **not** be treated as direct client mutation authorization.
- Privilege matrix (companies and projects): authenticated **SELECT=true** only; INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER/MAINTAIN=false; PUBLIC/anon/service_role all checked privileges **false**.

**Future enforcement absences (expected)**

- Active normalized-name uniqueness: **absent**
- Name normalization: **absent**
- Phone validation/normalization: **absent**
- Companies audit trigger: **absent**
- No partial or contradictory implementation found

**RPC / helper namespace**

- **No** Companies CRUD RPC name collision.
- Existing support surfaces: `is_support_helper()`, `support_profile_directory(...)`, `support_project_directory(...)`, `support_project_participation_summary(...)`, `support_participation_operational_rows(...)`.
- Support surfaces: SECURITY DEFINER; `search_path=pg_catalog, public`; authenticated EXECUTE only; PUBLIC/anon/service_role EXECUTE false; account-scoped; deleted-row filtered; **no financial return fields**.
- Trigger/account helper functions remain non-client-callable.

**Dependencies**

- Primary relation dependency: `projects_company_id_fkey`.
- Account-consistency trigger/function preserved.
- Support directory/participation RPCs join companies.
- No unexpected Companies views or conflicting mutation functions.

### Nonblocking design requirements (for schema/RPC design)

1. Add DB-authoritative normalized active company-name uniqueness.
2. Add optional phone normalization and validation (digits only; length 8–15; Saudi `05` → `9665`).
3. Design bounded Companies list/detail/create/edit RPCs.
4. Preserve Owner and Support Helper field visibility rules.
5. Add an appropriate project lookup/count index covering company-scoped reads.
6. Do **not** add delete, restore, or lifecycle mutation controls in MVP.
7. Preserve **no** direct client relation mutation.

### HOLD conditions re-checked (none triggered)

No material schema mismatch; no financial columns on companies; no RPC collision; no unexpected client mutation privilege; no missing account isolation; no unsafe callable SECURITY DEFINER surface; no Support Helper financial exposure; no incompatible company/project FK; no partial duplicate-name or phone implementation; correct DEV/DEMO project; no writes or business-row dumps.

---

## Purpose

Reconcile the **live DEV/DEMO catalog** against committed source assumptions **before** any Companies schema/RPC design or implementation.

This packet does **not**:

- start Companies implementation;
- apply migrations;
- invent live results by itself;
- claim production readiness;
- authorize Companies **implementation** without a separate schema/RPC design review PASS.

The packet **was** run and reviewed **PASS** (see Live run result above). Schema/RPC **design** is now the next controlled task; **implementation** remains gated on design approval.

---

## Safety contract (mandatory)

| Rule | Requirement |
|---|---|
| Runner | **Mozfer only**, Supabase SQL Editor on designated DEV/DEMO |
| Environment | **DEV/DEMO only** (`gdegnwglakyblnmxgiwx`) |
| Writes | **None** — no DML, no DDL, no `GRANT`/`REVOKE`, no `CREATE`/`ALTER`/`DROP` |
| Business rows | **None** — no `SELECT` from `public.companies`, `public.projects`, or other domain tables that returns row data |
| Secrets | Do not print connection strings, JWTs, or `.env` values |
| After run | Results must be reviewed before any Companies migration/RPC design task |
| Production | Not authorized; production readiness never claimed from this packet |

The SQL below queries **catalog metadata only** (`pg_catalog`, `information_schema`, privilege helpers). Function bodies may be returned via `pg_get_functiondef` for contract review; that is definition text, not business data.

---

## Documented source assumptions (static; not live evidence)

From committed migrations (primarily `202607060001_zamblak_core_schema.sql`, `202607130002_role_safe_read_surfaces.sql`, `20260715120000_harden_core_acl_defaults.sql`):

### Companies relation (expected from source)

| Column | Expected type / notes |
|---|---|
| `id` | `uuid` PK, default `gen_random_uuid()` |
| `account_id` | `uuid` NOT NULL → `accounts(id)` |
| `name` | `text` NOT NULL |
| `contact_person` | `text` nullable |
| `phone` | `text` nullable |
| `notes` | `text` nullable |
| `created_by` / `updated_by` | `uuid` → `profiles(id)` nullable |
| `created_at` / `updated_at` | `timestamptz` NOT NULL, default `now()` |
| `deleted_at` | `timestamptz` nullable (foundation only) |

**Expected absences (reveal explicitly if missing or present unexpectedly):**

- no DB unique index/constraint on normalized active company name;
- no phone CHECK / normalization trigger;
- no company soft-delete / restore mutation objects;
- no `audit_trg_companies` (audit triggers exist on other tables, not companies in core schema);
- no secondary indexes on `companies` beyond PK (source has no `CREATE INDEX` on companies).

### Projects / company linkage (expected from source)

- `projects.company_id uuid NOT NULL REFERENCES companies(id)` (default FK action unless live differs);
- `projects.status` CHECK: `draft` \| `active` \| `closed` \| `cancelled`;
- account-consistency trigger `trg_projects_account_consistency` → `check_project_account_consistency()`;
- metrics semantics (product): active count = `deleted_at IS NULL AND status = 'active'`; completed section = `status = 'closed'` (label `مكتمل`); draft/cancelled/deleted excluded.

### Policies / ACLs (expected from source + ACL hardening)

- `sel_companies`: SELECT TO `authenticated`, Owner + account match + `deleted_at IS NULL`;
- `ins_companies`: INSERT WITH CHECK account match + `deleted_at IS NULL` + created_by/updated_by rules;
- no UPDATE/DELETE policies on `companies` (direct client UPDATE denied by design);
- post-`ZAM-SEC-ACL-001`: relation privilege posture **authenticated SELECT-only**; `anon` / `service_role` / non-SELECT client privileges **must not** appear on `companies` (or core tables under the same hardening).

### RPC / helper namespace (expected related names)

Existing support RPCs that join companies (not Companies-domain CRUD):

- `support_project_directory`, `support_project_participation_summary`, `support_participation_operational_rows` (and related helpers)

**Approved future Companies RPC names are not implemented.** Packet must flag any existing public function whose name collides with planned Companies surfaces (for example names containing `company` / `companies` CRUD patterns) for design review.

### Approved MVP product contract (future design only)

- Fields: `name`, `contact_person`, `phone`, `notes`
- Roles: `owner`, `support_helper`
- Errors: `duplicate_company_name`, `invalid_company_phone`
- Phone: optional; digits only; length 8–15; Saudi `05` → `9665`
- No delete/restore/status lifecycle in MVP
- Routes: `/companies`, `/companies/new`, `/companies/[id]`, `/companies/[id]/edit`

These product rules are **not** claimed as live DB enforcement until designed and applied after this gate.

---

## Packet sections (output contract)

The SQL returns **one result set** with ordered sections. Each row:

| Column | Meaning |
|---|---|
| `section_order` | Integer sort key (1…) |
| `section_key` | Stable section id |
| `item_key` | Row identity within section (or `*` for single blob) |
| `payload` | `jsonb` object suitable for CSV/JSON export |

### Section map

| Order | `section_key` | Contents |
|---|---|---|
| 1 | `A_environment` | `current_database`, `current_user`, `session_user`, `server_version`, `server_version_num`, fixed project ref string |
| 2 | `B_companies_relation` | relation kind, owner, RLS enabled/forced |
| 3 | `B_companies_columns` | columns: name, type, nullability, default, identity/generated |
| 4 | `B_companies_constraints` | PK, unique, check, FK |
| 5 | `B_companies_indexes` | all indexes including unique |
| 6 | `B_companies_triggers` | trigger name, timing, events, function identity |
| 7 | `B_companies_trigger_functions` | trigger function signatures + SECURITY + search_path + definition |
| 8 | `C_projects_company_contract` | `company_id` column, FKs, delete/update actions, status check, indexes mentioning company/status |
| 9 | `D_policies_companies` | all RLS policies on `companies` |
| 10 | `D_policies_projects` | all RLS policies on `projects` |
| 11 | `D_grants_companies` | ACL matrix for PUBLIC/anon/authenticated/service_role on `companies` |
| 12 | `D_grants_projects` | same for `projects` |
| 13 | `E_functions_namespace` | public functions whose name or body references company/companies/project/support (signatures, owner, security, search_path, EXECUTE ACLs, definition) |
| 14 | `F_normalization_inventory` | explicit presence/absence flags for updated_at, name norm, phone norm, account consistency, audit, duplicate-name enforcement |
| 15 | `G_dependencies` | views/functions/triggers/FKs/policies referencing companies; migration filename hints from comments where present |
| 16 | `Z_packet_meta` | packet id, safety flags, non-claims |

---

## Expected PASS values (post-run review checklist)

Use these when reviewing Mozfer’s result export. **Do not treat this document as a completed live PASS.**

### Environment (`A_environment`)

| Check | Expected |
|---|---|
| Project context | Operator confirms SQL Editor is project `gdegnwglakyblnmxgiwx` |
| `server_version` | PostgreSQL **17.x** (DEV/DEMO previously recorded 17.6) |
| `current_user` / session | Typically `postgres` (or equivalent SQL Editor superuser role) for catalog-wide visibility |

### Companies (`B_*`)

| Check | Expected (from source) |
|---|---|
| Relation exists | `public.companies`, kind ordinary table |
| Owner | `postgres` |
| RLS | enabled (`relrowsecurity` true); forced may be false |
| Columns | Exact set listed in source assumptions (no extra financial columns) |
| PK | on `id` |
| Unique on name | **Absent** (approved uniqueness is future design) |
| Phone constraints | **Absent** |
| Triggers | at least `trg_companies_updated_at` → `set_updated_at` |
| Audit trigger on companies | **Absent** in source (confirm live) |

### Projects (`C_*`)

| Check | Expected |
|---|---|
| `company_id` | NOT NULL, uuid, FK → `companies(id)` |
| Status vocabulary | `draft` / `active` / `closed` / `cancelled` only |
| Account consistency | trigger function present and SECURITY DEFINER with fixed `search_path` |

### Policies / grants (`D_*`)

| Check | Expected |
|---|---|
| `sel_companies` | Owner-only SELECT for non-deleted account rows |
| `ins_companies` | account-scoped INSERT; no open UPDATE/DELETE policies |
| authenticated privileges on `companies` | **SELECT only** |
| anon / service_role on `companies` | **no** table privileges |
| Direct client mutation privilege | INSERT may still be grant-false after ACL hardening even if policy exists — **both** privilege and policy must be reviewed; post-hardening expectation is **no** authenticated INSERT/UPDATE/DELETE/TRUNCATE table privilege |

### Functions (`E_*`)

| Check | Expected |
|---|---|
| Support RPCs | existing four support-safe RPCs remain; finance fields not in support company join outputs |
| Companies CRUD RPCs | **Absent** until designed |
| Name collisions | no unexpected `create_company` / `update_company` / similar without review |
| SECURITY DEFINER | fixed non-mutable `search_path`; no unsafe open grants to PUBLIC/anon |

### Normalization (`F_*`)

| Check | Expected today |
|---|---|
| `updated_at` trigger | **Present** |
| Name normalization / duplicate enforcement | **Absent** (must be designed later) |
| Phone normalization/validation | **Absent** (must be designed later) |
| Project↔company account consistency | **Present** |
| Companies audit trigger | **Absent** |

---

## HOLD conditions (post-run)

Mark the gate **HOLD** (block schema/RPC design) if any of the following appear in results:

1. **Schema differs** from documented source assumptions in a material way (missing required columns, unexpected financial columns on companies, wrong types/nullability).
2. **Existing RPC name collision** with planned Companies create/edit/list/detail surfaces.
3. **Unexpected client mutation privilege** (authenticated/anon/service_role INSERT/UPDATE/DELETE/TRUNCATE/… on `companies` contrary to post-hardening SELECT-only posture, or unexpected broad policies).
4. **Missing account isolation** (companies policies without account boundary; project FK/consistency broken or missing).
5. **Unsafe SECURITY DEFINER** (missing/locked-down `search_path`, PUBLIC/anon EXECUTE on sensitive functions, or functions that would expose financial data to Support Helper).
6. **Financial columns exposed to Support Helper** via support RPC signatures/definitions or views joined for SH.
7. **Incompatible project/company FK behavior** (nullable `company_id`, wrong target, destructive unexpected ON DELETE that conflicts with product rules).
8. **Unverified or contradictory** duplicate-name / phone normalization objects (partial objects that look half-implemented without design authority).
9. Packet was run against the **wrong project**, or results include business-row dumps (protocol violation).
10. Any **write** occurred (DDL/DML) — invalidates the run.

Absence of future MVP constraints (duplicate name unique index, phone check) is **expected today** and is **not** automatic HOLD; it is recorded as design work remaining **after** a clean inventory PASS.

---

## Manual execution instructions (Mozfer)

1. Open Supabase Dashboard for project **`gdegnwglakyblnmxgiwx`** (DEV/DEMO only).
2. Open **SQL Editor**. Confirm you are **not** on a customer production project.
3. Create a new query. Paste the **entire** SQL block from section [Metadata-only SQL packet](#metadata-only-sql-packet) below (from the first `--` header through the final `;`).
4. Run once. Expect a **single** result grid with many rows (`section_order` 1…16).
5. Export results (CSV or copy) and store with this task id for review.
6. Do **not** run any other SQL in the same session for this gate.
7. Do **not** start Companies migrations or implementation from the raw output without a review task PASS.

**Next controlled task after results exist:** result review / evidence record (then schema/RPC design only if PASS).

---

## Metadata-only SQL packet

```sql
-- =============================================================================
-- ZAM-COMPANIES-001 / DWR-COMP-026
-- Live DEV/DEMO catalog verification packet (metadata only)
-- Project ref (operator-confirmed): gdegnwglakyblnmxgiwx
-- Safety: READ-ONLY catalog inventory. No DML/DDL. No business-row SELECT.
-- Runner: Mozfer only. DEV/DEMO only. PostgreSQL 17.x.
-- Output: one ordered result set (section_order, section_key, item_key, payload)
-- =============================================================================

WITH
params AS (
  SELECT
    'gdegnwglakyblnmxgiwx'::text AS supabase_project_ref,
    'ZAM-COMPANIES-001-LIVE-CATALOG-VERIFY'::text AS packet_id,
    'DWR-COMP-026'::text AS deferred_register_id
),

-- ---------------------------------------------------------------------------
-- A. Environment identity (no business tables)
-- ---------------------------------------------------------------------------
section_a AS (
  SELECT
    1 AS section_order,
    'A_environment'::text AS section_key,
    'identity'::text AS item_key,
    jsonb_build_object(
      'current_database', current_database(),
      'current_user', current_user,
      'session_user', session_user,
      'server_version', current_setting('server_version', true),
      'server_version_num', current_setting('server_version_num', true)::integer,
      'supabase_project_ref_recorded', (SELECT supabase_project_ref FROM params),
      'note', 'Operator must confirm SQL Editor project matches supabase_project_ref_recorded'
    ) AS payload
),

-- ---------------------------------------------------------------------------
-- B. Companies relation identity
-- ---------------------------------------------------------------------------
section_b_relation AS (
  SELECT
    2 AS section_order,
    'B_companies_relation'::text AS section_key,
    'relation'::text AS item_key,
    CASE
      WHEN c.oid IS NULL THEN jsonb_build_object('exists', false, 'regclass', 'public.companies')
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
    ON c.oid = to_regclass('public.companies')
  LEFT JOIN pg_catalog.pg_namespace AS n
    ON n.oid = c.relnamespace
),

-- B columns
section_b_columns AS (
  SELECT
    3 AS section_order,
    'B_companies_columns'::text AS section_key,
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
    AND c.relname = 'companies'
    AND a.attnum > 0
    AND NOT a.attisdropped
),

-- B constraints
section_b_constraints AS (
  SELECT
    4 AS section_order,
    'B_companies_constraints'::text AS section_key,
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
      'confupdtype', con.confupdtype,
      'confdeltype', con.confdeltype,
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
        WHEN con.contype = 'f' THEN (SELECT n2.nspname || '.' || c2.relname
          FROM pg_catalog.pg_class AS c2
          JOIN pg_catalog.pg_namespace AS n2 ON n2.oid = c2.relnamespace
          WHERE c2.oid = con.confrelid)
        ELSE NULL
      END
    ) AS payload
  FROM pg_catalog.pg_constraint AS con
  JOIN pg_catalog.pg_class AS c
    ON c.oid = con.conrelid
  JOIN pg_catalog.pg_namespace AS n
    ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'companies'
),

-- B indexes
section_b_indexes AS (
  SELECT
    5 AS section_order,
    'B_companies_indexes'::text AS section_key,
    i.relname AS item_key,
    jsonb_build_object(
      'index_name', i.relname,
      'is_unique', ix.indisunique,
      'is_primary', ix.indisprimary,
      'is_valid', ix.indisvalid,
      'is_ready', ix.indisready,
      'definition', pg_catalog.pg_get_indexdef(ix.indexrelid),
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
    AND t.relname = 'companies'
),

-- B triggers
section_b_triggers AS (
  SELECT
    6 AS section_order,
    'B_companies_triggers'::text AS section_key,
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
    AND c.relname = 'companies'
    AND NOT tr.tgisinternal
),

-- B trigger function details (for companies triggers only)
section_b_trigger_functions AS (
  SELECT
    7 AS section_order,
    'B_companies_trigger_functions'::text AS section_key,
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
      'proconfig', p.proconfig,
      'search_path_config', (
        SELECT cfg
        FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
        WHERE cfg LIKE 'search_path=%'
        LIMIT 1
      ),
      'definition', pg_catalog.pg_get_functiondef(p.oid)
    ) AS payload
  FROM (
    SELECT DISTINCT tr.tgfoid
    FROM pg_catalog.pg_trigger AS tr
    JOIN pg_catalog.pg_class AS c ON c.oid = tr.tgrelid
    JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'companies'
      AND NOT tr.tgisinternal
  ) AS tf
  JOIN pg_catalog.pg_proc AS p ON p.oid = tf.tgfoid
  JOIN pg_catalog.pg_namespace AS pn ON pn.oid = p.pronamespace
  JOIN pg_catalog.pg_language AS l ON l.oid = p.prolang
),

-- ---------------------------------------------------------------------------
-- C. Projects company contract
-- ---------------------------------------------------------------------------
section_c_company_column AS (
  SELECT
    8 AS section_order,
    'C_projects_company_contract'::text AS section_key,
    'column:' || a.attname AS item_key,
    jsonb_build_object(
      'topic', 'projects_column',
      'column_name', a.attname,
      'data_type', pg_catalog.format_type(a.atttypid, a.atttypmod),
      'not_null', a.attnotnull,
      'default_expr', pg_catalog.pg_get_expr(ad.adbin, ad.adrelid)
    ) AS payload
  FROM pg_catalog.pg_attribute AS a
  JOIN pg_catalog.pg_class AS c ON c.oid = a.attrelid
  JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
  LEFT JOIN pg_catalog.pg_attrdef AS ad
    ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
  WHERE n.nspname = 'public'
    AND c.relname = 'projects'
    AND a.attname IN ('company_id', 'account_id', 'status', 'deleted_at', 'name')
    AND a.attnum > 0
    AND NOT a.attisdropped
),

section_c_fks AS (
  SELECT
    8 AS section_order,
    'C_projects_company_contract'::text AS section_key,
    'fk:' || con.conname AS item_key,
    jsonb_build_object(
      'topic', 'projects_foreign_key',
      'constraint_name', con.conname,
      'definition', pg_catalog.pg_get_constraintdef(con.oid, true),
      'fk_update_action', CASE con.confupdtype
        WHEN 'a' THEN 'no_action' WHEN 'r' THEN 'restrict' WHEN 'c' THEN 'cascade'
        WHEN 'n' THEN 'set_null' WHEN 'd' THEN 'set_default' ELSE con.confupdtype::text
      END,
      'fk_delete_action', CASE con.confdeltype
        WHEN 'a' THEN 'no_action' WHEN 'r' THEN 'restrict' WHEN 'c' THEN 'cascade'
        WHEN 'n' THEN 'set_null' WHEN 'd' THEN 'set_default' ELSE con.confdeltype::text
      END,
      'foreign_table', (
        SELECT n2.nspname || '.' || c2.relname
        FROM pg_catalog.pg_class AS c2
        JOIN pg_catalog.pg_namespace AS n2 ON n2.oid = c2.relnamespace
        WHERE c2.oid = con.confrelid
      ),
      'constrained_columns', (
        SELECT jsonb_agg(a.attname ORDER BY u.ord)
        FROM unnest(con.conkey) WITH ORDINALITY AS u(attnum, ord)
        JOIN pg_catalog.pg_attribute AS a
          ON a.attrelid = con.conrelid AND a.attnum = u.attnum
      )
    ) AS payload
  FROM pg_catalog.pg_constraint AS con
  JOIN pg_catalog.pg_class AS c ON c.oid = con.conrelid
  JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'projects'
    AND con.contype = 'f'
),

section_c_checks AS (
  SELECT
    8 AS section_order,
    'C_projects_company_contract'::text AS section_key,
    'check:' || con.conname AS item_key,
    jsonb_build_object(
      'topic', 'projects_check',
      'constraint_name', con.conname,
      'definition', pg_catalog.pg_get_constraintdef(con.oid, true)
    ) AS payload
  FROM pg_catalog.pg_constraint AS con
  JOIN pg_catalog.pg_class AS c ON c.oid = con.conrelid
  JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'projects'
    AND con.contype = 'c'
    AND (
      pg_catalog.pg_get_constraintdef(con.oid, true) ILIKE '%status%'
      OR con.conname ILIKE '%status%'
      OR pg_catalog.pg_get_constraintdef(con.oid, true) ILIKE '%company%'
    )
),

section_c_indexes AS (
  SELECT
    8 AS section_order,
    'C_projects_company_contract'::text AS section_key,
    'index:' || i.relname AS item_key,
    jsonb_build_object(
      'topic', 'projects_index',
      'index_name', i.relname,
      'is_unique', ix.indisunique,
      'definition', pg_catalog.pg_get_indexdef(ix.indexrelid)
    ) AS payload
  FROM pg_catalog.pg_index AS ix
  JOIN pg_catalog.pg_class AS t ON t.oid = ix.indrelid
  JOIN pg_catalog.pg_namespace AS n ON n.oid = t.relnamespace
  JOIN pg_catalog.pg_class AS i ON i.oid = ix.indexrelid
  WHERE n.nspname = 'public'
    AND t.relname = 'projects'
    AND (
      pg_catalog.pg_get_indexdef(ix.indexrelid) ILIKE '%company_id%'
      OR pg_catalog.pg_get_indexdef(ix.indexrelid) ILIKE '%status%'
      OR pg_catalog.pg_get_indexdef(ix.indexrelid) ILIKE '%deleted_at%'
      OR pg_catalog.pg_get_indexdef(ix.indexrelid) ILIKE '%account_id%'
    )
),

section_c_triggers AS (
  SELECT
    8 AS section_order,
    'C_projects_company_contract'::text AS section_key,
    'trigger:' || tr.tgname AS item_key,
    jsonb_build_object(
      'topic', 'projects_trigger',
      'trigger_name', tr.tgname,
      'function_name', p.proname,
      'function_identity_args', pg_catalog.pg_get_function_identity_arguments(p.oid),
      'definition_hint', pg_catalog.pg_get_triggerdef(tr.oid, true)
    ) AS payload
  FROM pg_catalog.pg_trigger AS tr
  JOIN pg_catalog.pg_class AS c ON c.oid = tr.tgrelid
  JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
  JOIN pg_catalog.pg_proc AS p ON p.oid = tr.tgfoid
  WHERE n.nspname = 'public'
    AND c.relname = 'projects'
    AND NOT tr.tgisinternal
    AND (
      tr.tgname ILIKE '%account%'
      OR tr.tgname ILIKE '%compan%'
      OR p.proname ILIKE '%account%'
      OR p.proname ILIKE '%compan%'
      OR p.prosrc ILIKE '%compan%'
    )
),

-- ---------------------------------------------------------------------------
-- D. Policies and grants
-- ---------------------------------------------------------------------------
section_d_policies_companies AS (
  SELECT
    9 AS section_order,
    'D_policies_companies'::text AS section_key,
    pol.polname AS item_key,
    jsonb_build_object(
      'policy_name', pol.polname,
      'command', pol.polcmd,
      'command_label', CASE pol.polcmd
        WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT' WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE' WHEN '*' THEN 'ALL' ELSE pol.polcmd::text
      END,
      'permissive', pol.polpermissive,
      'roles', (
        SELECT COALESCE(jsonb_agg(r.rolname ORDER BY r.rolname), '[]'::jsonb)
        FROM pg_catalog.pg_roles AS r
        WHERE r.oid = ANY (pol.polroles)
      ),
      'qual', pg_catalog.pg_get_expr(pol.polqual, pol.polrelid),
      'with_check', pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid)
    ) AS payload
  FROM pg_catalog.pg_policy AS pol
  JOIN pg_catalog.pg_class AS c ON c.oid = pol.polrelid
  JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'companies'
),

section_d_policies_projects AS (
  SELECT
    10 AS section_order,
    'D_policies_projects'::text AS section_key,
    pol.polname AS item_key,
    jsonb_build_object(
      'policy_name', pol.polname,
      'command', pol.polcmd,
      'command_label', CASE pol.polcmd
        WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT' WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE' WHEN '*' THEN 'ALL' ELSE pol.polcmd::text
      END,
      'permissive', pol.polpermissive,
      'roles', (
        SELECT COALESCE(jsonb_agg(r.rolname ORDER BY r.rolname), '[]'::jsonb)
        FROM pg_catalog.pg_roles AS r
        WHERE r.oid = ANY (pol.polroles)
      ),
      'qual', pg_catalog.pg_get_expr(pol.polqual, pol.polrelid),
      'with_check', pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid)
    ) AS payload
  FROM pg_catalog.pg_policy AS pol
  JOIN pg_catalog.pg_class AS c ON c.oid = pol.polrelid
  JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'projects'
),

role_set AS (
  SELECT rolname
  FROM (VALUES
    ('PUBLIC'),
    ('anon'),
    ('authenticated'),
    ('service_role')
  ) AS v(rolname)
),

priv_set AS (
  SELECT privilege
  FROM (VALUES
    ('SELECT'),
    ('INSERT'),
    ('UPDATE'),
    ('DELETE'),
    ('TRUNCATE'),
    ('REFERENCES'),
    ('TRIGGER'),
    ('MAINTAIN')
  ) AS v(privilege)
),

section_d_grants_companies AS (
  SELECT
    11 AS section_order,
    'D_grants_companies'::text AS section_key,
    rs.rolname || ':' || ps.privilege AS item_key,
    jsonb_build_object(
      'relation', 'public.companies',
      'grantee', rs.rolname,
      'privilege', ps.privilege,
      'has_privilege', CASE
        WHEN to_regclass('public.companies') IS NULL THEN NULL
        WHEN rs.rolname = 'PUBLIC' THEN EXISTS (
          SELECT 1
          FROM pg_catalog.pg_class AS c
          CROSS JOIN LATERAL pg_catalog.aclexplode(c.relacl) AS acl
          WHERE c.oid = to_regclass('public.companies')
            AND c.relacl IS NOT NULL
            AND acl.grantee = 0
            AND acl.privilege_type = ps.privilege
        )
        WHEN EXISTS (SELECT 1 FROM pg_catalog.pg_roles r WHERE r.rolname = rs.rolname)
          THEN has_table_privilege(rs.rolname, 'public.companies', ps.privilege)
        ELSE NULL
      END,
      'relation_exists', to_regclass('public.companies') IS NOT NULL
    ) AS payload
  FROM role_set AS rs
  CROSS JOIN priv_set AS ps
),

section_d_grants_projects AS (
  SELECT
    12 AS section_order,
    'D_grants_projects'::text AS section_key,
    rs.rolname || ':' || ps.privilege AS item_key,
    jsonb_build_object(
      'relation', 'public.projects',
      'grantee', rs.rolname,
      'privilege', ps.privilege,
      'has_privilege', CASE
        WHEN to_regclass('public.projects') IS NULL THEN NULL
        WHEN rs.rolname = 'PUBLIC' THEN EXISTS (
          SELECT 1
          FROM pg_catalog.pg_class AS c
          CROSS JOIN LATERAL pg_catalog.aclexplode(c.relacl) AS acl
          WHERE c.oid = to_regclass('public.projects')
            AND c.relacl IS NOT NULL
            AND acl.grantee = 0
            AND acl.privilege_type = ps.privilege
        )
        WHEN EXISTS (SELECT 1 FROM pg_catalog.pg_roles r WHERE r.rolname = rs.rolname)
          THEN has_table_privilege(rs.rolname, 'public.projects', ps.privilege)
        ELSE NULL
      END,
      'relation_exists', to_regclass('public.projects') IS NOT NULL
    ) AS payload
  FROM role_set AS rs
  CROSS JOIN priv_set AS ps
),

-- ---------------------------------------------------------------------------
-- E. Helper / RPC namespace (name or body references)
-- ---------------------------------------------------------------------------
candidate_functions AS (
  SELECT
    p.oid,
    n.nspname,
    p.proname,
    pg_catalog.pg_get_function_identity_arguments(p.oid) AS identity_args,
    pg_catalog.pg_get_function_result(p.oid) AS result_type,
    pg_catalog.pg_get_userbyid(p.proowner) AS owner,
    l.lanname AS language,
    p.prosecdef,
    p.proconfig,
    p.prosrc
  FROM pg_catalog.pg_proc AS p
  JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
  JOIN pg_catalog.pg_language AS l ON l.oid = p.prolang
  WHERE n.nspname = 'public'
    AND p.prokind IN ('f', 'p', 'w')
    AND (
      p.proname ~* '(company|companies|project|support)'
      OR p.prosrc ~* '(company|companies)'
      OR (
        p.prosrc ~* 'project'
        AND p.proname ~* '(support|check_|enforce_|current_|is_|resolve_)'
      )
    )
),

section_e_functions AS (
  SELECT
    13 AS section_order,
    'E_functions_namespace'::text AS section_key,
    cf.nspname || '.' || cf.proname || '(' || cf.identity_args || ')' AS item_key,
    jsonb_build_object(
      'schema', cf.nspname,
      'name', cf.proname,
      'identity_arguments', cf.identity_args,
      'result_type', cf.result_type,
      'owner', cf.owner,
      'language', cf.language,
      'security', CASE WHEN cf.prosecdef THEN 'DEFINER' ELSE 'INVOKER' END,
      'proconfig', cf.proconfig,
      'search_path_config', (
        SELECT cfg
        FROM unnest(COALESCE(cf.proconfig, ARRAY[]::text[])) AS cfg
        WHERE cfg LIKE 'search_path=%'
        LIMIT 1
      ),
      'execute_public', EXISTS (
        SELECT 1
        FROM pg_catalog.pg_proc AS p2
        CROSS JOIN LATERAL pg_catalog.aclexplode(p2.proacl) AS acl
        WHERE p2.oid = cf.oid
          AND p2.proacl IS NOT NULL
          AND acl.grantee = 0
          AND acl.privilege_type = 'EXECUTE'
      )
      OR (
        -- When proacl is NULL, PostgreSQL default ACL typically grants EXECUTE to PUBLIC.
        EXISTS (SELECT 1 FROM pg_catalog.pg_proc p2 WHERE p2.oid = cf.oid AND p2.proacl IS NULL)
      ),
      'execute_anon', CASE
        WHEN EXISTS (SELECT 1 FROM pg_roles r WHERE r.rolname = 'anon')
          THEN has_function_privilege('anon', cf.oid, 'EXECUTE')
        ELSE NULL
      END,
      'execute_authenticated', CASE
        WHEN EXISTS (SELECT 1 FROM pg_roles r WHERE r.rolname = 'authenticated')
          THEN has_function_privilege('authenticated', cf.oid, 'EXECUTE')
        ELSE NULL
      END,
      'execute_service_role', CASE
        WHEN EXISTS (SELECT 1 FROM pg_roles r WHERE r.rolname = 'service_role')
          THEN has_function_privilege('service_role', cf.oid, 'EXECUTE')
        ELSE NULL
      END,
      'name_mentions_company', cf.proname ~* '(company|companies)',
      'body_mentions_company', cf.prosrc ~* '(company|companies)',
      'name_mentions_support', cf.proname ~* 'support',
      'name_mentions_project', cf.proname ~* 'project',
      'definition', pg_catalog.pg_get_functiondef(cf.oid)
    ) AS payload
  FROM candidate_functions AS cf
),

-- ---------------------------------------------------------------------------
-- F. Trigger / normalization inventory (explicit presence/absence)
-- ---------------------------------------------------------------------------
section_f_normalization AS (
  SELECT
    14 AS section_order,
    'F_normalization_inventory'::text AS section_key,
    v.flag_key AS item_key,
    jsonb_build_object(
      'flag_key', v.flag_key,
      'present', v.present,
      'detail', v.detail,
      'interpretation', v.interpretation
    ) AS payload
  FROM (
    SELECT
      'companies_updated_at_trigger'::text AS flag_key,
      EXISTS (
        SELECT 1
        FROM pg_catalog.pg_trigger AS tr
        JOIN pg_catalog.pg_class AS c ON c.oid = tr.tgrelid
        JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
        JOIN pg_catalog.pg_proc AS p ON p.oid = tr.tgfoid
        WHERE n.nspname = 'public' AND c.relname = 'companies' AND NOT tr.tgisinternal
          AND (tr.tgname ILIKE '%updated_at%' OR p.proname ILIKE '%updated_at%')
      ) AS present,
      'Trigger on public.companies related to updated_at / set_updated_at'::text AS detail,
      'Expected PRESENT from core schema'::text AS interpretation
    UNION ALL
    SELECT
      'companies_name_normalization_trigger_or_function',
      EXISTS (
        SELECT 1
        FROM pg_catalog.pg_trigger AS tr
        JOIN pg_catalog.pg_class AS c ON c.oid = tr.tgrelid
        JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
        JOIN pg_catalog.pg_proc AS p ON p.oid = tr.tgfoid
        WHERE n.nspname = 'public' AND c.relname = 'companies' AND NOT tr.tgisinternal
          AND (tr.tgname ~* 'normal' OR p.proname ~* 'normal' OR p.prosrc ~* 'normaliz')
      )
      OR EXISTS (
        SELECT 1 FROM pg_catalog.pg_proc AS p
        JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname ~* '(normaliz).*(compan|name)|(compan).*(normaliz)'
      ),
      'Name normalization objects for companies',
      'Expected ABSENT today; approved MVP requires future DB-authoritative normalization'
    UNION ALL
    SELECT
      'companies_phone_normalization_or_check',
      EXISTS (
        SELECT 1
        FROM pg_catalog.pg_constraint AS con
        JOIN pg_catalog.pg_class AS c ON c.oid = con.conrelid
        JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'companies' AND con.contype = 'c'
          AND pg_catalog.pg_get_constraintdef(con.oid, true) ILIKE '%phone%'
      )
      OR EXISTS (
        SELECT 1
        FROM pg_catalog.pg_trigger AS tr
        JOIN pg_catalog.pg_class AS c ON c.oid = tr.tgrelid
        JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
        JOIN pg_catalog.pg_proc AS p ON p.oid = tr.tgfoid
        WHERE n.nspname = 'public' AND c.relname = 'companies' AND NOT tr.tgisinternal
          AND (tr.tgname ILIKE '%phone%' OR p.proname ILIKE '%phone%' OR p.prosrc ILIKE '%phone%')
      )
      OR EXISTS (
        SELECT 1 FROM pg_catalog.pg_proc AS p
        JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname ~* '(company|companies).*phone|phone.*(company|companies)|invalid_company_phone'
      ),
      'Phone validation/normalization for companies',
      'Expected ABSENT today; approved MVP phone rules are future design'
    UNION ALL
    SELECT
      'companies_duplicate_active_name_unique',
      EXISTS (
        SELECT 1
        FROM pg_catalog.pg_index AS ix
        JOIN pg_catalog.pg_class AS t ON t.oid = ix.indrelid
        JOIN pg_catalog.pg_namespace AS n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public' AND t.relname = 'companies'
          AND ix.indisunique
          AND pg_catalog.pg_get_indexdef(ix.indexrelid) ILIKE '%name%'
      )
      OR EXISTS (
        SELECT 1
        FROM pg_catalog.pg_constraint AS con
        JOIN pg_catalog.pg_class AS c ON c.oid = con.conrelid
        JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'companies' AND con.contype = 'u'
          AND pg_catalog.pg_get_constraintdef(con.oid, true) ILIKE '%name%'
      ),
      'Unique constraint/index on company name (any form)',
      'Expected ABSENT today; approved duplicate_company_name is future design'
    UNION ALL
    SELECT
      'projects_account_consistency_with_companies',
      EXISTS (
        SELECT 1
        FROM pg_catalog.pg_trigger AS tr
        JOIN pg_catalog.pg_class AS c ON c.oid = tr.tgrelid
        JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
        JOIN pg_catalog.pg_proc AS p ON p.oid = tr.tgfoid
        WHERE n.nspname = 'public' AND c.relname = 'projects' AND NOT tr.tgisinternal
          AND (
            tr.tgname ILIKE '%account_consistency%'
            OR p.proname ILIKE '%project_account_consistency%'
            OR p.prosrc ILIKE '%companies%'
          )
      ),
      'projects account_id must match companies.account_id',
      'Expected PRESENT from core schema'
    UNION ALL
    SELECT
      'companies_audit_trigger',
      EXISTS (
        SELECT 1
        FROM pg_catalog.pg_trigger AS tr
        JOIN pg_catalog.pg_class AS c ON c.oid = tr.tgrelid
        JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'companies' AND NOT tr.tgisinternal
          AND tr.tgname ILIKE '%audit%'
      ),
      'Audit trigger attached to companies',
      'Expected ABSENT from core schema (audit on other tables only)'
    UNION ALL
    SELECT
      'companies_update_or_delete_policy',
      EXISTS (
        SELECT 1
        FROM pg_catalog.pg_policy AS pol
        JOIN pg_catalog.pg_class AS c ON c.oid = pol.polrelid
        JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'companies'
          AND pol.polcmd IN ('w', 'd', '*')
      ),
      'UPDATE/DELETE/ALL policy on companies',
      'Expected ABSENT (direct client UPDATE denied by design)'
  ) AS v
),

-- ---------------------------------------------------------------------------
-- G. Dependency inventory
-- ---------------------------------------------------------------------------
section_g_views AS (
  SELECT
    15 AS section_order,
    'G_dependencies'::text AS section_key,
    'view:' || n.nspname || '.' || c.relname AS item_key,
    jsonb_build_object(
      'dependency_kind', 'view_or_matview',
      'schema', n.nspname,
      'name', c.relname,
      'relkind', c.relkind,
      'definition', pg_catalog.pg_get_viewdef(c.oid, true)
    ) AS payload
  FROM pg_catalog.pg_class AS c
  JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('v', 'm')
    AND pg_catalog.pg_get_viewdef(c.oid, true) ~* 'companies'
),

section_g_fks_to_companies AS (
  SELECT
    15 AS section_order,
    'G_dependencies'::text AS section_key,
    'fk_to_companies:' || n.nspname || '.' || c.relname || ':' || con.conname AS item_key,
    jsonb_build_object(
      'dependency_kind', 'foreign_key_to_companies',
      'from_table', n.nspname || '.' || c.relname,
      'constraint_name', con.conname,
      'definition', pg_catalog.pg_get_constraintdef(con.oid, true),
      'fk_delete_action', CASE con.confdeltype
        WHEN 'a' THEN 'no_action' WHEN 'r' THEN 'restrict' WHEN 'c' THEN 'cascade'
        WHEN 'n' THEN 'set_null' WHEN 'd' THEN 'set_default' ELSE con.confdeltype::text
      END,
      'fk_update_action', CASE con.confupdtype
        WHEN 'a' THEN 'no_action' WHEN 'r' THEN 'restrict' WHEN 'c' THEN 'cascade'
        WHEN 'n' THEN 'set_null' WHEN 'd' THEN 'set_default' ELSE con.confupdtype::text
      END
    ) AS payload
  FROM pg_catalog.pg_constraint AS con
  JOIN pg_catalog.pg_class AS c ON c.oid = con.conrelid
  JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
  WHERE con.contype = 'f'
    AND con.confrelid = to_regclass('public.companies')
),

section_g_policies_ref AS (
  SELECT
    15 AS section_order,
    'G_dependencies'::text AS section_key,
    'policy_ref:' || n.nspname || '.' || c.relname || ':' || pol.polname AS item_key,
    jsonb_build_object(
      'dependency_kind', 'policy_text_mentions_companies',
      'table', n.nspname || '.' || c.relname,
      'policy_name', pol.polname,
      'qual', pg_catalog.pg_get_expr(pol.polqual, pol.polrelid),
      'with_check', pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid)
    ) AS payload
  FROM pg_catalog.pg_policy AS pol
  JOIN pg_catalog.pg_class AS c ON c.oid = pol.polrelid
  JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND (
      COALESCE(pg_catalog.pg_get_expr(pol.polqual, pol.polrelid), '') ~* 'compan'
      OR COALESCE(pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid), '') ~* 'compan'
      OR c.relname = 'companies'
    )
),

section_g_triggers_ref AS (
  SELECT
    15 AS section_order,
    'G_dependencies'::text AS section_key,
    'trigger_ref:' || n.nspname || '.' || c.relname || ':' || tr.tgname AS item_key,
    jsonb_build_object(
      'dependency_kind', 'trigger_mentions_companies',
      'table', n.nspname || '.' || c.relname,
      'trigger_name', tr.tgname,
      'function_name', p.proname,
      'triggerdef', pg_catalog.pg_get_triggerdef(tr.oid, true)
    ) AS payload
  FROM pg_catalog.pg_trigger AS tr
  JOIN pg_catalog.pg_class AS c ON c.oid = tr.tgrelid
  JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
  JOIN pg_catalog.pg_proc AS p ON p.oid = tr.tgfoid
  WHERE n.nspname = 'public'
    AND NOT tr.tgisinternal
    AND (
      c.relname = 'companies'
      OR tr.tgname ~* 'compan'
      OR p.proname ~* 'compan'
      OR p.prosrc ~* 'compan'
    )
),

section_g_function_deps AS (
  SELECT
    15 AS section_order,
    'G_dependencies'::text AS section_key,
    'function_ref:' || n.nspname || '.' || p.proname || '(' || pg_catalog.pg_get_function_identity_arguments(p.oid) || ')' AS item_key,
    jsonb_build_object(
      'dependency_kind', 'function_body_or_name_mentions_companies',
      'schema', n.nspname,
      'name', p.proname,
      'identity_arguments', pg_catalog.pg_get_function_identity_arguments(p.oid),
      'security', CASE WHEN p.prosecdef THEN 'DEFINER' ELSE 'INVOKER' END,
      'comment', obj_description(p.oid, 'pg_proc')
    ) AS payload
  FROM pg_catalog.pg_proc AS p
  JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND (
      p.proname ~* '(company|companies)'
      OR p.prosrc ~* '(company|companies)'
    )
),

section_g_migration_comments AS (
  SELECT
    15 AS section_order,
    'G_dependencies'::text AS section_key,
    'comment:' || x.objtype || ':' || x.objid AS item_key,
    jsonb_build_object(
      'dependency_kind', 'catalog_comment_managed_by_hint',
      'objtype', x.objtype,
      'object', x.object_label,
      'comment', x.description
    ) AS payload
  FROM (
    SELECT
      'policy'::text AS objtype,
      c.relname || '.' || pol.polname AS object_label,
      pol.oid::text AS objid,
      obj_description(pol.oid, 'pg_policy') AS description
    FROM pg_catalog.pg_policy AS pol
    JOIN pg_catalog.pg_class AS c ON c.oid = pol.polrelid
    JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('companies', 'projects')
      AND obj_description(pol.oid, 'pg_policy') IS NOT NULL
    UNION ALL
    SELECT
      'function',
      n.nspname || '.' || p.proname,
      p.oid::text,
      obj_description(p.oid, 'pg_proc')
    FROM pg_catalog.pg_proc AS p
    JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND obj_description(p.oid, 'pg_proc') ILIKE '%managed_by%'
      AND (
        p.proname ~* '(company|companies|support|project)'
        OR p.prosrc ~* '(company|companies)'
      )
  ) AS x
),

-- ---------------------------------------------------------------------------
-- Z. Packet meta / non-claims
-- ---------------------------------------------------------------------------
section_z AS (
  SELECT
    16 AS section_order,
    'Z_packet_meta'::text AS section_key,
    'meta'::text AS item_key,
    jsonb_build_object(
      'packet_id', (SELECT packet_id FROM params),
      'deferred_register_id', (SELECT deferred_register_id FROM params),
      'supabase_project_ref_recorded', (SELECT supabase_project_ref FROM params),
      'safety', jsonb_build_object(
        'writes', 'none',
        'business_row_select', 'none',
        'scope', 'catalog_metadata_only',
        'runner', 'mozfer_manual_sql_editor',
        'environment', 'DEV_DEMO_only'
      ),
      'non_claims', jsonb_build_array(
        'Companies implementation not started by this packet',
        'No migration or RPC design authorized by this packet alone',
        'No production readiness',
        'Results require human review against PASS/HOLD checklist in docs/companies-live-catalog-verification.md'
      )
    ) AS payload
),

-- Empty-section markers so missing objects are visible when left joins yield zero rows
section_empties AS (
  SELECT * FROM (
    SELECT 3 AS section_order, 'B_companies_columns'::text AS section_key,
      '_empty_marker'::text AS item_key,
      jsonb_build_object('empty', true, 'meaning', 'no columns returned — companies missing or inaccessible') AS payload
    WHERE NOT EXISTS (SELECT 1 FROM section_b_columns)
    UNION ALL
    SELECT 4, 'B_companies_constraints', '_empty_marker',
      jsonb_build_object('empty', true, 'meaning', 'no constraints on public.companies')
    WHERE NOT EXISTS (SELECT 1 FROM section_b_constraints)
    UNION ALL
    SELECT 5, 'B_companies_indexes', '_empty_marker',
      jsonb_build_object('empty', true, 'meaning', 'no indexes on public.companies')
    WHERE NOT EXISTS (SELECT 1 FROM section_b_indexes)
    UNION ALL
    SELECT 6, 'B_companies_triggers', '_empty_marker',
      jsonb_build_object('empty', true, 'meaning', 'no user triggers on public.companies')
    WHERE NOT EXISTS (SELECT 1 FROM section_b_triggers)
    UNION ALL
    SELECT 9, 'D_policies_companies', '_empty_marker',
      jsonb_build_object('empty', true, 'meaning', 'no RLS policies on public.companies')
    WHERE NOT EXISTS (SELECT 1 FROM section_d_policies_companies)
    UNION ALL
    SELECT 13, 'E_functions_namespace', '_empty_marker',
      jsonb_build_object('empty', true, 'meaning', 'no matching public functions')
    WHERE NOT EXISTS (SELECT 1 FROM section_e_functions)
  ) AS e
),

all_sections AS (
  SELECT section_order, section_key, item_key, payload FROM section_a
  UNION ALL SELECT section_order, section_key, item_key, payload FROM section_b_relation
  UNION ALL SELECT section_order, section_key, item_key, payload FROM section_b_columns
  UNION ALL SELECT section_order, section_key, item_key, payload FROM section_b_constraints
  UNION ALL SELECT section_order, section_key, item_key, payload FROM section_b_indexes
  UNION ALL SELECT section_order, section_key, item_key, payload FROM section_b_triggers
  UNION ALL SELECT section_order, section_key, item_key, payload FROM section_b_trigger_functions
  UNION ALL SELECT section_order, section_key, item_key, payload FROM section_c_company_column
  UNION ALL SELECT section_order, section_key, item_key, payload FROM section_c_fks
  UNION ALL SELECT section_order, section_key, item_key, payload FROM section_c_checks
  UNION ALL SELECT section_order, section_key, item_key, payload FROM section_c_indexes
  UNION ALL SELECT section_order, section_key, item_key, payload FROM section_c_triggers
  UNION ALL SELECT section_order, section_key, item_key, payload FROM section_d_policies_companies
  UNION ALL SELECT section_order, section_key, item_key, payload FROM section_d_policies_projects
  UNION ALL SELECT section_order, section_key, item_key, payload FROM section_d_grants_companies
  UNION ALL SELECT section_order, section_key, item_key, payload FROM section_d_grants_projects
  UNION ALL SELECT section_order, section_key, item_key, payload FROM section_e_functions
  UNION ALL SELECT section_order, section_key, item_key, payload FROM section_f_normalization
  UNION ALL SELECT section_order, section_key, item_key, payload FROM section_g_views
  UNION ALL SELECT section_order, section_key, item_key, payload FROM section_g_fks_to_companies
  UNION ALL SELECT section_order, section_key, item_key, payload FROM section_g_policies_ref
  UNION ALL SELECT section_order, section_key, item_key, payload FROM section_g_triggers_ref
  UNION ALL SELECT section_order, section_key, item_key, payload FROM section_g_function_deps
  UNION ALL SELECT section_order, section_key, item_key, payload FROM section_g_migration_comments
  UNION ALL SELECT section_order, section_key, item_key, payload FROM section_z
  UNION ALL SELECT section_order, section_key, item_key, payload FROM section_empties
)

SELECT
  section_order,
  section_key,
  item_key,
  payload
FROM all_sections
ORDER BY section_order, item_key;
```

---

## After Mozfer run — completed

1. Raw export reviewed (not stored as a repository migration artifact).
2. Review against PASS values and HOLD conditions — **PASS**.
3. Live findings recorded in this document, `docs/project-status.md`, `docs/database-schema.md`, `docs/project-roadmap.md`, and `docs/deferred-decisions.md` (`DWR-COMP-026` closed).
4. Schema/RPC design recorded (`docs/companies-schema-rpc-design.md`). Next: migration draft (`ZAM-COMPANIES-SCHEMA-RPC-MIGRATION-1`). Implementation still requires migration review/apply and app tasks.

---

## Source migration references (static)

- `supabase/migrations/202607060001_zamblak_core_schema.sql` — companies/projects DDL, triggers, foundation policies
- `supabase/migrations/202607130002_role_safe_read_surfaces.sql` — Owner-only `sel_companies`, support RPCs joining companies
- `supabase/migrations/20260715120000_harden_core_acl_defaults.sql` — authenticated SELECT-only relation ACLs

Live catalog for designated DEV/DEMO was reconciled under `DWR-COMP-026` (PASS). Future schema work must still be designed and reviewed before apply.
