import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseProjectIdParam } from "./detail-params";

describe("parseProjectIdParam", () => {
  it("accepts a valid UUID", () => {
    const id = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const r = parseProjectIdParam(id);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.projectId, id);
  });

  it("rejects invalid, missing, or array malformed values", () => {
    assert.equal(parseProjectIdParam(undefined).ok, false);
    assert.equal(parseProjectIdParam("").ok, false);
    assert.equal(parseProjectIdParam("not-a-uuid").ok, false);
    assert.equal(parseProjectIdParam(["bad"]).ok, false);
    assert.equal(parseProjectIdParam("  ").ok, false);
  });

  it("trims a valid UUID", () => {
    const r = parseProjectIdParam(
      "  aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa  "
    );
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.projectId, "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    }
  });
});
