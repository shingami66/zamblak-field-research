-- ZAM-PROJECT-CREATE-ACTIVE-BY-DEFAULT-29C
-- Approved decision DEC-PROJECT-001 (Mozfer-approved 2026-08-04):
--   * New Projects are created in 'active' status.
--   * There is no draft-creation option; participants can be added immediately after creation.
--   * Existing 'draft' rows are unchanged; 'draft' remains a supported status vocabulary
--     (draft -> active/cancelled lifecycle stays intact).
--   * No backfill and no automatic activation of legacy drafts.
-- Manual DEV application:
--   * Applied by Mozfer on 2026-08-04 to project gdegnwglakyblnmxgiwx.
--   * SQL Editor result: Success. No rows returned.
--   * Catalog postconditions manually validated successfully.
--   * Supabase migration-history registration: NOT CLAIMED.
--   * Remote migration-ledger alignment: NOT CLAIMED.
--   * CLI migration repair: NOT RUN.
--   * Production application: NOT CLAIMED.
-- RLS policies (including ins_projects) remain completely untouched; direct table
-- mutation remains denied by the existing security posture (bounded RPCs only).
-- Does not alter RLS enablement, other RLS policies, triggers, participation RPCs,
-- update_project, lifecycle transitions, or financial surfaces.

-- 1) Column default: the neutral initial state for a new project is 'active'.
ALTER TABLE public.projects
  ALTER COLUMN status SET DEFAULT 'active';

-- 2) create_project: identical definition to 20260719120000_projects_free_text_domain.sql
--    except new Projects are created with status 'active'.
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
  project_id uuid, project_name text, company_id uuid, company_name text,
  domain text, status text, start_date date, end_date date, quota integer,
  min_age integer, max_age integer, required_resident_type text,
  eligibility_notes text, requires_three_month_warning boolean,
  whatsapp_template_ar text, whatsapp_template_en text, notes text,
  created_at timestamptz, updated_at timestamptz
)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_account_id uuid; v_profile_id uuid; v_display_name text; v_domain text;
  v_resident text; v_eligibility text; v_notes text; v_wa_ar text; v_wa_en text;
  v_three_month boolean; v_company_id uuid; v_id uuid;
BEGIN
  IF NOT (COALESCE(public.is_owner(), false) OR COALESCE(public.is_support_helper(), false)) THEN
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
  IF p_domain IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_domain';
  END IF;
  v_domain := btrim(p_domain);
  IF v_domain = '' OR char_length(v_domain) > 120 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_domain';
  END IF;
  v_resident := COALESCE(p_required_resident_type, 'any');
  IF v_resident NOT IN ('any', 'saudi', 'non_saudi', 'unknown') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_resident_type';
  END IF;
  IF p_quota IS NOT NULL AND p_quota < 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_quota';
  END IF;
  IF (p_min_age IS NOT NULL AND p_min_age < 0) OR (p_max_age IS NOT NULL AND p_max_age < 0)
     OR (p_min_age IS NOT NULL AND p_max_age IS NOT NULL AND p_max_age < p_min_age) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_age_range';
  END IF;
  IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL AND p_end_date < p_start_date THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_dates';
  END IF;
  IF p_eligibility_notes IS NULL THEN v_eligibility := NULL; ELSE
    v_eligibility := btrim(p_eligibility_notes);
    IF v_eligibility = '' THEN v_eligibility := NULL;
    ELSIF char_length(v_eligibility) > 2000 THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_text_length'; END IF;
  END IF;
  IF p_notes IS NULL THEN v_notes := NULL; ELSE
    v_notes := btrim(p_notes);
    IF v_notes = '' THEN v_notes := NULL;
    ELSIF char_length(v_notes) > 2000 THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_text_length'; END IF;
  END IF;
  IF p_whatsapp_template_ar IS NULL THEN v_wa_ar := NULL; ELSE
    v_wa_ar := btrim(p_whatsapp_template_ar);
    IF v_wa_ar = '' THEN v_wa_ar := NULL;
    ELSIF char_length(v_wa_ar) > 2000 THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_text_length'; END IF;
  END IF;
  IF p_whatsapp_template_en IS NULL THEN v_wa_en := NULL; ELSE
    v_wa_en := btrim(p_whatsapp_template_en);
    IF v_wa_en = '' THEN v_wa_en := NULL;
    ELSIF char_length(v_wa_en) > 2000 THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_text_length'; END IF;
  END IF;
  v_three_month := COALESCE(p_requires_three_month_warning, true);
  SELECT company_row.id INTO v_company_id FROM public.companies AS company_row
  WHERE company_row.id = p_company_id AND company_row.account_id = v_account_id AND company_row.deleted_at IS NULL FOR SHARE;
  IF v_company_id IS NULL THEN RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'project_company_not_found'; END IF;
  INSERT INTO public.projects (account_id, company_id, name, domain, status, start_date, end_date, quota, min_age, max_age, required_resident_type, eligibility_notes, requires_three_month_warning, whatsapp_template_ar, whatsapp_template_en, notes, created_by, updated_by)
  VALUES (v_account_id, v_company_id, v_display_name, v_domain, 'active', p_start_date, p_end_date, p_quota, p_min_age, p_max_age, v_resident, v_eligibility, v_three_month, v_wa_ar, v_wa_en, v_notes, v_profile_id, NULL)
  RETURNING id INTO v_id;
  RETURN QUERY SELECT project_row.id, project_row.name, company_row.id, company_row.name, project_row.domain, project_row.status, project_row.start_date, project_row.end_date, project_row.quota, project_row.min_age, project_row.max_age, project_row.required_resident_type, project_row.eligibility_notes, project_row.requires_three_month_warning, project_row.whatsapp_template_ar, project_row.whatsapp_template_en, project_row.notes, project_row.created_at, project_row.updated_at
  FROM public.projects AS project_row INNER JOIN public.companies AS company_row ON company_row.id = project_row.company_id WHERE project_row.id = v_id;
END;
$function$;

COMMENT ON FUNCTION public.create_project(text, uuid, text, date, date, integer, integer, integer, text, text, boolean, text, text, text) IS
  'managed_by: 20260804001500_create_projects_active_by_default; owner/SH create active project; domain is trimmed arbitrary text 1..120 chars';

ALTER FUNCTION public.create_project(text, uuid, text, date, date, integer, integer, integer, text, text, boolean, text, text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.create_project(text, uuid, text, date, date, integer, integer, integer, text, text, boolean, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_project(text, uuid, text, date, date, integer, integer, integer, text, text, boolean, text, text, text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.create_project(text, uuid, text, date, date, integer, integer, integer, text, text, boolean, text, text, text) TO authenticated;

-- 3) Postconditions.
DO $post$
DECLARE
  v_signature text := 'create_project(text,uuid,text,date,date,integer,integer,integer,text,text,boolean,text,text,text)';
  v_function oid;
BEGIN
  v_function := to_regprocedure('public.' || v_signature);
  IF v_function IS NULL THEN
    RAISE EXCEPTION 'migration_postcondition_failed: project_create_active_rpc_missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS p WHERE p.oid = v_function AND p.prosecdef AND pg_catalog.pg_get_userbyid(p.proowner) = 'postgres' AND EXISTS (SELECT 1 FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg WHERE cfg LIKE 'search_path=%pg_catalog%public%')) THEN
    RAISE EXCEPTION 'migration_postcondition_failed: project_create_active_posture';
  END IF;
  IF NOT has_function_privilege('authenticated', v_function, 'EXECUTE') OR has_function_privilege('anon', v_function, 'EXECUTE') OR has_function_privilege('service_role', v_function, 'EXECUTE') THEN
    RAISE EXCEPTION 'migration_postcondition_failed: project_create_active_acl';
  END IF;
  IF position('v_domain, ''active'', p_start_date' IN pg_catalog.pg_get_functiondef(v_function)) = 0 THEN
    RAISE EXCEPTION 'migration_postcondition_failed: project_create_active_insert';
  END IF;
  IF position('v_domain, ''draft'', p_start_date' IN pg_catalog.pg_get_functiondef(v_function)) > 0 THEN
    RAISE EXCEPTION 'migration_postcondition_failed: project_create_draft_removed';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns AS c
    WHERE c.table_schema = 'public' AND c.table_name = 'projects'
      AND c.column_name = 'status'
      AND c.column_default = '''active''::text'
  ) THEN
    RAISE EXCEPTION 'migration_postcondition_failed: projects_status_default_active';
  END IF;
END;
$post$;
