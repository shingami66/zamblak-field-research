import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCreateRespondentRpcArgs,
  buildListRespondentsRpcArgs,
  buildUpdateRespondentRpcArgs,
  collapseWhitespace,
  normalizeRespondentMobileInput,
  parseCreateRespondentInput,
  parseListRespondentsInput,
  parseUpdateRespondentInput,
} from "./input";

describe("collapseWhitespace", () => {
  it("trims and collapses internal runs", () => {
    assert.equal(collapseWhitespace("  Ali   Ahmed  "), "Ali Ahmed");
  });
});

describe("normalizeRespondentMobileInput", () => {
  it("accepts 05xxxxxxxx", () => {
    const r = normalizeRespondentMobileInput("0512345678");
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.data, "966512345678");
  });

  it("accepts 5xxxxxxxx", () => {
    const r = normalizeRespondentMobileInput("512345678");
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.data, "966512345678");
  });

  it("accepts 9665xxxxxxxx", () => {
    const r = normalizeRespondentMobileInput("966512345678");
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.data, "966512345678");
  });

  it("accepts +9665xxxxxxxx and formatted forms", () => {
    for (const raw of [
      "+966512345678",
      "966 512 345 678",
      "966-512-345-678",
      "(966) 512-345678",
      "05 1234 5678",
    ]) {
      const r = normalizeRespondentMobileInput(raw);
      assert.equal(r.ok, true, raw);
      if (r.ok) assert.equal(r.data, "966512345678", raw);
    }
  });

  it("rejects invalid characters", () => {
    assert.equal(normalizeRespondentMobileInput("05abc45678").ok, false);
    assert.equal(normalizeRespondentMobileInput("05*2345678").ok, false);
  });

  it("rejects invalid prefixes", () => {
    assert.equal(normalizeRespondentMobileInput("0412345678").ok, false);
    assert.equal(normalizeRespondentMobileInput("966412345678").ok, false);
    assert.equal(normalizeRespondentMobileInput("1234567890").ok, false);
  });

  it("rejects invalid lengths", () => {
    assert.equal(normalizeRespondentMobileInput("051234567").ok, false);
    assert.equal(normalizeRespondentMobileInput("05123456789").ok, false);
    assert.equal(normalizeRespondentMobileInput("96651234567").ok, false);
  });

  it("rejects empty and null", () => {
    assert.equal(normalizeRespondentMobileInput("").ok, false);
    assert.equal(normalizeRespondentMobileInput("   ").ok, false);
    assert.equal(normalizeRespondentMobileInput(null).ok, false);
    assert.equal(normalizeRespondentMobileInput(undefined).ok, false);
  });
});

describe("parseListRespondentsInput", () => {
  it("applies defaults", () => {
    const r = parseListRespondentsInput({});
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.deepEqual(r.data, { search: null, limit: 25, offset: 0 });
    }
  });

  it("trims search and treats empty as null", () => {
    const empty = parseListRespondentsInput({ search: "   " });
    assert.equal(empty.ok, true);
    if (empty.ok) assert.equal(empty.data.search, null);

    const ok = parseListRespondentsInput({ search: "  ali " });
    assert.equal(ok.ok, true);
    if (ok.ok) assert.equal(ok.data.search, "ali");
  });

  it("enforces search-length ceiling", () => {
    const r = parseListRespondentsInput({ search: "a".repeat(121) });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, "invalid_pagination");
  });

  it("enforces limit and offset boundaries", () => {
    assert.equal(parseListRespondentsInput({ limit: 0 }).ok, false);
    assert.equal(parseListRespondentsInput({ limit: 51 }).ok, false);
    assert.equal(parseListRespondentsInput({ limit: 1.5 }).ok, false);
    assert.equal(parseListRespondentsInput({ offset: -1 }).ok, false);
    assert.equal(parseListRespondentsInput({ limit: 50, offset: 0 }).ok, true);
  });
});

describe("parseCreateRespondentInput", () => {
  it("accepts complete valid input", () => {
    const r = parseCreateRespondentInput({
      mobile: "0512345678",
      name: "  Ali   Ahmed ",
      age: 30,
      nationality: "  Saudi  ",
      residentType: "saudi",
      notes: "  note  ",
    });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.data.mobile, "966512345678");
      assert.equal(r.data.name, "Ali Ahmed");
      assert.equal(r.data.age, 30);
      assert.equal(r.data.nationality, "Saudi");
      assert.equal(r.data.residentType, "saudi");
      assert.equal(r.data.notes, "note");
    }
  });

  it("preserves nullable optionals and name nullability", () => {
    const r = parseCreateRespondentInput({
      mobile: "966512345678",
      name: "   ",
      age: null,
      nationality: null,
      notes: "",
    });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.data.name, null);
      assert.equal(r.data.age, null);
      assert.equal(r.data.nationality, null);
      assert.equal(r.data.notes, null);
      assert.equal(r.data.residentType, "unknown");
    }
  });

  it("enforces age rules without rounding", () => {
    assert.equal(parseCreateRespondentInput({ mobile: "0512345678", age: -1 }).ok, false);
    assert.equal(parseCreateRespondentInput({ mobile: "0512345678", age: 121 }).ok, false);
    assert.equal(parseCreateRespondentInput({ mobile: "0512345678", age: 1.5 }).ok, false);
    assert.equal(parseCreateRespondentInput({ mobile: "0512345678", age: 0 }).ok, true);
    assert.equal(parseCreateRespondentInput({ mobile: "0512345678", age: 120 }).ok, true);
  });

  it("enforces resident_type vocabulary", () => {
    assert.equal(
      parseCreateRespondentInput({ mobile: "0512345678", residentType: "citizen" }).ok,
      false
    );
    for (const t of ["saudi", "non_saudi", "unknown"] as const) {
      const r = parseCreateRespondentInput({ mobile: "0512345678", residentType: t });
      assert.equal(r.ok, true);
      if (r.ok) assert.equal(r.data.residentType, t);
    }
  });

  it("maps exact create RPC argument names", () => {
    const r = parseCreateRespondentInput({
      mobile: "0512345678",
      name: null,
      age: null,
      nationality: null,
      residentType: "unknown",
      notes: null,
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.deepEqual(buildCreateRespondentRpcArgs(r.data), {
      p_mobile: "966512345678",
      p_name: null,
      p_age: null,
      p_nationality: null,
      p_resident_type: "unknown",
      p_notes: null,
    });
  });
});

describe("parseUpdateRespondentInput", () => {
  const base = {
    respondentId: "11111111-1111-4111-8111-111111111111",
    expectedUpdatedAt: "2026-07-17T12:00:00.000Z",
    mobile: "966512345678",
  };

  it("requires UUID and expectedUpdatedAt", () => {
    assert.equal(parseUpdateRespondentInput({ ...base, respondentId: "bad" }).ok, false);
    assert.equal(
      parseUpdateRespondentInput({ ...base, expectedUpdatedAt: null }).ok,
      false
    );
    assert.equal(
      parseUpdateRespondentInput({ ...base, expectedUpdatedAt: "not-a-date" }).ok,
      false
    );
  });

  it("maps exact optimistic concurrency parameter names", () => {
    const r = parseUpdateRespondentInput(base);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const args = buildUpdateRespondentRpcArgs(r.data);
    assert.deepEqual(args, {
      p_respondent_id: base.respondentId,
      p_mobile: "966512345678",
      p_expected_updated_at: base.expectedUpdatedAt,
      p_name: null,
      p_age: null,
      p_nationality: null,
      p_resident_type: "unknown",
      p_notes: null,
    });
    assert.deepEqual(Object.keys(args), [
      "p_respondent_id",
      "p_mobile",
      "p_expected_updated_at",
      "p_name",
      "p_age",
      "p_nationality",
      "p_resident_type",
      "p_notes",
    ]);
  });

  it("builds list RPC args exactly", () => {
    assert.deepEqual(
      buildListRespondentsRpcArgs({ search: "x", limit: 10, offset: 2 }),
      { p_search: "x", p_limit: 10, p_offset: 2 }
    );
  });
});
