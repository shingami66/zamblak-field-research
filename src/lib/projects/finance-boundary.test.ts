import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import type { ProjectDetail, ProjectListItem } from "./types";

const here = dirname(fileURLToPath(import.meta.url));

const FORBIDDEN_RUNTIME = [
  "project_financial_settings",
  "price_per_accepted_form",
  "participation_pricing",
  "amount_due",
  "amount_paid",
  "service_role",
  'from("projects")',
  "from('projects')",
  'from("companies")',
  "from('companies')",
  "support_project_directory",
] as const;

describe("Projects finance and data-boundary invariants", () => {
  it("list/detail types expose no prohibited financial keys", () => {
    const listKeys: (keyof ProjectListItem)[] = [
      "projectId",
      "projectName",
      "companyId",
      "companyName",
      "domain",
      "status",
      "startDate",
      "endDate",
      "quota",
      "updatedAt",
    ];
    assert.equal(listKeys.length, 10);

    const detailKeys: (keyof ProjectDetail)[] = [
      "projectId",
      "projectName",
      "companyId",
      "companyName",
      "domain",
      "status",
      "startDate",
      "endDate",
      "quota",
      "minAge",
      "maxAge",
      "requiredResidentType",
      "eligibilityNotes",
      "requiresThreeMonthWarning",
      "whatsappTemplateAr",
      "whatsappTemplateEn",
      "notes",
      "createdAt",
      "updatedAt",
    ];
    assert.equal(detailKeys.length, 19);

    const sampleList: ProjectListItem = {
      projectId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      projectName: "A",
      companyId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      companyName: "C",
      domain: "telecom",
      status: "draft",
      startDate: null,
      endDate: null,
      quota: null,
      updatedAt: "2026-07-02T00:00:00.000Z",
    };
    for (const forbidden of [
      "price",
      "payment",
      "settlement",
      "amountDue",
      "amountPaid",
      "accountId",
    ]) {
      assert.equal(
        Object.prototype.hasOwnProperty.call(sampleList, forbidden),
        false
      );
    }
  });

  it("adapter source has no forbidden runtime references", () => {
    // Explicit negative assertions only — these strings must not appear in
    // production contract modules (tests themselves may mention them).
    const sources = [
      "types.ts",
      "input.ts",
      "map-row.ts",
      "errors.ts",
      "lifecycle.ts",
      "rpc.ts",
      "index.ts",
    ];
    for (const file of sources) {
      const text = readFileSync(join(here, file), "utf8");
      for (const token of FORBIDDEN_RUNTIME) {
        assert.equal(
          text.includes(token),
          false,
          `${file} must not contain ${token}`
        );
      }
      // Broader finance wording checks
      assert.equal(text.includes("settlement"), false, file);
      assert.equal(text.includes("payments"), false, file);
    }
  });
});
