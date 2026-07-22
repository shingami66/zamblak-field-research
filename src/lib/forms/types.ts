export type ResearchFormReviewStatus =
  | "submitted"
  | "accepted"
  | "rejected"
  | "cancelled";

export type ResearchFormDecision = "accept" | "reject" | "cancel";

export type AcceptedCorrectionTarget = "rejected" | "cancelled";

export type FormsErrorCode =
  | "unauthorized"
  | "forbidden"
  | "invalid_input"
  | "participation_not_eligible"
  | "research_form_not_found"
  | "research_form_state_invalid"
  | "duplicate_accepted_form"
  | "accepted_price_unavailable"
  | "quota_override_reason_required"
  | "accepted_form_has_active_allocations"
  | "correction_reason_required"
  | "idempotency_key_invalid"
  | "idempotency_request_conflict"
  | "idempotency_processing_conflict"
  | "unexpected_forms_error";

export type FormsResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: FormsErrorCode };

export interface SubmitResearchFormInput {
  idempotencyKey?: string;
  participationId: string;
  submittedDate: string;
  notes?: string | null;
}

export interface ReviewResearchFormInput {
  idempotencyKey?: string;
  researchFormId: string;
  decision: ResearchFormDecision;
  quotaOverrideReason?: string | null;
  rejectionReason?: string | null;
  notes?: string | null;
}

export interface CorrectAcceptedResearchFormInput {
  idempotencyKey?: string;
  researchFormId: string;
  targetStatus: AcceptedCorrectionTarget;
  correctionReason: string;
  notes?: string | null;
}

export interface SubmitResearchFormRpcArgs {
  p_idempotency_key: string;
  p_participation_id: string;
  p_submitted_date: string;
  p_notes: string | null;
}

export interface ReviewResearchFormRpcArgs {
  p_idempotency_key: string;
  p_research_form_id: string;
  p_decision: string;
  p_quota_override_reason: string | null;
  p_rejection_reason: string | null;
  p_notes: string | null;
}

export interface CorrectAcceptedResearchFormRpcArgs {
  p_idempotency_key: string;
  p_research_form_id: string;
  p_target_status: string;
  p_correction_reason: string;
  p_notes: string | null;
}

export interface SubmitResearchFormResponse {
  research_form_id: string;
  code: string;
  attempt_number: number;
  review_status: "submitted";
  submitted_date: string;
}

export interface ReviewResearchFormResponse {
  research_form_id: string;
  review_status: "accepted" | "rejected" | "cancelled";
  accepted_price_snapshot: number | null;
}

export interface CorrectAcceptedResearchFormResponse {
  research_form_id: string;
  review_status: "rejected" | "cancelled";
  accepted_price_snapshot: number;
}
