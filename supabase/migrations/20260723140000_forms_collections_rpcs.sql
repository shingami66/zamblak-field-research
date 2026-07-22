-- ============================================================================
-- Zamblak Field Research Core Database Schema
-- Migration: 20260723140000_forms_collections_rpcs.sql
-- Backend Schema Slice 3: Transactional Mutation RPCs & Idempotency (Recovery 1)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. INTERNAL IDEMPOTENCY EXECUTION HELPERS
-- ----------------------------------------------------------------------------

-- Internal Helper: Atomically claims an idempotency key before mutation execution
CREATE FUNCTION public.claim_idempotent_mutation(
  p_account_id uuid,
  p_scope text,
  p_key text,
  p_request_payload jsonb
)
RETURNS TABLE (
  already_completed boolean,
  stored_response jsonb,
  target_record_id uuid,
  key_id uuid
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_key_clean text;
  v_hash text;
  v_row public.idempotency_keys%ROWTYPE;
  v_new_id uuid;
BEGIN
  IF p_key IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'idempotency_key_invalid', DETAIL = 'Idempotency key is required.';
  END IF;

  v_key_clean := btrim(p_key);
  IF char_length(v_key_clean) < 8 OR char_length(v_key_clean) > 128 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'idempotency_key_invalid', DETAIL = 'Idempotency key length must be between 8 and 128 characters.';
  END IF;

  v_hash := encode(sha256(COALESCE(p_request_payload, '{}'::jsonb)::text::bytea), 'hex');

  -- Attempt atomic INSERT first (handles non-conflict case cleanly)
  INSERT INTO public.idempotency_keys (
    account_id,
    scope,
    idempotency_key,
    request_hash,
    status,
    created_at,
    last_seen_at
  ) VALUES (
    p_account_id,
    p_scope,
    v_key_clean,
    v_hash,
    'processing',
    clock_timestamp(),
    clock_timestamp()
  )
  ON CONFLICT (account_id, scope, idempotency_key) DO NOTHING
  RETURNING id INTO v_new_id;

  IF v_new_id IS NOT NULL THEN
    RETURN QUERY SELECT false, NULL::jsonb, NULL::uuid, v_new_id;
    RETURN;
  END IF;

  -- Conflict occurred: SELECT existing row FOR UPDATE
  SELECT * INTO v_row
  FROM public.idempotency_keys
  WHERE account_id = p_account_id
    AND scope = p_scope
    AND idempotency_key = v_key_clean
  FOR UPDATE;

  UPDATE public.idempotency_keys
  SET last_seen_at = clock_timestamp()
  WHERE id = v_row.id;

  IF v_row.request_hash <> v_hash THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'idempotency_request_conflict', DETAIL = 'Idempotency key reused with a different request payload.';
  END IF;

  IF v_row.status = 'completed' THEN
    RETURN QUERY SELECT true, v_row.response_payload, v_row.target_record_id, v_row.id;
    RETURN;
  ELSIF v_row.status = 'processing' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'idempotency_processing_conflict', DETAIL = 'Idempotent request is currently being processed.';
  END IF;
END;
$function$;


-- Internal Helper: Atomically completes an idempotency claim
CREATE FUNCTION public.complete_idempotent_mutation(
  p_key_id uuid,
  p_response_payload jsonb,
  p_target_record_id uuid
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_updated_id uuid;
BEGIN
  IF p_key_id IS NULL OR p_response_payload IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input', DETAIL = 'Key ID and non-null response payload are required.';
  END IF;

  UPDATE public.idempotency_keys
  SET status = 'completed',
      response_payload = p_response_payload,
      target_record_id = p_target_record_id,
      completed_at = clock_timestamp(),
      last_seen_at = clock_timestamp()
  WHERE id = p_key_id
    AND status = 'processing'
  RETURNING id INTO v_updated_id;

  IF v_updated_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'idempotency_processing_conflict', DETAIL = 'No active processing claim found to complete.';
  END IF;
END;
$function$;


-- ----------------------------------------------------------------------------
-- 2. INTERNAL ALLOCATION VALIDATION & PROCESSING HELPER
-- ----------------------------------------------------------------------------

CREATE FUNCTION public.validate_and_process_allocations(
  p_account_id uuid,
  p_company_id uuid,
  p_revision_id uuid,
  p_total_amount numeric,
  p_allocations jsonb,
  p_actor_id uuid,
  p_exclude_collection_id uuid DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_item jsonb;
  v_form_id uuid;
  v_amount numeric;
  v_alloc_sum numeric := 0.00;
  v_form_ids uuid[] := ARRAY[]::uuid[];
  v_form_row public.research_forms%ROWTYPE;
  v_existing_alloc numeric;
BEGIN
  IF p_allocations IS NULL OR jsonb_typeof(p_allocations) <> 'array' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input', DETAIL = 'Allocations payload must be a JSON array.';
  END IF;

  IF jsonb_array_length(p_allocations) = 0 THEN
    RETURN 0.00;
  END IF;

  -- Step A: Parse payload and validate duplicates & format
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_allocations)
  LOOP
    IF jsonb_typeof(v_item) <> 'object' THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input', DETAIL = 'Each allocation item must be a JSON object.';
    END IF;

    BEGIN
      v_form_id := (v_item->>'research_form_id')::uuid;
      v_amount := (v_item->>'amount')::numeric;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'allocation_target_invalid', DETAIL = 'Malformed form ID or amount in allocation payload.';
    END;

    IF v_form_id IS NULL OR v_amount IS NULL OR v_amount <= 0 THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'allocation_target_invalid', DETAIL = 'Allocation target ID and positive amount are required.';
    END IF;

    IF v_form_id = ANY(v_form_ids) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'allocation_target_invalid', DETAIL = 'Duplicate target research form in allocation payload.';
    END IF;

    v_form_ids := array_append(v_form_ids, v_form_id);
    v_alloc_sum := v_alloc_sum + v_amount;
  END LOOP;

  IF v_alloc_sum > p_total_amount THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'allocation_total_exceeds_collection', DETAIL = 'Total allocated amount exceeds receipt total.';
  END IF;

  -- Step B: Lock research_forms in deterministic UUID order to prevent deadlocks
  FOR v_form_row IN
    SELECT *
    FROM public.research_forms
    WHERE id = ANY(v_form_ids)
      AND account_id = p_account_id
    ORDER BY id ASC
    FOR UPDATE
  LOOP
    IF v_form_row.company_id <> p_company_id THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'allocation_target_invalid', DETAIL = 'Target research form does not belong to collection company.';
    END IF;

    IF v_form_row.review_status <> 'accepted' THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'allocation_target_invalid', DETAIL = 'Target research form is not accepted.';
    END IF;
  END LOOP;

  -- Verify all requested form IDs existed
  IF (SELECT count(*)::integer FROM public.research_forms WHERE id = ANY(v_form_ids) AND account_id = p_account_id) <> array_length(v_form_ids, 1) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'allocation_target_invalid', DETAIL = 'One or more target research forms not found in account.';
  END IF;

  -- Step C: Validate per-form financial exposure and insert line items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_allocations)
  LOOP
    v_form_id := (v_item->>'research_form_id')::uuid;
    v_amount := (v_item->>'amount')::numeric;

    SELECT * INTO v_form_row
    FROM public.research_forms
    WHERE id = v_form_id;

    SELECT COALESCE(SUM(ca.amount), 0.00) INTO v_existing_alloc
    FROM public.collection_allocations ca
    JOIN public.collection_allocation_revisions car ON car.id = ca.revision_id
    JOIN public.collections c ON c.id = car.collection_id AND c.version = car.revision_number AND c.status = 'active'
    WHERE ca.research_form_id = v_form_id
      AND ca.account_id = p_account_id
      AND (p_exclude_collection_id IS NULL OR c.id <> p_exclude_collection_id);

    IF (v_existing_alloc + v_amount) > v_form_row.accepted_price_snapshot THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'allocation_exceeds_form_balance', DETAIL = 'Proposed allocation exceeds target form remaining accepted balance.';
    END IF;

    INSERT INTO public.collection_allocations (
      account_id,
      revision_id,
      research_form_id,
      amount,
      created_by,
      created_at
    ) VALUES (
      p_account_id,
      p_revision_id,
      v_form_id,
      v_amount,
      p_actor_id,
      clock_timestamp()
    );
  END LOOP;

  RETURN v_alloc_sum;
END;
$function$;


-- ----------------------------------------------------------------------------
-- 3. RESEARCH FORM SUBMISSION RPC
-- ----------------------------------------------------------------------------

CREATE FUNCTION public.submit_research_form(
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
  v_attempt integer;
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

  -- Lock participation row to serialize attempt calculations
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

  SELECT COALESCE(MAX(attempt_number), 0) + 1 INTO v_attempt
  FROM public.research_forms
  WHERE participation_id = p_participation_id
    AND account_id = v_account_id;

  SELECT COALESCE(MAX(SUBSTRING(code FROM 'RF-[0-9]{8}-([0-9]{3})')::integer), 0) + 1 INTO v_daily_seq
  FROM public.research_forms
  WHERE account_id = v_account_id
    AND submitted_date = p_submitted_date;

  v_code := 'RF-' || to_char(p_submitted_date, 'YYYYMMDD') || '-' || lpad(v_daily_seq::text, 3, '0');

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
    v_attempt,
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

  v_response := jsonb_build_object(
    'research_form_id', v_form_id,
    'code', v_code,
    'attempt_number', v_attempt,
    'review_status', 'submitted',
    'submitted_date', p_submitted_date
  );

  PERFORM public.complete_idempotent_mutation(v_claim.key_id, v_response, v_form_id);

  RETURN v_response;
END;
$function$;


-- ----------------------------------------------------------------------------
-- 4. RESEARCH FORM REVIEW RPC
-- ----------------------------------------------------------------------------

CREATE FUNCTION public.review_research_form(
  p_idempotency_key text,
  p_research_form_id uuid,
  p_decision text,
  p_quota_override_reason text DEFAULT NULL,
  p_rejection_reason text DEFAULT NULL,
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
  v_claim RECORD;
  v_rf public.research_forms%ROWTYPE;
  v_proj_lock RECORD;
  v_dup boolean;
  v_price numeric;
  v_accepted_count integer;
  v_quota_limit integer;
  v_is_override boolean := false;
  v_override_reason_clean text := NULL;
  v_canonical_status text;
  v_response jsonb;
BEGIN
  IF NOT COALESCE(public.is_owner(), false) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'forbidden', DETAIL = 'Only account owners may review research forms.';
  END IF;

  v_account_id := public.current_account_id();
  v_profile_id := public.current_profile_id();

  IF v_account_id IS NULL OR v_profile_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'unauthorized', DETAIL = 'Active profile unavailable.';
  END IF;

  IF p_decision NOT IN ('accept', 'reject', 'cancel', 'accepted', 'rejected', 'cancelled') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input', DETAIL = 'Decision must be accept, reject, or cancel.';
  END IF;

  v_canonical_status := CASE
    WHEN p_decision IN ('accept', 'accepted') THEN 'accepted'
    WHEN p_decision IN ('reject', 'rejected') THEN 'rejected'
    ELSE 'cancelled'
  END;

  SELECT * INTO v_claim FROM public.claim_idempotent_mutation(
    v_account_id,
    'review_research_form',
    p_idempotency_key,
    jsonb_build_object('research_form_id', p_research_form_id, 'decision', p_decision, 'quota_override_reason', p_quota_override_reason, 'rejection_reason', p_rejection_reason, 'notes', p_notes)
  );

  IF v_claim.already_completed THEN
    RETURN v_claim.stored_response;
  END IF;

  -- Lock form first to get project ID
  SELECT * INTO v_rf
  FROM public.research_forms
  WHERE id = p_research_form_id
    AND account_id = v_account_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'research_form_not_found', DETAIL = 'Research form not found in tenant account.';
  END IF;

  IF v_rf.review_status <> 'submitted' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'research_form_state_invalid', DETAIL = 'Only submitted research forms may be reviewed.';
  END IF;

  -- Serialize review against parent project row
  SELECT id, quota INTO v_proj_lock
  FROM public.projects
  WHERE id = v_rf.project_id
    AND account_id = v_account_id
  FOR UPDATE;

  -- Lock target research form row FOR UPDATE
  SELECT * INTO v_rf
  FROM public.research_forms
  WHERE id = p_research_form_id
    AND account_id = v_account_id
  FOR UPDATE;

  IF v_rf.review_status <> 'submitted' THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'research_form_state_invalid',
      DETAIL = 'Only submitted research forms may be reviewed.';
  END IF;

  IF v_canonical_status = 'accepted' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.research_forms
      WHERE account_id = v_account_id
        AND project_id = v_rf.project_id
        AND respondent_id = v_rf.respondent_id
        AND review_status = 'accepted'
        AND id <> v_rf.id
    ) INTO v_dup;

    IF v_dup THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'duplicate_accepted_form', DETAIL = 'Respondent already has an accepted form for this project.';
    END IF;

    SELECT COALESCE(pp.agreed_price, pfs.default_price_per_form)
    INTO v_price
    FROM public.projects proj
    LEFT JOIN public.project_financial_settings pfs ON pfs.project_id = proj.id
    LEFT JOIN public.participation_pricing pp ON pp.participation_id = v_rf.participation_id
    WHERE proj.id = v_rf.project_id
      AND proj.account_id = v_account_id;

    IF v_price IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'accepted_price_unavailable', DETAIL = 'No agreed or default price configured for form.';
    END IF;

    SELECT count(*)::integer INTO v_accepted_count
    FROM public.research_forms
    WHERE project_id = v_rf.project_id
      AND account_id = v_account_id
      AND review_status = 'accepted';

    v_quota_limit := v_proj_lock.quota;

    IF v_quota_limit IS NOT NULL AND v_accepted_count >= v_quota_limit THEN
      IF p_quota_override_reason IS NULL OR btrim(p_quota_override_reason) = '' OR char_length(btrim(p_quota_override_reason)) < 3 THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'quota_override_reason_required', DETAIL = 'Quota limit reached. Explicit nonblank override reason required.';
      END IF;
      v_is_override := true;
      v_override_reason_clean := btrim(p_quota_override_reason);
    END IF;

    -- Update accepted form satisfying chk_rf_quota_override_evidence in both cases
    UPDATE public.research_forms
    SET review_status = 'accepted',
        reviewed_at = clock_timestamp(),
        accepted_at = clock_timestamp(),
        accepted_price_snapshot = v_price,
        quota_limit_snapshot = CASE WHEN v_is_override THEN v_quota_limit ELSE NULL END,
        accepted_count_before = CASE WHEN v_is_override THEN v_accepted_count ELSE NULL END,
        quota_override_reason = CASE WHEN v_is_override THEN v_override_reason_clean ELSE NULL END,
        quota_overridden_at = CASE WHEN v_is_override THEN clock_timestamp() ELSE NULL END,
        quota_overridden_by = CASE WHEN v_is_override THEN v_profile_id ELSE NULL END,
        updated_by = v_profile_id,
        notes = CASE WHEN p_notes IS NOT NULL THEN btrim(p_notes) ELSE notes END
    WHERE id = p_research_form_id;

  ELSIF v_canonical_status = 'rejected' THEN
    IF p_rejection_reason IS NULL OR btrim(p_rejection_reason) = '' OR char_length(btrim(p_rejection_reason)) < 3 THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input', DETAIL = 'Rejection reason is required (min 3 chars).';
    END IF;

    UPDATE public.research_forms
    SET review_status = 'rejected',
        reviewed_at = clock_timestamp(),
        rejected_at = clock_timestamp(),
        rejection_reason = btrim(p_rejection_reason),
        updated_by = v_profile_id,
        notes = CASE WHEN p_notes IS NOT NULL THEN btrim(p_notes) ELSE notes END
    WHERE id = p_research_form_id;

  ELSIF v_canonical_status = 'cancelled' THEN
    UPDATE public.research_forms
    SET review_status = 'cancelled',
        reviewed_at = clock_timestamp(),
        cancelled_at = clock_timestamp(),
        updated_by = v_profile_id,
        notes = CASE WHEN p_notes IS NOT NULL THEN btrim(p_notes) ELSE notes END
    WHERE id = p_research_form_id;
  END IF;

  v_response := jsonb_build_object(
    'research_form_id', p_research_form_id,
    'review_status', v_canonical_status,
    'accepted_price_snapshot', CASE WHEN v_canonical_status = 'accepted' THEN v_price ELSE NULL END
  );

  PERFORM public.complete_idempotent_mutation(v_claim.key_id, v_response, p_research_form_id);

  RETURN v_response;
END;
$function$;


-- ----------------------------------------------------------------------------
-- 5. ACCEPTED-FORM CORRECTION RPC
-- ----------------------------------------------------------------------------

CREATE FUNCTION public.correct_accepted_research_form(
  p_idempotency_key text,
  p_research_form_id uuid,
  p_target_status text,
  p_correction_reason text,
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
  v_claim RECORD;
  v_rf public.research_forms%ROWTYPE;
  v_alloc_sum numeric;
  v_canonical_status text;
  v_response jsonb;
BEGIN
  IF NOT COALESCE(public.is_owner(), false) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'forbidden', DETAIL = 'Only account owners may correct accepted research forms.';
  END IF;

  v_account_id := public.current_account_id();
  v_profile_id := public.current_profile_id();

  IF v_account_id IS NULL OR v_profile_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'unauthorized', DETAIL = 'Active profile unavailable.';
  END IF;

  IF p_target_status NOT IN ('rejected', 'cancelled') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input', DETAIL = 'Correction target status must be rejected or cancelled.';
  END IF;

  v_canonical_status := p_target_status;

  IF p_correction_reason IS NULL OR btrim(p_correction_reason) = '' OR char_length(btrim(p_correction_reason)) < 3 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'correction_reason_required', DETAIL = 'Correction reason is required (min 3 chars).';
  END IF;

  SELECT * INTO v_claim FROM public.claim_idempotent_mutation(
    v_account_id,
    'correct_accepted_research_form',
    p_idempotency_key,
    jsonb_build_object('research_form_id', p_research_form_id, 'target_status', p_target_status, 'correction_reason', p_correction_reason, 'notes', p_notes)
  );

  IF v_claim.already_completed THEN
    RETURN v_claim.stored_response;
  END IF;

  SELECT * INTO v_rf
  FROM public.research_forms
  WHERE id = p_research_form_id
    AND account_id = v_account_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'research_form_not_found', DETAIL = 'Research form not found in tenant account.';
  END IF;

  IF v_rf.review_status <> 'accepted' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'research_form_state_invalid', DETAIL = 'Only accepted research forms may be corrected.';
  END IF;

  SELECT COALESCE(SUM(ca.amount), 0.00) INTO v_alloc_sum
  FROM public.collection_allocations ca
  JOIN public.collection_allocation_revisions car ON car.id = ca.revision_id
  JOIN public.collections c ON c.id = car.collection_id AND c.version = car.revision_number AND c.status = 'active'
  WHERE ca.research_form_id = p_research_form_id
    AND ca.account_id = v_account_id;

  IF v_alloc_sum > 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'accepted_form_has_active_allocations', DETAIL = 'Cannot correct an accepted form that has active financial allocations.';
  END IF;

  -- Satisfies chk_rf_status_timestamps in both outcomes
  IF v_canonical_status = 'rejected' THEN
    UPDATE public.research_forms
    SET review_status = 'rejected',
        reviewed_at = clock_timestamp(),
        accepted_at = NULL,
        cancelled_at = NULL,
        rejected_at = clock_timestamp(),
        rejection_reason = btrim(p_correction_reason),
        review_correction_reason = btrim(p_correction_reason),
        updated_by = v_profile_id,
        notes = CASE WHEN p_notes IS NOT NULL THEN btrim(p_notes) ELSE notes END
    WHERE id = p_research_form_id;

  ELSIF v_canonical_status = 'cancelled' THEN
    UPDATE public.research_forms
    SET review_status = 'cancelled',
        reviewed_at = clock_timestamp(),
        accepted_at = NULL,
        rejected_at = NULL,
        rejection_reason = NULL,
        cancelled_at = clock_timestamp(),
        review_correction_reason = btrim(p_correction_reason),
        updated_by = v_profile_id,
        notes = CASE WHEN p_notes IS NOT NULL THEN btrim(p_notes) ELSE notes END
    WHERE id = p_research_form_id;
  END IF;

  v_response := jsonb_build_object(
    'research_form_id', p_research_form_id,
    'review_status', v_canonical_status,
    'accepted_price_snapshot', v_rf.accepted_price_snapshot
  );

  PERFORM public.complete_idempotent_mutation(v_claim.key_id, v_response, p_research_form_id);

  RETURN v_response;
END;
$function$;


-- ----------------------------------------------------------------------------
-- 6. COLLECTION CREATION RPC
-- ----------------------------------------------------------------------------

CREATE FUNCTION public.create_collection_receipt(
  p_idempotency_key text,
  p_company_id uuid,
  p_receipt_date date,
  p_total_amount numeric,
  p_payment_method text,
  p_reference_number text DEFAULT NULL,
  p_allocations jsonb DEFAULT '[]'::jsonb,
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
  v_comp_id uuid;
  v_seq integer;
  v_code text;
  v_col_id uuid;
  v_rev_id uuid;
  v_alloc_sum numeric := 0.00;
  v_ref text;
  v_response jsonb;
BEGIN
  IF NOT COALESCE(public.is_owner(), false) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'forbidden', DETAIL = 'Only account owners may create collection receipts.';
  END IF;

  v_account_id := public.current_account_id();
  v_profile_id := public.current_profile_id();

  IF v_account_id IS NULL OR v_profile_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'unauthorized', DETAIL = 'Active profile unavailable.';
  END IF;

  IF p_company_id IS NULL OR p_receipt_date IS NULL OR p_total_amount IS NULL OR p_total_amount <= 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'collection_amount_invalid', DETAIL = 'Company ID, receipt date, and positive total amount are required.';
  END IF;

  -- Exact 3-value enum matching Slice 1
  IF p_payment_method NOT IN ('bank_transfer', 'cash', 'cheque') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input', DETAIL = 'Invalid payment method. Must be bank_transfer, cash, or cheque.';
  END IF;

  v_ref := NULLIF(btrim(COALESCE(p_reference_number, '')), '');

  SELECT * INTO v_claim FROM public.claim_idempotent_mutation(
    v_account_id,
    'create_collection_receipt',
    p_idempotency_key,
    jsonb_build_object('company_id', p_company_id, 'receipt_date', p_receipt_date, 'total_amount', p_total_amount, 'payment_method', p_payment_method, 'reference_number', p_reference_number, 'allocations', p_allocations, 'notes', p_notes)
  );

  IF v_claim.already_completed THEN
    RETURN v_claim.stored_response;
  END IF;

  -- Lock tenant account row to serialize collection code generation
  SELECT id INTO v_acc_lock
  FROM public.accounts
  WHERE id = v_account_id
  FOR UPDATE;

  SELECT id INTO v_comp_id
  FROM public.companies
  WHERE id = p_company_id
    AND account_id = v_account_id
    AND deleted_at IS NULL;

  IF v_comp_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'parent_not_found', DETAIL = 'Company not found in tenant account.';
  END IF;

  SELECT COALESCE(MAX(SUBSTRING(code FROM 'COL-([0-9]+)')::integer), 0) + 1 INTO v_seq
  FROM public.collections
  WHERE account_id = v_account_id;

  v_code := 'COL-' || lpad(v_seq::text, 4, '0');

  INSERT INTO public.collections (
    account_id,
    company_id,
    code,
    receipt_date,
    total_amount,
    payment_method,
    reference_number,
    status,
    version,
    notes,
    created_by,
    updated_by,
    created_at,
    updated_at
  ) VALUES (
    v_account_id,
    p_company_id,
    v_code,
    p_receipt_date,
    p_total_amount,
    p_payment_method,
    v_ref,
    'active',
    1,
    btrim(COALESCE(p_notes, '')),
    v_profile_id,
    v_profile_id,
    clock_timestamp(),
    clock_timestamp()
  )
  RETURNING id INTO v_col_id;

  INSERT INTO public.collection_allocation_revisions (
    account_id,
    collection_id,
    revision_number,
    expected_previous_version,
    reason,
    created_by,
    created_at
  ) VALUES (
    v_account_id,
    v_col_id,
    1,
    0,
    'Initial receipt creation',
    v_profile_id,
    clock_timestamp()
  )
  RETURNING id INTO v_rev_id;

  v_alloc_sum := public.validate_and_process_allocations(
    v_account_id,
    p_company_id,
    v_rev_id,
    p_total_amount,
    p_allocations,
    v_profile_id,
    NULL
  );

  v_response := jsonb_build_object(
    'collection_id', v_col_id,
    'code', v_code,
    'version', 1,
    'total_amount', p_total_amount,
    'allocated_amount', v_alloc_sum,
    'unallocated_amount', (p_total_amount - v_alloc_sum)
  );

  PERFORM public.complete_idempotent_mutation(v_claim.key_id, v_response, v_col_id);

  RETURN v_response;
END;
$function$;


-- ----------------------------------------------------------------------------
-- 7. COLLECTION ALLOCATION REVISION RPC
-- ----------------------------------------------------------------------------

CREATE FUNCTION public.revise_collection_allocations(
  p_idempotency_key text,
  p_collection_id uuid,
  p_expected_previous_version integer,
  p_revision_reason text,
  p_allocations jsonb,
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
  v_claim RECORD;
  v_col public.collections%ROWTYPE;
  v_new_version integer;
  v_rev_id uuid;
  v_alloc_sum numeric := 0.00;
  v_response jsonb;
BEGIN
  IF NOT COALESCE(public.is_owner(), false) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'forbidden', DETAIL = 'Only account owners may revise collection allocations.';
  END IF;

  v_account_id := public.current_account_id();
  v_profile_id := public.current_profile_id();

  IF v_account_id IS NULL OR v_profile_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'unauthorized', DETAIL = 'Active profile unavailable.';
  END IF;

  IF p_revision_reason IS NULL OR btrim(p_revision_reason) = '' OR char_length(btrim(p_revision_reason)) < 3 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input', DETAIL = 'Revision reason is required (min 3 chars).';
  END IF;

  SELECT * INTO v_claim FROM public.claim_idempotent_mutation(
    v_account_id,
    'revise_collection_allocations',
    p_idempotency_key,
    jsonb_build_object('collection_id', p_collection_id, 'expected_previous_version', p_expected_previous_version, 'revision_reason', p_revision_reason, 'allocations', p_allocations, 'notes', p_notes)
  );

  IF v_claim.already_completed THEN
    RETURN v_claim.stored_response;
  END IF;

  SELECT * INTO v_col
  FROM public.collections
  WHERE id = p_collection_id
    AND account_id = v_account_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'collection_not_found', DETAIL = 'Collection receipt not found in tenant account.';
  END IF;

  IF v_col.status <> 'active' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'collection_not_active', DETAIL = 'Only active collections may have allocation revisions.';
  END IF;

  IF v_col.version <> p_expected_previous_version THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'allocation_revision_conflict', DETAIL = 'Collection version mismatch. Stale version supplied.';
  END IF;

  v_new_version := v_col.version + 1;

  INSERT INTO public.collection_allocation_revisions (
    account_id,
    collection_id,
    revision_number,
    expected_previous_version,
    reason,
    created_by,
    created_at
  ) VALUES (
    v_account_id,
    p_collection_id,
    v_new_version,
    p_expected_previous_version,
    btrim(p_revision_reason),
    v_profile_id,
    clock_timestamp()
  )
  RETURNING id INTO v_rev_id;

  v_alloc_sum := public.validate_and_process_allocations(
    v_account_id,
    v_col.company_id,
    v_rev_id,
    v_col.total_amount,
    p_allocations,
    v_profile_id,
    p_collection_id
  );

  UPDATE public.collections
  SET version = v_new_version,
      updated_by = v_profile_id,
      notes = CASE WHEN p_notes IS NOT NULL THEN btrim(p_notes) ELSE notes END
  WHERE id = p_collection_id;

  v_response := jsonb_build_object(
    'collection_id', p_collection_id,
    'version', v_new_version,
    'allocated_amount', v_alloc_sum,
    'unallocated_amount', (v_col.total_amount - v_alloc_sum)
  );

  PERFORM public.complete_idempotent_mutation(v_claim.key_id, v_response, p_collection_id);

  RETURN v_response;
END;
$function$;


-- ----------------------------------------------------------------------------
-- 8. COLLECTION VOIDING RPC
-- ----------------------------------------------------------------------------

CREATE FUNCTION public.void_collection_receipt(
  p_idempotency_key text,
  p_collection_id uuid,
  p_void_reason text,
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
  v_claim RECORD;
  v_col public.collections%ROWTYPE;
  v_response jsonb;
BEGIN
  IF NOT COALESCE(public.is_owner(), false) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'forbidden', DETAIL = 'Only account owners may void collection receipts.';
  END IF;

  v_account_id := public.current_account_id();
  v_profile_id := public.current_profile_id();

  IF v_account_id IS NULL OR v_profile_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'unauthorized', DETAIL = 'Active profile unavailable.';
  END IF;

  IF p_void_reason IS NULL OR btrim(p_void_reason) = '' OR char_length(btrim(p_void_reason)) < 3 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'collection_void_reason_required', DETAIL = 'Void reason is required (min 3 chars).';
  END IF;

  SELECT * INTO v_claim FROM public.claim_idempotent_mutation(
    v_account_id,
    'void_collection_receipt',
    p_idempotency_key,
    jsonb_build_object('collection_id', p_collection_id, 'void_reason', p_void_reason, 'notes', p_notes)
  );

  IF v_claim.already_completed THEN
    RETURN v_claim.stored_response;
  END IF;

  SELECT * INTO v_col
  FROM public.collections
  WHERE id = p_collection_id
    AND account_id = v_account_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'collection_not_found', DETAIL = 'Collection receipt not found in tenant account.';
  END IF;

  IF v_col.status = 'voided' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'collection_not_active', DETAIL = 'Collection receipt is already voided.';
  END IF;

  UPDATE public.collections
  SET status = 'voided',
      void_reason = btrim(p_void_reason),
      voided_at = clock_timestamp(),
      voided_by = v_profile_id,
      updated_by = v_profile_id,
      notes = CASE WHEN p_notes IS NOT NULL THEN btrim(p_notes) ELSE notes END
  WHERE id = p_collection_id;

  v_response := jsonb_build_object(
    'collection_id', p_collection_id,
    'status', 'voided',
    'void_reason', btrim(p_void_reason)
  );

  PERFORM public.complete_idempotent_mutation(v_claim.key_id, v_response, p_collection_id);

  RETURN v_response;
END;
$function$;


-- ----------------------------------------------------------------------------
-- 9. REPLACEMENT COLLECTION RPC
-- ----------------------------------------------------------------------------

CREATE FUNCTION public.create_replacement_collection_receipt(
  p_idempotency_key text,
  p_replaces_collection_id uuid,
  p_receipt_date date,
  p_total_amount numeric,
  p_payment_method text,
  p_reference_number text DEFAULT NULL,
  p_allocations jsonb DEFAULT '[]'::jsonb,
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
  v_old_col public.collections%ROWTYPE;
  v_dup_rep boolean;
  v_seq integer;
  v_code text;
  v_new_col_id uuid;
  v_rev_id uuid;
  v_alloc_sum numeric := 0.00;
  v_ref text;
  v_response jsonb;
BEGIN
  IF NOT COALESCE(public.is_owner(), false) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'forbidden', DETAIL = 'Only account owners may create replacement collection receipts.';
  END IF;

  v_account_id := public.current_account_id();
  v_profile_id := public.current_profile_id();

  IF v_account_id IS NULL OR v_profile_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'unauthorized', DETAIL = 'Active profile unavailable.';
  END IF;

  IF p_replaces_collection_id IS NULL OR p_receipt_date IS NULL OR p_total_amount IS NULL OR p_total_amount <= 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'replacement_target_invalid', DETAIL = 'Replaced collection ID, receipt date, and positive total amount are required.';
  END IF;

  -- Exact 3-value enum matching Slice 1
  IF p_payment_method NOT IN ('bank_transfer', 'cash', 'cheque') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid_input', DETAIL = 'Invalid payment method. Must be bank_transfer, cash, or cheque.';
  END IF;

  v_ref := NULLIF(btrim(COALESCE(p_reference_number, '')), '');

  SELECT * INTO v_claim FROM public.claim_idempotent_mutation(
    v_account_id,
    'create_replacement_collection_receipt',
    p_idempotency_key,
    jsonb_build_object('replaces_collection_id', p_replaces_collection_id, 'receipt_date', p_receipt_date, 'total_amount', p_total_amount, 'payment_method', p_payment_method, 'reference_number', p_reference_number, 'allocations', p_allocations, 'notes', p_notes)
  );

  IF v_claim.already_completed THEN
    RETURN v_claim.stored_response;
  END IF;

  -- Lock tenant account row to serialize code generation
  SELECT id INTO v_acc_lock
  FROM public.accounts
  WHERE id = v_account_id
  FOR UPDATE;

  SELECT * INTO v_old_col
  FROM public.collections
  WHERE id = p_replaces_collection_id
    AND account_id = v_account_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'replacement_target_invalid', DETAIL = 'Target collection to replace not found.';
  END IF;

  IF v_old_col.status <> 'voided' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'replacement_target_invalid', DETAIL = 'Only voided collections may be replaced.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.collections
    WHERE replaces_collection_id = p_replaces_collection_id
      AND account_id = v_account_id
  ) INTO v_dup_rep;

  IF v_dup_rep THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'replacement_target_invalid', DETAIL = 'Target voided collection has already been replaced.';
  END IF;

  SELECT COALESCE(MAX(SUBSTRING(code FROM 'COL-([0-9]+)')::integer), 0) + 1 INTO v_seq
  FROM public.collections
  WHERE account_id = v_account_id;

  v_code := 'COL-' || lpad(v_seq::text, 4, '0');

  INSERT INTO public.collections (
    account_id,
    company_id,
    code,
    receipt_date,
    total_amount,
    payment_method,
    reference_number,
    status,
    version,
    replaces_collection_id,
    notes,
    created_by,
    updated_by,
    created_at,
    updated_at
  ) VALUES (
    v_account_id,
    v_old_col.company_id,
    v_code,
    p_receipt_date,
    p_total_amount,
    p_payment_method,
    v_ref,
    'active',
    1,
    p_replaces_collection_id,
    btrim(COALESCE(p_notes, '')),
    v_profile_id,
    v_profile_id,
    clock_timestamp(),
    clock_timestamp()
  )
  RETURNING id INTO v_new_col_id;

  INSERT INTO public.collection_allocation_revisions (
    account_id,
    collection_id,
    revision_number,
    expected_previous_version,
    reason,
    created_by,
    created_at
  ) VALUES (
    v_account_id,
    v_new_col_id,
    1,
    0,
    'Replacement collection creation',
    v_profile_id,
    clock_timestamp()
  )
  RETURNING id INTO v_rev_id;

  v_alloc_sum := public.validate_and_process_allocations(
    v_account_id,
    v_old_col.company_id,
    v_rev_id,
    p_total_amount,
    p_allocations,
    v_profile_id,
    NULL
  );

  v_response := jsonb_build_object(
    'collection_id', v_new_col_id,
    'code', v_code,
    'replaces_collection_id', p_replaces_collection_id,
    'version', 1,
    'total_amount', p_total_amount,
    'allocated_amount', v_alloc_sum,
    'unallocated_amount', (p_total_amount - v_alloc_sum)
  );

  PERFORM public.complete_idempotent_mutation(v_claim.key_id, v_response, v_new_col_id);

  RETURN v_response;
END;
$function$;


-- ----------------------------------------------------------------------------
-- 10. FUNCTION OWNERSHIP & EXECUTION PRIVILEGES HARDENING
-- ----------------------------------------------------------------------------

-- Internal Helpers (postgres owned, zero execution granted to client roles)
ALTER FUNCTION public.claim_idempotent_mutation(uuid, text, text, jsonb) OWNER TO postgres;
ALTER FUNCTION public.complete_idempotent_mutation(uuid, jsonb, uuid) OWNER TO postgres;
ALTER FUNCTION public.validate_and_process_allocations(uuid, uuid, uuid, numeric, jsonb, uuid, uuid) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.claim_idempotent_mutation(uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.complete_idempotent_mutation(uuid, jsonb, uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.validate_and_process_allocations(uuid, uuid, uuid, numeric, jsonb, uuid, uuid) FROM PUBLIC, anon, authenticated, service_role;

-- Public Mutation RPCs (postgres owned, EXECUTE granted ONLY to authenticated)
ALTER FUNCTION public.submit_research_form(text, uuid, date, text) OWNER TO postgres;
ALTER FUNCTION public.review_research_form(text, uuid, text, text, text, text) OWNER TO postgres;
ALTER FUNCTION public.correct_accepted_research_form(text, uuid, text, text, text) OWNER TO postgres;
ALTER FUNCTION public.create_collection_receipt(text, uuid, date, numeric, text, text, jsonb, text) OWNER TO postgres;
ALTER FUNCTION public.revise_collection_allocations(text, uuid, integer, text, jsonb, text) OWNER TO postgres;
ALTER FUNCTION public.void_collection_receipt(text, uuid, text, text) OWNER TO postgres;
ALTER FUNCTION public.create_replacement_collection_receipt(text, uuid, date, numeric, text, text, jsonb, text) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.submit_research_form(text, uuid, date, text) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.review_research_form(text, uuid, text, text, text, text) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.correct_accepted_research_form(text, uuid, text, text, text) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.create_collection_receipt(text, uuid, date, numeric, text, text, jsonb, text) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.revise_collection_allocations(text, uuid, integer, text, jsonb, text) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.void_collection_receipt(text, uuid, text, text) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.create_replacement_collection_receipt(text, uuid, date, numeric, text, text, jsonb, text) FROM PUBLIC, anon, service_role;

GRANT EXECUTE ON FUNCTION public.submit_research_form(text, uuid, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_research_form(text, uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.correct_accepted_research_form(text, uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_collection_receipt(text, uuid, date, numeric, text, text, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revise_collection_allocations(text, uuid, integer, text, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.void_collection_receipt(text, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_replacement_collection_receipt(text, uuid, date, numeric, text, text, jsonb, text) TO authenticated;
