import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { companiesEditCopy } from "./edit-copy";
import {
  editCompanySuccessRedirectPath,
  editCompanySuccessRevalidatePaths,
  initialEditCompanyState,
  mapEditCompanyErrorPresentation,
  readEditCompanyFormValues,
} from "./edit-form";
import { buildUpdateCompanyRpcArgs, parseUpdateCompanyInput } from "./input";
import type { CompanyDetail } from "./types";

const company: CompanyDetail = {
  companyId: "11111111-1111-1111-1111-111111111111",
  accountId: "22222222-2222-2222-2222-222222222222",
  name: "Acme",
  contactPerson: null,
  phone: "966512345678",
  notes: null,
  createdBy: null,
  updatedBy: null,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-10T08:00:00.000Z",
  activeProjectsCount: 1,
  completedProjectsCount: 0,
};

describe("initialEditCompanyState", () => {
  it("preloads fields and authoritative concurrency token", () => {
    const state = initialEditCompanyState(company);
    assert.equal(state.values.companyId, company.companyId);
    assert.equal(state.values.expectedUpdatedAt, company.updatedAt);
    assert.equal(state.values.name, "Acme");
    assert.equal(state.values.contactPerson, "");
    assert.equal(state.values.phone, "966512345678");
    assert.equal(state.values.notes, "");
    assert.equal(state.status, "idle");
    assert.equal(state.showReload, false);
  });
});

describe("readEditCompanyFormValues", () => {
  it("reads hidden concurrency fields and write fields", () => {
    const fd = new FormData();
    fd.set("company_id", company.companyId);
    fd.set("expected_updated_at", company.updatedAt);
    fd.set("name", "Beta");
    fd.set("contact_person", "Ali");
    fd.set("phone", "0511111111");
    fd.set("notes", "n");
    assert.deepEqual(readEditCompanyFormValues(fd), {
      companyId: company.companyId,
      expectedUpdatedAt: company.updatedAt,
      name: "Beta",
      contactPerson: "Ali",
      phone: "0511111111",
      notes: "n",
    });
  });
});

describe("parseUpdateCompanyInput from form values", () => {
  it("accepts valid complete update", () => {
    const parsed = parseUpdateCompanyInput({
      companyId: company.companyId,
      expectedUpdatedAt: company.updatedAt,
      name: "  New  Name ",
      contactPerson: "  ",
      phone: "05 1234 5678",
      notes: "  note ",
    });
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.deepEqual(buildUpdateCompanyRpcArgs(parsed.data), {
      p_company_id: company.companyId,
      p_name: "New Name",
      p_expected_updated_at: company.updatedAt,
      p_contact_person: null,
      p_phone: "966512345678",
      p_notes: "note",
    });
  });

  it("fails closed without company id or expected timestamp", () => {
    assert.equal(
      parseUpdateCompanyInput({
        companyId: "",
        expectedUpdatedAt: company.updatedAt,
        name: "X",
      }).ok,
      false
    );
    const missingTs = parseUpdateCompanyInput({
      companyId: company.companyId,
      name: "X",
    });
    assert.equal(missingTs.ok, false);
    if (!missingTs.ok) assert.equal(missingTs.code, "stale_company_version");

    const badTs = parseUpdateCompanyInput({
      companyId: company.companyId,
      expectedUpdatedAt: "not-a-date",
      name: "X",
    });
    assert.equal(badTs.ok, false);
  });
});

describe("mapEditCompanyErrorPresentation", () => {
  const values = {
    companyId: company.companyId,
    expectedUpdatedAt: company.updatedAt,
    name: "Acme",
    contactPerson: "",
    phone: "",
    notes: "",
  };

  it("maps field and form errors including stale version", () => {
    assert.equal(
      mapEditCompanyErrorPresentation("invalid_company_name", values)
        .fieldErrors.name,
      companiesEditCopy.errorInvalidName
    );
    const stale = mapEditCompanyErrorPresentation(
      "stale_company_version",
      values
    );
    assert.equal(stale.formError, companiesEditCopy.errorStale);
    assert.equal(stale.showReload, true);
    assert.equal(stale.formError?.includes("SQLSTATE"), false);

    const notFound = mapEditCompanyErrorPresentation(
      "company_not_found",
      values
    );
    assert.equal(notFound.formError, companiesEditCopy.errorNotFound);
    assert.equal(notFound.showReload, false);
  });
});

describe("edit success navigation", () => {
  it("revalidates list/detail/edit and redirects to detail", () => {
    const id = company.companyId;
    assert.deepEqual(editCompanySuccessRevalidatePaths(id), [
      "/companies",
      `/companies/${id}`,
      `/companies/${id}/edit`,
    ]);
    assert.equal(editCompanySuccessRedirectPath(id), `/companies/${id}`);
  });
});
