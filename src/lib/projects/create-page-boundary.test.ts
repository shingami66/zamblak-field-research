import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  CREATE_PROJECT_SUCCESS_REDIRECT_PATH,
  formValuesToCreateInputRaw,
} from "./create-form";
import { buildCreateProjectRpcArgs, parseCreateProjectInput } from "./input";

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
  "updateProject",
] as const;

describe("Projects create page source boundary", () => {
  it("success path is list only and create mapping excludes status", () => {
    assert.equal(CREATE_PROJECT_SUCCESS_REDIRECT_PATH, "/projects");
    const mapped = formValuesToCreateInputRaw({
      name: "A",
      companyId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
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
    });
    assert.equal(mapped.ok, true);
    if (!mapped.ok) return;
    const parsed = parseCreateProjectInput(mapped.data);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const args = buildCreateProjectRpcArgs(parsed.data);
    assert.equal("p_status" in args, false);
  });

  it("create page sources avoid forbidden runtime references", () => {
    const files = [
      join(here, "create-copy.ts"),
      join(here, "create-form.ts"),
      join(repoSrc, "app", "projects", "new", "page.tsx"),
      join(repoSrc, "app", "projects", "new", "actions.ts"),
      join(repoSrc, "components", "projects", "CreateProjectForm.tsx"),
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
      join(repoSrc, "app", "projects", "new", "actions.ts"),
      "utf8"
    );
    assert.equal(actions.includes("createProject"), true);
    assert.equal(actions.includes("listCompanies"), false);
    assert.equal(actions.includes("createClient"), true);

    const page = readFileSync(
      join(repoSrc, "app", "projects", "new", "page.tsx"),
      "utf8"
    );
    assert.equal(page.includes("listCompanies"), true);
    assert.equal(page.includes("CreateProjectForm"), true);
    assert.equal(page.includes("/projects"), true);
    assert.equal(page.includes("مسودة") || page.includes("draftNotice"), true);

    const form = readFileSync(
      join(repoSrc, "components", "projects", "CreateProjectForm.tsx"),
      "utf8"
    );
    assert.equal(form.includes('name="status"'), false);
    assert.equal(form.includes("accountId"), false);
    assert.equal(form.includes("expectedUpdatedAt"), false);
    // Error recovery remounts from latest action-state values, not empty defaults.
    assert.equal(form.includes("key={state.revision}"), true);
    assert.equal(form.includes("defaultValue={values.companyId}"), true);
    assert.equal(form.includes("defaultValue={values.domain}"), true);
    assert.equal(form.includes("defaultValue={values.startDate}"), true);
    assert.equal(form.includes("defaultValue={values.endDate}"), true);
    assert.equal(form.includes("defaultValue={values.name}"), true);
    assert.equal(form.includes("defaultValue={values.quota}"), true);
    assert.equal(form.includes("defaultValue={values.minAge}"), true);
    assert.equal(form.includes("defaultValue={values.maxAge}"), true);
    assert.equal(
      form.includes("defaultChecked={values.requiresThreeMonthWarning}"),
      true
    );
    assert.equal(form.includes("EMPTY_CREATE_PROJECT_STATE"), true);
    assert.equal(actions.includes("withCreateProjectFormRevision"), true);
    assert.equal(actions.includes("CREATE_PROJECT_SUCCESS_REDIRECT_PATH"), true);
    assert.equal(actions.includes("redirect("), true);
  });
});
