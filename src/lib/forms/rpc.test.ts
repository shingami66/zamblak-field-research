import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { formsErrorMessage } from "./copy";
import { mapFormsRpcError } from "./errors";
import {
  parseCorrectAcceptedResearchFormInput,
  parseReviewResearchFormInput,
  parseSubmitResearchFormInput,
} from "./input";
import {
  correctAcceptedResearchForm,
  reviewResearchForm,
  submitResearchForm,
} from "./rpc";

const VALID_UUID_1 = "11111111-1111-4111-8111-111111111111";
const VALID_UUID_2 = "22222222-2222-4222-8222-222222222222";

describe("Forms RPC Contracts", () => {
  describe("Input Parsing & Normalization", () => {
    it("validates submitResearchForm input", () => {
      const invalid = parseSubmitResearchFormInput({
        participationId: "invalid",
        submittedDate: "2026-07-23",
      });
      assert.equal(invalid.ok, false);
      if (!invalid.ok) assert.equal(invalid.code, "invalid_input");

      const valid = parseSubmitResearchFormInput({
        participationId: VALID_UUID_1,
        submittedDate: "2026-07-23",
        notes: " Test note ",
      });
      assert.equal(valid.ok, true);
      if (valid.ok) {
        assert.equal(valid.data.p_participation_id, VALID_UUID_1);
        assert.equal(valid.data.p_submitted_date, "2026-07-23");
        assert.equal(valid.data.p_notes, "Test note");
        assert.equal(typeof valid.data.p_idempotency_key, "string");
      }
    });

    it("validates reviewResearchForm decision normalization", () => {
      const rejectWithoutReason = parseReviewResearchFormInput({
        researchFormId: VALID_UUID_1,
        decision: "reject",
        rejectionReason: "  ",
      });
      assert.equal(rejectWithoutReason.ok, false);

      const validReject = parseReviewResearchFormInput({
        researchFormId: VALID_UUID_1,
        decision: "reject",
        rejectionReason: "Quality check failed",
      });
      assert.equal(validReject.ok, true);
      if (validReject.ok) {
        assert.equal(validReject.data.p_decision, "reject");
        assert.equal(validReject.data.p_rejection_reason, "Quality check failed");
        assert.equal(validReject.data.p_quota_override_reason, null);
      }

      const validAccept = parseReviewResearchFormInput({
        researchFormId: VALID_UUID_1,
        decision: "accept",
        quotaOverrideReason: "Owner approval",
      });
      assert.equal(validAccept.ok, true);
      if (validAccept.ok) {
        assert.equal(validAccept.data.p_decision, "accept");
        assert.equal(validAccept.data.p_quota_override_reason, "Owner approval");
        assert.equal(validAccept.data.p_rejection_reason, null);
      }
    });

    it("validates correctAcceptedResearchForm input", () => {
      const shortReason = parseCorrectAcceptedResearchFormInput({
        researchFormId: VALID_UUID_1,
        targetStatus: "rejected",
        correctionReason: "no",
      });
      assert.equal(shortReason.ok, false);
      if (!shortReason.ok) assert.equal(shortReason.code, "correction_reason_required");

      const validCorrection = parseCorrectAcceptedResearchFormInput({
        researchFormId: VALID_UUID_1,
        targetStatus: "cancelled",
        correctionReason: "Duplicate entry mistake",
      });
      assert.equal(validCorrection.ok, true);
      if (validCorrection.ok) {
        assert.equal(validCorrection.data.p_target_status, "cancelled");
        assert.equal(validCorrection.data.p_correction_reason, "Duplicate entry mistake");
      }
    });
  });

  describe("Error Token Mapping & Copy", () => {
    it("maps exact Slice 3 error tokens correctly", () => {
      assert.equal(
        mapFormsRpcError({ message: "P0001: duplicate_accepted_form" }),
        "duplicate_accepted_form"
      );
      assert.equal(
        mapFormsRpcError({ message: "quota_override_reason_required" }),
        "quota_override_reason_required"
      );
      assert.equal(
        mapFormsRpcError({ message: "accepted_form_has_active_allocations" }),
        "accepted_form_has_active_allocations"
      );
      assert.equal(mapFormsRpcError(null), "unexpected_forms_error");
    });

    it("provides Arabic copy for all error codes without raw DETAIL", () => {
      const msg = formsErrorMessage("duplicate_accepted_form");
      assert.equal(typeof msg, "string");
      assert.equal(msg.includes("يوجد بالفعل"), true);
      assert.equal(msg.includes("P0001"), false);
      assert.equal(msg.includes("research_forms"), false);
    });
  });

  describe("RPC Mock Execution", () => {
    it("invokes submit_research_form with exact p_* arguments", async () => {
      let calledRpc = "";
      let calledArgs: Record<string, unknown> = {};

      const mockSupabase = {
        rpc: async (rpcName: string, args: Record<string, unknown>) => {
          calledRpc = rpcName;
          calledArgs = args;
          return {
            data: {
              research_form_id: VALID_UUID_2,
              code: "RF-20260723-001",
              attempt_number: 1,
              review_status: "submitted",
              submitted_date: "2026-07-23",
            },
            error: null,
          };
        },
      } as unknown as SupabaseClient;

      const result = await submitResearchForm(mockSupabase, {
        participationId: VALID_UUID_1,
        submittedDate: "2026-07-23",
        notes: "First attempt",
      });

      assert.equal(result.ok, true);
      assert.equal(calledRpc, "submit_research_form");
      assert.equal(calledArgs.p_participation_id, VALID_UUID_1);
      assert.equal(calledArgs.p_submitted_date, "2026-07-23");
      assert.equal(calledArgs.p_notes, "First attempt");
      assert.equal(typeof calledArgs.p_idempotency_key, "string");
    });

    it("invokes review_research_form with exact p_* arguments", async () => {
      let calledRpc = "";
      let calledArgs: Record<string, unknown> = {};

      const mockSupabase = {
        rpc: async (rpcName: string, args: Record<string, unknown>) => {
          calledRpc = rpcName;
          calledArgs = args;
          return {
            data: {
              research_form_id: VALID_UUID_1,
              review_status: "accepted",
              accepted_price_snapshot: 150.0,
            },
            error: null,
          };
        },
      } as unknown as SupabaseClient;

      const result = await reviewResearchForm(mockSupabase, {
        researchFormId: VALID_UUID_1,
        decision: "accept",
      });

      assert.equal(result.ok, true);
      assert.equal(calledRpc, "review_research_form");
      assert.equal(calledArgs.p_research_form_id, VALID_UUID_1);
      assert.equal(calledArgs.p_decision, "accept");
      assert.equal(calledArgs.p_quota_override_reason, null);
    });

    it("invokes correct_accepted_research_form with exact p_* arguments", async () => {
      let calledRpc = "";
      let calledArgs: Record<string, unknown> = {};

      const mockSupabase = {
        rpc: async (rpcName: string, args: Record<string, unknown>) => {
          calledRpc = rpcName;
          calledArgs = args;
          return {
            data: {
              research_form_id: VALID_UUID_1,
              review_status: "rejected",
              accepted_price_snapshot: 150.0,
            },
            error: null,
          };
        },
      } as unknown as SupabaseClient;

      const result = await correctAcceptedResearchForm(mockSupabase, {
        researchFormId: VALID_UUID_1,
        targetStatus: "rejected",
        correctionReason: "Data entry error",
      });

      assert.equal(result.ok, true);
      assert.equal(calledRpc, "correct_accepted_research_form");
      assert.equal(calledArgs.p_research_form_id, VALID_UUID_1);
      assert.equal(calledArgs.p_target_status, "rejected");
      assert.equal(calledArgs.p_correction_reason, "Data entry error");
    });
  });
});
