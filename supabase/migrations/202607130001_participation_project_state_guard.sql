-- Enforce active, non-deleted project state for participation membership writes.
-- The existing partial unique index remains the sole duplicate-membership guard.

DO $precondition$
DECLARE
  v_public_schema_oid oid := to_regnamespace('public');
  v_projects_oid oid := to_regclass('public.projects');
  v_participations_oid oid := to_regclass('public.participations');
  v_unique_index_oid oid := to_regclass('public.idx_participations_unique_respondent_per_project');
  v_account_function_oid oid := to_regprocedure('public.check_participation_account_consistency()');
  v_guard_function_oid oid := to_regprocedure('public.enforce_participation_project_state()');
  v_project_status_check text;
  v_index_unique boolean;
  v_index_valid boolean;
  v_index_ready boolean;
  v_index_key_count smallint;
  v_index_attribute_count smallint;
  v_index_method text;
  v_index_key_1 text;
  v_index_key_2 text;
  v_index_predicate text;
  v_account_trigger_function_oid oid;
  v_account_trigger_type smallint;
  v_account_trigger_internal boolean;
  v_account_function_returns_trigger boolean;
  v_account_function_security_definer boolean;
  v_account_function_search_path_safe boolean;
  v_guard_trigger_function_oid oid;
  v_guard_trigger_internal boolean;
  v_guard_function_returns_trigger boolean;
  v_guard_function_security_definer boolean;
  v_guard_function_search_path_safe boolean;
  v_guard_function_source text;
BEGIN
  IF v_public_schema_oid IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: public_schema_not_found';
  END IF;

  IF v_projects_oid IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: projects_table_not_found';
  END IF;

  IF v_participations_oid IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: participations_table_not_found';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (VALUES
      (v_projects_oid, 'id'),
      (v_projects_oid, 'status'),
      (v_projects_oid, 'deleted_at'),
      (v_participations_oid, 'project_id'),
      (v_participations_oid, 'respondent_id'),
      (v_participations_oid, 'deleted_at')
    ) AS required_column(table_oid, column_name)
    WHERE NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_attribute AS attribute
      WHERE attribute.attrelid = required_column.table_oid
        AND attribute.attname = required_column.column_name
        AND attribute.attnum > 0
        AND NOT attribute.attisdropped
    )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: required_column_not_found';
  END IF;

  SELECT pg_catalog.pg_get_constraintdef(constraint_row.oid, true)
  INTO v_project_status_check
  FROM pg_catalog.pg_constraint AS constraint_row
  WHERE constraint_row.conrelid = v_projects_oid
    AND constraint_row.conname = 'chk_projects_status'
    AND constraint_row.contype = 'c'
    AND constraint_row.convalidated;

  IF v_project_status_check IS NULL
     OR position('''draft''' IN v_project_status_check) = 0
     OR position('''active''' IN v_project_status_check) = 0
     OR position('''closed''' IN v_project_status_check) = 0
     OR position('''cancelled''' IN v_project_status_check) = 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: project_status_constraint_incompatible';
  END IF;

  IF v_unique_index_oid IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: participation_unique_index_not_found';
  END IF;

  SELECT
    index_row.indisunique,
    index_row.indisvalid,
    index_row.indisready,
    index_row.indnkeyatts,
    index_row.indnatts,
    access_method.amname,
    pg_catalog.pg_get_indexdef(index_row.indexrelid, 1, true),
    pg_catalog.pg_get_indexdef(index_row.indexrelid, 2, true),
    pg_catalog.pg_get_expr(index_row.indpred, index_row.indrelid)
  INTO
    v_index_unique,
    v_index_valid,
    v_index_ready,
    v_index_key_count,
    v_index_attribute_count,
    v_index_method,
    v_index_key_1,
    v_index_key_2,
    v_index_predicate
  FROM pg_catalog.pg_index AS index_row
  JOIN pg_catalog.pg_class AS index_class
    ON index_class.oid = index_row.indexrelid
  JOIN pg_catalog.pg_am AS access_method
    ON access_method.oid = index_class.relam
  WHERE index_row.indexrelid = v_unique_index_oid
    AND index_row.indrelid = v_participations_oid;

  IF NOT FOUND
     OR NOT v_index_unique
     OR NOT v_index_valid
     OR NOT v_index_ready
     OR v_index_key_count <> 2
     OR v_index_attribute_count <> 2
     OR v_index_method <> 'btree'
     OR v_index_key_1 <> 'project_id'
     OR v_index_key_2 <> 'respondent_id'
     OR pg_catalog.regexp_replace(
          pg_catalog.lower(v_index_predicate),
          '[[:space:]()]',
          '',
          'g'
        ) IS DISTINCT FROM 'deleted_atisnull' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: participation_unique_index_definition_mismatch';
  END IF;

  IF v_account_function_oid IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: participation_account_function_not_found';
  END IF;

  SELECT
    function_row.prorettype = 'pg_catalog.trigger'::pg_catalog.regtype,
    function_row.prosecdef,
    COALESCE('search_path=public' = ANY(function_row.proconfig), false)
  INTO
    v_account_function_returns_trigger,
    v_account_function_security_definer,
    v_account_function_search_path_safe
  FROM pg_catalog.pg_proc AS function_row
  WHERE function_row.oid = v_account_function_oid;

  IF NOT v_account_function_returns_trigger
     OR NOT v_account_function_security_definer
     OR NOT v_account_function_search_path_safe THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: participation_account_function_incompatible';
  END IF;

  SELECT trigger_row.tgfoid, trigger_row.tgtype, trigger_row.tgisinternal
  INTO v_account_trigger_function_oid, v_account_trigger_type, v_account_trigger_internal
  FROM pg_catalog.pg_trigger AS trigger_row
  WHERE trigger_row.tgrelid = v_participations_oid
    AND trigger_row.tgname = 'trg_participation_account_consistency';

  IF NOT FOUND
     OR v_account_trigger_internal
     OR v_account_trigger_function_oid <> v_account_function_oid
     OR (v_account_trigger_type & 1) = 0
     OR (v_account_trigger_type & 2) = 0
     OR (v_account_trigger_type & 4) = 0
     OR (v_account_trigger_type & 16) = 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_precondition_failed: participation_account_trigger_incompatible';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc AS function_row
    WHERE function_row.pronamespace = v_public_schema_oid
      AND function_row.proname = 'enforce_participation_project_state'
      AND function_row.oid IS DISTINCT FROM v_guard_function_oid
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_object_conflict: participation_project_state_function_overload';
  END IF;

  IF v_guard_function_oid IS NOT NULL THEN
    SELECT
      function_row.prorettype = 'pg_catalog.trigger'::pg_catalog.regtype,
      function_row.prosecdef,
      COALESCE('search_path=public' = ANY(function_row.proconfig), false),
      function_row.prosrc
    INTO
      v_guard_function_returns_trigger,
      v_guard_function_security_definer,
      v_guard_function_search_path_safe,
      v_guard_function_source
    FROM pg_catalog.pg_proc AS function_row
    WHERE function_row.oid = v_guard_function_oid;

    IF NOT v_guard_function_returns_trigger
       OR NOT v_guard_function_security_definer
       OR NOT v_guard_function_search_path_safe
       OR position('managed_by: 202607130001_participation_project_state_guard' IN v_guard_function_source) = 0 THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_object_conflict: participation_project_state_function';
    END IF;
  END IF;

  SELECT trigger_row.tgfoid, trigger_row.tgisinternal
  INTO v_guard_trigger_function_oid, v_guard_trigger_internal
  FROM pg_catalog.pg_trigger AS trigger_row
  WHERE trigger_row.tgrelid = v_participations_oid
    AND trigger_row.tgname = 'trg_participation_00_project_state_guard';

  IF FOUND AND (
    v_guard_trigger_internal
    OR v_guard_function_oid IS NULL
    OR v_guard_trigger_function_oid <> v_guard_function_oid
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'migration_object_conflict: participation_project_state_trigger';
  END IF;
END;
$precondition$;

CREATE OR REPLACE FUNCTION public.enforce_participation_project_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
-- managed_by: 202607130001_participation_project_state_guard
DECLARE
  v_project_status text;
  v_project_deleted_at timestamptz;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.deleted_at IS NOT NULL THEN
      RETURN NEW;
    END IF;

    IF NOT (
      NEW.project_id IS DISTINCT FROM OLD.project_id
      OR NEW.respondent_id IS DISTINCT FROM OLD.respondent_id
      OR (OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL)
    ) THEN
      RETURN NEW;
    END IF;
  END IF;

  SELECT project_row.status, project_row.deleted_at
  INTO v_project_status, v_project_deleted_at
  FROM public.projects AS project_row
  WHERE project_row.id = NEW.project_id
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'project_not_found';
  END IF;

  IF v_project_deleted_at IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'project_deleted';
  END IF;

  IF v_project_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'project_not_active';
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.enforce_participation_project_state() IS
  'Enforces active, non-deleted project state for participation membership-creating writes.';

REVOKE ALL ON FUNCTION public.enforce_participation_project_state() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_participation_project_state() FROM anon;
REVOKE ALL ON FUNCTION public.enforce_participation_project_state() FROM authenticated;

-- PostgreSQL fires same-kind triggers alphabetically. This migration-owned trigger
-- runs before trg_participation_account_consistency, which then preserves the existing
-- project/respondent account checks, and before trg_participation_review_status_before.
-- Lock order: target project row FOR SHARE, then existing unlocked project/respondent
-- account lookups. No existing participation trigger acquires a conflicting parent lock.
DROP TRIGGER IF EXISTS trg_participation_00_project_state_guard ON public.participations;

CREATE TRIGGER trg_participation_00_project_state_guard
BEFORE INSERT OR UPDATE OF project_id, respondent_id, deleted_at
ON public.participations
FOR EACH ROW
EXECUTE FUNCTION public.enforce_participation_project_state();

COMMENT ON TRIGGER trg_participation_00_project_state_guard ON public.participations IS
  'Serializes membership creation against project-state changes and rejects non-active targets.';
