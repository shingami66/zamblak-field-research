import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LIVE_PROJECT_ERROR_TOKENS,
  RESERVED_PROJECT_ERROR_TOKENS,
  mapProjectErrorMessage,
  mapProjectRpcError,
} from "./errors";

describe("mapProjectErrorMessage", () => {
  for (const code of LIVE_PROJECT_ERROR_TOKENS) {
    it(`recognizes live token ${code}`, () => {
      assert.equal(
        mapProjectErrorMessage(`ERROR: ${code} (SQLSTATE 22023)`),
        code
      );
    });
  }

  it("does not treat reserved project_company_unavailable as live emission", () => {
    assert.ok(
      RESERVED_PROJECT_ERROR_TOKENS.includes("project_company_unavailable")
    );
    assert.equal(
      LIVE_PROJECT_ERROR_TOKENS.includes(
        // @ts-expect-error reserved is intentionally not live
        "project_company_unavailable"
      ),
      false
    );
    // Message containing only the reserved token maps to unexpected (not live).
    assert.equal(
      mapProjectErrorMessage("project_company_unavailable"),
      "unexpected_project_error"
    );
  });

  it("fails closed on unknown or empty messages", () => {
    assert.equal(mapProjectErrorMessage(undefined), "unexpected_project_error");
    assert.equal(mapProjectErrorMessage(""), "unexpected_project_error");
    assert.equal(
      mapProjectErrorMessage("relation does not exist"),
      "unexpected_project_error"
    );
    assert.equal(
      mapProjectErrorMessage("violates foreign key constraint projects_company_id_fkey"),
      "unexpected_project_error"
    );
  });
});

describe("mapProjectRpcError", () => {
  it("reads PostgREST-shaped errors without exposing details", () => {
    const code = mapProjectRpcError({
      message: "invalid_project_status_transition",
      details: "Key (...) = (...) already exists.",
      hint: "internal",
    });
    assert.equal(code, "invalid_project_status_transition");
  });

  it("uses details when message is generic", () => {
    assert.equal(
      mapProjectRpcError({
        message: "JSON object requested, multiple (or no) rows returned",
        details: "project_not_found",
      }),
      "project_not_found"
    );
  });

  it("returns unexpected for unknown shapes and never returns raw prose", () => {
    assert.equal(mapProjectRpcError(null), "unexpected_project_error");
    assert.equal(mapProjectRpcError({}), "unexpected_project_error");
    const code = mapProjectRpcError({
      message: "permission denied for table projects",
    });
    assert.equal(code, "unexpected_project_error");
    assert.notEqual(code, "permission denied for table projects");
  });
});
