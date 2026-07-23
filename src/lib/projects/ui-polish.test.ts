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

  it("uses Eye and PencilLine lucide icons with accessible Arabic labels for view and edit row actions", () => {
    const list = readFileSync(
      join(repoSrc, "app", "projects", "page.tsx"),
      "utf8"
    );
    assert.equal(list.includes("Eye"), true, "Must include Eye icon");
    assert.equal(list.includes("PencilLine"), true, "Must include PencilLine icon");
    assert.equal(list.includes('aria-label="عرض المشروع"'), true, "Must have accessible Arabic label for View");
    assert.equal(list.includes('aria-label="تعديل المشروع"'), true, "Must have accessible Arabic label for Edit");
    assert.equal(list.includes('title="عرض المشروع"'), true, "Must have title tooltip for View");
    assert.equal(list.includes('title="تعديل المشروع"'), true, "Must have title tooltip for Edit");
    assert.equal(list.includes("item.detailHref"), true, "Must preserve detailHref");
    assert.equal(list.includes("item.editHref"), true, "Must preserve editHref");
  });

  it("project detail page enforces action hierarchy and relocated lifecycle section", () => {
    const list = readFileSync(
      join(repoSrc, "app", "projects", "page.tsx"),
      "utf8"
    );
    assert.equal(list.includes("FolderPlus2"), true, "Must include FolderPlus2 icon for new project");
    assert.equal(list.includes("مشروع جديد"), true, "Must use مشروع جديد label");

    const detail = readFileSync(
      join(repoSrc, "app", "projects", "[projectId]", "page.tsx"),
      "utf8"
    );
    assert.equal(detail.includes("UserPlus"), true, "Must include UserPlus icon for add-respondent");
    assert.equal(detail.includes("PencilLine"), true, "Must include PencilLine icon for edit project");
    assert.equal(detail.includes("add-respondent"), true, "Must preserve add-respondent href");
    assert.equal(detail.includes("view.editHref"), true, "Must preserve edit href");

    // Lifecycle section relocated after audit section
    const auditPos = detail.indexOf('id="section-audit"');
    const lifecyclePos = detail.indexOf("<ProjectLifecycleActions");
    assert.ok(auditPos > 0, "Audit section must exist");
    assert.ok(lifecyclePos > 0, "Lifecycle actions must exist");
    assert.ok(lifecyclePos > auditPos, "Lifecycle section must be relocated after audit section");

    const copy = readFileSync(
      join(repoSrc, "lib", "projects", "detail-copy.ts"),
      "utf8"
    );
    assert.equal(copy.includes("إدارة حالة المشروع"), true);
    assert.equal(copy.includes("استخدم هذه الخيارات عند انتهاء المشروع أو عند الحاجة إلى إلغائه."), true);
  });
});
