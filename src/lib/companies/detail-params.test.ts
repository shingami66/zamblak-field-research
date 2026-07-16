import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseCompanyIdParam } from "./detail-params";

describe("parseCompanyIdParam", () => {
  it("accepts a valid UUID", () => {
    const id = "11111111-1111-1111-1111-111111111111";
    const r = parseCompanyIdParam(id);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.companyId, id);
  });

  it("rejects invalid, missing, or array malformed values", () => {
    assert.equal(parseCompanyIdParam(undefined).ok, false);
    assert.equal(parseCompanyIdParam("").ok, false);
    assert.equal(parseCompanyIdParam("not-a-uuid").ok, false);
    assert.equal(parseCompanyIdParam(["bad"]).ok, false);
    assert.equal(parseCompanyIdParam("  ").ok, false);
  });

  it("trims a valid UUID", () => {
    const r = parseCompanyIdParam("  11111111-1111-1111-1111-111111111111  ");
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.companyId, "11111111-1111-1111-1111-111111111111");
    }
  });
});
