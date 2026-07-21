-- ZAM-PARTICIPATION assign-only RPCs (create + three-month/eligibility check + project list)
-- Task: ZAM-PARTICIPATION-ASSIGN-SCHEMA-RPC-MIGRATION-1
-- Design authority: ZAM-PARTICIPATION-ASSIGN-SCHEMA-RPC-DESIGN-1 (+ required corrections)
-- Target: designated DEV/DEMO gdegnwglakyblnmxgiwx (PostgreSQL 17.6)
--
-- Implements (product, authenticated EXECUTE):
--   - create_participation(uuid, uuid, uuid)
--   - check_respondent_three_month_warning(uuid, uuid)
--   - list_project_participations(uuid, text, integer, integer)
-- Internal (not client-callable):
--   - participation_assign_warning_payload(uuid, uuid, uuid)
--
-- Preserves:
--   participations table/RLS/triggers/unique index;
--   enforce_participation_project_state; check_participation_account_consistency;
--   no table ACL widening; no pricing/payments/review transition RPCs;
--   finance-blind return shapes; warnings never block insert.
--
-- Does not: apply itself; grant table mutation privileges; expose assigned_to_profile_id
--           in client-facing returns; treat NULL/blank domains as matching.

BEGIN;

SELECT pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('zamblak:20260718120000_participation_assign_rpcs', 0)
);

-- ---------------------------------------------------------------------------
-- 1) Fail-closed preflight
-- ---------------------------------------------------------------------------

DO $preflight$
DECLARE
  v_part oid;
  v_proj oid;
  v_resp oid;
  v_fn_name text;
  v_idx oid;
BEGIN
  IF current_user IS DISTINCT FROM 'postgres' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_precondition_failed: current_user_must_be_postgres';
  END IF;

  v_part := to_regclass('public.participations');
  v_proj := to_regclass('public.projects');
  v_resp := to_regclass('public.respondents');

  IF v_part IS NULL OR v_proj IS NULL OR v_resp IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_precondition_failed: required_table_missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    WHERE c.oid = v_part AND c.relkind = 'r' AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_precondition_failed: participations_rls_not_enabled';
  END IF;

  IF to_regprocedure('public.enforce_participation_project_state()') IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_precondition_failed: enforce_participation_project_state_missing';
  END IF;

  IF to_regprocedure('public.check_participation_account_consistency()') IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_precondition_failed: check_participation_account_consistency_missing';
  END IF;

  IF to_regprocedure('public.is_owner()') IS NULL
     OR to_regprocedure('public.is_support_helper()') IS NULL
     OR to_regprocedure('public.current_account_id()') IS NULL
     OR to_regprocedure('public.current_profile_id()') IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_precondition_failed: session_helpers_missing';
  END IF;

  v_idx := to_regclass('public.idx_participations_unique_respondent_per_project');
  IF v_idx IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_precondition_failed: unique_participation_index_missing';
  END IF;

  FOREACH v_fn_name IN ARRAY ARRAY[
    'create_participation',
    'check_respondent_three_month_warning',
    'list_project_participations',
    'participation_assign_warning_payload'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_catalog.pg_proc AS p
      JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = v_fn_name
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_precondition_failed: function_name_collision:' || v_fn_name;
    END IF;
  END LOOP;

  -- Required parent columns for assign slice.
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute a
    WHERE a.attrelid = v_proj AND a.attname = 'domain' AND a.attnum > 0 AND NOT a.attisdropped
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute a
    WHERE a.attrelid = v_proj AND a.attname = 'requires_three_month_warning'
      AND a.attnum > 0 AND NOT a.attisdropped
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute a
    WHERE a.attrelid = v_proj AND a.attname = 'min_age' AND a.attnum > 0 AND NOT a.attisdropped
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute a
    WHERE a.attrelid = v_proj AND a.attname = 'max_age' AND a.attnum > 0 AND NOT a.attisdropped
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_attribute a
    WHERE a.attrelid = v_proj AND a.attname = 'required_resident_type'
      AND a.attnum > 0 AND NOT a.attisdropped
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_precondition_failed: projects_eligibility_columns_missing';
  END IF;
END
$preflight$;

-- ---------------------------------------------------------------------------
-- 2) Internal warning payload helper (not client-callable)
-- ---------------------------------------------------------------------------

CREATE FUNCTION public.participation_assign_warning_payload(
  p_account_id uuid,
  p_project_id uuid,
  p_respondent_id uuid
)
RETURNS TABLE (
  three_month_warning boolean,
  requires_three_month_flag boolean,
  project_domain text,
  match_count integer,
  eligibility_warning boolean,
  eligibility_warning_codes text[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
-- managed_by: 20260718120000_participation_assign_rpcs
-- Internal only: computes non-blocking three-month + eligibility soft warnings.
DECLARE
  v_domain_raw text;
  v_domain_norm text;
  v_requires boolean;
  v_min_age integer;
  v_max_age integer;
  v_required_resident text;
  v_resp_age integer;
  v_resp_resident text;
  v_match_count integer := 0;
  v_three_month boolean := false;
  v_codes text[] := ARRAY[]::text[];
  v_elig boolean := false;
BEGIN
  SELECT
    project_row.domain,
    project_row.requires_three_month_warning,
    project_row.min_age,
    project_row.max_age,
    project_row.required_resident_type
  INTO
    v_domain_raw,
    v_requires,
    v_min_age,
    v_max_age,
    v_required_resident
  FROM public.projects AS project_row
  WHERE project_row.id = p_project_id
    AND project_row.account_id = p_account_id
    AND project_row.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'project_not_found';
  END IF;

  SELECT
    respondent_row.age,
    respondent_row.resident_type
  INTO
    v_resp_age,
    v_resp_resident
  FROM public.respondents AS respondent_row
  WHERE respondent_row.id = p_respondent_id
    AND respondent_row.account_id = p_account_id
    AND respondent_row.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'respondent_not_found';
  END IF;

  v_domain_norm := lower(btrim(COALESCE(v_domain_raw, '')));
  IF v_domain_norm = '' THEN
    v_domain_norm := NULL;
  END IF;

  -- Three-month: blank/NULL target domain never matches.
  IF COALESCE(v_requires, false) AND v_domain_norm IS NOT NULL THEN
    SELECT count(*)::integer
    INTO v_match_count
    FROM public.participations AS part
    JOIN public.projects AS other_project
      ON other_project.id = part.project_id
    WHERE part.account_id = p_account_id
      AND part.respondent_id = p_respondent_id
      AND part.deleted_at IS NULL
      AND other_project.account_id = p_account_id
      AND other_project.deleted_at IS NULL
      AND other_project.id IS DISTINCT FROM p_project_id
      AND lower(btrim(COALESCE(other_project.domain, ''))) = v_domain_norm
      AND lower(btrim(COALESCE(other_project.domain, ''))) <> ''
      AND part.created_at >= (pg_catalog.now() - interval '3 months');

    v_three_month := (COALESCE(v_match_count, 0) > 0);
  ELSE
    v_match_count := 0;
    v_three_month := false;
  END IF;

  -- Eligibility soft warnings (never block assignment).
  IF (v_min_age IS NOT NULL OR v_max_age IS NOT NULL) AND v_resp_age IS NULL THEN
    v_codes := array_append(v_codes, 'age_missing');
  END IF;
  IF v_min_age IS NOT NULL AND v_resp_age IS NOT NULL AND v_resp_age < v_min_age THEN
    v_codes := array_append(v_codes, 'age_below_min');
  END IF;
  IF v_max_age IS NOT NULL AND v_resp_age IS NOT NULL AND v_resp_age > v_max_age THEN
    v_codes := array_append(v_codes, 'age_above_max');
  END IF;
  IF v_required_resident IS NOT NULL
     AND v_required_resident IS DISTINCT FROM 'any'
     AND v_resp_resident IS DISTINCT FROM v_required_resident THEN
    v_codes := array_append(v_codes, 'resident_type_mismatch');
  END IF;

  v_elig := (COALESCE(array_length(v_codes, 1), 0) > 0);

  three_month_warning := v_three_month;
  requires_three_month_flag := COALESCE(v_requires, false);
  project_domain := CASE WHEN v_domain_norm IS NULL THEN NULL ELSE v_domain_raw END;
  match_count := COALESCE(v_match_count, 0);
  eligibility_warning := v_elig;
  eligibility_warning_codes := v_codes;
  RETURN NEXT;
END;
$function$;

COMMENT ON FUNCTION public.participation_assign_warning_payload(uuid, uuid, uuid) IS
  'managed_by: 20260718120000_participation_assign_rpcs; internal non-blocking warning payload; not client-callable';

REVOKE ALL ON FUNCTION public.participation_assign_warning_payload(uuid, uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.participation_assign_warning_payload(uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) Product RPCs
-- ---------------------------------------------------------------------------

-- 3a) Pre-assign / soft-warning check (never blocks; pure read of parents + history)
CREATE FUNCTION public.check_respondent_three_month_warning(
  p_project_id uuid,
  p_respondent_id uuid
)
RETURNS TABLE (
  three_month_warning boolean,
  requires_three_month_flag boolean,
  project_domain text,
  match_count integer,
  eligibility_warning boolean,
  eligibility_warning_codes text[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
-- managed_by: 20260718120000_participation_assign_rpcs
DECLARE
  v_account_id uuid;
BEGIN
  IF NOT (
    COALESCE(public.is_owner(), false)
    OR COALESCE(public.is_support_helper(), false)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'participation_access_denied';
  END IF;

  v_account_id := public.current_account_id();
  IF v_account_id IS NULL OR public.current_profile_id() IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'participation_access_denied';
  END IF;

  IF p_project_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'project_not_found';
  END IF;
  IF p_respondent_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'respondent_not_found';
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.participation_assign_warning_payload(
    v_account_id,
    p_project_id,
    p_respondent_id
  );
END;
$function$;

-- 3b) Assign existing respondent to active project (neutral insert)
CREATE FUNCTION public.create_participation(
  p_project_id uuid,
  p_respondent_id uuid,
  p_assigned_to_profile_id uuid DEFAULT NULL
)
RETURNS TABLE (
  participation_id uuid,
  project_id uuid,
  respondent_id uuid,
  contact_status text,
  participation_decision_status text,
  consent_status text,
  whatsapp_status text,
  form_status text,
  created_at timestamptz,
  updated_at timestamptz,
  three_month_warning boolean,
  eligibility_warning boolean,
  eligibility_warning_codes text[]
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
-- managed_by: 20260718120000_participation_assign_rpcs
DECLARE
  v_account_id uuid;
  v_profile_id uuid;
  v_project_status text;
  v_project_deleted_at timestamptz;
  v_assigned uuid;
  v_id uuid;
  v_warn record;
BEGIN
  IF NOT (
    COALESCE(public.is_owner(), false)
    OR COALESCE(public.is_support_helper(), false)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'participation_access_denied';
  END IF;

  v_account_id := public.current_account_id();
  v_profile_id := public.current_profile_id();
  IF v_account_id IS NULL OR v_profile_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'participation_access_denied';
  END IF;

  IF p_project_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'project_not_found';
  END IF;
  IF p_respondent_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'respondent_not_found';
  END IF;

  -- Assigned profile: null or current profile only (no cross-profile assign in this slice).
  IF p_assigned_to_profile_id IS NULL THEN
    v_assigned := NULL;
  ELSIF p_assigned_to_profile_id = v_profile_id THEN
    v_assigned := v_profile_id;
  ELSE
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_assigned_profile';
  END IF;

  -- Explicit parent validation (stable codes); triggers re-enforce on INSERT.
  SELECT project_row.status, project_row.deleted_at
  INTO v_project_status, v_project_deleted_at
  FROM public.projects AS project_row
  WHERE project_row.id = p_project_id
    AND project_row.account_id = v_account_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'project_not_found';
  END IF;
  IF v_project_deleted_at IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'project_not_found';
  END IF;
  IF v_project_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'project_not_active';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.respondents AS respondent_row
    WHERE respondent_row.id = p_respondent_id
      AND respondent_row.account_id = v_account_id
      AND respondent_row.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'respondent_not_found';
  END IF;

  -- Warnings computed before insert; never block.
  SELECT *
  INTO v_warn
  FROM public.participation_assign_warning_payload(
    v_account_id,
    p_project_id,
    p_respondent_id
  );

  BEGIN
    INSERT INTO public.participations (
      account_id,
      project_id,
      respondent_id,
      assigned_to_profile_id,
      created_by,
      updated_by
    )
    VALUES (
      v_account_id,
      p_project_id,
      p_respondent_id,
      v_assigned,
      v_profile_id,
      NULL
    )
    RETURNING id INTO v_id;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION USING
        ERRCODE = '23505',
        MESSAGE = 'duplicate_participation';
    WHEN OTHERS THEN
      -- Normalize known project-state trigger tokens (and re-raise stable codes).
      IF SQLERRM = 'project_not_found' THEN
        RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'project_not_found';
      ELSIF SQLERRM = 'project_deleted' THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'project_not_found';
      ELSIF SQLERRM = 'project_not_active' THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'project_not_active';
      ELSIF SQLERRM LIKE 'Account consistency violation%' THEN
        RAISE EXCEPTION USING
          ERRCODE = 'P0001',
          MESSAGE = 'unexpected_participation_error';
      ELSIF SQLERRM IN (
        'participation_access_denied',
        'project_not_found',
        'project_not_active',
        'respondent_not_found',
        'invalid_assigned_profile',
        'duplicate_participation',
        'invalid_pagination',
        'unexpected_participation_error'
      ) THEN
        RAISE;
      ELSE
        RAISE EXCEPTION USING
          ERRCODE = 'P0001',
          MESSAGE = 'unexpected_participation_error';
      END IF;
  END;

  RETURN QUERY
  SELECT
    part.id,
    part.project_id,
    part.respondent_id,
    part.contact_status,
    part.participation_decision_status,
    part.consent_status,
    part.whatsapp_status,
    part.form_status,
    part.created_at,
    part.updated_at,
    v_warn.three_month_warning,
    v_warn.eligibility_warning,
    v_warn.eligibility_warning_codes
  FROM public.participations AS part
  WHERE part.id = v_id;
END;
$function$;

-- 3c) Dual-role finance-blind project participation list
CREATE FUNCTION public.list_project_participations(
  p_project_id uuid,
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  participation_id uuid,
  respondent_id uuid,
  respondent_name text,
  respondent_mobile text,
  respondent_age integer,
  respondent_resident_type text,
  contact_status text,
  participation_decision_status text,
  consent_status text,
  whatsapp_status text,
  form_status text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
-- managed_by: 20260718120000_participation_assign_rpcs
DECLARE
  v_account_id uuid;
  v_search text;
  v_pattern text;
  v_probe text;
  v_use_mobile_probe boolean := false;
BEGIN
  IF NOT (
    COALESCE(public.is_owner(), false)
    OR COALESCE(public.is_support_helper(), false)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'participation_access_denied';
  END IF;

  v_account_id := public.current_account_id();
  IF v_account_id IS NULL OR public.current_profile_id() IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'participation_access_denied';
  END IF;

  IF p_project_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'project_not_found';
  END IF;

  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100
     OR p_offset IS NULL OR p_offset < 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_pagination';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.projects AS project_row
    WHERE project_row.id = p_project_id
      AND project_row.account_id = v_account_id
      AND project_row.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'project_not_found';
  END IF;

  IF p_search IS NULL THEN
    v_search := NULL;
  ELSE
    v_search := btrim(p_search);
    IF v_search = '' THEN
      v_search := NULL;
    ELSIF char_length(v_search) > 80 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_pagination';
    ELSE
      v_pattern :=
        '%'
        || replace(replace(replace(v_search, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_')
        || '%';
      v_probe := regexp_replace(v_search, '[[:space:]\+\-\(\)]', '', 'g');
      v_probe := regexp_replace(v_probe, '[^0-9]', '', 'g');
      IF char_length(v_probe) >= 3 THEN
        v_use_mobile_probe := true;
      END IF;
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    part.id,
    part.respondent_id,
    respondent_row.name,
    respondent_row.mobile,
    respondent_row.age,
    respondent_row.resident_type,
    part.contact_status,
    part.participation_decision_status,
    part.consent_status,
    part.whatsapp_status,
    part.form_status,
    part.created_at,
    part.updated_at
  FROM public.participations AS part
  JOIN public.respondents AS respondent_row
    ON respondent_row.id = part.respondent_id
  WHERE part.account_id = v_account_id
    AND part.project_id = p_project_id
    AND part.deleted_at IS NULL
    AND respondent_row.account_id = v_account_id
    AND (
      v_search IS NULL
      OR respondent_row.name ILIKE v_pattern ESCAPE E'\\'
      OR (
        v_use_mobile_probe
        AND (
          respondent_row.mobile LIKE ('%' || v_probe || '%')
          OR respondent_row.normalized_mobile LIKE ('%' || v_probe || '%')
        )
      )
    )
  ORDER BY part.created_at DESC, part.id DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;

COMMENT ON FUNCTION public.check_respondent_three_month_warning(uuid, uuid) IS
  'managed_by: 20260718120000_participation_assign_rpcs; owner/SH non-blocking three-month + eligibility soft warning check';
COMMENT ON FUNCTION public.create_participation(uuid, uuid, uuid) IS
  'managed_by: 20260718120000_participation_assign_rpcs; owner/SH neutral participation assignment; warnings non-blocking';
COMMENT ON FUNCTION public.list_project_participations(uuid, text, integer, integer) IS
  'managed_by: 20260718120000_participation_assign_rpcs; owner/SH finance-blind project participation list';

-- ---------------------------------------------------------------------------
-- 4) EXECUTE ACL matrix (product RPCs)
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.check_respondent_three_month_warning(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_participation(uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_project_participations(uuid, text, integer, integer) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.check_respondent_three_month_warning(uuid, uuid)
  FROM PUBLIC, anon, service_role;
REVOKE EXECUTE ON FUNCTION public.create_participation(uuid, uuid, uuid)
  FROM PUBLIC, anon, service_role;
REVOKE EXECUTE ON FUNCTION public.list_project_participations(uuid, text, integer, integer)
  FROM PUBLIC, anon, service_role;

GRANT EXECUTE ON FUNCTION public.check_respondent_three_month_warning(uuid, uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_participation(uuid, uuid, uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_project_participations(uuid, text, integer, integer)
  TO authenticated;

-- Re-assert internal helper remains non-client-callable.
REVOKE EXECUTE ON FUNCTION public.participation_assign_warning_payload(uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5) Catalog postconditions (no business-row access / no PII)
-- ---------------------------------------------------------------------------

DO $postcondition$
DECLARE
  v_authenticated_oid oid := (
    SELECT role_row.oid FROM pg_catalog.pg_roles AS role_row WHERE role_row.rolname = 'authenticated'
  );
  v_anon_oid oid := (
    SELECT role_row.oid FROM pg_catalog.pg_roles AS role_row WHERE role_row.rolname = 'anon'
  );
  v_service_role_oid oid := (
    SELECT role_row.oid FROM pg_catalog.pg_roles AS role_row WHERE role_row.rolname = 'service_role'
  );
  v_product text[] := ARRAY[
    'create_participation(uuid,uuid,uuid)',
    'check_respondent_three_month_warning(uuid,uuid)',
    'list_project_participations(uuid,text,integer,integer)'
  ];
  v_sig text;
  v_fn oid;
  v_def text;
  v_has_exec_auth boolean;
  v_has_exec_anon boolean;
  v_has_exec_service boolean;
  v_relacl text;
BEGIN
  IF v_authenticated_oid IS NULL OR v_anon_oid IS NULL OR v_service_role_oid IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: required_role_missing';
  END IF;

  -- Internal helper posture.
  v_fn := to_regprocedure('public.participation_assign_warning_payload(uuid,uuid,uuid)');
  IF v_fn IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: warning_helper_missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    WHERE p.oid = v_fn
      AND p.prosecdef = true
      AND pg_catalog.pg_get_userbyid(p.proowner) = 'postgres'
      AND EXISTS (
        SELECT 1 FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
        WHERE cfg IN (
          'search_path=pg_catalog, public',
          'search_path="pg_catalog, public"'
        )
        OR cfg LIKE 'search_path=%pg_catalog%public%'
      )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: warning_helper_posture';
  END IF;
  IF has_function_privilege('authenticated', v_fn, 'EXECUTE')
     OR has_function_privilege('anon', v_fn, 'EXECUTE')
     OR has_function_privilege('service_role', v_fn, 'EXECUTE') THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: warning_helper_client_execute';
  END IF;

  FOREACH v_sig IN ARRAY v_product
  LOOP
    v_fn := to_regprocedure('public.' || v_sig);
    IF v_fn IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: product_rpc_missing:' || v_sig;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_proc p
      WHERE p.oid = v_fn
        AND p.prosecdef = true
        AND pg_catalog.pg_get_userbyid(p.proowner) = 'postgres'
        AND EXISTS (
          SELECT 1 FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
          WHERE cfg IN (
            'search_path=pg_catalog, public',
            'search_path=pg_catalog,public',
            'search_path="pg_catalog, public"'
          )
          OR cfg LIKE 'search_path=%pg_catalog%public%'
        )
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: product_rpc_posture:' || v_sig;
    END IF;

    v_has_exec_auth := has_function_privilege('authenticated', v_fn, 'EXECUTE');
    v_has_exec_anon := has_function_privilege('anon', v_fn, 'EXECUTE');
    v_has_exec_service := has_function_privilege('service_role', v_fn, 'EXECUTE');

    IF NOT v_has_exec_auth THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: authenticated_execute_missing:' || v_sig;
    END IF;
    IF v_has_exec_anon OR v_has_exec_service THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: forbidden_execute_grant:' || v_sig;
    END IF;

    v_def := pg_catalog.pg_get_functiondef(v_fn);
    IF position('assigned_to_profile_id' IN v_def) > 0
       AND v_sig IS DISTINCT FROM 'create_participation(uuid,uuid,uuid)' THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: assigned_profile_leaked_in_return_or_body:' || v_sig;
    END IF;
    -- create may reference assigned param internally; RETURNS TABLE must not include it.
    IF v_sig = 'create_participation(uuid,uuid,uuid)' THEN
      IF pg_catalog.pg_get_function_result(v_fn) ILIKE '%assigned_to_profile_id%' THEN
        RAISE EXCEPTION USING
          ERRCODE = 'P0001',
          MESSAGE = 'migration_postcondition_failed: create_return_exposes_assigned_profile';
      END IF;
    END IF;

    IF v_def ILIKE '%participation_pricing%'
       OR v_def ILIKE '%price_snapshot%'
       OR v_def ILIKE '%price_per_accepted%'
       OR v_def ILIKE '%amount_due%'
       OR v_def ~* '\bpayments\b' THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: finance_token_in_rpc:' || v_sig;
    END IF;
  END LOOP;

  -- list result must not expose review_status (financial-adjacent) in this slice.
  IF pg_catalog.pg_get_function_result(
       to_regprocedure('public.list_project_participations(uuid,text,integer,integer)')
     ) ILIKE '%review_status%' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: list_exposes_review_status';
  END IF;

  -- create must not return review_status either.
  IF pg_catalog.pg_get_function_result(
       to_regprocedure('public.create_participation(uuid,uuid,uuid)')
     ) ILIKE '%review_status%' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: create_exposes_review_status';
  END IF;

  -- Volatility: reads STABLE, create VOLATILE.
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    WHERE p.oid = to_regprocedure('public.check_respondent_three_month_warning(uuid,uuid)')
      AND p.provolatile = 's'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    WHERE p.oid = to_regprocedure('public.list_project_participations(uuid,text,integer,integer)')
      AND p.provolatile = 's'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    WHERE p.oid = to_regprocedure('public.create_participation(uuid,uuid,uuid)')
      AND p.provolatile = 'v'
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: product_rpc_volatility';
  END IF;

  -- Domain blank-match guard present in helper body.
  v_def := pg_catalog.pg_get_functiondef(
    to_regprocedure('public.participation_assign_warning_payload(uuid,uuid,uuid)')
  );
  IF position('lower(btrim' IN v_def) = 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: domain_normalization_missing';
  END IF;
  IF position('v_domain_norm IS NOT NULL' IN v_def) = 0
     AND position('v_domain_norm is not null' IN lower(v_def)) = 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: blank_domain_short_circuit_missing';
  END IF;

  -- No table ACL widening: authenticated must not gain INSERT on participations.
  SELECT c.relacl::text
  INTO v_relacl
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'participations';

  IF v_relacl IS NOT NULL AND v_relacl ILIKE '%authenticated%=%*%a%' THEN
    -- conservative check: refuse if authenticated appears with insert-like grant markers
    IF v_relacl ~ 'authenticated=[^/]*a' THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: participations_authenticated_insert_grant';
    END IF;
  END IF;

  -- Triggers still present.
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger t
    JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'participations'
      AND NOT t.tgisinternal
      AND t.tgname = 'trg_participation_00_project_state_guard'
      AND t.tgenabled = 'O'
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: project_state_guard_missing';
  END IF;
END
$postcondition$;

COMMIT;
