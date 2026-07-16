-- =============================================================================
-- ZAM-PROJECTS-SCHEMA-RPC-DEV-VERIFY-FIX-1
-- Narrow corrections after DEV/DEMO post-apply verification
-- managed_by: 20260716170000_projects_mvp_rpc_corrections
-- Authority: docs/projects-schema-rpc-design.md + verify-run findings
--
-- Defect 1: list_projects search length >120 raised invalid_project_pagination
--           → raise invalid_project_text_length (pagination token unchanged)
-- Defect 2: transition_project_status used SELECT EXISTS for company (no lock)
--           → FOR SHARE lock on active same-account company before status update
--
-- Token reconciliation (no artificial SQL):
--   project_company_unavailable  — reserved; MVP external token is
--                                  project_company_not_found (design §10.3/§15)
--   unexpected_project_error     — application-normalized fail-closed (design §15)
--
-- Does not edit 20260716160000_projects_mvp_schema_rpc.sql
-- Does not change relation ACLs/RLS or legacy support RPCs
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) list_projects — search length token correction only
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
-- managed_by: 20260716170000_projects_mvp_rpc_corrections
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
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_text_length';
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
-- 2) transition_project_status — Company FOR SHARE lock
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
-- managed_by: 20260716170000_projects_mvp_rpc_corrections
DECLARE
  v_account_id uuid;
  v_profile_id uuid;
  v_company_id uuid;
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

  -- Lock parent Company for the remainder of the transaction (blocks concurrent soft-delete)
  SELECT company_row.id
  INTO v_company_id
  FROM public.companies AS company_row
  WHERE company_row.id = v_row.company_id
    AND company_row.account_id = v_account_id
    AND company_row.deleted_at IS NULL
  FOR SHARE;

  IF v_company_id IS NULL THEN
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
-- 3) Comments
-- ---------------------------------------------------------------------------

COMMENT ON FUNCTION public.list_projects(text, uuid, text, integer, integer) IS
  'managed_by: 20260716170000_projects_mvp_rpc_corrections; owner/SH list; search>120 => invalid_project_text_length';
COMMENT ON FUNCTION public.transition_project_status(uuid, timestamptz, text) IS
  'managed_by: 20260716170000_projects_mvp_rpc_corrections; owner-only transition; company FOR SHARE';

-- ---------------------------------------------------------------------------
-- 4) Ownership + EXECUTE ACL reassertion (these two functions only)
-- ---------------------------------------------------------------------------

ALTER FUNCTION public.list_projects(text, uuid, text, integer, integer) OWNER TO postgres;
ALTER FUNCTION public.transition_project_status(uuid, timestamptz, text) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.list_projects(text, uuid, text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.transition_project_status(uuid, timestamptz, text) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.list_projects(text, uuid, text, integer, integer)
  FROM PUBLIC, anon, service_role;
REVOKE EXECUTE ON FUNCTION public.transition_project_status(uuid, timestamptz, text)
  FROM PUBLIC, anon, service_role;

GRANT EXECUTE ON FUNCTION public.list_projects(text, uuid, text, integer, integer)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_project_status(uuid, timestamptz, text)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- 5) Catalog-safe postconditions
-- ---------------------------------------------------------------------------

DO $post$
DECLARE
  v_list_def text;
  v_tr_def text;
BEGIN
  IF to_regprocedure('public.list_projects(text,uuid,text,integer,integer)') IS NULL THEN
    RAISE EXCEPTION 'migration_postcondition_failed: list_projects_missing';
  END IF;

  IF to_regprocedure('public.transition_project_status(uuid,timestamp with time zone,text)') IS NULL
     AND to_regprocedure('public.transition_project_status(uuid,timestamptz,text)') IS NULL THEN
    RAISE EXCEPTION 'migration_postcondition_failed: transition_project_status_missing';
  END IF;

  v_list_def := pg_catalog.pg_get_functiondef(
    'public.list_projects(text,uuid,text,integer,integer)'::regprocedure
  );

  IF position('invalid_project_text_length' in v_list_def) = 0 THEN
    RAISE EXCEPTION 'migration_postcondition_failed: list_search_text_length_token_missing';
  END IF;

  -- Search-length branch must not still raise pagination token on >120
  IF v_list_def ~* 'char_length\s*\(\s*v_search\s*\)\s*>\s*120[\s\S]{0,200}invalid_project_pagination' THEN
    RAISE EXCEPTION 'migration_postcondition_failed: list_search_still_raises_pagination';
  END IF;

  IF position('invalid_project_pagination' in v_list_def) = 0 THEN
    RAISE EXCEPTION 'migration_postcondition_failed: list_pagination_token_missing';
  END IF;

  v_tr_def := pg_catalog.pg_get_functiondef(
    COALESCE(
      to_regprocedure('public.transition_project_status(uuid,timestamptz,text)'),
      to_regprocedure('public.transition_project_status(uuid,timestamp with time zone,text)')
    )
  );

  IF position('FOR UPDATE' in v_tr_def) = 0 THEN
    RAISE EXCEPTION 'migration_postcondition_failed: transition_project_for_update_missing';
  END IF;

  IF position('FOR SHARE' in v_tr_def) = 0 THEN
    RAISE EXCEPTION 'migration_postcondition_failed: transition_company_for_share_missing';
  END IF;

  IF position('deleted_at IS NULL' in v_tr_def) = 0 THEN
    RAISE EXCEPTION 'migration_postcondition_failed: transition_company_deleted_at_check_missing';
  END IF;

  IF position('invalid_project_status_transition' in v_tr_def) = 0 THEN
    RAISE EXCEPTION 'migration_postcondition_failed: transition_matrix_token_missing';
  END IF;

  IF position('stale_project_version' in v_tr_def) = 0 THEN
    RAISE EXCEPTION 'migration_postcondition_failed: transition_stale_token_missing';
  END IF;

  IF position('project_company_not_found' in v_tr_def) = 0 THEN
    RAISE EXCEPTION 'migration_postcondition_failed: transition_company_not_found_missing';
  END IF;
END;
$post$;
