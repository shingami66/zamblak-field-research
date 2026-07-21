import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { projectsDetailCopy } from "./detail-copy";
import {
  formatProjectAgeRange,
  isTerminalProjectStatus,
  projectResidentLabel,
  projectTransitionActionLabel,
  projectsDetailErrorBehavior,
  projectsTransitionErrorMessage,
  toProjectDetailView,
} from "./detail-view-model";
import type { ProjectDetail } from "./types";

const base: ProjectDetail = {
  projectId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  projectName: "مسح ميداني",
  companyId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  companyName: "شركة أكمي",
  domain: "telecom",
  status: "draft",
  startDate: "2026-01-15",
  endDate: null,
  quota: null,
  minAge: 18,
  maxAge: null,
  requiredResidentType: "any",
  eligibilityNotes: null,
  requiresThreeMonthWarning: true,
  whatsappTemplateAr: null,
  whatsappTemplateEn: "Hello",
  notes: "ops",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-02T12:00:00.000Z",
};

describe("formatProjectAgeRange", () => {
  it("formats null, min-only, max-only, and both", () => {
    assert.equal(formatProjectAgeRange(null, null), "غير محدد");
    assert.equal(formatProjectAgeRange(18, null), "من 18 سنة");
    assert.equal(formatProjectAgeRange(null, 60), "حتى 60 سنة");
    assert.equal(formatProjectAgeRange(18, 60), "من 18 إلى 60 سنة");
  });
});

describe("toProjectDetailView", () => {
  it("maps labels, null fallbacks, hrefs, and expectedUpdatedAt", () => {
    const v = toProjectDetailView(base);
    assert.equal(v.projectName, "مسح ميداني");
    assert.equal(v.companyName, "شركة أكمي");
    assert.equal(v.domainLabel, "telecom");
    assert.equal(v.statusLabel, "مسودة");
    assert.equal(v.endDateLabel, "غير محدد");
    assert.equal(v.quotaLabel, "غير محددة");
    assert.equal(v.ageRangeLabel, "من 18 سنة");
    assert.equal(v.residentLabel, "الجميع");
    assert.equal(v.threeMonthLabel, projectsDetailCopy.threeMonthYes);
    assert.equal(v.eligibilityIsEmpty, true);
    assert.equal(v.eligibilityNotesLabel, projectsDetailCopy.emptyText);
    assert.equal(v.whatsappEnIsEmpty, false);
    assert.equal(v.expectedUpdatedAt, base.updatedAt);
    assert.equal(v.backHref, "/projects");
    assert.equal(v.editHref, `/projects/${base.projectId}/edit`);
    assert.equal(v.canEdit, true);
    assert.equal(v.isTerminal, false);
    assert.deepEqual(
      v.lifecycleActions.map((a) => a.targetStatus),
      ["active", "cancelled"]
    );
  });

  it("false warning copy and empty whatsapp AR", () => {
    const v = toProjectDetailView({
      ...base,
      requiresThreeMonthWarning: false,
      whatsappTemplateAr: null,
    });
    assert.equal(v.threeMonthLabel, projectsDetailCopy.threeMonthNo);
    assert.equal(v.whatsappArLabel, projectsDetailCopy.emptyText);
  });

  it("does not expose finance or raw UUID labels", () => {
    const v = toProjectDetailView(base);
    const keys = Object.keys(v);
    for (const forbidden of [
      "price",
      "payment",
      "settlement",
      "accountId",
      "createdBy",
      "amountDue",
    ]) {
      assert.equal(keys.includes(forbidden), false);
    }
    assert.equal(v.projectName.includes(base.projectId), false);
    assert.equal(v.companyName.includes(base.companyId), false);
  });

  it("terminal statuses: no lifecycle, no edit", () => {
    const closed = toProjectDetailView({ ...base, status: "closed" });
    assert.deepEqual(closed.lifecycleActions, []);
    assert.equal(closed.canEdit, false);
    assert.equal(closed.isTerminal, true);
    assert.equal(isTerminalProjectStatus("closed"), true);

    const cancelled = toProjectDetailView({ ...base, status: "cancelled" });
    assert.deepEqual(cancelled.lifecycleActions, []);
    assert.equal(cancelled.canEdit, false);
    assert.equal(isTerminalProjectStatus("cancelled"), true);
  });

  it("active status allows closed and cancelled and remains editable", () => {
    const v = toProjectDetailView({ ...base, status: "active" });
    assert.deepEqual(
      v.lifecycleActions.map((a) => a.targetStatus),
      ["closed", "cancelled"]
    );
    assert.equal(v.canEdit, true);
  });
});

describe("Arabic label helpers", () => {
  it("maps resident and transition labels", () => {
    assert.equal(projectResidentLabel("any"), "الجميع");
    assert.equal(projectResidentLabel("saudi"), "سعودي");
    assert.equal(projectResidentLabel("non_saudi"), "غير سعودي");
    assert.equal(projectResidentLabel("unknown"), "غير محدد");
    assert.equal(
      projectTransitionActionLabel("active"),
      projectsDetailCopy.transitionToActive
    );
    assert.equal(
      projectTransitionActionLabel("closed"),
      projectsDetailCopy.transitionToClosed
    );
    assert.equal(
      projectTransitionActionLabel("cancelled"),
      projectsDetailCopy.transitionToCancelled
    );
  });
});

describe("projectsDetailErrorBehavior", () => {
  it("maps not found cases safely without leaking account existence", () => {
    assert.equal(
      projectsDetailErrorBehavior("project_not_found").kind,
      "not_found"
    );
    assert.equal(
      projectsDetailErrorBehavior("invalid_project_id").kind,
      "not_found"
    );
    assert.equal(
      projectsDetailErrorBehavior("project_company_not_found").kind,
      "not_found"
    );
    const access = projectsDetailErrorBehavior("project_access_denied");
    assert.equal(access.kind, "message");
    assert.equal(access.message, projectsDetailCopy.errorAccess);
    const unexpected = projectsDetailErrorBehavior("unexpected_project_error");
    assert.equal(unexpected.message?.includes("SQLSTATE"), false);
  });
});

describe("projectsTransitionErrorMessage", () => {
  it("maps transition codes without raw database text", () => {
    assert.equal(
      projectsTransitionErrorMessage("project_access_denied"),
      projectsDetailCopy.errorTransitionAccess
    );
    assert.equal(
      projectsTransitionErrorMessage("stale_project_version"),
      projectsDetailCopy.errorStale
    );
    assert.equal(
      projectsTransitionErrorMessage("invalid_project_status_transition"),
      projectsDetailCopy.errorTransitionInvalid
    );
    const msg = projectsTransitionErrorMessage("unexpected_project_error");
    assert.equal(msg.includes("transition_project_status"), false);
    assert.equal(msg.includes("SQLSTATE"), false);
  });
});
