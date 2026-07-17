import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, "../../..");
const editRouteDir = path.join(
  root,
  "src/app/respondents/[respondentId]/edit"
);

const FORBIDDEN = [
  '.from("respondents")',
  ".from('respondents')",
  "service_role",
  "normalized_mobile",
  "account_id",
  "profile_id",
  "project_id",
  "participation",
  "price_per_accepted_form",
  "amount_due",
  "amount_paid",
  "settlement",
  "payment",
  "three_month",
  "three-month",
] as const;

describe("Respondents edit page source boundary", () => {
  it("edit helpers and route avoid forbidden tokens", () => {
    const files = [
      path.join(dir, "edit-copy.ts"),
      path.join(dir, "edit-form.ts"),
      path.join(editRouteDir, "page.tsx"),
      path.join(editRouteDir, "actions.ts"),
      path.join(editRouteDir, "loading.tsx"),
      path.join(root, "src/components/respondents/EditRespondentForm.tsx"),
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

  it("actions.ts calls updateRespondent once with revalidate and redirect", () => {
    const actions = readFileSync(path.join(editRouteDir, "actions.ts"), "utf8");
    assert.equal(actions.includes("requireAppSession"), true);
    assert.equal(actions.includes("createClient"), true);
    assert.equal(actions.includes("parseUpdateRespondentInput"), true);
    assert.equal(actions.includes("updateRespondent"), true);
    assert.equal((actions.match(/updateRespondent\(/g) ?? []).length, 1);
    assert.equal(actions.includes("revalidatePath"), true);
    assert.equal(actions.includes("redirect("), true);
    assert.equal(actions.includes("getRespondent("), false);
    assert.equal(actions.includes("listRespondents("), false);
    assert.equal(actions.includes("createRespondent("), false);
    assert.equal(actions.includes("Date.now"), false);
    assert.equal(actions.includes("new Date("), false);
    assert.equal(actions.includes("console.log"), false);
    assert.equal(actions.includes("console.error"), false);
    assert.equal(actions.includes("console.warn"), false);
    assert.equal(actions.includes("while ("), false);
  });

  it("page.tsx loads with getRespondent once and binds action context", () => {
    const page = readFileSync(path.join(editRouteDir, "page.tsx"), "utf8");
    assert.equal(page.includes("requireAppSession"), true);
    assert.equal(page.includes("parseRespondentDetailParam"), true);
    assert.equal(page.includes("createClient"), true);
    assert.equal(page.includes("getRespondent"), true);
    assert.equal((page.match(/getRespondent\(/g) ?? []).length, 1);
    assert.equal(page.includes("updateRespondentAction.bind"), true);
    assert.equal(page.includes("respondent.respondentId"), true);
    assert.equal(page.includes("respondent.updatedAt"), true);
    assert.equal(page.includes("EditRespondentForm"), true);
    assert.equal(page.includes("updateRespondent("), false);
    assert.equal(page.includes("notFound"), true);

    const parseIdx = page.indexOf("parseRespondentDetailParam");
    const clientIdx = page.indexOf("createClient");
    const getIdx = page.indexOf("getRespondent(");
    assert.equal(parseIdx >= 0 && clientIdx > parseIdx, true);
    assert.equal(getIdx > clientIdx, true);
  });

  it("form receives bound action, uses revision, and omits hidden mutation context", () => {
    const form = readFileSync(
      path.join(root, "src/components/respondents/EditRespondentForm.tsx"),
      "utf8"
    );
    assert.equal(form.includes("useActionState"), true);
    assert.equal(form.includes("useFormStatus"), true);
    assert.equal(form.includes("key={state.revision}"), true);
    assert.equal(form.includes('name="mobile"'), true);
    assert.equal(form.includes('name="name"'), true);
    assert.equal(form.includes('name="age"'), true);
    assert.equal(form.includes('name="nationality"'), true);
    assert.equal(form.includes('name="resident_type"'), true);
    assert.equal(form.includes('name="notes"'), true);
    assert.equal(form.includes('name="respondent_id"'), false);
    assert.equal(form.includes('name="respondentId"'), false);
    assert.equal(form.includes('name="expected_updated_at"'), false);
    assert.equal(form.includes('name="expectedUpdatedAt"'), false);
    assert.equal(form.includes("type=\"hidden\""), false);
    assert.equal(form.includes('stale_respondent_version'), true);
    assert.equal(form.includes("disabled={isStale}"), true);
    assert.equal(form.includes("createClient"), false);
    assert.equal(form.includes("updateRespondent"), false);
    assert.equal(form.includes("localStorage"), false);
    assert.equal(form.includes("sessionStorage"), false);
    assert.equal(form.includes("useEffect"), false);
    // Bound action is a prop, not a direct route import of the unbound action.
    assert.equal(
      form.includes('@/app/respondents/[respondentId]/edit/actions'),
      false
    );
  });

  it("edit route has only the authorized action module", () => {
    const entries = readdirSync(editRouteDir, { withFileTypes: true });
    assert.equal(
      entries.some((e) => e.isFile() && e.name === "actions.ts"),
      true
    );
    assert.equal(
      entries.some((e) => e.isFile() && e.name === "page.tsx"),
      true
    );
    assert.equal(
      entries.some((e) => e.isFile() && e.name === "loading.tsx"),
      true
    );
  });
});
