# Respondents live DEV/DEMO catalog verification gate

- **Task:** `ZAM-RESPONDENTS-LIVE-CATALOG-PACKET-1`
- **Packet status:** **ready for Mozfer manual run** (not executed by the agent)
- **Designated DEV/DEMO project ref:** `gdegnwglakyblnmxgiwx`
- **Authority:** `ZAM-RESPONDENTS-MVP-SCOPE-REVIEW-1` (PASS WITH WARN); `ZAM-RESPONDENTS-MVP-SCOPE-REVIEW-EVIDENCE-CLOSE-1` (PASS WITH WARN); committed migrations
- **Production readiness:** **not claimed**
- **Agent SQL execution:** **forbidden** — Mozfer runs this packet in a separate task

### Live run result (pending)

| Field | Value |
|---|---|
| Runner | Mozfer, Supabase SQL Editor, DEV/DEMO only |
| Project | `gdegnwglakyblnmxgiwx` (confirm in Dashboard UI) |
| PG | _pending_ |
| Writes | Must be **none** |
| Business rows | Must be **none** |
| Review | _pending controller review after Mozfer export_ |
| Next after export | `ZAM-RESPONDENTS-LIVE-CATALOG-MANUAL-RUN-1` |

---

## 1. Purpose

Reconcile the **live DEV/DEMO PostgreSQL catalog** for the **Respondent Registry** domain against committed source assumptions **before** any Respondent schema/RPC design or migration work.

This packet must verify (metadata only):

- the installed `public.respondents` table contract;
- constraints, indexes, triggers, RLS, and ACLs;
- normalized-mobile CHECK and active-row uniqueness;
- Participation FK / unique / account-consistency / active-project guard boundaries;
- role-safe SELECT posture for Respondents;
- presence/absence of Respondent CRUD RPCs and mobile-normalization helpers;
- inventory signals for three-month same-domain warning objects;
- relevant migration-history evidence when available.

This packet does **not**:

- design or implement Respondent RPCs;
- apply migrations;
- invent live results;
- claim production readiness;
- authorize Respondent application work without a later design PASS;
- include application or browser smoke;
- select or dump any application table rows (no PII).

---

## 2. DEV/DEMO-only warning

| Rule | Requirement |
|---|---|
| Environment | **DEV/DEMO only** |
| Supabase project ref | **`gdegnwglakyblnmxgiwx`** (confirm in Dashboard before run) |
| Runner | **Mozfer only**, Supabase SQL Editor |
| Writes | **None** |
| Business rows | **None** — no `SELECT *` / row data from `respondents`, `participations`, `projects`, `profiles`, `accounts`, payments, etc. |
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
12. Do **not** start Respondent migration/RPC design from this packet alone.
13. Do **not** perform application or browser smoke as part of this gate.

**HOLD and stop if:**

- the selected Supabase project ref is not `gdegnwglakyblnmxgiwx`;
- any statement appears mutating;
- any result appears to show application row data (names, mobiles, notes, etc.);
- a permission or missing-relation error blocks required metadata;
- result volume becomes unexpectedly unbounded;
- any prompt requests secrets or `.env` access.

**Return to the controller:**

- every result section;
- any SQL error exactly as shown;
- confirmation that the selected project was `gdegnwglakyblnmxgiwx`;
- confirmation that no write statement was run;
- confirmation that the packet was run in DEV/DEMO only.

**Next controlled task after export exists:** `ZAM-RESPONDENTS-LIVE-CATALOG-MANUAL-RUN-1` (result capture / review).

---

## 5. Safety contract (mandatory)

| Rule | Requirement |
|---|---|
| Packet type | **Metadata / catalog only** (`pg_catalog`, privilege helpers, `pg_get_*` definition text) |
| DDL | Forbidden (`CREATE` / `ALTER` / `DROP` / …) |
| DML | Forbidden (`INSERT` / `UPDATE` / `DELETE` / `MERGE` / `TRUNCATE`) |
| Privilege changes | Forbidden (`GRANT` / `REVOKE` / `SECURITY LABEL`) |
| Role switch | Forbidden (`SET ROLE` / `SET SESSION AUTHORIZATION`) |
| Temp tables / write transactions | Forbidden |
| Dynamic SQL / DO blocks | Forbidden |
| Business-data dumps | Forbidden |
| Service-role / JWT impersonation | Forbidden |
| Function definitions | May be returned via `pg_get_functiondef` / `pg_get_triggerdef` / `pg_get_constraintdef` (definition text only, not business rows) |

**Explicit statements:**

- This packet performs **no business-row writes**.
- This packet includes **no application smoke**, no browser checks, and no auth-user enumeration.
- Do **not** label overall database PASS/FAIL inside SQL results; the controller reviews Mozfer’s export.

---

## 6. Documented source assumptions (static; not live evidence)

From committed migrations (primarily `202607060001_zamblak_core_schema.sql`, `202607130001_participation_project_state_guard.sql`, `202607130002_role_safe_read_surfaces.sql`, `20260715120000_harden_core_acl_defaults.sql`):

### 6.1 `public.respondents` (expected from source)

| Column | Expected type / notes |
|---|---|
| `id` | `uuid` PK, default `gen_random_uuid()` |
| `account_id` | `uuid` NOT NULL → `accounts(id)` (**tenant key**) |
| `name` | `text` nullable |
| `mobile` | `text` NOT NULL |
| `normalized_mobile` | `text` NOT NULL; CHECK `^9665[0-9]{8}$` |
| `age` | `integer` nullable; CHECK `>= 0` |
| `nationality` | `text` nullable |
| `resident_type` | `text` NOT NULL DEFAULT `'unknown'`; CHECK `saudi\|non_saudi\|unknown` |
| `notes` | `text` nullable |
| `created_by` / `updated_by` | `uuid` → `profiles(id)` nullable |
| `created_at` / `updated_at` | `timestamptz` NOT NULL, default `now()` |
| `deleted_at` | `timestamptz` nullable (soft-delete foundation) |

**Expected absences on `respondents`:**

- no financial columns;
- no Respondent CRUD RPCs in source;
- no UPDATE/DELETE RLS policies (direct client UPDATE denied by design).

### 6.2 Indexes / uniqueness (expected from source)

| Index | Source expectation |
|---|---|
| `idx_respondents_unique_mobile_per_account` | UNIQUE `(account_id, normalized_mobile) WHERE deleted_at IS NULL` |

### 6.3 Triggers (expected from source)

| Object | Source expectation |
|---|---|
| `trg_respondents_updated_at` | BEFORE UPDATE → `set_updated_at()` |
| `audit_trg_respondents` | AFTER INSERT/UPDATE/DELETE → audit function |

### 6.4 Policies / ACLs (expected from source + ACL hardening)

| Object | Source expectation |
|---|---|
| `sel_respondents` | SELECT TO `authenticated`: Owner + account match + `deleted_at IS NULL` |
| `ins_respondents` | INSERT WITH CHECK: account match + non-deleted + created_by rules |
| UPDATE/DELETE policies | **Absent** |
| Authenticated table privileges | **SELECT only** |
| `anon` / `service_role` | No relation privileges on `respondents` |

### 6.5 Participation boundary (expected from source)

| Object | Source expectation |
|---|---|
| `participations.respondent_id` | FK → `respondents(id)` |
| `participations.project_id` | FK → `projects(id)` |
| `idx_participations_unique_respondent_per_project` | UNIQUE `(project_id, respondent_id) WHERE deleted_at IS NULL` |
| `check_participation_account_consistency()` | SECURITY DEFINER; account match project + respondent |
| `enforce_participation_project_state()` | active / non-deleted project membership writes |

### 6.6 Three-month same-domain warning

| Expectation | Source |
|---|---|
| Product rule | Warning only; not hard-block (PRD) |
| Project flag | `projects.requires_three_month_warning` exists |
| Dedicated eligibility RPC / trigger | **Not expected as implemented** in current migrations |

### 6.7 Candidate Respondent CRUD names expected absent

- `list_respondents`
- `get_respondent`
- `create_respondent`
- `update_respondent`

---

## 7. Packet sections (output contract)

One ordered result set:

| Column | Meaning |
|---|---|
| `section_order` | Stable numeric order |
| `section_key` | Stable section id |
| `item_key` | Row key within section |
| `payload` | `jsonb` metadata |

### Section map

| Order | `section_key` | Content |
|---|---|---|
| 1 | `A_environment` | Runtime identity |
| 2 | `B_respondents_relation` | Relation existence / RLS flags / ACL text |
| 3 | `B_respondents_columns` | Ordered columns |
| 4 | `B_respondents_constraints` | PK/FK/CHECK/UNIQUE defs |
| 5 | `B_respondents_indexes` | Indexes + predicates |
| 6 | `B_respondents_triggers` | Trigger metadata |
| 7 | `B_respondents_trigger_defs` | Trigger definitions |
| 8 | `C_resident_type_type` | Type / enum metadata for resident_type |
| 9 | `D_policies_respondents` | RLS policies |
| 10 | `D_grants_respondents` | Table privileges for PUBLIC/anon/authenticated/service_role/postgres |
| 11 | `E_functions_respondent_namespace` | Relevant functions + definitions where needed |
| 12 | `E_function_execute_acls` | EXECUTE ACL matrix |
| 13 | `F_crud_candidate_absence` | Candidate CRUD overload counts |
| 14 | `G_participations_relation` | Participation relation metadata |
| 15 | `G_participations_constraints` | FKs / unique constraints |
| 16 | `G_participations_indexes` | Indexes including unique respondent-per-project |
| 17 | `G_participations_triggers` | Consistency + project-state guard attachments |
| 18 | `G_participation_enforcement_functions` | Consistency + guard function metadata |
| 19 | `H_three_month_inventory` | Name/definition search for warning objects |
| 20 | `I_migration_history` | Migration-history relation availability (`to_regclass` only) |
| 20b | `I_migration_history_versions` | **Optional follow-up:** applied version/name metadata when relation exists (no SQL bodies) |
| 21 | `J_drift_aids` | Compact comparison aids vs expected names |
| 22 | `Z_packet_meta` | Packet meta |

---

## 8. Expected catalog findings (review checklist)

Controller review checklist only (not live claims):

### A — Environment

| Check | Expected |
|---|---|
| Session can read `pg_catalog` | Yes (typically `postgres`) |
| Project ref | Confirmed by Mozfer in UI as `gdegnwglakyblnmxgiwx` |

### B — `respondents` table

| Check | Expected (from source) |
|---|---|
| Exists | Yes |
| RLS enabled | Yes |
| Columns | Match §6.1 set (order may differ) |
| Mobile CHECK | Regex intent `^9665[0-9]{8}$` on `normalized_mobile` |
| Unique active mobile | Partial unique on `(account_id, normalized_mobile) WHERE deleted_at IS NULL` |
| Owner-only SELECT policy | Present after role-safe surfaces |
| Direct UPDATE/DELETE policies | Absent |
| Authenticated privileges | SELECT only |

### C — Functions / CRUD

| Check | Expected |
|---|---|
| `list_respondents` / `get_respondent` / `create_respondent` / `update_respondent` | **Absent** (or unexpected collision → HOLD review) |
| Dedicated respondent mobile normalize helper | Likely **absent** (CHECK only in source) |

### D — Participation boundary

| Check | Expected |
|---|---|
| FK to respondents / projects | Present |
| Unique respondent per project (active) | Partial unique index present |
| Account consistency function/trigger | Present |
| Active-project guard | Present on participations |

### E — Three-month warning

| Check | Expected |
|---|---|
| Dedicated warning RPC/trigger | Likely **no matching object** (informational) |

---

## 9. PASS interpretation (controller, after Mozfer run)

A later review may PASS when, among other checks:

1. Environment readable; Mozfer confirmed project ref.
2. `public.respondents` exists with expected columns and CHECKs.
3. Active mobile uniqueness partial unique index present.
4. RLS enabled; Owner-only SELECT posture; authenticated SELECT-only privileges.
5. No unexpected client UPDATE/DELETE policies or mutation privileges.
6. Participation uniqueness + account consistency + active-project guard present.
7. Respondent CRUD candidates absent (or reconciled if unexpectedly present).
8. No application-row data appeared.
9. No writes occurred.

---

## 10. WARN interpretation (examples)

1. Migration-history table unavailable.
2. CRUD RPCs absent (expected before design) — informational.
3. No dedicated three-month warning function (expected) — informational.
4. Soft-delete UI not present (expected) — not a catalog defect.
5. Minor comment/owner differences without security impact.

---

## 11. HOLD conditions (post-run)

1. Wrong Supabase project / production risk.
2. Material schema mismatch (missing required columns, wrong uniqueness, unexpected finance columns on respondents).
3. RLS disabled or unexpected open mutation grants to authenticated/anon/service_role.
4. Unexpected Respondent CRUD RPC collision without design authority.
5. Application row data / PII appeared in results.
6. Packet was modified to mutate data.
7. Critical catalog sections failed with unreadable errors.

---

## 12. Evidence-export instructions

| Preference | Format |
|---|---|
| Best | Full CSV export of the single result grid |
| Acceptable | Complete screenshots covering every `section_order` |
| Required | Any error text verbatim |

Do not redact section keys. Redact only secrets if any accidentally appear (they should not).

---

## 13. Explicit non-claims

- Live catalog is **not** verified until Mozfer runs this packet and the controller reviews results.
- No production readiness.
- No Respondent application implementation authorized by this file alone.
- Graphify / LeanCTX are not live DB proof.
- Absence of a three-month function name is not behavioral proof of product correctness; design must still verify source intent.

---

## 14. Exact next task after Mozfer runs it

**`ZAM-RESPONDENTS-LIVE-CATALOG-MANUAL-RUN-1`**

Mozfer manually runs the committed packet in project `gdegnwglakyblnmxgiwx` and returns every result section.

---

## 15. Metadata-only SQL packet

```sql
-- =============================================================================
-- ZAM-RESPONDENTS-LIVE-CATALOG-PACKET-1
-- Live DEV/DEMO catalog verification packet (metadata only)
-- Operator-confirmed Supabase project ref: gdegnwglakyblnmxgiwx
-- Safety: READ-ONLY catalog inventory. No DML/DDL/GRANT/REVOKE.
-- No business-row SELECT from domain tables (no PII).
-- Runner: Mozfer only. DEV/DEMO only.
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
    'ZAM-RESPONDENTS-LIVE-CATALOG-PACKET-1'::text AS packet_id,
    ARRAY[
      'list_respondents',
      'get_respondent',
      'create_respondent',
      'update_respondent'
    ]::text[] AS crud_name_candidates,
    ARRAY[
      'id',
      'account_id',
      'name',
      'mobile',
      'normalized_mobile',
      'age',
      'nationality',
      'resident_type',
      'notes',
      'created_by',
      'updated_by',
      'created_at',
      'updated_at',
      'deleted_at'
    ]::text[] AS expected_respondent_columns,
    ARRAY[
      'idx_respondents_unique_mobile_per_account'
    ]::text[] AS expected_respondent_indexes
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
      'search_path', current_setting('search_path', true),
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
-- B. respondents relation / columns / constraints / indexes / triggers
-- ---------------------------------------------------------------------------
section_b_relation AS (
  SELECT
    2 AS section_order,
    'B_respondents_relation'::text AS section_key,
    'relation'::text AS item_key,
    CASE
      WHEN c.oid IS NULL THEN jsonb_build_object('exists', false, 'regclass', 'public.respondents')
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
    ON c.oid = to_regclass('public.respondents')
  LEFT JOIN pg_catalog.pg_namespace AS n
    ON n.oid = c.relnamespace
),

section_b_columns AS (
  SELECT
    3 AS section_order,
    'B_respondents_columns'::text AS section_key,
    a.attname AS item_key,
    jsonb_build_object(
      'column_name', a.attname,
      'ordinal_position', a.attnum,
      'data_type', pg_catalog.format_type(a.atttypid, a.atttypmod),
      'udt_schema', tn.nspname,
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
  JOIN pg_catalog.pg_namespace AS tn
    ON tn.oid = t.typnamespace
  LEFT JOIN pg_catalog.pg_attrdef AS ad
    ON ad.adrelid = a.attrelid
   AND ad.adnum = a.attnum
  WHERE n.nspname = 'public'
    AND c.relname = 'respondents'
    AND a.attnum > 0
    AND NOT a.attisdropped
),

section_b_constraints AS (
  SELECT
    4 AS section_order,
    'B_respondents_constraints'::text AS section_key,
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
    AND c.relname = 'respondents'
),

section_b_indexes AS (
  SELECT
    5 AS section_order,
    'B_respondents_indexes'::text AS section_key,
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
      'predicate', pg_catalog.pg_get_expr(ix.indpred, ix.indrelid),
      'is_unique_mobile_per_account_index',
        (i.relname = 'idx_respondents_unique_mobile_per_account'),
      'columns', (
        SELECT jsonb_agg(a.attname ORDER BY ord.ordinality)
        FROM unnest(ix.indkey) WITH ORDINALITY AS ord(attnum, ordinality)
        JOIN pg_catalog.pg_attribute AS a
          ON a.attrelid = ix.indrelid
         AND a.attnum = ord.attnum
        WHERE ord.attnum > 0
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
    AND t.relname = 'respondents'
),

section_b_triggers AS (
  SELECT
    6 AS section_order,
    'B_respondents_triggers'::text AS section_key,
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
      'function_signature', pn.nspname || '.' || p.proname || '(' || pg_catalog.pg_get_function_identity_arguments(p.oid) || ')',
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
    AND c.relname = 'respondents'
    AND NOT tr.tgisinternal
),

section_b_trigger_defs AS (
  SELECT
    7 AS section_order,
    'B_respondents_trigger_defs'::text AS section_key,
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
    AND c.relname = 'respondents'
    AND NOT tr.tgisinternal
),

-- ---------------------------------------------------------------------------
-- C. resident_type type / enum metadata
-- ---------------------------------------------------------------------------
section_c_resident_type AS (
  SELECT
    8 AS section_order,
    'C_resident_type_type'::text AS section_key,
    COALESCE(t.typname, 'missing') AS item_key,
    CASE
      WHEN a.attname IS NULL THEN jsonb_build_object(
        'column_found', false,
        'column_name', 'resident_type'
      )
      ELSE jsonb_build_object(
        'column_found', true,
        'column_name', a.attname,
        'type_schema', tn.nspname,
        'type_name', t.typname,
        'type_oid', t.oid,
        'typtype', t.typtype,
        'type_kind_label', CASE t.typtype
          WHEN 'b' THEN 'base'
          WHEN 'c' THEN 'composite'
          WHEN 'd' THEN 'domain'
          WHEN 'e' THEN 'enum'
          WHEN 'r' THEN 'range'
          ELSE t.typtype::text
        END,
        'formatted_type', pg_catalog.format_type(a.atttypid, a.atttypmod),
        'enum_labels_ordered', CASE
          WHEN t.typtype = 'e' THEN (
            SELECT jsonb_agg(e.enumlabel ORDER BY e.enumsortorder)
            FROM pg_catalog.pg_enum AS e
            WHERE e.enumtypid = t.oid
          )
          ELSE NULL
        END,
        'source_expected_labels_if_enum_or_check',
          jsonb_build_array('saudi', 'non_saudi', 'unknown'),
        'note', 'Source uses CHECK on text, not necessarily a dedicated enum type; inspect live type_kind_label'
      )
    END AS payload
  FROM (SELECT 1) AS seed
  LEFT JOIN pg_catalog.pg_class AS c
    ON c.oid = to_regclass('public.respondents')
  LEFT JOIN pg_catalog.pg_namespace AS n
    ON n.oid = c.relnamespace
  LEFT JOIN pg_catalog.pg_attribute AS a
    ON a.attrelid = c.oid
   AND a.attname = 'resident_type'
   AND NOT a.attisdropped
  LEFT JOIN pg_catalog.pg_type AS t
    ON t.oid = a.atttypid
  LEFT JOIN pg_catalog.pg_namespace AS tn
    ON tn.oid = t.typnamespace
),

-- ---------------------------------------------------------------------------
-- D. respondents policies + grants
-- ---------------------------------------------------------------------------
section_d_policies AS (
  SELECT
    9 AS section_order,
    'D_policies_respondents'::text AS section_key,
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
      'permissive', pol.polpermissive,
      'roles', (
        SELECT coalesce(jsonb_agg(pg_catalog.pg_get_userbyid(r.roleid) ORDER BY r.roleid), '[]'::jsonb)
        FROM unnest(pol.polroles) AS r(roleid)
      ),
      'using_expression', pg_catalog.pg_get_expr(pol.polqual, pol.polrelid),
      'with_check_expression', pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid)
    ) AS payload
  FROM pg_catalog.pg_policy AS pol
  JOIN pg_catalog.pg_class AS c
    ON c.oid = pol.polrelid
  JOIN pg_catalog.pg_namespace AS n
    ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'respondents'
),

section_d_grants AS (
  SELECT
    10 AS section_order,
    'D_grants_respondents'::text AS section_key,
    r.rolname || ':' || priv.privilege AS item_key,
    jsonb_build_object(
      'relation', 'public.respondents',
      'grantee', r.rolname,
      'role_exists', CASE
        WHEN r.rolname = 'PUBLIC' THEN true
        ELSE EXISTS (SELECT 1 FROM pg_catalog.pg_roles pr WHERE pr.rolname = r.rolname)
      END,
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
        WHEN NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles pr WHERE pr.rolname = r.rolname) THEN NULL
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
    ON rel.oid = to_regclass('public.respondents')
),

-- ---------------------------------------------------------------------------
-- E. Function inventory + EXECUTE ACLs
-- ---------------------------------------------------------------------------
section_e_functions AS (
  SELECT
    11 AS section_order,
    'E_functions_respondent_namespace'::text AS section_key,
    pn.nspname || '.' || p.proname || '(' || pg_catalog.pg_get_function_identity_arguments(p.oid) || ')' AS item_key,
    jsonb_build_object(
      'function_schema', pn.nspname,
      'function_name', p.proname,
      'identity_arguments', pg_catalog.pg_get_function_identity_arguments(p.oid),
      'result_type', pg_catalog.pg_get_function_result(p.oid),
      'prokind', p.prokind,
      'owner', pg_catalog.pg_get_userbyid(p.proowner),
      'language', l.lanname,
      'prosecdef', p.prosecdef,
      'security', CASE WHEN p.prosecdef THEN 'DEFINER' ELSE 'INVOKER' END,
      'leakproof', p.proleakproof,
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
      'proacl', p.proacl::text,
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
        'check_participation_account_consistency',
        'enforce_participation_project_state',
        'set_updated_at',
        'audit_trigger_func',
        'is_owner',
        'is_support_helper',
        'current_account_id',
        'current_profile_id',
        'current_profile_role',
        'current_account_matches',
        'current_profile_matches',
        'support_participation_operational_rows',
        'support_profile_directory',
        'support_project_participation_summary',
        'support_project_directory',
        'normalize_company_phone'
      )
      OR p.proname LIKE '%respondent%'
      OR p.proname LIKE 'list_respondent%'
      OR p.proname LIKE 'get_respondent%'
      OR p.proname LIKE 'create_respondent%'
      OR p.proname LIKE 'update_respondent%'
      OR p.proname LIKE '%normalized_mobile%'
      OR p.proname LIKE '%normalize%mobile%'
      OR p.proname LIKE 'normalize_respondent%'
    )
),

section_e_execute_acls AS (
  SELECT
    12 AS section_order,
    'E_function_execute_acls'::text AS section_key,
    pn.nspname || '.' || p.proname || '(' || pg_catalog.pg_get_function_identity_arguments(p.oid) || '):' || r.rolname AS item_key,
    jsonb_build_object(
      'function_schema', pn.nspname,
      'function_name', p.proname,
      'identity_arguments', pg_catalog.pg_get_function_identity_arguments(p.oid),
      'regprocedure', p.oid::regprocedure::text,
      'grantee', r.rolname,
      'role_exists', CASE
        WHEN r.rolname = 'PUBLIC' THEN true
        ELSE EXISTS (SELECT 1 FROM pg_catalog.pg_roles pr WHERE pr.rolname = r.rolname)
      END,
      'execute', CASE
        WHEN r.rolname = 'PUBLIC' THEN EXISTS (
          SELECT 1
          FROM pg_catalog.aclexplode(
            COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))
          ) AS acl
          WHERE acl.grantee = 0
            AND acl.privilege_type = 'EXECUTE'
        )
        WHEN NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles pr WHERE pr.rolname = r.rolname) THEN NULL
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
    AND (
      p.proname IN (
        'check_participation_account_consistency',
        'enforce_participation_project_state',
        'set_updated_at',
        'audit_trigger_func',
        'is_owner',
        'is_support_helper',
        'current_account_id',
        'current_profile_id',
        'current_profile_role',
        'current_account_matches',
        'current_profile_matches',
        'support_participation_operational_rows',
        'support_profile_directory',
        'support_project_participation_summary',
        'support_project_directory',
        'normalize_company_phone'
      )
      OR p.proname LIKE '%respondent%'
      OR p.proname LIKE 'list_respondent%'
      OR p.proname LIKE 'get_respondent%'
      OR p.proname LIKE 'create_respondent%'
      OR p.proname LIKE 'update_respondent%'
      OR p.proname LIKE '%normalized_mobile%'
      OR p.proname LIKE '%normalize%mobile%'
      OR p.proname LIKE 'normalize_respondent%'
    )
),

section_f_crud_absence AS (
  SELECT
    13 AS section_order,
    'F_crud_candidate_absence'::text AS section_key,
    cand.name AS item_key,
    jsonb_build_object(
      'candidate_name', cand.name,
      'overload_count', (
        SELECT count(*)::integer
        FROM pg_catalog.pg_proc AS p
        JOIN pg_catalog.pg_namespace AS pn ON pn.oid = p.pronamespace
        WHERE pn.nspname = 'public'
          AND p.proname = cand.name
      ),
      'overloads', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'identity_arguments', pg_catalog.pg_get_function_identity_arguments(p.oid),
            'result_type', pg_catalog.pg_get_function_result(p.oid),
            'security', CASE WHEN p.prosecdef THEN 'DEFINER' ELSE 'INVOKER' END,
            'owner', pg_catalog.pg_get_userbyid(p.proowner)
          )
          ORDER BY pg_catalog.pg_get_function_identity_arguments(p.oid)
        )
        FROM pg_catalog.pg_proc AS p
        JOIN pg_catalog.pg_namespace AS pn ON pn.oid = p.pronamespace
        WHERE pn.nspname = 'public'
          AND p.proname = cand.name
      ), '[]'::jsonb),
      'expected_before_design', 'absent',
      'note', 'Unexpected present overload is a collision review item, not automatic PASS'
    ) AS payload
  FROM unnest((SELECT crud_name_candidates FROM params)) AS cand(name)
),

-- ---------------------------------------------------------------------------
-- G. participations boundary metadata
-- ---------------------------------------------------------------------------
section_g_part_relation AS (
  SELECT
    14 AS section_order,
    'G_participations_relation'::text AS section_key,
    'relation'::text AS item_key,
    CASE
      WHEN c.oid IS NULL THEN jsonb_build_object('exists', false, 'regclass', 'public.participations')
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
    ON c.oid = to_regclass('public.participations')
  LEFT JOIN pg_catalog.pg_namespace AS n
    ON n.oid = c.relnamespace
),

section_g_part_constraints AS (
  SELECT
    15 AS section_order,
    'G_participations_constraints'::text AS section_key,
    con.conname AS item_key,
    jsonb_build_object(
      'constraint_name', con.conname,
      'constraint_type', con.contype,
      'constraint_type_label', CASE con.contype
        WHEN 'p' THEN 'primary_key'
        WHEN 'u' THEN 'unique'
        WHEN 'c' THEN 'check'
        WHEN 'f' THEN 'foreign_key'
        ELSE con.contype::text
      END,
      'definition', pg_catalog.pg_get_constraintdef(con.oid, true),
      'convalidated', con.convalidated,
      'foreign_table', CASE
        WHEN con.contype = 'f' THEN (
          SELECT n2.nspname || '.' || c2.relname
          FROM pg_catalog.pg_class AS c2
          JOIN pg_catalog.pg_namespace AS n2 ON n2.oid = c2.relnamespace
          WHERE c2.oid = con.confrelid
        )
        ELSE NULL
      END,
      'is_respondent_fk', (
        con.contype = 'f'
        AND EXISTS (
          SELECT 1
          FROM pg_catalog.pg_class AS c2
          JOIN pg_catalog.pg_namespace AS n2 ON n2.oid = c2.relnamespace
          WHERE c2.oid = con.confrelid
            AND n2.nspname = 'public'
            AND c2.relname = 'respondents'
        )
      ),
      'is_project_fk', (
        con.contype = 'f'
        AND EXISTS (
          SELECT 1
          FROM pg_catalog.pg_class AS c2
          JOIN pg_catalog.pg_namespace AS n2 ON n2.oid = c2.relnamespace
          WHERE c2.oid = con.confrelid
            AND n2.nspname = 'public'
            AND c2.relname = 'projects'
        )
      )
    ) AS payload
  FROM pg_catalog.pg_constraint AS con
  JOIN pg_catalog.pg_class AS c
    ON c.oid = con.conrelid
  JOIN pg_catalog.pg_namespace AS n
    ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'participations'
    AND (
      con.contype IN ('p', 'u', 'f')
      OR pg_catalog.pg_get_constraintdef(con.oid, true) ILIKE '%respondent%'
      OR pg_catalog.pg_get_constraintdef(con.oid, true) ILIKE '%account_id%'
      OR pg_catalog.pg_get_constraintdef(con.oid, true) ILIKE '%project_id%'
    )
),

section_g_part_indexes AS (
  SELECT
    16 AS section_order,
    'G_participations_indexes'::text AS section_key,
    i.relname AS item_key,
    jsonb_build_object(
      'index_name', i.relname,
      'is_unique', ix.indisunique,
      'is_primary', ix.indisprimary,
      'is_valid', ix.indisvalid,
      'is_ready', ix.indisready,
      'definition', pg_catalog.pg_get_indexdef(ix.indexrelid),
      'predicate', pg_catalog.pg_get_expr(ix.indpred, ix.indrelid),
      'is_unique_respondent_per_project_index',
        (i.relname = 'idx_participations_unique_respondent_per_project'),
      'columns', (
        SELECT jsonb_agg(a.attname ORDER BY ord.ordinality)
        FROM unnest(ix.indkey) WITH ORDINALITY AS ord(attnum, ordinality)
        JOIN pg_catalog.pg_attribute AS a
          ON a.attrelid = ix.indrelid
         AND a.attnum = ord.attnum
        WHERE ord.attnum > 0
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
    AND t.relname = 'participations'
    AND (
      i.relname = 'idx_participations_unique_respondent_per_project'
      OR ix.indisunique
      OR pg_catalog.pg_get_indexdef(ix.indexrelid) ILIKE '%respondent%'
      OR pg_catalog.pg_get_indexdef(ix.indexrelid) ILIKE '%project_id%'
    )
),

section_g_part_triggers AS (
  SELECT
    17 AS section_order,
    'G_participations_triggers'::text AS section_key,
    tr.tgname AS item_key,
    jsonb_build_object(
      'trigger_name', tr.tgname,
      'enabled', tr.tgenabled,
      'function_schema', pn.nspname,
      'function_name', p.proname,
      'function_identity_args', pg_catalog.pg_get_function_identity_arguments(p.oid),
      'definition', pg_catalog.pg_get_triggerdef(tr.oid, true),
      'is_account_consistency_trigger', (p.proname = 'check_participation_account_consistency'),
      'is_project_state_guard_trigger', (p.proname = 'enforce_participation_project_state')
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
    AND c.relname = 'participations'
    AND NOT tr.tgisinternal
),

section_g_enforcement_functions AS (
  SELECT
    18 AS section_order,
    'G_participation_enforcement_functions'::text AS section_key,
    pn.nspname || '.' || p.proname || '(' || pg_catalog.pg_get_function_identity_arguments(p.oid) || ')' AS item_key,
    jsonb_build_object(
      'function_schema', pn.nspname,
      'function_name', p.proname,
      'identity_arguments', pg_catalog.pg_get_function_identity_arguments(p.oid),
      'result_type', pg_catalog.pg_get_function_result(p.oid),
      'owner', pg_catalog.pg_get_userbyid(p.proowner),
      'language', l.lanname,
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
      'execute_anon', CASE
        WHEN EXISTS (SELECT 1 FROM pg_catalog.pg_roles pr WHERE pr.rolname = 'anon')
        THEN has_function_privilege('anon', p.oid, 'EXECUTE')
        ELSE NULL
      END,
      'execute_authenticated', CASE
        WHEN EXISTS (SELECT 1 FROM pg_catalog.pg_roles pr WHERE pr.rolname = 'authenticated')
        THEN has_function_privilege('authenticated', p.oid, 'EXECUTE')
        ELSE NULL
      END,
      'execute_service_role', CASE
        WHEN EXISTS (SELECT 1 FROM pg_catalog.pg_roles pr WHERE pr.rolname = 'service_role')
        THEN has_function_privilege('service_role', p.oid, 'EXECUTE')
        ELSE NULL
      END,
      'execute_postgres', CASE
        WHEN EXISTS (SELECT 1 FROM pg_catalog.pg_roles pr WHERE pr.rolname = 'postgres')
        THEN has_function_privilege('postgres', p.oid, 'EXECUTE')
        ELSE NULL
      END,
      'definition', pg_catalog.pg_get_functiondef(p.oid)
    ) AS payload
  FROM pg_catalog.pg_proc AS p
  JOIN pg_catalog.pg_namespace AS pn ON pn.oid = p.pronamespace
  JOIN pg_catalog.pg_language AS l ON l.oid = p.prolang
  WHERE pn.nspname = 'public'
    AND p.proname IN (
      'check_participation_account_consistency',
      'enforce_participation_project_state'
    )
),

-- ---------------------------------------------------------------------------
-- H. Three-month / same-domain warning inventory (metadata name/definition search)
-- ---------------------------------------------------------------------------
section_h_three_month AS (
  SELECT
    19 AS section_order,
    'H_three_month_inventory'::text AS section_key,
    src.source_kind || ':' || src.object_name AS item_key,
    jsonb_build_object(
      'source_kind', src.source_kind,
      'object_name', src.object_name,
      'match_basis', src.match_basis,
      'detail', src.detail,
      'note', 'Name/definition catalog search only; not behavioral proof. Design must still verify source intent.'
    ) AS payload
  FROM (
    SELECT
      'function'::text AS source_kind,
      (pn.nspname || '.' || p.proname || '(' || pg_catalog.pg_get_function_identity_arguments(p.oid) || ')') AS object_name,
      'name_or_definition'::text AS match_basis,
      left(pg_catalog.pg_get_functiondef(p.oid), 500) AS detail
    FROM pg_catalog.pg_proc AS p
    JOIN pg_catalog.pg_namespace AS pn ON pn.oid = p.pronamespace
    WHERE pn.nspname = 'public'
      AND (
        p.proname ILIKE '%three_month%'
        OR p.proname ILIKE '%3_month%'
        OR p.proname ILIKE '%ninety%'
        OR p.proname ILIKE '%same_domain%'
        OR p.proname ILIKE '%domain_warning%'
        OR pg_catalog.pg_get_functiondef(p.oid) ILIKE '%three_month%'
        OR pg_catalog.pg_get_functiondef(p.oid) ILIKE '%3_month%'
        OR pg_catalog.pg_get_functiondef(p.oid) ILIKE '%same_domain%'
        OR pg_catalog.pg_get_functiondef(p.oid) ILIKE '%requires_three_month_warning%'
      )

    UNION ALL

    SELECT
      'view'::text,
      (n.nspname || '.' || c.relname),
      'name_or_definition'::text,
      left(pg_catalog.pg_get_viewdef(c.oid, true), 500)
    FROM pg_catalog.pg_class AS c
    JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('v', 'm')
      AND (
        c.relname ILIKE '%three_month%'
        OR c.relname ILIKE '%same_domain%'
        OR pg_catalog.pg_get_viewdef(c.oid, true) ILIKE '%three_month%'
        OR pg_catalog.pg_get_viewdef(c.oid, true) ILIKE '%same_domain%'
        OR pg_catalog.pg_get_viewdef(c.oid, true) ILIKE '%requires_three_month_warning%'
      )

    UNION ALL

    SELECT
      'trigger'::text,
      (n.nspname || '.' || c.relname || '.' || tr.tgname),
      'name_or_definition'::text,
      left(pg_catalog.pg_get_triggerdef(tr.oid, true), 500)
    FROM pg_catalog.pg_trigger AS tr
    JOIN pg_catalog.pg_class AS c ON c.oid = tr.tgrelid
    JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND NOT tr.tgisinternal
      AND (
        tr.tgname ILIKE '%three_month%'
        OR tr.tgname ILIKE '%same_domain%'
        OR pg_catalog.pg_get_triggerdef(tr.oid, true) ILIKE '%three_month%'
        OR pg_catalog.pg_get_triggerdef(tr.oid, true) ILIKE '%same_domain%'
      )

    UNION ALL

    SELECT
      'policy'::text,
      (n.nspname || '.' || c.relname || '.' || pol.polname),
      'name_or_expression'::text,
      coalesce(pg_catalog.pg_get_expr(pol.polqual, pol.polrelid), '') || ' | ' ||
        coalesce(pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid), '')
    FROM pg_catalog.pg_policy AS pol
    JOIN pg_catalog.pg_class AS c ON c.oid = pol.polrelid
    JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND (
        pol.polname ILIKE '%three_month%'
        OR pol.polname ILIKE '%same_domain%'
        OR coalesce(pg_catalog.pg_get_expr(pol.polqual, pol.polrelid), '') ILIKE '%three_month%'
        OR coalesce(pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid), '') ILIKE '%three_month%'
      )

    UNION ALL

    SELECT
      'index'::text,
      (n.nspname || '.' || i.relname),
      'name_or_definition'::text,
      pg_catalog.pg_get_indexdef(ix.indexrelid)
    FROM pg_catalog.pg_index AS ix
    JOIN pg_catalog.pg_class AS t ON t.oid = ix.indrelid
    JOIN pg_catalog.pg_namespace AS n ON n.oid = t.relnamespace
    JOIN pg_catalog.pg_class AS i ON i.oid = ix.indexrelid
    WHERE n.nspname = 'public'
      AND (
        i.relname ILIKE '%three_month%'
        OR i.relname ILIKE '%same_domain%'
        OR pg_catalog.pg_get_indexdef(ix.indexrelid) ILIKE '%three_month%'
      )

    UNION ALL

    SELECT
      'column_projects_flag'::text,
      'public.projects.requires_three_month_warning',
      'column_presence'::text,
      CASE
        WHEN a.attname IS NULL THEN 'column_not_found'
        ELSE 'column_present type=' || pg_catalog.format_type(a.atttypid, a.atttypmod)
      END
    FROM (SELECT 1) AS seed
    LEFT JOIN pg_catalog.pg_class AS c
      ON c.oid = to_regclass('public.projects')
    LEFT JOIN pg_catalog.pg_attribute AS a
      ON a.attrelid = c.oid
     AND a.attname = 'requires_three_month_warning'
     AND NOT a.attisdropped
  ) AS src

  UNION ALL

  SELECT
    19 AS section_order,
    'H_three_month_inventory'::text AS section_key,
    'summary'::text AS item_key,
    jsonb_build_object(
      'matching_object_count_excluding_summary', (
        SELECT count(*)::integer
        FROM (
          SELECT 1
          FROM pg_catalog.pg_proc AS p
          JOIN pg_catalog.pg_namespace AS pn ON pn.oid = p.pronamespace
          WHERE pn.nspname = 'public'
            AND (
              p.proname ILIKE '%three_month%'
              OR p.proname ILIKE '%same_domain%'
              OR pg_catalog.pg_get_functiondef(p.oid) ILIKE '%requires_three_month_warning%'
            )
        ) AS q
      ),
      'label_if_empty', 'no matching catalog object found',
      'interpretation', 'Absence of warning RPC/trigger is informational expected state before design; not a product PASS'
    ) AS payload
),

-- ---------------------------------------------------------------------------
-- I. Migration history availability (best-effort; no SQL bodies; no hard dependency)
-- Uses to_regclass only so a missing migration-history relation does not fail the packet.
-- If available=true for supabase_migrations.schema_migrations, Mozfer also runs the
-- OPTIONAL Section I2 query after this packet (separate statement; not in this WITH).
-- ---------------------------------------------------------------------------
section_i_migration_history AS (
  SELECT
    20 AS section_order,
    'I_migration_history'::text AS section_key,
    'availability'::text AS item_key,
    jsonb_build_object(
      'supabase_migrations_schema_migrations',
        to_regclass('supabase_migrations.schema_migrations')::text,
      'public_schema_migrations',
        to_regclass('public.schema_migrations')::text,
      'available',
        (to_regclass('supabase_migrations.schema_migrations') IS NOT NULL
          OR to_regclass('public.schema_migrations') IS NOT NULL),
      'preferred_relation',
        CASE
          WHEN to_regclass('supabase_migrations.schema_migrations') IS NOT NULL
            THEN 'supabase_migrations.schema_migrations'
          WHEN to_regclass('public.schema_migrations') IS NOT NULL
            THEN 'public.schema_migrations'
          ELSE NULL
        END,
      'note',
        CASE
          WHEN to_regclass('supabase_migrations.schema_migrations') IS NULL
           AND to_regclass('public.schema_migrations') IS NULL
          THEN 'unavailable/not-accessible — no migration-history relation found via to_regclass; skip OPTIONAL Section I2; do not fail the whole packet'
          WHEN to_regclass('supabase_migrations.schema_migrations') IS NOT NULL
          THEN 'relation present via to_regclass; run OPTIONAL Section I2 for bounded applied versions (no SQL bodies)'
          ELSE 'only public.schema_migrations present via to_regclass; Section I2 targets supabase_migrations.schema_migrations — if I2 errors, record error exactly and continue'
        END,
      'optional_follow_up',
        'I_migration_history_versions (run only when supabase_migrations.schema_migrations is available)',
      'relevant_source_migration_filenames_static',
        jsonb_build_array(
          '202607060001_zamblak_core_schema.sql',
          '202607130001_participation_project_state_guard.sql',
          '202607130002_role_safe_read_surfaces.sql',
          '20260715120000_harden_core_acl_defaults.sql',
          '20260716120000_companies_mvp_schema_rpc.sql',
          '20260716160000_projects_mvp_schema_rpc.sql',
          '20260716170000_projects_mvp_rpc_corrections.sql'
        )
    ) AS payload
),

-- ---------------------------------------------------------------------------
-- J. Drift-review comparison aids (catalog only)
-- ---------------------------------------------------------------------------
section_j_drift AS (
  SELECT
    21 AS section_order,
    'J_drift_aids'::text AS section_key,
    'expected_columns_vs_live'::text AS item_key,
    jsonb_build_object(
      'expected_columns', (SELECT expected_respondent_columns FROM params),
      'live_columns', COALESCE((
        SELECT jsonb_agg(a.attname ORDER BY a.attnum)
        FROM pg_catalog.pg_attribute AS a
        JOIN pg_catalog.pg_class AS c ON c.oid = a.attrelid
        JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = 'respondents'
          AND a.attnum > 0
          AND NOT a.attisdropped
      ), '[]'::jsonb),
      'missing_from_live', COALESCE((
        SELECT jsonb_agg(exp.col ORDER BY exp.ord)
        FROM unnest((SELECT expected_respondent_columns FROM params))
          WITH ORDINALITY AS exp(col, ord)
        WHERE NOT EXISTS (
          SELECT 1
          FROM pg_catalog.pg_attribute AS a
          JOIN pg_catalog.pg_class AS c ON c.oid = a.attrelid
          JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public'
            AND c.relname = 'respondents'
            AND a.attnum > 0
            AND NOT a.attisdropped
            AND a.attname = exp.col
        )
      ), '[]'::jsonb),
      'extra_on_live', COALESCE((
        SELECT jsonb_agg(a.attname ORDER BY a.attnum)
        FROM pg_catalog.pg_attribute AS a
        JOIN pg_catalog.pg_class AS c ON c.oid = a.attrelid
        JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = 'respondents'
          AND a.attnum > 0
          AND NOT a.attisdropped
          AND a.attname::text <> ALL ((SELECT expected_respondent_columns FROM params))
      ), '[]'::jsonb)
    ) AS payload

  UNION ALL

  SELECT
    21,
    'J_drift_aids',
    'crud_candidates_vs_live',
    jsonb_build_object(
      'candidates', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'name', cand.name,
            'overload_count', (
              SELECT count(*)::integer
              FROM pg_catalog.pg_proc AS p
              JOIN pg_catalog.pg_namespace AS pn ON pn.oid = p.pronamespace
              WHERE pn.nspname = 'public'
                AND p.proname = cand.name
            )
          )
          ORDER BY cand.name
        )
        FROM unnest((SELECT crud_name_candidates FROM params)) AS cand(name)
      )
    )

  UNION ALL

  SELECT
    21,
    'J_drift_aids',
    'expected_indexes_vs_live',
    jsonb_build_object(
      'expected_indexes', (SELECT expected_respondent_indexes FROM params),
      'live_respondent_indexes', COALESCE((
        SELECT jsonb_agg(i.relname ORDER BY i.relname)
        FROM pg_catalog.pg_index AS ix
        JOIN pg_catalog.pg_class AS t ON t.oid = ix.indrelid
        JOIN pg_catalog.pg_namespace AS n ON n.oid = t.relnamespace
        JOIN pg_catalog.pg_class AS i ON i.oid = ix.indexrelid
        WHERE n.nspname = 'public'
          AND t.relname = 'respondents'
      ), '[]'::jsonb),
      'unique_mobile_index_present', EXISTS (
        SELECT 1
        FROM pg_catalog.pg_class AS i
        JOIN pg_catalog.pg_namespace AS n ON n.oid = i.relnamespace
        WHERE n.nspname = 'public'
          AND i.relname = 'idx_respondents_unique_mobile_per_account'
      )
    )

  UNION ALL

  SELECT
    21,
    'J_drift_aids',
    'policy_and_trigger_counts',
    jsonb_build_object(
      'respondents_policy_count', (
        SELECT count(*)::integer
        FROM pg_catalog.pg_policy AS pol
        JOIN pg_catalog.pg_class AS c ON c.oid = pol.polrelid
        JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = 'respondents'
      ),
      'respondents_policy_commands', COALESCE((
        SELECT jsonb_agg(DISTINCT CASE pol.polcmd
          WHEN 'r' THEN 'SELECT'
          WHEN 'a' THEN 'INSERT'
          WHEN 'w' THEN 'UPDATE'
          WHEN 'd' THEN 'DELETE'
          WHEN '*' THEN 'ALL'
          ELSE pol.polcmd::text
        END)
        FROM pg_catalog.pg_policy AS pol
        JOIN pg_catalog.pg_class AS c ON c.oid = pol.polrelid
        JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = 'respondents'
      ), '[]'::jsonb),
      'respondents_trigger_count', (
        SELECT count(*)::integer
        FROM pg_catalog.pg_trigger AS tr
        JOIN pg_catalog.pg_class AS c ON c.oid = tr.tgrelid
        JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = 'respondents'
          AND NOT tr.tgisinternal
      ),
      'participations_unique_respondent_index_present', EXISTS (
        SELECT 1
        FROM pg_catalog.pg_class AS i
        JOIN pg_catalog.pg_namespace AS n ON n.oid = i.relnamespace
        WHERE n.nspname = 'public'
          AND i.relname = 'idx_participations_unique_respondent_per_project'
      )
    )
),

-- ---------------------------------------------------------------------------
-- Z. Packet meta
-- ---------------------------------------------------------------------------
section_z AS (
  SELECT
    22 AS section_order,
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
      'finance_row_queries', false,
      'pii_row_queries', false,
      'next_task_after_export', 'ZAM-RESPONDENTS-LIVE-CATALOG-MANUAL-RUN-1',
      'notes', ARRAY[
        'Metadata/catalog only',
        'Do not SELECT application rows',
        'Do not pre-label overall PASS/FAIL in SQL',
        'CRUD candidate absence is expected before design',
        'Three-month search is inventory only',
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
UNION ALL SELECT * FROM section_c_resident_type
UNION ALL SELECT * FROM section_d_policies
UNION ALL SELECT * FROM section_d_grants
UNION ALL SELECT * FROM section_e_functions
UNION ALL SELECT * FROM section_e_execute_acls
UNION ALL SELECT * FROM section_f_crud_absence
UNION ALL SELECT * FROM section_g_part_relation
UNION ALL SELECT * FROM section_g_part_constraints
UNION ALL SELECT * FROM section_g_part_indexes
UNION ALL SELECT * FROM section_g_part_triggers
UNION ALL SELECT * FROM section_g_enforcement_functions
UNION ALL SELECT * FROM section_h_three_month
UNION ALL SELECT * FROM section_i_migration_history
UNION ALL SELECT * FROM section_j_drift
UNION ALL SELECT * FROM section_z
ORDER BY section_order, item_key;
```

### Optional Section I2 — applied migration versions (metadata only)

**When to run**

- Run this **only if** main-packet Section `I_migration_history` shows
  `supabase_migrations.schema_migrations` present / `available` true for that preferred relation
  (repository-authoritative Supabase migration-history relation).
- If the relation is **missing or inaccessible**, **do not run** this query. Record
  `unavailable/not-accessible` for migration versions and **continue**.
  Absence of migration history alone **does not** invalidate the other catalog results.
- If this query errors (permission, missing column, etc.), **return the SQL error exactly as shown** and continue. Do not invent rows.
- Do **not** paste this statement into the same execution as the main packet unless Section I already confirmed the relation exists.

**Safety**

- Read-only: single `SELECT` only.
- Returns **version**, **name** (when the live relation provides it), and a **statement count** derived only as array length metadata.
- Does **not** return migration SQL bodies, statement text, or statement array contents.
- Does **not** read application rows, PII, finance data, or secrets.

**Expected-result notes**

- Zero rows for a listed version prefix means that version string was not found as applied under the filter (not automatically a packet failure).
- Controller compares returned versions against static source filenames in §16.
- Column layout of `schema_migrations` can vary by Supabase/Postgres host; report any column error verbatim.

```sql
-- =============================================================================
-- OPTIONAL — ZAM-RESPONDENTS-LIVE-CATALOG-PACKET-1 / Section I2
-- Applied migration versions (metadata only)
-- Run ONLY after Section I confirms supabase_migrations.schema_migrations exists.
-- If relation missing/inaccessible: skip; record unavailable; continue other results.
-- Safety: READ-ONLY. No SQL bodies. No application rows. DEV/DEMO only.
-- Project ref (UI confirm): gdegnwglakyblnmxgiwx
-- =============================================================================

SELECT
  'I_migration_history_versions'::text AS section_key,
  m.version,
  m.name,
  CASE
    WHEN m.statements IS NULL THEN NULL
    ELSE cardinality(m.statements)
  END AS statement_count_metadata_only
FROM supabase_migrations.schema_migrations AS m
WHERE
  -- Bounded filter: relevant repository migration version prefixes only
  m.version ~ '^(202607060001|202607130001|202607130002|20260715120000|20260716120000|20260716160000|20260716170000)(_|$)'
ORDER BY m.version;
```

**Relevant version prefixes (from repository filenames under `supabase/migrations/`)**

| Version prefix | Repository file | Relevance |
|---|---|---|
| `202607060001` | `202607060001_zamblak_core_schema.sql` | core schema / respondents |
| `202607130001` | `202607130001_participation_project_state_guard.sql` | Participation Project-state guard |
| `202607130002` | `202607130002_role_safe_read_surfaces.sql` | role-safe read surfaces |
| `20260715120000` | `20260715120000_harden_core_acl_defaults.sql` | core ACL hardening |
| `20260716120000` | `20260716120000_companies_mvp_schema_rpc.sql` | shared security helpers (Companies) |
| `20260716160000` | `20260716160000_projects_mvp_schema_rpc.sql` | Projects domain context |
| `20260716170000` | `20260716170000_projects_mvp_rpc_corrections.sql` | Projects corrections context |

---

## 16. Source migration references (static)

| Migration | Relevance |
|---|---|
| `supabase/migrations/202607060001_zamblak_core_schema.sql` | `respondents`, participations FKs/unique, CHECKs, base policies, triggers |
| `supabase/migrations/202607130001_participation_project_state_guard.sql` | active-project participation guard |
| `supabase/migrations/202607130002_role_safe_read_surfaces.sql` | Owner SELECT, support RPCs, hardened policies |
| `supabase/migrations/20260715120000_harden_core_acl_defaults.sql` | authenticated SELECT-only on core tables |
| `supabase/migrations/20260716120000_companies_mvp_schema_rpc.sql` | shared helper posture / migration history context |
| `supabase/migrations/20260716160000_projects_mvp_schema_rpc.sql` | projects domain context |
| `supabase/migrations/20260716170000_projects_mvp_rpc_corrections.sql` | projects corrections context |

---

## 17. After Mozfer run (template for later result-close)

| Field | Value |
|---|---|
| Runner | Mozfer |
| Project | `gdegnwglakyblnmxgiwx` |
| Decision | _pending_ |
| PG version | _from export_ |
| Respondents columns | _from B_respondents_columns_ |
| Unique mobile index | _from B_respondents_indexes / J_drift_aids_ |
| Policies / grants | _from D_*_ |
| CRUD RPC absence | _from F_crud_candidate_absence_ |
| Participation guard / uniqueness | _from G_*_ |
| Three-month inventory | _from H_three_month_inventory_ |
| Next task after export | `ZAM-RESPONDENTS-LIVE-CATALOG-MANUAL-RUN-1` |
