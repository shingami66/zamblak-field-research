import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { respondentsEditCopy } from "./edit-copy";
import {
  editRespondentSuccessRedirectPath,
  editRespondentSuccessRevalidatePaths,
  formValuesToUpdateInputRaw,
  initialEditRespondentState,
  mapEditRespondentErrorPresentation,
  readEditRespondentFormValues,
  withEditRespondentFormRevision,
  type EditRespondentFieldKey,
  type EditRespondentFormValues,
  type UpdateRespondentActionContext,
} from "./edit-form";
import {
  buildUpdateRespondentRpcArgs,
  parseUpdateRespondentInput,
} from "./input";
import type { RespondentDetail, RespondentErrorCode } from "./types";

const respondentId = "11111111-1111-4111-8111-111111111111";
const expectedUpdatedAt = "2026-07-02T15:30:00.000Z";

const baseDetail: RespondentDetail = {
  respondentId,
  name: "علي",
  mobile: "966512345678",
  age: 30,
  nationality: "سعودي",
  residentType: "saudi",
  notes: "ملاحظة",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: expectedUpdatedAt,
};

const baseContext: UpdateRespondentActionContext = {
  respondentId,
  expectedUpdatedAt,
};

function baseValues(
  overrides: Partial<EditRespondentFormValues> = {}
): EditRespondentFormValues {
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

describe("initialEditRespondentState", () => {
  it("prefills complete RespondentDetail without IDs in values", () => {
    const state = initialEditRespondentState(baseDetail);
    assert.equal(state.status, "idle");
    assert.equal(state.code, null);
    assert.equal(state.revision, 0);
    assert.equal(state.showReload, false);
    assert.equal(state.values.mobile, "966512345678");
    assert.equal(state.values.name, "علي");
    assert.equal(state.values.age, "30");
    assert.equal(state.values.nationality, "سعودي");
    assert.equal(state.values.residentType, "saudi");
    assert.equal(state.values.notes, "ملاحظة");
    assert.equal(
      Object.prototype.hasOwnProperty.call(state.values, "respondentId"),
      false
    );
    assert.equal(
      Object.prototype.hasOwnProperty.call(state.values, "expectedUpdatedAt"),
      false
    );
  });

  it("maps null name/age/nationality/notes to empty strings", () => {
    const state = initialEditRespondentState({
      ...baseDetail,
      name: null,
      age: null,
      nationality: null,
      notes: null,
      residentType: "unknown",
    });
    assert.equal(state.values.name, "");
    assert.equal(state.values.age, "");
    assert.equal(state.values.nationality, "");
    assert.equal(state.values.notes, "");
    assert.equal(state.values.residentType, "unknown");
    assert.equal(state.values.mobile, baseDetail.mobile);
  });
});

describe("readEditRespondentFormValues", () => {
  it("reads six approved fields and preserves raw display strings", () => {
    const fd = new FormData();
    fd.set("mobile", "  05 1234 5678  ");
    fd.set("name", "  علي  ");
    fd.set("age", "30");
    fd.set("nationality", "سعودي");
    fd.set("resident_type", "saudi");
    fd.set("notes", " note ");
    const result = readEditRespondentFormValues(fd);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.values.mobile, "  05 1234 5678  ");
    assert.equal(result.values.name, "  علي  ");
    assert.equal(result.values.age, "30");
    assert.equal(result.values.residentType, "saudi");
    assert.equal(result.values.notes, " note ");
  });

  it("defaults empty optionals and resident_type unknown", () => {
    const fd = new FormData();
    const result = readEditRespondentFormValues(fd);
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

  it("rejects duplicate mobile and optional entries", () => {
    const mobileDup = new FormData();
    mobileDup.append("mobile", "a");
    mobileDup.append("mobile", "b");
    assert.equal(readEditRespondentFormValues(mobileDup).ok, false);

    for (const key of ["name", "age", "nationality", "resident_type", "notes"]) {
      const fd = new FormData();
      fd.set("mobile", "0512345678");
      fd.append(key, "a");
      fd.append(key, "b");
      assert.equal(
        readEditRespondentFormValues(fd).ok,
        false,
        `expected reject for ${key}`
      );
    }
  });

  it("ignores unknown FormData keys including id and version", () => {
    const fd = new FormData();
    fd.set("mobile", "0512345678");
    fd.set("respondent_id", "should-ignore");
    fd.set("expected_updated_at", "should-ignore");
    fd.set("account_id", "should-ignore");
    const result = readEditRespondentFormValues(fd);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.values.mobile, "0512345678");
    assert.equal(
      Object.prototype.hasOwnProperty.call(result.values, "respondentId"),
      false
    );
  });
});

describe("formValuesToUpdateInputRaw + parseUpdateRespondentInput", () => {
  it("maps context id/version and six form fields; preserves expectedUpdatedAt", () => {
    const mapped = formValuesToUpdateInputRaw(baseContext, baseValues());
    assert.equal(mapped.ok, true);
    if (!mapped.ok) return;
    assert.equal(mapped.data.respondentId, respondentId);
    assert.equal(mapped.data.expectedUpdatedAt, expectedUpdatedAt);
    const parsed = parseUpdateRespondentInput(mapped.data);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.data.respondentId, respondentId);
    assert.equal(parsed.data.expectedUpdatedAt, expectedUpdatedAt);
    assert.equal(parsed.data.mobile, "966512345678");
    assert.equal(parsed.data.residentType, "saudi");
    const args = buildUpdateRespondentRpcArgs(parsed.data);
    assert.equal(args.p_respondent_id, respondentId);
    assert.equal(args.p_expected_updated_at, expectedUpdatedAt);
  });

  it("does not allow FormData-like values to override bound context", () => {
    const mapped = formValuesToUpdateInputRaw(baseContext, baseValues());
    assert.equal(mapped.ok, true);
    if (!mapped.ok) return;
    assert.equal(mapped.data.respondentId, baseContext.respondentId);
    assert.equal(mapped.data.expectedUpdatedAt, baseContext.expectedUpdatedAt);
  });

  it("rejects malformed context id and timestamp through update parser", () => {
    const badId = formValuesToUpdateInputRaw(
      { respondentId: "not-uuid", expectedUpdatedAt },
      baseValues()
    );
    assert.equal(badId.ok, true);
    if (!badId.ok) return;
    const parsedId = parseUpdateRespondentInput(badId.data);
    assert.equal(parsedId.ok, false);
    if (!parsedId.ok) assert.equal(parsedId.code, "respondent_not_found");

    const badTs = formValuesToUpdateInputRaw(
      { respondentId, expectedUpdatedAt: "not-a-timestamp" },
      baseValues()
    );
    assert.equal(badTs.ok, true);
    if (!badTs.ok) return;
    const parsedTs = parseUpdateRespondentInput(badTs.data);
    assert.equal(parsedTs.ok, false);
    if (!parsedTs.ok) assert.equal(parsedTs.code, "stale_respondent_version");
  });

  it("age conversion: empty null, 0/120 ok, 121 rejected by parser", () => {
    const empty = formValuesToUpdateInputRaw(
      baseContext,
      baseValues({ age: "  " })
    );
    assert.equal(empty.ok, true);
    if (!empty.ok) return;
    const emptyParsed = parseUpdateRespondentInput(empty.data);
    assert.equal(emptyParsed.ok, true);
    if (emptyParsed.ok) assert.equal(emptyParsed.data.age, null);

    for (const age of ["0", "120"]) {
      const mapped = formValuesToUpdateInputRaw(
        baseContext,
        baseValues({ age })
      );
      assert.equal(mapped.ok, true);
      if (!mapped.ok) return;
      assert.equal(parseUpdateRespondentInput(mapped.data).ok, true);
    }

    const over = formValuesToUpdateInputRaw(
      baseContext,
      baseValues({ age: "121" })
    );
    assert.equal(over.ok, true);
    if (!over.ok) return;
    const overParsed = parseUpdateRespondentInput(over.data);
    assert.equal(overParsed.ok, false);
    if (!overParsed.ok) assert.equal(overParsed.code, "invalid_respondent_age");
  });

  it("rejects negative, decimal, plus, unsafe, Arabic digits in age", () => {
    for (const age of ["-1", "1.5", "+30", "9007199254740992", "٣٠"]) {
      const mapped = formValuesToUpdateInputRaw(
        baseContext,
        baseValues({ age })
      );
      assert.equal(mapped.ok, false, age);
      if (!mapped.ok) assert.equal(mapped.code, "invalid_respondent_age");
    }
  });
});

describe("mapEditRespondentErrorPresentation", () => {
  const values = baseValues();

  const fieldCases: Array<{
    code: RespondentErrorCode;
    key: EditRespondentFieldKey;
    message: string;
  }> = [
    {
      code: "invalid_respondent_mobile",
      key: "mobile",
      message: respondentsEditCopy.errorInvalidMobile,
    },
    {
      code: "duplicate_respondent_mobile",
      key: "mobile",
      message: respondentsEditCopy.errorDuplicateMobile,
    },
    {
      code: "invalid_respondent_name",
      key: "name",
      message: respondentsEditCopy.errorInvalidName,
    },
    {
      code: "invalid_respondent_age",
      key: "age",
      message: respondentsEditCopy.errorInvalidAge,
    },
    {
      code: "invalid_respondent_nationality",
      key: "nationality",
      message: respondentsEditCopy.errorInvalidNationality,
    },
    {
      code: "invalid_respondent_resident_type",
      key: "residentType",
      message: respondentsEditCopy.errorInvalidResidentType,
    },
    {
      code: "invalid_respondent_notes",
      key: "notes",
      message: respondentsEditCopy.errorInvalidNotes,
    },
  ];

  it("maps field errors and never echoes mobile or SQL prose", () => {
    for (const { code, key, message } of fieldCases) {
      const state = mapEditRespondentErrorPresentation(code, values);
      assert.equal(state.fieldErrors[key], message);
      assert.equal(state.formError, null);
      assert.deepEqual(state.values, values);
      assert.equal((state.fieldErrors[key] ?? "").includes("0512345678"), false);
      assert.equal((state.fieldErrors[key] ?? "").includes("SQLSTATE"), false);
    }
  });

  it("maps stale conflict with showReload and preserves values", () => {
    const state = mapEditRespondentErrorPresentation(
      "stale_respondent_version",
      values
    );
    assert.equal(state.formError, respondentsEditCopy.errorStale);
    assert.equal(state.showReload, true);
    assert.deepEqual(state.values, values);
    assert.equal(state.formError?.includes(expectedUpdatedAt), false);
    assert.equal(state.formError?.includes("stale_respondent_version"), false);
  });

  it("maps access, not-found, and unexpected safely", () => {
    assert.equal(
      mapEditRespondentErrorPresentation("respondent_access_denied", values)
        .formError,
      respondentsEditCopy.errorAccess
    );
    assert.equal(
      mapEditRespondentErrorPresentation("respondent_not_found", values)
        .formError,
      respondentsEditCopy.errorNotFound
    );
    assert.equal(
      mapEditRespondentErrorPresentation("unexpected_respondent_error", values)
        .formError,
      respondentsEditCopy.errorUnexpected
    );
    assert.equal(
      mapEditRespondentErrorPresentation("invalid_pagination", values)
        .formError,
      respondentsEditCopy.errorUnexpected
    );
  });

  it("increments revision via withEditRespondentFormRevision", () => {
    const prev = initialEditRespondentState(baseDetail);
    prev.revision = 4;
    const err = mapEditRespondentErrorPresentation(
      "invalid_respondent_mobile",
      values
    );
    const next = withEditRespondentFormRevision(err, prev);
    assert.equal(next.revision, 5);
    assert.deepEqual(next.values, values);
  });
});

describe("edit success navigation targets", () => {
  it("revalidates list and detail and redirects to detail", () => {
    assert.deepEqual(editRespondentSuccessRevalidatePaths(respondentId), [
      "/respondents",
      `/respondents/${respondentId}`,
    ]);
    assert.equal(
      editRespondentSuccessRedirectPath(respondentId),
      `/respondents/${respondentId}`
    );
  });
});
