import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  formatProjectDateOnly,
  isProjectDateDisplayToken,
} from "./list-view-model";

const here = dirname(fileURLToPath(import.meta.url));
const repoSrc = join(here, "..", "..");

describe("Projects UI polish invariants", () => {
  it("date-only formatter is pure Latin DD/MM/YYYY token", () => {
    const label = formatProjectDateOnly("2026-07-17");
    assert.equal(label, "17/07/2026");
    assert.equal(isProjectDateDisplayToken(label), true);
    assert.equal(label.includes("Date.UTC"), false);
    // Reject BiDi-scrambled patterns observed in smoke
    assert.equal(/\d{6}\//.test(label), false);
  });

  it("lifecycle buttons declare semantic activate/cancel/close variants", () => {
    const lifecycle = readFileSync(
      join(repoSrc, "components", "projects", "ProjectLifecycleActions.tsx"),
      "utf8"
    );
    assert.equal(lifecycle.includes("lifecycleActivate"), true);
    assert.equal(lifecycle.includes("lifecycleCancel"), true);
    assert.equal(lifecycle.includes("lifecycleClose"), true);
    assert.equal(lifecycle.includes("targetStatus"), true);

    const css = readFileSync(
      join(
        repoSrc,
        "app",
        "projects",
        "[projectId]",
        "project-detail.module.css"
      ),
      "utf8"
    );
    assert.equal(css.includes(".lifecycleActivate"), true);
    assert.equal(css.includes(".lifecycleCancel"), true);
    assert.equal(css.includes(".lifecycleClose"), true);
    assert.equal(css.includes("#a8e10c") || css.includes("#A8E10C"), true);
    assert.equal(css.includes("#ffdad6"), true);
    assert.equal(css.includes("#0f3d3e") || css.includes("#0F3D3E"), true);
  });

  it("list and detail use bdi LTR date isolation", () => {
    const list = readFileSync(
      join(repoSrc, "app", "projects", "page.tsx"),
      "utf8"
    );
    const detail = readFileSync(
      join(repoSrc, "app", "projects", "[projectId]", "page.tsx"),
      "utf8"
    );
    assert.equal(list.includes("ProjectLtrToken"), true);
    assert.equal(detail.includes("ProjectLtrToken"), true);
    const token = readFileSync(
      join(repoSrc, "components", "projects", "ProjectLtrToken.tsx"),
      "utf8"
    );
    assert.equal(token.includes('dir="ltr"'), true);
    assert.equal(token.includes("<bdi"), true);
  });

  it("status badges remain text-labelled with distinct semantic classes", () => {
    const listCss = readFileSync(
      join(repoSrc, "app", "projects", "projects-list.module.css"),
      "utf8"
    );
    for (const cls of [
      ".statusDraft",
      ".statusActive",
      ".statusClosed",
      ".statusCancelled",
    ]) {
      assert.equal(listCss.includes(cls), true, cls);
    }
  });

  it("polish surfaces remain finance-free", () => {
    const files = [
      join(repoSrc, "app", "projects", "page.tsx"),
      join(repoSrc, "app", "projects", "[projectId]", "page.tsx"),
      join(repoSrc, "components", "projects", "ProjectLifecycleActions.tsx"),
      join(repoSrc, "components", "projects", "ProjectLtrToken.tsx"),
      join(here, "list-view-model.ts"),
    ];
    const forbidden = [
      "project_financial_settings",
      "price_per_accepted_form",
      "payments",
      "settlement",
      "service_role",
      'from("projects")',
    ];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const token of forbidden) {
        assert.equal(text.includes(token), false, `${file} ${token}`);
      }
    }
  });
});
