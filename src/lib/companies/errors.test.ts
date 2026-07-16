import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapCompanyErrorMessage, mapCompanyRpcError } from "./errors";

const codes = [
  "duplicate_company_name",
  "invalid_company_phone",
  "invalid_company_name",
  "invalid_company_contact_person",
  "invalid_company_notes",
  "company_not_found",
  "company_access_denied",
  "invalid_pagination",
  "stale_company_version",
] as const;

describe("mapCompanyErrorMessage", () => {
  for (const code of codes) {
    it(`recognizes ${code}`, () => {
      assert.equal(
        mapCompanyErrorMessage(`ERROR: ${code} (SQLSTATE 22023)`),
        code
      );
    });
  }

  it("fails closed on unknown or empty messages", () => {
    assert.equal(mapCompanyErrorMessage(undefined), "unexpected_company_error");
    assert.equal(mapCompanyErrorMessage(""), "unexpected_company_error");
    assert.equal(
      mapCompanyErrorMessage("relation does not exist"),
      "unexpected_company_error"
    );
  });
});

describe("mapCompanyRpcError", () => {
  it("reads PostgREST-shaped errors without exposing details", () => {
    const code = mapCompanyRpcError({
      message: "duplicate_company_name",
      details: "Key (account_id, normalize_company_name(name))=(...) already exists.",
      hint: "internal",
    });
    assert.equal(code, "duplicate_company_name");
  });

  it("uses details when message is generic", () => {
    assert.equal(
      mapCompanyRpcError({
        message: "JSON object requested, multiple (or no) rows returned",
        details: "company_not_found",
      }),
      "company_not_found"
    );
  });

  it("returns unexpected for unknown shapes", () => {
    assert.equal(mapCompanyRpcError(null), "unexpected_company_error");
    assert.equal(mapCompanyRpcError({}), "unexpected_company_error");
  });
});
