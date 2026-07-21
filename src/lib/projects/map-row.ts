import type {
  ProjectDetail,
  ProjectDetailRpcRow,
  ProjectDomain,
  ProjectListItem,
  ProjectListRpcRow,
  ProjectResidentType,
  ProjectStatus,
} from "./types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PROJECT_STATUSES = new Set<ProjectStatus>([
  "draft",
  "active",
  "closed",
  "cancelled",
]);

const PROJECT_RESIDENT_TYPES = new Set<ProjectResidentType>([
  "any",
  "saudi",
  "non_saudi",
  "unknown",
]);

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string" || value === "") {
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

/** Date-only YYYY-MM-DD, or full ISO date prefix, or null. */
function asDateOnly(value: unknown): string | null | undefined {
  if (value === null) {
    return null;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }
  const trimmed = value.trim();
  if (DATE_ONLY_RE.test(trimmed)) {
    const ms = Date.parse(`${trimmed}T00:00:00.000Z`);
    if (Number.isNaN(ms)) {
      return undefined;
    }
    return trimmed;
  }
  // PostgREST may return timestamptz-like strings for date columns in some paths.
  const ms = Date.parse(trimmed);
  if (Number.isNaN(ms)) {
    return undefined;
  }
  if (trimmed.length >= 10 && DATE_ONLY_RE.test(trimmed.slice(0, 10))) {
    return trimmed.slice(0, 10);
  }
  return undefined;
}

function asNullableNonNegativeInt(
  value: unknown
): number | null | undefined {
  if (value === null) {
    return null;
  }
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }
  if (typeof value === "string" && /^(0|[1-9]\d*)$/.test(value)) {
    const n = Number(value);
    if (Number.isInteger(n) && n >= 0) {
      return n;
    }
  }
  return undefined;
}

function asProjectStatus(value: unknown): ProjectStatus | null {
  if (typeof value !== "string" || !PROJECT_STATUSES.has(value as ProjectStatus)) {
    return null;
  }
  return value as ProjectStatus;
}

function asProjectDomain(value: unknown): ProjectDomain | null {
  if (
    typeof value !== "string" ||
    value.trim() === "" ||
    value.trim().length > 120
  ) {
    return null;
  }
  return value;
}

function asResidentType(value: unknown): ProjectResidentType | null {
  if (
    typeof value !== "string" ||
    !PROJECT_RESIDENT_TYPES.has(value as ProjectResidentType)
  ) {
    return null;
  }
  return value as ProjectResidentType;
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }
  return null;
}

/**
 * Strict mapper for list_projects rows (10 fields).
 * Fails closed on missing/invalid required fields.
 */
export function mapProjectListRpcRow(row: unknown): ProjectListItem | null {
  if (!row || typeof row !== "object") {
    return null;
  }

  const r = row as ProjectListRpcRow;

  const projectId = asUuid(r.project_id);
  const projectName = asNonEmptyString(r.project_name);
  const companyId = asUuid(r.company_id);
  const companyName = asNonEmptyString(r.company_name);
  const domain = asProjectDomain(r.domain);
  const status = asProjectStatus(r.status);
  const startDate = asDateOnly(r.start_date);
  const endDate = asDateOnly(r.end_date);
  const quota = asNullableNonNegativeInt(r.quota);
  const updatedAt = asIsoTimestamp(r.updated_at);

  if (
    !projectId ||
    !projectName ||
    !companyId ||
    !companyName ||
    !domain ||
    !status ||
    startDate === undefined ||
    endDate === undefined ||
    quota === undefined ||
    !updatedAt
  ) {
    return null;
  }

  return {
    projectId,
    projectName,
    companyId,
    companyName,
    domain,
    status,
    startDate,
    endDate,
    quota,
    updatedAt,
  };
}

export function mapProjectListRpcRows(
  data: unknown
): ProjectListItem[] | null {
  if (data === null || data === undefined) {
    return [];
  }
  if (Array.isArray(data)) {
    const out: ProjectListItem[] = [];
    for (const row of data) {
      const mapped = mapProjectListRpcRow(row);
      if (!mapped) {
        return null;
      }
      out.push(mapped);
    }
    return out;
  }
  if (typeof data === "object") {
    const mapped = mapProjectListRpcRow(data);
    return mapped ? [mapped] : null;
  }
  return null;
}

/**
 * Strict mapper for get/create/update/transition detail rows (19 fields).
 */
export function mapProjectDetailRpcRow(row: unknown): ProjectDetail | null {
  if (!row || typeof row !== "object") {
    return null;
  }

  const r = row as ProjectDetailRpcRow;

  const projectId = asUuid(r.project_id);
  const projectName = asNonEmptyString(r.project_name);
  const companyId = asUuid(r.company_id);
  const companyName = asNonEmptyString(r.company_name);
  const domain = asProjectDomain(r.domain);
  const status = asProjectStatus(r.status);
  const startDate = asDateOnly(r.start_date);
  const endDate = asDateOnly(r.end_date);
  const quota = asNullableNonNegativeInt(r.quota);
  const minAge = asNullableNonNegativeInt(r.min_age);
  const maxAge = asNullableNonNegativeInt(r.max_age);
  const requiredResidentType = asResidentType(r.required_resident_type);
  const eligibilityNotes = asNullableString(r.eligibility_notes);
  const requiresThreeMonthWarning = asBoolean(r.requires_three_month_warning);
  const whatsappTemplateAr = asNullableString(r.whatsapp_template_ar);
  const whatsappTemplateEn = asNullableString(r.whatsapp_template_en);
  const notes = asNullableString(r.notes);
  const createdAt = asIsoTimestamp(r.created_at);
  const updatedAt = asIsoTimestamp(r.updated_at);

  if (
    !projectId ||
    !projectName ||
    !companyId ||
    !companyName ||
    !domain ||
    !status ||
    startDate === undefined ||
    endDate === undefined ||
    quota === undefined ||
    minAge === undefined ||
    maxAge === undefined ||
    !requiredResidentType ||
    eligibilityNotes === undefined ||
    requiresThreeMonthWarning === null ||
    whatsappTemplateAr === undefined ||
    whatsappTemplateEn === undefined ||
    notes === undefined ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }

  return {
    projectId,
    projectName,
    companyId,
    companyName,
    domain,
    status,
    startDate,
    endDate,
    quota,
    minAge,
    maxAge,
    requiredResidentType,
    eligibilityNotes,
    requiresThreeMonthWarning,
    whatsappTemplateAr,
    whatsappTemplateEn,
    notes,
    createdAt,
    updatedAt,
  };
}

export function mapProjectDetailRpcRows(
  data: unknown
): ProjectDetail[] | null {
  if (data === null || data === undefined) {
    return [];
  }
  if (Array.isArray(data)) {
    const out: ProjectDetail[] = [];
    for (const row of data) {
      const mapped = mapProjectDetailRpcRow(row);
      if (!mapped) {
        return null;
      }
      out.push(mapped);
    }
    return out;
  }
  if (typeof data === "object") {
    const mapped = mapProjectDetailRpcRow(data);
    return mapped ? [mapped] : null;
  }
  return null;
}
