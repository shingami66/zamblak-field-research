import { isUuid } from "./input";

export type ParseRespondentDetailParamResult =
  | { ok: true; respondentId: string }
  | { ok: false; reason: "invalid_uuid" };

/**
 * Validates route param for /respondents/[respondentId].
 * Scalar UUID only — no array acceptance, no whitespace trim into validity.
 * Invalid values must not trigger createClient or getRespondent.
 */
export function parseRespondentDetailParam(
  raw: string | string[] | undefined
): ParseRespondentDetailParamResult {
  if (raw === undefined) {
    return { ok: false, reason: "invalid_uuid" };
  }
  if (Array.isArray(raw)) {
    return { ok: false, reason: "invalid_uuid" };
  }
  if (typeof raw !== "string") {
    return { ok: false, reason: "invalid_uuid" };
  }
  if (raw === "" || raw.trim() === "") {
    return { ok: false, reason: "invalid_uuid" };
  }
  // Reject leading/trailing whitespace without normalizing into a valid UUID.
  if (raw !== raw.trim()) {
    return { ok: false, reason: "invalid_uuid" };
  }
  if (!isUuid(raw)) {
    return { ok: false, reason: "invalid_uuid" };
  }
  return { ok: true, respondentId: raw };
}
