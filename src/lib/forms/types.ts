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

// ----------------------------------------------------------------------------
// READ / QUERY CONTRACT TYPES (SLICE A2 CORE)
// ----------------------------------------------------------------------------

export interface ResearchFormRow {
  id: string;
  account_id: string;
  project_id: string;
  company_id: string;
  respondent_id: string;
  participation_id: string;
  code: string;
  attempt_number: number;
  submitted_date: string;
  review_status: ResearchFormReviewStatus;
  submitted_at: string;
  reviewed_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  cancelled_at: string | null;
  rejection_reason: string | null;
  review_correction_reason: string | null;
  accepted_price_snapshot: number | null;
  quota_limit_snapshot: number | null;
  accepted_count_before: number | null;
  quota_override_reason: string | null;
  quota_overridden_at: string | null;
  quota_overridden_by: string | null;
  notes: string | null;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export type SettlementState =
  | "uncollected"
  | "partially_collected"
  | "collected";

export interface FormFinancialSummaryRow {
  research_form_id: string;
  account_id: string;
  project_id: string;
  company_id: string;
  respondent_id: string;
  participation_id: string;
  form_code: string;
  submitted_date: string;
  accepted_at: string;
  accepted_price_snapshot: number;
  allocated_amount: number;
  outstanding_amount: number;
  settlement_state: SettlementState;
  due_date: string;
}

export interface PaginationInput {
  page?: number;
  pageSize?: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface FormsListFilters extends PaginationInput {
  projectId?: string;
  companyId?: string;
  respondentId?: string;
  participationId?: string;
  reviewStatus?: ResearchFormReviewStatus;
  submittedDateFrom?: string;
  submittedDateTo?: string;
  code?: string;
}

export interface FormFinancialSummaryFilters extends PaginationInput {
  projectId?: string;
  companyId?: string;
  respondentId?: string;
  participationId?: string;
  settlementState?: SettlementState;
  dueDateFrom?: string;
  dueDateTo?: string;
  formCode?: string;
}

export interface FormsListPage {
  items: ResearchFormRow[];
  pagination: PaginationMeta;
}

export interface FormFinancialSummaryPage {
  items: FormFinancialSummaryRow[];
  pagination: PaginationMeta;
}

export type FormsQueryErrorCode =
  | "invalid_query_input"
  | "research_form_not_found"
  | "financial_summary_not_found"
  | "malformed_query_response"
  | "forms_query_failed";

export type FormsQueryResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: FormsQueryErrorCode };
