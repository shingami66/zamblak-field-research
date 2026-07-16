import type { CompanyDetail, CompanyErrorCode } from "./types";
import { companiesEditCopy } from "./edit-copy";

export type EditCompanyFieldKey =
  | "name"
  | "contactPerson"
  | "phone"
  | "notes";

export type EditCompanyFormValues = {
  companyId: string;
  /** Authoritative concurrency token from loaded record or last form submit. */
  expectedUpdatedAt: string;
  name: string;
  contactPerson: string;
  phone: string;
  notes: string;
};

export type EditCompanyFieldErrors = Partial<
  Record<EditCompanyFieldKey, string>
>;

export type EditCompanyActionState = {
  status: "idle" | "error";
  code: CompanyErrorCode | null;
  formError: string | null;
  fieldErrors: EditCompanyFieldErrors;
  values: EditCompanyFormValues;
  /** When true, UI should offer reload of the edit route. */
  showReload: boolean;
};

export function initialEditCompanyState(
  company: CompanyDetail
): EditCompanyActionState {
  return {
    status: "idle",
    code: null,
    formError: null,
    fieldErrors: {},
    values: {
      companyId: company.companyId,
      expectedUpdatedAt: company.updatedAt,
      name: company.name,
      contactPerson: company.contactPerson ?? "",
      phone: company.phone ?? "",
      notes: company.notes ?? "",
    },
    showReload: false,
  };
}

export function editCompanySuccessRevalidatePaths(companyId: string): string[] {
  return [
    "/companies",
    `/companies/${companyId}`,
    `/companies/${companyId}/edit`,
  ];
}

export function editCompanySuccessRedirectPath(companyId: string): string {
  return `/companies/${companyId}`;
}

export function readEditCompanyFormValues(
  formData: FormData
): EditCompanyFormValues {
  return {
    companyId: readStringField(formData, "company_id"),
    expectedUpdatedAt: readStringField(formData, "expected_updated_at"),
    name: readStringField(formData, "name"),
    contactPerson: readStringField(formData, "contact_person"),
    phone: readStringField(formData, "phone"),
    notes: readStringField(formData, "notes"),
  };
}

function readStringField(formData: FormData, key: string): string {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw : "";
}

/**
 * Maps stable Companies error codes to Arabic form presentation.
 * Never includes SQL, constraints, or raw exception text.
 */
export function mapEditCompanyErrorPresentation(
  code: CompanyErrorCode,
  values: EditCompanyFormValues
): EditCompanyActionState {
  const fieldErrors: EditCompanyFieldErrors = {};
  let formError: string | null = null;
  let showReload = false;

  switch (code) {
    case "invalid_company_name":
      fieldErrors.name = companiesEditCopy.errorInvalidName;
      break;
    case "invalid_company_contact_person":
      fieldErrors.contactPerson = companiesEditCopy.errorInvalidContact;
      break;
    case "invalid_company_phone":
      fieldErrors.phone = companiesEditCopy.errorInvalidPhone;
      break;
    case "invalid_company_notes":
      fieldErrors.notes = companiesEditCopy.errorInvalidNotes;
      break;
    case "duplicate_company_name":
      formError = companiesEditCopy.errorDuplicateName;
      fieldErrors.name = companiesEditCopy.errorDuplicateName;
      break;
    case "stale_company_version":
      formError = companiesEditCopy.errorStale;
      showReload = true;
      break;
    case "company_not_found":
      formError = companiesEditCopy.errorNotFound;
      break;
    case "company_access_denied":
      formError = companiesEditCopy.errorAccess;
      break;
    default:
      formError = companiesEditCopy.errorUnexpected;
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
