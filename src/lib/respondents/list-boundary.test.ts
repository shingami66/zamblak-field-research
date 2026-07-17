import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, "../../..");

describe("Respondents list navigation invariant", () => {
  it("Navigation contains exactly one /respondents item for owner and support_helper", () => {
    const text = readFileSync(
      path.join(root, "src/components/layout/Navigation.tsx"),
      "utf8"
    );
    const matches = text.match(/href:\s*"\/respondents"/g) ?? [];
    assert.equal(matches.length, 1);
    assert.match(
      text,
      /\{\s*name:\s*"المستجيبون",\s*href:\s*"\/respondents",\s*roles:\s*\["owner",\s*"support_helper"\]\s*\}/
    );
    assert.match(
      text,
      /\{\s*name:\s*"المستحقات",\s*href:\s*"\/financials",\s*roles:\s*\["owner"\]\s*\}/
    );
  });
});

describe("Respondents list source boundary", () => {
  it("route and list helpers avoid forbidden imports and table access", () => {
    const files = [
      path.join(root, "src/app/respondents/page.tsx"),
      path.join(root, "src/app/respondents/loading.tsx"),
      path.join(dir, "list-copy.ts"),
      path.join(dir, "list-params.ts"),
      path.join(dir, "list-view-model.ts"),
    ];

    const forbidden = [
      '.from("respondents")',
      ".from('respondents')",
      "service_role",
      "getRespondent",
      "createRespondent",
      "updateRespondent",
      "normalize_respondent_mobile",
      "normalizedMobile",
      "participation_pricing",
      "amount_due",
      "amount_paid",
      "settlement",
      "payment",
      "three_month",
      "three-month",
    ];

    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const token of forbidden) {
        assert.equal(
          text.includes(token),
          false,
          `${path.basename(file)} must not contain ${token}`
        );
      }
      // accountId as authority field must not appear in list production helpers/route
      assert.equal(
        text.includes("accountId"),
        false,
        `${path.basename(file)} must not contain accountId`
      );
    }

    const page = readFileSync(path.join(root, "src/app/respondents/page.tsx"), "utf8");
    assert.match(page, /listRespondents/);
    assert.equal((page.match(/listRespondents/g) ?? []).length, 2);
  });
});
