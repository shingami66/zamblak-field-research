import type {
  CreateProjectInput,
  ProjectErrorCode,
  ProjectListParams,
  ProjectResidentType,
  ProjectResult,
  ProjectStatus,
  TransitionProjectStatusInput,
  UpdateProjectInput,
} from "./types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

export const PROJECT_LIST_DEFAULT_LIMIT = 25;
export const PROJECT_LIST_MAX_LIMIT = 50;
export const PROJECT_SEARCH_MAX_LENGTH = 120;
export const PROJECT_NAME_MAX_LENGTH = 120;
export const PROJECT_DOMAIN_MAX_LENGTH = 120;
export const PROJECT_LONG_TEXT_MAX_LENGTH = 2000;

export const PROJECT_STATUSES: readonly ProjectStatus[] = [
  "draft",
  "active",
  "closed",
  "cancelled",
] as const;

export const PROJECT_RESIDENT_TYPES: readonly ProjectResidentType[] = [
  "any",
  "saudi",
  "non_saudi",
  "unknown",
] as const;

/** Collapse internal whitespace and trim (matches RPC regexp_replace + btrim). */
export function collapseWhitespace(value: string): string {
  return value.replace(/[\s\u00a0]+/g, " ").trim();
}

function fail<T>(code: ProjectErrorCode): ProjectResult<T> {
  return { ok: false, code };
}

function isIsoTimestamp(value: string): boolean {
  if (!value || typeof value !== "string") {
    return false;
  }
  const ms = Date.parse(value);
  return !Number.isNaN(ms);
}

function isDateOnly(value: string): boolean {
  if (!DATE_ONLY_RE.test(value)) {
    return false;
  }
  const ms = Date.parse(`${value}T00:00:00.000Z`);
  if (Number.isNaN(ms)) {
    return false;
  }
  // Reject calendar-invalid dates that Date.parse may coerce (e.g. 2026-02-31).
  const iso = new Date(ms).toISOString().slice(0, 10);
  return iso === value;
}

function parseOptionalDate(
  raw: string | null | undefined,
  emptyAsNull: boolean
): ProjectResult<string | null> {
  if (raw === null || raw === undefined) {
    return { ok: true, data: null };
  }
  if (typeof raw !== "string") {
    return fail("invalid_project_dates");
  }
  const trimmed = raw.trim();
  if (trimmed === "") {
    return emptyAsNull
      ? { ok: true, data: null }
      : fail("invalid_project_dates");
  }
  if (!isDateOnly(trimmed)) {
    return fail("invalid_project_dates");
  }
  return { ok: true, data: trimmed };
}

function parseOptionalNonNegativeInt(
  raw: number | null | undefined,
  code: ProjectErrorCode
): ProjectResult<number | null> {
  if (raw === null || raw === undefined) {
    return { ok: true, data: null };
  }
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 0) {
    return fail(code);
  }
  return { ok: true, data: raw };
}

function parseOptionalLongText(
  raw: string | null | undefined
): ProjectResult<string | null> {
  if (raw === null || raw === undefined) {
    return { ok: true, data: null };
  }
  if (typeof raw !== "string") {
    return fail("invalid_project_text_length");
  }
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { ok: true, data: null };
  }
  if (trimmed.length > PROJECT_LONG_TEXT_MAX_LENGTH) {
    return fail("invalid_project_text_length");
  }
  return { ok: true, data: trimmed };
}

function isProjectStatus(value: string): value is ProjectStatus {
  return (PROJECT_STATUSES as readonly string[]).includes(value);
}

function isResidentType(value: string): value is ProjectResidentType {
  return (PROJECT_RESIDENT_TYPES as readonly string[]).includes(value);
}

export type ListProjectsInputRaw = {
  search?: string | null;
  companyId?: string | null;
  status?: string | null;
  limit?: number | null;
  offset?: number | null;
};

export function parseListProjectsInput(
  raw: ListProjectsInputRaw
): ProjectResult<ProjectListParams> {
  let search: string | null = null;
  if (raw.search !== null && raw.search !== undefined) {
    const trimmed = String(raw.search).trim();
    if (trimmed !== "") {
      if (trimmed.length > PROJECT_SEARCH_MAX_LENGTH) {
        return fail("invalid_project_text_length");
      }
      search = trimmed;
    }
  }

  let companyId: string | null = null;
  if (raw.companyId !== null && raw.companyId !== undefined) {
    const c = String(raw.companyId).trim();
    if (c !== "") {
      if (!UUID_RE.test(c)) {
        return fail("invalid_company_id");
      }
      companyId = c;
    }
  }

  let status: ProjectStatus | null = null;
  if (raw.status !== null && raw.status !== undefined) {
    const s = String(raw.status).trim();
    if (s !== "") {
      if (!isProjectStatus(s)) {
        return fail("invalid_project_status");
      }
      status = s;
    }
  }

  const limit =
    raw.limit === null || raw.limit === undefined
      ? PROJECT_LIST_DEFAULT_LIMIT
      : raw.limit;
  const offset =
    raw.offset === null || raw.offset === undefined ? 0 : raw.offset;

  if (
    typeof limit !== "number" ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > PROJECT_LIST_MAX_LIMIT
  ) {
    return fail("invalid_project_pagination");
  }

  if (typeof offset !== "number" || !Number.isInteger(offset) || offset < 0) {
    return fail("invalid_project_pagination");
  }

  return {
    ok: true,
    data: { search, companyId, status, limit, offset },
  };
}

export type GetProjectInputRaw = {
  projectId?: string | null;
};

export function parseGetProjectInput(
  raw: GetProjectInputRaw
): ProjectResult<{ projectId: string }> {
  if (
    raw.projectId === null ||
    raw.projectId === undefined ||
    typeof raw.projectId !== "string" ||
    !UUID_RE.test(raw.projectId)
  ) {
    return fail("invalid_project_id");
  }
  return { ok: true, data: { projectId: raw.projectId } };
}

export type ProjectWriteInputRaw = {
  name?: string | null;
  companyId?: string | null;
  domain?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  quota?: number | null;
  minAge?: number | null;
  maxAge?: number | null;
  requiredResidentType?: string | null;
  eligibilityNotes?: string | null;
  requiresThreeMonthWarning?: boolean | null;
  whatsappTemplateAr?: string | null;
  whatsappTemplateEn?: string | null;
  notes?: string | null;
};

function parseWriteFields(
  raw: ProjectWriteInputRaw
): ProjectResult<CreateProjectInput> {
  if (raw.name === null || raw.name === undefined) {
    return fail("invalid_project_name");
  }
  const name = collapseWhitespace(String(raw.name));
  if (name === "" || name.length > PROJECT_NAME_MAX_LENGTH) {
    return fail("invalid_project_name");
  }

  if (
    raw.companyId === null ||
    raw.companyId === undefined ||
    typeof raw.companyId !== "string" ||
    !UUID_RE.test(raw.companyId)
  ) {
    return fail("invalid_company_id");
  }

  if (raw.domain === null || raw.domain === undefined || typeof raw.domain !== "string") {
    return fail("invalid_project_domain");
  }
  const domain = raw.domain.trim();
  if (domain === "" || domain.length > PROJECT_DOMAIN_MAX_LENGTH) {
    return fail("invalid_project_domain");
  }

  const startDateResult = parseOptionalDate(raw.startDate, true);
  if (!startDateResult.ok) {
    return startDateResult;
  }
  const endDateResult = parseOptionalDate(raw.endDate, true);
  if (!endDateResult.ok) {
    return endDateResult;
  }
  if (
    startDateResult.data !== null &&
    endDateResult.data !== null &&
    endDateResult.data < startDateResult.data
  ) {
    return fail("invalid_project_dates");
  }

  const quotaResult = parseOptionalNonNegativeInt(
    raw.quota,
    "invalid_project_quota"
  );
  if (!quotaResult.ok) {
    return quotaResult;
  }

  const minAgeResult = parseOptionalNonNegativeInt(
    raw.minAge,
    "invalid_project_age_range"
  );
  if (!minAgeResult.ok) {
    return minAgeResult;
  }
  const maxAgeResult = parseOptionalNonNegativeInt(
    raw.maxAge,
    "invalid_project_age_range"
  );
  if (!maxAgeResult.ok) {
    return maxAgeResult;
  }
  if (
    minAgeResult.data !== null &&
    maxAgeResult.data !== null &&
    maxAgeResult.data < minAgeResult.data
  ) {
    return fail("invalid_project_age_range");
  }

  let requiredResidentType: ProjectResidentType = "any";
  if (
    raw.requiredResidentType !== null &&
    raw.requiredResidentType !== undefined
  ) {
    if (
      typeof raw.requiredResidentType !== "string" ||
      !isResidentType(raw.requiredResidentType)
    ) {
      return fail("invalid_project_resident_type");
    }
    requiredResidentType = raw.requiredResidentType;
  }

  const eligibilityResult = parseOptionalLongText(raw.eligibilityNotes);
  if (!eligibilityResult.ok) {
    return eligibilityResult;
  }
  const waArResult = parseOptionalLongText(raw.whatsappTemplateAr);
  if (!waArResult.ok) {
    return waArResult;
  }
  const waEnResult = parseOptionalLongText(raw.whatsappTemplateEn);
  if (!waEnResult.ok) {
    return waEnResult;
  }
  const notesResult = parseOptionalLongText(raw.notes);
  if (!notesResult.ok) {
    return notesResult;
  }

  let requiresThreeMonthWarning = true;
  if (
    raw.requiresThreeMonthWarning !== null &&
    raw.requiresThreeMonthWarning !== undefined
  ) {
    if (typeof raw.requiresThreeMonthWarning !== "boolean") {
      return fail("unexpected_project_error");
    }
    requiresThreeMonthWarning = raw.requiresThreeMonthWarning;
  }

  return {
    ok: true,
    data: {
      name,
      companyId: raw.companyId,
      domain,
      startDate: startDateResult.data,
      endDate: endDateResult.data,
      quota: quotaResult.data,
      minAge: minAgeResult.data,
      maxAge: maxAgeResult.data,
      requiredResidentType,
      eligibilityNotes: eligibilityResult.data,
      requiresThreeMonthWarning,
      whatsappTemplateAr: waArResult.data,
      whatsappTemplateEn: waEnResult.data,
      notes: notesResult.data,
    },
  };
}

export function parseCreateProjectInput(
  raw: ProjectWriteInputRaw
): ProjectResult<CreateProjectInput> {
  return parseWriteFields(raw);
}

export type UpdateProjectInputRaw = ProjectWriteInputRaw & {
  projectId?: string | null;
  expectedUpdatedAt?: string | null;
};

export function parseUpdateProjectInput(
  raw: UpdateProjectInputRaw
): ProjectResult<UpdateProjectInput> {
  if (
    raw.projectId === null ||
    raw.projectId === undefined ||
    typeof raw.projectId !== "string" ||
    !UUID_RE.test(raw.projectId)
  ) {
    return fail("invalid_project_id");
  }

  if (
    raw.expectedUpdatedAt === null ||
    raw.expectedUpdatedAt === undefined ||
    typeof raw.expectedUpdatedAt !== "string" ||
    raw.expectedUpdatedAt.trim() === "" ||
    !isIsoTimestamp(raw.expectedUpdatedAt)
  ) {
    return fail("stale_project_version");
  }

  const fields = parseWriteFields(raw);
  if (!fields.ok) {
    return fields;
  }

  return {
    ok: true,
    data: {
      projectId: raw.projectId,
      expectedUpdatedAt: raw.expectedUpdatedAt,
      ...fields.data,
    },
  };
}

export type TransitionProjectStatusInputRaw = {
  projectId?: string | null;
  expectedUpdatedAt?: string | null;
  targetStatus?: string | null;
};

export function parseTransitionProjectStatusInput(
  raw: TransitionProjectStatusInputRaw
): ProjectResult<TransitionProjectStatusInput> {
  if (
    raw.projectId === null ||
    raw.projectId === undefined ||
    typeof raw.projectId !== "string" ||
    !UUID_RE.test(raw.projectId)
  ) {
    return fail("invalid_project_id");
  }

  if (
    raw.expectedUpdatedAt === null ||
    raw.expectedUpdatedAt === undefined ||
    typeof raw.expectedUpdatedAt !== "string" ||
    raw.expectedUpdatedAt.trim() === "" ||
    !isIsoTimestamp(raw.expectedUpdatedAt)
  ) {
    return fail("stale_project_version");
  }

  if (
    raw.targetStatus === null ||
    raw.targetStatus === undefined ||
    typeof raw.targetStatus !== "string" ||
    !isProjectStatus(raw.targetStatus)
  ) {
    return fail("invalid_project_status");
  }

  return {
    ok: true,
    data: {
      projectId: raw.projectId,
      expectedUpdatedAt: raw.expectedUpdatedAt,
      targetStatus: raw.targetStatus,
    },
  };
}

/** Exact RPC argument object for list_projects. */
export function buildListProjectsRpcArgs(params: ProjectListParams): {
  p_search: string | null;
  p_company_id: string | null;
  p_status: string | null;
  p_limit: number;
  p_offset: number;
} {
  return {
    p_search: params.search,
    p_company_id: params.companyId,
    p_status: params.status,
    p_limit: params.limit,
    p_offset: params.offset,
  };
}

/** Exact RPC argument object for create_project (no status/account/audit). */
export function buildCreateProjectRpcArgs(input: CreateProjectInput): {
  p_name: string;
  p_company_id: string;
  p_domain: string;
  p_start_date: string | null;
  p_end_date: string | null;
  p_quota: number | null;
  p_min_age: number | null;
  p_max_age: number | null;
  p_required_resident_type: string;
  p_eligibility_notes: string | null;
  p_requires_three_month_warning: boolean;
  p_whatsapp_template_ar: string | null;
  p_whatsapp_template_en: string | null;
  p_notes: string | null;
} {
  return {
    p_name: input.name,
    p_company_id: input.companyId,
    p_domain: input.domain,
    p_start_date: input.startDate,
    p_end_date: input.endDate,
    p_quota: input.quota,
    p_min_age: input.minAge,
    p_max_age: input.maxAge,
    p_required_resident_type: input.requiredResidentType,
    p_eligibility_notes: input.eligibilityNotes,
    p_requires_three_month_warning: input.requiresThreeMonthWarning,
    p_whatsapp_template_ar: input.whatsappTemplateAr,
    p_whatsapp_template_en: input.whatsappTemplateEn,
    p_notes: input.notes,
  };
}

/** Exact RPC argument object for update_project (required expected timestamp). */
export function buildUpdateProjectRpcArgs(input: UpdateProjectInput): {
  p_project_id: string;
  p_expected_updated_at: string;
  p_name: string;
  p_company_id: string;
  p_domain: string;
  p_start_date: string | null;
  p_end_date: string | null;
  p_quota: number | null;
  p_min_age: number | null;
  p_max_age: number | null;
  p_required_resident_type: string;
  p_eligibility_notes: string | null;
  p_requires_three_month_warning: boolean;
  p_whatsapp_template_ar: string | null;
  p_whatsapp_template_en: string | null;
  p_notes: string | null;
} {
  return {
    p_project_id: input.projectId,
    p_expected_updated_at: input.expectedUpdatedAt,
    p_name: input.name,
    p_company_id: input.companyId,
    p_domain: input.domain,
    p_start_date: input.startDate,
    p_end_date: input.endDate,
    p_quota: input.quota,
    p_min_age: input.minAge,
    p_max_age: input.maxAge,
    p_required_resident_type: input.requiredResidentType,
    p_eligibility_notes: input.eligibilityNotes,
    p_requires_three_month_warning: input.requiresThreeMonthWarning,
    p_whatsapp_template_ar: input.whatsappTemplateAr,
    p_whatsapp_template_en: input.whatsappTemplateEn,
    p_notes: input.notes,
  };
}

/** Exact RPC argument object for transition_project_status. */
export function buildTransitionProjectStatusRpcArgs(
  input: TransitionProjectStatusInput
): {
  p_project_id: string;
  p_expected_updated_at: string;
  p_target_status: string;
} {
  return {
    p_project_id: input.projectId,
    p_expected_updated_at: input.expectedUpdatedAt,
    p_target_status: input.targetStatus,
  };
}
