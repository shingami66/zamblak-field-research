import { readCheckboxField } from "./create-form";
import { projectsEditCopy } from "./edit-copy";
import type { ProjectWriteInputRaw } from "./input";
import type {
  ProjectDetail,
  ProjectErrorCode,
  ProjectStatus,
} from "./types";

export type EditProjectFieldKey =
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

export type EditProjectFormValues = {
  projectId: string;
  /** Authoritative concurrency token from loaded record. */
  expectedUpdatedAt: string;
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

export type EditProjectFieldErrors = Partial<
  Record<EditProjectFieldKey, string>
>;

export type EditProjectActionState = {
  status: "idle" | "error";
  code: ProjectErrorCode | null;
  formError: string | null;
  fieldErrors: EditProjectFieldErrors;
  values: EditProjectFormValues;
  /** When true, UI should offer reload of the edit route. */
  showReload: boolean;
};

export function initialEditProjectState(
  project: ProjectDetail
): EditProjectActionState {
  return {
    status: "idle",
    code: null,
    formError: null,
    fieldErrors: {},
    values: {
      projectId: project.projectId,
      expectedUpdatedAt: project.updatedAt,
      name: project.projectName,
      companyId: project.companyId,
      domain: project.domain,
      startDate: project.startDate ?? "",
      endDate: project.endDate ?? "",
      quota: project.quota === null ? "" : String(project.quota),
      minAge: project.minAge === null ? "" : String(project.minAge),
      maxAge: project.maxAge === null ? "" : String(project.maxAge),
      requiredResidentType: project.requiredResidentType,
      eligibilityNotes: project.eligibilityNotes ?? "",
      requiresThreeMonthWarning: project.requiresThreeMonthWarning,
      whatsappTemplateAr: project.whatsappTemplateAr ?? "",
      whatsappTemplateEn: project.whatsappTemplateEn ?? "",
      notes: project.notes ?? "",
    },
    showReload: false,
  };
}

export function editProjectSuccessRevalidatePaths(projectId: string): string[] {
  return [
    "/projects",
    `/projects/${projectId}`,
    `/projects/${projectId}/edit`,
  ];
}

export function editProjectSuccessRedirectPath(projectId: string): string {
  return `/projects/${projectId}`;
}

export function isEditableProjectStatus(status: ProjectStatus): boolean {
  return status === "draft" || status === "active";
}

export function isCompanyLockedStatus(status: ProjectStatus): boolean {
  return status === "active";
}

export function projectStatusEditLabel(status: ProjectStatus): string {
  switch (status) {
    case "draft":
      return projectsEditCopy.statusDraft;
    case "active":
      return projectsEditCopy.statusActive;
    case "closed":
      return projectsEditCopy.statusClosed;
    case "cancelled":
      return projectsEditCopy.statusCancelled;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function readEditProjectFormValues(
  formData: FormData
): EditProjectFormValues {
  return {
    projectId: readStringField(formData, "project_id"),
    expectedUpdatedAt: readStringField(formData, "expected_updated_at"),
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

export type FormValuesToUpdateInputResult =
  | {
      ok: true;
      data: ProjectWriteInputRaw & {
        projectId: string;
        expectedUpdatedAt: string;
      };
    }
  | { ok: false; code: ProjectErrorCode };

/** Maps form values into update-shaped raw input (no status). */
export function formValuesToUpdateInputRaw(
  values: EditProjectFormValues
): FormValuesToUpdateInputResult {
  if (!values.projectId.trim()) {
    return { ok: false, code: "invalid_project_id" };
  }
  if (!values.expectedUpdatedAt.trim()) {
    return { ok: false, code: "stale_project_version" };
  }

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
      projectId: values.projectId,
      expectedUpdatedAt: values.expectedUpdatedAt,
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
 * Maps stable Projects error codes to Arabic form presentation.
 * Never includes SQL, constraints, or raw exception text.
 */
export function mapEditProjectErrorPresentation(
  code: ProjectErrorCode,
  values: EditProjectFormValues
): EditProjectActionState {
  const fieldErrors: EditProjectFieldErrors = {};
  let formError: string | null = null;
  let showReload = false;

  switch (code) {
    case "invalid_project_name":
      fieldErrors.name = projectsEditCopy.errorInvalidName;
      break;
    case "invalid_company_id":
      fieldErrors.companyId = projectsEditCopy.errorInvalidCompany;
      break;
    case "invalid_project_domain":
      fieldErrors.domain = projectsEditCopy.errorInvalidDomain;
      break;
    case "invalid_project_dates":
      fieldErrors.startDate = projectsEditCopy.errorInvalidDates;
      fieldErrors.endDate = projectsEditCopy.errorInvalidDates;
      break;
    case "invalid_project_quota":
      fieldErrors.quota = projectsEditCopy.errorInvalidQuota;
      break;
    case "invalid_project_age_range":
      fieldErrors.minAge = projectsEditCopy.errorInvalidAge;
      fieldErrors.maxAge = projectsEditCopy.errorInvalidAge;
      break;
    case "invalid_project_resident_type":
      fieldErrors.requiredResidentType = projectsEditCopy.errorInvalidResident;
      break;
    case "invalid_project_text_length":
      formError = projectsEditCopy.errorInvalidText;
      break;
    case "project_company_not_found":
      formError = projectsEditCopy.errorCompanyNotFound;
      fieldErrors.companyId = projectsEditCopy.errorCompanyNotFound;
      break;
    case "project_company_locked":
      formError = projectsEditCopy.errorCompanyLocked;
      fieldErrors.companyId = projectsEditCopy.errorCompanyLocked;
      break;
    case "project_not_editable":
      formError = projectsEditCopy.errorNotEditable;
      break;
    case "stale_project_version":
      formError = projectsEditCopy.errorStale;
      showReload = true;
      break;
    case "project_not_found":
    case "invalid_project_id":
      formError = projectsEditCopy.errorNotFound;
      break;
    case "project_access_denied":
      formError = projectsEditCopy.errorAccess;
      break;
    case "project_profile_unavailable":
      formError = projectsEditCopy.errorProfile;
      break;
    default:
      formError = projectsEditCopy.errorUnexpected;
      break;
  }

  return {
    status: "error",
    code,
    formError,
    fieldErrors,
    values,
    showReload,
  };
}
