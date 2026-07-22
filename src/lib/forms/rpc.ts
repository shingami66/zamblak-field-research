import type { SupabaseClient } from "@supabase/supabase-js";
import { mapFormsRpcError } from "./errors";
import {
  parseCorrectAcceptedResearchFormInput,
  parseReviewResearchFormInput,
  parseSubmitResearchFormInput,
} from "./input";
import type {
  CorrectAcceptedResearchFormInput,
  CorrectAcceptedResearchFormResponse,
  FormsResult,
  ReviewResearchFormInput,
  ReviewResearchFormResponse,
  SubmitResearchFormInput,
  SubmitResearchFormResponse,
} from "./types";

export async function submitResearchForm(
  supabase: SupabaseClient,
  input: SubmitResearchFormInput
): Promise<FormsResult<SubmitResearchFormResponse>> {
  const parsed = parseSubmitResearchFormInput(input);
  if (!parsed.ok) return parsed;

  const { data, error } = await supabase.rpc("submit_research_form", {
    p_idempotency_key: parsed.data.p_idempotency_key,
    p_participation_id: parsed.data.p_participation_id,
    p_submitted_date: parsed.data.p_submitted_date,
    p_notes: parsed.data.p_notes,
  });

  if (error) return { ok: false, code: mapFormsRpcError(error) };
  if (!data || typeof data !== "object") {
    return { ok: false, code: "unexpected_forms_error" };
  }

  const res = data as Partial<SubmitResearchFormResponse>;
  if (
    typeof res.research_form_id !== "string" ||
    typeof res.code !== "string" ||
    typeof res.attempt_number !== "number" ||
    res.review_status !== "submitted" ||
    typeof res.submitted_date !== "string"
  ) {
    return { ok: false, code: "unexpected_forms_error" };
  }

  return {
    ok: true,
    data: {
      research_form_id: res.research_form_id,
      code: res.code,
      attempt_number: res.attempt_number,
      review_status: "submitted",
      submitted_date: res.submitted_date,
    },
  };
}

export async function reviewResearchForm(
  supabase: SupabaseClient,
  input: ReviewResearchFormInput
): Promise<FormsResult<ReviewResearchFormResponse>> {
  const parsed = parseReviewResearchFormInput(input);
  if (!parsed.ok) return parsed;

  const { data, error } = await supabase.rpc("review_research_form", {
    p_idempotency_key: parsed.data.p_idempotency_key,
    p_research_form_id: parsed.data.p_research_form_id,
    p_decision: parsed.data.p_decision,
    p_quota_override_reason: parsed.data.p_quota_override_reason,
    p_rejection_reason: parsed.data.p_rejection_reason,
    p_notes: parsed.data.p_notes,
  });

  if (error) return { ok: false, code: mapFormsRpcError(error) };
  if (!data || typeof data !== "object") {
    return { ok: false, code: "unexpected_forms_error" };
  }

  const res = data as Partial<ReviewResearchFormResponse>;
  if (
    typeof res.research_form_id !== "string" ||
    !["accepted", "rejected", "cancelled"].includes(res.review_status || "")
  ) {
    return { ok: false, code: "unexpected_forms_error" };
  }

  return {
    ok: true,
    data: {
      research_form_id: res.research_form_id,
      review_status: res.review_status as "accepted" | "rejected" | "cancelled",
      accepted_price_snapshot:
        typeof res.accepted_price_snapshot === "number"
          ? res.accepted_price_snapshot
          : null,
    },
  };
}

export async function correctAcceptedResearchForm(
  supabase: SupabaseClient,
  input: CorrectAcceptedResearchFormInput
): Promise<FormsResult<CorrectAcceptedResearchFormResponse>> {
  const parsed = parseCorrectAcceptedResearchFormInput(input);
  if (!parsed.ok) return parsed;

  const { data, error } = await supabase.rpc(
    "correct_accepted_research_form",
    {
      p_idempotency_key: parsed.data.p_idempotency_key,
      p_research_form_id: parsed.data.p_research_form_id,
      p_target_status: parsed.data.p_target_status,
      p_correction_reason: parsed.data.p_correction_reason,
      p_notes: parsed.data.p_notes,
    }
  );

  if (error) return { ok: false, code: mapFormsRpcError(error) };
  if (!data || typeof data !== "object") {
    return { ok: false, code: "unexpected_forms_error" };
  }

  const res = data as Partial<CorrectAcceptedResearchFormResponse>;
  if (
    typeof res.research_form_id !== "string" ||
    !["rejected", "cancelled"].includes(res.review_status || "") ||
    typeof res.accepted_price_snapshot !== "number"
  ) {
    return { ok: false, code: "unexpected_forms_error" };
  }

  return {
    ok: true,
    data: {
      research_form_id: res.research_form_id,
      review_status: res.review_status as "rejected" | "cancelled",
      accepted_price_snapshot: res.accepted_price_snapshot,
    },
  };
}
