import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { respondentsCreateCopy } from "./create-copy";
import {
  CREATE_RESPONDENT_SUCCESS_REDIRECT_PATH,
  CREATE_RESPONDENT_SUCCESS_REVALIDATE_PATH,
  EMPTY_CREATE_RESPONDENT_STATE,
  formValuesToCreateInputRaw,
  mapCreateRespondentErrorPresentation,
  parseCreateRespondentAgeInput,
  readCreateRespondentFormValues,
  withCreateRespondentFormRevision,
  type CreateRespondentFieldKey,
  type CreateRespondentFormValues,
} from "./create-form";
import {
  buildCreateRespondentRpcArgs,
  parseCreateRespondentInput,
} from "./input";
import type { RespondentErrorCode } from "./types";

function baseValues(
  overrides: Partial<CreateRespondentFormValues> = {}
): CreateRespondentFormValues {
  return {
    mobile: "0512345678",
    name: "علي",
    age: "30",
    nationality: "سعودي",
    residentType: "saudi",
    notes: "ملاحظة",
    ...overrides,
  };
}

describe("readCreateRespondentFormValues", () => {
  it("reads valid scalar values and preserves raw display strings", () => {
    const fd = new FormData();
    fd.set("mobile", "  05 1234 5678  ");
    fd.set("name", "  علي  ");
    fd.set("age", "30");
    fd.set("nationality", "سعودي");
    fd.set("resident_type", "saudi");
    fd.set("notes", " note ");
    const result = readCreateRespondentFormValues(fd);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.values.mobile, "  05 1234 5678  ");
    assert.equal(result.values.name, "  علي  ");
    assert.equal(result.values.age, "30");
    assert.equal(result.values.nationality, "سعودي");
    assert.equal(result.values.residentType, "saudi");
    assert.equal(result.values.notes, " note ");
  });

  it("defaults empty optionals and missing mobile to empty strings", () => {
    const fd = new FormData();
    const result = readCreateRespondentFormValues(fd);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.values, {
      mobile: "",
      name: "",
      age: "",
      nationality: "",
      residentType: "unknown",
      notes: "",
    });
  });

  it("defaults resident_type empty to unknown", () => {
    const fd = new FormData();
    fd.set("mobile", "0512345678");
    fd.set("resident_type", "");
    const result = readCreateRespondentFormValues(fd);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.values.residentType, "unknown");
  });

  it("rejects duplicate mobile entries", () => {
    const fd = new FormData();
    fd.append("mobile", "0512345678");
    fd.append("mobile", "0511111111");
    const result = readCreateRespondentFormValues(fd);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.code, "unexpected_respondent_error");
    assert.equal(result.values.mobile, "0512345678");
  });

  it("rejects duplicate optional entries", () => {
    for (const key of ["name", "age", "nationality", "resident_type", "notes"]) {
      const fd = new FormData();
      fd.set("mobile", "0512345678");
      fd.append(key, "a");
      fd.append(key, "b");
      const result = readCreateRespondentFormValues(fd);
      assert.equal(result.ok, false, `expected reject for ${key}`);
      if (result.ok) return;
      assert.equal(result.code, "unexpected_respondent_error");
    }
  });

  it("ignores unknown FormData keys", () => {
    const fd = new FormData();
    fd.set("mobile", "0512345678");
    fd.set("account_id", "should-ignore");
    fd.set("normalized_mobile", "should-ignore");
    fd.set("respondent_id", "should-ignore");
    const result = readCreateRespondentFormValues(fd);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.values.mobile, "0512345678");
    assert.equal(
      Object.prototype.hasOwnProperty.call(result.values, "accountId"),
      false
    );
    assert.equal(
      Object.prototype.hasOwnProperty.call(result.values, "normalizedMobile"),
      false
    );
  });
});

describe("parseCreateRespondentAgeInput", () => {
  it("empty and whitespace → null", () => {
    assert.deepEqual(parseCreateRespondentAgeInput(""), {
      ok: true,
      value: null,
    });
    assert.deepEqual(parseCreateRespondentAgeInput("   "), {
      ok: true,
      value: null,
    });
  });

  it("accepts 0 and 120 as numbers (range left to contract)", () => {
    assert.deepEqual(parseCreateRespondentAgeInput("0"), {
      ok: true,
      value: 0,
    });
    assert.deepEqual(parseCreateRespondentAgeInput("120"), {
      ok: true,
      value: 120,
    });
  });

  it("passes 121 through as number for contract to reject", () => {
    const age = parseCreateRespondentAgeInput("121");
    assert.equal(age.ok, true);
    if (!age.ok) return;
    assert.equal(age.value, 121);
    const mapped = formValuesToCreateInputRaw(
      baseValues({ age: "121", mobile: "0512345678" })
    );
    assert.equal(mapped.ok, true);
    if (!mapped.ok) return;
    const parsed = parseCreateRespondentInput(mapped.data);
    assert.equal(parsed.ok, false);
    if (!parsed.ok) assert.equal(parsed.code, "invalid_respondent_age");
  });

  it("rejects negative, decimal, plus sign, and unsafe integer", () => {
    assert.equal(parseCreateRespondentAgeInput("-1").ok, false);
    assert.equal(parseCreateRespondentAgeInput("1.5").ok, false);
    assert.equal(parseCreateRespondentAgeInput("+30").ok, false);
    assert.equal(parseCreateRespondentAgeInput("1e2").ok, false);
    assert.equal(
      parseCreateRespondentAgeInput("9007199254740992").ok,
      false
    );
  });

  it("does not silently convert Arabic-Indic digits", () => {
    assert.equal(parseCreateRespondentAgeInput("٣٠").ok, false);
  });
});

describe("formValuesToCreateInputRaw + parseCreateRespondentInput", () => {
  it("maps resident_type to residentType with default unknown", () => {
    const mapped = formValuesToCreateInputRaw(
      baseValues({ residentType: "unknown", name: "", age: "", nationality: "", notes: "" })
    );
    assert.equal(mapped.ok, true);
    if (!mapped.ok) return;
    const parsed = parseCreateRespondentInput(mapped.data);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.data.residentType, "unknown");
    assert.equal(parsed.data.name, null);
    assert.equal(parsed.data.age, null);
    assert.equal(parsed.data.nationality, null);
    assert.equal(parsed.data.notes, null);
    assert.equal(parsed.data.mobile, "966512345678");
  });

  it("includes all six exact create fields and no internal fields", () => {
    const mapped = formValuesToCreateInputRaw(baseValues());
    assert.equal(mapped.ok, true);
    if (!mapped.ok) return;
    const parsed = parseCreateRespondentInput(mapped.data);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.deepEqual(Object.keys(parsed.data).sort(), [
      "age",
      "mobile",
      "name",
      "nationality",
      "notes",
      "residentType",
    ]);
    const args = buildCreateRespondentRpcArgs(parsed.data);
    assert.deepEqual(Object.keys(args).sort(), [
      "p_age",
      "p_mobile",
      "p_name",
      "p_nationality",
      "p_notes",
      "p_resident_type",
    ]);
    assert.equal("p_account_id" in args, false);
    assert.equal("p_respondent_id" in args, false);
    assert.equal("p_normalized_mobile" in args, false);
  });

  it("maps missing mobile through invalid_respondent_mobile", () => {
    const mapped = formValuesToCreateInputRaw(baseValues({ mobile: "" }));
    assert.equal(mapped.ok, true);
    if (!mapped.ok) return;
    const parsed = parseCreateRespondentInput(mapped.data);
    assert.equal(parsed.ok, false);
    if (!parsed.ok) assert.equal(parsed.code, "invalid_respondent_mobile");
  });
});

describe("mapCreateRespondentErrorPresentation", () => {
  const values = baseValues();

  const fieldCases: Array<{
    code: RespondentErrorCode;
    key: CreateRespondentFieldKey;
    message: string;
  }> = [
    {
      code: "invalid_respondent_mobile",
      key: "mobile",
      message: respondentsCreateCopy.errorInvalidMobile,
    },
    {
      code: "duplicate_respondent_mobile",
      key: "mobile",
      message: respondentsCreateCopy.errorDuplicateMobile,
    },
    {
      code: "invalid_respondent_name",
      key: "name",
      message: respondentsCreateCopy.errorInvalidName,
    },
    {
      code: "invalid_respondent_age",
      key: "age",
      message: respondentsCreateCopy.errorInvalidAge,
    },
    {
      code: "invalid_respondent_nationality",
      key: "nationality",
      message: respondentsCreateCopy.errorInvalidNationality,
    },
    {
      code: "invalid_respondent_resident_type",
      key: "residentType",
      message: respondentsCreateCopy.errorInvalidResidentType,
    },
    {
      code: "invalid_respondent_notes",
      key: "notes",
      message: respondentsCreateCopy.errorInvalidNotes,
    },
  ];

  it("maps every create-relevant live token to the correct field", () => {
    for (const { code, key, message } of fieldCases) {
      const state = mapCreateRespondentErrorPresentation(code, values);
      assert.equal(state.status, "error");
      assert.equal(state.code, code);
      assert.equal(state.fieldErrors[key], message);
      assert.equal(state.formError, null);
      assert.deepEqual(state.values, values);
      const fieldMessage = state.fieldErrors[key] ?? "";
      assert.equal(fieldMessage.includes("0512345678"), false);
      assert.equal(fieldMessage.includes("SQLSTATE"), false);
      assert.equal(fieldMessage.includes("constraint"), false);
    }
  });

  it("maps access and unexpected / irrelevant codes to formError", () => {
    const access = mapCreateRespondentErrorPresentation(
      "respondent_access_denied",
      values
    );
    assert.equal(access.formError, respondentsCreateCopy.errorAccess);
    assert.deepEqual(access.fieldErrors, {});

    for (const code of [
      "unexpected_respondent_error",
      "invalid_pagination",
      "respondent_not_found",
      "stale_respondent_version",
    ] as const) {
      const state = mapCreateRespondentErrorPresentation(code, values);
      assert.equal(state.formError, respondentsCreateCopy.errorUnexpected);
      assert.equal(state.formError?.includes("postgres"), false);
      assert.equal(state.formError?.includes("SQLSTATE"), false);
      assert.deepEqual(state.values, values);
    }
  });

  it("increments revision via withCreateRespondentFormRevision", () => {
    const prev = { ...EMPTY_CREATE_RESPONDENT_STATE, revision: 2 };
    const err = mapCreateRespondentErrorPresentation(
      "invalid_respondent_mobile",
      values
    );
    const next = withCreateRespondentFormRevision(err, prev);
    assert.equal(next.revision, 3);
    assert.deepEqual(next.values, values);
  });
});

describe("create success navigation targets", () => {
  it("revalidates and redirects only to the list path", () => {
    assert.equal(CREATE_RESPONDENT_SUCCESS_REVALIDATE_PATH, "/respondents");
    assert.equal(CREATE_RESPONDENT_SUCCESS_REDIRECT_PATH, "/respondents");
    assert.equal(
      CREATE_RESPONDENT_SUCCESS_REDIRECT_PATH.includes("/respondents/"),
      false
    );
  });
});
