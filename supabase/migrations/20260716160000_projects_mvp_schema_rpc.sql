-- =============================================================================
-- ZAM-PROJECTS-SCHEMA-RPC-MIGRATION-1
-- Projects MVP: harden company consistency + five finance-free product RPCs
-- Authority: docs/projects-schema-rpc-design.md
-- managed_by: 20260716160000_projects_mvp_schema_rpc
--
-- Scope:
--   1) Harden public.check_project_account_consistency() for soft-deleted companies
--   2) list_projects / get_project / create_project / update_project /
--      transition_project_status
--
-- Non-goals:
--   - no relation ACL / RLS policy changes
--   - no project_financial_settings creation
--   - no Project name uniqueness
--   - no legacy support_* function changes
--   - no set_updated_at rewrite
--   - no business-row backfill
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Harden Project ↔ Company account consistency (soft-delete aware)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_project_account_consistency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
-- managed_by: 20260716160000_projects_mvp_schema_rpc
DECLARE
  v_company_account_id uuid;
BEGIN
  SELECT company_row.account_id
  INTO v_company_account_id
  FROM public.companies AS company_row
  WHERE company_row.id = NEW.company_id
    AND company_row.deleted_at IS NULL;

  IF v_company_account_id IS NULL THEN
    RAISE EXCEPTION
      'Account consistency violation: parent company not found or deleted';
  END IF;

  IF NEW.account_id IS DISTINCT FROM v_company_account_id THEN
    RAISE EXCEPTION
      'Account consistency violation: project account_id must match company account_id';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.check_project_account_consistency() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_project_account_consistency()
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION public.check_project_account_consistency() IS
  'managed_by: 20260716160000_projects_mvp_schema_rpc; fail-closed company/account match excluding soft-deleted companies';

-- Trigger trg_projects_account_consistency remains attached (BEFORE INSERT OR UPDATE).

-- ---------------------------------------------------------------------------
-- 2) list_projects
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.list_projects(
  p_search text DEFAULT NULL,
  p_company_id uuid DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  project_id uuid,
  project_name text,
  company_id uuid,
  company_name text,
  domain text,
  status text,
  start_date date,
  end_date date,
  quota integer,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
-- managed_by: 20260716160000_projects_mvp_schema_rpc
DECLARE
  v_account_id uuid;
  v_profile_id uuid;
  v_search text;
  v_pattern text;
BEGIN
  IF NOT (
    COALESCE(public.is_owner(), false)
    OR COALESCE(public.is_support_helper(), false)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'project_access_denied';
  END IF;

  v_account_id := public.current_account_id();
  v_profile_id := public.current_profile_id();
  IF v_account_id IS NULL OR v_profile_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'project_profile_unavailable';
  END IF;

  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 50
     OR p_offset IS NULL OR p_offset < 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_pagination';
  END IF;

  IF p_status IS NOT NULL
     AND p_status NOT IN ('draft', 'active', 'closed', 'cancelled') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_status';
  END IF;

  IF p_search IS NULL THEN
    v_search := NULL;
  ELSE
    v_search := btrim(p_search);
    IF v_search = '' THEN
      v_search := NULL;
    ELSIF char_length(v_search) > 120 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_pagination';
    ELSE
      v_pattern :=
        '%'
        || replace(replace(replace(v_search, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_')
        || '%';
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    project_row.id,
    project_row.name,
    company_row.id,
    company_row.name,
    project_row.domain,
    project_row.status,
    project_row.start_date,
    project_row.end_date,
    project_row.quota,
    project_row.updated_at
  FROM public.projects AS project_row
  INNER JOIN public.companies AS company_row
    ON company_row.id = project_row.company_id
   AND company_row.account_id = v_account_id
   AND company_row.deleted_at IS NULL
  WHERE project_row.account_id = v_account_id
    AND project_row.deleted_at IS NULL
    AND (p_company_id IS NULL OR project_row.company_id = p_company_id)
    AND (p_status IS NULL OR project_row.status = p_status)
    AND (
      v_search IS NULL
      OR project_row.name ILIKE v_pattern ESCAPE E'\\'
      OR company_row.name ILIKE v_pattern ESCAPE E'\\'
    )
  ORDER BY project_row.updated_at DESC, project_row.id DESC
  LIMIT p_limit OFFSET p_offset;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 3) get_project
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_project(
  p_project_id uuid
)
RETURNS TABLE (
  project_id uuid,
  project_name text,
  company_id uuid,
  company_name text,
  domain text,
  status text,
  start_date date,
  end_date date,
  quota integer,
  min_age integer,
  max_age integer,
  required_resident_type text,
  eligibility_notes text,
  requires_three_month_warning boolean,
  whatsapp_template_ar text,
  whatsapp_template_en text,
  notes text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
-- managed_by: 20260716160000_projects_mvp_schema_rpc
DECLARE
  v_account_id uuid;
  v_profile_id uuid;
BEGIN
  IF NOT (
    COALESCE(public.is_owner(), false)
    OR COALESCE(public.is_support_helper(), false)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'project_access_denied';
  END IF;

  v_account_id := public.current_account_id();
  v_profile_id := public.current_profile_id();
  IF v_account_id IS NULL OR v_profile_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'project_profile_unavailable';
  END IF;

  IF p_project_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_id';
  END IF;

  RETURN QUERY
  SELECT
    project_row.id,
    project_row.name,
    company_row.id,
    company_row.name,
    project_row.domain,
    project_row.status,
    project_row.start_date,
    project_row.end_date,
    project_row.quota,
    project_row.min_age,
    project_row.max_age,
    project_row.required_resident_type,
    project_row.eligibility_notes,
    project_row.requires_three_month_warning,
    project_row.whatsapp_template_ar,
    project_row.whatsapp_template_en,
    project_row.notes,
    project_row.created_at,
    project_row.updated_at
  FROM public.projects AS project_row
  INNER JOIN public.companies AS company_row
    ON company_row.id = project_row.company_id
   AND company_row.account_id = v_account_id
   AND company_row.deleted_at IS NULL
  WHERE project_row.id = p_project_id
    AND project_row.account_id = v_account_id
    AND project_row.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'project_not_found';
  END IF;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 4) create_project
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_project(
  p_name text,
  p_company_id uuid,
  p_domain text,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_quota integer DEFAULT NULL,
  p_min_age integer DEFAULT NULL,
  p_max_age integer DEFAULT NULL,
  p_required_resident_type text DEFAULT 'any',
  p_eligibility_notes text DEFAULT NULL,
  p_requires_three_month_warning boolean DEFAULT true,
  p_whatsapp_template_ar text DEFAULT NULL,
  p_whatsapp_template_en text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS TABLE (
  project_id uuid,
  project_name text,
  company_id uuid,
  company_name text,
  domain text,
  status text,
  start_date date,
  end_date date,
  quota integer,
  min_age integer,
  max_age integer,
  required_resident_type text,
  eligibility_notes text,
  requires_three_month_warning boolean,
  whatsapp_template_ar text,
  whatsapp_template_en text,
  notes text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
-- managed_by: 20260716160000_projects_mvp_schema_rpc
DECLARE
  v_account_id uuid;
  v_profile_id uuid;
  v_display_name text;
  v_domain text;
  v_resident text;
  v_eligibility text;
  v_notes text;
  v_wa_ar text;
  v_wa_en text;
  v_three_month boolean;
  v_company_id uuid;
  v_id uuid;
BEGIN
  IF NOT (
    COALESCE(public.is_owner(), false)
    OR COALESCE(public.is_support_helper(), false)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'project_access_denied';
  END IF;

  v_account_id := public.current_account_id();
  v_profile_id := public.current_profile_id();
  IF v_account_id IS NULL OR v_profile_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'project_profile_unavailable';
  END IF;

  IF p_company_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_company_id';
  END IF;

  IF p_name IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_name';
  END IF;

  v_display_name := btrim(regexp_replace(p_name, '[[:space:]]+', ' ', 'g'));
  IF v_display_name = '' OR char_length(v_display_name) > 120 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_name';
  END IF;

  IF p_domain IS NULL OR p_domain NOT IN (
    'telecom', 'banking', 'insurance', 'product', 'other'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_domain';
  END IF;
  v_domain := p_domain;

  v_resident := COALESCE(p_required_resident_type, 'any');
  IF v_resident NOT IN ('any', 'saudi', 'non_saudi', 'unknown') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_resident_type';
  END IF;

  IF p_quota IS NOT NULL AND p_quota < 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_quota';
  END IF;

  IF (p_min_age IS NOT NULL AND p_min_age < 0)
     OR (p_max_age IS NOT NULL AND p_max_age < 0)
     OR (
       p_min_age IS NOT NULL
       AND p_max_age IS NOT NULL
       AND p_max_age < p_min_age
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_age_range';
  END IF;

  IF p_start_date IS NOT NULL
     AND p_end_date IS NOT NULL
     AND p_end_date < p_start_date THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_dates';
  END IF;

  IF p_eligibility_notes IS NULL THEN
    v_eligibility := NULL;
  ELSE
    v_eligibility := btrim(p_eligibility_notes);
    IF v_eligibility = '' THEN
      v_eligibility := NULL;
    ELSIF char_length(v_eligibility) > 2000 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_text_length';
    END IF;
  END IF;

  IF p_notes IS NULL THEN
    v_notes := NULL;
  ELSE
    v_notes := btrim(p_notes);
    IF v_notes = '' THEN
      v_notes := NULL;
    ELSIF char_length(v_notes) > 2000 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_text_length';
    END IF;
  END IF;

  IF p_whatsapp_template_ar IS NULL THEN
    v_wa_ar := NULL;
  ELSE
    v_wa_ar := btrim(p_whatsapp_template_ar);
    IF v_wa_ar = '' THEN
      v_wa_ar := NULL;
    ELSIF char_length(v_wa_ar) > 2000 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_text_length';
    END IF;
  END IF;

  IF p_whatsapp_template_en IS NULL THEN
    v_wa_en := NULL;
  ELSE
    v_wa_en := btrim(p_whatsapp_template_en);
    IF v_wa_en = '' THEN
      v_wa_en := NULL;
    ELSIF char_length(v_wa_en) > 2000 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_text_length';
    END IF;
  END IF;

  v_three_month := COALESCE(p_requires_three_month_warning, true);

  -- Lock active same-account company (blocks concurrent soft-delete of row)
  SELECT company_row.id
  INTO v_company_id
  FROM public.companies AS company_row
  WHERE company_row.id = p_company_id
    AND company_row.account_id = v_account_id
    AND company_row.deleted_at IS NULL
  FOR SHARE;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'project_company_not_found';
  END IF;

  INSERT INTO public.projects (
    account_id,
    company_id,
    name,
    domain,
    status,
    start_date,
    end_date,
    quota,
    min_age,
    max_age,
    required_resident_type,
    eligibility_notes,
    requires_three_month_warning,
    whatsapp_template_ar,
    whatsapp_template_en,
    notes,
    created_by,
    updated_by
  )
  VALUES (
    v_account_id,
    v_company_id,
    v_display_name,
    v_domain,
    'draft',
    p_start_date,
    p_end_date,
    p_quota,
    p_min_age,
    p_max_age,
    v_resident,
    v_eligibility,
    v_three_month,
    v_wa_ar,
    v_wa_en,
    v_notes,
    v_profile_id,
    NULL
  )
  RETURNING id INTO v_id;

  RETURN QUERY
  SELECT
    project_row.id,
    project_row.name,
    company_row.id,
    company_row.name,
    project_row.domain,
    project_row.status,
    project_row.start_date,
    project_row.end_date,
    project_row.quota,
    project_row.min_age,
    project_row.max_age,
    project_row.required_resident_type,
    project_row.eligibility_notes,
    project_row.requires_three_month_warning,
    project_row.whatsapp_template_ar,
    project_row.whatsapp_template_en,
    project_row.notes,
    project_row.created_at,
    project_row.updated_at
  FROM public.projects AS project_row
  INNER JOIN public.companies AS company_row
    ON company_row.id = project_row.company_id
  WHERE project_row.id = v_id;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 5) update_project
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_project(
  p_project_id uuid,
  p_expected_updated_at timestamptz,
  p_name text,
  p_company_id uuid,
  p_domain text,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_quota integer DEFAULT NULL,
  p_min_age integer DEFAULT NULL,
  p_max_age integer DEFAULT NULL,
  p_required_resident_type text DEFAULT 'any',
  p_eligibility_notes text DEFAULT NULL,
  p_requires_three_month_warning boolean DEFAULT true,
  p_whatsapp_template_ar text DEFAULT NULL,
  p_whatsapp_template_en text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS TABLE (
  project_id uuid,
  project_name text,
  company_id uuid,
  company_name text,
  domain text,
  status text,
  start_date date,
  end_date date,
  quota integer,
  min_age integer,
  max_age integer,
  required_resident_type text,
  eligibility_notes text,
  requires_three_month_warning boolean,
  whatsapp_template_ar text,
  whatsapp_template_en text,
  notes text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
-- managed_by: 20260716160000_projects_mvp_schema_rpc
DECLARE
  v_account_id uuid;
  v_profile_id uuid;
  v_display_name text;
  v_domain text;
  v_resident text;
  v_eligibility text;
  v_notes text;
  v_wa_ar text;
  v_wa_en text;
  v_three_month boolean;
  v_company_id uuid;
  v_row public.projects%ROWTYPE;
BEGIN
  IF NOT (
    COALESCE(public.is_owner(), false)
    OR COALESCE(public.is_support_helper(), false)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'project_access_denied';
  END IF;

  v_account_id := public.current_account_id();
  v_profile_id := public.current_profile_id();
  IF v_account_id IS NULL OR v_profile_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'project_profile_unavailable';
  END IF;

  IF p_project_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_id';
  END IF;

  IF p_expected_updated_at IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'stale_project_version';
  END IF;

  IF p_company_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_company_id';
  END IF;

  SELECT *
  INTO v_row
  FROM public.projects AS project_row
  WHERE project_row.id = p_project_id
    AND project_row.account_id = v_account_id
    AND project_row.deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'project_not_found';
  END IF;

  IF v_row.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'stale_project_version';
  END IF;

  IF v_row.status IN ('closed', 'cancelled') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'project_not_editable';
  END IF;

  IF v_row.status = 'active' AND p_company_id IS DISTINCT FROM v_row.company_id THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'project_company_locked';
  END IF;

  IF p_name IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_name';
  END IF;

  v_display_name := btrim(regexp_replace(p_name, '[[:space:]]+', ' ', 'g'));
  IF v_display_name = '' OR char_length(v_display_name) > 120 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_name';
  END IF;

  IF p_domain IS NULL OR p_domain NOT IN (
    'telecom', 'banking', 'insurance', 'product', 'other'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_domain';
  END IF;
  v_domain := p_domain;

  v_resident := COALESCE(p_required_resident_type, 'any');
  IF v_resident NOT IN ('any', 'saudi', 'non_saudi', 'unknown') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_resident_type';
  END IF;

  IF p_quota IS NOT NULL AND p_quota < 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_quota';
  END IF;

  IF (p_min_age IS NOT NULL AND p_min_age < 0)
     OR (p_max_age IS NOT NULL AND p_max_age < 0)
     OR (
       p_min_age IS NOT NULL
       AND p_max_age IS NOT NULL
       AND p_max_age < p_min_age
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_age_range';
  END IF;

  IF p_start_date IS NOT NULL
     AND p_end_date IS NOT NULL
     AND p_end_date < p_start_date THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_dates';
  END IF;

  IF p_eligibility_notes IS NULL THEN
    v_eligibility := NULL;
  ELSE
    v_eligibility := btrim(p_eligibility_notes);
    IF v_eligibility = '' THEN
      v_eligibility := NULL;
    ELSIF char_length(v_eligibility) > 2000 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_text_length';
    END IF;
  END IF;

  IF p_notes IS NULL THEN
    v_notes := NULL;
  ELSE
    v_notes := btrim(p_notes);
    IF v_notes = '' THEN
      v_notes := NULL;
    ELSIF char_length(v_notes) > 2000 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_text_length';
    END IF;
  END IF;

  IF p_whatsapp_template_ar IS NULL THEN
    v_wa_ar := NULL;
  ELSE
    v_wa_ar := btrim(p_whatsapp_template_ar);
    IF v_wa_ar = '' THEN
      v_wa_ar := NULL;
    ELSIF char_length(v_wa_ar) > 2000 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_text_length';
    END IF;
  END IF;

  IF p_whatsapp_template_en IS NULL THEN
    v_wa_en := NULL;
  ELSE
    v_wa_en := btrim(p_whatsapp_template_en);
    IF v_wa_en = '' THEN
      v_wa_en := NULL;
    ELSIF char_length(v_wa_en) > 2000 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_text_length';
    END IF;
  END IF;

  v_three_month := COALESCE(p_requires_three_month_warning, true);

  -- Always require parent company active (incl. unchanged company_id)
  SELECT company_row.id
  INTO v_company_id
  FROM public.companies AS company_row
  WHERE company_row.id = p_company_id
    AND company_row.account_id = v_account_id
    AND company_row.deleted_at IS NULL
  FOR SHARE;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'project_company_not_found';
  END IF;

  UPDATE public.projects AS project_row
  SET
    company_id = v_company_id,
    name = v_display_name,
    domain = v_domain,
    start_date = p_start_date,
    end_date = p_end_date,
    quota = p_quota,
    min_age = p_min_age,
    max_age = p_max_age,
    required_resident_type = v_resident,
    eligibility_notes = v_eligibility,
    requires_three_month_warning = v_three_month,
    whatsapp_template_ar = v_wa_ar,
    whatsapp_template_en = v_wa_en,
    notes = v_notes,
    updated_by = v_profile_id
  WHERE project_row.id = v_row.id;

  RETURN QUERY
  SELECT
    project_row.id,
    project_row.name,
    company_row.id,
    company_row.name,
    project_row.domain,
    project_row.status,
    project_row.start_date,
    project_row.end_date,
    project_row.quota,
    project_row.min_age,
    project_row.max_age,
    project_row.required_resident_type,
    project_row.eligibility_notes,
    project_row.requires_three_month_warning,
    project_row.whatsapp_template_ar,
    project_row.whatsapp_template_en,
    project_row.notes,
    project_row.created_at,
    project_row.updated_at
  FROM public.projects AS project_row
  INNER JOIN public.companies AS company_row
    ON company_row.id = project_row.company_id
  WHERE project_row.id = v_row.id;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 6) transition_project_status (Owner only)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.transition_project_status(
  p_project_id uuid,
  p_expected_updated_at timestamptz,
  p_target_status text
)
RETURNS TABLE (
  project_id uuid,
  project_name text,
  company_id uuid,
  company_name text,
  domain text,
  status text,
  start_date date,
  end_date date,
  quota integer,
  min_age integer,
  max_age integer,
  required_resident_type text,
  eligibility_notes text,
  requires_three_month_warning boolean,
  whatsapp_template_ar text,
  whatsapp_template_en text,
  notes text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
-- managed_by: 20260716160000_projects_mvp_schema_rpc
DECLARE
  v_account_id uuid;
  v_profile_id uuid;
  v_company_ok boolean;
  v_row public.projects%ROWTYPE;
BEGIN
  IF NOT COALESCE(public.is_owner(), false) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'project_access_denied';
  END IF;

  v_account_id := public.current_account_id();
  v_profile_id := public.current_profile_id();
  IF v_account_id IS NULL OR v_profile_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'project_profile_unavailable';
  END IF;

  IF p_project_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_id';
  END IF;

  IF p_expected_updated_at IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'stale_project_version';
  END IF;

  IF p_target_status IS NULL OR p_target_status NOT IN (
    'draft', 'active', 'closed', 'cancelled'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_status';
  END IF;

  SELECT *
  INTO v_row
  FROM public.projects AS project_row
  WHERE project_row.id = p_project_id
    AND project_row.account_id = v_account_id
    AND project_row.deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'project_not_found';
  END IF;

  IF v_row.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'stale_project_version';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.companies AS company_row
    WHERE company_row.id = v_row.company_id
      AND company_row.account_id = v_account_id
      AND company_row.deleted_at IS NULL
  )
  INTO v_company_ok;

  IF NOT COALESCE(v_company_ok, false) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'project_company_not_found';
  END IF;

  IF NOT (
    (v_row.status = 'draft' AND p_target_status IN ('active', 'cancelled'))
    OR (v_row.status = 'active' AND p_target_status IN ('closed', 'cancelled'))
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_project_status_transition';
  END IF;

  UPDATE public.projects AS project_row
  SET
    status = p_target_status,
    updated_by = v_profile_id
  WHERE project_row.id = v_row.id;

  RETURN QUERY
  SELECT
    project_row.id,
    project_row.name,
    company_row.id,
    company_row.name,
    project_row.domain,
    project_row.status,
    project_row.start_date,
    project_row.end_date,
    project_row.quota,
    project_row.min_age,
    project_row.max_age,
    project_row.required_resident_type,
    project_row.eligibility_notes,
    project_row.requires_three_month_warning,
    project_row.whatsapp_template_ar,
    project_row.whatsapp_template_en,
    project_row.notes,
    project_row.created_at,
    project_row.updated_at
  FROM public.projects AS project_row
  INNER JOIN public.companies AS company_row
    ON company_row.id = project_row.company_id
  WHERE project_row.id = v_row.id;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 7) Comments
-- ---------------------------------------------------------------------------

COMMENT ON FUNCTION public.list_projects(text, uuid, text, integer, integer) IS
  'managed_by: 20260716160000_projects_mvp_schema_rpc; owner/SH operational project list';
COMMENT ON FUNCTION public.get_project(uuid) IS
  'managed_by: 20260716160000_projects_mvp_schema_rpc; owner/SH operational project detail';
COMMENT ON FUNCTION public.create_project(text, uuid, text, date, date, integer, integer, integer, text, text, boolean, text, text, text) IS
  'managed_by: 20260716160000_projects_mvp_schema_rpc; owner/SH create draft project';
COMMENT ON FUNCTION public.update_project(uuid, timestamptz, text, uuid, text, date, date, integer, integer, integer, text, text, boolean, text, text, text) IS
  'managed_by: 20260716160000_projects_mvp_schema_rpc; owner/SH update project with optimistic concurrency';
COMMENT ON FUNCTION public.transition_project_status(uuid, timestamptz, text) IS
  'managed_by: 20260716160000_projects_mvp_schema_rpc; owner-only project lifecycle transition';

-- ---------------------------------------------------------------------------
-- 8) Ownership + EXECUTE ACL matrix
-- ---------------------------------------------------------------------------

ALTER FUNCTION public.check_project_account_consistency() OWNER TO postgres;
ALTER FUNCTION public.list_projects(text, uuid, text, integer, integer) OWNER TO postgres;
ALTER FUNCTION public.get_project(uuid) OWNER TO postgres;
ALTER FUNCTION public.create_project(text, uuid, text, date, date, integer, integer, integer, text, text, boolean, text, text, text) OWNER TO postgres;
ALTER FUNCTION public.update_project(uuid, timestamptz, text, uuid, text, date, date, integer, integer, integer, text, text, boolean, text, text, text) OWNER TO postgres;
ALTER FUNCTION public.transition_project_status(uuid, timestamptz, text) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.list_projects(text, uuid, text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_project(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_project(text, uuid, text, date, date, integer, integer, integer, text, text, boolean, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_project(uuid, timestamptz, text, uuid, text, date, date, integer, integer, integer, text, text, boolean, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.transition_project_status(uuid, timestamptz, text) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.list_projects(text, uuid, text, integer, integer)
  FROM PUBLIC, anon, service_role;
REVOKE EXECUTE ON FUNCTION public.get_project(uuid)
  FROM PUBLIC, anon, service_role;
REVOKE EXECUTE ON FUNCTION public.create_project(text, uuid, text, date, date, integer, integer, integer, text, text, boolean, text, text, text)
  FROM PUBLIC, anon, service_role;
REVOKE EXECUTE ON FUNCTION public.update_project(uuid, timestamptz, text, uuid, text, date, date, integer, integer, integer, text, text, boolean, text, text, text)
  FROM PUBLIC, anon, service_role;
REVOKE EXECUTE ON FUNCTION public.transition_project_status(uuid, timestamptz, text)
  FROM PUBLIC, anon, service_role;

GRANT EXECUTE ON FUNCTION public.list_projects(text, uuid, text, integer, integer)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_project(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_project(text, uuid, text, date, date, integer, integer, integer, text, text, boolean, text, text, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_project(uuid, timestamptz, text, uuid, text, date, date, integer, integer, integer, text, text, boolean, text, text, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_project_status(uuid, timestamptz, text)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- 9) Catalog-safe postconditions (source apply validation)
-- ---------------------------------------------------------------------------

DO $post$
BEGIN
  IF to_regprocedure('public.list_projects(text,uuid,text,integer,integer)') IS NULL
     OR to_regprocedure('public.get_project(uuid)') IS NULL
     OR to_regprocedure(
          'public.create_project(text,uuid,text,date,date,integer,integer,integer,text,text,boolean,text,text,text)'
        ) IS NULL
     OR to_regprocedure(
          'public.update_project(uuid,timestamptz,text,uuid,text,date,date,integer,integer,integer,text,text,boolean,text,text,text)'
        ) IS NULL
     OR to_regprocedure('public.transition_project_status(uuid,timestamptz,text)') IS NULL
     OR to_regprocedure('public.check_project_account_consistency()') IS NULL THEN
    RAISE EXCEPTION
      'migration_postcondition_failed: projects_mvp_rpc_missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger AS tr
    JOIN pg_catalog.pg_class AS c ON c.oid = tr.tgrelid
    JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
    JOIN pg_catalog.pg_proc AS p ON p.oid = tr.tgfoid
    WHERE n.nspname = 'public'
      AND c.relname = 'projects'
      AND NOT tr.tgisinternal
      AND tr.tgname = 'trg_projects_account_consistency'
      AND p.proname = 'check_project_account_consistency'
  ) THEN
    RAISE EXCEPTION
      'migration_postcondition_failed: projects_account_consistency_trigger_missing';
  END IF;

  IF position(
       'deleted_at IS NULL'
       in pg_catalog.pg_get_functiondef(
            'public.check_project_account_consistency()'::regprocedure
          )
     ) = 0 THEN
    RAISE EXCEPTION
      'migration_postcondition_failed: soft_delete_company_check_missing';
  END IF;
END;
$post$;
