import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  formValuesToUpdateInputRaw,
  initialEditProjectState,
} from "./edit-form";
import { buildUpdateProjectRpcArgs, parseUpdateProjectInput } from "./input";
import type { ProjectDetail } from "./types";

const here = dirname(fileURLToPath(import.meta.url));
const repoSrc = join(here, "..", "..");

const FORBIDDEN = [
  "project_financial_settings",
  "price_per_accepted_form",
  "payments",
  "settlement",
  "amount_due",
  "amount_paid",
  "participation_pricing",
  "project_financial_summary",
  "support_project_directory",
  "service_role",
  'from("projects")',
  "from('projects')",
  'from("companies")',
  "from('companies')",
  "transitionProjectStatus",
  "createProject",
  "Date.now",
  "toISOString()",
] as const;

const project: ProjectDetail = {
  projectId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  projectName: "A",
  companyId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  companyName: "C",
  domain: "telecom",
  status: "draft",
  startDate: null,
  endDate: null,
  quota: null,
  minAge: null,
  maxAge: null,
  requiredResidentType: "any",
  eligibilityNotes: null,
  requiresThreeMonthWarning: true,
  whatsappTemplateAr: null,
  whatsappTemplateEn: null,
  notes: null,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-10T08:00:00.000Z",
};

describe("Projects edit page source boundary", () => {
  it("update mapping excludes status and preserves expectedUpdatedAt", () => {
    const mapped = formValuesToUpdateInputRaw(
      initialEditProjectState(project).values
    );
    assert.equal(mapped.ok, true);
    if (!mapped.ok) return;
    const parsed = parseUpdateProjectInput(mapped.data);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const args = buildUpdateProjectRpcArgs(parsed.data);
    assert.equal(args.p_expected_updated_at, project.updatedAt);
    assert.equal("p_status" in args, false);
  });

  it("edit sources avoid forbidden runtime references", () => {
    const files = [
      join(here, "edit-copy.ts"),
      join(here, "edit-form.ts"),
      join(repoSrc, "app", "projects", "[projectId]", "edit", "page.tsx"),
      join(repoSrc, "app", "projects", "[projectId]", "edit", "actions.ts"),
      join(repoSrc, "app", "projects", "[projectId]", "edit", "loading.tsx"),
      join(repoSrc, "components", "projects", "EditProjectForm.tsx"),
    ];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const token of FORBIDDEN) {
        assert.equal(
          text.includes(token),
          false,
          `${file} must not contain ${token}`
        );
      }
    }

    const actions = readFileSync(
      join(repoSrc, "app", "projects", "[projectId]", "edit", "actions.ts"),
      "utf8"
    );
    assert.equal(actions.includes("updateProject"), true);
    assert.equal(actions.includes("getProject"), true);
    assert.equal(actions.includes("expectedUpdatedAt"), true);
    assert.equal(actions.includes("project_company_locked"), true);

    const page = readFileSync(
      join(repoSrc, "app", "projects", "[projectId]", "edit", "page.tsx"),
      "utf8"
    );
    assert.equal(page.includes("getProject"), true);
    assert.equal(page.includes("listCompanies"), true);
    assert.equal(page.includes("isEditableProjectStatus"), true);
    assert.equal(page.includes("closedReadOnly"), true);

    const form = readFileSync(
      join(repoSrc, "components", "projects", "EditProjectForm.tsx"),
      "utf8"
    );
    assert.equal(form.includes('name="status"'), false);
    assert.equal(form.includes("expected_updated_at"), true);
    assert.equal(form.includes("companyLocked"), true);
  });
});
