import { respondentsCreateCopy } from "./create-copy";
import type { RespondentWriteInputRaw } from "./input";
import type { RespondentErrorCode } from "./types";

export type CreateRespondentFieldKey =
  | "mobile"
  | "name"
  | "age"
  | "nationality"
  | "residentType"
  | "notes";

/** Raw form values as strings (pre-parse). Age remains display string. */
export type CreateRespondentFormValues = {
  mobile: string;
  name: string;
  age: string;
  nationality: string;
  residentType: string;
  notes: string;
};

export type CreateRespondentFieldErrors = Partial<
  Record<CreateRespondentFieldKey, string>
>;

export type CreateRespondentActionState = {
  status: "idle" | "error";
  /** Stable code for tests; never raw SQL. */
  code: RespondentErrorCode | null;
  formError: string | null;
  fieldErrors: CreateRespondentFieldErrors;
  values: CreateRespondentFormValues;
  /**
   * Increments on every returned error so the client form can remount and
   * re-apply defaultValue from the latest submitted values.
   */
  revision: number;
};

export const EMPTY_CREATE_RESPONDENT_STATE: CreateRespondentActionState = {
  status: "idle",
  code: null,
  formError: null,
  fieldErrors: {},
  revision: 0,
  values: {
    mobile: "",
    name: "",
    age: "",
    nationality: "",
    residentType: "unknown",
    notes: "",
  },
};

export const CREATE_RESPONDENT_SUCCESS_REVALIDATE_PATH = "/respondents";
export const CREATE_RESPONDENT_SUCCESS_REDIRECT_PATH = "/respondents";

const APPROVED_FORM_KEYS = [
  "mobile",
  "name",
  "age",
  "nationality",
  "resident_type",
  "notes",
] as const;

export type ReadCreateRespondentFormResult =
  | { ok: true; values: CreateRespondentFormValues }
  | {
      ok: false;
      code: RespondentErrorCode;
      values: CreateRespondentFormValues;
    };

/**
 * Reads only the six approved FormData keys.
 * Rejects duplicate entries for any approved key.
 * Unknown keys are ignored. Raw display strings are preserved.
 */
export function readCreateRespondentFormValues(
  formData: FormData
): ReadCreateRespondentFormResult {
  const partial: Partial<CreateRespondentFormValues> = {};

  for (const key of APPROVED_FORM_KEYS) {
    const all = formData.getAll(key);
    if (all.length > 1) {
      const values = collectFirstValues(formData);
      return {
        ok: false,
        code: "unexpected_respondent_error",
        values,
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

function collectFirstValues(formData: FormData): CreateRespondentFormValues {
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

/**
 * Age from form: empty/whitespace → null.
 * Scalar base-10 digits only; no signs, no decimals.
 * Safe integer only. Range 0–120 left to parseCreateRespondentInput.
 */
export function parseCreateRespondentAgeInput(
  raw: string
):
  | { ok: true; value: number | null }
  | { ok: false; code: "invalid_respondent_age" } {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { ok: true, value: null };
  }
  if (!/^\d+$/.test(trimmed)) {
    return { ok: false, code: "invalid_respondent_age" };
  }
  if (trimmed.length > 16) {
    return { ok: false, code: "invalid_respondent_age" };
  }
  const n = Number(trimmed);
  if (!Number.isSafeInteger(n)) {
    return { ok: false, code: "invalid_respondent_age" };
  }
  return { ok: true, value: n };
}

export type FormValuesToCreateInputResult =
  | { ok: true; data: RespondentWriteInputRaw }
  | { ok: false; code: RespondentErrorCode };

/**
 * Maps raw form values into parseCreateRespondentInput shape.
 * resident_type form field → residentType. Empty optionals stay empty strings
 * for the parser to nullify.
 */
export function formValuesToCreateInputRaw(
  values: CreateRespondentFormValues
): FormValuesToCreateInputResult {
  const age = parseCreateRespondentAgeInput(values.age);
  if (!age.ok) {
    return { ok: false, code: age.code };
  }

  return {
    ok: true,
    data: {
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
export function mapCreateRespondentErrorPresentation(
  code: RespondentErrorCode,
  values: CreateRespondentFormValues
): CreateRespondentActionState {
  const fieldErrors: CreateRespondentFieldErrors = {};
  let formError: string | null = null;

  switch (code) {
    case "invalid_respondent_mobile":
      fieldErrors.mobile = respondentsCreateCopy.errorInvalidMobile;
      break;
    case "duplicate_respondent_mobile":
      fieldErrors.mobile = respondentsCreateCopy.errorDuplicateMobile;
      break;
    case "invalid_respondent_name":
      fieldErrors.name = respondentsCreateCopy.errorInvalidName;
      break;
    case "invalid_respondent_age":
      fieldErrors.age = respondentsCreateCopy.errorInvalidAge;
      break;
    case "invalid_respondent_nationality":
      fieldErrors.nationality = respondentsCreateCopy.errorInvalidNationality;
      break;
    case "invalid_respondent_resident_type":
      fieldErrors.residentType = respondentsCreateCopy.errorInvalidResidentType;
      break;
    case "invalid_respondent_notes":
      fieldErrors.notes = respondentsCreateCopy.errorInvalidNotes;
      break;
    case "respondent_access_denied":
      formError = respondentsCreateCopy.errorAccess;
      break;
    case "unexpected_respondent_error":
    case "invalid_pagination":
    case "respondent_not_found":
    case "stale_respondent_version":
    default:
      formError = respondentsCreateCopy.errorUnexpected;
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
 */
export function withCreateRespondentFormRevision(
  state: CreateRespondentActionState,
  prev: CreateRespondentActionState
): CreateRespondentActionState {
  return {
    ...state,
    revision: prev.revision + 1,
  };
}
