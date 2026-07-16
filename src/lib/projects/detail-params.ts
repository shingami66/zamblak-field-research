const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ParseProjectIdResult =
  | { ok: true; projectId: string }
  | { ok: false; reason: "invalid_uuid" };

/**
 * Validates route param for /projects/[projectId].
 * Invalid values must not trigger getProject.
 */
export function parseProjectIdParam(
  raw: string | string[] | undefined
): ParseProjectIdResult {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string" || value.trim() === "") {
    return { ok: false, reason: "invalid_uuid" };
  }
  const id = value.trim();
  if (!UUID_RE.test(id)) {
    return { ok: false, reason: "invalid_uuid" };
  }
  return { ok: true, projectId: id };
}
