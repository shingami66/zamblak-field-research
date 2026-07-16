/**
 * Application-facing Projects domain types over applied DEV/DEMO RPCs.
 * Finance-free. Soft-deleted rows are never returned by product RPCs.
 */

export type ProjectStatus = "draft" | "active" | "closed" | "cancelled";

export type ProjectDomain =
  | "telecom"
  | "banking"
  | "insurance"
  | "product"
  | "other";

export type ProjectResidentType =
  | "any"
  | "saudi"
  | "non_saudi"
  | "unknown";

/** Live RPC-raised tokens plus application-normalized unexpected. */
export type ProjectErrorCode =
  | "project_access_denied"
  | "project_profile_unavailable"
  | "invalid_project_id"
  | "invalid_project_name"
  | "invalid_project_domain"
  | "invalid_project_status"
  | "invalid_project_dates"
  | "invalid_project_quota"
  | "invalid_project_age_range"
  | "invalid_project_resident_type"
  | "invalid_project_pagination"
  | "invalid_project_text_length"
  | "invalid_company_id"
  | "project_not_found"
  | "project_company_not_found"
  | "project_not_editable"
  | "project_company_locked"
  | "invalid_project_status_transition"
  | "stale_project_version"
  /** Reserved — not emitted by current installed SQL. */
  | "project_company_unavailable"
  | "unexpected_project_error";

/** List RPC row (10 fields) after camelCase mapping. */
export type ProjectListItem = {
  projectId: string;
  projectName: string;
  companyId: string;
  companyName: string;
  domain: ProjectDomain;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  quota: number | null;
  updatedAt: string;
};

/** Detail RPC row (19 fields) after camelCase mapping. */
export type ProjectDetail = {
  projectId: string;
  projectName: string;
  companyId: string;
  companyName: string;
  domain: ProjectDomain;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  quota: number | null;
  minAge: number | null;
  maxAge: number | null;
  requiredResidentType: ProjectResidentType;
  eligibilityNotes: string | null;
  requiresThreeMonthWarning: boolean;
  whatsappTemplateAr: string | null;
  whatsappTemplateEn: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectListParams = {
  search: string | null;
  companyId: string | null;
  status: ProjectStatus | null;
  limit: number;
  offset: number;
};

export type CreateProjectInput = {
  name: string;
  companyId: string;
  domain: ProjectDomain;
  startDate: string | null;
  endDate: string | null;
  quota: number | null;
  minAge: number | null;
  maxAge: number | null;
  requiredResidentType: ProjectResidentType;
  eligibilityNotes: string | null;
  requiresThreeMonthWarning: boolean;
  whatsappTemplateAr: string | null;
  whatsappTemplateEn: string | null;
  notes: string | null;
};

export type UpdateProjectInput = CreateProjectInput & {
  projectId: string;
  /** Required optimistic concurrency token; never defaulted or browser-generated. */
  expectedUpdatedAt: string;
};

export type TransitionProjectStatusInput = {
  projectId: string;
  expectedUpdatedAt: string;
  targetStatus: ProjectStatus;
};

export type ProjectsListResult = {
  projects: ProjectListItem[];
};

export type ProjectSuccess<T> = { ok: true; data: T };
export type ProjectFailure = { ok: false; code: ProjectErrorCode };
export type ProjectResult<T> = ProjectSuccess<T> | ProjectFailure;

/** Raw list_projects RPC row field names from PostgreSQL. */
export type ProjectListRpcRow = {
  project_id: unknown;
  project_name: unknown;
  company_id: unknown;
  company_name: unknown;
  domain: unknown;
  status: unknown;
  start_date: unknown;
  end_date: unknown;
  quota: unknown;
  updated_at: unknown;
};

/** Raw get/create/update/transition RPC row field names from PostgreSQL. */
export type ProjectDetailRpcRow = {
  project_id: unknown;
  project_name: unknown;
  company_id: unknown;
  company_name: unknown;
  domain: unknown;
  status: unknown;
  start_date: unknown;
  end_date: unknown;
  quota: unknown;
  min_age: unknown;
  max_age: unknown;
  required_resident_type: unknown;
  eligibility_notes: unknown;
  requires_three_month_warning: unknown;
  whatsapp_template_ar: unknown;
  whatsapp_template_en: unknown;
  notes: unknown;
  created_at: unknown;
  updated_at: unknown;
};
