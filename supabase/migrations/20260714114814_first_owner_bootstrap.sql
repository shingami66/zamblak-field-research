-- =============================================================================
-- ZAM-AUTH-001C first-Owner bootstrap (SQL draft)
-- Task: ZAM-AUTH-001C-FIRST-OWNER-BOOTSTRAP-SQL-DRAFT-1 / R1
-- Status: DRAFT — NOT APPLIED. Requires independent SQL review and later DEV/DEMO apply.
--
-- Product: globally one-time deployment initialization under INVITATION_OR_ADMIN_SEED_ONLY.
-- Creates exactly one public.accounts row and one active non-deleted Owner profile.
-- Not recovery. Not multi-tenant provisioning. Not browser/app/service_role callable.
--
-- Business failures use RAISE EXCEPTION ERRCODE P0001 with exact message tokens:
--   bootstrap_already_completed
--   bootstrap_historical_owner_present
--   bootstrap_preexisting_accounts
--   auth_user_not_found
--   auth_user_already_profiled
--   invalid_input
-- Unauthorized EXECUTE fails at PostgreSQL ACL (bootstrap_forbidden).
-- Unexpected errors are not swallowed (no broad WHEN OTHERS).
--
-- Frozen advisory lock:
--   namespace: zamblak:first-owner-bootstrap:v1
--   derivation: SHA-256(UTF-8 namespace), first 64 bits as signed big-endian integer
--   frozen bigint: -1850433270600458575
--   MUST NOT be changed or derived from runtime input (no hashtext/hashtextextended).
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Preconditions (fail closed)
-- -----------------------------------------------------------------------------
DO $precondition$
DECLARE
  v_public_schema oid := pg_catalog.to_regnamespace('public');
  v_auth_schema oid := pg_catalog.to_regnamespace('auth');
  v_accounts_oid oid;
  v_profiles_oid oid;
  v_auth_users_oid oid;
  v_index_oid oid;
  v_index_predicate text;
  v_index_unique boolean;
  v_role_check text;
  v_fk_count bigint;
  v_unique_auth_count bigint;
  v_col_type text;
BEGIN
  IF pg_catalog.current_user() IS DISTINCT FROM 'postgres' THEN
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

  -- Untrusted CREATE on public is forbidden (hardened migration pattern).
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
  v_auth_users_oid := pg_catalog.to_regclass('auth.users');

  IF v_accounts_oid IS NULL OR v_profiles_oid IS NULL OR v_auth_users_oid IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_precondition_failed: required_table_missing';
  END IF;

  -- Fresh-state: refuse any pre-existing bootstrap_first_owner overload.
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc AS procedure_row
    JOIN pg_catalog.pg_namespace AS namespace_row
      ON namespace_row.oid = procedure_row.pronamespace
    WHERE namespace_row.nspname = 'public'
      AND procedure_row.proname = 'bootstrap_first_owner'
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_object_conflict: bootstrap_first_owner_exists';
  END IF;

  -- Required columns and types (accounts).
  FOREACH v_col_type IN ARRAY ARRAY[
    'id:uuid',
    'name:text',
    'created_at:timestamp with time zone',
    'updated_at:timestamp with time zone',
    'deleted_at:timestamp with time zone'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_attribute AS attribute_row
      JOIN pg_catalog.pg_type AS type_row ON type_row.oid = attribute_row.atttypid
      WHERE attribute_row.attrelid = v_accounts_oid
        AND attribute_row.attnum > 0
        AND NOT attribute_row.attisdropped
        AND attribute_row.attname = split_part(v_col_type, ':', 1)
        AND pg_catalog.format_type(attribute_row.atttypid, attribute_row.atttypmod)
            = split_part(v_col_type, ':', 2)
    ) THEN
      -- deleted_at may be nullable; format_type still returns timestamp with time zone
      IF split_part(v_col_type, ':', 1) = 'deleted_at' THEN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_catalog.pg_attribute AS attribute_row
          WHERE attribute_row.attrelid = v_accounts_oid
            AND attribute_row.attnum > 0
            AND NOT attribute_row.attisdropped
            AND attribute_row.attname = 'deleted_at'
            AND pg_catalog.format_type(attribute_row.atttypid, attribute_row.atttypmod)
                = 'timestamp with time zone'
        ) THEN
          RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'migration_precondition_failed: accounts_column_missing_or_incompatible';
        END IF;
      ELSE
        RAISE EXCEPTION USING
          ERRCODE = 'P0001',
          MESSAGE = 'migration_precondition_failed: accounts_column_missing_or_incompatible';
      END IF;
    END IF;
  END LOOP;

  -- Required columns (profiles).
  IF EXISTS (
    SELECT 1
    FROM (VALUES
      ('id', 'uuid'),
      ('account_id', 'uuid'),
      ('auth_user_id', 'uuid'),
      ('name', 'text'),
      ('phone', 'text'),
      ('role', 'text'),
      ('active', 'boolean'),
      ('deleted_at', 'timestamp with time zone')
    ) AS required_column(column_name, type_name)
    WHERE NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_attribute AS attribute_row
      WHERE attribute_row.attrelid = v_profiles_oid
        AND attribute_row.attnum > 0
        AND NOT attribute_row.attisdropped
        AND attribute_row.attname = required_column.column_name
        AND pg_catalog.format_type(attribute_row.atttypid, attribute_row.atttypmod)
            = required_column.type_name
    )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_precondition_failed: profiles_column_missing_or_incompatible';
  END IF;

  -- Role CHECK chk_profiles_role.
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
      MESSAGE = 'migration_precondition_failed: profile_role_constraint_incompatible';
  END IF;

  -- auth_user_id uniqueness (constraint or unique index).
  SELECT COUNT(*)
  INTO v_unique_auth_count
  FROM pg_catalog.pg_constraint AS constraint_row
  WHERE constraint_row.conrelid = v_profiles_oid
    AND constraint_row.contype IN ('u', 'p')
    AND pg_catalog.pg_get_constraintdef(constraint_row.oid, true) LIKE '%auth_user_id%';

  IF v_unique_auth_count = 0 THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_index AS index_row
      JOIN pg_catalog.pg_class AS class_row ON class_row.oid = index_row.indexrelid
      WHERE index_row.indrelid = v_profiles_oid
        AND index_row.indisunique
        AND index_row.indpred IS NULL
        AND pg_catalog.pg_get_indexdef(index_row.indexrelid) LIKE '%auth_user_id%'
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_precondition_failed: profiles_auth_user_id_unique_missing';
    END IF;
  END IF;

  -- Partial unique active Owner index.
  v_index_oid := pg_catalog.to_regclass('public.idx_profiles_unique_active_owner_per_account');
  IF v_index_oid IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_precondition_failed: active_owner_unique_index_missing';
  END IF;

  SELECT
    index_row.indisunique,
    pg_catalog.pg_get_expr(index_row.indpred, index_row.indrelid)
  INTO v_index_unique, v_index_predicate
  FROM pg_catalog.pg_index AS index_row
  WHERE index_row.indexrelid = v_index_oid;

  IF NOT COALESCE(v_index_unique, false)
     OR v_index_predicate IS NULL
     OR position('owner' IN v_index_predicate) = 0
     OR position('active' IN v_index_predicate) = 0
     OR position('deleted_at' IN v_index_predicate) = 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_precondition_failed: active_owner_unique_index_incompatible';
  END IF;

  -- account_id FK from profiles to accounts.
  SELECT COUNT(*)
  INTO v_fk_count
  FROM pg_catalog.pg_constraint AS constraint_row
  WHERE constraint_row.conrelid = v_profiles_oid
    AND constraint_row.contype = 'f'
    AND constraint_row.confrelid = v_accounts_oid
    AND pg_catalog.pg_get_constraintdef(constraint_row.oid, true) LIKE '%account_id%';

  IF v_fk_count = 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_precondition_failed: profiles_account_fk_missing';
  END IF;

  -- postgres must SELECT auth.users (authoritative existence checks).
  IF NOT pg_catalog.has_table_privilege('postgres', 'auth.users', 'SELECT') THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_precondition_failed: postgres_cannot_select_auth_users';
  END IF;
END;
$precondition$;

-- -----------------------------------------------------------------------------
-- Function: public.bootstrap_first_owner(uuid, text, text, text)
-- -----------------------------------------------------------------------------
-- Lock namespace: zamblak:first-owner-bootstrap:v1
-- Frozen bigint (do not change): -1850433270600458575
-- First business operation: pg_catalog.pg_advisory_xact_lock(-1850433270600458575::bigint)
-- Null p_auth_user_id fails closed as invalid_input (no write). Non-null missing auth.users → auth_user_not_found.

CREATE FUNCTION public.bootstrap_first_owner(
  p_auth_user_id uuid,
  p_account_name text,
  p_owner_display_name text,
  p_owner_phone text DEFAULT NULL
)
RETURNS TABLE (
  account_id uuid,
  profile_id uuid,
  auth_user_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_account_name text;
  v_owner_name text;
  v_owner_phone text;
  v_new_account_id uuid;
  v_new_profile_id uuid;
BEGIN
  -- 0) Global serialization (fixed transaction-scoped advisory lock).
  PERFORM pg_catalog.pg_advisory_xact_lock(-1850433270600458575::bigint);

  -- 1) Active non-deleted Owner exists anywhere.
  IF EXISTS (
    SELECT 1
    FROM public.profiles AS profile_row
    WHERE profile_row.role = 'owner'
      AND profile_row.active = true
      AND profile_row.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'bootstrap_already_completed';
  END IF;

  -- 2) Any historical Owner (inactive / soft-deleted / other non-active state).
  --    Post-success path never reaches later gates: active Owner already failed closed.
  IF EXISTS (
    SELECT 1
    FROM public.profiles AS profile_row
    WHERE profile_row.role = 'owner'
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'bootstrap_historical_owner_present';
  END IF;

  -- 3) Any pre-existing account (including soft-deleted).
  IF EXISTS (
    SELECT 1
    FROM public.accounts AS account_row
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'bootstrap_preexisting_accounts';
  END IF;

  -- 4) Null Auth UUID: fail closed as invalid_input (before auth.users lookup; no write).
  IF p_auth_user_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'invalid_input';
  END IF;

  -- 5) Mandatory schema-qualified auth.users existence (non-null UUID only).
  IF NOT EXISTS (
    SELECT 1
    FROM auth.users AS auth_user_row
    WHERE auth_user_row.id = p_auth_user_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'auth_user_not_found';
  END IF;

  -- 6) Auth user already profiled (any state).
  IF EXISTS (
    SELECT 1
    FROM public.profiles AS profile_row
    WHERE profile_row.auth_user_id = p_auth_user_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'auth_user_already_profiled';
  END IF;

  -- 7) Input validation (trimmed non-empty account/Owner names).
  v_account_name := pg_catalog.btrim(p_account_name);
  v_owner_name := pg_catalog.btrim(p_owner_display_name);
  v_owner_phone := NULLIF(pg_catalog.btrim(p_owner_phone), '');

  IF v_account_name IS NULL
     OR v_account_name = ''
     OR v_owner_name IS NULL
     OR v_owner_name = '' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'invalid_input';
  END IF;

  -- Atomic writes: one account + one hard-coded Owner profile.
  INSERT INTO public.accounts (name)
  VALUES (v_account_name)
  RETURNING public.accounts.id INTO v_new_account_id;

  INSERT INTO public.profiles (
    account_id,
    auth_user_id,
    name,
    phone,
    role,
    active,
    deleted_at
  )
  VALUES (
    v_new_account_id,
    p_auth_user_id,
    v_owner_name,
    v_owner_phone,
    'owner',
    true,
    NULL
  )
  RETURNING public.profiles.id INTO v_new_profile_id;

  account_id := v_new_account_id;
  profile_id := v_new_profile_id;
  auth_user_id := p_auth_user_id;
  RETURN NEXT;
END;
$function$;

ALTER FUNCTION public.bootstrap_first_owner(uuid, text, text, text) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.bootstrap_first_owner(uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bootstrap_first_owner(uuid, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.bootstrap_first_owner(uuid, text, text, text) FROM authenticated;
REVOKE ALL ON FUNCTION public.bootstrap_first_owner(uuid, text, text, text) FROM service_role;

COMMENT ON FUNCTION public.bootstrap_first_owner(uuid, text, text, text) IS
  'managed_by: 20260714114814_first_owner_bootstrap; task: ZAM-AUTH-001C-FIRST-OWNER-BOOTSTRAP-SQL-DRAFT-1; purpose: globally one-time current-MVP deployment first Owner bootstrap; lock: zamblak:first-owner-bootstrap:v1 / -1850433270600458575; invoke: privileged SQL-owner (postgres) session only; not for browser/app/anon/authenticated/service_role EXECUTE';

-- -----------------------------------------------------------------------------
-- Postconditions (fail closed)
-- -----------------------------------------------------------------------------
DO $postcondition$
DECLARE
  v_function_oid oid;
  v_owner text;
  v_language text;
  v_security_definer boolean;
  v_config text[];
  v_source text;
  v_comment text;
  v_return_names text[];
  v_return_types text[];
  v_arg_types text[];
  v_overload_count bigint;
  v_role_check text;
  v_index_oid oid;
BEGIN
  IF pg_catalog.current_user() IS DISTINCT FROM 'postgres' THEN
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
    AND procedure_row.proname = 'bootstrap_first_owner';

  IF v_overload_count IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: unexpected_bootstrap_overload_count';
  END IF;

  SELECT procedure_row.oid
  INTO v_function_oid
  FROM pg_catalog.pg_proc AS procedure_row
  JOIN pg_catalog.pg_namespace AS namespace_row
    ON namespace_row.oid = procedure_row.pronamespace
  WHERE namespace_row.nspname = 'public'
    AND procedure_row.proname = 'bootstrap_first_owner'
    AND pg_catalog.pg_get_function_identity_arguments(procedure_row.oid)
        = 'p_auth_user_id uuid, p_account_name text, p_owner_display_name text, p_owner_phone text';

  IF v_function_oid IS NULL THEN
    -- Fallback identity-args style without names.
    SELECT procedure_row.oid
    INTO v_function_oid
    FROM pg_catalog.pg_proc AS procedure_row
    JOIN pg_catalog.pg_namespace AS namespace_row
      ON namespace_row.oid = procedure_row.pronamespace
    WHERE namespace_row.nspname = 'public'
      AND procedure_row.proname = 'bootstrap_first_owner'
      AND pg_catalog.pg_get_function_identity_arguments(procedure_row.oid)
          IN (
            'p_auth_user_id uuid, p_account_name text, p_owner_display_name text, p_owner_phone text',
            'uuid, text, text, text'
          );
  END IF;

  IF v_function_oid IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: bootstrap_function_identity_not_found';
  END IF;

  SELECT
    pg_catalog.pg_get_userbyid(procedure_row.proowner),
    language_row.lanname,
    procedure_row.prosecdef,
    procedure_row.proconfig,
    procedure_row.prosrc
  INTO
    v_owner,
    v_language,
    v_security_definer,
    v_config,
    v_source
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

  IF v_config IS DISTINCT FROM ARRAY['search_path=pg_catalog, public']::text[]
     AND v_config IS DISTINCT FROM ARRAY['search_path=pg_catalog,public']::text[] THEN
    -- Accept either spacing variant of the fixed search_path setting.
    IF NOT (
      COALESCE(v_config, ARRAY[]::text[]) @> ARRAY['search_path=pg_catalog, public']::text[]
      OR COALESCE(v_config, ARRAY[]::text[]) @> ARRAY['search_path=pg_catalog,public']::text[]
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: function_search_path_unsafe';
    END IF;
  END IF;

  IF position('-1850433270600458575' IN v_source) = 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: frozen_lock_bigint_missing_from_source';
  END IF;

  IF position('auth.users' IN v_source) = 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: auth_users_reference_missing';
  END IF;

  IF position('auth.uid' IN v_source) > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: auth_uid_forbidden';
  END IF;

  -- RETURNS TABLE columns appear as proargmodes = 't' in catalog order.
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

  IF v_return_names IS DISTINCT FROM ARRAY['account_id', 'profile_id', 'auth_user_id']::text[]
     OR v_return_types IS DISTINCT FROM ARRAY['uuid', 'uuid', 'uuid']::text[] THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: return_signature_mismatch';
  END IF;

  SELECT
    pg_catalog.array_agg(pg_catalog.format_type(type_oid, NULL) ORDER BY ordinality)
  INTO v_arg_types
  FROM pg_catalog.pg_proc AS procedure_row
  CROSS JOIN LATERAL unnest(procedure_row.proargtypes) WITH ORDINALITY AS argument(type_oid, ordinality)
  WHERE procedure_row.oid = v_function_oid;

  IF v_arg_types IS DISTINCT FROM ARRAY['uuid', 'text', 'text', 'text']::text[] THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: argument_signature_mismatch';
  END IF;

  -- EXECUTE must be absent for PUBLIC / app roles / service_role.
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
    WHERE execute_grant.grantee_name IN ('PUBLIC', 'anon', 'authenticated', 'service_role')
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: forbidden_execute_grant_present';
  END IF;

  -- Direct privilege checks.
  IF pg_catalog.has_function_privilege('anon', v_function_oid, 'EXECUTE')
     OR pg_catalog.has_function_privilege('authenticated', v_function_oid, 'EXECUTE')
     OR pg_catalog.has_function_privilege('service_role', v_function_oid, 'EXECUTE') THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: forbidden_execute_privilege_true';
  END IF;

  SELECT pg_catalog.obj_description(v_function_oid, 'pg_proc')
  INTO v_comment;

  IF v_comment IS NULL
     OR position('20260714114814_first_owner_bootstrap' IN v_comment) = 0
     OR position('ZAM-AUTH-001C' IN v_comment) = 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: function_comment_missing_or_incomplete';
  END IF;

  IF NOT pg_catalog.has_table_privilege('postgres', 'auth.users', 'SELECT') THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: postgres_cannot_select_auth_users';
  END IF;

  -- Preserve role constraint and active-Owner unique index.
  SELECT pg_catalog.pg_get_constraintdef(constraint_row.oid, true)
  INTO v_role_check
  FROM pg_catalog.pg_constraint AS constraint_row
  WHERE constraint_row.conrelid = 'public.profiles'::pg_catalog.regclass
    AND constraint_row.conname = 'chk_profiles_role'
    AND constraint_row.contype = 'c'
    AND constraint_row.convalidated;

  IF v_role_check IS NULL
     OR position('''owner''' IN v_role_check) = 0
     OR position('''support_helper''' IN v_role_check) = 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: profile_role_constraint_missing';
  END IF;

  v_index_oid := pg_catalog.to_regclass('public.idx_profiles_unique_active_owner_per_account');
  IF v_index_oid IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: active_owner_unique_index_missing';
  END IF;
END;
$postcondition$;

COMMIT;
