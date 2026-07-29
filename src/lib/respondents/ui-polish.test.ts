import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, "../../..");
const readSource = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8");

describe("Respondents list UI action polish & layout invariants", () => {
  it("uses UserPlus icon and مشارك جديد label for create action with /respondents/new href", () => {
    const source = readSource("src/app/respondents/page.tsx");
    assert.equal(source.includes("UserPlus"), true, "Must include UserPlus icon");
    assert.equal(source.includes("مشارك جديد"), true, "Must use مشارك جديد label");
    assert.equal(source.includes('href="/respondents/new"'), true, "Must preserve create href /respondents/new");
  });

  it("uses Eye and PencilLine icons with accessible Arabic aria-label and title for desktop row actions", () => {
    const source = readSource("src/app/respondents/page.tsx");

    assert.equal(source.includes("Eye"), true, "Must include Eye icon");
    assert.equal(source.includes("PencilLine"), true, "Must include PencilLine icon");
    assert.equal(source.includes('aria-label="عرض المشارك"'), true, "Must include Arabic aria-label for View");
    assert.equal(source.includes('title="عرض المشارك"'), true, "Must include Arabic title for View");
    assert.equal(source.includes('aria-label="تعديل المشارك"'), true, "Must include Arabic aria-label for Edit");
    assert.equal(source.includes('title="تعديل المشارك"'), true, "Must include Arabic title for Edit");
  });

  it("retains visible text on mobile card actions", () => {
    const source = readSource("src/app/respondents/page.tsx");
    assert.equal(source.includes("respondentsListCopy.view"), true, "Mobile view action must retain text");
    assert.equal(source.includes("تعديل"), true, "Mobile edit action must retain text");
  });

  it("groups all imports at top of module before function declarations", () => {
    const source = readSource("src/app/respondents/page.tsx");
    const firstFunctionIndex = source.indexOf("function ");
    const lastImportIndex = source.lastIndexOf("import ");
    assert.ok(firstFunctionIndex > 0, "Function declaration must exist");
    assert.ok(lastImportIndex > 0, "Import declaration must exist");
    assert.ok(
      lastImportIndex < firstFunctionIndex,
      "All imports must precede any function declarations"
    );
  });

  it("places create action in headerActionRow below pageDescription within pageIntro", () => {
    const source = readSource("src/app/respondents/page.tsx");
    const descPos = source.indexOf("pageDescription");
    const actionPos = source.indexOf("headerActionRow");
    assert.ok(descPos > 0, "pageDescription must exist");
    assert.ok(actionPos > 0, "headerActionRow must exist");
    assert.ok(actionPos > descPos, "headerActionRow must be placed below pageDescription");

    const css = readSource("src/app/respondents/respondents-list.module.css");
    assert.equal(css.includes("flex-direction: column;"), true, "pageIntro must be vertical column flex container");
    assert.equal(css.includes("align-items: flex-start;"), true, "pageIntro items must align to right in RTL");
  });

  it("uses User identity icon and PencilLine edit icon on respondent detail page inside headerActions container", () => {
    const source = readSource("src/app/respondents/[respondentId]/page.tsx");
    assert.equal(source.includes("User"), true, "Must include User identity icon");
    assert.equal(source.includes("PencilLine"), true, "Must include PencilLine edit icon");
    assert.equal(source.includes("view.editHref"), true, "Must preserve editHref");
    assert.equal(source.includes("respondentsDetailCopy.editRespondent"), true, "Must preserve visible edit text");
    assert.equal(source.includes("headerActions"), true, "Must group edit action in headerActions container");

    const css = readSource("src/app/respondents/[respondentId]/respondent-detail.module.css");
    assert.equal(css.includes("flex-direction: column;"), true, "headerRow must be vertical column flex container");
    assert.equal(css.includes("align-items: flex-start;"), true, "headerRow items must align to right in RTL");
  });
});
