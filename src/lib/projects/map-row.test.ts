import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mapProjectDetailRpcRow,
  mapProjectDetailRpcRows,
  mapProjectListRpcRow,
  mapProjectListRpcRows,
} from "./map-row";

const listRow = {
  project_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  project_name: "Survey A",
  company_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  company_name: "Acme Co",
  domain: "telecom",
  status: "draft",
  start_date: "2026-01-01",
  end_date: null,
  quota: 10,
  updated_at: "2026-07-02T00:00:00.000Z",
};

const detailRow = {
  ...listRow,
  min_age: 18,
  max_age: 65,
  required_resident_type: "any",
  eligibility_notes: null,
  requires_three_month_warning: true,
  whatsapp_template_ar: null,
  whatsapp_template_en: null,
  notes: "note",
  created_at: "2026-07-01T00:00:00.000Z",
};

describe("mapProjectListRpcRow", () => {
  it("maps a complete list row with nullables", () => {
    const mapped = mapProjectListRpcRow(listRow);
    assert.ok(mapped);
    assert.equal(mapped.projectId, listRow.project_id);
    assert.equal(mapped.projectName, "Survey A");
    assert.equal(mapped.companyId, listRow.company_id);
    assert.equal(mapped.companyName, "Acme Co");
    assert.equal(mapped.domain, "telecom");
    assert.equal(mapped.status, "draft");
    assert.equal(mapped.startDate, "2026-01-01");
    assert.equal(mapped.endDate, null);
    assert.equal(mapped.quota, 10);
    assert.equal(mapped.updatedAt, listRow.updated_at);
    // snake_case must not escape
    assert.equal(
      Object.prototype.hasOwnProperty.call(mapped, "project_id"),
      false
    );
    assert.equal(
      Object.prototype.hasOwnProperty.call(mapped, "project_name"),
      false
    );
  });

  it("rejects malformed required fields", () => {
    assert.equal(
      mapProjectListRpcRow({ ...listRow, project_id: "bad" }),
      null
    );
    assert.equal(mapProjectListRpcRow({ ...listRow, domain: "x" }), null);
    assert.equal(mapProjectListRpcRow({ ...listRow, status: "open" }), null);
    assert.equal(mapProjectListRpcRow({ ...listRow, quota: -1 }), null);
    assert.equal(mapProjectListRpcRow(null), null);
  });
});

describe("mapProjectDetailRpcRow", () => {
  it("maps a complete detail row including null text fields", () => {
    const mapped = mapProjectDetailRpcRow(detailRow);
    assert.ok(mapped);
    assert.equal(mapped.projectId, detailRow.project_id);
    assert.equal(mapped.minAge, 18);
    assert.equal(mapped.maxAge, 65);
    assert.equal(mapped.requiredResidentType, "any");
    assert.equal(mapped.eligibilityNotes, null);
    assert.equal(mapped.requiresThreeMonthWarning, true);
    assert.equal(mapped.whatsappTemplateAr, null);
    assert.equal(mapped.whatsappTemplateEn, null);
    assert.equal(mapped.notes, "note");
    assert.equal(mapped.createdAt, detailRow.created_at);
    assert.equal(
      Object.prototype.hasOwnProperty.call(mapped, "account_id"),
      false
    );
    assert.equal(
      Object.prototype.hasOwnProperty.call(mapped, "price_per_accepted_form"),
      false
    );
  });

  it("rejects missing required detail fields", () => {
    assert.equal(
      mapProjectDetailRpcRow({ ...detailRow, required_resident_type: "x" }),
      null
    );
    assert.equal(
      mapProjectDetailRpcRow({
        ...detailRow,
        requires_three_month_warning: "yes",
      }),
      null
    );
  });
});

describe("mapProjectListRpcRows / mapProjectDetailRpcRows", () => {
  it("maps arrays and empty payloads", () => {
    assert.deepEqual(mapProjectListRpcRows([]), []);
    assert.deepEqual(mapProjectListRpcRows(null), []);
    const rows = mapProjectListRpcRows([listRow]);
    assert.ok(rows);
    assert.equal(rows.length, 1);
  });

  it("fails closed if any row is invalid", () => {
    assert.equal(
      mapProjectListRpcRows([listRow, { ...listRow, project_id: "x" }]),
      null
    );
    assert.equal(
      mapProjectDetailRpcRows([detailRow, { ...detailRow, domain: "nope" }]),
      null
    );
  });
});
