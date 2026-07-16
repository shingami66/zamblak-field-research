-- ZAM-COMPANIES-001 Companies MVP schema enforcement and bounded RPCs
-- Task: ZAM-COMPANIES-SCHEMA-RPC-MIGRATION-1
-- Design authority: docs/companies-schema-rpc-design.md
-- Target: designated DEV/DEMO gdegnwglakyblnmxgiwx (PostgreSQL 17.6)
--
-- Implements:
--   - normalize_company_name / normalize_company_phone (internal helpers)
--   - partial unique active normalized name index
--   - phone normalized-form CHECK
--   - projects live company/status index
--   - list_companies / get_company / create_company / update_company
--
-- Preserves:
--   companies table columns; projects.company_id FK; account-consistency triggers;
--   RLS policies; authenticated SELECT-only relation ACLs; no lifecycle/audit objects;
--   no financial fields or joins.
--
-- Does not: apply itself; read business rows outside preflight existence checks;
--           grant table mutation privileges; broaden Support Helper base SELECT.

BEGIN;

SELECT pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('zamblak:20260716120000_companies_mvp_schema_rpc', 0)
);

-- ---------------------------------------------------------------------------
-- 1) Normalization helpers (created before preflight so checks use same authority)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.normalize_company_name(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog, public
AS $function$
  SELECT CASE
    WHEN p_name IS NULL THEN NULL
    ELSE lower(btrim(regexp_replace(p_name, '[[:space:]]+', ' ', 'g')))
  END;
$function$;

COMMENT ON FUNCTION public.normalize_company_name(text) IS
  'managed_by: 20260716120000_companies_mvp_schema_rpc; DB-authoritative company name uniqueness key';

CREATE OR REPLACE FUNCTION public.normalize_company_phone(p_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v text;
BEGIN
  IF p_phone IS NULL THEN
    RETURN NULL;
  END IF;

  v := btrim(p_phone);
  IF v = '' THEN
    RETURN NULL;
  END IF;

  v := regexp_replace(v, '[[:space:]\+\-\(\)]', '', 'g');

  IF v !~ '^[0-9]+$' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'invalid_company_phone';
  END IF;

  IF v ~ '^05[0-9]{8}$' THEN
    v := '9665' || substring(v FROM 3);
  END IF;

  IF char_length(v) < 8 OR char_length(v) > 15 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'invalid_company_phone';
  END IF;

  RETURN v;
END;
$function$;

COMMENT ON FUNCTION public.normalize_company_phone(text) IS
  'managed_by: 20260716120000_companies_mvp_schema_rpc; company phone normalize/validate (optional)';

REVOKE ALL ON FUNCTION public.normalize_company_name(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.normalize_company_phone(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.normalize_company_name(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.normalize_company_phone(text) FROM PUBLIC, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) Data preflight (fail closed; no silent data mutation)
-- ---------------------------------------------------------------------------

DO $preflight$
DECLARE
  v_dup_groups integer;
  v_bad_phones integer;
BEGIN
  IF current_user IS DISTINCT FROM 'postgres' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_precondition_failed: current_user_must_be_postgres';
  END IF;

  IF to_regclass('public.companies') IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_precondition_failed: companies_missing';
  END IF;

  IF to_regclass('public.projects') IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_precondition_failed: projects_missing';
  END IF;

  SELECT count(*)::integer
  INTO v_dup_groups
  FROM (
    SELECT c.account_id, public.normalize_company_name(c.name) AS norm_name
    FROM public.companies AS c
    WHERE c.deleted_at IS NULL
      AND public.normalize_company_name(c.name) IS NOT NULL
      AND public.normalize_company_name(c.name) <> ''
    GROUP BY c.account_id, public.normalize_company_name(c.name)
    HAVING count(*) > 1
  ) AS dups;

  IF v_dup_groups > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_precondition_failed: active_duplicate_normalized_company_names:' || v_dup_groups::text;
  END IF;

  -- Phone CHECK requires stored form NULL or ^[0-9]{8,15}$. Do not rewrite rows.
  SELECT count(*)::integer
  INTO v_bad_phones
  FROM public.companies AS c
  WHERE c.phone IS NOT NULL
    AND c.phone !~ '^[0-9]{8,15}$';

  IF v_bad_phones > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_precondition_failed: nonconforming_company_phone_values:' || v_bad_phones::text;
  END IF;
END;
$preflight$;

-- ---------------------------------------------------------------------------
-- 3) Phone CHECK constraint
-- ---------------------------------------------------------------------------

DO $phone_check$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint AS con
    JOIN pg_catalog.pg_class AS c ON c.oid = con.conrelid
    JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'companies'
      AND con.conname = 'chk_companies_phone_normalized'
  ) THEN
    ALTER TABLE public.companies
      ADD CONSTRAINT chk_companies_phone_normalized
      CHECK (
        phone IS NULL
        OR phone ~ '^[0-9]{8,15}$'
      );
  END IF;
END;
$phone_check$;

COMMENT ON CONSTRAINT chk_companies_phone_normalized ON public.companies IS
  'managed_by: 20260716120000_companies_mvp_schema_rpc; stored phone is NULL or digits 8-15';

-- ---------------------------------------------------------------------------
-- 4) Indexes
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_account_norm_name_active
ON public.companies (
  account_id,
  (public.normalize_company_name(name))
)
WHERE deleted_at IS NULL;

COMMENT ON INDEX public.idx_companies_account_norm_name_active IS
  'managed_by: 20260716120000_companies_mvp_schema_rpc; active normalized company name unique per account';

CREATE INDEX IF NOT EXISTS idx_projects_account_company_status_live
ON public.projects (account_id, company_id, status)
WHERE deleted_at IS NULL;

COMMENT ON INDEX public.idx_projects_account_company_status_live IS
  'managed_by: 20260716120000_companies_mvp_schema_rpc; company-scoped live project counts/status';

-- ---------------------------------------------------------------------------
-- 5) RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.list_companies(
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  company_id uuid,
  account_id uuid,
  name text,
  contact_person text,
  phone text,
  notes text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  active_projects_count integer,
  completed_projects_count integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
-- managed_by: 20260716120000_companies_mvp_schema_rpc
DECLARE
  v_account_id uuid;
  v_search text;
  v_pattern text;
BEGIN
  IF NOT (
    COALESCE(public.is_owner(), false)
    OR COALESCE(public.is_support_helper(), false)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'company_access_denied';
  END IF;

  v_account_id := public.current_account_id();
  IF v_account_id IS NULL OR public.current_profile_id() IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'company_access_denied';
  END IF;

  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 50
     OR p_offset IS NULL OR p_offset < 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_pagination';
  END IF;

  IF p_search IS NULL THEN
    v_search := NULL;
  ELSE
    v_search := btrim(p_search);
    IF v_search = '' THEN
      v_search := NULL;
    ELSIF char_length(v_search) > 120 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_pagination';
    ELSE
      v_pattern :=
        '%'
        || replace(replace(replace(v_search, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_')
        || '%';
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    company_row.id,
    company_row.account_id,
    company_row.name,
    company_row.contact_person,
    company_row.phone,
    company_row.notes,
    company_row.created_by,
    company_row.updated_by,
    company_row.created_at,
    company_row.updated_at,
    (
      SELECT count(*)::integer
      FROM public.projects AS project_row
      WHERE project_row.account_id = v_account_id
        AND project_row.company_id = company_row.id
        AND project_row.deleted_at IS NULL
        AND project_row.status = 'active'
    ) AS active_projects_count,
    (
      SELECT count(*)::integer
      FROM public.projects AS project_row
      WHERE project_row.account_id = v_account_id
        AND project_row.company_id = company_row.id
        AND project_row.deleted_at IS NULL
        AND project_row.status = 'closed'
    ) AS completed_projects_count
  FROM public.companies AS company_row
  WHERE company_row.account_id = v_account_id
    AND company_row.deleted_at IS NULL
    AND (
      v_search IS NULL
      OR company_row.name ILIKE v_pattern ESCAPE E'\\'
      OR (
        company_row.contact_person IS NOT NULL
        AND company_row.contact_person ILIKE v_pattern ESCAPE E'\\'
      )
    )
  ORDER BY public.normalize_company_name(company_row.name), company_row.id
  LIMIT p_limit OFFSET p_offset;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_company(
  p_company_id uuid
)
RETURNS TABLE (
  company_id uuid,
  account_id uuid,
  name text,
  contact_person text,
  phone text,
  notes text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  active_projects_count integer,
  completed_projects_count integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
-- managed_by: 20260716120000_companies_mvp_schema_rpc
DECLARE
  v_account_id uuid;
BEGIN
  IF NOT (
    COALESCE(public.is_owner(), false)
    OR COALESCE(public.is_support_helper(), false)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'company_access_denied';
  END IF;

  v_account_id := public.current_account_id();
  IF v_account_id IS NULL OR public.current_profile_id() IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'company_access_denied';
  END IF;

  IF p_company_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'company_not_found';
  END IF;

  RETURN QUERY
  SELECT
    company_row.id,
    company_row.account_id,
    company_row.name,
    company_row.contact_person,
    company_row.phone,
    company_row.notes,
    company_row.created_by,
    company_row.updated_by,
    company_row.created_at,
    company_row.updated_at,
    (
      SELECT count(*)::integer
      FROM public.projects AS project_row
      WHERE project_row.account_id = v_account_id
        AND project_row.company_id = company_row.id
        AND project_row.deleted_at IS NULL
        AND project_row.status = 'active'
    ),
    (
      SELECT count(*)::integer
      FROM public.projects AS project_row
      WHERE project_row.account_id = v_account_id
        AND project_row.company_id = company_row.id
        AND project_row.deleted_at IS NULL
        AND project_row.status = 'closed'
    )
  FROM public.companies AS company_row
  WHERE company_row.id = p_company_id
    AND company_row.account_id = v_account_id
    AND company_row.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'company_not_found';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_company(
  p_name text,
  p_contact_person text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS TABLE (
  company_id uuid,
  account_id uuid,
  name text,
  contact_person text,
  phone text,
  notes text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  active_projects_count integer,
  completed_projects_count integer
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
-- managed_by: 20260716120000_companies_mvp_schema_rpc
DECLARE
  v_account_id uuid;
  v_profile_id uuid;
  v_display_name text;
  v_contact text;
  v_notes text;
  v_phone text;
  v_id uuid;
BEGIN
  IF NOT (
    COALESCE(public.is_owner(), false)
    OR COALESCE(public.is_support_helper(), false)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'company_access_denied';
  END IF;

  v_account_id := public.current_account_id();
  v_profile_id := public.current_profile_id();
  IF v_account_id IS NULL OR v_profile_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'company_access_denied';
  END IF;

  IF p_name IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_company_name';
  END IF;

  v_display_name := btrim(regexp_replace(p_name, '[[:space:]]+', ' ', 'g'));
  IF v_display_name = '' OR char_length(v_display_name) > 120 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_company_name';
  END IF;

  IF p_contact_person IS NULL THEN
    v_contact := NULL;
  ELSE
    v_contact := btrim(p_contact_person);
    IF v_contact = '' THEN
      v_contact := NULL;
    ELSIF char_length(v_contact) > 80 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_company_contact_person';
    END IF;
  END IF;

  IF p_notes IS NULL THEN
    v_notes := NULL;
  ELSE
    v_notes := btrim(p_notes);
    IF v_notes = '' THEN
      v_notes := NULL;
    ELSIF char_length(v_notes) > 2000 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_company_notes';
    END IF;
  END IF;

  v_phone := public.normalize_company_phone(p_phone);

  BEGIN
    INSERT INTO public.companies (
      account_id,
      name,
      contact_person,
      phone,
      notes,
      created_by,
      updated_by
    )
    VALUES (
      v_account_id,
      v_display_name,
      v_contact,
      v_phone,
      v_notes,
      v_profile_id,
      v_profile_id
    )
    RETURNING id INTO v_id;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION USING
        ERRCODE = '23505',
        MESSAGE = 'duplicate_company_name';
  END;

  RETURN QUERY
  SELECT
    company_row.id,
    company_row.account_id,
    company_row.name,
    company_row.contact_person,
    company_row.phone,
    company_row.notes,
    company_row.created_by,
    company_row.updated_by,
    company_row.created_at,
    company_row.updated_at,
    0::integer,
    0::integer
  FROM public.companies AS company_row
  WHERE company_row.id = v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_company(
  p_company_id uuid,
  p_name text,
  p_expected_updated_at timestamptz,
  p_contact_person text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS TABLE (
  company_id uuid,
  account_id uuid,
  name text,
  contact_person text,
  phone text,
  notes text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  active_projects_count integer,
  completed_projects_count integer
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
-- managed_by: 20260716120000_companies_mvp_schema_rpc
DECLARE
  v_account_id uuid;
  v_profile_id uuid;
  v_display_name text;
  v_contact text;
  v_notes text;
  v_phone text;
  v_row public.companies%ROWTYPE;
BEGIN
  IF NOT (
    COALESCE(public.is_owner(), false)
    OR COALESCE(public.is_support_helper(), false)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'company_access_denied';
  END IF;

  v_account_id := public.current_account_id();
  v_profile_id := public.current_profile_id();
  IF v_account_id IS NULL OR v_profile_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'company_access_denied';
  END IF;

  IF p_company_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'company_not_found';
  END IF;

  IF p_expected_updated_at IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'stale_company_version';
  END IF;

  SELECT *
  INTO v_row
  FROM public.companies AS company_row
  WHERE company_row.id = p_company_id
    AND company_row.account_id = v_account_id
    AND company_row.deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'company_not_found';
  END IF;

  IF v_row.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'stale_company_version';
  END IF;

  IF p_name IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_company_name';
  END IF;

  v_display_name := btrim(regexp_replace(p_name, '[[:space:]]+', ' ', 'g'));
  IF v_display_name = '' OR char_length(v_display_name) > 120 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_company_name';
  END IF;

  IF p_contact_person IS NULL THEN
    v_contact := NULL;
  ELSE
    v_contact := btrim(p_contact_person);
    IF v_contact = '' THEN
      v_contact := NULL;
    ELSIF char_length(v_contact) > 80 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_company_contact_person';
    END IF;
  END IF;

  IF p_notes IS NULL THEN
    v_notes := NULL;
  ELSE
    v_notes := btrim(p_notes);
    IF v_notes = '' THEN
      v_notes := NULL;
    ELSIF char_length(v_notes) > 2000 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_company_notes';
    END IF;
  END IF;

  v_phone := public.normalize_company_phone(p_phone);

  BEGIN
    UPDATE public.companies AS company_row
    SET
      name = v_display_name,
      contact_person = v_contact,
      phone = v_phone,
      notes = v_notes,
      updated_by = v_profile_id
    WHERE company_row.id = v_row.id;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION USING
        ERRCODE = '23505',
        MESSAGE = 'duplicate_company_name';
  END;

  RETURN QUERY
  SELECT
    company_row.id,
    company_row.account_id,
    company_row.name,
    company_row.contact_person,
    company_row.phone,
    company_row.notes,
    company_row.created_by,
    company_row.updated_by,
    company_row.created_at,
    company_row.updated_at,
    (
      SELECT count(*)::integer
      FROM public.projects AS project_row
      WHERE project_row.account_id = v_account_id
        AND project_row.company_id = company_row.id
        AND project_row.deleted_at IS NULL
        AND project_row.status = 'active'
    ),
    (
      SELECT count(*)::integer
      FROM public.projects AS project_row
      WHERE project_row.account_id = v_account_id
        AND project_row.company_id = company_row.id
        AND project_row.deleted_at IS NULL
        AND project_row.status = 'closed'
    )
  FROM public.companies AS company_row
  WHERE company_row.id = v_row.id;
END;
$function$;

COMMENT ON FUNCTION public.list_companies(text, integer, integer) IS
  'managed_by: 20260716120000_companies_mvp_schema_rpc; owner/SH company list with project counts';
COMMENT ON FUNCTION public.get_company(uuid) IS
  'managed_by: 20260716120000_companies_mvp_schema_rpc; owner/SH company detail with project counts';
COMMENT ON FUNCTION public.create_company(text, text, text, text) IS
  'managed_by: 20260716120000_companies_mvp_schema_rpc; owner/SH create company';
COMMENT ON FUNCTION public.update_company(uuid, text, timestamptz, text, text, text) IS
  'managed_by: 20260716120000_companies_mvp_schema_rpc; owner/SH update company with optimistic concurrency';

-- ---------------------------------------------------------------------------
-- 6) EXECUTE ACL matrix
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.list_companies(text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_company(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_company(text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_company(uuid, text, timestamptz, text, text, text) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.list_companies(text, integer, integer)
  FROM PUBLIC, anon, service_role;
REVOKE EXECUTE ON FUNCTION public.get_company(uuid)
  FROM PUBLIC, anon, service_role;
REVOKE EXECUTE ON FUNCTION public.create_company(text, text, text, text)
  FROM PUBLIC, anon, service_role;
REVOKE EXECUTE ON FUNCTION public.update_company(uuid, text, timestamptz, text, text, text)
  FROM PUBLIC, anon, service_role;

GRANT EXECUTE ON FUNCTION public.list_companies(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_company(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_company(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_company(uuid, text, timestamptz, text, text, text) TO authenticated;

-- Re-assert helpers remain non-client-callable after any default ACL behavior.
REVOKE EXECUTE ON FUNCTION public.normalize_company_name(text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.normalize_company_phone(text)
  FROM PUBLIC, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7) Catalog postconditions (no business-row access)
-- ---------------------------------------------------------------------------

DO $postcondition$
DECLARE
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
  v_fn oid;
  v_name text;
  v_names text[] := ARRAY[
    'list_companies(text,integer,integer)',
    'get_company(uuid)',
    'create_company(text,text,text,text)',
    'update_company(uuid,text,timestamp with time zone,text,text,text)'
  ];
BEGIN
  IF v_authenticated_oid IS NULL OR v_anon_oid IS NULL OR v_service_role_oid IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: required_role_missing';
  END IF;

  -- Helpers present, IMMUTABLE, client EXECUTE false.
  FOREACH v_name IN ARRAY ARRAY[
    'normalize_company_name(text)',
    'normalize_company_phone(text)'
  ]
  LOOP
    v_fn := to_regprocedure('public.' || v_name);
    IF v_fn IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: helper_missing:' || v_name;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_proc AS p
      WHERE p.oid = v_fn
        AND p.provolatile = 'i'
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: helper_not_immutable:' || v_name;
    END IF;

    IF has_function_privilege('authenticated', v_fn, 'EXECUTE')
       OR has_function_privilege('anon', v_fn, 'EXECUTE')
       OR has_function_privilege('service_role', v_fn, 'EXECUTE') THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: helper_client_execute:' || v_name;
    END IF;
  END LOOP;

  -- Unique index
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class AS i
    JOIN pg_catalog.pg_namespace AS n ON n.oid = i.relnamespace
    JOIN pg_catalog.pg_index AS ix ON ix.indexrelid = i.oid
    WHERE n.nspname = 'public'
      AND i.relname = 'idx_companies_account_norm_name_active'
      AND ix.indisunique
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: unique_name_index_missing';
  END IF;

  -- Projects index
  IF to_regclass('public.idx_projects_account_company_status_live') IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: projects_index_missing';
  END IF;

  -- Phone CHECK
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint AS con
    JOIN pg_catalog.pg_class AS c ON c.oid = con.conrelid
    JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'companies'
      AND con.conname = 'chk_companies_phone_normalized'
      AND con.contype = 'c'
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: phone_check_missing';
  END IF;

  -- RPCs: SECURITY DEFINER, fixed search_path, authenticated EXECUTE only.
  FOREACH v_name IN ARRAY v_names
  LOOP
    v_fn := to_regprocedure('public.' || v_name);
    IF v_fn IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: rpc_missing:' || v_name;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_proc AS p
      WHERE p.oid = v_fn
        AND p.prosecdef
        AND EXISTS (
          SELECT 1
          FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
          WHERE cfg = 'search_path=pg_catalog, public'
             OR cfg = 'search_path=pg_catalog,public'
        )
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: rpc_security_or_search_path:' || v_name;
    END IF;

    IF NOT has_function_privilege('authenticated', v_fn, 'EXECUTE') THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: rpc_authenticated_execute_missing:' || v_name;
    END IF;

    IF has_function_privilege('anon', v_fn, 'EXECUTE')
       OR has_function_privilege('service_role', v_fn, 'EXECUTE') THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: rpc_client_overgrant:' || v_name;
    END IF;
  END LOOP;

  -- Relation ACL: companies authenticated SELECT only; no mutation privileges.
  v_oid := to_regclass('public.companies');
  IF v_oid IS NULL OR NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class AS c
    WHERE c.oid = v_oid
      AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: companies_rls_missing';
  END IF;

  IF NOT has_table_privilege('authenticated', 'public.companies', 'SELECT') THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: authenticated_select_missing';
  END IF;

  IF has_table_privilege('authenticated', 'public.companies', 'INSERT')
     OR has_table_privilege('authenticated', 'public.companies', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.companies', 'DELETE')
     OR has_table_privilege('authenticated', 'public.companies', 'TRUNCATE')
     OR has_table_privilege('anon', 'public.companies', 'SELECT')
     OR has_table_privilege('service_role', 'public.companies', 'SELECT') THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: companies_acl_regression';
  END IF;
END;
$postcondition$;

COMMIT;

-- ---------------------------------------------------------------------------
-- Manual verification notes (not executed by this migration)
-- Mozfer: after apply on DEV/DEMO gdegnwglakyblnmxgiwx, catalog-check:
--   - helpers IMMUTABLE; client EXECUTE false
--   - indexes + phone CHECK present
--   - four RPCs SECURITY DEFINER search_path=pg_catalog, public
--   - authenticated EXECUTE only on RPCs
--   - companies authenticated SELECT-only; RLS enabled
-- Application smoke is a separate task after apply.
-- ---------------------------------------------------------------------------
