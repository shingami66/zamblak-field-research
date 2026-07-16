import type {
  CompanyErrorCode,
  CompanyListParams,
  CompanyResult,
  CreateCompanyInput,
  UpdateCompanyInput,
} from "./types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const COMPANY_LIST_DEFAULT_LIMIT = 25;
export const COMPANY_LIST_MAX_LIMIT = 50;
export const COMPANY_SEARCH_MAX_LENGTH = 120;
export const COMPANY_NAME_MAX_LENGTH = 120;
export const COMPANY_CONTACT_MAX_LENGTH = 80;
export const COMPANY_NOTES_MAX_LENGTH = 2000;

/** Collapse internal whitespace and trim (display name rule). */
export function collapseWhitespace(value: string): string {
  return value.replace(/[\s\u00a0]+/g, " ").trim();
}

function fail<T>(code: CompanyErrorCode): CompanyResult<T> {
  return { ok: false, code };
}

function isIsoTimestamp(value: string): boolean {
  if (!value || typeof value !== "string") {
    return false;
  }
  const ms = Date.parse(value);
  return !Number.isNaN(ms);
}

/**
 * Early phone validation aligned with DB normalize_company_phone.
 * DB remains authoritative; this rejects obviously invalid client input.
 */
export function normalizePhoneInput(
  raw: string | null | undefined
): CompanyResult<string | null> {
  if (raw === null || raw === undefined) {
    return { ok: true, data: null };
  }
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { ok: true, data: null };
  }

  let digits = trimmed.replace(/[\s+\-()]/g, "");
  if (!/^\d+$/.test(digits)) {
    return fail("invalid_company_phone");
  }

  if (/^05\d{8}$/.test(digits)) {
    digits = `9665${digits.slice(2)}`;
  }

  if (digits.length < 8 || digits.length > 15) {
    return fail("invalid_company_phone");
  }

  return { ok: true, data: digits };
}

export type ListCompaniesInputRaw = {
  search?: string | null;
  limit?: number | null;
  offset?: number | null;
};

export function parseListCompaniesInput(
  raw: ListCompaniesInputRaw
): CompanyResult<CompanyListParams> {
  let search: string | null = null;
  if (raw.search !== null && raw.search !== undefined) {
    const trimmed = raw.search.trim();
    if (trimmed !== "") {
      if (trimmed.length > COMPANY_SEARCH_MAX_LENGTH) {
        return fail("invalid_pagination");
      }
      search = trimmed;
    }
  }

  const limit =
    raw.limit === null || raw.limit === undefined
      ? COMPANY_LIST_DEFAULT_LIMIT
      : raw.limit;
  const offset =
    raw.offset === null || raw.offset === undefined ? 0 : raw.offset;

  if (
    typeof limit !== "number" ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > COMPANY_LIST_MAX_LIMIT
  ) {
    return fail("invalid_pagination");
  }

  if (typeof offset !== "number" || !Number.isInteger(offset) || offset < 0) {
    return fail("invalid_pagination");
  }

  return { ok: true, data: { search, limit, offset } };
}

export type CompanyWriteInputRaw = {
  name?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  notes?: string | null;
};

function parseWriteFields(
  raw: CompanyWriteInputRaw
): CompanyResult<CreateCompanyInput> {
  if (raw.name === null || raw.name === undefined) {
    return fail("invalid_company_name");
  }
  const name = collapseWhitespace(String(raw.name));
  if (name === "" || name.length > COMPANY_NAME_MAX_LENGTH) {
    return fail("invalid_company_name");
  }

  let contactPerson: string | null = null;
  if (raw.contactPerson !== null && raw.contactPerson !== undefined) {
    const c = String(raw.contactPerson).trim();
    if (c !== "") {
      if (c.length > COMPANY_CONTACT_MAX_LENGTH) {
        return fail("invalid_company_contact_person");
      }
      contactPerson = c;
    }
  }

  const phoneResult = normalizePhoneInput(
    raw.phone === undefined ? null : raw.phone
  );
  if (!phoneResult.ok) {
    return phoneResult;
  }

  let notes: string | null = null;
  if (raw.notes !== null && raw.notes !== undefined) {
    const n = String(raw.notes).trim();
    if (n !== "") {
      if (n.length > COMPANY_NOTES_MAX_LENGTH) {
        return fail("invalid_company_notes");
      }
      notes = n;
    }
  }

  return {
    ok: true,
    data: {
      name,
      contactPerson,
      phone: phoneResult.data,
      notes,
    },
  };
}

export function parseCreateCompanyInput(
  raw: CompanyWriteInputRaw
): CompanyResult<CreateCompanyInput> {
  return parseWriteFields(raw);
}

export type UpdateCompanyInputRaw = CompanyWriteInputRaw & {
  companyId?: string | null;
  expectedUpdatedAt?: string | null;
};

export function parseUpdateCompanyInput(
  raw: UpdateCompanyInputRaw
): CompanyResult<UpdateCompanyInput> {
  if (
    raw.companyId === null ||
    raw.companyId === undefined ||
    typeof raw.companyId !== "string" ||
    !UUID_RE.test(raw.companyId)
  ) {
    return fail("company_not_found");
  }

  if (
    raw.expectedUpdatedAt === null ||
    raw.expectedUpdatedAt === undefined ||
    typeof raw.expectedUpdatedAt !== "string" ||
    raw.expectedUpdatedAt.trim() === "" ||
    !isIsoTimestamp(raw.expectedUpdatedAt)
  ) {
    return fail("stale_company_version");
  }

  const fields = parseWriteFields(raw);
  if (!fields.ok) {
    return fields;
  }

  return {
    ok: true,
    data: {
      companyId: raw.companyId,
      expectedUpdatedAt: raw.expectedUpdatedAt,
      ...fields.data,
    },
  };
}

/** Exact RPC argument object for list_companies. */
export function buildListCompaniesRpcArgs(params: CompanyListParams): {
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

/** Exact RPC argument object for create_company. */
export function buildCreateCompanyRpcArgs(input: CreateCompanyInput): {
  p_name: string;
  p_contact_person: string | null;
  p_phone: string | null;
  p_notes: string | null;
} {
  return {
    p_name: input.name,
    p_contact_person: input.contactPerson,
    p_phone: input.phone,
    p_notes: input.notes,
  };
}

/**
 * Exact RPC argument object for update_company.
 * Parameter order matches corrected PostgreSQL signature
 * (required p_expected_updated_at before optional fields).
 */
export function buildUpdateCompanyRpcArgs(input: UpdateCompanyInput): {
  p_company_id: string;
  p_name: string;
  p_expected_updated_at: string;
  p_contact_person: string | null;
  p_phone: string | null;
  p_notes: string | null;
} {
  return {
    p_company_id: input.companyId,
    p_name: input.name,
    p_expected_updated_at: input.expectedUpdatedAt,
    p_contact_person: input.contactPerson,
    p_phone: input.phone,
    p_notes: input.notes,
  };
}
