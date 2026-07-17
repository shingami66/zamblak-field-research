import { parseCreateRespondentAgeInput } from "./create-form";
import { respondentsEditCopy } from "./edit-copy";
import type { UpdateRespondentInputRaw } from "./input";
import type {
  RespondentDetail,
  RespondentErrorCode,
} from "./types";

export type EditRespondentFieldKey =
  | "mobile"
  | "name"
  | "age"
  | "nationality"
  | "residentType"
  | "notes";

/** Editable display values only — no ID or concurrency token. */
export type EditRespondentFormValues = {
  mobile: string;
  name: string;
  age: string;
  nationality: string;
  residentType: string;
  notes: string;
};

export type EditRespondentFieldErrors = Partial<
  Record<EditRespondentFieldKey, string>
>;

export type EditRespondentActionState = {
  status: "idle" | "error";
  /** Stable code for tests; never raw SQL. */
  code: RespondentErrorCode | null;
  formError: string | null;
  fieldErrors: EditRespondentFieldErrors;
  values: EditRespondentFormValues;
  /**
   * Increments on every returned error so uncontrolled defaultValue remounts.
   */
  revision: number;
  /** When true, UI should offer reload of the edit route. */
  showReload: boolean;
};

/** Server-bound mutation context — never taken from FormData. */
export type UpdateRespondentActionContext = {
  respondentId: string;
  expectedUpdatedAt: string;
};

const APPROVED_FORM_KEYS = [
  "mobile",
  "name",
  "age",
  "nationality",
  "resident_type",
  "notes",
] as const;

export type ReadEditRespondentFormResult =
  | { ok: true; values: EditRespondentFormValues }
  | {
      ok: false;
      code: RespondentErrorCode;
      values: EditRespondentFormValues;
    };

export function initialEditRespondentState(
  respondent: RespondentDetail
): EditRespondentActionState {
  return {
    status: "idle",
    code: null,
    formError: null,
    fieldErrors: {},
    revision: 0,
    showReload: false,
    values: {
      mobile: respondent.mobile,
      name: respondent.name ?? "",
      age: respondent.age === null ? "" : String(respondent.age),
      nationality: respondent.nationality ?? "",
      residentType: respondent.residentType,
      notes: respondent.notes ?? "",
    },
  };
}

export function editRespondentSuccessRevalidatePaths(
  respondentId: string
): string[] {
  return ["/respondents", `/respondents/${respondentId}`];
}

export function editRespondentSuccessRedirectPath(respondentId: string): string {
  return `/respondents/${respondentId}`;
}

/**
 * Reads only the six approved FormData keys.
 * Rejects duplicate entries. Unknown keys ignored. Raw display preserved.
 */
export function readEditRespondentFormValues(
  formData: FormData
): ReadEditRespondentFormResult {
  const partial: Partial<EditRespondentFormValues> = {};

  for (const key of APPROVED_FORM_KEYS) {
    const all = formData.getAll(key);
    if (all.length > 1) {
      return {
        ok: false,
        code: "unexpected_respondent_error",
        values: collectFirstValues(formData),
      };
    }
    const raw = all.length === 0 ? null : all[0];
    const asString = typeof raw === "string" ? raw : "";

    switch (key) {
      case "mobile":
        partial.mobile = asString;
        break;
      case "name":
        partial.name = asString;
        break;
      case "age":
        partial.age = asString;
        break;
      case "nationality":
        partial.nationality = asString;
        break;
      case "resident_type":
        partial.residentType = asString === "" ? "unknown" : asString;
        break;
      case "notes":
        partial.notes = asString;
        break;
      default: {
        const _exhaustive: never = key;
        return _exhaustive;
      }
    }
  }

  return {
    ok: true,
    values: {
      mobile: partial.mobile ?? "",
      name: partial.name ?? "",
      age: partial.age ?? "",
      nationality: partial.nationality ?? "",
      residentType: partial.residentType ?? "unknown",
      notes: partial.notes ?? "",
    },
  };
}

function collectFirstValues(formData: FormData): EditRespondentFormValues {
  return {
    mobile: firstString(formData, "mobile"),
    name: firstString(formData, "name"),
    age: firstString(formData, "age"),
    nationality: firstString(formData, "nationality"),
    residentType: (() => {
      const v = firstString(formData, "resident_type");
      return v === "" ? "unknown" : v;
    })(),
    notes: firstString(formData, "notes"),
  };
}

function firstString(formData: FormData, key: string): string {
  const all = formData.getAll(key);
  if (all.length === 0) {
    return "";
  }
  const raw = all[0];
  return typeof raw === "string" ? raw : "";
}

export type FormValuesToUpdateInputResult =
  | { ok: true; data: UpdateRespondentInputRaw }
  | { ok: false; code: RespondentErrorCode };

/**
 * Maps bound context + form values into parseUpdateRespondentInput shape.
 * FormData cannot supply respondentId or expectedUpdatedAt.
 */
export function formValuesToUpdateInputRaw(
  context: UpdateRespondentActionContext,
  values: EditRespondentFormValues
): FormValuesToUpdateInputResult {
  const age = parseCreateRespondentAgeInput(values.age);
  if (!age.ok) {
    return { ok: false, code: age.code };
  }

  return {
    ok: true,
    data: {
      respondentId: context.respondentId,
      expectedUpdatedAt: context.expectedUpdatedAt,
      mobile: values.mobile,
      name: values.name === "" ? null : values.name,
      age: age.value,
      nationality: values.nationality === "" ? null : values.nationality,
      residentType:
        values.residentType === "" ? "unknown" : values.residentType,
      notes: values.notes === "" ? null : values.notes,
    },
  };
}

/**
 * Maps a stable Respondent error code to form/field Arabic messages.
 * Never includes SQL, constraint names, or raw exception text.
 * Never echoes mobile numbers into errors.
 */
export function mapEditRespondentErrorPresentation(
  code: RespondentErrorCode,
  values: EditRespondentFormValues
): EditRespondentActionState {
  const fieldErrors: EditRespondentFieldErrors = {};
  let formError: string | null = null;
  let showReload = false;

  switch (code) {
    case "invalid_respondent_mobile":
      fieldErrors.mobile = respondentsEditCopy.errorInvalidMobile;
      break;
    case "duplicate_respondent_mobile":
      fieldErrors.mobile = respondentsEditCopy.errorDuplicateMobile;
      break;
    case "invalid_respondent_name":
      fieldErrors.name = respondentsEditCopy.errorInvalidName;
      break;
    case "invalid_respondent_age":
      fieldErrors.age = respondentsEditCopy.errorInvalidAge;
      break;
    case "invalid_respondent_nationality":
      fieldErrors.nationality = respondentsEditCopy.errorInvalidNationality;
      break;
    case "invalid_respondent_resident_type":
      fieldErrors.residentType = respondentsEditCopy.errorInvalidResidentType;
      break;
    case "invalid_respondent_notes":
      fieldErrors.notes = respondentsEditCopy.errorInvalidNotes;
      break;
    case "stale_respondent_version":
      formError = respondentsEditCopy.errorStale;
      showReload = true;
      break;
    case "respondent_not_found":
      formError = respondentsEditCopy.errorNotFound;
      break;
    case "respondent_access_denied":
      formError = respondentsEditCopy.errorAccess;
      break;
    case "unexpected_respondent_error":
    case "invalid_pagination":
    default:
      formError = respondentsEditCopy.errorUnexpected;
      break;
  }

  return {
    status: "error",
    code,
    formError,
    fieldErrors,
    values,
    revision: 0,
    showReload,
  };
}

export function withEditRespondentFormRevision(
  state: EditRespondentActionState,
  prev: EditRespondentActionState
): EditRespondentActionState {
  return {
    ...state,
    revision: prev.revision + 1,
  };
}
