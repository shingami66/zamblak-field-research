-- ZAM-SEC-ACL-001 core ACL and postgres default-privilege hardening (SQL draft)
-- Task: ZAM-SEC-ACL-001-HARDENING-SQL-DRAFT-1
-- Status: DRAFT — NOT APPLIED. Requires independent SQL review and later DEV/DEMO apply.
--
-- Scope (explicit inventory only):
--   Tables: accounts, profiles, companies, projects, project_financial_settings,
--           respondents, participations, participation_pricing, payments, audit_log
--   Views:  project_operational_summary, project_financial_summary
--   Trigger functions (EXECUTE revoke only):
--           set_updated_at(), check_project_account_consistency(),
--           check_pfs_account_consistency(), check_participation_account_consistency(),
--           check_participation_pricing_account_consistency(),
--           check_payments_account_consistency(),
--           handle_participation_review_status_before(),
--           handle_participation_review_status_after(),
--           audit_trigger_func(), enforce_participation_project_state()
--   Defaults: ALTER DEFAULT PRIVILEGES FOR ROLE postgres
--             (1) GLOBAL scope and (2) IN SCHEMA public
--             for tables, sequences, and functions.
--
-- Target:
--   Core tables/views: PUBLIC/anon/service_role = no privileges; authenticated = SELECT only
--   Trigger functions: no EXECUTE for PUBLIC/anon/authenticated/service_role
--   postgres defaults (GLOBAL + public schema): no automatic client/PUBLIC grants on
--     tables (r), sequences (S), or functions (f)
--
-- Default-privilege semantics (PostgreSQL pg_default_acl):
--   - Global entries (defaclnamespace = 0) override hard-wired create defaults.
--   - Per-schema entries are added to global/hard-wired defaults.
--   - A schema-scoped REVOKE cannot cancel a global grant; both scopes are hardened.
--
-- Preserves:
--   RLS enablement and all policy definitions; schemas/constraints/indexes/data;
--   approved RPC/helper EXECUTE allow-list; internal identity helpers; bootstrap function;
--   supabase_admin defaults (untouched); Supabase-managed schemas/roles.
--
-- Does not: rewrite RLS/policies; touch Companies design; use REVOKE ON ALL FUNCTIONS;
--           read or mutate business rows; alter supabase_admin default privileges.
-- Correction: ZAM-SEC-ACL-001-HARDENING-SQL-DRAFT-CORRECTION-1

BEGIN;

SELECT pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('zamblak:20260715120000_harden_core_acl_defaults', 0)
);

-- ---------------------------------------------------------------------------
-- Preconditions (fail closed)
-- ---------------------------------------------------------------------------
DO $precondition$
DECLARE
  v_public_schema oid := pg_catalog.to_regnamespace('public');
  v_name text;
  v_oid oid;
  v_relkind "char";
  v_owner text;
  v_rls boolean;
BEGIN
  IF current_user IS DISTINCT FROM 'postgres' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_precondition_failed: current_user_must_be_postgres';
  END IF;

  IF v_public_schema IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_precondition_failed: public_schema_not_found';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (VALUES ('anon'), ('authenticated'), ('service_role'), ('postgres')) AS required_role(role_name)
    WHERE NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_roles AS role_row
      WHERE role_row.rolname = required_role.role_name
    )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_precondition_failed: required_role_missing';
  END IF;

  -- Core tables: exist, ordinary table, owned by postgres, RLS enabled.
  FOREACH v_name IN ARRAY ARRAY[
    'accounts',
    'profiles',
    'companies',
    'projects',
    'project_financial_settings',
    'respondents',
    'participations',
    'participation_pricing',
    'payments',
    'audit_log'
  ]
  LOOP
    SELECT
      class_row.oid,
      class_row.relkind,
      pg_catalog.pg_get_userbyid(class_row.relowner),
      class_row.relrowsecurity
    INTO v_oid, v_relkind, v_owner, v_rls
    FROM pg_catalog.pg_class AS class_row
    JOIN pg_catalog.pg_namespace AS namespace_row
      ON namespace_row.oid = class_row.relnamespace
    WHERE namespace_row.nspname = 'public'
      AND class_row.relname = v_name;

    IF v_oid IS NULL OR v_relkind IS DISTINCT FROM 'r' THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_precondition_failed: core_table_missing_or_wrong_kind:' || v_name;
    END IF;

    IF v_owner IS DISTINCT FROM 'postgres' THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_precondition_failed: core_table_owner_not_postgres:' || v_name;
    END IF;

    IF NOT COALESCE(v_rls, false) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_precondition_failed: core_table_rls_disabled:' || v_name;
    END IF;
  END LOOP;

  -- Managed views: exist, view kind, owned by postgres.
  FOREACH v_name IN ARRAY ARRAY[
    'project_operational_summary',
    'project_financial_summary'
  ]
  LOOP
    SELECT
      class_row.oid,
      class_row.relkind,
      pg_catalog.pg_get_userbyid(class_row.relowner)
    INTO v_oid, v_relkind, v_owner
    FROM pg_catalog.pg_class AS class_row
    JOIN pg_catalog.pg_namespace AS namespace_row
      ON namespace_row.oid = class_row.relnamespace
    WHERE namespace_row.nspname = 'public'
      AND class_row.relname = v_name;

    IF v_oid IS NULL OR v_relkind IS DISTINCT FROM 'v' THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_precondition_failed: managed_view_missing_or_wrong_kind:' || v_name;
    END IF;

    IF v_owner IS DISTINCT FROM 'postgres' THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_precondition_failed: managed_view_owner_not_postgres:' || v_name;
    END IF;
  END LOOP;

  -- Trigger functions: exist, return trigger, single zero-arg overload each.
  FOREACH v_name IN ARRAY ARRAY[
    'set_updated_at',
    'check_project_account_consistency',
    'check_pfs_account_consistency',
    'check_participation_account_consistency',
    'check_participation_pricing_account_consistency',
    'check_payments_account_consistency',
    'handle_participation_review_status_before',
    'handle_participation_review_status_after',
    'audit_trigger_func',
    'enforce_participation_project_state'
  ]
  LOOP
    v_oid := pg_catalog.to_regprocedure(pg_catalog.format('public.%I()', v_name));

    IF v_oid IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_precondition_failed: trigger_function_missing:' || v_name;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_catalog.pg_proc AS procedure_row
      JOIN pg_catalog.pg_namespace AS namespace_row
        ON namespace_row.oid = procedure_row.pronamespace
      WHERE namespace_row.nspname = 'public'
        AND procedure_row.proname = v_name
        AND procedure_row.oid <> v_oid
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_precondition_failed: trigger_function_overload_present:' || v_name;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_proc AS procedure_row
      WHERE procedure_row.oid = v_oid
        AND procedure_row.prorettype = 'pg_catalog.trigger'::pg_catalog.regtype
        AND procedure_row.pronargs = 0
        AND pg_catalog.pg_get_userbyid(procedure_row.proowner) = 'postgres'
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_precondition_failed: trigger_function_signature_or_owner:' || v_name;
    END IF;
  END LOOP;

  -- Approved RPC / helper functions must already exist (preserve contract).
  IF pg_catalog.to_regprocedure('public.resolve_current_profile()') IS NULL
     OR pg_catalog.to_regprocedure('public.support_participation_operational_rows(uuid, integer, integer)') IS NULL
     OR pg_catalog.to_regprocedure('public.support_profile_directory(integer, integer)') IS NULL
     OR pg_catalog.to_regprocedure('public.support_project_participation_summary(uuid, integer, integer)') IS NULL
     OR pg_catalog.to_regprocedure('public.support_project_directory(integer, integer)') IS NULL
     OR pg_catalog.to_regprocedure('public.is_owner()') IS NULL
     OR pg_catalog.to_regprocedure('public.is_support_helper()') IS NULL
     OR pg_catalog.to_regprocedure('public.current_account_matches(uuid)') IS NULL
     OR pg_catalog.to_regprocedure('public.current_profile_matches(uuid)') IS NULL
     OR pg_catalog.to_regprocedure('public.current_profile_id()') IS NULL
     OR pg_catalog.to_regprocedure('public.current_account_id()') IS NULL
     OR pg_catalog.to_regprocedure('public.current_profile_role()') IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_precondition_failed: approved_function_missing';
  END IF;
END;
$precondition$;

-- ---------------------------------------------------------------------------
-- Core tables: revoke client privileges, grant authenticated SELECT only
-- ---------------------------------------------------------------------------
REVOKE ALL PRIVILEGES ON TABLE
  public.accounts,
  public.profiles,
  public.companies,
  public.projects,
  public.project_financial_settings,
  public.respondents,
  public.participations,
  public.participation_pricing,
  public.payments,
  public.audit_log
FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT ON TABLE
  public.accounts,
  public.profiles,
  public.companies,
  public.projects,
  public.project_financial_settings,
  public.respondents,
  public.participations,
  public.participation_pricing,
  public.payments,
  public.audit_log
TO authenticated;

-- ---------------------------------------------------------------------------
-- Managed views: same client ACL target
-- ---------------------------------------------------------------------------
REVOKE ALL PRIVILEGES ON TABLE
  public.project_operational_summary,
  public.project_financial_summary
FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT ON TABLE
  public.project_operational_summary,
  public.project_financial_summary
TO authenticated;

-- ---------------------------------------------------------------------------
-- Trigger functions: revoke client/PUBLIC EXECUTE (named list only)
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.check_project_account_consistency() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.check_pfs_account_consistency() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.check_participation_account_consistency() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.check_participation_pricing_account_consistency() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.check_payments_account_consistency() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.handle_participation_review_status_before() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.handle_participation_review_status_after() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.audit_trigger_func() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.enforce_participation_project_state() FROM PUBLIC, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Pre-mutation inventory: postgres default ACLs (GLOBAL + public).
-- Catalog-only. Does not fail solely because client grants exist (expected residual).
-- Does not inspect or require removal of supabase_admin default ACLs.
-- ---------------------------------------------------------------------------
DO $default_acl_inventory$
DECLARE
  v_postgres_oid oid := (
    SELECT role_row.oid FROM pg_catalog.pg_roles AS role_row WHERE role_row.rolname = 'postgres'
  );
  v_public_oid oid := pg_catalog.to_regnamespace('public');
  v_anon_oid oid := (
    SELECT role_row.oid FROM pg_catalog.pg_roles AS role_row WHERE role_row.rolname = 'anon'
  );
  v_authenticated_oid oid := (
    SELECT role_row.oid FROM pg_catalog.pg_roles AS role_row WHERE role_row.rolname = 'authenticated'
  );
  v_service_role_oid oid := (
    SELECT role_row.oid FROM pg_catalog.pg_roles AS role_row WHERE role_row.rolname = 'service_role'
  );
  v_global_client_grant_count bigint;
  v_public_client_grant_count bigint;
BEGIN
  IF v_postgres_oid IS NULL OR v_public_oid IS NULL
     OR v_anon_oid IS NULL OR v_authenticated_oid IS NULL OR v_service_role_oid IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_precondition_failed: default_acl_inventory_roles_or_schema_missing';
  END IF;

  -- GLOBAL scope (defaclnamespace = 0): object types r / S / f; client + PUBLIC grantees.
  SELECT COUNT(*)
  INTO v_global_client_grant_count
  FROM pg_catalog.pg_default_acl AS default_acl
  CROSS JOIN LATERAL pg_catalog.aclexplode(default_acl.defaclacl) AS privilege_row
  WHERE default_acl.defaclrole = v_postgres_oid
    AND default_acl.defaclnamespace = 0
    AND default_acl.defaclobjtype IN ('r', 'S', 'f')
    AND (
      privilege_row.grantee = 0
      OR privilege_row.grantee IN (v_anon_oid, v_authenticated_oid, v_service_role_oid)
    );

  -- public schema scope: same object types and grantees.
  SELECT COUNT(*)
  INTO v_public_client_grant_count
  FROM pg_catalog.pg_default_acl AS default_acl
  CROSS JOIN LATERAL pg_catalog.aclexplode(default_acl.defaclacl) AS privilege_row
  WHERE default_acl.defaclrole = v_postgres_oid
    AND default_acl.defaclnamespace = v_public_oid
    AND default_acl.defaclobjtype IN ('r', 'S', 'f')
    AND (
      privilege_row.grantee = 0
      OR privilege_row.grantee IN (v_anon_oid, v_authenticated_oid, v_service_role_oid)
    );

  RAISE NOTICE
    'zamblak_default_acl_inventory: postgres GLOBAL client/PUBLIC grant rows=%; public-schema client/PUBLIC grant rows=%',
    v_global_client_grant_count,
    v_public_client_grant_count;
END;
$default_acl_inventory$;

-- ---------------------------------------------------------------------------
-- Default privileges for future objects created by postgres.
-- Both GLOBAL and public-schema scopes are required:
--   global entries override hard-wired defaults; per-schema entries add on top;
--   schema REVOKE cannot cancel a global grant.
-- Does not modify supabase_admin defaults.
-- ---------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM PUBLIC, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE ALL PRIVILEGES ON FUNCTIONS FROM PUBLIC, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM PUBLIC, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON FUNCTIONS FROM PUBLIC, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Postconditions (fail closed; catalog only; no business-row access)
-- ---------------------------------------------------------------------------
DO $postcondition$
DECLARE
  v_name text;
  v_oid oid;
  v_authenticated_oid oid := (
    SELECT role_row.oid FROM pg_catalog.pg_roles AS role_row WHERE role_row.rolname = 'authenticated'
  );
  v_anon_oid oid := (
    SELECT role_row.oid FROM pg_catalog.pg_roles AS role_row WHERE role_row.rolname = 'anon'
  );
  v_service_role_oid oid := (
    SELECT role_row.oid FROM pg_catalog.pg_roles AS role_row WHERE role_row.rolname = 'service_role'
  );
  v_function_oid oid;
  v_token text;
BEGIN
  IF v_authenticated_oid IS NULL OR v_anon_oid IS NULL OR v_service_role_oid IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: required_role_missing';
  END IF;

  -- A) Core tables: RLS still enabled; client ACL = authenticated SELECT only.
  FOREACH v_name IN ARRAY ARRAY[
    'accounts',
    'profiles',
    'companies',
    'projects',
    'project_financial_settings',
    'respondents',
    'participations',
    'participation_pricing',
    'payments',
    'audit_log'
  ]
  LOOP
    v_oid := pg_catalog.to_regclass(pg_catalog.format('public.%I', v_name));

    IF v_oid IS NULL
       OR NOT EXISTS (
         SELECT 1
         FROM pg_catalog.pg_class AS class_row
         WHERE class_row.oid = v_oid
           AND class_row.relkind = 'r'
           AND class_row.relrowsecurity
           AND pg_catalog.pg_get_userbyid(class_row.relowner) = 'postgres'
       ) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: core_table_rls_or_owner:' || v_name;
    END IF;

    IF NOT pg_catalog.has_table_privilege(v_authenticated_oid, v_oid, 'SELECT') THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: authenticated_select_missing:' || v_name;
    END IF;

    IF pg_catalog.has_table_privilege(v_authenticated_oid, v_oid, 'INSERT')
       OR pg_catalog.has_table_privilege(v_authenticated_oid, v_oid, 'UPDATE')
       OR pg_catalog.has_table_privilege(v_authenticated_oid, v_oid, 'DELETE')
       OR pg_catalog.has_table_privilege(v_authenticated_oid, v_oid, 'TRUNCATE')
       OR pg_catalog.has_table_privilege(v_authenticated_oid, v_oid, 'REFERENCES')
       OR pg_catalog.has_table_privilege(v_authenticated_oid, v_oid, 'TRIGGER')
       OR pg_catalog.has_table_privilege(v_authenticated_oid, v_oid, 'MAINTAIN') THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: authenticated_excess_privilege:' || v_name;
    END IF;

    IF pg_catalog.has_table_privilege(v_anon_oid, v_oid, 'SELECT')
       OR pg_catalog.has_table_privilege(v_anon_oid, v_oid, 'INSERT')
       OR pg_catalog.has_table_privilege(v_anon_oid, v_oid, 'UPDATE')
       OR pg_catalog.has_table_privilege(v_anon_oid, v_oid, 'DELETE')
       OR pg_catalog.has_table_privilege(v_anon_oid, v_oid, 'TRUNCATE')
       OR pg_catalog.has_table_privilege(v_anon_oid, v_oid, 'REFERENCES')
       OR pg_catalog.has_table_privilege(v_anon_oid, v_oid, 'TRIGGER')
       OR pg_catalog.has_table_privilege(v_anon_oid, v_oid, 'MAINTAIN')
       OR pg_catalog.has_table_privilege(v_service_role_oid, v_oid, 'SELECT')
       OR pg_catalog.has_table_privilege(v_service_role_oid, v_oid, 'INSERT')
       OR pg_catalog.has_table_privilege(v_service_role_oid, v_oid, 'UPDATE')
       OR pg_catalog.has_table_privilege(v_service_role_oid, v_oid, 'DELETE')
       OR pg_catalog.has_table_privilege(v_service_role_oid, v_oid, 'TRUNCATE')
       OR pg_catalog.has_table_privilege(v_service_role_oid, v_oid, 'REFERENCES')
       OR pg_catalog.has_table_privilege(v_service_role_oid, v_oid, 'TRIGGER')
       OR pg_catalog.has_table_privilege(v_service_role_oid, v_oid, 'MAINTAIN') THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: anon_or_service_role_table_privilege:' || v_name;
    END IF;

    -- Explicit ACL required after REVOKE/GRANT. Do not fall back to acldefault (owner-only defaults).
    IF NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_class AS class_row
      WHERE class_row.oid = v_oid
        AND class_row.relacl IS NOT NULL
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: core_table_acl_not_materialized:' || v_name;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_catalog.pg_class AS class_row
      CROSS JOIN LATERAL pg_catalog.aclexplode(class_row.relacl) AS privilege_row
      WHERE class_row.oid = v_oid
        AND (
          privilege_row.grantee = 0
          OR privilege_row.grantee IN (v_anon_oid, v_service_role_oid)
          OR (
            privilege_row.grantee = v_authenticated_oid
            AND (
              privilege_row.privilege_type <> 'SELECT'
              OR privilege_row.is_grantable
            )
          )
        )
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: core_table_acl_matrix:' || v_name;
    END IF;
  END LOOP;

  -- B) Managed views: same client ACL target.
  FOREACH v_name IN ARRAY ARRAY[
    'project_operational_summary',
    'project_financial_summary'
  ]
  LOOP
    v_oid := pg_catalog.to_regclass(pg_catalog.format('public.%I', v_name));

    IF v_oid IS NULL
       OR NOT EXISTS (
         SELECT 1
         FROM pg_catalog.pg_class AS class_row
         WHERE class_row.oid = v_oid
           AND class_row.relkind = 'v'
           AND pg_catalog.pg_get_userbyid(class_row.relowner) = 'postgres'
       ) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: managed_view_missing:' || v_name;
    END IF;

    IF NOT pg_catalog.has_table_privilege(v_authenticated_oid, v_oid, 'SELECT') THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: view_authenticated_select_missing:' || v_name;
    END IF;

    IF pg_catalog.has_table_privilege(v_authenticated_oid, v_oid, 'INSERT')
       OR pg_catalog.has_table_privilege(v_authenticated_oid, v_oid, 'UPDATE')
       OR pg_catalog.has_table_privilege(v_authenticated_oid, v_oid, 'DELETE')
       OR pg_catalog.has_table_privilege(v_authenticated_oid, v_oid, 'TRUNCATE')
       OR pg_catalog.has_table_privilege(v_authenticated_oid, v_oid, 'REFERENCES')
       OR pg_catalog.has_table_privilege(v_authenticated_oid, v_oid, 'TRIGGER')
       OR pg_catalog.has_table_privilege(v_authenticated_oid, v_oid, 'MAINTAIN') THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: view_authenticated_excess_privilege:' || v_name;
    END IF;

    IF pg_catalog.has_table_privilege(v_anon_oid, v_oid, 'SELECT')
       OR pg_catalog.has_table_privilege(v_anon_oid, v_oid, 'INSERT')
       OR pg_catalog.has_table_privilege(v_anon_oid, v_oid, 'UPDATE')
       OR pg_catalog.has_table_privilege(v_anon_oid, v_oid, 'DELETE')
       OR pg_catalog.has_table_privilege(v_anon_oid, v_oid, 'TRUNCATE')
       OR pg_catalog.has_table_privilege(v_anon_oid, v_oid, 'REFERENCES')
       OR pg_catalog.has_table_privilege(v_anon_oid, v_oid, 'TRIGGER')
       OR pg_catalog.has_table_privilege(v_anon_oid, v_oid, 'MAINTAIN')
       OR pg_catalog.has_table_privilege(v_service_role_oid, v_oid, 'SELECT')
       OR pg_catalog.has_table_privilege(v_service_role_oid, v_oid, 'INSERT')
       OR pg_catalog.has_table_privilege(v_service_role_oid, v_oid, 'UPDATE')
       OR pg_catalog.has_table_privilege(v_service_role_oid, v_oid, 'DELETE')
       OR pg_catalog.has_table_privilege(v_service_role_oid, v_oid, 'TRUNCATE')
       OR pg_catalog.has_table_privilege(v_service_role_oid, v_oid, 'REFERENCES')
       OR pg_catalog.has_table_privilege(v_service_role_oid, v_oid, 'TRIGGER')
       OR pg_catalog.has_table_privilege(v_service_role_oid, v_oid, 'MAINTAIN') THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: view_anon_or_service_role_privilege:' || v_name;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_class AS class_row
      WHERE class_row.oid = v_oid
        AND class_row.relacl IS NOT NULL
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: managed_view_acl_not_materialized:' || v_name;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_catalog.pg_class AS class_row
      CROSS JOIN LATERAL pg_catalog.aclexplode(class_row.relacl) AS privilege_row
      WHERE class_row.oid = v_oid
        AND (
          privilege_row.grantee = 0
          OR privilege_row.grantee IN (v_anon_oid, v_service_role_oid)
          OR (
            privilege_row.grantee = v_authenticated_oid
            AND (
              privilege_row.privilege_type <> 'SELECT'
              OR privilege_row.is_grantable
            )
          )
        )
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: managed_view_acl_matrix:' || v_name;
    END IF;
  END LOOP;

  -- C) Trigger-function client EXECUTE all false; no PUBLIC/anon/service_role EXECUTE grant rows.
  FOREACH v_name IN ARRAY ARRAY[
    'set_updated_at',
    'check_project_account_consistency',
    'check_pfs_account_consistency',
    'check_participation_account_consistency',
    'check_participation_pricing_account_consistency',
    'check_payments_account_consistency',
    'handle_participation_review_status_before',
    'handle_participation_review_status_after',
    'audit_trigger_func',
    'enforce_participation_project_state'
  ]
  LOOP
    v_function_oid := pg_catalog.to_regprocedure(pg_catalog.format('public.%I()', v_name));

    IF v_function_oid IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: trigger_function_missing:' || v_name;
    END IF;

    IF pg_catalog.has_function_privilege('anon', v_function_oid, 'EXECUTE')
       OR pg_catalog.has_function_privilege('authenticated', v_function_oid, 'EXECUTE')
       OR pg_catalog.has_function_privilege('service_role', v_function_oid, 'EXECUTE') THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: trigger_function_client_execute:' || v_name;
    END IF;

    -- Null proacl means PostgreSQL default PUBLIC EXECUTE still applies — not acceptable.
    IF EXISTS (
      SELECT 1
      FROM pg_catalog.pg_proc AS procedure_row
      WHERE procedure_row.oid = v_function_oid
        AND procedure_row.proacl IS NULL
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: trigger_function_acl_not_materialized:' || v_name;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_catalog.pg_proc AS procedure_row
      CROSS JOIN LATERAL pg_catalog.aclexplode(procedure_row.proacl) AS privilege_row
      WHERE procedure_row.oid = v_function_oid
        AND privilege_row.privilege_type = 'EXECUTE'
        AND (
          privilege_row.grantee = 0
          OR privilege_row.grantee IN (v_anon_oid, v_authenticated_oid, v_service_role_oid)
        )
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: trigger_function_forbidden_execute_grant:' || v_name;
    END IF;
  END LOOP;

  -- D) Approved RPC/helper EXECUTE allow-list unchanged.
  FOREACH v_token IN ARRAY ARRAY[
    'public.resolve_current_profile()',
    'public.support_participation_operational_rows(uuid, integer, integer)',
    'public.support_profile_directory(integer, integer)',
    'public.support_project_participation_summary(uuid, integer, integer)',
    'public.support_project_directory(integer, integer)',
    'public.is_owner()',
    'public.is_support_helper()',
    'public.current_account_matches(uuid)',
    'public.current_profile_matches(uuid)'
  ]
  LOOP
    v_function_oid := pg_catalog.to_regprocedure(v_token);

    IF v_function_oid IS NULL
       OR NOT pg_catalog.has_function_privilege('authenticated', v_function_oid, 'EXECUTE')
       OR pg_catalog.has_function_privilege('anon', v_function_oid, 'EXECUTE')
       OR pg_catalog.has_function_privilege('service_role', v_function_oid, 'EXECUTE') THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: approved_function_execute_contract:' || v_token;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_catalog.pg_proc AS procedure_row
      WHERE procedure_row.oid = v_function_oid
        AND procedure_row.proacl IS NULL
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: approved_function_acl_not_materialized:' || v_token;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_catalog.pg_proc AS procedure_row
      CROSS JOIN LATERAL pg_catalog.aclexplode(procedure_row.proacl) AS privilege_row
      WHERE procedure_row.oid = v_function_oid
        AND privilege_row.privilege_type = 'EXECUTE'
        AND (
          privilege_row.grantee = 0
          OR privilege_row.grantee IN (v_anon_oid, v_service_role_oid)
        )
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: approved_function_forbidden_execute_grant:' || v_token;
    END IF;
  END LOOP;

  -- Internal identity helpers remain non-client-callable.
  FOREACH v_token IN ARRAY ARRAY[
    'public.current_profile_id()',
    'public.current_account_id()',
    'public.current_profile_role()'
  ]
  LOOP
    v_function_oid := pg_catalog.to_regprocedure(v_token);

    IF v_function_oid IS NOT NULL
       AND (
         pg_catalog.has_function_privilege('authenticated', v_function_oid, 'EXECUTE')
         OR pg_catalog.has_function_privilege('anon', v_function_oid, 'EXECUTE')
         OR pg_catalog.has_function_privilege('service_role', v_function_oid, 'EXECUTE')
       ) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: identity_helper_execute_leak:' || v_token;
    END IF;
  END LOOP;

  -- Bootstrap remains non-client-callable when present.
  v_function_oid := pg_catalog.to_regprocedure('public.bootstrap_first_owner(uuid, text, text, text)');
  IF v_function_oid IS NOT NULL
     AND (
       pg_catalog.has_function_privilege('authenticated', v_function_oid, 'EXECUTE')
       OR pg_catalog.has_function_privilege('anon', v_function_oid, 'EXECUTE')
       OR pg_catalog.has_function_privilege('service_role', v_function_oid, 'EXECUTE')
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: bootstrap_execute_leak';
  END IF;

  -- E) postgres default ACLs: GLOBAL (defaclnamespace = 0) AND public schema.
  -- Object types: r (tables), S (sequences), f (functions).
  -- Fail if any privilege remains for PUBLIC / anon / authenticated / service_role.
  -- Ordering-independent (EXISTS + aclexplode). Not vacuous when public rows are absent
  -- while GLOBAL client grants remain (both scopes are inspected).
  -- Does not inspect or require removal of supabase_admin default ACLs.
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_default_acl AS default_acl
    LEFT JOIN pg_catalog.pg_namespace AS namespace_row
      ON namespace_row.oid = default_acl.defaclnamespace
    CROSS JOIN LATERAL pg_catalog.aclexplode(default_acl.defaclacl) AS privilege_row
    WHERE default_acl.defaclrole = (
            SELECT role_row.oid
            FROM pg_catalog.pg_roles AS role_row
            WHERE role_row.rolname = 'postgres'
          )
      AND default_acl.defaclobjtype IN ('r', 'S', 'f')
      AND (
        default_acl.defaclnamespace = 0
        OR namespace_row.nspname = 'public'
      )
      AND (
        privilege_row.grantee = 0
        OR privilege_row.grantee IN (v_anon_oid, v_authenticated_oid, v_service_role_oid)
      )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: postgres_global_or_public_default_acl_client_grant';
  END IF;
END;
$postcondition$;

COMMIT;
