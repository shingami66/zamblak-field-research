-- ZAM-RESPONDENTS Respondent Registry MVP helper and bounded RPCs
-- Task: ZAM-RESPONDENTS-SCHEMA-RPC-MIGRATION-1
-- Design authority: docs/respondents-schema-rpc-design.md
-- Target: designated DEV/DEMO gdegnwglakyblnmxgiwx (PostgreSQL 17.6)
--
-- Implements:
--   - normalize_respondent_mobile (internal helper; not client-callable)
--   - list_respondents / get_respondent / create_respondent / update_respondent
--
-- Preserves:
--   respondents table columns; unique active mobile index; CHECK contract;
--   RLS policies (sel_respondents, ins_respondents); triggers;
--   authenticated SELECT-only relation ACLs; no lifecycle/delete RPCs;
--   no Participation membership, three-month eligibility, finance, or Project history.
--
-- Does not: apply itself; grant table mutation privileges; broaden Support Helper
--           base SELECT; invent mobile values in errors or notices.

BEGIN;

SELECT pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('zamblak:20260717120000_respondents_mvp_schema_rpc', 0)
);

-- ---------------------------------------------------------------------------
-- 1) Fail-closed preflight (catalog + bounded duplicate existence only)
-- ---------------------------------------------------------------------------

DO $preflight$
DECLARE
  v_table oid;
  v_col record;
  v_expected text[] := ARRAY[
    'id',
    'account_id',
    'name',
    'mobile',
    'normalized_mobile',
    'age',
    'nationality',
    'resident_type',
    'notes',
    'created_by',
    'updated_by',
    'created_at',
    'updated_at',
    'deleted_at'
  ];
  v_col_name text;
  v_found boolean;
  v_type text;
  v_dup_groups integer;
  v_fn_name text;
  v_indexdef text;
BEGIN
  IF current_user IS DISTINCT FROM 'postgres' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_precondition_failed: current_user_must_be_postgres';
  END IF;

  v_table := to_regclass('public.respondents');
  IF v_table IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_precondition_failed: respondents_missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class AS c
    WHERE c.oid = v_table
      AND c.relkind = 'r'
      AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_precondition_failed: respondents_rls_not_enabled';
  END IF;

  FOREACH v_col_name IN ARRAY v_expected
  LOOP
    SELECT true, pg_catalog.format_type(a.atttypid, a.atttypmod)
    INTO v_found, v_type
    FROM pg_catalog.pg_attribute AS a
    WHERE a.attrelid = v_table
      AND a.attname = v_col_name
      AND a.attnum > 0
      AND NOT a.attisdropped;

    IF NOT COALESCE(v_found, false) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_precondition_failed: respondents_column_missing:' || v_col_name;
    END IF;

    IF v_col_name IN ('id', 'account_id', 'created_by', 'updated_by')
       AND v_type IS DISTINCT FROM 'uuid' THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_precondition_failed: respondents_column_type:' || v_col_name;
    END IF;

    IF v_col_name IN ('name', 'mobile', 'normalized_mobile', 'nationality', 'resident_type', 'notes')
       AND v_type IS DISTINCT FROM 'text' THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_precondition_failed: respondents_column_type:' || v_col_name;
    END IF;

    IF v_col_name = 'age' AND v_type IS DISTINCT FROM 'integer' THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_precondition_failed: respondents_column_type:age';
    END IF;

    IF v_col_name IN ('created_at', 'updated_at', 'deleted_at')
       AND v_type IS DISTINCT FROM 'timestamp with time zone' THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_precondition_failed: respondents_column_type:' || v_col_name;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint AS con
    JOIN pg_catalog.pg_class AS c ON c.oid = con.conrelid
    JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'respondents'
      AND con.contype = 'c'
      AND pg_catalog.pg_get_constraintdef(con.oid) ILIKE '%9665[0-9]{8}%'
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_precondition_failed: respondents_mobile_check_missing';
  END IF;

  SELECT pg_catalog.pg_get_indexdef(i.oid)
  INTO v_indexdef
  FROM pg_catalog.pg_class AS i
  JOIN pg_catalog.pg_namespace AS n ON n.oid = i.relnamespace
  JOIN pg_catalog.pg_index AS ix ON ix.indexrelid = i.oid
  JOIN pg_catalog.pg_class AS t ON t.oid = ix.indrelid
  JOIN pg_catalog.pg_namespace AS tn ON tn.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND i.relname = 'idx_respondents_unique_mobile_per_account'
    AND tn.nspname = 'public'
    AND t.relname = 'respondents'
    AND ix.indisunique
    AND ix.indisvalid
    AND ix.indisready
    AND i.relkind = 'i';

  IF v_indexdef IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_precondition_failed: unique_mobile_index_missing_or_invalid';
  END IF;

  IF v_indexdef NOT ILIKE '%(account_id, normalized_mobile)%'
     OR v_indexdef NOT ILIKE '%WHERE%deleted_at IS NULL%' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_precondition_failed: unique_mobile_index_definition_mismatch';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger AS tr
    JOIN pg_catalog.pg_class AS c ON c.oid = tr.tgrelid
    JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'respondents'
      AND NOT tr.tgisinternal
      AND tr.tgname = 'trg_respondents_updated_at'
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_precondition_failed: updated_at_trigger_missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger AS tr
    JOIN pg_catalog.pg_class AS c ON c.oid = tr.tgrelid
    JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'respondents'
      AND NOT tr.tgisinternal
      AND tr.tgname = 'audit_trg_respondents'
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_precondition_failed: audit_trigger_missing';
  END IF;

  FOREACH v_fn_name IN ARRAY ARRAY[
    'normalize_respondent_mobile',
    'list_respondents',
    'get_respondent',
    'create_respondent',
    'update_respondent'
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

  -- Bounded existence check only: count of colliding groups, never print mobiles/IDs.
  SELECT count(*)::integer
  INTO v_dup_groups
  FROM (
    SELECT r.account_id, r.normalized_mobile
    FROM public.respondents AS r
    WHERE r.deleted_at IS NULL
    GROUP BY r.account_id, r.normalized_mobile
    HAVING count(*) > 1
  ) AS dups;

  IF v_dup_groups > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_precondition_failed: active_duplicate_respondent_mobile';
  END IF;
END;
$preflight$;

-- ---------------------------------------------------------------------------
-- 2) Mobile normalization helper (internal)
-- ---------------------------------------------------------------------------

CREATE FUNCTION public.normalize_respondent_mobile(p_mobile text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v text;
BEGIN
  IF p_mobile IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'invalid_respondent_mobile';
  END IF;

  v := btrim(p_mobile);
  IF v = '' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'invalid_respondent_mobile';
  END IF;

  v := regexp_replace(v, '[[:space:]\+\-\(\)]', '', 'g');

  IF v !~ '^[0-9]+$' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'invalid_respondent_mobile';
  END IF;

  IF v ~ '^05[0-9]{8}$' THEN
    v := '966' || substr(v, 2);
  ELSIF v ~ '^5[0-9]{8}$' THEN
    v := '966' || v;
  ELSIF v ~ '^9665[0-9]{8}$' THEN
    NULL; -- already canonical
  ELSE
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'invalid_respondent_mobile';
  END IF;

  IF v !~ '^9665[0-9]{8}$' THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'invalid_respondent_mobile';
  END IF;

  RETURN v;
END;
$function$;

COMMENT ON FUNCTION public.normalize_respondent_mobile(text) IS
  'managed_by: 20260717120000_respondents_mvp_schema_rpc; internal Saudi mobile normalize to 9665xxxxxxxx; not client-callable';

REVOKE ALL ON FUNCTION public.normalize_respondent_mobile(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.normalize_respondent_mobile(text)
  FROM PUBLIC, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) Product RPCs
-- ---------------------------------------------------------------------------

CREATE FUNCTION public.list_respondents(
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  respondent_id uuid,
  name text,
  mobile text,
  age integer,
  nationality text,
  resident_type text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
-- managed_by: 20260717120000_respondents_mvp_schema_rpc
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
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'respondent_access_denied';
  END IF;

  v_account_id := public.current_account_id();
  IF v_account_id IS NULL OR public.current_profile_id() IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'respondent_access_denied';
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

      -- Digit-only probe for partial mobile search (not the strict mobile helper).
      v_probe := regexp_replace(v_search, '[[:space:]\+\-\(\)]', '', 'g');
      v_probe := regexp_replace(v_probe, '[^0-9]', '', 'g');
      IF char_length(v_probe) >= 3 THEN
        v_use_mobile_probe := true;
      END IF;
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    respondent_row.id,
    respondent_row.name,
    respondent_row.mobile,
    respondent_row.age,
    respondent_row.nationality,
    respondent_row.resident_type,
    respondent_row.created_at,
    respondent_row.updated_at
  FROM public.respondents AS respondent_row
  WHERE respondent_row.account_id = v_account_id
    AND respondent_row.deleted_at IS NULL
    AND (
      v_search IS NULL
      OR (
        respondent_row.name IS NOT NULL
        AND respondent_row.name ILIKE v_pattern ESCAPE E'\\'
      )
      OR (
        v_use_mobile_probe
        AND (
          respondent_row.mobile LIKE ('%' || v_probe || '%')
          OR respondent_row.normalized_mobile LIKE ('%' || v_probe || '%')
        )
      )
    )
  ORDER BY respondent_row.name ASC NULLS LAST, respondent_row.id ASC
  LIMIT p_limit OFFSET p_offset;
END;
$function$;

CREATE FUNCTION public.get_respondent(
  p_respondent_id uuid
)
RETURNS TABLE (
  respondent_id uuid,
  name text,
  mobile text,
  age integer,
  nationality text,
  resident_type text,
  notes text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
-- managed_by: 20260717120000_respondents_mvp_schema_rpc
DECLARE
  v_account_id uuid;
BEGIN
  IF NOT (
    COALESCE(public.is_owner(), false)
    OR COALESCE(public.is_support_helper(), false)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'respondent_access_denied';
  END IF;

  v_account_id := public.current_account_id();
  IF v_account_id IS NULL OR public.current_profile_id() IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'respondent_access_denied';
  END IF;

  IF p_respondent_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'respondent_not_found';
  END IF;

  RETURN QUERY
  SELECT
    respondent_row.id,
    respondent_row.name,
    respondent_row.mobile,
    respondent_row.age,
    respondent_row.nationality,
    respondent_row.resident_type,
    respondent_row.notes,
    respondent_row.created_at,
    respondent_row.updated_at
  FROM public.respondents AS respondent_row
  WHERE respondent_row.id = p_respondent_id
    AND respondent_row.account_id = v_account_id
    AND respondent_row.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'respondent_not_found';
  END IF;
END;
$function$;

CREATE FUNCTION public.create_respondent(
  p_mobile text,
  p_name text DEFAULT NULL,
  p_age integer DEFAULT NULL,
  p_nationality text DEFAULT NULL,
  p_resident_type text DEFAULT 'unknown',
  p_notes text DEFAULT NULL
)
RETURNS TABLE (
  respondent_id uuid,
  name text,
  mobile text,
  age integer,
  nationality text,
  resident_type text,
  notes text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
-- managed_by: 20260717120000_respondents_mvp_schema_rpc
DECLARE
  v_account_id uuid;
  v_profile_id uuid;
  v_mobile text;
  v_name text;
  v_age integer;
  v_nationality text;
  v_resident_type text;
  v_notes text;
  v_id uuid;
BEGIN
  IF NOT (
    COALESCE(public.is_owner(), false)
    OR COALESCE(public.is_support_helper(), false)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'respondent_access_denied';
  END IF;

  v_account_id := public.current_account_id();
  v_profile_id := public.current_profile_id();
  IF v_account_id IS NULL OR v_profile_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'respondent_access_denied';
  END IF;

  v_mobile := public.normalize_respondent_mobile(p_mobile);

  IF p_name IS NULL THEN
    v_name := NULL;
  ELSE
    v_name := btrim(regexp_replace(p_name, '[[:space:]]+', ' ', 'g'));
    IF v_name = '' THEN
      v_name := NULL;
    ELSIF char_length(v_name) > 120 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_respondent_name';
    END IF;
  END IF;

  IF p_age IS NULL THEN
    v_age := NULL;
  ELSIF p_age < 0 OR p_age > 120 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_respondent_age';
  ELSE
    v_age := p_age;
  END IF;

  IF p_nationality IS NULL THEN
    v_nationality := NULL;
  ELSE
    v_nationality := btrim(regexp_replace(p_nationality, '[[:space:]]+', ' ', 'g'));
    IF v_nationality = '' THEN
      v_nationality := NULL;
    ELSIF char_length(v_nationality) > 80 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_respondent_nationality';
    END IF;
  END IF;

  IF p_resident_type IS NULL THEN
    v_resident_type := 'unknown';
  ELSIF p_resident_type IN ('saudi', 'non_saudi', 'unknown') THEN
    v_resident_type := p_resident_type;
  ELSE
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_respondent_resident_type';
  END IF;

  IF p_notes IS NULL THEN
    v_notes := NULL;
  ELSE
    v_notes := btrim(regexp_replace(p_notes, '[[:space:]]+', ' ', 'g'));
    IF v_notes = '' THEN
      v_notes := NULL;
    ELSIF char_length(v_notes) > 2000 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_respondent_notes';
    END IF;
  END IF;

  BEGIN
    INSERT INTO public.respondents (
      account_id,
      name,
      mobile,
      normalized_mobile,
      age,
      nationality,
      resident_type,
      notes,
      created_by,
      updated_by
    )
    VALUES (
      v_account_id,
      v_name,
      v_mobile,
      v_mobile,
      v_age,
      v_nationality,
      v_resident_type,
      v_notes,
      v_profile_id,
      v_profile_id
    )
    RETURNING id INTO v_id;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION USING
        ERRCODE = '23505',
        MESSAGE = 'duplicate_respondent_mobile';
  END;

  RETURN QUERY
  SELECT
    respondent_row.id,
    respondent_row.name,
    respondent_row.mobile,
    respondent_row.age,
    respondent_row.nationality,
    respondent_row.resident_type,
    respondent_row.notes,
    respondent_row.created_at,
    respondent_row.updated_at
  FROM public.respondents AS respondent_row
  WHERE respondent_row.id = v_id;
END;
$function$;

CREATE FUNCTION public.update_respondent(
  p_respondent_id uuid,
  p_mobile text,
  p_expected_updated_at timestamptz,
  p_name text DEFAULT NULL,
  p_age integer DEFAULT NULL,
  p_nationality text DEFAULT NULL,
  p_resident_type text DEFAULT 'unknown',
  p_notes text DEFAULT NULL
)
RETURNS TABLE (
  respondent_id uuid,
  name text,
  mobile text,
  age integer,
  nationality text,
  resident_type text,
  notes text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
-- managed_by: 20260717120000_respondents_mvp_schema_rpc
DECLARE
  v_account_id uuid;
  v_profile_id uuid;
  v_mobile text;
  v_name text;
  v_age integer;
  v_nationality text;
  v_resident_type text;
  v_notes text;
  v_row public.respondents%ROWTYPE;
BEGIN
  IF NOT (
    COALESCE(public.is_owner(), false)
    OR COALESCE(public.is_support_helper(), false)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'respondent_access_denied';
  END IF;

  v_account_id := public.current_account_id();
  v_profile_id := public.current_profile_id();
  IF v_account_id IS NULL OR v_profile_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'respondent_access_denied';
  END IF;

  IF p_respondent_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'respondent_not_found';
  END IF;

  IF p_expected_updated_at IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'stale_respondent_version';
  END IF;

  SELECT *
  INTO v_row
  FROM public.respondents AS respondent_row
  WHERE respondent_row.id = p_respondent_id
    AND respondent_row.account_id = v_account_id
    AND respondent_row.deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'respondent_not_found';
  END IF;

  IF v_row.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'stale_respondent_version';
  END IF;

  v_mobile := public.normalize_respondent_mobile(p_mobile);

  -- Full-form update: explicit NULL / defaults clear or reset optional fields.
  IF p_name IS NULL THEN
    v_name := NULL;
  ELSE
    v_name := btrim(regexp_replace(p_name, '[[:space:]]+', ' ', 'g'));
    IF v_name = '' THEN
      v_name := NULL;
    ELSIF char_length(v_name) > 120 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_respondent_name';
    END IF;
  END IF;

  IF p_age IS NULL THEN
    v_age := NULL;
  ELSIF p_age < 0 OR p_age > 120 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_respondent_age';
  ELSE
    v_age := p_age;
  END IF;

  IF p_nationality IS NULL THEN
    v_nationality := NULL;
  ELSE
    v_nationality := btrim(regexp_replace(p_nationality, '[[:space:]]+', ' ', 'g'));
    IF v_nationality = '' THEN
      v_nationality := NULL;
    ELSIF char_length(v_nationality) > 80 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_respondent_nationality';
    END IF;
  END IF;

  IF p_resident_type IS NULL THEN
    v_resident_type := 'unknown';
  ELSIF p_resident_type IN ('saudi', 'non_saudi', 'unknown') THEN
    v_resident_type := p_resident_type;
  ELSE
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_respondent_resident_type';
  END IF;

  IF p_notes IS NULL THEN
    v_notes := NULL;
  ELSE
    v_notes := btrim(regexp_replace(p_notes, '[[:space:]]+', ' ', 'g'));
    IF v_notes = '' THEN
      v_notes := NULL;
    ELSIF char_length(v_notes) > 2000 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_respondent_notes';
    END IF;
  END IF;

  BEGIN
    UPDATE public.respondents AS respondent_row
    SET
      name = v_name,
      mobile = v_mobile,
      normalized_mobile = v_mobile,
      age = v_age,
      nationality = v_nationality,
      resident_type = v_resident_type,
      notes = v_notes,
      updated_by = v_profile_id
    WHERE respondent_row.id = v_row.id;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION USING
        ERRCODE = '23505',
        MESSAGE = 'duplicate_respondent_mobile';
  END;

  RETURN QUERY
  SELECT
    respondent_row.id,
    respondent_row.name,
    respondent_row.mobile,
    respondent_row.age,
    respondent_row.nationality,
    respondent_row.resident_type,
    respondent_row.notes,
    respondent_row.created_at,
    respondent_row.updated_at
  FROM public.respondents AS respondent_row
  WHERE respondent_row.id = v_row.id;
END;
$function$;

COMMENT ON FUNCTION public.list_respondents(text, integer, integer) IS
  'managed_by: 20260717120000_respondents_mvp_schema_rpc; owner/SH respondent list (no notes)';
COMMENT ON FUNCTION public.get_respondent(uuid) IS
  'managed_by: 20260717120000_respondents_mvp_schema_rpc; owner/SH respondent detail';
COMMENT ON FUNCTION public.create_respondent(text, text, integer, text, text, text) IS
  'managed_by: 20260717120000_respondents_mvp_schema_rpc; owner/SH create respondent master record';
COMMENT ON FUNCTION public.update_respondent(uuid, text, timestamptz, text, integer, text, text, text) IS
  'managed_by: 20260717120000_respondents_mvp_schema_rpc; owner/SH update respondent with optimistic concurrency';

-- ---------------------------------------------------------------------------
-- 4) EXECUTE ACL matrix
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.list_respondents(text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_respondent(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_respondent(text, text, integer, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_respondent(uuid, text, timestamptz, text, integer, text, text, text) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.list_respondents(text, integer, integer)
  FROM PUBLIC, anon, service_role;
REVOKE EXECUTE ON FUNCTION public.get_respondent(uuid)
  FROM PUBLIC, anon, service_role;
REVOKE EXECUTE ON FUNCTION public.create_respondent(text, text, integer, text, text, text)
  FROM PUBLIC, anon, service_role;
REVOKE EXECUTE ON FUNCTION public.update_respondent(uuid, text, timestamptz, text, integer, text, text, text)
  FROM PUBLIC, anon, service_role;

GRANT EXECUTE ON FUNCTION public.list_respondents(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_respondent(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_respondent(text, text, integer, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_respondent(uuid, text, timestamptz, text, integer, text, text, text) TO authenticated;

-- Re-assert helper remains non-client-callable after default ACL behavior.
REVOKE EXECUTE ON FUNCTION public.normalize_respondent_mobile(text)
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
  v_fn oid;
  v_name text;
  v_count integer;
  v_indexdef text;
  v_product text[] := ARRAY[
    'list_respondents(text,integer,integer)',
    'get_respondent(uuid)',
    'create_respondent(text,text,integer,text,text,text)',
    'update_respondent(uuid,text,timestamp with time zone,text,integer,text,text,text)'
  ];
  v_def text;
BEGIN
  IF v_authenticated_oid IS NULL OR v_anon_oid IS NULL OR v_service_role_oid IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: required_role_missing';
  END IF;

  -- Helper identity and posture.
  v_fn := to_regprocedure('public.normalize_respondent_mobile(text)');
  IF v_fn IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: helper_missing';
  END IF;

  SELECT count(*)::integer
  INTO v_count
  FROM pg_catalog.pg_proc AS p
  JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'normalize_respondent_mobile';
  IF v_count <> 1 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: helper_unexpected_overload';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc AS p
    WHERE p.oid = v_fn
      AND p.provolatile = 'i'
      AND p.proparallel = 's'
      AND p.prosecdef = false
      AND pg_catalog.pg_get_userbyid(p.proowner) = 'postgres'
      AND EXISTS (
        SELECT 1
        FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
        WHERE cfg IN (
          'search_path=pg_catalog, public',
          'search_path=pg_catalog,public'
        )
      )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: helper_posture';
  END IF;

  IF has_function_privilege('authenticated', v_fn, 'EXECUTE')
     OR has_function_privilege('anon', v_fn, 'EXECUTE')
     OR has_function_privilege('service_role', v_fn, 'EXECUTE')
     OR EXISTS (
       SELECT 1
       FROM aclexplode(COALESCE(
         (SELECT p.proacl FROM pg_catalog.pg_proc AS p WHERE p.oid = v_fn),
         acldefault('f', (SELECT p.proowner FROM pg_catalog.pg_proc AS p WHERE p.oid = v_fn))
       )) AS acl
       WHERE acl.grantee = 0
         AND acl.privilege_type = 'EXECUTE'
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: helper_client_execute';
  END IF;

  -- Product RPCs: exact identities, one overload each, posture, EXECUTE matrix.
  FOREACH v_name IN ARRAY v_product
  LOOP
    v_fn := to_regprocedure('public.' || v_name);
    IF v_fn IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: rpc_missing:' || v_name;
    END IF;
  END LOOP;

  FOREACH v_name IN ARRAY ARRAY[
    'list_respondents',
    'get_respondent',
    'create_respondent',
    'update_respondent'
  ]
  LOOP
    SELECT count(*)::integer
    INTO v_count
    FROM pg_catalog.pg_proc AS p
    JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = v_name;
    IF v_count <> 1 THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: rpc_unexpected_overload:' || v_name;
    END IF;
  END LOOP;

  -- list / get STABLE DEFINER
  FOREACH v_name IN ARRAY ARRAY[
    'list_respondents(text,integer,integer)',
    'get_respondent(uuid)'
  ]
  LOOP
    v_fn := to_regprocedure('public.' || v_name);
    IF NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_proc AS p
      WHERE p.oid = v_fn
        AND p.provolatile = 's'
        AND p.prosecdef = true
        AND pg_catalog.pg_get_userbyid(p.proowner) = 'postgres'
        AND EXISTS (
          SELECT 1
          FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
          WHERE cfg IN (
            'search_path=pg_catalog, public',
            'search_path=pg_catalog,public'
          )
        )
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: read_rpc_posture:' || v_name;
    END IF;
  END LOOP;

  -- create / update VOLATILE DEFINER
  FOREACH v_name IN ARRAY ARRAY[
    'create_respondent(text,text,integer,text,text,text)',
    'update_respondent(uuid,text,timestamp with time zone,text,integer,text,text,text)'
  ]
  LOOP
    v_fn := to_regprocedure('public.' || v_name);
    IF NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_proc AS p
      WHERE p.oid = v_fn
        AND p.provolatile = 'v'
        AND p.prosecdef = true
        AND pg_catalog.pg_get_userbyid(p.proowner) = 'postgres'
        AND EXISTS (
          SELECT 1
          FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
          WHERE cfg IN (
            'search_path=pg_catalog, public',
            'search_path=pg_catalog,public'
          )
        )
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: write_rpc_posture:' || v_name;
    END IF;
  END LOOP;

  FOREACH v_name IN ARRAY v_product
  LOOP
    v_fn := to_regprocedure('public.' || v_name);
    IF NOT has_function_privilege('authenticated', v_fn, 'EXECUTE') THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: rpc_authenticated_execute_missing:' || v_name;
    END IF;
    IF has_function_privilege('anon', v_fn, 'EXECUTE')
       OR has_function_privilege('service_role', v_fn, 'EXECUTE') THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: rpc_forbidden_execute:' || v_name;
    END IF;
    -- PUBLIC EXECUTE must be false (OID 0 / privilege check).
    IF EXISTS (
      SELECT 1
      FROM aclexplode(COALESCE(
        (SELECT p.proacl FROM pg_catalog.pg_proc AS p WHERE p.oid = v_fn),
        acldefault('f', (SELECT p.proowner FROM pg_catalog.pg_proc AS p WHERE p.oid = v_fn))
      )) AS acl
      WHERE acl.grantee = 0
        AND acl.privilege_type = 'EXECUTE'
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: rpc_public_execute:' || v_name;
    END IF;
  END LOOP;

  -- Relation ACL / RLS preserved.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class AS c
    JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'respondents'
      AND c.relkind = 'r'
      AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: respondents_rls';
  END IF;

  IF NOT has_table_privilege('authenticated', 'public.respondents', 'SELECT') THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: authenticated_select_missing';
  END IF;

  IF has_table_privilege('authenticated', 'public.respondents', 'INSERT')
     OR has_table_privilege('authenticated', 'public.respondents', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.respondents', 'DELETE')
     OR has_table_privilege('authenticated', 'public.respondents', 'TRUNCATE') THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: authenticated_mutation_privilege';
  END IF;

  IF has_table_privilege('anon', 'public.respondents', 'SELECT')
     OR has_table_privilege('anon', 'public.respondents', 'INSERT')
     OR has_table_privilege('anon', 'public.respondents', 'UPDATE')
     OR has_table_privilege('anon', 'public.respondents', 'DELETE')
     OR has_table_privilege('service_role', 'public.respondents', 'SELECT')
     OR has_table_privilege('service_role', 'public.respondents', 'INSERT')
     OR has_table_privilege('service_role', 'public.respondents', 'UPDATE')
     OR has_table_privilege('service_role', 'public.respondents', 'DELETE') THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: client_role_table_privilege';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM aclexplode(COALESCE(
      (
        SELECT c.relacl
        FROM pg_catalog.pg_class AS c
        JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = 'respondents'
      ),
      acldefault(
        'r',
        (
          SELECT c.relowner
          FROM pg_catalog.pg_class AS c
          JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public'
            AND c.relname = 'respondents'
        )
      )
    )) AS acl
    WHERE acl.grantee = 0
      AND acl.privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: public_table_privilege';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policies AS pol
    WHERE pol.schemaname = 'public'
      AND pol.tablename = 'respondents'
      AND pol.cmd IN ('UPDATE', 'DELETE')
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: unexpected_mutation_policy';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policies AS pol
    WHERE pol.schemaname = 'public'
      AND pol.tablename = 'respondents'
      AND pol.policyname = 'sel_respondents'
      AND pol.cmd = 'SELECT'
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: sel_respondents_missing';
  END IF;

  SELECT pg_catalog.pg_get_indexdef(i.oid)
  INTO v_indexdef
  FROM pg_catalog.pg_class AS i
  JOIN pg_catalog.pg_namespace AS n ON n.oid = i.relnamespace
  JOIN pg_catalog.pg_index AS ix ON ix.indexrelid = i.oid
  WHERE n.nspname = 'public'
    AND i.relname = 'idx_respondents_unique_mobile_per_account'
    AND ix.indisunique
    AND ix.indisvalid
    AND ix.indisready;

  IF v_indexdef IS NULL
     OR v_indexdef NOT ILIKE '%(account_id, normalized_mobile)%'
     OR v_indexdef NOT ILIKE '%WHERE%deleted_at IS NULL%' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: unique_mobile_index';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger AS tr
    JOIN pg_catalog.pg_class AS c ON c.oid = tr.tgrelid
    JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'respondents'
      AND NOT tr.tgisinternal
      AND tr.tgname = 'trg_respondents_updated_at'
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger AS tr
    JOIN pg_catalog.pg_class AS c ON c.oid = tr.tgrelid
    JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'respondents'
      AND NOT tr.tgisinternal
      AND tr.tgname = 'audit_trg_respondents'
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'migration_postcondition_failed: respondent_triggers';
  END IF;

  -- No finance / participation / project relation names in function definitions.
  FOREACH v_name IN ARRAY (
    ARRAY['normalize_respondent_mobile(text)'] || v_product
  )
  LOOP
    v_fn := to_regprocedure('public.' || v_name);
    IF v_fn IS NULL THEN
      CONTINUE;
    END IF;

    -- Only inspect prokind f/p for definition text.
    SELECT CASE
      WHEN p.prokind IN ('f', 'p') THEN pg_catalog.pg_get_functiondef(p.oid)
      ELSE NULL
    END
    INTO v_def
    FROM pg_catalog.pg_proc AS p
    WHERE p.oid = v_fn;

    IF v_def IS NOT NULL AND (
      v_def ~* 'public\.participations'
      OR v_def ~* 'public\.projects'
      OR v_def ~* 'public\.project_financial_settings'
      OR v_def ~* 'public\.payments'
      OR v_def ~* 'FROM[[:space:]]+participations'
      OR v_def ~* 'JOIN[[:space:]]+participations'
      OR v_def ~* 'FROM[[:space:]]+projects'
      OR v_def ~* 'JOIN[[:space:]]+projects'
      OR v_def ~* 'FROM[[:space:]]+payments'
      OR v_def ~* 'JOIN[[:space:]]+payments'
      OR v_def ~* 'public\.settlements'
      OR v_def ~* 'public\.wages'
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'migration_postcondition_failed: unexpected_relation_dependency:' || v_name;
    END IF;
  END LOOP;
END;
$postcondition$;

COMMIT;
