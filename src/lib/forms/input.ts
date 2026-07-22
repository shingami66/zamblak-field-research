import { normalizeIdempotencyKey } from "@/lib/idempotency/key";
import type {
  CorrectAcceptedResearchFormInput,
  CorrectAcceptedResearchFormRpcArgs,
  FormsResult,
  ReviewResearchFormInput,
  ReviewResearchFormRpcArgs,
  SubmitResearchFormInput,
  SubmitResearchFormRpcArgs,
} from "./types";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isValidUuid(val: unknown): boolean {
  return typeof val === "string" && UUID_REGEX.test(val.trim());
}

export function isValidIsoDate(val: unknown): boolean {
  if (typeof val !== "string") return false;
  const trimmed = val.trim();
  if (!DATE_REGEX.test(trimmed)) return false;
  const date = new Date(trimmed);
  return !isNaN(date.getTime());
}

export function parseSubmitResearchFormInput(
  input: SubmitResearchFormInput
): FormsResult<SubmitResearchFormRpcArgs> {
  if (!input || typeof input !== "object") {
    return { ok: false, code: "invalid_input" };
  }
  if (!isValidUuid(input.participationId)) {
    return { ok: false, code: "invalid_input" };
  }
  if (!isValidIsoDate(input.submittedDate)) {
    return { ok: false, code: "invalid_input" };
  }

  const key = normalizeIdempotencyKey(input.idempotencyKey);
  const notes =
    typeof input.notes === "string" && input.notes.trim().length > 0
      ? input.notes.trim()
      : null;

  return {
    ok: true,
    data: {
      p_idempotency_key: key,
      p_participation_id: input.participationId.trim(),
      p_submitted_date: input.submittedDate.trim(),
      p_notes: notes,
    },
  };
}

export function parseReviewResearchFormInput(
  input: ReviewResearchFormInput
): FormsResult<ReviewResearchFormRpcArgs> {
  if (!input || typeof input !== "object") {
    return { ok: false, code: "invalid_input" };
  }
  if (!isValidUuid(input.researchFormId)) {
    return { ok: false, code: "invalid_input" };
  }
  if (!["accept", "reject", "cancel"].includes(input.decision)) {
    return { ok: false, code: "invalid_input" };
  }

  const key = normalizeIdempotencyKey(input.idempotencyKey);
  const notes =
    typeof input.notes === "string" && input.notes.trim().length > 0
      ? input.notes.trim()
      : null;

  if (input.decision === "reject") {
    const rej =
      typeof input.rejectionReason === "string" ? input.rejectionReason.trim() : "";
    if (rej.length < 3) {
      return { ok: false, code: "invalid_input" };
    }
    return {
      ok: true,
      data: {
        p_idempotency_key: key,
        p_research_form_id: input.researchFormId.trim(),
        p_decision: "reject",
        p_quota_override_reason: null,
        p_rejection_reason: rej,
        p_notes: notes,
      },
    };
  }

  if (input.decision === "accept") {
    const quotaReason =
      typeof input.quotaOverrideReason === "string" &&
      input.quotaOverrideReason.trim().length > 0
        ? input.quotaOverrideReason.trim()
        : null;
    return {
      ok: true,
      data: {
        p_idempotency_key: key,
        p_research_form_id: input.researchFormId.trim(),
        p_decision: "accept",
        p_quota_override_reason: quotaReason,
        p_rejection_reason: null,
        p_notes: notes,
      },
    };
  }

  // cancel
  return {
    ok: true,
    data: {
      p_idempotency_key: key,
      p_research_form_id: input.researchFormId.trim(),
      p_decision: "cancel",
      p_quota_override_reason: null,
      p_rejection_reason: null,
      p_notes: notes,
    },
  };
}

export function parseCorrectAcceptedResearchFormInput(
  input: CorrectAcceptedResearchFormInput
): FormsResult<CorrectAcceptedResearchFormRpcArgs> {
  if (!input || typeof input !== "object") {
    return { ok: false, code: "invalid_input" };
  }
  if (!isValidUuid(input.researchFormId)) {
    return { ok: false, code: "invalid_input" };
  }
  if (!["rejected", "cancelled"].includes(input.targetStatus)) {
    return { ok: false, code: "invalid_input" };
  }

  const reason =
    typeof input.correctionReason === "string"
      ? input.correctionReason.trim()
      : "";
  if (reason.length < 3) {
    return { ok: false, code: "correction_reason_required" };
  }

  const key = normalizeIdempotencyKey(input.idempotencyKey);
  const notes =
    typeof input.notes === "string" && input.notes.trim().length > 0
      ? input.notes.trim()
      : null;

  return {
    ok: true,
    data: {
      p_idempotency_key: key,
      p_research_form_id: input.researchFormId.trim(),
      p_target_status: input.targetStatus,
      p_correction_reason: reason,
      p_notes: notes,
    },
  };
}
