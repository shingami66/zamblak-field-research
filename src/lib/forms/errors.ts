import type { FormsErrorCode } from "./types";

const FORMS_ERROR_TOKENS: readonly Exclude<
  FormsErrorCode,
  "unexpected_forms_error"
>[] = [
  "unauthorized",
  "forbidden",
  "invalid_input",
  "participation_not_eligible",
  "research_form_not_found",
  "research_form_state_invalid",
  "duplicate_accepted_form",
  "accepted_price_unavailable",
  "quota_override_reason_required",
  "accepted_form_has_active_allocations",
  "correction_reason_required",
  "idempotency_key_invalid",
  "idempotency_request_conflict",
  "idempotency_processing_conflict",
] as const;

export function mapFormsRpcError(error: unknown): FormsErrorCode {
  if (!error || typeof error !== "object") {
    return "unexpected_forms_error";
  }

  const record = error as { message?: unknown; details?: unknown; hint?: unknown };
  for (const candidate of [record.message, record.details, record.hint]) {
    if (typeof candidate === "string") {
      const normalized = candidate.toLowerCase();
      const match = FORMS_ERROR_TOKENS.find((token) =>
        normalized.includes(token)
      );
      if (match) return match;
    }
  }

  return "unexpected_forms_error";
}
