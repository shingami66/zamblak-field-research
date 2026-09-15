import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { isValidIdempotencyKey } from "@/lib/idempotency/key";

describe("New Form Server Action - Idempotency & Domain Contracts (DEC-FORM-006)", () => {
  const actionsFilePath = path.join(__dirname, "actions.ts");
  const source = fs.readFileSync(actionsFilePath, "utf8");

  it('declares "use server" and exports createResearchFormAction', () => {
    assert.ok(source.includes('"use server";'), 'Must declare "use server"');
    assert.ok(
      source.includes("export async function createResearchFormAction"),
      "Must export createResearchFormAction"
    );
  });

  it("does not generate Date.now() or timestamp-based idempotency keys", () => {
    assert.equal(
      source.includes("Date.now()"),
      false,
      "Must not invent Date.now() timestamp keys"
    );
    assert.equal(
      source.includes("submit-form-${participationId}"),
      false,
      "Must not construct ad-hoc submission keys in Server Action"
    );
  });

  it("requires caller-provided idempotencyKey and validates it with isValidIdempotencyKey", () => {
    assert.ok(
      source.includes("idempotencyKey: string;"),
      "Must require idempotencyKey in formData parameter"
    );
    assert.ok(
      source.includes("isValidIdempotencyKey(idempotencyKey)"),
      "Must validate caller-provided key using isValidIdempotencyKey"
    );
    assert.ok(
      source.includes('code: "invalid_input"'),
      "Must return invalid_input when idempotencyKey is invalid"
    );
    assert.ok(
      source.includes("معرّف العملية غير صالح."),
      "Must provide user-safe Arabic message on invalid idempotency key"
    );
  });

  it("forwards caller-provided idempotencyKey unchanged to submitResearchForm", () => {
    assert.ok(
      source.includes("submitResearchForm(supabase, {"),
      "Must call submitResearchForm with Supabase client and payload"
    );
    assert.ok(
      source.includes("idempotencyKey: idempotencyKey.trim(),"),
      "Must forward caller-provided idempotencyKey directly to submitResearchForm"
    );
  });

  it("preserves existing domain duplicate and eligibility safeguards", () => {
    // duplicate participation/form
    assert.ok(
      source.includes('res.code === "duplicate_participation"'),
      "Must check duplicate_participation"
    );
    assert.ok(
      source.includes('res.code === "duplicate_accepted_form"'),
      "Must check duplicate_accepted_form"
    );
    assert.ok(
      source.includes('code: "duplicate_form"'),
      "Must map duplicate form code"
    );
    assert.ok(
      source.includes("تم تسجيل استمارة لهذا المشارك في المشروع بالفعل. حدّث الصفحة لعرضها."),
      "Must preserve duplicate form message"
    );

    // project closed / invalid state
    assert.ok(
      source.includes('res.code === "research_form_state_invalid"'),
      "Must check research_form_state_invalid"
    );
    assert.ok(
      source.includes('code: "project_not_eligible"'),
      "Must map project not eligible code"
    );

    // participant not assigned
    assert.ok(
      source.includes('res.code === "participation_not_eligible"'),
      "Must check participation_not_eligible"
    );
    assert.ok(
      source.includes('code: "participant_not_assigned"'),
      "Must map participant not assigned code"
    );
  });

  it("verifies idempotency key validator contract used by actions", () => {
    assert.equal(isValidIdempotencyKey(""), false);
    assert.equal(isValidIdempotencyKey("short"), false);
    assert.equal(isValidIdempotencyKey("12345678"), true);
    assert.equal(isValidIdempotencyKey("a".repeat(128)), true);
    assert.equal(isValidIdempotencyKey("a".repeat(129)), false);
  });
});
