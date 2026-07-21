-- ZAM-PROJECT-FREE-TEXT-DOMAIN-1
-- Forward-only project domain contract: arbitrary trimmed text, 1..120 chars.
-- Does not alter relation ACLs, RLS, lifecycle rules, or participation RPCs.

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS chk_projects_domain;

ALTER TABLE public.projects
  ADD CONSTRAINT chk_projects_domain
  CHECK (
    domain IS NOT NULL
    AND btrim(domain) <> ''
    AND char_length(btrim(domain)) BETWEEN 1 AND 120
  );

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
  VALUES (v_account_id, v_company_id, v_display_name, v_domain, 'draft', p_start_date, p_end_date, p_quota, p_min_age, p_max_age, v_resident, v_eligibility, v_three_month, v_wa_ar, v_wa_en, v_notes, v_profile_id, NULL)
  RETURNING id INTO v_id;
  RETURN QUERY SELECT project_row.id, project_row.name, company_row.id, company_row.name, project_row.domain, project_row.status, project_row.start_date, project_row.end_date, project_row.quota, project_row.min_age, project_row.max_age, project_row.required_resident_type, project_row.eligibility_notes, project_row.requires_three_month_warning, project_row.whatsapp_template_ar, project_row.whatsapp_template_en, project_row.notes, project_row.created_at, project_row.updated_at
  FROM public.projects AS project_row INNER JOIN public.companies AS company_row ON company_row.id = project_row.company_id WHERE project_row.id = v_id;
END;
$function$;

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
  v_three_month boolean; v_company_id uuid; v_row public.projects%ROWTYPE;
BEGIN
  IF NOT (COALESCE(public.is_owner(), false) OR COALESCE(public.is_support_helper(), false)) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'project_access_denied';
  END IF;
  v_account_id := public.current_account_id();
  v_profile_id := public.current_profile_id();
  IF v_account_id IS NULL OR v_profile_id IS NULL THEN RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'project_profile_unavailable'; END IF;
  IF p_project_id IS NULL THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_id'; END IF;
  IF p_expected_updated_at IS NULL THEN RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'stale_project_version'; END IF;
  IF p_company_id IS NULL THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_company_id'; END IF;
  SELECT * INTO v_row FROM public.projects AS project_row WHERE project_row.id = p_project_id AND project_row.account_id = v_account_id AND project_row.deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'project_not_found'; END IF;
  IF v_row.updated_at IS DISTINCT FROM p_expected_updated_at THEN RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'stale_project_version'; END IF;
  IF v_row.status IN ('closed', 'cancelled') THEN RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'project_not_editable'; END IF;
  IF v_row.status = 'active' AND p_company_id IS DISTINCT FROM v_row.company_id THEN RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'project_company_locked'; END IF;
  IF p_name IS NULL THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_name'; END IF;
  v_display_name := btrim(regexp_replace(p_name, '[[:space:]]+', ' ', 'g'));
  IF v_display_name = '' OR char_length(v_display_name) > 120 THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_name'; END IF;
  IF p_domain IS NULL THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_domain'; END IF;
  v_domain := btrim(p_domain);
  IF v_domain = '' OR char_length(v_domain) > 120 THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_domain'; END IF;
  v_resident := COALESCE(p_required_resident_type, 'any');
  IF v_resident NOT IN ('any', 'saudi', 'non_saudi', 'unknown') THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_resident_type'; END IF;
  IF p_quota IS NOT NULL AND p_quota < 0 THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_quota'; END IF;
  IF (p_min_age IS NOT NULL AND p_min_age < 0) OR (p_max_age IS NOT NULL AND p_max_age < 0) OR (p_min_age IS NOT NULL AND p_max_age IS NOT NULL AND p_max_age < p_min_age) THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_age_range'; END IF;
  IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL AND p_end_date < p_start_date THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_dates'; END IF;
  IF p_eligibility_notes IS NULL THEN v_eligibility := NULL; ELSE v_eligibility := btrim(p_eligibility_notes); IF v_eligibility = '' THEN v_eligibility := NULL; ELSIF char_length(v_eligibility) > 2000 THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_text_length'; END IF; END IF;
  IF p_notes IS NULL THEN v_notes := NULL; ELSE v_notes := btrim(p_notes); IF v_notes = '' THEN v_notes := NULL; ELSIF char_length(v_notes) > 2000 THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_text_length'; END IF; END IF;
  IF p_whatsapp_template_ar IS NULL THEN v_wa_ar := NULL; ELSE v_wa_ar := btrim(p_whatsapp_template_ar); IF v_wa_ar = '' THEN v_wa_ar := NULL; ELSIF char_length(v_wa_ar) > 2000 THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_text_length'; END IF; END IF;
  IF p_whatsapp_template_en IS NULL THEN v_wa_en := NULL; ELSE v_wa_en := btrim(p_whatsapp_template_en); IF v_wa_en = '' THEN v_wa_en := NULL; ELSIF char_length(v_wa_en) > 2000 THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_project_text_length'; END IF; END IF;
  v_three_month := COALESCE(p_requires_three_month_warning, true);
  SELECT company_row.id INTO v_company_id FROM public.companies AS company_row WHERE company_row.id = p_company_id AND company_row.account_id = v_account_id AND company_row.deleted_at IS NULL FOR SHARE;
  IF v_company_id IS NULL THEN RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'project_company_not_found'; END IF;
  UPDATE public.projects AS project_row SET company_id = v_company_id, name = v_display_name, domain = v_domain, start_date = p_start_date, end_date = p_end_date, quota = p_quota, min_age = p_min_age, max_age = p_max_age, required_resident_type = v_resident, eligibility_notes = v_eligibility, requires_three_month_warning = v_three_month, whatsapp_template_ar = v_wa_ar, whatsapp_template_en = v_wa_en, notes = v_notes, updated_by = v_profile_id WHERE project_row.id = v_row.id;
  RETURN QUERY SELECT project_row.id, project_row.name, company_row.id, company_row.name, project_row.domain, project_row.status, project_row.start_date, project_row.end_date, project_row.quota, project_row.min_age, project_row.max_age, project_row.required_resident_type, project_row.eligibility_notes, project_row.requires_three_month_warning, project_row.whatsapp_template_ar, project_row.whatsapp_template_en, project_row.notes, project_row.created_at, project_row.updated_at FROM public.projects AS project_row INNER JOIN public.companies AS company_row ON company_row.id = project_row.company_id WHERE project_row.id = v_row.id;
END;
$function$;

COMMENT ON FUNCTION public.create_project(text, uuid, text, date, date, integer, integer, integer, text, text, boolean, text, text, text) IS
  'managed_by: 20260719120000_projects_free_text_domain; owner/SH create draft project; domain is trimmed arbitrary text 1..120 chars';
COMMENT ON FUNCTION public.update_project(uuid, timestamptz, text, uuid, text, date, date, integer, integer, integer, text, text, boolean, text, text, text) IS
  'managed_by: 20260719120000_projects_free_text_domain; owner/SH update project with optimistic concurrency; domain is trimmed arbitrary text 1..120 chars';

ALTER FUNCTION public.create_project(text, uuid, text, date, date, integer, integer, integer, text, text, boolean, text, text, text) OWNER TO postgres;
ALTER FUNCTION public.update_project(uuid, timestamptz, text, uuid, text, date, date, integer, integer, integer, text, text, boolean, text, text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.create_project(text, uuid, text, date, date, integer, integer, integer, text, text, boolean, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_project(uuid, timestamptz, text, uuid, text, date, date, integer, integer, integer, text, text, boolean, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_project(text, uuid, text, date, date, integer, integer, integer, text, text, boolean, text, text, text) FROM PUBLIC, anon, service_role;
REVOKE EXECUTE ON FUNCTION public.update_project(uuid, timestamptz, text, uuid, text, date, date, integer, integer, integer, text, text, boolean, text, text, text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.create_project(text, uuid, text, date, date, integer, integer, integer, text, text, boolean, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_project(uuid, timestamptz, text, uuid, text, date, date, integer, integer, integer, text, text, boolean, text, text, text) TO authenticated;

DO $post$
DECLARE
  v_signature text;
  v_function oid;
BEGIN
  FOREACH v_signature IN ARRAY ARRAY[
    'create_project(text,uuid,text,date,date,integer,integer,integer,text,text,boolean,text,text,text)',
    'update_project(uuid,timestamptz,text,uuid,text,date,date,integer,integer,integer,text,text,boolean,text,text,text)'
  ] LOOP
    v_function := to_regprocedure('public.' || v_signature);
    IF v_function IS NULL THEN RAISE EXCEPTION 'migration_postcondition_failed: project_domain_rpc_missing:%', v_signature; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS p WHERE p.oid = v_function AND p.prosecdef AND pg_catalog.pg_get_userbyid(p.proowner) = 'postgres' AND EXISTS (SELECT 1 FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg WHERE cfg LIKE 'search_path=%pg_catalog%public%')) THEN
      RAISE EXCEPTION 'migration_postcondition_failed: project_domain_rpc_posture:%', v_signature;
    END IF;
    IF NOT has_function_privilege('authenticated', v_function, 'EXECUTE') OR has_function_privilege('anon', v_function, 'EXECUTE') OR has_function_privilege('service_role', v_function, 'EXECUTE') THEN
      RAISE EXCEPTION 'migration_postcondition_failed: project_domain_rpc_acl:%', v_signature;
    END IF;
    IF position('v_domain := btrim(p_domain)' IN pg_catalog.pg_get_functiondef(v_function)) = 0 THEN
      RAISE EXCEPTION 'migration_postcondition_failed: project_domain_validation:%', v_signature;
    END IF;
  END LOOP;
END;
$post$;
