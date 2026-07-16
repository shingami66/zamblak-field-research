import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapCompanyRpcRow, mapCompanyRpcRows } from "./map-row";

const validRow = {
  company_id: "11111111-1111-1111-1111-111111111111",
  account_id: "22222222-2222-2222-2222-222222222222",
  name: "Acme",
  contact_person: null,
  phone: null,
  notes: null,
  created_by: "33333333-3333-3333-3333-333333333333",
  updated_by: null,
  created_at: "2026-07-01T00:00:00.000Z",
  updated_at: "2026-07-02T00:00:00.000Z",
  active_projects_count: 0,
  completed_projects_count: 0,
};

describe("mapCompanyRpcRow", () => {
  it("maps a complete valid row including zero counts and nullables", () => {
    const mapped = mapCompanyRpcRow(validRow);
    assert.ok(mapped);
    assert.equal(mapped.companyId, validRow.company_id);
    assert.equal(mapped.accountId, validRow.account_id);
    assert.equal(mapped.name, "Acme");
    assert.equal(mapped.contactPerson, null);
    assert.equal(mapped.phone, null);
    assert.equal(mapped.notes, null);
    assert.equal(mapped.updatedBy, null);
    assert.equal(mapped.activeProjectsCount, 0);
    assert.equal(mapped.completedProjectsCount, 0);
    assert.equal(mapped.createdAt, validRow.created_at);
  });

  it("rejects malformed required fields and counts", () => {
    assert.equal(mapCompanyRpcRow({ ...validRow, company_id: "bad" }), null);
    assert.equal(mapCompanyRpcRow({ ...validRow, name: null }), null);
    assert.equal(
      mapCompanyRpcRow({ ...validRow, active_projects_count: -1 }),
      null
    );
    assert.equal(
      mapCompanyRpcRow({ ...validRow, completed_projects_count: 1.5 }),
      null
    );
    assert.equal(
      mapCompanyRpcRow({ ...validRow, created_at: "not-a-date" }),
      null
    );
    assert.equal(mapCompanyRpcRow(null), null);
  });
});

describe("mapCompanyRpcRows", () => {
  it("maps arrays and empty payloads", () => {
    assert.deepEqual(mapCompanyRpcRows([]), []);
    assert.deepEqual(mapCompanyRpcRows(null), []);
    const rows = mapCompanyRpcRows([validRow]);
    assert.ok(rows);
    assert.equal(rows.length, 1);
  });

  it("fails closed if any row is invalid", () => {
    assert.equal(
      mapCompanyRpcRows([validRow, { ...validRow, company_id: "x" }]),
      null
    );
  });
});
