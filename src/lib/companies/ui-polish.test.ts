import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, "../../..");
const readSource = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8");

describe("Companies list UI action polish & layout invariants", () => {
  it("uses Building2 icon and شركة جديدة label for create action with /companies/new href", () => {
    const source = readSource("src/app/companies/page.tsx");
    assert.equal(source.includes("Building2"), true, "Must include Building2 icon");
    assert.equal(source.includes("شركة جديدة"), true, "Must use شركة جديدة label");
    assert.equal(source.includes('href="/companies/new"'), true, "Must preserve create href /companies/new");
  });

  it("uses Eye and PencilLine icons with accessible Arabic aria-label and title for desktop row actions", () => {
    const source = readSource("src/app/companies/page.tsx");

    assert.equal(source.includes("Eye"), true, "Must include Eye icon");
    assert.equal(source.includes("PencilLine"), true, "Must include PencilLine icon");
    assert.equal(source.includes('aria-label="عرض الشركة"'), true, "Must include Arabic aria-label for View");
    assert.equal(source.includes('title="عرض الشركة"'), true, "Must include Arabic title for View");
    assert.equal(source.includes('aria-label="تعديل الشركة"'), true, "Must include Arabic aria-label for Edit");
    assert.equal(source.includes('title="تعديل الشركة"'), true, "Must include Arabic title for Edit");
    assert.equal(source.includes("item.detailHref"), true, "Must preserve detailHref");
    assert.equal(source.includes("item.editHref"), true, "Must preserve editHref");
  });

  it("retains visible عرض and تعديل text on mobile card actions", () => {
    const source = readSource("src/app/companies/page.tsx");
    assert.equal(source.includes("companiesListCopy.view"), true, "Mobile view action must retain text");
    assert.equal(source.includes("companiesListCopy.edit"), true, "Mobile edit action must retain text");
  });

  it("groups all imports at top of module before function declarations", () => {
    const source = readSource("src/app/companies/page.tsx");
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
    const source = readSource("src/app/companies/page.tsx");
    const descPos = source.indexOf("pageDescription");
    const actionPos = source.indexOf("headerActionRow");
    assert.ok(descPos > 0, "pageDescription must exist");
    assert.ok(actionPos > 0, "headerActionRow must exist");
    assert.ok(actionPos > descPos, "headerActionRow must be placed below pageDescription");

    const css = readSource("src/app/companies/companies-list.module.css");
    assert.equal(css.includes("flex-direction: column;"), true, "pageIntro must be vertical column flex container");
    assert.equal(css.includes("align-items: flex-start;"), true, "pageIntro items must align to right in RTL");
  });

  it("uses Building2 identity icon and PencilLine edit icon on company detail page inside headerActions container", () => {
    const source = readSource("src/app/companies/[id]/page.tsx");
    assert.equal(source.includes("Building2"), true, "Must include Building2 identity icon");
    assert.equal(source.includes("PencilLine"), true, "Must include PencilLine edit icon");
    assert.equal(source.includes("view.editHref"), true, "Must preserve editHref");
    assert.equal(source.includes("companiesDetailCopy.editCompany"), true, "Must preserve visible edit text");
    assert.equal(source.includes("headerActions"), true, "Must group edit action in headerActions container");

    const css = readSource("src/app/companies/[id]/company-detail.module.css");
    assert.equal(css.includes("flex-direction: column;"), true, "headerRow must be vertical column flex container");
    assert.equal(css.includes("align-items: flex-start;"), true, "headerRow items must align to right in RTL");
  });
});
