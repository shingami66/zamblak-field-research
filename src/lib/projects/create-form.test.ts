import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { projectsCreateCopy } from "./create-copy";
import {
  CREATE_PROJECT_SUCCESS_REDIRECT_PATH,
  CREATE_PROJECT_SUCCESS_REVALIDATE_PATH,
  EMPTY_CREATE_PROJECT_STATE,
  formValuesToCreateInputRaw,
  mapCreateProjectErrorPresentation,
  readCheckboxField,
  readCreateProjectFormValues,
  withCreateProjectFormRevision,
} from "./create-form";
import {
  buildCreateProjectRpcArgs,
  parseCreateProjectInput,
} from "./input";

const companyId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

function baseValues(overrides: Partial<ReturnType<typeof readCreateProjectFormValues>> = {}) {
  return {
    name: "Field Study",
    companyId,
    domain: "telecom",
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
    ...overrides,
  };
}

describe("readCreateProjectFormValues", () => {
  it("reads approved operational fields", () => {
    const fd = new FormData();
    fd.set("name", "  Survey  ");
    fd.set("company_id", companyId);
    fd.set("domain", "banking");
    fd.set("start_date", "2026-01-01");
    fd.set("end_date", "2026-02-01");
    fd.set("quota", "10");
    fd.set("min_age", "18");
    fd.set("max_age", "60");
    fd.set("required_resident_type", "saudi");
    fd.set("eligibility_notes", "eligible");
    fd.set("requires_three_month_warning", "true");
    fd.set("whatsapp_template_ar", "مرحبا");
    fd.set("whatsapp_template_en", "hello");
    fd.set("notes", "note");
    const values = readCreateProjectFormValues(fd);
    assert.equal(values.name, "  Survey  ");
    assert.equal(values.companyId, companyId);
    assert.equal(values.domain, "banking");
    assert.equal(values.requiresThreeMonthWarning, true);
    assert.equal(values.requiredResidentType, "saudi");
  });

  it("defaults missing fields and checkbox false when absent", () => {
    const fd = new FormData();
    const values = readCreateProjectFormValues(fd);
    assert.equal(values.name, "");
    assert.equal(values.companyId, "");
    assert.equal(values.requiresThreeMonthWarning, false);
    assert.equal(values.requiredResidentType, "");
  });
});

describe("readCheckboxField", () => {
  it("handles true/false checkbox representations", () => {
    const on = new FormData();
    on.set("requires_three_month_warning", "on");
    assert.equal(readCheckboxField(on, "requires_three_month_warning"), true);

    const truthy = new FormData();
    truthy.set("requires_three_month_warning", "true");
    assert.equal(
      readCheckboxField(truthy, "requires_three_month_warning"),
      true
    );

    const empty = new FormData();
    assert.equal(
      readCheckboxField(empty, "requires_three_month_warning"),
      false
    );
  });
});

describe("formValuesToCreateInputRaw + parseCreateProjectInput", () => {
  it("accepts valid required fields and defaults warning true", () => {
    const mapped = formValuesToCreateInputRaw(baseValues());
    assert.equal(mapped.ok, true);
    if (!mapped.ok) return;
    const parsed = parseCreateProjectInput(mapped.data);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.data.name, "Field Study");
    assert.equal(parsed.data.companyId, companyId);
    assert.equal(parsed.data.domain, "telecom");
    assert.equal(parsed.data.requiresThreeMonthWarning, true);
    assert.equal(parsed.data.requiredResidentType, "any");
    assert.equal(
      Object.prototype.hasOwnProperty.call(parsed.data, "status"),
      false
    );
  });

  it("normalizes whitespace and nullifies empty optionals", () => {
    const mapped = formValuesToCreateInputRaw(
      baseValues({
        name: "  Field   Study  ",
        eligibilityNotes: "  ",
        notes: "   ",
        whatsappTemplateAr: "",
        whatsappTemplateEn: "  hi  ",
      })
    );
    assert.equal(mapped.ok, true);
    if (!mapped.ok) return;
    const parsed = parseCreateProjectInput(mapped.data);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.data.name, "Field Study");
    assert.equal(parsed.data.eligibilityNotes, null);
    assert.equal(parsed.data.notes, null);
    assert.equal(parsed.data.whatsappTemplateEn, "hi");
  });

  it("rejects missing/overlong name", () => {
    const empty = formValuesToCreateInputRaw(baseValues({ name: "" }));
    assert.equal(empty.ok, true);
    if (!empty.ok) return;
    const emptyParsed = parseCreateProjectInput(empty.data);
    assert.equal(emptyParsed.ok, false);

    const long = formValuesToCreateInputRaw(
      baseValues({ name: "n".repeat(121) })
    );
    assert.equal(long.ok, true);
    if (!long.ok) return;
    const longParsed = parseCreateProjectInput(long.data);
    assert.equal(longParsed.ok, false);
    if (!longParsed.ok) assert.equal(longParsed.code, "invalid_project_name");
  });

  it("rejects invalid company UUID and blank or overlong domain", () => {
    const company = formValuesToCreateInputRaw(
      baseValues({ companyId: "not-uuid" })
    );
    assert.equal(company.ok, true);
    if (!company.ok) return;
    const companyParsed = parseCreateProjectInput(company.data);
    assert.equal(companyParsed.ok, false);
    if (!companyParsed.ok)
      assert.equal(companyParsed.code, "invalid_company_id");

    for (const value of ["   ", "x".repeat(121)]) {
      const domain = formValuesToCreateInputRaw(baseValues({ domain: value }));
      assert.equal(domain.ok, true);
      if (!domain.ok) return;
      const domainParsed = parseCreateProjectInput(domain.data);
      assert.equal(domainParsed.ok, false);
      if (!domainParsed.ok)
        assert.equal(domainParsed.code, "invalid_project_domain");
    }
  });

  it("preserves arbitrary domain text through the form boundary", () => {
    const mapped = formValuesToCreateInputRaw(
      baseValues({ domain: "  الرعاية الصحية  " })
    );
    assert.equal(mapped.ok, true);
    if (!mapped.ok) return;
    const parsed = parseCreateProjectInput(mapped.data);
    assert.equal(parsed.ok, true);
    if (parsed.ok) assert.equal(parsed.data.domain, "الرعاية الصحية");
  });

  it("rejects invalid dates and end before start", () => {
    const bad = formValuesToCreateInputRaw(
      baseValues({ startDate: "16-07-2026" })
    );
    assert.equal(bad.ok, true);
    if (!bad.ok) return;
    assert.equal(parseCreateProjectInput(bad.data).ok, false);

    const order = formValuesToCreateInputRaw(
      baseValues({ startDate: "2026-05-01", endDate: "2026-04-01" })
    );
    assert.equal(order.ok, true);
    if (!order.ok) return;
    const orderParsed = parseCreateProjectInput(order.data);
    assert.equal(orderParsed.ok, false);
    if (!orderParsed.ok)
      assert.equal(orderParsed.code, "invalid_project_dates");
  });

  it("rejects negative and fractional quota", () => {
    const neg = formValuesToCreateInputRaw(baseValues({ quota: "-1" }));
    assert.equal(neg.ok, true);
    if (!neg.ok) return;
    const negParsed = parseCreateProjectInput(neg.data);
    assert.equal(negParsed.ok, false);

    const frac = formValuesToCreateInputRaw(baseValues({ quota: "1.5" }));
    assert.equal(frac.ok, false);
    if (!frac.ok) assert.equal(frac.code, "invalid_project_quota");
  });

  it("rejects negative ages and max below min", () => {
    const ages = formValuesToCreateInputRaw(
      baseValues({ minAge: "40", maxAge: "20" })
    );
    assert.equal(ages.ok, true);
    if (!ages.ok) return;
    const agesParsed = parseCreateProjectInput(ages.data);
    assert.equal(agesParsed.ok, false);
    if (!agesParsed.ok)
      assert.equal(agesParsed.code, "invalid_project_age_range");

    const neg = formValuesToCreateInputRaw(baseValues({ minAge: "-2" }));
    assert.equal(neg.ok, true);
    if (!neg.ok) return;
    assert.equal(parseCreateProjectInput(neg.data).ok, false);
  });

  it("rejects invalid resident and long text over 2000", () => {
    const resident = formValuesToCreateInputRaw(
      baseValues({ requiredResidentType: "alien" })
    );
    assert.equal(resident.ok, true);
    if (!resident.ok) return;
    const residentParsed = parseCreateProjectInput(resident.data);
    assert.equal(residentParsed.ok, false);

    const long = formValuesToCreateInputRaw(
      baseValues({ notes: "n".repeat(2001) })
    );
    assert.equal(long.ok, true);
    if (!long.ok) return;
    const longParsed = parseCreateProjectInput(long.data);
    assert.equal(longParsed.ok, false);
    if (!longParsed.ok)
      assert.equal(longParsed.code, "invalid_project_text_length");
  });

  it("handles requiresThreeMonthWarning false from unchecked checkbox", () => {
    const mapped = formValuesToCreateInputRaw(
      baseValues({ requiresThreeMonthWarning: false })
    );
    assert.equal(mapped.ok, true);
    if (!mapped.ok) return;
    const parsed = parseCreateProjectInput(mapped.data);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.data.requiresThreeMonthWarning, false);
  });
});

describe("create RPC boundary mapping", () => {
  it("maps valid input to create_project args without status/account/audit", () => {
    const mapped = formValuesToCreateInputRaw(
      baseValues({
        name: "  Alpha  ",
        startDate: "2026-01-01",
        endDate: "2026-03-01",
        quota: "5",
        minAge: "18",
        maxAge: "50",
        requiredResidentType: "any",
        eligibilityNotes: "ok",
        requiresThreeMonthWarning: true,
      })
    );
    assert.equal(mapped.ok, true);
    if (!mapped.ok) return;
    const parsed = parseCreateProjectInput(mapped.data);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const args = buildCreateProjectRpcArgs(parsed.data);
    assert.equal(args.p_name, "Alpha");
    assert.equal(args.p_company_id, companyId);
    assert.equal(args.p_domain, "telecom");
    assert.equal(
      Object.prototype.hasOwnProperty.call(args, "p_status"),
      false
    );
    assert.equal(
      Object.prototype.hasOwnProperty.call(args, "p_account_id"),
      false
    );
    assert.equal(
      Object.prototype.hasOwnProperty.call(args, "p_expected_updated_at"),
      false
    );
    assert.equal(
      Object.prototype.hasOwnProperty.call(args, "p_created_by"),
      false
    );
  });
});

describe("mapCreateProjectErrorPresentation", () => {
  const values = baseValues();

  it("maps field and form errors safely", () => {
    assert.equal(
      mapCreateProjectErrorPresentation("invalid_project_name", values)
        .fieldErrors.name,
      projectsCreateCopy.errorInvalidName
    );
    assert.equal(
      mapCreateProjectErrorPresentation("invalid_company_id", values)
        .fieldErrors.companyId,
      projectsCreateCopy.errorInvalidCompany
    );
    assert.equal(
      mapCreateProjectErrorPresentation("project_access_denied", values)
        .formError,
      projectsCreateCopy.errorAccess
    );
    assert.equal(
      mapCreateProjectErrorPresentation("project_profile_unavailable", values)
        .formError,
      projectsCreateCopy.errorProfile
    );
    assert.equal(
      mapCreateProjectErrorPresentation("project_company_not_found", values)
        .formError,
      projectsCreateCopy.errorCompanyNotFound
    );
    const unexpected = mapCreateProjectErrorPresentation(
      "unexpected_project_error",
      values
    );
    assert.equal(unexpected.formError, projectsCreateCopy.errorUnexpected);
    assert.equal(unexpected.formError?.includes("SQLSTATE"), false);
    assert.equal(unexpected.formError?.includes("create_project"), false);
  });

  it("does not treat reserved project_company_unavailable as a special live field error", () => {
    const r = mapCreateProjectErrorPresentation(
      "project_company_unavailable",
      values
    );
    assert.equal(r.formError, projectsCreateCopy.errorUnexpected);
  });
});

describe("create success navigation targets", () => {
  it("revalidates and redirects only to /projects list", () => {
    assert.equal(CREATE_PROJECT_SUCCESS_REVALIDATE_PATH, "/projects");
    assert.equal(CREATE_PROJECT_SUCCESS_REDIRECT_PATH, "/projects");
    assert.equal(
      CREATE_PROJECT_SUCCESS_REDIRECT_PATH.includes("/projects/"),
      false
    );
  });
});

describe("create form error value preservation", () => {
  const filled = baseValues({
    name: "Full Field Survey",
    companyId,
    domain: "banking",
    startDate: "2026-05-01",
    endDate: "2026-04-01",
    quota: "12",
    minAge: "18",
    maxAge: "55",
    requiredResidentType: "saudi",
    eligibilityNotes: "eligible only",
    requiresThreeMonthWarning: false,
    whatsappTemplateAr: "مرحبا",
    whatsappTemplateEn: "hello",
    notes: "field notes",
  });

  it("first error state retains every submitted value", () => {
    const first = withCreateProjectFormRevision(
      mapCreateProjectErrorPresentation("invalid_project_dates", filled),
      EMPTY_CREATE_PROJECT_STATE
    );

    assert.equal(first.status, "error");
    assert.equal(first.code, "invalid_project_dates");
    assert.equal(first.revision, 1);
    assert.notEqual(first.revision, EMPTY_CREATE_PROJECT_STATE.revision);
    assert.deepEqual(first.values, filled);
    assert.equal(first.values.companyId, companyId);
    assert.equal(first.values.domain, "banking");
    assert.equal(first.values.startDate, "2026-05-01");
    assert.equal(first.values.endDate, "2026-04-01");
    assert.equal(first.values.requiresThreeMonthWarning, false);
    assert.equal(first.values.requiredResidentType, "saudi");
    assert.equal(first.fieldErrors.startDate, projectsCreateCopy.errorInvalidDates);
    assert.equal(first.fieldErrors.endDate, projectsCreateCopy.errorInvalidDates);
  });

  it("consecutive errors advance revision and keep latest submitted values", () => {
    const first = withCreateProjectFormRevision(
      mapCreateProjectErrorPresentation("invalid_project_dates", filled),
      EMPTY_CREATE_PROJECT_STATE
    );

    // User corrected dates but left another invalid field (quota).
    const secondSubmission = {
      ...filled,
      startDate: "2026-04-01",
      endDate: "2026-05-01",
      quota: "1.5",
    };
    const second = withCreateProjectFormRevision(
      mapCreateProjectErrorPresentation("invalid_project_quota", secondSubmission),
      first
    );

    assert.equal(second.revision, 2);
    assert.equal(second.revision > first.revision, true);
    assert.deepEqual(second.values, secondSubmission);
    // Company/domain must survive a later non-company error (user bug).
    assert.equal(second.values.companyId, companyId);
    assert.equal(second.values.domain, "banking");
    assert.equal(second.values.startDate, "2026-04-01");
    assert.equal(second.values.endDate, "2026-05-01");
    assert.equal(second.values.quota, "1.5");
    assert.equal(second.values.name, "Full Field Survey");
    assert.equal(second.values.minAge, "18");
    assert.equal(second.values.maxAge, "55");
    assert.equal(second.values.requiredResidentType, "saudi");
    assert.equal(second.values.eligibilityNotes, "eligible only");
    assert.equal(second.values.requiresThreeMonthWarning, false);
    assert.equal(second.values.whatsappTemplateAr, "مرحبا");
    assert.equal(second.values.whatsappTemplateEn, "hello");
    assert.equal(second.values.notes, "field notes");
    assert.equal(second.fieldErrors.quota, projectsCreateCopy.errorInvalidQuota);
    // Defaults are not reintroduced as empty strings for filled fields.
    assert.notEqual(second.values.companyId, "");
    assert.notEqual(second.values.domain, "");
    assert.notEqual(second.values.companyId, "null");
    assert.notEqual(second.values.domain, "undefined");
  });

  it("RPC-safe error presentation preserves values without raw DB text", () => {
    const rpcError = withCreateProjectFormRevision(
      mapCreateProjectErrorPresentation("project_company_not_found", filled),
      EMPTY_CREATE_PROJECT_STATE
    );
    assert.equal(rpcError.revision, 1);
    assert.deepEqual(rpcError.values, filled);
    assert.equal(rpcError.formError, projectsCreateCopy.errorCompanyNotFound);
    assert.equal(rpcError.formError?.includes("SQLSTATE"), false);
    assert.equal(rpcError.formError?.includes("PostgREST"), false);
    assert.equal(rpcError.formError?.includes("create_project"), false);
  });

  it("after date fix, corrected payload can parse and succeed mapping", () => {
    const corrected = {
      ...filled,
      startDate: "2026-04-01",
      endDate: "2026-05-01",
    };
    // Simulate error recovery path values surviving then mapping cleanly.
    const preserved = withCreateProjectFormRevision(
      mapCreateProjectErrorPresentation("invalid_project_dates", filled),
      EMPTY_CREATE_PROJECT_STATE
    );
    assert.deepEqual(preserved.values.companyId ? corrected.companyId : "", companyId);

    const mapped = formValuesToCreateInputRaw(corrected);
    assert.equal(mapped.ok, true);
    if (!mapped.ok) return;
    const parsed = parseCreateProjectInput(mapped.data);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.data.companyId, companyId);
    assert.equal(parsed.data.domain, "banking");
    assert.equal(parsed.data.startDate, "2026-04-01");
    assert.equal(parsed.data.endDate, "2026-05-01");
    assert.equal(
      Object.prototype.hasOwnProperty.call(parsed.data, "status"),
      false
    );
  });
});
