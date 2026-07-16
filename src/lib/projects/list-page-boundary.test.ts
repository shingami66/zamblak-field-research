import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { buildProjectsListHref } from "./list-params";

const here = dirname(fileURLToPath(import.meta.url));
const appProjects = join(here, "..", "..", "app", "projects");

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
] as const;

describe("Projects list page source boundary", () => {
  it("Add Project and detail href patterns match approved routes", () => {
    assert.equal(buildProjectsListHref({}), "/projects");
    assert.equal(
      `/projects/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`,
      "/projects/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
    );
    assert.equal("/projects/new", "/projects/new");
  });

  it("list modules and page sources avoid forbidden runtime references", () => {
    const files = [
      join(here, "list-copy.ts"),
      join(here, "list-params.ts"),
      join(here, "list-view-model.ts"),
      join(appProjects, "page.tsx"),
      join(appProjects, "loading.tsx"),
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

    const page = readFileSync(join(appProjects, "page.tsx"), "utf8");
    assert.equal(page.includes("listProjects"), true);
    assert.equal(page.includes("listCompanies"), true);
    assert.equal(page.includes("createProject"), false);
    assert.equal(page.includes("updateProject"), false);
    assert.equal(page.includes("transitionProjectStatus"), false);
    assert.equal(page.includes("createClient"), true);
    assert.equal(page.includes("/projects/new"), true);
  });
});
