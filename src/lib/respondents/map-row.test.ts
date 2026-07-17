import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mapRespondentDetailRpcRow,
  mapRespondentListRpcRow,
  mapRespondentListRpcRows,
} from "./map-row";

const listRow = {
  respondent_id: "11111111-1111-4111-8111-111111111111",
  name: "Ali",
  mobile: "966512345678",
  age: 30,
  nationality: "Saudi",
  resident_type: "saudi",
  created_at: "2026-07-01T00:00:00.000Z",
  updated_at: "2026-07-02T00:00:00.000Z",
};

const detailRow = {
  ...listRow,
  notes: "hello",
};

describe("mapRespondentListRpcRow", () => {
  it("maps valid list row", () => {
    const m = mapRespondentListRpcRow(listRow);
    assert.ok(m);
    assert.equal(m?.respondentId, listRow.respondent_id);
    assert.equal(m?.name, "Ali");
    assert.equal(m?.mobile, "966512345678");
    assert.equal(m?.age, 30);
    assert.equal(m?.nationality, "Saudi");
    assert.equal(m?.residentType, "saudi");
    assert.equal(m?.createdAt, listRow.created_at);
    assert.equal(m?.updatedAt, listRow.updated_at);
    assert.equal(
      Object.prototype.hasOwnProperty.call(m, "accountId"),
      false
    );
    assert.equal(
      Object.prototype.hasOwnProperty.call(m, "normalizedMobile"),
      false
    );
    assert.equal(Object.prototype.hasOwnProperty.call(m, "notes"), false);
  });

  it("preserves nullable values", () => {
    const m = mapRespondentListRpcRow({
      ...listRow,
      name: null,
      age: null,
      nationality: null,
    });
    assert.ok(m);
    assert.equal(m?.name, null);
    assert.equal(m?.age, null);
    assert.equal(m?.nationality, null);
  });

  it("fails closed on malformed mandatory values", () => {
    assert.equal(mapRespondentListRpcRow(null), null);
    assert.equal(
      mapRespondentListRpcRow({ ...listRow, respondent_id: "not-uuid" }),
      null
    );
    assert.equal(
      mapRespondentListRpcRow({ ...listRow, mobile: "0512345678" }),
      null
    );
    assert.equal(
      mapRespondentListRpcRow({ ...listRow, resident_type: "citizen" }),
      null
    );
    assert.equal(
      mapRespondentListRpcRow({ ...listRow, created_at: "not-a-date" }),
      null
    );
  });

  it("maps arrays defensively", () => {
    const rows = mapRespondentListRpcRows([listRow]);
    assert.ok(rows);
    assert.equal(rows?.length, 1);
    assert.equal(mapRespondentListRpcRows([{ ...listRow, mobile: "bad" }]), null);
    assert.deepEqual(mapRespondentListRpcRows(null), []);
  });
});

describe("mapRespondentDetailRpcRow", () => {
  it("maps valid detail row including notes", () => {
    const m = mapRespondentDetailRpcRow(detailRow);
    assert.ok(m);
    assert.equal(m?.notes, "hello");
    assert.equal(Object.prototype.hasOwnProperty.call(m, "createdBy"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(m, "accountId"), false);
  });

  it("requires notes key (null allowed)", () => {
    assert.equal(mapRespondentDetailRpcRow(listRow), null);
    const m = mapRespondentDetailRpcRow({ ...listRow, notes: null });
    assert.ok(m);
    assert.equal(m?.notes, null);
  });
});
