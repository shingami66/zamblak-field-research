import type { ProjectErrorCode } from "./types";

/**
 * Tokens currently raised by installed Projects RPCs.
 * project_company_unavailable is intentionally excluded (reserved, not live).
 */
export const LIVE_PROJECT_ERROR_TOKENS: readonly Exclude<
  ProjectErrorCode,
  "unexpected_project_error" | "project_company_unavailable"
>[] = [
  "project_access_denied",
  "project_profile_unavailable",
  "invalid_project_id",
  "invalid_project_name",
  "invalid_project_domain",
  "invalid_project_status",
  "invalid_project_dates",
  "invalid_project_quota",
  "invalid_project_age_range",
  "invalid_project_resident_type",
  "invalid_project_pagination",
  "invalid_project_text_length",
  "invalid_company_id",
  "project_not_found",
  "project_company_not_found",
  "project_not_editable",
  "project_company_locked",
  "invalid_project_status_transition",
  "stale_project_version",
] as const;

/** Reserved application code not emitted by current SQL. */
export const RESERVED_PROJECT_ERROR_TOKENS = [
  "project_company_unavailable",
] as const satisfies readonly ProjectErrorCode[];

/**
 * Longest-token-first so prefixes such as invalid_project_status do not
 * swallow invalid_project_status_transition.
 */
const LIVE_PROJECT_ERROR_TOKENS_BY_LENGTH = [
  ...LIVE_PROJECT_ERROR_TOKENS,
].sort((a, b) => b.length - a.length);

/**
 * Maps PostgREST / Postgres exception text to stable Projects failure codes.
 * Never returns raw database messages, constraint names, or SQL details.
 */
export function mapProjectErrorMessage(
  message: string | undefined | null
): ProjectErrorCode {
  if (!message) {
    return "unexpected_project_error";
  }

  const normalized = message.toLowerCase();
  for (const token of LIVE_PROJECT_ERROR_TOKENS_BY_LENGTH) {
    if (normalized.includes(token)) {
      return token;
    }
  }

  return "unexpected_project_error";
}

/** Safe extraction from Supabase/PostgREST error-shaped objects. */
export function mapProjectRpcError(error: unknown): ProjectErrorCode {
  if (!error || typeof error !== "object") {
    return "unexpected_project_error";
  }

  const record = error as {
    message?: unknown;
    details?: unknown;
    hint?: unknown;
  };

  const candidates = [record.message, record.details, record.hint];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim() !== "") {
      const code = mapProjectErrorMessage(candidate);
      if (code !== "unexpected_project_error") {
        return code;
      }
    }
  }

  if (typeof record.message === "string") {
    return mapProjectErrorMessage(record.message);
  }

  return "unexpected_project_error";
}
