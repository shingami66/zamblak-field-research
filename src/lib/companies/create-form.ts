import type { CompanyErrorCode } from "./types";
import { companiesCreateCopy } from "./create-copy";

export type CreateCompanyFieldKey =
  | "name"
  | "contactPerson"
  | "phone"
  | "notes";

export type CreateCompanyFormValues = {
  name: string;
  contactPerson: string;
  phone: string;
  notes: string;
};

export type CreateCompanyFieldErrors = Partial<
  Record<CreateCompanyFieldKey, string>
>;

export type CreateCompanyActionState = {
  status: "idle" | "error";
  /** Stable code for tests; never raw SQL. */
  code: CompanyErrorCode | null;
  formError: string | null;
  fieldErrors: CreateCompanyFieldErrors;
  values: CreateCompanyFormValues;
};

export const EMPTY_CREATE_COMPANY_STATE: CreateCompanyActionState = {
  status: "idle",
  code: null,
  formError: null,
  fieldErrors: {},
  values: {
    name: "",
    contactPerson: "",
    phone: "",
    notes: "",
  },
};

export function readCreateCompanyFormValues(
  formData: FormData
): CreateCompanyFormValues {
  return {
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
 * Maps a stable Companies error code to form-level and/or field-level Arabic messages.
 * Never includes SQL, constraint names, or raw exception text.
 */
export function mapCreateCompanyErrorPresentation(
  code: CompanyErrorCode,
  values: CreateCompanyFormValues
): CreateCompanyActionState {
  const fieldErrors: CreateCompanyFieldErrors = {};
  let formError: string | null = null;

  switch (code) {
    case "invalid_company_name":
      fieldErrors.name = companiesCreateCopy.errorInvalidName;
      break;
    case "invalid_company_contact_person":
      fieldErrors.contactPerson = companiesCreateCopy.errorInvalidContact;
      break;
    case "invalid_company_phone":
      fieldErrors.phone = companiesCreateCopy.errorInvalidPhone;
      break;
    case "invalid_company_notes":
      fieldErrors.notes = companiesCreateCopy.errorInvalidNotes;
      break;
    case "duplicate_company_name":
      formError = companiesCreateCopy.errorDuplicateName;
      fieldErrors.name = companiesCreateCopy.errorDuplicateName;
      break;
    case "company_access_denied":
      formError = companiesCreateCopy.errorAccess;
      break;
    default:
      formError = companiesCreateCopy.errorUnexpected;
      break;
  }

  return {
    status: "error",
    code,
    formError,
    fieldErrors,
    values,
  };
}
