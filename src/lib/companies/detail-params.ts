const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ParseCompanyIdResult =
  | { ok: true; companyId: string }
  | { ok: false; reason: "invalid_uuid" };

/**
 * Validates route param for /companies/[id].
 * Invalid values must not trigger getCompany.
 */
export function parseCompanyIdParam(
  raw: string | string[] | undefined
): ParseCompanyIdResult {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string" || value.trim() === "") {
    return { ok: false, reason: "invalid_uuid" };
  }
  const id = value.trim();
  if (!UUID_RE.test(id)) {
    return { ok: false, reason: "invalid_uuid" };
  }
  return { ok: true, companyId: id };
}
