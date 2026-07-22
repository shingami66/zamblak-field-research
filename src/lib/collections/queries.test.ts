import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getCollection,
  getCollectionReplacementRelations,
  listCollectionAllocationHistory,
  listCollections,
  listCurrentCollectionAllocations,
  parseCollectionAllocationRevisionRow,
  parseCollectionAllocationRow,
  parseCollectionRow,
  parseCollectionSummaryRow,
} from "./queries";

const VALID_UUID_1 = "11111111-1111-4111-8111-111111111111";
const VALID_UUID_2 = "22222222-2222-4222-8222-222222222222";
const VALID_UUID_3 = "33333333-3333-4333-8333-333333333333";

describe("Collections Query Contracts (Slice A2 Core)", () => {
  describe("Runtime Row Parsers", () => {
    it("parses valid CollectionRow and rejects invalid rows", () => {
      const rawValid = {
        id: VALID_UUID_1,
        account_id: VALID_UUID_1,
        company_id: VALID_UUID_1,
        code: "COL-001",
        receipt_date: "2026-07-23",
        total_amount: 1000.0,
        payment_method: "bank_transfer",
        reference_number: "REF-100",
        status: "active",
        version: 1,
        void_reason: null,
        voided_at: null,
        voided_by: null,
        replaces_collection_id: null,
        notes: null,
        created_by: VALID_UUID_1,
        updated_by: VALID_UUID_1,
        created_at: "2026-07-23T10:00:00Z",
        updated_at: "2026-07-23T10:00:00Z",
      };

      const parsed = parseCollectionRow(rawValid);
      assert.notEqual(parsed, null);
      assert.equal(parsed?.code, "COL-001");

      // Bad payment_method
      assert.equal(
        parseCollectionRow({ ...rawValid, payment_method: "crypto" }),
        null
      );
      // Non-positive total_amount
      assert.equal(parseCollectionRow({ ...rawValid, total_amount: 0 }), null);
    });

    it("parses valid CollectionSummaryRow and rejects invalid rows", () => {
      const rawValid = {
        collection_id: VALID_UUID_1,
        account_id: VALID_UUID_1,
        company_id: VALID_UUID_1,
        collection_code: "COL-001",
        receipt_date: "2026-07-23",
        total_amount: 1000.0,
        payment_method: "cash",
        reference_number: null,
        status: "active",
        version: 1,
        void_reason: null,
        voided_at: null,
        replaces_collection_id: null,
        allocated_amount: 400.0,
        unallocated_amount: 600.0,
        allocation_state: "partially_allocated",
      };

      const parsed = parseCollectionSummaryRow(rawValid);
      assert.notEqual(parsed, null);
      assert.equal(parsed?.allocation_state, "partially_allocated");

      // Bad allocation_state
      assert.equal(
        parseCollectionSummaryRow({ ...rawValid, allocation_state: "done" }),
        null
      );
    });

    it("parses valid CollectionAllocationRevisionRow and CollectionAllocationRow (7 columns)", () => {
      const rawRev = {
        id: VALID_UUID_1,
        account_id: VALID_UUID_1,
        collection_id: VALID_UUID_1,
        revision_number: 1,
        expected_previous_version: 0,
        reason: null,
        created_by: VALID_UUID_1,
        created_at: "2026-07-23T10:00:00Z",
      };
      assert.notEqual(parseCollectionAllocationRevisionRow(rawRev), null);

      const rawAlloc = {
        id: VALID_UUID_2,
        account_id: VALID_UUID_1,
        revision_id: VALID_UUID_1,
        research_form_id: VALID_UUID_3,
        amount: 400.0,
        created_by: VALID_UUID_1,
        created_at: "2026-07-23T10:00:00Z",
      };
      const parsedAlloc = parseCollectionAllocationRow(rawAlloc);
      assert.notEqual(parsedAlloc, null);
      assert.equal(parsedAlloc?.amount, 400.0);
    });
  });

  describe("Query Wrappers & Mock Supabase Chaining", () => {
    it("listCollections enforces date range validation", async () => {
      const mockSupabase = {} as SupabaseClient;

      const badDateRange = await listCollections(mockSupabase, {
        receiptDateFrom: "2026-08-01",
        receiptDateTo: "2026-07-01",
      });
      assert.equal(badDateRange.ok, false);
      if (!badDateRange.ok) {
        assert.equal(badDateRange.code, "invalid_query_input");
      }
    });

    it("getCollection returns collection_not_found for 0 rows", async () => {
      const mockSupabase = {
        from: () => ({
          select: () => ({
            eq: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      } as unknown as SupabaseClient;

      const res = await getCollection(mockSupabase, VALID_UUID_1);
      assert.equal(res.ok, false);
      if (!res.ok) {
        assert.equal(res.code, "collection_not_found");
      }
    });

    it("listCurrentCollectionAllocations detects stale read if collection version changes during sequence", async () => {
      let readCount = 0;

      const mockSupabase = {
        from: (table: string) => {
          if (table === "collections") {
            return {
              select: () => ({
                eq: () => {
                  readCount++;
                  const ver = readCount === 1 ? 1 : 2; // version changes from 1 to 2!
                  return Promise.resolve({
                    data: [{ id: VALID_UUID_1, version: ver }],
                    error: null,
                  });
                },
              }),
            };
          }
          if (table === "collection_allocation_revisions") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () =>
                    Promise.resolve({
                      data: [
                        {
                          id: VALID_UUID_2,
                          account_id: VALID_UUID_1,
                          collection_id: VALID_UUID_1,
                          revision_number: 1,
                          expected_previous_version: 0,
                          reason: null,
                          created_by: VALID_UUID_1,
                          created_at: "2026-07-23T10:00:00Z",
                        },
                      ],
                      error: null,
                    }),
                }),
              }),
            };
          }
          if (table === "collection_allocations") {
            return {
              select: () => ({
                eq: () => ({
                  order: () => ({
                    order: () => Promise.resolve({ data: [], error: null }),
                  }),
                }),
              }),
            };
          }
          return {};
        },
      } as unknown as SupabaseClient;

      const res = await listCurrentCollectionAllocations(mockSupabase, VALID_UUID_1);
      assert.equal(res.ok, false);
      if (!res.ok) {
        assert.equal(res.code, "stale_collection_read");
      }
    });

    it("listCollectionAllocationHistory uses bounded single .in() query for all allocation lines", async () => {
      let inQueryExecuted = false;

      const mockSupabase = {
        from: (table: string) => {
          if (table === "collections") {
            return {
              select: () => ({
                eq: () =>
                  Promise.resolve({
                    data: [{ id: VALID_UUID_1 }],
                    error: null,
                  }),
              }),
            };
          }
          if (table === "collection_allocation_revisions") {
            return {
              select: () => ({
                eq: () => ({
                  order: () =>
                    Promise.resolve({
                      data: [
                        {
                          id: VALID_UUID_2,
                          account_id: VALID_UUID_1,
                          collection_id: VALID_UUID_1,
                          revision_number: 2,
                          expected_previous_version: 1,
                          reason: "Added allocation",
                          created_by: VALID_UUID_1,
                          created_at: "2026-07-23T11:00:00Z",
                        },
                      ],
                      error: null,
                    }),
                }),
              }),
            };
          }
          if (table === "collection_allocations") {
            return {
              select: () => ({
                in: (field: string, ids: string[]) => {
                  inQueryExecuted = true;
                  assert.equal(field, "revision_id");
                  assert.deepEqual(ids, [VALID_UUID_2]);
                  return {
                    order: () => ({
                      order: () =>
                        Promise.resolve({
                          data: [
                            {
                              id: VALID_UUID_3,
                              account_id: VALID_UUID_1,
                              revision_id: VALID_UUID_2,
                              research_form_id: VALID_UUID_1,
                              amount: 500.0,
                              created_by: VALID_UUID_1,
                              created_at: "2026-07-23T11:00:00Z",
                            },
                          ],
                          error: null,
                        }),
                    }),
                  };
                },
              }),
            };
          }
          return {};
        },
      } as unknown as SupabaseClient;

      const res = await listCollectionAllocationHistory(mockSupabase, VALID_UUID_1);
      assert.equal(res.ok, true);
      assert.equal(inQueryExecuted, true);
      if (res.ok) {
        assert.equal(res.data.length, 1);
        assert.equal(res.data[0].revision.revision_number, 2);
        assert.equal(res.data[0].allocations.length, 1);
        assert.equal(res.data[0].allocations[0].amount, 500.0);
      }
    });

    it("getCollectionReplacementRelations detects duplicate replacement children violation", async () => {
      const mockCollectionRaw = {
        id: VALID_UUID_1,
        account_id: VALID_UUID_1,
        company_id: VALID_UUID_1,
        code: "COL-001",
        receipt_date: "2026-07-23",
        total_amount: 1000.0,
        payment_method: "cash",
        reference_number: null,
        status: "voided",
        version: 1,
        void_reason: "Replaced by COL-002",
        voided_at: "2026-07-23T10:00:00Z",
        voided_by: VALID_UUID_1,
        replaces_collection_id: null,
        notes: null,
        created_by: VALID_UUID_1,
        updated_by: VALID_UUID_1,
        created_at: "2026-07-23T10:00:00Z",
        updated_at: "2026-07-23T10:00:00Z",
      };

      const mockSupabase = {
        from: (table: string) => {
          if (table === "collections") {
            return {
              select: () => ({
                eq: () => Promise.resolve({ data: [mockCollectionRaw], error: null }),
              }),
            };
          }
          if (table === "collection_summary") {
            return {
              select: () => ({
                eq: () => ({
                  range: () =>
                    Promise.resolve({
                      data: [
                        { collection_id: VALID_UUID_2 },
                        { collection_id: VALID_UUID_3 }, // >1 replacement children! Violation!
                      ],
                      error: null,
                    }),
                }),
              }),
            };
          }
          return {};
        },
      } as unknown as SupabaseClient;

      const res = await getCollectionReplacementRelations(mockSupabase, VALID_UUID_1);
      assert.equal(res.ok, false);
      if (!res.ok) {
        assert.equal(res.code, "malformed_query_response");
      }
    });
  });
});
