import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

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
  "createProject",
  "updateProject",
  "listProjects",
] as const;

describe("Projects detail page source boundary", () => {
  it("detail sources use getProject/transition only and avoid forbidden tokens", () => {
    const files = [
      join(here, "detail-copy.ts"),
      join(here, "detail-params.ts"),
      join(here, "detail-view-model.ts"),
      join(here, "detail-transition.ts"),
      join(repoSrc, "app", "projects", "[projectId]", "page.tsx"),
      join(repoSrc, "app", "projects", "[projectId]", "actions.ts"),
      join(repoSrc, "app", "projects", "[projectId]", "loading.tsx"),
      join(
        repoSrc,
        "components",
        "projects",
        "ProjectLifecycleActions.tsx"
      ),
    ];

    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const token of FORBIDDEN) {
        // actions may mention transitionProjectStatus and getProject only
        if (
          token === "createProject" ||
          token === "updateProject" ||
          token === "listProjects"
        ) {
          if (file.endsWith("actions.ts") || file.endsWith("page.tsx")) {
            assert.equal(
              text.includes(token),
              false,
              `${file} must not call ${token}`
            );
          }
          continue;
        }
        assert.equal(
          text.includes(token),
          false,
          `${file} must not contain ${token}`
        );
      }
    }

    const page = readFileSync(
      join(repoSrc, "app", "projects", "[projectId]", "page.tsx"),
      "utf8"
    );
    assert.equal(page.includes("getProject"), true);
    assert.equal(page.includes("requireAppSession"), true);
    assert.equal(page.includes("profile.role"), true);
    assert.equal(page.includes('"owner"'), true);
    assert.equal(page.includes("editHref"), true);
    assert.equal(page.includes("ProjectLifecycleActions"), true);

    const actions = readFileSync(
      join(repoSrc, "app", "projects", "[projectId]", "actions.ts"),
      "utf8"
    );
    assert.equal(actions.includes("transitionProjectStatus"), true);
    assert.equal(actions.includes("expectedUpdatedAt"), true);
    assert.equal(actions.includes('"owner"'), true);
    assert.equal(actions.includes("Date.now"), false);
    assert.equal(actions.includes("new Date()"), false);

    const viewModel = readFileSync(join(here, "detail-view-model.ts"), "utf8");
    assert.equal(viewModel.includes("/edit"), true);
  });
});
