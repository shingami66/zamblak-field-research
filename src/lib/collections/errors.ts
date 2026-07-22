import type { CollectionsErrorCode } from "./types";

const COLLECTIONS_ERROR_TOKENS: readonly Exclude<
  CollectionsErrorCode,
  "unexpected_collections_error"
>[] = [
  "unauthorized",
  "forbidden",
  "invalid_input",
  "parent_not_found",
  "collection_not_found",
  "collection_not_active",
  "collection_amount_invalid",
  "allocation_total_exceeds_collection",
  "allocation_target_invalid",
  "allocation_exceeds_form_balance",
  "allocation_revision_conflict",
  "collection_void_reason_required",
  "replacement_target_invalid",
  "idempotency_key_invalid",
  "idempotency_request_conflict",
  "idempotency_processing_conflict",
] as const;

export function mapCollectionsRpcError(error: unknown): CollectionsErrorCode {
  if (!error || typeof error !== "object") {
    return "unexpected_collections_error";
  }

  const record = error as { message?: unknown; details?: unknown; hint?: unknown };
  for (const candidate of [record.message, record.details, record.hint]) {
    if (typeof candidate === "string") {
      const normalized = candidate.toLowerCase();
      const match = COLLECTIONS_ERROR_TOKENS.find((token) =>
        normalized.includes(token)
      );
      if (match) return match;
    }
  }

  return "unexpected_collections_error";
}
