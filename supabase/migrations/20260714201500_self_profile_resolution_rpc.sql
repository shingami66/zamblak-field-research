-- ZAM-AUTH-001D self-profile resolution RPC (SQL draft)
-- Task: ZAM-AUTH-001D-SELF-PROFILE-RPC-SQL-DRAFT-1
-- Status: DRAFT — NOT APPLIED. Requires independent SQL review and later DEV/DEMO apply.
--
-- Product: authenticated session bootstrap for the signed-in user's active profile.
-- Creates public.resolve_current_profile() — no parameters; auth.uid() is the sole identity.
-- Works for both owner and support_helper. Not a directory/list surface.
-- Does not re-grant current_profile_id / current_account_id / current_profile_role.
-- Does not use service_role at runtime. Does not accept client profile/account/role.
--
-- Business failures use RAISE EXCEPTION ERRCODE P0001 with exact message tokens
-- (evaluation order fixed):
--   auth_required
--   profile_not_found
--   profile_ambiguous
--   profile_deleted
--   profile_inactive
--   profile_invalid_role
--   account_deleted
-- Unexpected errors are not swallowed (no broad WHEN OTHERS).

BEGIN;

SELECT pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('zamblak:20260714201500_self_profile_resolution_rpc', 0)
);

-- Preconditions (fail closed)
DO $precondition$
DECLARE
  v_public_schema oid := pg_catalog.to_regnamespace('public');
  v_auth_schema oid := pg_catalog.to_regnamespace('auth');
  v_accounts_oid oid;
  v_profiles_oid oid;
  v_unique_auth_count bigint;
  v_role_check text;
  v_col_type text;
  v_col_name text;
  v_expected text;
BEGIN
  IF current_user IS DISTINCT FROM 'postgres' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_precondition_failed: current_user_must_be_postgres';
  END IF;

  IF v_public_schema IS NULL OR v_auth_schema IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_precondition_failed: required_schema_missing';
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

  IF EXISTS (
       SELECT 1
       FROM pg_catalog.pg_namespace AS namespace_row
       CROSS JOIN LATERAL pg_catalog.aclexplode(
         COALESCE(namespace_row.nspacl, pg_catalog.acldefault('n', namespace_row.nspowner))
       ) AS privilege_row
       WHERE namespace_row.oid = v_public_schema
         AND privilege_row.grantee = 0
         AND privilege_row.privilege_type = 'CREATE'
     )
     OR EXISTS (
       SELECT 1
       FROM pg_catalog.pg_roles AS role_row
       WHERE role_row.rolname IN ('anon', 'authenticated', 'service_role')
         AND pg_catalog.has_schema_privilege(role_row.oid, v_public_schema, 'CREATE')
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_precondition_failed: untrusted_public_schema_create';
  END IF;

  v_accounts_oid := pg_catalog.to_regclass('public.accounts');
  v_profiles_oid := pg_catalog.to_regclass('public.profiles');

  IF v_accounts_oid IS NULL OR v_profiles_oid IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_precondition_failed: required_table_missing';
  END IF;

  -- Fresh-state: refuse any pre-existing resolve_current_profile overload.
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc AS procedure_row
    JOIN pg_catalog.pg_namespace AS namespace_row
      ON namespace_row.oid = procedure_row.pronamespace
    WHERE namespace_row.nspname = 'public'
      AND procedure_row.proname = 'resolve_current_profile'
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_object_conflict: resolve_current_profile_exists';
  END IF;

  -- Required profiles columns and types.
  FOREACH v_expected IN ARRAY ARRAY[
    'id:uuid',
    'account_id:uuid',
    'auth_user_id:uuid',
    'name:text',
    'role:text',
    'active:boolean',
    'deleted_at:timestamp with time zone'
  ]
  LOOP
    v_col_name := split_part(v_expected, ':', 1);
    v_col_type := NULL;
    SELECT pg_catalog.format_type(attribute_row.atttypid, attribute_row.atttypmod)
    INTO v_col_type
    FROM pg_catalog.pg_attribute AS attribute_row
    WHERE attribute_row.attrelid = v_profiles_oid
      AND attribute_row.attname = v_col_name
      AND attribute_row.attnum > 0
      AND NOT attribute_row.attisdropped;

    IF v_col_type IS DISTINCT FROM split_part(v_expected, ':', 2) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_precondition_failed: profiles_column_incompatible';
    END IF;
  END LOOP;

  -- Required accounts columns and types.
  FOREACH v_expected IN ARRAY ARRAY[
    'id:uuid',
    'deleted_at:timestamp with time zone'
  ]
  LOOP
    v_col_name := split_part(v_expected, ':', 1);
    v_col_type := NULL;
    SELECT pg_catalog.format_type(attribute_row.atttypid, attribute_row.atttypmod)
    INTO v_col_type
    FROM pg_catalog.pg_attribute AS attribute_row
    WHERE attribute_row.attrelid = v_accounts_oid
      AND attribute_row.attname = v_col_name
      AND attribute_row.attnum > 0
      AND NOT attribute_row.attisdropped;

    IF v_col_type IS DISTINCT FROM split_part(v_expected, ':', 2) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_precondition_failed: accounts_column_incompatible';
    END IF;
  END LOOP;

  -- auth_user_id uniqueness (at least one unique constraint/index covering only auth_user_id).
  SELECT COUNT(*)
  INTO v_unique_auth_count
  FROM pg_catalog.pg_constraint AS constraint_row
  WHERE constraint_row.conrelid = v_profiles_oid
    AND constraint_row.contype = 'u'
    AND constraint_row.convalidated
    AND pg_catalog.pg_get_constraintdef(constraint_row.oid, true)
        ILIKE '%(auth_user_id)%';

  IF v_unique_auth_count < 1 THEN
    -- Fall back to unique indexes (column default UNIQUE may surface as index).
    SELECT COUNT(*)
    INTO v_unique_auth_count
    FROM pg_catalog.pg_index AS index_row
    JOIN pg_catalog.pg_class AS index_class
      ON index_class.oid = index_row.indexrelid
    JOIN pg_catalog.pg_attribute AS attribute_row
      ON attribute_row.attrelid = index_row.indrelid
     AND attribute_row.attnum = ANY (index_row.indkey::smallint[])
    WHERE index_row.indrelid = v_profiles_oid
      AND index_row.indisunique
      AND index_row.indpred IS NULL
      AND attribute_row.attname = 'auth_user_id'
      AND index_row.indnkeyatts = 1;
  END IF;

  IF v_unique_auth_count < 1 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_precondition_failed: profiles_auth_user_id_unique_missing';
  END IF;

  SELECT pg_catalog.pg_get_constraintdef(constraint_row.oid, true)
  INTO v_role_check
  FROM pg_catalog.pg_constraint AS constraint_row
  WHERE constraint_row.conrelid = v_profiles_oid
    AND constraint_row.conname = 'chk_profiles_role'
    AND constraint_row.contype = 'c'
    AND constraint_row.convalidated;

  IF v_role_check IS NULL
     OR position('''owner''' IN v_role_check) = 0
     OR position('''support_helper''' IN v_role_check) = 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_precondition_failed: profile_role_constraint_missing';
  END IF;

  -- Migration owner must be able to own the function as postgres.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_roles AS role_row
    WHERE role_row.rolname = 'postgres'
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_precondition_failed: postgres_role_missing';
  END IF;
END;
$precondition$;

CREATE OR REPLACE FUNCTION public.resolve_current_profile()
RETURNS TABLE (
  profile_id uuid,
  account_id uuid,
  role text,
  name text,
  active boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
-- managed_by: 20260714201500_self_profile_resolution_rpc
-- task: ZAM-AUTH-001D-SELF-PROFILE-RPC-SQL-DRAFT-1
DECLARE
  v_auth_uid uuid;
  v_profile_count integer;
  v_profile_id uuid;
  v_account_id uuid;
  v_role text;
  v_name text;
  v_active boolean;
  v_profile_deleted_at timestamptz;
  v_account_deleted_at timestamptz;
BEGIN
  -- 1) Null auth.uid()
  v_auth_uid := (SELECT auth.uid());
  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'auth_required';
  END IF;

  -- Cardinality proof before success selection (no arbitrary single-row limiter).
  SELECT COUNT(*)::integer
  INTO v_profile_count
  FROM public.profiles AS profile_row
  WHERE profile_row.auth_user_id = v_auth_uid;

  -- 2) Zero profiles
  IF v_profile_count = 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'profile_not_found';
  END IF;

  -- 3) More than one profile (defensive; UNIQUE auth_user_id should prevent)
  IF v_profile_count > 1 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'profile_ambiguous';
  END IF;

  -- Exactly one row proven by count; unrestricted single-row SELECT.
  SELECT
    profile_row.id,
    profile_row.account_id,
    profile_row.role,
    profile_row.name,
    profile_row.active,
    profile_row.deleted_at
  INTO
    v_profile_id,
    v_account_id,
    v_role,
    v_name,
    v_active,
    v_profile_deleted_at
  FROM public.profiles AS profile_row
  WHERE profile_row.auth_user_id = v_auth_uid;

  -- 4) Soft-deleted profile
  IF v_profile_deleted_at IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'profile_deleted';
  END IF;

  -- 5) Inactive profile
  IF v_active IS NOT TRUE THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'profile_inactive';
  END IF;

  -- 6) Invalid role (schema CHECK should prevent; still fail closed)
  IF v_role IS DISTINCT FROM 'owner'
     AND v_role IS DISTINCT FROM 'support_helper' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'profile_invalid_role';
  END IF;

  -- 7) Parent account missing or soft-deleted
  SELECT account_row.deleted_at
  INTO v_account_deleted_at
  FROM public.accounts AS account_row
  WHERE account_row.id = v_account_id;

  IF NOT FOUND OR v_account_deleted_at IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'account_deleted';
  END IF;

  -- Success: exactly one row; active always true.
  profile_id := v_profile_id;
  account_id := v_account_id;
  role := v_role;
  name := v_name;
  active := true;
  RETURN NEXT;
END;
$function$;

ALTER FUNCTION public.resolve_current_profile() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.resolve_current_profile() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_current_profile() FROM anon;
REVOKE ALL ON FUNCTION public.resolve_current_profile() FROM authenticated;
REVOKE ALL ON FUNCTION public.resolve_current_profile() FROM service_role;

GRANT EXECUTE ON FUNCTION public.resolve_current_profile() TO authenticated;

COMMENT ON FUNCTION public.resolve_current_profile() IS
  'managed_by: 20260714201500_self_profile_resolution_rpc; task: ZAM-AUTH-001D-SELF-PROFILE-RPC-SQL-DRAFT-1; purpose: authenticated self-profile session resolution; identity: auth.uid() only; roles: owner|support_helper; no client profile/account/role inputs; EXECUTE: authenticated only; not for anon/service_role';

-- Postconditions (fail closed)
DO $postcondition$
DECLARE
  v_function_oid oid;
  v_owner text;
  v_language text;
  v_security_definer boolean;
  v_volatile char;
  v_config text[];
  v_source text;
  v_comment text;
  v_return_names text[];
  v_return_types text[];
  v_arg_count integer;
  v_overload_count bigint;
  v_helper_oid oid;
  v_token text;
BEGIN
  IF current_user IS DISTINCT FROM 'postgres' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: current_user_must_be_postgres';
  END IF;

  SELECT COUNT(*)
  INTO v_overload_count
  FROM pg_catalog.pg_proc AS procedure_row
  JOIN pg_catalog.pg_namespace AS namespace_row
    ON namespace_row.oid = procedure_row.pronamespace
  WHERE namespace_row.nspname = 'public'
    AND procedure_row.proname = 'resolve_current_profile';

  IF v_overload_count IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: unexpected_resolve_overload_count';
  END IF;

  SELECT procedure_row.oid
  INTO v_function_oid
  FROM pg_catalog.pg_proc AS procedure_row
  JOIN pg_catalog.pg_namespace AS namespace_row
    ON namespace_row.oid = procedure_row.pronamespace
  WHERE namespace_row.nspname = 'public'
    AND procedure_row.proname = 'resolve_current_profile'
    AND pg_catalog.pg_get_function_identity_arguments(procedure_row.oid) = '';

  IF v_function_oid IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: resolve_function_identity_not_found';
  END IF;

  SELECT
    pg_catalog.pg_get_userbyid(procedure_row.proowner),
    language_row.lanname,
    procedure_row.prosecdef,
    procedure_row.provolatile,
    procedure_row.proconfig,
    procedure_row.prosrc,
    procedure_row.pronargs
  INTO
    v_owner,
    v_language,
    v_security_definer,
    v_volatile,
    v_config,
    v_source,
    v_arg_count
  FROM pg_catalog.pg_proc AS procedure_row
  JOIN pg_catalog.pg_language AS language_row
    ON language_row.oid = procedure_row.prolang
  WHERE procedure_row.oid = v_function_oid;

  IF v_owner IS DISTINCT FROM 'postgres' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: function_owner_not_postgres';
  END IF;

  IF v_language IS DISTINCT FROM 'plpgsql' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: function_language_not_plpgsql';
  END IF;

  IF NOT COALESCE(v_security_definer, false) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: function_not_security_definer';
  END IF;

  -- 's' = STABLE in pg_proc.provolatile
  IF v_volatile IS DISTINCT FROM 's' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: function_not_stable';
  END IF;

  IF NOT (
    COALESCE(v_config, ARRAY[]::text[]) @> ARRAY['search_path=pg_catalog, public']::text[]
    OR COALESCE(v_config, ARRAY[]::text[]) @> ARRAY['search_path=pg_catalog,public']::text[]
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: function_search_path_unsafe';
  END IF;

  IF COALESCE(v_arg_count, -1) IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: unexpected_function_arguments';
  END IF;

  IF position('auth.uid' IN v_source) = 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: auth_uid_binding_missing';
  END IF;

  IF position('is_owner(' IN v_source) > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: is_owner_gate_forbidden';
  END IF;

  IF position('limit 1' IN lower(v_source)) > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: arbitrary_limit_1_forbidden';
  END IF;

  FOREACH v_token IN ARRAY ARRAY[
    'auth_required',
    'profile_not_found',
    'profile_ambiguous',
    'profile_deleted',
    'profile_inactive',
    'profile_invalid_role',
    'account_deleted'
  ]
  LOOP
    IF position(v_token IN v_source) = 0 THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: failure_token_missing';
    END IF;
  END LOOP;

  -- Sensitive fields must not appear in return path (source scan of assigned columns).
  IF position('phone' IN lower(v_source)) > 0
     OR position('email' IN lower(v_source)) > 0
     OR position('service_role' IN lower(v_source)) > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: forbidden_field_or_service_role_in_source';
  END IF;

  SELECT
    pg_catalog.array_agg(parameter_row.parameter_name ORDER BY parameter_row.ordinality),
    pg_catalog.array_agg(parameter_row.data_type ORDER BY parameter_row.ordinality)
  INTO v_return_names, v_return_types
  FROM (
    SELECT
      ordinality,
      COALESCE(procedure_row.proargnames[ordinality], '') AS parameter_name,
      pg_catalog.format_type(procedure_row.proallargtypes[ordinality], NULL) AS data_type
    FROM pg_catalog.pg_proc AS procedure_row
    CROSS JOIN LATERAL pg_catalog.generate_subscripts(procedure_row.proallargtypes, 1) AS ordinality
    WHERE procedure_row.oid = v_function_oid
      AND procedure_row.proargmodes[ordinality] = 't'
  ) AS parameter_row;

  IF v_return_names IS DISTINCT FROM ARRAY['profile_id', 'account_id', 'role', 'name', 'active']::text[]
     OR v_return_types IS DISTINCT FROM ARRAY['uuid', 'uuid', 'text', 'text', 'boolean']::text[] THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: return_signature_mismatch';
  END IF;

  -- ACL: authenticated EXECUTE only among PUBLIC/anon/authenticated/service_role.
  IF NOT pg_catalog.has_function_privilege('authenticated', v_function_oid, 'EXECUTE') THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: authenticated_execute_missing';
  END IF;

  IF pg_catalog.has_function_privilege('anon', v_function_oid, 'EXECUTE')
     OR pg_catalog.has_function_privilege('service_role', v_function_oid, 'EXECUTE') THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: forbidden_execute_privilege_true';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT
        CASE
          WHEN privilege_row.grantee = 0 THEN 'PUBLIC'
          ELSE pg_catalog.pg_get_userbyid(privilege_row.grantee)
        END AS grantee_name,
        privilege_row.privilege_type
      FROM pg_catalog.pg_proc AS procedure_row
      CROSS JOIN LATERAL pg_catalog.aclexplode(
        COALESCE(procedure_row.proacl, pg_catalog.acldefault('f', procedure_row.proowner))
      ) AS privilege_row
      WHERE procedure_row.oid = v_function_oid
        AND privilege_row.privilege_type = 'EXECUTE'
    ) AS execute_grant
    WHERE execute_grant.grantee_name IN ('PUBLIC', 'anon', 'service_role')
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: forbidden_execute_grant_present';
  END IF;

  SELECT pg_catalog.obj_description(v_function_oid, 'pg_proc')
  INTO v_comment;

  IF v_comment IS NULL
     OR position('20260714201500_self_profile_resolution_rpc' IN v_comment) = 0
     OR position('ZAM-AUTH-001D-SELF-PROFILE-RPC-SQL-DRAFT-1' IN v_comment) = 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: function_comment_missing_or_incomplete';
  END IF;

  -- Do not re-grant identity helpers to authenticated (001F revoke must remain).
  FOREACH v_token IN ARRAY ARRAY[
    'public.current_profile_id()',
    'public.current_account_id()',
    'public.current_profile_role()'
  ]
  LOOP
    v_helper_oid := pg_catalog.to_regprocedure(v_token);
    IF v_helper_oid IS NOT NULL
       AND pg_catalog.has_function_privilege('authenticated', v_helper_oid, 'EXECUTE') THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: identity_helper_execute_leak';
    END IF;
  END LOOP;
END;
$postcondition$;

COMMIT;
