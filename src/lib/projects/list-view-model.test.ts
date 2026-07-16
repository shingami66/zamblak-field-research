import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { projectsListCopy } from "./list-copy";
import {
  formatProjectDateOnly,
  formatProjectQuota,
  projectDomainLabel,
  projectStatusLabel,
  projectsListErrorMessage,
  toProjectListItemView,
} from "./list-view-model";
import type { ProjectListItem } from "./types";

const base: ProjectListItem = {
  projectId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  projectName: "مسح ميداني",
  companyId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  companyName: "شركة أكمي",
  domain: "telecom",
  status: "draft",
  startDate: "2026-01-15",
  endDate: null,
  quota: null,
  updatedAt: "2026-07-02T12:00:00.000Z",
};

describe("Arabic status and domain labels", () => {
  it("maps exact status labels", () => {
    assert.equal(projectStatusLabel("draft"), "مسودة");
    assert.equal(projectStatusLabel("active"), "نشط");
    assert.equal(projectStatusLabel("closed"), "مغلق");
    assert.equal(projectStatusLabel("cancelled"), "ملغي");
  });

  it("maps exact domain labels", () => {
    assert.equal(projectDomainLabel("telecom"), "اتصالات");
    assert.equal(projectDomainLabel("banking"), "بنوك");
    assert.equal(projectDomainLabel("insurance"), "تأمين");
    assert.equal(projectDomainLabel("product"), "منتجات");
    assert.equal(projectDomainLabel("other"), "أخرى");
  });
});

describe("date and quota fallbacks", () => {
  it("uses null date fallback without shifting YYYY-MM-DD", () => {
    assert.equal(formatProjectDateOnly(null), projectsListCopy.notSpecified);
    const label = formatProjectDateOnly("2026-01-15");
    assert.notEqual(label, projectsListCopy.notSpecified);
    assert.equal(label.includes("2026") || label.includes("15"), true);
    // Must not produce the previous local calendar day from UTC midnight shift.
    assert.equal(label.includes("14"), false);
  });

  it("uses null quota fallback", () => {
    assert.equal(formatProjectQuota(null), projectsListCopy.quotaUnspecified);
    assert.equal(formatProjectQuota(12), "12");
  });
});

describe("toProjectListItemView", () => {
  it("maps presentation fields and detail/create-adjacent hrefs", () => {
    const v = toProjectListItemView(base);
    assert.equal(v.projectName, "مسح ميداني");
    assert.equal(v.companyName, "شركة أكمي");
    assert.equal(v.domainLabel, "اتصالات");
    assert.equal(v.statusLabel, "مسودة");
    assert.equal(v.endDateLabel, projectsListCopy.notSpecified);
    assert.equal(v.quotaLabel, projectsListCopy.quotaUnspecified);
    assert.equal(v.detailHref, `/projects/${base.projectId}`);
    assert.equal(v.editHref, `/projects/${base.projectId}/edit`);
  });

  it("does not render raw UUIDs in visible labels", () => {
    const v = toProjectListItemView(base);
    assert.equal(v.projectName.includes(base.projectId), false);
    assert.equal(v.companyName.includes(base.companyId), false);
    assert.equal(v.statusLabel.includes(base.projectId), false);
    assert.equal(v.domainLabel.includes(base.companyId), false);
  });

  it("contains no finance fields", () => {
    const v = toProjectListItemView(base);
    const keys = Object.keys(v);
    for (const forbidden of [
      "price",
      "payment",
      "settlement",
      "amountDue",
      "accountId",
      "financial",
    ]) {
      assert.equal(keys.includes(forbidden), false);
    }
  });
});

describe("projectsListErrorMessage", () => {
  it("maps known codes to safe Arabic messages", () => {
    assert.equal(
      projectsListErrorMessage("project_access_denied"),
      projectsListCopy.errorAccess
    );
    assert.equal(
      projectsListErrorMessage("project_profile_unavailable"),
      projectsListCopy.errorProfile
    );
    assert.equal(
      projectsListErrorMessage("invalid_project_pagination"),
      projectsListCopy.errorPagination
    );
    assert.equal(
      projectsListErrorMessage("invalid_project_text_length"),
      projectsListCopy.errorTextLength
    );
    assert.equal(
      projectsListErrorMessage("invalid_project_status"),
      projectsListCopy.errorStatus
    );
    assert.equal(
      projectsListErrorMessage("invalid_company_id"),
      projectsListCopy.errorCompany
    );
  });

  it("uses generic message for unexpected codes and never exposes SQL prose", () => {
    const msg = projectsListErrorMessage("unexpected_project_error");
    assert.equal(msg, projectsListCopy.errorUnexpected);
    assert.equal(msg.includes("SQLSTATE"), false);
    assert.equal(msg.includes("postgres"), false);
    assert.equal(msg.includes("list_projects"), false);
  });
});
