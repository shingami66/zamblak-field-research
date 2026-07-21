import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, "../../..");
const readSource = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8");

describe("Participant-facing terminology", () => {
  it("uses participant terminology across navigation, registry, actions, and headings", () => {
    const navigation = readSource("src/components/layout/Navigation.tsx");
    const header = readSource("src/components/layout/Header.tsx");
    const quickActions = readSource(
      "src/components/dashboard/QuickActions.tsx"
    );
    const respondentCopyFiles = [
      "src/lib/respondents/list-copy.ts",
      "src/lib/respondents/create-copy.ts",
      "src/lib/respondents/detail-copy.ts",
      "src/lib/respondents/edit-copy.ts",
      "src/lib/participations/copy.ts",
    ].map(readSource);

    assert.match(navigation, /name: "المشاركون"/);
    assert.match(quickActions, /label: "إضافة مشارك"/);
    assert.match(respondentCopyFiles[0], /pageTitle: "سجل المشاركين"/);
    assert.match(respondentCopyFiles[1], /pageTitle: "إضافة مشارك"/);
    assert.match(respondentCopyFiles[2], /sectionBasic: "بيانات المشارك"/);
    assert.match(respondentCopyFiles[3], /pageTitle: "تعديل المشارك"/);

    for (const source of [
      navigation,
      header,
      quickActions,
      ...respondentCopyFiles,
    ]) {
      assert.equal(source.includes("مستجيب"), false);
      assert.equal(source.includes("مبحوث"), false);
    }
  });
});

describe("Financial presentation boundary", () => {
  it("keeps the page owner-only and aligns its Arabic title with navigation", () => {
    const page = readSource("src/app/financials/page.tsx");
    const navigation = readSource("src/components/layout/Navigation.tsx");

    assert.match(page, /requireAppSession/);
    assert.match(page, /session\.profile\.role !== "owner"/);
    assert.match(page, /redirect\("\/forbidden"\)/);
    assert.match(page, />المستحقات<\/h1>/);
    assert.match(
      navigation,
      /name: "المستحقات", href: "\/financials", roles: \["owner"\]/
    );
    const financeLine = navigation
      .split("\n")
      .find((line) => line.includes('href: "/financials"'));
    assert.ok(financeLine);
    assert.equal(financeLine.includes("support_helper"), false);
  });

  it("uses Arabic riyal formatting without SAR in presentation data", () => {
    const adapter = readSource("src/lib/mock-adapters/financials.ts");
    const dashboard = readSource(
      "src/components/dashboard/DashboardShell.tsx"
    );

    for (const amount of [
      "145,000 ر.س",
      "82,500 ر.س",
      "62,500 ر.س",
      "8,000 ر.س",
    ]) {
      assert.equal(adapter.includes(amount), true);
    }
    assert.equal(adapter.includes("SAR"), false);
    assert.match(dashboard, /toLocaleString\("en-US"\)/);
    assert.match(dashboard, /ر\.س/);
  });
});

describe("Shared visual and navigation boundaries", () => {
  it("provides reduced-motion fallbacks for shared and route motion surfaces", () => {
    const motionFiles = [
      "src/components/shared/data-table.module.css",
      "src/components/shared/mobile-list-card.module.css",
      "src/components/shared/pagination.module.css",
      "src/components/shared/summary-card.module.css",
      "src/components/dashboard/authenticated-shell.module.css",
      "src/components/dashboard/quick-actions.module.css",
      "src/components/dashboard/search-card.module.css",
      "src/app/companies/companies-list.module.css",
      "src/app/projects/projects-list.module.css",
      "src/app/respondents/respondents-list.module.css",
      "src/app/financials/financials.module.css",
    ];

    for (const file of motionFiles) {
      const css = readSource(file);
      assert.match(css, /@media \(prefers-reduced-motion: reduce\)/, file);
    }

    for (const file of motionFiles.filter((file) =>
      /(mobile-list-card|summary-card|authenticated-shell|quick-actions|search-card|companies-list|projects-list|respondents-list|financials)/.test(
        file
      )
    )) {
      assert.match(readSource(file), /transform:\s*none/, file);
    }
  });

  it("keeps shared list navigation server-compatible", () => {
    const pagination = readSource("src/components/shared/Pagination.tsx");
    const dataTable = readSource("src/components/shared/DataTable.tsx");
    const mobileCard = readSource("src/components/shared/MobileListCard.tsx");

    assert.match(pagination, /import Link from "next\/link"/);
    for (const source of [pagination, dataTable, mobileCard]) {
      assert.equal(source.includes('"use client"'), false);
      assert.equal(source.includes("onClick"), false);
    }
  });

  it("preserves live list loaders and only the supported URL filters", () => {
    const companies = readSource("src/app/companies/page.tsx");
    const projects = readSource("src/app/projects/page.tsx");
    const respondents = readSource("src/app/respondents/page.tsx");

    for (const [source, loader] of [
      [companies, "listCompanies"],
      [projects, "listProjects"],
      [respondents, "listRespondents"],
    ]) {
      assert.equal(source.includes(loader), true);
      assert.equal(source.includes("createClient"), true);
      assert.equal(source.includes("mock-adapters"), false);
      assert.equal(source.includes("onClick"), false);
    }

    assert.match(companies, /name="q"/);
    assert.equal(companies.includes('name="status"'), false);
    assert.equal(companies.includes('name="company"'), false);
    assert.match(respondents, /name="q"/);
    assert.equal(respondents.includes('name="status"'), false);
    assert.equal(respondents.includes('name="company"'), false);
    assert.match(projects, /name="q"/);
    assert.match(projects, /name="company"/);
    assert.match(projects, /name="status"/);
    assert.match(projects, /item\.domainLabel/);
  });
});
