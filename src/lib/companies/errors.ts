import type { CompanyErrorCode } from "./types";

const COMPANY_ERROR_TOKENS: readonly Exclude<
  CompanyErrorCode,
  "unexpected_company_error"
>[] = [
  "duplicate_company_name",
  "invalid_company_phone",
  "invalid_company_name",
  "invalid_company_contact_person",
  "invalid_company_notes",
  "company_not_found",
  "company_access_denied",
  "invalid_pagination",
  "stale_company_version",
] as const;

/**
 * Maps PostgREST / Postgres exception text to stable Companies failure codes.
 * Never returns raw database messages, constraint names, or SQL details.
 */
export function mapCompanyErrorMessage(
  message: string | undefined | null
): CompanyErrorCode {
  if (!message) {
    return "unexpected_company_error";
  }

  const normalized = message.toLowerCase();
  for (const token of COMPANY_ERROR_TOKENS) {
    if (normalized.includes(token)) {
      return token;
    }
  }

  return "unexpected_company_error";
}

/** Safe extraction from Supabase/PostgREST error-shaped objects. */
export function mapCompanyRpcError(error: unknown): CompanyErrorCode {
  if (!error || typeof error !== "object") {
    return "unexpected_company_error";
  }

  const record = error as {
    message?: unknown;
    details?: unknown;
    hint?: unknown;
  };

  const candidates = [record.message, record.details, record.hint];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim() !== "") {
      const code = mapCompanyErrorMessage(candidate);
      if (code !== "unexpected_company_error") {
        return code;
      }
    }
  }

  if (typeof record.message === "string") {
    return mapCompanyErrorMessage(record.message);
  }

  return "unexpected_company_error";
}
