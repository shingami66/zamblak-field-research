import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (relative: string) => readFileSync(path.join(root, relative), "utf8");

describe("final frontend smoke and polish", () => {
  it("keeps add-participant loading markup valid around the block loading mark", () => {
    const loading = read("src/app/projects/[projectId]/add-respondent/loading.tsx");
    assert.match(loading, /<div className=\{styles\.title\}>/);
    assert.match(loading, /<ZamblakLoadingMark variant="compact"/);
    assert.equal(loading.includes("<p className={styles.title}>"), false);
    assert.match(loading, /aria-busy="true"/);
    assert.match(loading, /aria-live="polite"/);
  });

  it("renders the shared truthful Arabic pagination range with bidi isolation", () => {
    const pagination = read("src/components/shared/Pagination.tsx");
    assert.match(pagination, /المعروض:/);
    assert.match(pagination, /<bdi dir="ltr">\{startItem\}–\{endItem\}<\/bdi>/);
    assert.equal(pagination.includes("totalItems"), false);
  });

  it("uses one RTL-safe back navigation component without literal left arrows", () => {
    const backLink = read("src/components/shared/BackLink.tsx");
    assert.match(backLink, /<svg/);
    assert.match(read("src/components/shared/back-link.module.css"), /min-height: 3rem/);
    for (const route of [
      "src/app/companies/new/page.tsx",
      "src/app/projects/new/page.tsx",
      "src/app/respondents/new/page.tsx",
      "src/app/projects/[projectId]/add-respondent/page.tsx",
    ]) {
      const source = read(route);
      assert.match(source, /BackLink/);
      assert.equal(source.includes("←"), false);
    }
  });

  it("uses the natural participants title and shared pagination", () => {
    const participants = read("src/app/projects/[projectId]/participants/page.tsx");
    assert.match(participants, /مشاركو \{project\.projectName\}/);
    assert.match(participants, /<Pagination/);
    assert.equal(participants.includes("إجمالي المعروض"), false);
  });

  it("uses a required bounded free-text project-domain input in both forms", () => {
    for (const component of [
      "src/components/projects/CreateProjectForm.tsx",
      "src/components/projects/EditProjectForm.tsx",
    ]) {
      const source = read(component);
      assert.match(source, /name="domain"/);
      assert.match(source, /type="text"/);
      assert.match(source, /PROJECT_DOMAIN_MAX_LENGTH/);
      assert.equal(source.includes("DOMAIN_OPTIONS"), false);
    }
  });

  it("keeps the reviewed detail routes on the shared centered layout contract", () => {
    for (const stylesheet of [
      "src/app/projects/[projectId]/project-detail.module.css",
      "src/app/respondents/[respondentId]/respondent-detail.module.css",
      "src/app/projects/[projectId]/participants/participants.module.css",
      "src/app/projects/[projectId]/add-respondent/add-respondent.module.css",
    ]) {
      assert.match(read(stylesheet), /width: min\(100%,/);
    }
  });
});
