# Respondents MVP — DEV/DEMO apply and post-apply verification packet

## 1. Status and authority

| Field | Value |
|---|---|
| **Packet status** | **Prepared only** — not applied |
| **Task** | `ZAM-RESPONDENTS-SCHEMA-RPC-DEV-APPLY-PACKET-1` |
| **Agent SQL execution** | **Forbidden** |
| **Agent Supabase connection** | **Forbidden** |
| **Migration apply by agent** | **Forbidden** |
| **Manual runner** | **Mozfer only** |
| **Environment** | **DEV/DEMO only** |
| **Production readiness** | **Not claimed** |

**Authority**

| Source | Role |
|---|---|
| `docs/respondents-schema-rpc-design.md` | Frozen design |
| `supabase/migrations/20260717120000_respondents_mvp_schema_rpc.sql` @ `e6061af` | **Only** apply SQL source |
| `ZAM-RESPONDENTS-SCHEMA-RPC-MIGRATION-1` | Migration implementation |
| `ZAM-RESPONDENTS-SCHEMA-RPC-MIGRATION-REVIEW-1` | Independent review **PASS WITH WARN** |
| Live catalog | `docs/respondents-live-catalog-verification.md` (historical pre-apply catalog) |

### Review warnings carried (nonblocking)

| ID | Warning | Closed by this packet? |
|---|---|---|
| F1 | Migration postcondition did not test every table privilege for anon/service_role | **Yes** — §7 full 7×4 ACL matrix |
| F2 | Migration postcondition checked `sel_respondents` mainly by name/command | **Yes** — §7 policy expression semantics |
| F3 | Migration trigger assertions name-only | **Yes** — §7 enabled + function identity |
| F4 | Digit-only mobile search probe may overmatch mixed text | **No** — design-accepted; not apply-blocking |
| F5 | Graphify metadata lag after SQL-only change | **No** — accepted; not apply-blocking |

---

## 2. Exact environment

| Field | Required value |
|---|---|
| Supabase project ref | **`gdegnwglakyblnmxgiwx`** |
| Environment | DEV/DEMO only — **not** customer production |
| PostgreSQL | **17.6** (expected) |
| SQL Editor session role | **`postgres`** |
| Runner | Mozfer |

PostgreSQL does not expose the Supabase project ref. Mozfer must confirm the Dashboard project ref **in the UI** before any SQL.

---

## 3. Migration identity and SHA-256

| Field | Value |
|---|---|
| Commit | `e6061af63724f54f0177da29ff4b30a352ff4944` |
| Migration file | `supabase/migrations/20260717120000_respondents_mvp_schema_rpc.sql` |
| Migration task | `ZAM-RESPONDENTS-SCHEMA-RPC-MIGRATION-1` |
| Review task | `ZAM-RESPONDENTS-SCHEMA-RPC-MIGRATION-REVIEW-1` |
| Review verdict | **PASS WITH WARN** |
| Committed git blob | `bf42b04967dd156067cd6ada998ee783a4ca8f56` |
| **SHA-256** | **`BA9B1D4558DFB27DD94625FD231941FF17A462E6B5FEA4EB9C5D0F2C44B03F32`** |

**Do not paste the full 1207-line migration into this document.**  
The committed file above is the **only** apply SQL source of truth.

**Local SHA-256 check (Mozfer, before apply):**

```powershell
Get-FileHash -Algorithm SHA256 supabase/migrations/20260717120000_respondents_mvp_schema_rpc.sql
```

Expected Hash: `BA9B1D4558DFB27DD94625FD231941FF17A462E6B5FEA4EB9C5D0F2C44B03F32`

If the hash differs, **STOP** and return HOLD to the controller. Do not apply.

---

## 4. Pre-apply checklist

Mozfer must confirm **all** of the following before running any SQL:

- [ ] Selected Supabase project ref is exactly **`gdegnwglakyblnmxgiwx`**
- [ ] Project is **DEV/DEMO**, not customer production
- [ ] SQL Editor session role is **`postgres`**
- [ ] Migration source is from commit **`e6061af`**
- [ ] Local file SHA-256 matches **`BA9B1D4558DFB27DD94625FD231941FF17A462E6B5FEA4EB9C5D0F2C44B03F32`**
- [ ] Complete migration will be copied from **first line through final `COMMIT;`**
- [ ] No edited, partial, or retyped migration copy
- [ ] No known previous **partial successful** apply of this migration
- [ ] SQL Editor tab contains **no** unrelated statements

---

## 5. Exact manual apply steps

1. Open Supabase project **`gdegnwglakyblnmxgiwx`**.
2. Confirm DEV/DEMO in the Dashboard UI.
3. Open **SQL Editor**.
4. Confirm session role is **`postgres`**.
5. Create a **new** query.
6. Open the committed file  
   `supabase/migrations/20260717120000_respondents_mvp_schema_rpc.sql`  
   and copy the **complete** contents (line 1 through final `COMMIT;`).
7. Paste into the new SQL Editor query.
8. **Do not** append the verification query.
9. Run the migration **exactly once**.
10. On **any** error → go to §6 (HOLD/error procedure). **Do not rerun.**
11. On **success** → create a **separate** new SQL Editor query.
12. Paste **only** the single verification query from §7.
13. Run the verification query **exactly once**.
14. Export or copy the complete ordered result (CSV preferred).

**Critical:** Migration SQL and verification SQL must **never** be pasted or run together.

---

## 6. Immediate HOLD and error procedure

**Stop immediately** and return evidence if any of the following occur:

| Condition | Action |
|---|---|
| Project ref ≠ `gdegnwglakyblnmxgiwx` | Do not run SQL; report HOLD |
| Session is not `postgres` | Do not run SQL; report HOLD |
| SHA-256 differs | Do not apply; report HOLD |
| Migration apply returns any error | Stop; do not rerun; do not edit SQL in Supabase; do not cleanup; copy exact error + line + context |
| Verification returns any error | Stop; do not rerun; copy exact error |
| Any mandatory verification status is `FAIL` | Report HOLD with full result |
| Missing object / unexpected overload | Report HOLD |
| Forbidden EXECUTE or table privilege is true | Report HOLD |
| Policy semantics differ | Report HOLD |
| Trigger identity or enabled state differs | Report HOLD |
| Unique index differs | Report HOLD |
| Application rows or PII appear | Report HOLD; stop |

**Do not:**

- edit SQL inside Supabase after failure;
- run DROP/cleanup SQL;
- assume success after error;
- start browser or application smoke.

---

## 7. Exact post-apply verification query

Copy **only** the block below into a **new** SQL Editor query **after** a successful migration apply. Run **once**.

```sql
-- =============================================================================
-- ZAM-RESPONDENTS-SCHEMA-RPC-DEV-APPLY-PACKET-1
-- Post-apply verification (metadata only) — DEV/DEMO gdegnwglakyblnmxgiwx
-- Runner: Mozfer only. Role: postgres. READ-ONLY.
-- Do NOT run with the migration. Do NOT select application rows / PII.
-- Output: section_order, section_key, item_key, status, payload
-- =============================================================================

WITH
params AS (
  SELECT
    ARRAY[
      'normalize_respondent_mobile(text)',
      'list_respondents(text,integer,integer)',
      'get_respondent(uuid)',
      'create_respondent(text,text,integer,text,text,text)',
      'update_respondent(uuid,text,timestamp with time zone,text,integer,text,text,text)'
    ]::text[] AS exact_identities,
    ARRAY[
      'normalize_respondent_mobile',
      'list_respondents',
      'get_respondent',
      'create_respondent',
      'update_respondent'
    ]::text[] AS target_names,
    ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']::text[] AS table_privs,
    ARRAY['PUBLIC', 'anon', 'authenticated', 'service_role']::text[] AS acl_roles
),

-- ---------------------------------------------------------------------------
-- A. Environment (no project-ref proof; Mozfer confirms UI)
-- ---------------------------------------------------------------------------
section_a AS (
  SELECT
    1 AS section_order,
    'A_environment'::text AS section_key,
    'session'::text AS item_key,
    'INFO'::text AS status,
    jsonb_build_object(
      'current_database', current_database(),
      'current_user', current_user,
      'session_user', session_user,
      'server_version', version(),
      'note', 'Confirm Supabase project ref gdegnwglakyblnmxgiwx in Dashboard UI'
    ) AS payload
),

-- ---------------------------------------------------------------------------
-- B. Exact function inventory
-- ---------------------------------------------------------------------------
fn_resolved AS (
  SELECT
    ident,
    to_regprocedure('public.' || ident) AS fn_oid
  FROM unnest((SELECT exact_identities FROM params)) AS ident
),
section_b_inventory AS (
  SELECT
    2 AS section_order,
    'B_function_inventory'::text AS section_key,
    fr.ident AS item_key,
    CASE WHEN fr.fn_oid IS NOT NULL THEN 'PASS' ELSE 'FAIL' END AS status,
    jsonb_build_object(
      'identity', fr.ident,
      'oid', fr.fn_oid,
      'exists', fr.fn_oid IS NOT NULL
    ) AS payload
  FROM fn_resolved AS fr
),
section_b_overloads AS (
  SELECT
    2 AS section_order,
    'B_function_inventory'::text AS section_key,
    'overload_count:' || tn AS item_key,
    CASE WHEN COALESCE(cnt.n, 0) = 1 THEN 'PASS' ELSE 'FAIL' END AS status,
    jsonb_build_object(
      'function_name', tn,
      'public_overload_count', COALESCE(cnt.n, 0),
      'expected', 1
    ) AS payload
  FROM unnest((SELECT target_names FROM params)) AS tn
  LEFT JOIN LATERAL (
    SELECT count(*)::integer AS n
    FROM pg_catalog.pg_proc AS p
    JOIN pg_catalog.pg_namespace AS nsp ON nsp.oid = p.pronamespace
    WHERE nsp.nspname = 'public'
      AND p.proname = tn
  ) AS cnt ON true
),

-- ---------------------------------------------------------------------------
-- C. Function posture (volatility, security, search_path, owner, comment)
-- ---------------------------------------------------------------------------
section_c_posture AS (
  SELECT
    3 AS section_order,
    'C_function_posture'::text AS section_key,
    fr.ident AS item_key,
    CASE
      WHEN fr.fn_oid IS NULL THEN 'FAIL'
      WHEN fr.ident = 'normalize_respondent_mobile(text)'
        AND p.provolatile = 'i'
        AND p.proparallel = 's'
        AND p.prosecdef = false
        AND pg_catalog.pg_get_userbyid(p.proowner) = 'postgres'
        AND EXISTS (
          SELECT 1 FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
          WHERE cfg IN ('search_path=pg_catalog, public', 'search_path=pg_catalog,public')
        )
        AND COALESCE(obj_description(fr.fn_oid, 'pg_proc'), '') ILIKE '%managed_by: 20260717120000_respondents_mvp_schema_rpc%'
        THEN 'PASS'
      WHEN fr.ident IN (
          'list_respondents(text,integer,integer)',
          'get_respondent(uuid)'
        )
        AND p.provolatile = 's'
        AND p.prosecdef = true
        AND pg_catalog.pg_get_userbyid(p.proowner) = 'postgres'
        AND EXISTS (
          SELECT 1 FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
          WHERE cfg IN ('search_path=pg_catalog, public', 'search_path=pg_catalog,public')
        )
        AND COALESCE(obj_description(fr.fn_oid, 'pg_proc'), '') ILIKE '%managed_by: 20260717120000_respondents_mvp_schema_rpc%'
        THEN 'PASS'
      WHEN fr.ident IN (
          'create_respondent(text,text,integer,text,text,text)',
          'update_respondent(uuid,text,timestamp with time zone,text,integer,text,text,text)'
        )
        AND p.provolatile = 'v'
        AND p.prosecdef = true
        AND pg_catalog.pg_get_userbyid(p.proowner) = 'postgres'
        AND EXISTS (
          SELECT 1 FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
          WHERE cfg IN ('search_path=pg_catalog, public', 'search_path=pg_catalog,public')
        )
        AND COALESCE(obj_description(fr.fn_oid, 'pg_proc'), '') ILIKE '%managed_by: 20260717120000_respondents_mvp_schema_rpc%'
        THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    jsonb_build_object(
      'identity', fr.ident,
      'exists', fr.fn_oid IS NOT NULL,
      'prokind', p.prokind,
      'provolatile', p.provolatile,
      'proparallel', p.proparallel,
      'prosecdef', p.prosecdef,
      'security', CASE WHEN p.prosecdef THEN 'DEFINER' ELSE 'INVOKER' END,
      'owner', pg_catalog.pg_get_userbyid(p.proowner),
      'proconfig', to_jsonb(p.proconfig),
      'comment', obj_description(fr.fn_oid, 'pg_proc')
    ) AS payload
  FROM fn_resolved AS fr
  LEFT JOIN pg_catalog.pg_proc AS p ON p.oid = fr.fn_oid
),

-- ---------------------------------------------------------------------------
-- D. EXECUTE ACL matrix (PUBLIC = OID 0)
-- ---------------------------------------------------------------------------
fn_execute AS (
  SELECT
    fr.ident,
    fr.fn_oid,
    r.rolename,
    CASE
      WHEN fr.fn_oid IS NULL THEN NULL
      WHEN r.rolename = 'PUBLIC' THEN EXISTS (
        SELECT 1
        FROM aclexplode(COALESCE(
          (SELECT p.proacl FROM pg_catalog.pg_proc AS p WHERE p.oid = fr.fn_oid),
          acldefault('f', (SELECT p.proowner FROM pg_catalog.pg_proc AS p WHERE p.oid = fr.fn_oid))
        )) AS acl
        WHERE acl.grantee = 0
          AND acl.privilege_type = 'EXECUTE'
      )
      WHEN NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles pr WHERE pr.rolname = r.rolename)
        THEN NULL
      ELSE has_function_privilege(r.rolename, fr.fn_oid, 'EXECUTE')
    END AS has_execute,
    CASE
      WHEN fr.ident = 'normalize_respondent_mobile(text)' THEN false
      WHEN r.rolename = 'authenticated' THEN true
      ELSE false
    END AS expected_execute
  FROM fn_resolved AS fr
  CROSS JOIN (
    SELECT unnest(ARRAY['PUBLIC', 'anon', 'authenticated', 'service_role']::text[]) AS rolename
  ) AS r
),
section_d_execute AS (
  SELECT
    4 AS section_order,
    'D_execute_acl'::text AS section_key,
    fe.ident || ':' || fe.rolename AS item_key,
    CASE
      WHEN fe.fn_oid IS NULL THEN 'FAIL'
      WHEN fe.has_execute IS NULL THEN 'FAIL'
      WHEN fe.has_execute IS NOT DISTINCT FROM fe.expected_execute THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    jsonb_build_object(
      'identity', fe.ident,
      'role', fe.rolename,
      'expected_execute', fe.expected_execute,
      'actual_execute', fe.has_execute
    ) AS payload
  FROM fn_execute AS fe
),

-- ---------------------------------------------------------------------------
-- E. Relation existence + RLS (closes surface for F2)
-- ---------------------------------------------------------------------------
section_e_relation AS (
  SELECT
    5 AS section_order,
    'E_relation_rls'::text AS section_key,
    'public.respondents'::text AS item_key,
    CASE
      WHEN c.oid IS NOT NULL
        AND c.relkind = 'r'
        AND c.relrowsecurity
        AND NOT c.relforcerowsecurity
        THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    jsonb_build_object(
      'exists', c.oid IS NOT NULL,
      'relkind', c.relkind,
      'owner', pg_catalog.pg_get_userbyid(c.relowner),
      'rls_enabled', c.relrowsecurity,
      'rls_forced', c.relforcerowsecurity
    ) AS payload
  FROM (SELECT 1) AS seed
  LEFT JOIN pg_catalog.pg_class AS c
    ON c.oid = to_regclass('public.respondents')
),

-- ---------------------------------------------------------------------------
-- F. Full table ACL matrix 7 privileges × 4 roles (closes F1)
-- ---------------------------------------------------------------------------
table_acl AS (
  SELECT
    r.rolename,
    priv.privname,
    CASE
      WHEN to_regclass('public.respondents') IS NULL THEN NULL
      WHEN r.rolename = 'PUBLIC' THEN EXISTS (
        SELECT 1
        FROM aclexplode(COALESCE(
          (
            SELECT c.relacl
            FROM pg_catalog.pg_class AS c
            JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relname = 'respondents'
          ),
          acldefault(
            'r',
            (
              SELECT c.relowner
              FROM pg_catalog.pg_class AS c
              JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
              WHERE n.nspname = 'public' AND c.relname = 'respondents'
            )
          )
        )) AS acl
        WHERE acl.grantee = 0
          AND acl.privilege_type = priv.privname
      )
      WHEN NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles pr WHERE pr.rolname = r.rolename)
        THEN NULL
      ELSE has_table_privilege(r.rolename, 'public.respondents', priv.privname)
    END AS actual,
    CASE
      WHEN r.rolename = 'authenticated' AND priv.privname = 'SELECT' THEN true
      ELSE false
    END AS expected
  FROM (SELECT unnest(ARRAY['PUBLIC', 'anon', 'authenticated', 'service_role']::text[]) AS rolename) AS r
  CROSS JOIN (
    SELECT unnest(ARRAY[
      'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'
    ]::text[]) AS privname
  ) AS priv
),
section_f_table_acl AS (
  SELECT
    6 AS section_order,
    'F_table_acl'::text AS section_key,
    ta.rolename || ':' || ta.privname AS item_key,
    CASE
      WHEN ta.actual IS NULL THEN 'FAIL'
      WHEN ta.actual IS NOT DISTINCT FROM ta.expected THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    jsonb_build_object(
      'role', ta.rolename,
      'privilege', ta.privname,
      'expected', ta.expected,
      'actual', ta.actual
    ) AS payload
  FROM table_acl AS ta
),

-- ---------------------------------------------------------------------------
-- G. Policies (closes F2)
-- ---------------------------------------------------------------------------
section_g_policy_count AS (
  SELECT
    7 AS section_order,
    'G_policies'::text AS section_key,
    'policy_inventory'::text AS item_key,
    CASE
      WHEN count(*) FILTER (WHERE pol.cmd = 'UPDATE') = 0
        AND count(*) FILTER (WHERE pol.cmd = 'DELETE') = 0
        AND count(*) = 2
        THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    jsonb_build_object(
      'policy_count', count(*),
      'expected_count', 2,
      'update_policies', count(*) FILTER (WHERE pol.cmd = 'UPDATE'),
      'delete_policies', count(*) FILTER (WHERE pol.cmd = 'DELETE'),
      'policies', COALESCE(jsonb_agg(jsonb_build_object(
        'name', pol.policyname,
        'cmd', pol.cmd,
        'roles', to_jsonb(pol.roles),
        'permissive', pol.permissive
      ) ORDER BY pol.policyname), '[]'::jsonb)
    ) AS payload
  FROM pg_catalog.pg_policies AS pol
  WHERE pol.schemaname = 'public'
    AND pol.tablename = 'respondents'
),
section_g_sel AS (
  SELECT
    7 AS section_order,
    'G_policies'::text AS section_key,
    'sel_respondents_semantics'::text AS item_key,
    CASE
      WHEN pol.policyname IS NOT NULL
        AND pol.cmd = 'SELECT'
        AND 'authenticated' = ANY (pol.roles)
        AND pol.qual ILIKE '%is_owner()%'
        AND pol.qual ILIKE '%current_account_matches(account_id)%'
        AND pol.qual ILIKE '%deleted_at IS NULL%'
        THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    jsonb_build_object(
      'policyname', pol.policyname,
      'cmd', pol.cmd,
      'roles', to_jsonb(pol.roles),
      'permissive', pol.permissive,
      'using_expression', pol.qual,
      'with_check', pol.with_check,
      'requires_is_owner', pol.qual ILIKE '%is_owner()%',
      'requires_current_account_matches', pol.qual ILIKE '%current_account_matches(account_id)%',
      'requires_deleted_at_null', pol.qual ILIKE '%deleted_at IS NULL%'
    ) AS payload
  FROM (SELECT 1) AS seed
  LEFT JOIN pg_catalog.pg_policies AS pol
    ON pol.schemaname = 'public'
   AND pol.tablename = 'respondents'
   AND pol.policyname = 'sel_respondents'
),
section_g_ins AS (
  SELECT
    7 AS section_order,
    'G_policies'::text AS section_key,
    'ins_respondents_surface'::text AS item_key,
    CASE
      WHEN pol.policyname IS NOT NULL AND pol.cmd = 'INSERT' THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    jsonb_build_object(
      'policyname', pol.policyname,
      'cmd', pol.cmd,
      'roles', to_jsonb(pol.roles),
      'permissive', pol.permissive,
      'using_expression', pol.qual,
      'with_check', pol.with_check,
      'note', 'Policy presence only; not an open client path — authenticated INSERT privilege must be false (see F_table_acl)'
    ) AS payload
  FROM (SELECT 1) AS seed
  LEFT JOIN pg_catalog.pg_policies AS pol
    ON pol.schemaname = 'public'
   AND pol.tablename = 'respondents'
   AND pol.policyname = 'ins_respondents'
),

-- ---------------------------------------------------------------------------
-- H. Triggers (closes F3) — identities from core schema
-- ---------------------------------------------------------------------------
section_h_triggers AS (
  SELECT
    8 AS section_order,
    'H_triggers'::text AS section_key,
    exp.tgname AS item_key,
    CASE
      WHEN tr.oid IS NOT NULL
        AND NOT tr.tgisinternal
        AND tr.tgenabled <> 'D'
        AND pn.nspname = 'public'
        AND p.proname = exp.expected_func
        AND pg_catalog.pg_get_function_identity_arguments(p.oid) = ''
        THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    jsonb_build_object(
      'trigger_name', exp.tgname,
      'attached', tr.oid IS NOT NULL,
      'table', 'public.respondents',
      'tgisinternal', tr.tgisinternal,
      'tgenabled', tr.tgenabled,
      'enabled_not_disabled', tr.tgenabled IS DISTINCT FROM 'D',
      'timing_events', pg_catalog.pg_get_triggerdef(tr.oid, true),
      'function_schema', pn.nspname,
      'function_name', p.proname,
      'function_identity_args', pg_catalog.pg_get_function_identity_arguments(p.oid),
      'expected_function', 'public.' || exp.expected_func || '()'
    ) AS payload
  FROM (
    VALUES
      ('trg_respondents_updated_at', 'set_updated_at'),
      ('audit_trg_respondents', 'audit_trigger_func')
  ) AS exp(tgname, expected_func)
  LEFT JOIN pg_catalog.pg_trigger AS tr
    ON tr.tgname = exp.tgname
   AND tr.tgrelid = to_regclass('public.respondents')
  LEFT JOIN pg_catalog.pg_proc AS p ON p.oid = tr.tgfoid
  LEFT JOIN pg_catalog.pg_namespace AS pn ON pn.oid = p.pronamespace
),

-- ---------------------------------------------------------------------------
-- I. Unique index (key positions primary; indexdef supporting)
-- ---------------------------------------------------------------------------
section_i_index AS (
  SELECT
    9 AS section_order,
    'I_unique_index'::text AS section_key,
    'idx_respondents_unique_mobile_per_account'::text AS item_key,
    CASE
      WHEN i.oid IS NOT NULL
        AND ix.indisunique
        AND ix.indisvalid
        AND ix.indisready
        AND NOT ix.indisprimary
        AND keys.key_names = ARRAY['account_id', 'normalized_mobile']::text[]
        AND (
          pg_catalog.pg_get_expr(ix.indpred, ix.indrelid) ILIKE '%deleted_at%IS NULL%'
          OR pg_catalog.pg_get_expr(ix.indpred, ix.indrelid) ILIKE '%deleted_at%is null%'
        )
        THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    jsonb_build_object(
      'index_name', i.relname,
      'table', 'public.respondents',
      'indisunique', ix.indisunique,
      'indisvalid', ix.indisvalid,
      'indisready', ix.indisready,
      'indisprimary', ix.indisprimary,
      'key_names_ordered', to_jsonb(keys.key_names),
      'expected_keys', jsonb_build_array('account_id', 'normalized_mobile'),
      'predicate', pg_catalog.pg_get_expr(ix.indpred, ix.indrelid),
      'indexdef_supporting', pg_catalog.pg_get_indexdef(i.oid)
    ) AS payload
  FROM (SELECT 1) AS seed
  LEFT JOIN pg_catalog.pg_class AS i
    ON i.oid = to_regclass('public.idx_respondents_unique_mobile_per_account')
  LEFT JOIN pg_catalog.pg_index AS ix ON ix.indexrelid = i.oid
  LEFT JOIN LATERAL (
    SELECT array_agg(a.attname ORDER BY ord.ordinality) AS key_names
    FROM unnest(ix.indkey) WITH ORDINALITY AS ord(attnum, ordinality)
    JOIN pg_catalog.pg_attribute AS a
      ON a.attrelid = ix.indrelid
     AND a.attnum = ord.attnum
    WHERE ord.attnum > 0
  ) AS keys ON true
),

-- ---------------------------------------------------------------------------
-- J. CHECK contracts
-- ---------------------------------------------------------------------------
section_j_checks AS (
  SELECT
    10 AS section_order,
    'J_checks'::text AS section_key,
    'check_contracts'::text AS item_key,
    CASE
      WHEN bool_or(pg_catalog.pg_get_constraintdef(con.oid) ILIKE '%9665[0-9]{8}%')
        AND bool_or(
          pg_catalog.pg_get_constraintdef(con.oid) ILIKE '%saudi%'
          AND pg_catalog.pg_get_constraintdef(con.oid) ILIKE '%non_saudi%'
          AND pg_catalog.pg_get_constraintdef(con.oid) ILIKE '%unknown%'
        )
        AND bool_or(pg_catalog.pg_get_constraintdef(con.oid) ILIKE '%age%'
          AND (
            pg_catalog.pg_get_constraintdef(con.oid) ILIKE '%>= 0%'
            OR pg_catalog.pg_get_constraintdef(con.oid) ILIKE '%>=0%'
          ))
        THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    jsonb_build_object(
      'checks', COALESCE(jsonb_agg(jsonb_build_object(
        'conname', con.conname,
        'definition', pg_catalog.pg_get_constraintdef(con.oid)
      ) ORDER BY con.conname), '[]'::jsonb),
      'has_mobile_regex', bool_or(pg_catalog.pg_get_constraintdef(con.oid) ILIKE '%9665[0-9]{8}%'),
      'has_resident_type_vocab', bool_or(
        pg_catalog.pg_get_constraintdef(con.oid) ILIKE '%saudi%'
        AND pg_catalog.pg_get_constraintdef(con.oid) ILIKE '%non_saudi%'
        AND pg_catalog.pg_get_constraintdef(con.oid) ILIKE '%unknown%'
      ),
      'has_age_lower_bound', bool_or(
        pg_catalog.pg_get_constraintdef(con.oid) ILIKE '%age%'
        AND (
          pg_catalog.pg_get_constraintdef(con.oid) ILIKE '%>= 0%'
          OR pg_catalog.pg_get_constraintdef(con.oid) ILIKE '%>=0%'
        )
      )
    ) AS payload
  FROM pg_catalog.pg_constraint AS con
  JOIN pg_catalog.pg_class AS c ON c.oid = con.conrelid
  JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'respondents'
    AND con.contype = 'c'
),

-- ---------------------------------------------------------------------------
-- K. Forbidden relation dependencies (catalog + guarded definition scan)
-- ---------------------------------------------------------------------------
forbidden_rels AS (
  SELECT unnest(ARRAY[
    'participations',
    'projects',
    'project_financial_settings',
    'participation_pricing',
    'payments',
    'settlements',
    'audit_log'
  ]::text[]) AS relname
),
dep_hits AS (
  SELECT DISTINCT
    fr.ident,
    f.relname AS forbidden_rel
  FROM fn_resolved AS fr
  JOIN pg_catalog.pg_depend AS d
    ON d.objid = fr.fn_oid
  JOIN pg_catalog.pg_class AS c
    ON c.oid = d.refobjid
  JOIN pg_catalog.pg_namespace AS n
    ON n.oid = c.relnamespace
  JOIN forbidden_rels AS f
    ON f.relname = c.relname
  WHERE fr.fn_oid IS NOT NULL
    AND n.nspname = 'public'
    AND c.relkind IN ('r', 'v', 'm', 'f', 'p')
),
def_hits AS (
  SELECT DISTINCT
    fr.ident,
    f.relname AS forbidden_rel
  FROM fn_resolved AS fr
  JOIN pg_catalog.pg_proc AS p ON p.oid = fr.fn_oid
  JOIN forbidden_rels AS f ON true
  WHERE fr.fn_oid IS NOT NULL
    AND p.prokind IN ('f', 'p')
    AND pg_catalog.pg_get_functiondef(p.oid)
      ~* ('(FROM|JOIN|INTO|UPDATE|REFERENCES)[[:space:]]+(ONLY[[:space:]]+)?(public\.)?' || f.relname || '\M')
),
section_k_deps AS (
  SELECT
    11 AS section_order,
    'K_dependencies'::text AS section_key,
    'forbidden_relation_deps'::text AS item_key,
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM dep_hits)
       AND NOT EXISTS (SELECT 1 FROM def_hits)
        THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    jsonb_build_object(
      'pg_depend_hits', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('identity', ident, 'relation', forbidden_rel) ORDER BY ident, forbidden_rel)
        FROM dep_hits
      ), '[]'::jsonb),
      'definition_hits', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('identity', ident, 'relation', forbidden_rel) ORDER BY ident, forbidden_rel)
        FROM def_hits
      ), '[]'::jsonb),
      'note', 'PASS requires no public relation dependency on forbidden list'
    ) AS payload
),

-- ---------------------------------------------------------------------------
-- Z. Summary (any mandatory FAIL forces summary FAIL)
-- ---------------------------------------------------------------------------
all_rows AS (
  SELECT * FROM section_a
  UNION ALL SELECT * FROM section_b_inventory
  UNION ALL SELECT * FROM section_b_overloads
  UNION ALL SELECT * FROM section_c_posture
  UNION ALL SELECT * FROM section_d_execute
  UNION ALL SELECT * FROM section_e_relation
  UNION ALL SELECT * FROM section_f_table_acl
  UNION ALL SELECT * FROM section_g_policy_count
  UNION ALL SELECT * FROM section_g_sel
  UNION ALL SELECT * FROM section_g_ins
  UNION ALL SELECT * FROM section_h_triggers
  UNION ALL SELECT * FROM section_i_index
  UNION ALL SELECT * FROM section_j_checks
  UNION ALL SELECT * FROM section_k_deps
),
section_z AS (
  SELECT
    99 AS section_order,
    'Z_summary'::text AS section_key,
    'mandatory_summary'::text AS item_key,
    CASE
      WHEN NOT EXISTS (
        SELECT 1 FROM all_rows WHERE status = 'FAIL'
      ) THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    jsonb_build_object(
      'five_functions_present', (
        SELECT count(*) = 5 FROM section_b_inventory WHERE status = 'PASS'
      ),
      'zero_unexpected_overloads', (
        SELECT COALESCE(bool_and(status = 'PASS'), false) FROM section_b_overloads
      ),
      'helper_posture_correct', (
        SELECT status = 'PASS' FROM section_c_posture
        WHERE item_key = 'normalize_respondent_mobile(text)'
      ),
      'four_rpc_postures_correct', (
        SELECT count(*) = 4 FROM section_c_posture
        WHERE item_key <> 'normalize_respondent_mobile(text)' AND status = 'PASS'
      ),
      'execute_acl_matrix_correct', (
        SELECT COALESCE(bool_and(status = 'PASS'), false) FROM section_d_execute
      ),
      'complete_table_acl_matrix_correct', (
        SELECT COALESCE(bool_and(status = 'PASS'), false) FROM section_f_table_acl
      ),
      'rls_correct', (
        SELECT status = 'PASS' FROM section_e_relation
      ),
      'sel_respondents_semantics_correct', (
        SELECT status = 'PASS' FROM section_g_sel
      ),
      'no_update_delete_policies', (
        SELECT status = 'PASS' FROM section_g_policy_count
      ),
      'both_triggers_correct', (
        SELECT count(*) = 2 AND COALESCE(bool_and(status = 'PASS'), false) FROM section_h_triggers
      ),
      'unique_index_exact_and_healthy', (
        SELECT status = 'PASS' FROM section_i_index
      ),
      'check_contracts_present', (
        SELECT status = 'PASS' FROM section_j_checks
      ),
      'no_forbidden_relation_dependencies', (
        SELECT status = 'PASS' FROM section_k_deps
      ),
      'fail_count', (
        SELECT count(*) FROM all_rows WHERE status = 'FAIL'
      ),
      'pass_count', (
        SELECT count(*) FROM all_rows WHERE status = 'PASS'
      )
    ) AS payload
)

SELECT section_order, section_key, item_key, status, payload
FROM (
  SELECT * FROM all_rows
  UNION ALL
  SELECT * FROM section_z
) AS q
ORDER BY section_order, item_key;
```

---

## 8. Expected PASS values

| Section | Expectation |
|---|---|
| `A_environment` | `INFO` — session metadata; UI confirms project ref |
| `B_function_inventory` | All five identities `PASS`; each name overload count `1` |
| `C_function_posture` | Helper IMMUTABLE/PARALLEL SAFE/INVOKER; list/get STABLE DEFINER; create/update VOLATILE DEFINER; all search_path + managed_by + owner postgres |
| `D_execute_acl` | Helper all roles false; RPCs authenticated true only |
| `E_relation_rls` | Table exists; RLS on; forced false |
| `F_table_acl` | authenticated SELECT only; all other role/privilege pairs false |
| `G_policies` | Count 2; no UPDATE/DELETE; `sel_respondents` semantics PASS; `ins_respondents` present |
| `H_triggers` | Both enabled; functions `public.set_updated_at()` and `public.audit_trigger_func()` |
| `I_unique_index` | Unique/valid/ready; keys `account_id`, `normalized_mobile`; partial `deleted_at IS NULL` |
| `J_checks` | Mobile regex + resident_type vocab + age ≥ 0 |
| `K_dependencies` | No forbidden relation deps |
| `Z_summary` | `PASS` with all mandatory booleans true and `fail_count = 0` |

**Controller rule:** Do not treat the apply as verified if `Z_summary.status` is `FAIL` or any mandatory non-INFO row is `FAIL`.

---

## 9. Evidence Mozfer must return

After successful apply + verification:

1. Confirmation project ref = `gdegnwglakyblnmxgiwx`
2. Confirmation session role = `postgres`
3. Migration success message or screenshot
4. Complete verification result (CSV preferred; full text or complete screenshots acceptable)
5. Confirmation **no other SQL** was run
6. Confirmation **no** application/browser smoke was performed
7. If anything failed: exact error text, line, and context

**Do not** send credentials, Auth UUIDs, profile IDs, account IDs, or real mobile numbers.

---

## 10. Cleanup and retry rules

| Situation | Rule |
|---|---|
| Successful apply | No cleanup |
| Failed migration | Single-transaction migration should roll back; **do not assume** until error is reviewed |
| After failure | **Do not** rerun blindly; **do not** DROP functions; **do not** edit live objects |
| Correction | Requires a later controller-approved fix task |

---

## 11. Manual smoke boundary

**Not part of this packet:**

- Owner / Support Helper login
- Respondent create/update business-row tests
- Duplicate / stale-version runtime tests
- Cross-account runtime isolation
- Browser / application smoke

Those require separately authorized later tasks.

---

## 12. Explicit non-claims

- This document does **not** claim the migration is applied.
- This document does **not** claim post-apply verification has been run.
- Production readiness is **not** claimed.
- Application contracts, UI, Server Actions, and smoke are **not** authorized by this packet alone.
- Graphify / LeanCTX are not live database proof.

---

## 13. Exact next task

**`ZAM-RESPONDENTS-SCHEMA-RPC-DEV-APPLY-1`**

Mozfer manually applies the committed migration to designated DEV/DEMO project `gdegnwglakyblnmxgiwx` and runs the single verification query in §7, then returns the evidence listed in §9.
