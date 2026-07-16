import { projectsCreateCopy } from "./create-copy";
import type { ProjectWriteInputRaw } from "./input";
import type { ProjectErrorCode } from "./types";

export type CreateProjectFieldKey =
  | "name"
  | "companyId"
  | "domain"
  | "startDate"
  | "endDate"
  | "quota"
  | "minAge"
  | "maxAge"
  | "requiredResidentType"
  | "eligibilityNotes"
  | "requiresThreeMonthWarning"
  | "whatsappTemplateAr"
  | "whatsappTemplateEn"
  | "notes";

/** Raw form values as strings/boolean (pre-parse). */
export type CreateProjectFormValues = {
  name: string;
  companyId: string;
  domain: string;
  startDate: string;
  endDate: string;
  quota: string;
  minAge: string;
  maxAge: string;
  requiredResidentType: string;
  eligibilityNotes: string;
  requiresThreeMonthWarning: boolean;
  whatsappTemplateAr: string;
  whatsappTemplateEn: string;
  notes: string;
};

export type CreateProjectFieldErrors = Partial<
  Record<CreateProjectFieldKey, string>
>;

export type CreateProjectActionState = {
  status: "idle" | "error";
  /** Stable code for tests; never raw SQL. */
  code: ProjectErrorCode | null;
  formError: string | null;
  fieldErrors: CreateProjectFieldErrors;
  values: CreateProjectFormValues;
  /**
   * Increments on every returned error so the client form can remount and
   * re-apply defaultValue/defaultChecked from the latest submitted values.
   * Uncontrolled controls ignore default* updates without remount.
   */
  revision: number;
};

export const EMPTY_CREATE_PROJECT_STATE: CreateProjectActionState = {
  status: "idle",
  code: null,
  formError: null,
  fieldErrors: {},
  revision: 0,
  values: {
    name: "",
    companyId: "",
    domain: "",
    startDate: "",
    endDate: "",
    quota: "",
    minAge: "",
    maxAge: "",
    requiredResidentType: "any",
    eligibilityNotes: "",
    requiresThreeMonthWarning: true,
    whatsappTemplateAr: "",
    whatsappTemplateEn: "",
    notes: "",
  },
};

export const CREATE_PROJECT_SUCCESS_REVALIDATE_PATH = "/projects";
export const CREATE_PROJECT_SUCCESS_REDIRECT_PATH = "/projects";

export function readCreateProjectFormValues(
  formData: FormData
): CreateProjectFormValues {
  return {
    name: readStringField(formData, "name"),
    companyId: readStringField(formData, "company_id"),
    domain: readStringField(formData, "domain"),
    startDate: readStringField(formData, "start_date"),
    endDate: readStringField(formData, "end_date"),
    quota: readStringField(formData, "quota"),
    minAge: readStringField(formData, "min_age"),
    maxAge: readStringField(formData, "max_age"),
    requiredResidentType: readStringField(formData, "required_resident_type"),
    eligibilityNotes: readStringField(formData, "eligibility_notes"),
    requiresThreeMonthWarning: readCheckboxField(
      formData,
      "requires_three_month_warning"
    ),
    whatsappTemplateAr: readStringField(formData, "whatsapp_template_ar"),
    whatsappTemplateEn: readStringField(formData, "whatsapp_template_en"),
    notes: readStringField(formData, "notes"),
  };
}

function readStringField(formData: FormData, key: string): string {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw : "";
}

/**
 * Checkbox: present and truthy → true; absent → false.
 * Form defaultChecked controls first paint; unchecked omit means false.
 */
export function readCheckboxField(formData: FormData, key: string): boolean {
  const raw = formData.get(key);
  if (raw === null || raw === undefined) {
    return false;
  }
  if (typeof raw !== "string") {
    return false;
  }
  const normalized = raw.trim().toLowerCase();
  return (
    normalized === "on" ||
    normalized === "true" ||
    normalized === "1" ||
    normalized === "yes"
  );
}

function parseOptionalIntField(
  raw: string
): { ok: true; value: number | null } | { ok: false } {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { ok: true, value: null };
  }
  if (!/^-?\d+$/.test(trimmed)) {
    return { ok: false };
  }
  const n = Number(trimmed);
  if (!Number.isInteger(n)) {
    return { ok: false };
  }
  return { ok: true, value: n };
}

/**
 * Maps raw form values into the create input shape for parseCreateProjectInput.
 * Invalid numeric strings surface as non-integer numbers rejected by the parser
 * or as explicit fail codes via temporary sentinel handling.
 */
export type FormValuesToCreateInputResult =
  | { ok: true; data: ProjectWriteInputRaw }
  | { ok: false; code: ProjectErrorCode };

export function formValuesToCreateInputRaw(
  values: CreateProjectFormValues
): FormValuesToCreateInputResult {
  const quota = parseOptionalIntField(values.quota);
  if (!quota.ok) {
    return { ok: false, code: "invalid_project_quota" };
  }
  const minAge = parseOptionalIntField(values.minAge);
  if (!minAge.ok) {
    return { ok: false, code: "invalid_project_age_range" };
  }
  const maxAge = parseOptionalIntField(values.maxAge);
  if (!maxAge.ok) {
    return { ok: false, code: "invalid_project_age_range" };
  }

  return {
    ok: true,
    data: {
      name: values.name,
      companyId: values.companyId === "" ? null : values.companyId,
      domain: values.domain === "" ? null : values.domain,
      startDate: values.startDate === "" ? null : values.startDate,
      endDate: values.endDate === "" ? null : values.endDate,
      quota: quota.value,
      minAge: minAge.value,
      maxAge: maxAge.value,
      requiredResidentType:
        values.requiredResidentType === ""
          ? "any"
          : values.requiredResidentType,
      eligibilityNotes: values.eligibilityNotes,
      requiresThreeMonthWarning: values.requiresThreeMonthWarning,
      whatsappTemplateAr: values.whatsappTemplateAr,
      whatsappTemplateEn: values.whatsappTemplateEn,
      notes: values.notes,
    },
  };
}

/**
 * Maps a stable Projects error code to form-level and/or field-level Arabic messages.
 * Never includes SQL, constraint names, or raw exception text.
 */
export function mapCreateProjectErrorPresentation(
  code: ProjectErrorCode,
  values: CreateProjectFormValues
): CreateProjectActionState {
  const fieldErrors: CreateProjectFieldErrors = {};
  let formError: string | null = null;

  switch (code) {
    case "invalid_project_name":
      fieldErrors.name = projectsCreateCopy.errorInvalidName;
      break;
    case "invalid_company_id":
      fieldErrors.companyId = projectsCreateCopy.errorInvalidCompany;
      break;
    case "invalid_project_domain":
      fieldErrors.domain = projectsCreateCopy.errorInvalidDomain;
      break;
    case "invalid_project_dates":
      fieldErrors.startDate = projectsCreateCopy.errorInvalidDates;
      fieldErrors.endDate = projectsCreateCopy.errorInvalidDates;
      break;
    case "invalid_project_quota":
      fieldErrors.quota = projectsCreateCopy.errorInvalidQuota;
      break;
    case "invalid_project_age_range":
      fieldErrors.minAge = projectsCreateCopy.errorInvalidAge;
      fieldErrors.maxAge = projectsCreateCopy.errorInvalidAge;
      break;
    case "invalid_project_resident_type":
      fieldErrors.requiredResidentType =
        projectsCreateCopy.errorInvalidResident;
      break;
    case "invalid_project_text_length":
      formError = projectsCreateCopy.errorInvalidText;
      break;
    case "project_company_not_found":
      formError = projectsCreateCopy.errorCompanyNotFound;
      fieldErrors.companyId = projectsCreateCopy.errorCompanyNotFound;
      break;
    case "project_access_denied":
      formError = projectsCreateCopy.errorAccess;
      break;
    case "project_profile_unavailable":
      formError = projectsCreateCopy.errorProfile;
      break;
    default:
      formError = projectsCreateCopy.errorUnexpected;
      break;
  }

  return {
    status: "error",
    code,
    formError,
    fieldErrors,
    values,
    revision: 0,
  };
}

/**
 * Attaches a monotonically increasing revision so the create form remounts
 * after each error and reapplies every returned field as the new default.
 * Does not alter validation rules or error copy.
 */
export function withCreateProjectFormRevision(
  state: CreateProjectActionState,
  prev: CreateProjectActionState
): CreateProjectActionState {
  return {
    ...state,
    revision: prev.revision + 1,
  };
}
