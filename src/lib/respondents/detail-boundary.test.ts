import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, "../../..");
const detailRouteDir = path.join(root, "src/app/respondents/[respondentId]");

const FORBIDDEN = [
  '.from("respondents")',
  ".from('respondents')",
  "service_role",
  "listRespondents(",
  "createRespondent(",
  "updateRespondent(",
  "normalize_respondent_mobile",
  "accountId",
  "normalizedMobile",
  "createdBy",
  "updatedBy",
  "deletedAt",
  "participation",
  "project_id",
  "price_per_accepted_form",
  "amount_due",
  "amount_paid",
  "settlement",
  "payment",
  "three_month",
  "three-month",
] as const;

describe("Respondents detail page source boundary", () => {
  it("detail helpers and route avoid forbidden tokens", () => {
    const files = [
      path.join(dir, "detail-copy.ts"),
      path.join(dir, "detail-params.ts"),
      path.join(dir, "detail-view-model.ts"),
      path.join(detailRouteDir, "page.tsx"),
      path.join(detailRouteDir, "loading.tsx"),
      path.join(detailRouteDir, "not-found.tsx"),
    ];

    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const token of FORBIDDEN) {
        assert.equal(
          text.includes(token),
          false,
          `${path.basename(file)} must not contain ${token}`
        );
      }
    }
  });

  it("page.tsx uses getRespondent once after param validation", () => {
    const page = readFileSync(path.join(detailRouteDir, "page.tsx"), "utf8");
    assert.equal(page.includes("requireAppSession"), true);
    assert.equal(page.includes("parseRespondentDetailParam"), true);
    assert.equal(page.includes("createClient"), true);
    assert.equal(page.includes("getRespondent"), true);
    assert.equal(page.includes("notFound"), true);
    assert.equal((page.match(/getRespondent\(/g) ?? []).length, 1);
    assert.equal(page.includes("listRespondents"), false);
    assert.equal(page.includes("createRespondent"), false);
    assert.equal(page.includes("updateRespondent"), false);
    assert.equal(page.includes("console.log"), false);
    assert.equal(page.includes("console.error"), false);
    assert.equal(page.includes("console.warn"), false);
    assert.equal(page.includes("use server"), false);
    assert.equal(page.includes('"use server"'), false);

    // createClient must appear after param validation in source order.
    const parseIdx = page.indexOf("parseRespondentDetailParam");
    const clientIdx = page.indexOf("createClient");
    const getIdx = page.indexOf("getRespondent(");
    assert.equal(parseIdx >= 0 && clientIdx > parseIdx, true);
    assert.equal(getIdx > clientIdx, true);
  });

  it("detail route has no Server Actions", () => {
    const entries = readdirSync(detailRouteDir, { withFileTypes: true });
    assert.equal(
      entries.some((e) => e.isFile() && e.name === "actions.ts"),
      false
    );
    for (const entry of entries) {
      if (
        !entry.isFile() ||
        (!entry.name.endsWith(".ts") && !entry.name.endsWith(".tsx"))
      ) {
        continue;
      }
      const text = readFileSync(path.join(detailRouteDir, entry.name), "utf8");
      assert.equal(
        text.includes('"use server"'),
        false,
        `${entry.name} must not be a Server Action module`
      );
    }
  });
});
