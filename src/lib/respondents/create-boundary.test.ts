import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  CREATE_RESPONDENT_SUCCESS_REDIRECT_PATH,
  formValuesToCreateInputRaw,
} from "./create-form";
import {
  buildCreateRespondentRpcArgs,
  parseCreateRespondentInput,
} from "./input";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, "../../..");

const FORBIDDEN = [
  '.from("respondents")',
  ".from('respondents')",
  "service_role",
  "listRespondents(",
  "getRespondent(",
  "updateRespondent(",
  "normalize_respondent_mobile",
  "account_id",
  "normalized_mobile",
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

describe("Respondents create page source boundary", () => {
  it("success path is list only and create mapping excludes internal fields", () => {
    assert.equal(CREATE_RESPONDENT_SUCCESS_REDIRECT_PATH, "/respondents");
    const mapped = formValuesToCreateInputRaw({
      mobile: "0512345678",
      name: "علي",
      age: "30",
      nationality: "سعودي",
      residentType: "saudi",
      notes: "n",
    });
    assert.equal(mapped.ok, true);
    if (!mapped.ok) return;
    const parsed = parseCreateRespondentInput(mapped.data);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    const args = buildCreateRespondentRpcArgs(parsed.data);
    assert.equal("p_account_id" in args, false);
    assert.equal("p_respondent_id" in args, false);
    assert.equal("p_normalized_mobile" in args, false);
  });

  it("create page sources avoid forbidden runtime references", () => {
    const files = [
      path.join(dir, "create-copy.ts"),
      path.join(dir, "create-form.ts"),
      path.join(root, "src/app/respondents/new/page.tsx"),
      path.join(root, "src/app/respondents/new/actions.ts"),
      path.join(root, "src/app/respondents/new/loading.tsx"),
      path.join(root, "src/components/respondents/CreateRespondentForm.tsx"),
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

    const actions = readFileSync(
      path.join(root, "src/app/respondents/new/actions.ts"),
      "utf8"
    );
    assert.equal(actions.includes("createRespondent"), true);
    assert.equal((actions.match(/createRespondent\(/g) ?? []).length, 1);
    assert.equal(actions.includes("requireAppSession"), true);
    assert.equal(actions.includes("createClient"), true);
    assert.equal(actions.includes('revalidatePath("/respondents")') || actions.includes("CREATE_RESPONDENT_SUCCESS_REVALIDATE_PATH"), true);
    assert.equal(actions.includes("redirect("), true);
    assert.equal(actions.includes("listRespondents"), false);
    assert.equal(actions.includes("getRespondent"), false);
    assert.equal(actions.includes("updateRespondent"), false);
    assert.equal(actions.includes("console.log"), false);
    assert.equal(actions.includes("console.error"), false);
    assert.equal(actions.includes("console.warn"), false);

    const form = readFileSync(
      path.join(root, "src/components/respondents/CreateRespondentForm.tsx"),
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
    assert.equal(form.includes('name="account_id"'), false);
    assert.equal(form.includes('name="normalized_mobile"'), false);
    assert.equal(form.includes("disabled={pending}"), true);
    assert.equal(form.includes("aria-busy={pending}"), true);
    assert.equal(form.includes("EMPTY_CREATE_RESPONDENT_STATE"), true);
    assert.equal(form.includes("createClient"), false);
    assert.equal(form.includes("localStorage"), false);
    assert.equal(form.includes("sessionStorage"), false);
    assert.equal(form.includes("useEffect"), false);

    const page = readFileSync(
      path.join(root, "src/app/respondents/new/page.tsx"),
      "utf8"
    );
    assert.equal(page.includes("requireAppSession"), true);
    assert.equal(page.includes("CreateRespondentForm"), true);
    assert.equal(page.includes("/respondents"), true);
  });
});
