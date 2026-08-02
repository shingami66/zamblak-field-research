CREATE OR REPLACE FUNCTION public.review_research_form(
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

    SELECT COALESCE(pp.price_snapshot, pfs.price_per_accepted_form)
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
