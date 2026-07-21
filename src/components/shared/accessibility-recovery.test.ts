import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const source = (relative: string) => readFileSync(path.join(root, relative), "utf8");

describe("P0/P1 accessibility recovery", () => {
  it("keeps lifecycle confirmation native, named, and focus-restoring", () => {
    const lifecycle = source("src/components/projects/ProjectLifecycleActions.tsx");
    assert.match(lifecycle, /<dialog/);
    assert.match(lifecycle, /projectName/);
    assert.match(lifecycle, /pendingAction\.label/);
    assert.match(lifecycle, /onCancel/);
    assert.match(lifecycle, /onClose=\{restoreTriggerFocus\}/);
    assert.match(lifecycle, /showModal/);
  });

  it("uses a native mobile account dialog with close and focus restoration", () => {
    const account = source("src/components/layout/AccountMenu.tsx");
    assert.match(account, /<dialog/);
    assert.match(account, /showModal/);
    assert.match(account, /onCancel/);
    assert.match(account, /onClose/);
    assert.match(account, /mobileCloseRef\.current\?\.focus/);
  });

  it("uses 48px minimum sizes for primary recovery controls", () => {
    const files = [
      "src/components/shared/pagination.module.css",
      "src/app/projects/[projectId]/add-respondent/add-respondent.module.css",
      "src/app/projects/[projectId]/project-detail.module.css",
      "src/components/shared/state-action.module.css",
    ];
    for (const file of files) {
      assert.match(source(file), /min-height:\s*3rem/);
    }
  });

  it("uses the respondent server query contract instead of a first-50 ceiling", () => {
    const route = source("src/app/projects/[projectId]/add-respondent/page.tsx");
    assert.match(route, /parseRespondentsListSearchParams/);
    assert.match(route, /deriveRespondentsListPagination/);
    assert.match(route, /RESPONDENTS_LIST_PAGE_SIZE/);
    assert.equal(route.includes("limit: 50"), false);
  });
});
