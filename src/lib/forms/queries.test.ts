import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  escapeIlikePattern,
  getFormFinancialSummary,
  getResearchForm,
  listFormFinancialSummaries,
  listResearchForms,
  listSubmittedResearchForms,
  parseFormFinancialSummaryRow,
  parsePaginationInput,
  parseResearchFormRow,
} from "./queries";

const VALID_UUID_1 = "11111111-1111-4111-8111-111111111111";
const VALID_UUID_2 = "22222222-2222-4222-8222-222222222222";

describe("Forms Query Contracts (Slice A2 Core)", () => {
  describe("Pagination & Search Helpers", () => {
    it("escapes ilike pattern special characters", () => {
      assert.equal(escapeIlikePattern("100%_test\\code"), "100\\%\\_test\\\\code");
    });

    it("calculates pagination bounds correctly", () => {
      const valid = parsePaginationInput(2, 10);
      assert.equal(valid.ok, true);
      if (valid.ok) {
        assert.equal(valid.from, 10);
        assert.equal(valid.to, 19);
      }

      assert.equal(parsePaginationInput(0, 10).ok, false);
      assert.equal(parsePaginationInput(1, 0).ok, false);
      assert.equal(parsePaginationInput(1, 101).ok, false);
      assert.equal(parsePaginationInput(1.5, 10).ok, false);
    });
  });

  describe("Runtime Row Parsers", () => {
    it("parses valid ResearchFormRow and rejects invalid rows", () => {
      const rawValid = {
        id: VALID_UUID_1,
        account_id: VALID_UUID_1,
        project_id: VALID_UUID_1,
        company_id: VALID_UUID_1,
        respondent_id: VALID_UUID_1,
        participation_id: VALID_UUID_1,
        code: "RF-001",
        attempt_number: 1,
        submitted_date: "2026-07-23",
        review_status: "submitted",
        submitted_at: "2026-07-23T10:00:00Z",
        reviewed_at: null,
        accepted_at: null,
        rejected_at: null,
        cancelled_at: null,
        rejection_reason: null,
        review_correction_reason: null,
        accepted_price_snapshot: null,
        quota_limit_snapshot: null,
        accepted_count_before: null,
        quota_override_reason: null,
        quota_overridden_at: null,
        quota_overridden_by: null,
        notes: null,
        created_by: VALID_UUID_1,
        updated_by: VALID_UUID_1,
        created_at: "2026-07-23T10:00:00Z",
        updated_at: "2026-07-23T10:00:00Z",
      };

      const parsed = parseResearchFormRow(rawValid);
      assert.notEqual(parsed, null);
      assert.equal(parsed?.id, VALID_UUID_1);

      // Missing required field
      assert.equal(parseResearchFormRow({ ...rawValid, code: null }), null);
      // Bad enum
      assert.equal(
        parseResearchFormRow({ ...rawValid, review_status: "unknown" }),
        null
      );
    });

    it("parses valid FormFinancialSummaryRow and rejects invalid rows", () => {
      const rawValid = {
        research_form_id: VALID_UUID_1,
        account_id: VALID_UUID_1,
        project_id: VALID_UUID_1,
        company_id: VALID_UUID_1,
        respondent_id: VALID_UUID_1,
        participation_id: VALID_UUID_1,
        form_code: "RF-001",
        submitted_date: "2026-07-23",
        accepted_at: "2026-07-23T10:00:00Z",
        accepted_price_snapshot: 150.0,
        allocated_amount: 50.0,
        outstanding_amount: 100.0,
        settlement_state: "partially_collected",
        due_date: "2026-08-23",
      };

      const parsed = parseFormFinancialSummaryRow(rawValid);
      assert.notEqual(parsed, null);
      assert.equal(parsed?.settlement_state, "partially_collected");

      // Bad settlement_state
      assert.equal(
        parseFormFinancialSummaryRow({ ...rawValid, settlement_state: "paid" }),
        null
      );
    });
  });

  describe("Query Wrappers & Mock Supabase Chaining", () => {
    it("listResearchForms enforces date range and pagination validation", async () => {
      const mockSupabase = {} as SupabaseClient;

      const badDateRange = await listResearchForms(mockSupabase, {
        submittedDateFrom: "2026-08-01",
        submittedDateTo: "2026-07-01",
      });
      assert.equal(badDateRange.ok, false);
      if (!badDateRange.ok) {
        assert.equal(badDateRange.code, "invalid_query_input");
      }
    });

    it("getResearchForm returns research_form_not_found for 0 rows", async () => {
      const mockSupabase = {
        from: () => ({
          select: () => ({
            eq: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      } as unknown as SupabaseClient;

      const res = await getResearchForm(mockSupabase, VALID_UUID_1);
      assert.equal(res.ok, false);
      if (!res.ok) {
        assert.equal(res.code, "research_form_not_found");
      }
    });

    it("getFormFinancialSummary returns financial_summary_not_found for 0 rows", async () => {
      const mockSupabase = {
        from: () => ({
          select: () => ({
            eq: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      } as unknown as SupabaseClient;

      const res = await getFormFinancialSummary(mockSupabase, VALID_UUID_2);
      assert.equal(res.ok, false);
      if (!res.ok) {
        assert.equal(res.code, "financial_summary_not_found");
      }
    });
  });
});
