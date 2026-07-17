import type {
  CreateRespondentInput,
  RespondentErrorCode,
  RespondentListParams,
  RespondentResidentType,
  RespondentResult,
  UpdateRespondentInput,
} from "./types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const RESPONDENT_LIST_DEFAULT_LIMIT = 25;
export const RESPONDENT_LIST_MAX_LIMIT = 50;
export const RESPONDENT_SEARCH_MAX_LENGTH = 120;
export const RESPONDENT_NAME_MAX_LENGTH = 120;
export const RESPONDENT_NATIONALITY_MAX_LENGTH = 80;
export const RESPONDENT_NOTES_MAX_LENGTH = 2000;
export const RESPONDENT_AGE_MAX = 120;

const RESIDENT_TYPES: readonly RespondentResidentType[] = [
  "saudi",
  "non_saudi",
  "unknown",
] as const;

/** Collapse internal whitespace and trim (name/nationality/notes rule). */
export function collapseWhitespace(value: string): string {
  return value.replace(/[\s\u00a0]+/g, " ").trim();
}

function fail<T>(code: RespondentErrorCode): RespondentResult<T> {
  return { ok: false, code };
}

function isGregorianLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  switch (month) {
    case 1:
    case 3:
    case 5:
    case 7:
    case 8:
    case 10:
    case 12:
      return 31;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    case 2:
      return isGregorianLeapYear(year) ? 29 : 28;
    default:
      return 0;
  }
}

/**
 * Bounded ISO 8601 datetime with required timezone (Z or ±HH:MM).
 * Explicit calendar and wall-clock validation before Date.parse.
 * Does not reformat; callers must pass the original string through unchanged.
 */
function isIsoTimestamp(value: string): boolean {
  if (!value || typeof value !== "string") {
    return false;
  }

  // YYYY-MM-DDTHH:MM:SS[.fraction](Z|±HH:MM)
  const ISO_TZ_RE =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
  const match = ISO_TZ_RE.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);

  if (!Number.isInteger(year) || year < 1 || year > 9999) {
    return false;
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return false;
  }
  if (!Number.isInteger(day) || day < 1 || day > daysInMonth(year, month)) {
    return false;
  }
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    return false;
  }
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
    return false;
  }
  if (!Number.isInteger(second) || second < 0 || second > 59) {
    return false;
  }

  const ms = Date.parse(value);
  return Number.isFinite(ms);
}

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/**
 * Early mobile normalization aligned with public.normalize_respondent_mobile.
 * DB remains final authority; application never calls the internal SQL helper.
 * Canonical output: 9665xxxxxxxx
 */
export function normalizeRespondentMobileInput(
  raw: string | null | undefined
): RespondentResult<string> {
  if (raw === null || raw === undefined) {
    return fail("invalid_respondent_mobile");
  }
  if (typeof raw !== "string") {
    return fail("invalid_respondent_mobile");
  }

  const trimmed = raw.trim();
  if (trimmed === "") {
    return fail("invalid_respondent_mobile");
  }

  // Strip only spaces, +, -, (, ) — same set as the SQL helper.
  let digits = trimmed.replace(/[\s+\-()]/g, "");
  if (!/^\d+$/.test(digits)) {
    return fail("invalid_respondent_mobile");
  }

  if (/^05\d{8}$/.test(digits)) {
    digits = `966${digits.slice(1)}`;
  } else if (/^5\d{8}$/.test(digits)) {
    digits = `966${digits}`;
  } else if (/^9665\d{8}$/.test(digits)) {
    // already canonical
  } else {
    return fail("invalid_respondent_mobile");
  }

  if (!/^9665\d{8}$/.test(digits)) {
    return fail("invalid_respondent_mobile");
  }

  return { ok: true, data: digits };
}

export type ListRespondentsInputRaw = {
  search?: string | null;
  limit?: number | null;
  offset?: number | null;
};

export function parseListRespondentsInput(
  raw: ListRespondentsInputRaw
): RespondentResult<RespondentListParams> {
  let search: string | null = null;
  if (raw.search !== null && raw.search !== undefined) {
    const trimmed = String(raw.search).trim();
    if (trimmed !== "") {
      if (trimmed.length > RESPONDENT_SEARCH_MAX_LENGTH) {
        return fail("invalid_pagination");
      }
      search = trimmed;
    }
  }

  const limit =
    raw.limit === null || raw.limit === undefined
      ? RESPONDENT_LIST_DEFAULT_LIMIT
      : raw.limit;
  const offset =
    raw.offset === null || raw.offset === undefined ? 0 : raw.offset;

  if (
    typeof limit !== "number" ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > RESPONDENT_LIST_MAX_LIMIT
  ) {
    return fail("invalid_pagination");
  }

  if (typeof offset !== "number" || !Number.isInteger(offset) || offset < 0) {
    return fail("invalid_pagination");
  }

  return { ok: true, data: { search, limit, offset } };
}

export type RespondentWriteInputRaw = {
  mobile?: string | null;
  name?: string | null;
  age?: number | null;
  nationality?: string | null;
  residentType?: string | null;
  notes?: string | null;
};

function parseOptionalName(
  raw: string | null | undefined
): RespondentResult<string | null> {
  if (raw === null || raw === undefined) {
    return { ok: true, data: null };
  }
  const name = collapseWhitespace(String(raw));
  if (name === "") {
    return { ok: true, data: null };
  }
  if (name.length > RESPONDENT_NAME_MAX_LENGTH) {
    return fail("invalid_respondent_name");
  }
  return { ok: true, data: name };
}

function parseOptionalAge(
  raw: number | null | undefined
): RespondentResult<number | null> {
  if (raw === null || raw === undefined) {
    return { ok: true, data: null };
  }
  if (typeof raw !== "number" || !Number.isInteger(raw)) {
    return fail("invalid_respondent_age");
  }
  if (raw < 0 || raw > RESPONDENT_AGE_MAX) {
    return fail("invalid_respondent_age");
  }
  return { ok: true, data: raw };
}

function parseOptionalNationality(
  raw: string | null | undefined
): RespondentResult<string | null> {
  if (raw === null || raw === undefined) {
    return { ok: true, data: null };
  }
  const value = collapseWhitespace(String(raw));
  if (value === "") {
    return { ok: true, data: null };
  }
  if (value.length > RESPONDENT_NATIONALITY_MAX_LENGTH) {
    return fail("invalid_respondent_nationality");
  }
  return { ok: true, data: value };
}

function parseResidentType(
  raw: string | null | undefined
): RespondentResult<RespondentResidentType> {
  if (raw === null || raw === undefined) {
    return { ok: true, data: "unknown" };
  }
  const value = String(raw);
  if ((RESIDENT_TYPES as readonly string[]).includes(value)) {
    return { ok: true, data: value as RespondentResidentType };
  }
  return fail("invalid_respondent_resident_type");
}

function parseOptionalNotes(
  raw: string | null | undefined
): RespondentResult<string | null> {
  if (raw === null || raw === undefined) {
    return { ok: true, data: null };
  }
  const value = collapseWhitespace(String(raw));
  if (value === "") {
    return { ok: true, data: null };
  }
  if (value.length > RESPONDENT_NOTES_MAX_LENGTH) {
    return fail("invalid_respondent_notes");
  }
  return { ok: true, data: value };
}

function parseWriteFields(
  raw: RespondentWriteInputRaw
): RespondentResult<CreateRespondentInput> {
  const mobileResult = normalizeRespondentMobileInput(
    raw.mobile === undefined ? null : raw.mobile
  );
  if (!mobileResult.ok) {
    return mobileResult;
  }

  const nameResult = parseOptionalName(raw.name);
  if (!nameResult.ok) {
    return nameResult;
  }

  const ageResult = parseOptionalAge(raw.age);
  if (!ageResult.ok) {
    return ageResult;
  }

  const nationalityResult = parseOptionalNationality(raw.nationality);
  if (!nationalityResult.ok) {
    return nationalityResult;
  }

  const residentResult = parseResidentType(raw.residentType);
  if (!residentResult.ok) {
    return residentResult;
  }

  const notesResult = parseOptionalNotes(raw.notes);
  if (!notesResult.ok) {
    return notesResult;
  }

  return {
    ok: true,
    data: {
      mobile: mobileResult.data,
      name: nameResult.data,
      age: ageResult.data,
      nationality: nationalityResult.data,
      residentType: residentResult.data,
      notes: notesResult.data,
    },
  };
}

export function parseCreateRespondentInput(
  raw: RespondentWriteInputRaw
): RespondentResult<CreateRespondentInput> {
  return parseWriteFields(raw);
}

export type UpdateRespondentInputRaw = RespondentWriteInputRaw & {
  respondentId?: string | null;
  expectedUpdatedAt?: string | null;
};

export function parseUpdateRespondentInput(
  raw: UpdateRespondentInputRaw
): RespondentResult<UpdateRespondentInput> {
  if (
    raw.respondentId === null ||
    raw.respondentId === undefined ||
    typeof raw.respondentId !== "string" ||
    !isUuid(raw.respondentId)
  ) {
    return fail("respondent_not_found");
  }

  if (
    raw.expectedUpdatedAt === null ||
    raw.expectedUpdatedAt === undefined ||
    typeof raw.expectedUpdatedAt !== "string" ||
    raw.expectedUpdatedAt.trim() === "" ||
    !isIsoTimestamp(raw.expectedUpdatedAt)
  ) {
    return fail("stale_respondent_version");
  }

  const fields = parseWriteFields(raw);
  if (!fields.ok) {
    return fields;
  }

  return {
    ok: true,
    data: {
      respondentId: raw.respondentId,
      expectedUpdatedAt: raw.expectedUpdatedAt,
      ...fields.data,
    },
  };
}

export function parseRespondentId(
  respondentId: string | null | undefined
): RespondentResult<string> {
  if (
    respondentId === null ||
    respondentId === undefined ||
    typeof respondentId !== "string" ||
    !isUuid(respondentId)
  ) {
    return fail("respondent_not_found");
  }
  return { ok: true, data: respondentId };
}

/** Exact RPC argument object for list_respondents. */
export function buildListRespondentsRpcArgs(params: RespondentListParams): {
  p_search: string | null;
  p_limit: number;
  p_offset: number;
} {
  return {
    p_search: params.search,
    p_limit: params.limit,
    p_offset: params.offset,
  };
}

/** Exact RPC argument object for create_respondent. */
export function buildCreateRespondentRpcArgs(input: CreateRespondentInput): {
  p_mobile: string;
  p_name: string | null;
  p_age: number | null;
  p_nationality: string | null;
  p_resident_type: string;
  p_notes: string | null;
} {
  return {
    p_mobile: input.mobile,
    p_name: input.name,
    p_age: input.age,
    p_nationality: input.nationality,
    p_resident_type: input.residentType,
    p_notes: input.notes,
  };
}

/**
 * Exact RPC argument object for update_respondent.
 * Parameter names match PostgreSQL signature (required concurrency token before optionals).
 */
export function buildUpdateRespondentRpcArgs(input: UpdateRespondentInput): {
  p_respondent_id: string;
  p_mobile: string;
  p_expected_updated_at: string;
  p_name: string | null;
  p_age: number | null;
  p_nationality: string | null;
  p_resident_type: string;
  p_notes: string | null;
} {
  return {
    p_respondent_id: input.respondentId,
    p_mobile: input.mobile,
    p_expected_updated_at: input.expectedUpdatedAt,
    p_name: input.name,
    p_age: input.age,
    p_nationality: input.nationality,
    p_resident_type: input.residentType,
    p_notes: input.notes,
  };
}
