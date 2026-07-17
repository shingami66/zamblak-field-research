import type { RespondentErrorCode } from "./types";

/**
 * Live error tokens emitted by the four Respondent RPCs and mobile helper path.
 * Ordered longest-first so prefix collisions resolve to the most specific token.
 */
export const LIVE_RESPONDENT_ERROR_TOKENS: readonly Exclude<
  RespondentErrorCode,
  "unexpected_respondent_error"
>[] = [
  "invalid_respondent_resident_type",
  "invalid_respondent_nationality",
  "duplicate_respondent_mobile",
  "invalid_respondent_mobile",
  "invalid_respondent_notes",
  "respondent_access_denied",
  "stale_respondent_version",
  "invalid_respondent_name",
  "invalid_respondent_age",
  "respondent_not_found",
  "invalid_pagination",
] as const;

/**
 * Maps PostgREST / Postgres exception text to stable Respondent failure codes.
 * Never returns raw database messages, constraint names, or SQL details.
 */
export function mapRespondentErrorMessage(
  message: string | undefined | null
): RespondentErrorCode {
  if (!message) {
    return "unexpected_respondent_error";
  }

  const normalized = message.toLowerCase();
  for (const token of LIVE_RESPONDENT_ERROR_TOKENS) {
    if (normalized.includes(token)) {
      return token;
    }
  }

  return "unexpected_respondent_error";
}

/** Safe extraction from Supabase/PostgREST error-shaped objects. */
export function mapRespondentRpcError(error: unknown): RespondentErrorCode {
  if (!error || typeof error !== "object") {
    return "unexpected_respondent_error";
  }

  const record = error as {
    message?: unknown;
    details?: unknown;
    hint?: unknown;
  };

  const candidates = [record.message, record.details, record.hint];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim() !== "") {
      const code = mapRespondentErrorMessage(candidate);
      if (code !== "unexpected_respondent_error") {
        return code;
      }
    }
  }

  if (typeof record.message === "string") {
    return mapRespondentErrorMessage(record.message);
  }

  return "unexpected_respondent_error";
}
