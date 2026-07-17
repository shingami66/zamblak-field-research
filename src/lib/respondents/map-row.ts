import type {
  RespondentDetail,
  RespondentDetailRpcRow,
  RespondentListItem,
  RespondentListRpcRow,
  RespondentResidentType,
} from "./types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const RESIDENT_TYPES: readonly RespondentResidentType[] = [
  "saudi",
  "non_saudi",
  "unknown",
] as const;

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

function asNullableInteger(value: unknown): number | null | undefined {
  if (value === null) {
    return null;
  }
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === "string" && /^-?(0|[1-9]\d*)$/.test(value)) {
    return Number(value);
  }
  return undefined;
}

function asResidentType(value: unknown): RespondentResidentType | null {
  if (typeof value !== "string") {
    return null;
  }
  if ((RESIDENT_TYPES as readonly string[]).includes(value)) {
    return value as RespondentResidentType;
  }
  return null;
}

function asCanonicalMobile(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  if (!/^9665\d{8}$/.test(value)) {
    return null;
  }
  return value;
}

/**
 * Strict mapper for list_respondents rows (no notes).
 * Fails closed on missing/invalid required fields.
 * Never exposes account_id, normalized_mobile, profile ids, or deleted_at.
 */
export function mapRespondentListRpcRow(
  row: unknown
): RespondentListItem | null {
  if (!row || typeof row !== "object") {
    return null;
  }

  const r = row as RespondentListRpcRow;

  const respondentId = asUuid(r.respondent_id);
  const name = asNullableString(r.name);
  const mobile = asCanonicalMobile(r.mobile);
  const age = asNullableInteger(r.age);
  const nationality = asNullableString(r.nationality);
  const residentType = asResidentType(r.resident_type);
  const createdAt = asIsoTimestamp(r.created_at);
  const updatedAt = asIsoTimestamp(r.updated_at);

  if (
    !respondentId ||
    name === undefined ||
    !mobile ||
    age === undefined ||
    nationality === undefined ||
    !residentType ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }

  return {
    respondentId,
    name,
    mobile,
    age,
    nationality,
    residentType,
    createdAt,
    updatedAt,
  };
}

/**
 * Strict mapper for get/create/update detail rows (includes notes).
 */
export function mapRespondentDetailRpcRow(
  row: unknown
): RespondentDetail | null {
  if (!row || typeof row !== "object") {
    return null;
  }

  const base = mapRespondentListRpcRow(row);
  if (!base) {
    return null;
  }

  const r = row as RespondentDetailRpcRow;
  const notes = asNullableString(r.notes);
  if (notes === undefined) {
    return null;
  }

  return {
    ...base,
    notes,
  };
}

/** Alias for detail mapping. */
export function mapRespondentRpcRow(row: unknown): RespondentDetail | null {
  return mapRespondentDetailRpcRow(row);
}

export function mapRespondentListRpcRows(
  data: unknown
): RespondentListItem[] | null {
  if (data === null || data === undefined) {
    return [];
  }
  if (Array.isArray(data)) {
    const out: RespondentListItem[] = [];
    for (const row of data) {
      const mapped = mapRespondentListRpcRow(row);
      if (!mapped) {
        return null;
      }
      out.push(mapped);
    }
    return out;
  }
  if (typeof data === "object") {
    const mapped = mapRespondentListRpcRow(data);
    return mapped ? [mapped] : null;
  }
  return null;
}

export function mapRespondentDetailRpcRows(
  data: unknown
): RespondentDetail[] | null {
  if (data === null || data === undefined) {
    return [];
  }
  if (Array.isArray(data)) {
    const out: RespondentDetail[] = [];
    for (const row of data) {
      const mapped = mapRespondentDetailRpcRow(row);
      if (!mapped) {
        return null;
      }
      out.push(mapped);
    }
    return out;
  }
  if (typeof data === "object") {
    const mapped = mapRespondentDetailRpcRow(data);
    return mapped ? [mapped] : null;
  }
  return null;
}

export function mapRespondentRpcRows(data: unknown): RespondentDetail[] | null {
  return mapRespondentDetailRpcRows(data);
}
