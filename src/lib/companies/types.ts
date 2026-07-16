/**
 * Application-facing Companies domain types over applied DEV/DEMO RPCs.
 * No financial fields. Deleted rows are never returned by RPCs.
 */

export type CompanyErrorCode =
  | "duplicate_company_name"
  | "invalid_company_phone"
  | "invalid_company_name"
  | "invalid_company_contact_person"
  | "invalid_company_notes"
  | "company_not_found"
  | "company_access_denied"
  | "invalid_pagination"
  | "stale_company_version"
  | "unexpected_company_error";

/** Shared list/detail/create/update RPC shape (operational fields only). */
export type CompanyRecord = {
  companyId: string;
  /** Tenant scope from RPC; not editable by the client. */
  accountId: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  notes: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  /** ISO-8601 timestamp string from the database. */
  createdAt: string;
  /** ISO-8601 timestamp string from the database. */
  updatedAt: string;
  activeProjectsCount: number;
  completedProjectsCount: number;
};

export type CompanySummary = CompanyRecord;
export type CompanyDetail = CompanyRecord;

export type CompanyListParams = {
  search: string | null;
  limit: number;
  offset: number;
};

export type CreateCompanyInput = {
  name: string;
  contactPerson: string | null;
  phone: string | null;
  notes: string | null;
};

export type UpdateCompanyInput = CreateCompanyInput & {
  companyId: string;
  /** Required optimistic concurrency token; never defaulted. */
  expectedUpdatedAt: string;
};

export type CompaniesListResult = {
  companies: CompanySummary[];
};

export type CompanySuccess<T> = { ok: true; data: T };
export type CompanyFailure = { ok: false; code: CompanyErrorCode };
export type CompanyResult<T> = CompanySuccess<T> | CompanyFailure;

/** Raw RPC row field names from PostgreSQL. */
export type CompanyRpcRow = {
  company_id: unknown;
  account_id: unknown;
  name: unknown;
  contact_person: unknown;
  phone: unknown;
  notes: unknown;
  created_by: unknown;
  updated_by: unknown;
  created_at: unknown;
  updated_at: unknown;
  active_projects_count: unknown;
  completed_projects_count: unknown;
};
