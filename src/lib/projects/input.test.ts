import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCreateProjectRpcArgs,
  buildListProjectsRpcArgs,
  buildTransitionProjectStatusRpcArgs,
  buildUpdateProjectRpcArgs,
  collapseWhitespace,
  parseCreateProjectInput,
  parseGetProjectInput,
  parseListProjectsInput,
  parseTransitionProjectStatusInput,
  parseUpdateProjectInput,
} from "./input";

const companyId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const projectId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const expectedUpdatedAt = "2026-07-16T10:00:00.000Z";

const validWrite = {
  name: "  Field   Study ",
  companyId,
  domain: "telecom" as const,
  startDate: "2026-01-01",
  endDate: "2026-02-01",
  quota: 5,
  minAge: 18,
  maxAge: 60,
  requiredResidentType: "saudi" as const,
  eligibilityNotes: "  notes  ",
  requiresThreeMonthWarning: false,
  whatsappTemplateAr: "",
  whatsappTemplateEn: null,
  notes: "   ",
};

describe("collapseWhitespace", () => {
  it("trims and collapses internal runs", () => {
    assert.equal(collapseWhitespace("  Field   Study  "), "Field Study");
  });
});

describe("parseListProjectsInput", () => {
  it("applies defaults", () => {
    const r = parseListProjectsInput({});
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.deepEqual(r.data, {
        search: null,
        companyId: null,
        status: null,
        limit: 25,
        offset: 0,
      });
    }
  });

  it("trims search and treats empty as null", () => {
    const empty = parseListProjectsInput({ search: "   " });
    assert.equal(empty.ok, true);
    if (empty.ok) assert.equal(empty.data.search, null);

    const ok = parseListProjectsInput({ search: "  acme " });
    assert.equal(ok.ok, true);
    if (ok.ok) assert.equal(ok.data.search, "acme");
  });

  it("rejects overlong search with text-length token", () => {
    const r = parseListProjectsInput({ search: "x".repeat(121) });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, "invalid_project_text_length");
  });

  it("rejects invalid pagination and UUID company filter", () => {
    assert.equal(parseListProjectsInput({ limit: 0 }).ok, false);
    assert.equal(parseListProjectsInput({ limit: 51 }).ok, false);
    assert.equal(parseListProjectsInput({ offset: -1 }).ok, false);
    const badCompany = parseListProjectsInput({ companyId: "not-uuid" });
    assert.equal(badCompany.ok, false);
    if (!badCompany.ok) assert.equal(badCompany.code, "invalid_company_id");
  });

  it("rejects invalid status", () => {
    const r = parseListProjectsInput({ status: "open" });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, "invalid_project_status");
  });
});

describe("parseGetProjectInput", () => {
  it("requires UUID", () => {
    assert.equal(parseGetProjectInput({}).ok, false);
    assert.equal(parseGetProjectInput({ projectId: "x" }).ok, false);
    const ok = parseGetProjectInput({ projectId });
    assert.equal(ok.ok, true);
    if (ok.ok) assert.equal(ok.data.projectId, projectId);
  });
});

describe("parseCreateProjectInput", () => {
  it("accepts valid values, normalizes whitespace, nullifies empty long text", () => {
    const r = parseCreateProjectInput(validWrite);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.data.name, "Field Study");
      assert.equal(r.data.eligibilityNotes, "notes");
      assert.equal(r.data.whatsappTemplateAr, null);
      assert.equal(r.data.notes, null);
      assert.equal(r.data.requiresThreeMonthWarning, false);
      assert.equal(
        Object.prototype.hasOwnProperty.call(r.data, "status"),
        false
      );
    }
  });

  it("defaults requiresThreeMonthWarning to true", () => {
    const r = parseCreateProjectInput({
      name: "A",
      companyId,
      domain: "banking",
    });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.data.requiresThreeMonthWarning, true);
  });

  it("enforces name bounds", () => {
    assert.equal(parseCreateProjectInput({ name: "", companyId, domain: "telecom" }).ok, false);
    assert.equal(
      parseCreateProjectInput({
        name: "n".repeat(121),
        companyId,
        domain: "telecom",
      }).ok,
      false
    );
  });

  it("rejects each long-text field over 2000", () => {
    const long = "n".repeat(2001);
    for (const key of [
      "eligibilityNotes",
      "whatsappTemplateAr",
      "whatsappTemplateEn",
      "notes",
    ] as const) {
      const r = parseCreateProjectInput({
        name: "Ok",
        companyId,
        domain: "telecom",
        [key]: long,
      });
      assert.equal(r.ok, false);
      if (!r.ok) assert.equal(r.code, "invalid_project_text_length");
    }
  });

  it("accepts arbitrary trimmed Arabic and English domains", () => {
    for (const domain of ["  الاتصالات  ", "Healthcare", "الرعاية الصحية / Health"]) {
      const parsed = parseCreateProjectInput({ name: "Ok", companyId, domain });
      assert.equal(parsed.ok, true);
      if (parsed.ok) assert.equal(parsed.data.domain, domain.trim());
    }
  });

  it("rejects blank or overlong domain, resident, quota, ages, date order", () => {
    for (const domain of ["   ", "x".repeat(121)]) {
      const parsed = parseCreateProjectInput({ name: "Ok", companyId, domain });
      assert.equal(parsed.ok, false);
      if (!parsed.ok) assert.equal(parsed.code, "invalid_project_domain");
    }
    assert.equal(
      parseCreateProjectInput({
        name: "Ok",
        companyId,
        domain: "telecom",
        requiredResidentType: "alien",
      }).ok,
      false
    );
    assert.equal(
      parseCreateProjectInput({
        name: "Ok",
        companyId,
        domain: "telecom",
        quota: -1,
      }).ok,
      false
    );
    const ages = parseCreateProjectInput({
      name: "Ok",
      companyId,
      domain: "telecom",
      minAge: 40,
      maxAge: 20,
    });
    assert.equal(ages.ok, false);
    if (!ages.ok) assert.equal(ages.code, "invalid_project_age_range");

    const dates = parseCreateProjectInput({
      name: "Ok",
      companyId,
      domain: "telecom",
      startDate: "2026-05-01",
      endDate: "2026-04-01",
    });
    assert.equal(dates.ok, false);
    if (!dates.ok) assert.equal(dates.code, "invalid_project_dates");

    const badDate = parseCreateProjectInput({
      name: "Ok",
      companyId,
      domain: "telecom",
      startDate: "16-07-2026",
    });
    assert.equal(badDate.ok, false);
  });

  it("rejects invalid company UUID", () => {
    const r = parseCreateProjectInput({
      name: "Ok",
      companyId: "nope",
      domain: "telecom",
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, "invalid_company_id");
  });
});

describe("parseUpdateProjectInput", () => {
  it("requires expectedUpdatedAt and valid project id", () => {
    const missingTs = parseUpdateProjectInput({
      projectId,
      name: "Ok",
      companyId,
      domain: "telecom",
    });
    assert.equal(missingTs.ok, false);
    if (!missingTs.ok) assert.equal(missingTs.code, "stale_project_version");

    const badId = parseUpdateProjectInput({
      projectId: "not-a-uuid",
      name: "Ok",
      companyId,
      domain: "telecom",
      expectedUpdatedAt,
    });
    assert.equal(badId.ok, false);
  });

  it("accepts a complete update payload without status", () => {
    const r = parseUpdateProjectInput({
      projectId,
      expectedUpdatedAt,
      ...validWrite,
    });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.data.projectId, projectId);
      assert.equal(r.data.expectedUpdatedAt, expectedUpdatedAt);
      assert.equal(r.data.name, "Field Study");
      assert.equal(r.data.domain, "telecom");
      assert.equal(
        Object.prototype.hasOwnProperty.call(r.data, "status"),
        false
      );
    }
  });
});

describe("parseTransitionProjectStatusInput", () => {
  it("requires expectedUpdatedAt and valid target status", () => {
    const missing = parseTransitionProjectStatusInput({
      projectId,
      targetStatus: "active",
    });
    assert.equal(missing.ok, false);
    if (!missing.ok) assert.equal(missing.code, "stale_project_version");

    const badStatus = parseTransitionProjectStatusInput({
      projectId,
      expectedUpdatedAt,
      targetStatus: "reopen",
    });
    assert.equal(badStatus.ok, false);
    if (!badStatus.ok) assert.equal(badStatus.code, "invalid_project_status");
  });

  it("accepts a complete transition payload", () => {
    const r = parseTransitionProjectStatusInput({
      projectId,
      expectedUpdatedAt,
      targetStatus: "active",
    });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.deepEqual(r.data, {
        projectId,
        expectedUpdatedAt,
        targetStatus: "active",
      });
    }
  });
});

describe("RPC argument builders", () => {
  it("maps list parameter names exactly", () => {
    assert.deepEqual(
      buildListProjectsRpcArgs({
        search: "acme",
        companyId,
        status: "draft",
        limit: 10,
        offset: 5,
      }),
      {
        p_search: "acme",
        p_company_id: companyId,
        p_status: "draft",
        p_limit: 10,
        p_offset: 5,
      }
    );
  });

  it("maps create args without status/account/audit keys", () => {
    const parsed = parseCreateProjectInput(validWrite);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const args = buildCreateProjectRpcArgs(parsed.data);
    assert.deepEqual(Object.keys(args).sort(), [
      "p_company_id",
      "p_domain",
      "p_eligibility_notes",
      "p_end_date",
      "p_max_age",
      "p_min_age",
      "p_name",
      "p_notes",
      "p_quota",
      "p_required_resident_type",
      "p_requires_three_month_warning",
      "p_start_date",
      "p_whatsapp_template_ar",
      "p_whatsapp_template_en",
    ]);
    assert.equal(
      Object.prototype.hasOwnProperty.call(args, "p_status"),
      false
    );
    assert.equal(
      Object.prototype.hasOwnProperty.call(args, "p_account_id"),
      false
    );
    assert.equal(args.p_name, "Field Study");
    assert.equal(args.p_company_id, companyId);
  });

  it("maps update with expected timestamp and without status", () => {
    const parsed = parseUpdateProjectInput({
      projectId,
      expectedUpdatedAt,
      ...validWrite,
    });
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const args = buildUpdateProjectRpcArgs(parsed.data);
    assert.equal(args.p_project_id, projectId);
    assert.equal(args.p_expected_updated_at, expectedUpdatedAt);
    assert.equal(
      Object.prototype.hasOwnProperty.call(args, "p_status"),
      false
    );
    assert.equal(
      Object.prototype.hasOwnProperty.call(args, "p_target_status"),
      false
    );
  });

  it("maps transition args exactly", () => {
    assert.deepEqual(
      buildTransitionProjectStatusRpcArgs({
        projectId,
        expectedUpdatedAt,
        targetStatus: "cancelled",
      }),
      {
        p_project_id: projectId,
        p_expected_updated_at: expectedUpdatedAt,
        p_target_status: "cancelled",
      }
    );
  });
});
