import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { projectsEditCopy } from "./edit-copy";
import {
  editProjectSuccessRedirectPath,
  editProjectSuccessRevalidatePaths,
  formValuesToUpdateInputRaw,
  initialEditProjectState,
  isCompanyLockedStatus,
  isEditableProjectStatus,
  mapEditProjectErrorPresentation,
  projectStatusEditLabel,
  readEditProjectFormValues,
} from "./edit-form";
import {
  buildUpdateProjectRpcArgs,
  parseUpdateProjectInput,
} from "./input";
import type { ProjectDetail } from "./types";

const project: ProjectDetail = {
  projectId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  projectName: "Field Study",
  companyId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  companyName: "Acme Co",
  domain: "telecom",
  status: "draft",
  startDate: "2026-01-01",
  endDate: null,
  quota: 10,
  minAge: 18,
  maxAge: null,
  requiredResidentType: "any",
  eligibilityNotes: null,
  requiresThreeMonthWarning: true,
  whatsappTemplateAr: null,
  whatsappTemplateEn: "Hello",
  notes: null,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-10T08:00:00.000Z",
};

describe("status editability helpers", () => {
  it("draft/active editable; closed/cancelled not", () => {
    assert.equal(isEditableProjectStatus("draft"), true);
    assert.equal(isEditableProjectStatus("active"), true);
    assert.equal(isEditableProjectStatus("closed"), false);
    assert.equal(isEditableProjectStatus("cancelled"), false);
    assert.equal(isCompanyLockedStatus("active"), true);
    assert.equal(isCompanyLockedStatus("draft"), false);
  });
});

describe("initialEditProjectState", () => {
  it("preloads fields and exact concurrency token without null strings", () => {
    const state = initialEditProjectState(project);
    assert.equal(state.values.projectId, project.projectId);
    assert.equal(state.values.expectedUpdatedAt, project.updatedAt);
    assert.equal(state.values.name, "Field Study");
    assert.equal(state.values.companyId, project.companyId);
    assert.equal(state.values.domain, "telecom");
    assert.equal(state.values.startDate, "2026-01-01");
    assert.equal(state.values.endDate, "");
    assert.equal(state.values.quota, "10");
    assert.equal(state.values.minAge, "18");
    assert.equal(state.values.maxAge, "");
    assert.equal(state.values.eligibilityNotes, "");
    assert.equal(state.values.whatsappTemplateEn, "Hello");
    assert.equal(state.values.notes, "");
    assert.equal(state.values.requiresThreeMonthWarning, true);
    assert.equal(state.values.expectedUpdatedAt.includes("null"), false);
    assert.equal(state.showReload, false);
  });
});

describe("readEditProjectFormValues", () => {
  it("reads hidden concurrency fields and operational fields", () => {
    const fd = new FormData();
    fd.set("project_id", project.projectId);
    fd.set("expected_updated_at", project.updatedAt);
    fd.set("name", "Beta");
    fd.set("company_id", project.companyId);
    fd.set("domain", "banking");
    fd.set("start_date", "2026-02-01");
    fd.set("end_date", "2026-03-01");
    fd.set("quota", "5");
    fd.set("min_age", "20");
    fd.set("max_age", "50");
    fd.set("required_resident_type", "saudi");
    fd.set("eligibility_notes", "ok");
    fd.set("requires_three_month_warning", "true");
    fd.set("whatsapp_template_ar", "مرحبا");
    fd.set("whatsapp_template_en", "hi");
    fd.set("notes", "n");
    const values = readEditProjectFormValues(fd);
    assert.equal(values.projectId, project.projectId);
    assert.equal(values.expectedUpdatedAt, project.updatedAt);
    assert.equal(values.name, "Beta");
    assert.equal(values.requiresThreeMonthWarning, true);
    assert.equal(values.domain, "banking");
  });

  it("checkbox absent becomes false", () => {
    const fd = new FormData();
    fd.set("project_id", project.projectId);
    fd.set("expected_updated_at", project.updatedAt);
    fd.set("name", "X");
    fd.set("company_id", project.companyId);
    fd.set("domain", "telecom");
    assert.equal(
      readEditProjectFormValues(fd).requiresThreeMonthWarning,
      false
    );
  });
});

describe("formValuesToUpdateInputRaw + parseUpdateProjectInput", () => {
  it("maps valid update without status/account/audit", () => {
    const state = initialEditProjectState(project);
    const mapped = formValuesToUpdateInputRaw(state.values);
    assert.equal(mapped.ok, true);
    if (!mapped.ok) return;
    const parsed = parseUpdateProjectInput(mapped.data);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const args = buildUpdateProjectRpcArgs(parsed.data);
    assert.equal(args.p_project_id, project.projectId);
    assert.equal(args.p_expected_updated_at, project.updatedAt);
    assert.equal(args.p_name, "Field Study");
    assert.equal(args.p_company_id, project.companyId);
    assert.equal(
      Object.prototype.hasOwnProperty.call(args, "p_status"),
      false
    );
    assert.equal(
      Object.prototype.hasOwnProperty.call(args, "p_account_id"),
      false
    );
  });

  it("rejects missing expectedUpdatedAt and invalid name", () => {
    const missingTs = formValuesToUpdateInputRaw({
      ...initialEditProjectState(project).values,
      expectedUpdatedAt: "",
    });
    assert.equal(missingTs.ok, false);
    if (!missingTs.ok)
      assert.equal(missingTs.code, "stale_project_version");

    const badName = formValuesToUpdateInputRaw({
      ...initialEditProjectState(project).values,
      name: "n".repeat(121),
    });
    assert.equal(badName.ok, true);
    if (!badName.ok) return;
    const parsed = parseUpdateProjectInput(badName.data);
    assert.equal(parsed.ok, false);
  });

  it("rejects fractional quota and reversed dates", () => {
    const frac = formValuesToUpdateInputRaw({
      ...initialEditProjectState(project).values,
      quota: "1.5",
    });
    assert.equal(frac.ok, false);

    const dates = formValuesToUpdateInputRaw({
      ...initialEditProjectState(project).values,
      startDate: "2026-05-01",
      endDate: "2026-04-01",
    });
    assert.equal(dates.ok, true);
    if (!dates.ok) return;
    const parsed = parseUpdateProjectInput(dates.data);
    assert.equal(parsed.ok, false);
    if (!parsed.ok) assert.equal(parsed.code, "invalid_project_dates");
  });

  it("nullifies empty optional text", () => {
    const mapped = formValuesToUpdateInputRaw({
      ...initialEditProjectState(project).values,
      eligibilityNotes: "  ",
      notes: "",
      whatsappTemplateEn: "  hi  ",
    });
    assert.equal(mapped.ok, true);
    if (!mapped.ok) return;
    const parsed = parseUpdateProjectInput(mapped.data);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.data.eligibilityNotes, null);
    assert.equal(parsed.data.notes, null);
    assert.equal(parsed.data.whatsappTemplateEn, "hi");
  });
});

describe("mapEditProjectErrorPresentation", () => {
  const values = initialEditProjectState(project).values;

  it("maps field errors and stale version with reload", () => {
    assert.equal(
      mapEditProjectErrorPresentation("invalid_project_name", values)
        .fieldErrors.name,
      projectsEditCopy.errorInvalidName
    );
    const stale = mapEditProjectErrorPresentation(
      "stale_project_version",
      values
    );
    assert.equal(stale.formError, projectsEditCopy.errorStale);
    assert.equal(stale.showReload, true);
    assert.equal(stale.formError?.includes("SQLSTATE"), false);

    assert.equal(
      mapEditProjectErrorPresentation("project_company_locked", values)
        .formError,
      projectsEditCopy.errorCompanyLocked
    );
    assert.equal(
      mapEditProjectErrorPresentation("project_not_editable", values)
        .formError,
      projectsEditCopy.errorNotEditable
    );
  });
});

describe("edit success navigation", () => {
  it("revalidates list/detail/edit and redirects to detail", () => {
    const id = project.projectId;
    assert.deepEqual(editProjectSuccessRevalidatePaths(id), [
      "/projects",
      `/projects/${id}`,
      `/projects/${id}/edit`,
    ]);
    assert.equal(editProjectSuccessRedirectPath(id), `/projects/${id}`);
  });
});

describe("projectStatusEditLabel", () => {
  it("returns Arabic status labels", () => {
    assert.equal(projectStatusEditLabel("draft"), "مسودة");
    assert.equal(projectStatusEditLabel("active"), "نشط");
    assert.equal(projectStatusEditLabel("closed"), "مغلق");
    assert.equal(projectStatusEditLabel("cancelled"), "ملغي");
  });
});
