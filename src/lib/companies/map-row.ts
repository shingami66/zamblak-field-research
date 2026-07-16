import type {
  CompanyDetail,
  CompanyRpcRow,
  CompanySummary,
} from "./types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  return value;
}

function asUuid(value: unknown): string | null {
  const s = asNonEmptyString(value);
  if (!s || !UUID_RE.test(s)) {
    return null;
  }
  return s;
}

function asNullableString(value: unknown): string | null | undefined {
  if (value === null) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  return undefined;
}

function asIsoTimestamp(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") {
    // PostgREST may return timestamps as strings only for JSON.
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString();
    }
    return null;
  }
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) {
    return null;
  }
  return value;
}

function asNonNegativeInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }
  if (typeof value === "string" && /^(0|[1-9]\d*)$/.test(value)) {
    const n = Number(value);
    if (Number.isInteger(n) && n >= 0) {
      return n;
    }
  }
  return null;
}

/**
 * Strict mapper for Companies RPC rows (list/get/create/update share one shape).
 * Fails closed on missing/invalid required fields.
 */
export function mapCompanyRpcRow(row: unknown): CompanySummary | null {
  if (!row || typeof row !== "object") {
    return null;
  }

  const r = row as CompanyRpcRow;

  const companyId = asUuid(r.company_id);
  const accountId = asUuid(r.account_id);
  const name = asNonEmptyString(r.name);
  const contactPerson = asNullableString(r.contact_person);
  const phone = asNullableString(r.phone);
  const notes = asNullableString(r.notes);
  const createdBy =
    r.created_by === null ? null : asUuid(r.created_by);
  const updatedBy =
    r.updated_by === null ? null : asUuid(r.updated_by);
  const createdAt = asIsoTimestamp(r.created_at);
  const updatedAt = asIsoTimestamp(r.updated_at);
  const activeProjectsCount = asNonNegativeInt(r.active_projects_count);
  const completedProjectsCount = asNonNegativeInt(r.completed_projects_count);

  if (
    !companyId ||
    !accountId ||
    !name ||
    contactPerson === undefined ||
    phone === undefined ||
    notes === undefined ||
    createdBy === undefined ||
    updatedBy === undefined ||
    !createdAt ||
    !updatedAt ||
    activeProjectsCount === null ||
    completedProjectsCount === null
  ) {
    return null;
  }

  // created_by / updated_by must be uuid or null (not invalid strings)
  if (r.created_by !== null && createdBy === null) {
    return null;
  }
  if (r.updated_by !== null && updatedBy === null) {
    return null;
  }

  const mapped: CompanyDetail = {
    companyId,
    accountId,
    name,
    contactPerson,
    phone,
    notes,
    createdBy,
    updatedBy,
    createdAt,
    updatedAt,
    activeProjectsCount,
    completedProjectsCount,
  };

  return mapped;
}

export function mapCompanyRpcRows(data: unknown): CompanySummary[] | null {
  if (data === null || data === undefined) {
    return [];
  }
  if (Array.isArray(data)) {
    const out: CompanySummary[] = [];
    for (const row of data) {
      const mapped = mapCompanyRpcRow(row);
      if (!mapped) {
        return null;
      }
      out.push(mapped);
    }
    return out;
  }
  if (typeof data === "object") {
    const mapped = mapCompanyRpcRow(data);
    return mapped ? [mapped] : null;
  }
  return null;
}
