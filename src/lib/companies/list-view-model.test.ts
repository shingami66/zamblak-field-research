import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { companiesListCopy } from "./list-copy";
import {
  companiesListErrorMessage,
  toCompanyListItemView,
} from "./list-view-model";
import type { CompanySummary } from "./types";

const base: CompanySummary = {
  companyId: "11111111-1111-1111-1111-111111111111",
  accountId: "22222222-2222-2222-2222-222222222222",
  name: "Acme",
  contactPerson: null,
  phone: null,
  notes: null,
  createdBy: null,
  updatedBy: null,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-02T00:00:00.000Z",
  activeProjectsCount: 0,
  completedProjectsCount: 0,
};

describe("toCompanyListItemView", () => {
  it("uses fallbacks for null contact/phone and zero counts", () => {
    const v = toCompanyListItemView(base);
    assert.equal(v.contactPersonLabel, companiesListCopy.noContact);
    assert.equal(v.phoneLabel, companiesListCopy.noPhone);
    assert.equal(v.phoneIsLtr, false);
    assert.equal(v.activeProjectsCount, 0);
    assert.equal(v.completedProjectsCount, 0);
    assert.equal(v.detailHref, `/companies/${base.companyId}`);
    assert.equal(v.editHref, `/companies/${base.companyId}/edit`);
    assert.equal(
      "accountId" in v && (v as { accountId?: string }).accountId,
      false
    );
  });

  it("shows phone LTR when present", () => {
    const v = toCompanyListItemView({
      ...base,
      phone: "966512345678",
      contactPerson: "Ali",
    });
    assert.equal(v.phoneLabel, "966512345678");
    assert.equal(v.phoneIsLtr, true);
    assert.equal(v.contactPersonLabel, "Ali");
  });

  it("does not include financial fields", () => {
    const v = toCompanyListItemView(base);
    const keys = Object.keys(v);
    assert.equal(keys.includes("price"), false);
    assert.equal(keys.includes("payment"), false);
    assert.equal(keys.includes("financial"), false);
  });
});

describe("companiesListErrorMessage", () => {
  it("maps access denied and pagination safely", () => {
    assert.equal(
      companiesListErrorMessage("company_access_denied"),
      companiesListCopy.errorAccess
    );
    assert.equal(
      companiesListErrorMessage("invalid_pagination"),
      companiesListCopy.errorPagination
    );
  });

  it("uses generic message for unexpected and unknown codes", () => {
    assert.equal(
      companiesListErrorMessage("unexpected_company_error"),
      companiesListCopy.errorUnexpected
    );
    assert.equal(
      companiesListErrorMessage("duplicate_company_name"),
      companiesListCopy.errorUnexpected
    );
  });

  it("never returns SQL-like details", () => {
    const msg = companiesListErrorMessage("unexpected_company_error");
    assert.equal(msg.includes("SQLSTATE"), false);
    assert.equal(msg.includes("postgres"), false);
  });
});
