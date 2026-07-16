import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { companiesDetailCopy } from "./detail-copy";
import {
  companiesDetailErrorBehavior,
  toCompanyDetailView,
} from "./detail-view-model";
import type { CompanyDetail } from "./types";

const base: CompanyDetail = {
  companyId: "11111111-1111-1111-1111-111111111111",
  accountId: "22222222-2222-2222-2222-222222222222",
  name: "Acme",
  contactPerson: null,
  phone: null,
  notes: null,
  createdBy: null,
  updatedBy: null,
  createdAt: "2026-07-01T12:00:00.000Z",
  updatedAt: "2026-07-02T15:30:00.000Z",
  activeProjectsCount: 0,
  completedProjectsCount: 0,
};

describe("toCompanyDetailView", () => {
  it("maps full company with nullables and zero counts", () => {
    const v = toCompanyDetailView(base);
    assert.equal(v.name, "Acme");
    assert.equal(v.contactPersonLabel, companiesDetailCopy.notProvided);
    assert.equal(v.phoneLabel, companiesDetailCopy.notProvided);
    assert.equal(v.phoneIsLtr, false);
    assert.equal(v.notesLabel, companiesDetailCopy.notProvided);
    assert.equal(v.notesIsEmpty, true);
    assert.equal(v.activeProjectsCount, 0);
    assert.equal(v.completedProjectsCount, 0);
    assert.equal(v.backHref, "/companies");
    assert.equal(v.editHref, `/companies/${base.companyId}/edit`);
    assert.equal("accountId" in v, false);
    assert.equal("price" in v, false);
  });

  it("shows phone LTR and notes when present", () => {
    const v = toCompanyDetailView({
      ...base,
      contactPerson: "Ali",
      phone: "966512345678",
      notes: "line1\nline2",
      activeProjectsCount: 2,
      completedProjectsCount: 1,
    });
    assert.equal(v.contactPersonLabel, "Ali");
    assert.equal(v.phoneLabel, "966512345678");
    assert.equal(v.phoneIsLtr, true);
    assert.equal(v.notesLabel, "line1\nline2");
    assert.equal(v.notesIsEmpty, false);
    assert.equal(v.activeProjectsCount, 2);
  });
});

describe("companiesDetailErrorBehavior", () => {
  it("maps not found to not_found kind", () => {
    assert.deepEqual(companiesDetailErrorBehavior("company_not_found"), {
      kind: "not_found",
    });
  });

  it("maps access denied and unexpected to safe messages", () => {
    const access = companiesDetailErrorBehavior("company_access_denied");
    assert.equal(access.kind, "message");
    assert.equal(access.message, companiesDetailCopy.errorAccess);

    const unexpected = companiesDetailErrorBehavior("unexpected_company_error");
    assert.equal(unexpected.kind, "message");
    assert.equal(unexpected.message, companiesDetailCopy.errorUnexpected);
    assert.equal(unexpected.message?.includes("SQLSTATE"), false);
  });
});
