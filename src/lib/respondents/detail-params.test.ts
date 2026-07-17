import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseRespondentDetailParam } from "./detail-params";

const lower = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const upper = "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA";

describe("parseRespondentDetailParam", () => {
  it("accepts a valid lowercase UUID and preserves it", () => {
    const r = parseRespondentDetailParam(lower);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.respondentId, lower);
  });

  it("accepts a valid uppercase UUID and preserves it", () => {
    const r = parseRespondentDetailParam(upper);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.respondentId, upper);
  });

  it("rejects undefined, empty, and whitespace-only", () => {
    assert.equal(parseRespondentDetailParam(undefined).ok, false);
    assert.equal(parseRespondentDetailParam("").ok, false);
    assert.equal(parseRespondentDetailParam("   ").ok, false);
    assert.equal(parseRespondentDetailParam("\t").ok, false);
  });

  it("rejects leading or trailing whitespace without normalizing into validity", () => {
    assert.equal(parseRespondentDetailParam(` ${lower}`).ok, false);
    assert.equal(parseRespondentDetailParam(`${lower} `).ok, false);
    assert.equal(parseRespondentDetailParam(`  ${lower}  `).ok, false);
  });

  it("rejects malformed UUID and arrays", () => {
    assert.equal(parseRespondentDetailParam("not-a-uuid").ok, false);
    assert.equal(parseRespondentDetailParam("aaaaaaaa-aaaa-aaaa-aaaa").ok, false);
    assert.equal(parseRespondentDetailParam([lower]).ok, false);
    assert.equal(parseRespondentDetailParam(["bad"]).ok, false);
  });
});
