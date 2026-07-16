import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCreateCompanyRpcArgs,
  buildListCompaniesRpcArgs,
  buildUpdateCompanyRpcArgs,
  collapseWhitespace,
  normalizePhoneInput,
  parseCreateCompanyInput,
  parseListCompaniesInput,
  parseUpdateCompanyInput,
} from "./input";

describe("collapseWhitespace", () => {
  it("trims and collapses internal runs", () => {
    assert.equal(collapseWhitespace("  Acme   Corp  "), "Acme Corp");
  });
});

describe("parseListCompaniesInput", () => {
  it("applies defaults", () => {
    const r = parseListCompaniesInput({});
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.deepEqual(r.data, { search: null, limit: 25, offset: 0 });
    }
  });

  it("trims search and treats empty as null", () => {
    const empty = parseListCompaniesInput({ search: "   " });
    assert.equal(empty.ok, true);
    if (empty.ok) assert.equal(empty.data.search, null);

    const ok = parseListCompaniesInput({ search: "  acme " });
    assert.equal(ok.ok, true);
    if (ok.ok) assert.equal(ok.data.search, "acme");
  });

  it("rejects overlong search and invalid pagination", () => {
    assert.equal(
      parseListCompaniesInput({ search: "x".repeat(121) }).ok,
      false
    );
    assert.equal(parseListCompaniesInput({ limit: 0 }).ok, false);
    assert.equal(parseListCompaniesInput({ limit: 51 }).ok, false);
    assert.equal(parseListCompaniesInput({ offset: -1 }).ok, false);
  });
});

describe("parseCreateCompanyInput", () => {
  it("accepts valid values and nullifies empty optionals", () => {
    const r = parseCreateCompanyInput({
      name: "  Beta   Co ",
      contactPerson: "  ",
      phone: "",
      notes: "   ",
    });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.data.name, "Beta Co");
      assert.equal(r.data.contactPerson, null);
      assert.equal(r.data.phone, null);
      assert.equal(r.data.notes, null);
    }
  });

  it("enforces max lengths", () => {
    assert.equal(
      parseCreateCompanyInput({ name: "n".repeat(121) }).ok,
      false
    );
    assert.equal(
      parseCreateCompanyInput({
        name: "Ok",
        contactPerson: "c".repeat(81),
      }).ok,
      false
    );
    assert.equal(
      parseCreateCompanyInput({ name: "Ok", notes: "n".repeat(2001) }).ok,
      false
    );
  });

  it("normalizes Saudi local phone and rejects invalid phones", () => {
    const ok = parseCreateCompanyInput({
      name: "Ok",
      phone: "05 1234 5678",
    });
    assert.equal(ok.ok, true);
    if (ok.ok) assert.equal(ok.data.phone, "966512345678");

    const bad = parseCreateCompanyInput({ name: "Ok", phone: "abc" });
    assert.equal(bad.ok, false);
    if (!bad.ok) assert.equal(bad.code, "invalid_company_phone");
  });
});

describe("parseUpdateCompanyInput", () => {
  const companyId = "11111111-1111-1111-1111-111111111111";
  const expectedUpdatedAt = "2026-07-16T10:00:00.000Z";

  it("requires expected_updated_at and valid company id", () => {
    const missingTs = parseUpdateCompanyInput({
      companyId,
      name: "Ok",
    });
    assert.equal(missingTs.ok, false);
    if (!missingTs.ok) assert.equal(missingTs.code, "stale_company_version");

    const badId = parseUpdateCompanyInput({
      companyId: "not-a-uuid",
      name: "Ok",
      expectedUpdatedAt,
    });
    assert.equal(badId.ok, false);
  });

  it("accepts a complete update payload", () => {
    const r = parseUpdateCompanyInput({
      companyId,
      name: " Gamma ",
      expectedUpdatedAt,
      contactPerson: "Ali",
      phone: null,
      notes: null,
    });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.data.companyId, companyId);
      assert.equal(r.data.expectedUpdatedAt, expectedUpdatedAt);
      assert.equal(r.data.name, "Gamma");
    }
  });
});

describe("RPC argument builders", () => {
  it("maps list defaults and search", () => {
    assert.deepEqual(
      buildListCompaniesRpcArgs({ search: null, limit: 25, offset: 0 }),
      { p_search: null, p_limit: 25, p_offset: 0 }
    );
    assert.deepEqual(
      buildListCompaniesRpcArgs({ search: "acme", limit: 10, offset: 20 }),
      { p_search: "acme", p_limit: 10, p_offset: 20 }
    );
  });

  it("maps create parameter names exactly", () => {
    assert.deepEqual(
      buildCreateCompanyRpcArgs({
        name: "A",
        contactPerson: "B",
        phone: "966512345678",
        notes: "N",
      }),
      {
        p_name: "A",
        p_contact_person: "B",
        p_phone: "966512345678",
        p_notes: "N",
      }
    );
  });

  it("maps update with corrected parameter order and required expected_updated_at", () => {
    const args = buildUpdateCompanyRpcArgs({
      companyId: "11111111-1111-1111-1111-111111111111",
      name: "A",
      expectedUpdatedAt: "2026-07-16T10:00:00.000Z",
      contactPerson: null,
      phone: null,
      notes: null,
    });
    assert.deepEqual(Object.keys(args), [
      "p_company_id",
      "p_name",
      "p_expected_updated_at",
      "p_contact_person",
      "p_phone",
      "p_notes",
    ]);
    assert.equal(args.p_expected_updated_at, "2026-07-16T10:00:00.000Z");
    assert.equal(args.p_company_id, "11111111-1111-1111-1111-111111111111");
  });
});

describe("normalizePhoneInput", () => {
  it("returns null for empty", () => {
    assert.deepEqual(normalizePhoneInput(""), { ok: true, data: null });
    assert.deepEqual(normalizePhoneInput(null), { ok: true, data: null });
  });
});
