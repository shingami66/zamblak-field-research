-- ============================================================================
-- Migration: 20260723170000_enforce_one_research_form_per_participation.sql
-- Enforce One Research Form Per Participation Data Invariant & Update Submit RPC
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. DATA SAFETY ABORT GUARD
-- ----------------------------------------------------------------------------
-- Aborts migration if any participation has more than one research form.
DO $$
DECLARE
  v_dup_count integer;
BEGIN
  SELECT COUNT(*) INTO v_dup_count
  FROM (
    SELECT participation_id
    FROM public.research_forms
    GROUP BY participation_id
    HAVING COUNT(*) > 1
  ) dups;

  IF v_dup_count > 0 THEN
    RAISE EXCEPTION 'MIGRATION ABORTED: Found % participation(s) with duplicate research forms. Manual cleanup is required before applying idx_rf_unique_participation.', v_dup_count;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. STRUCTURAL INDEX SAFETY CHECK
-- ----------------------------------------------------------------------------
-- Verifies that if idx_rf_unique_participation exists, it strictly matches
-- a non-partial unique index on public.research_forms(participation_id).
DO $$
DECLARE
  v_idx RECORD;
  v_att_name text;
BEGIN
  SELECT
    c.oid AS idx_oid,
    idx.indisunique,
    idx.indpred,
    idx.indnatts,
    idx.indnkeyatts,
    idx.indkey,
    idx.indexprs,
    t.relname AS table_name,
    n.nspname AS schema_name
  INTO v_idx
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_index idx ON idx.indexrelid = c.oid
  JOIN pg_class t ON t.oid = idx.indrelid
  WHERE n.nspname = 'public' AND c.relname = 'idx_rf_unique_participation';

  IF FOUND THEN
    IF v_idx.schema_name <> 'public'
       OR v_idx.table_name <> 'research_forms'
       OR NOT v_idx.indisunique
       OR v_idx.indpred IS NOT NULL
       OR v_idx.indnatts <> 1
       OR v_idx.indnkeyatts <> 1
       OR v_idx.indexprs IS NOT NULL
    THEN
      RAISE EXCEPTION 'MIGRATION ABORTED: Index idx_rf_unique_participation exists but does not match required unique non-partial single-column structure.';
    END IF;

    SELECT attname INTO v_att_name
    FROM pg_attribute
    WHERE attrelid = (SELECT oid FROM pg_class WHERE relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public') AND relname = 'research_forms')
      AND attnum = v_idx.indkey[0];

    IF v_att_name <> 'participation_id' THEN
      RAISE EXCEPTION 'MIGRATION ABORTED: Index idx_rf_unique_participation exists on column %, expected participation_id.', v_att_name;
    END IF;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. ATOMIC UNIQUE INDEX FOR PARTICIPATION FORMS
-- ----------------------------------------------------------------------------
-- Enforces strictly one research form per participation across all review statuses.
CREATE UNIQUE INDEX IF NOT EXISTS idx_rf_unique_participation ON public.research_forms (participation_id);

-- ----------------------------------------------------------------------------
-- 4. REPLACE submit_research_form RPC
-- ----------------------------------------------------------------------------
-- Enforces single-form requirement per participation, sets attempt_number = 1,
-- and handles unique_violation cleanly by raising 'duplicate_participation'.
CREATE OR REPLACE FUNCTION public.submit_research_form(
  p_idempotency_key text,
  p_participation_id uuid,
  p_submitted_date date,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_account_id uuid;
  v_profile_id uuid;
  v_acc_lock uuid;
  v_claim RECORD;
  v_part RECORD;
  v_daily_seq integer;
  v_code text;
  v_form_id uuid;
  v_response jsonb;
BEGIN
  IF NOT COALESCE(public.is_owner(), false) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'forbidden', DETAIL = 'Only account owners may submit research forms.';
  END IF;

  v_account_id := public.current_account_id();
  v_profile_id := public.current_profile_id();

  IF v_account_id IS NULL OR v_profile_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'unauthorized', DETAIL = 'Active profile unavailable.';
  END IF;

  SELECT * INTO v_claim FROM public.claim_idempotent_mutation(
    v_account_id,
    'submit_research_form',
    p_idempotency_key,
    jsonb_build_object('participation_id', p_participation_id, 'submitted_date', p_submitted_date, 'notes', p_notes)
  );

  IF v_claim.already_completed THEN
    RETURN v_claim.stored_response;
  END IF;

  IF p_participation_id IS NULL OR p_submitted_date IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input', DETAIL = 'Participation ID and submitted date are required.';
  END IF;

  -- Lock tenant account row to serialize account-scoped code generation
  SELECT id INTO v_acc_lock
  FROM public.accounts
  WHERE id = v_account_id
  FOR UPDATE;

  -- Lock participation row to serialize form submission
  SELECT p.id, p.project_id, p.respondent_id, proj.company_id, proj.status AS project_status
  INTO v_part
  FROM public.participations p
  JOIN public.projects proj ON proj.id = p.project_id
  WHERE p.id = p_participation_id
    AND p.account_id = v_account_id
    AND p.deleted_at IS NULL
  FOR UPDATE OF p;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'participation_not_eligible', DETAIL = 'Participation not found in tenant account.';
  END IF;

  IF v_part.project_status IN ('closed', 'cancelled') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'research_form_state_invalid', DETAIL = 'Cannot submit forms for closed or cancelled projects.';
  END IF;

  -- Enforce one research form per participation (regardless of review status)
  IF EXISTS (
    SELECT 1
    FROM public.research_forms
    WHERE participation_id = p_participation_id
      AND account_id = v_account_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'duplicate_participation', DETAIL = 'A research form already exists for this participation.';
  END IF;

  SELECT COALESCE(MAX(SUBSTRING(code FROM 'RF-[0-9]{8}-([0-9]{3})')::integer), 0) + 1 INTO v_daily_seq
  FROM public.research_forms
  WHERE account_id = v_account_id
    AND submitted_date = p_submitted_date;

  v_code := 'RF-' || to_char(p_submitted_date, 'YYYYMMDD') || '-' || lpad(v_daily_seq::text, 3, '0');

  BEGIN
    INSERT INTO public.research_forms (
      account_id,
      project_id,
      company_id,
      respondent_id,
      participation_id,
      code,
      attempt_number,
      submitted_date,
      review_status,
      submitted_at,
      notes,
      created_by,
      updated_by,
      created_at,
      updated_at
    ) VALUES (
      v_account_id,
      v_part.project_id,
      v_part.company_id,
      v_part.respondent_id,
      p_participation_id,
      v_code,
      1,
      p_submitted_date,
      'submitted',
      clock_timestamp(),
      btrim(COALESCE(p_notes, '')),
      v_profile_id,
      v_profile_id,
      clock_timestamp(),
      clock_timestamp()
    )
    RETURNING id INTO v_form_id;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'duplicate_participation', DETAIL = 'A research form already exists for this participation.';
  END;

  v_response := jsonb_build_object(
    'research_form_id', v_form_id,
    'code', v_code,
    'attempt_number', 1,
    'review_status', 'submitted',
    'submitted_date', p_submitted_date
  );

  PERFORM public.complete_idempotent_mutation(v_claim.key_id, v_response, v_form_id);

  RETURN v_response;
END;
$function$;

-- ----------------------------------------------------------------------------
-- 5. PERMISSIONS HARDENING
-- ----------------------------------------------------------------------------
ALTER FUNCTION public.submit_research_form(text, uuid, date, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.submit_research_form(text, uuid, date, text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.submit_research_form(text, uuid, date, text) TO authenticated;

COMMIT;
