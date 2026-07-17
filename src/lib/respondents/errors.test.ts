import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LIVE_RESPONDENT_ERROR_TOKENS,
  mapRespondentErrorMessage,
  mapRespondentRpcError,
} from "./errors";

describe("mapRespondentErrorMessage", () => {
  it("covers every live token", () => {
    for (const token of LIVE_RESPONDENT_ERROR_TOKENS) {
      assert.equal(mapRespondentErrorMessage(`prefix ${token} suffix`), token);
    }
  });

  it("uses longest-token-first for potential collisions", () => {
    assert.equal(
      mapRespondentErrorMessage("invalid_respondent_resident_type"),
      "invalid_respondent_resident_type"
    );
    assert.equal(
      mapRespondentErrorMessage("invalid_respondent_nationality"),
      "invalid_respondent_nationality"
    );
    assert.equal(
      mapRespondentErrorMessage("duplicate_respondent_mobile"),
      "duplicate_respondent_mobile"
    );
  });

  it("falls back for unknown messages", () => {
    assert.equal(
      mapRespondentErrorMessage("some postgres constraint xyz"),
      "unexpected_respondent_error"
    );
    assert.equal(mapRespondentErrorMessage(null), "unexpected_respondent_error");
  });
});

describe("mapRespondentRpcError", () => {
  it("reads token from details when message is generic", () => {
    assert.equal(
      mapRespondentRpcError({
        message: "JSON object requested, multiple (or no) rows returned",
        details: "respondent_not_found",
      }),
      "respondent_not_found"
    );
  });

  it("reads token from hint", () => {
    assert.equal(
      mapRespondentRpcError({
        message: "error",
        hint: "stale_respondent_version",
      }),
      "stale_respondent_version"
    );
  });

  it("never returns raw database text as code", () => {
    const code = mapRespondentRpcError({
      message: "duplicate key value violates unique constraint idx_respondents",
    });
    assert.equal(code, "unexpected_respondent_error");
  });

  it("handles unknown shapes", () => {
    assert.equal(mapRespondentRpcError(null), "unexpected_respondent_error");
    assert.equal(mapRespondentRpcError(42), "unexpected_respondent_error");
  });
});
