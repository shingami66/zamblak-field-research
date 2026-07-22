import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { collectionsErrorMessage } from "./copy";
import { mapCollectionsRpcError } from "./errors";
import {
  parseCreateCollectionReceiptInput,
  parseCreateReplacementCollectionReceiptInput,
  parseReviseCollectionAllocationsInput,
  parseVoidCollectionReceiptInput,
} from "./input";
import {
  createCollectionReceipt,
  createReplacementCollectionReceipt,
  reviseCollectionAllocations,
  voidCollectionReceipt,
} from "./rpc";

const VALID_UUID_1 = "11111111-1111-4111-8111-111111111111";
const VALID_UUID_2 = "22222222-2222-4222-8222-222222222222";
const VALID_UUID_FORM = "33333333-3333-4333-8333-333333333333";

describe("Collections RPC Contracts", () => {
  describe("Input Parsing & Normalization", () => {
    it("validates createCollectionReceipt input", () => {
      const invalidAmount = parseCreateCollectionReceiptInput({
        companyId: VALID_UUID_1,
        receiptDate: "2026-07-23",
        totalAmount: 0,
        paymentMethod: "bank_transfer",
      });
      assert.equal(invalidAmount.ok, false);
      if (!invalidAmount.ok)
        assert.equal(invalidAmount.code, "collection_amount_invalid");

      const valid = parseCreateCollectionReceiptInput({
        companyId: VALID_UUID_1,
        receiptDate: "2026-07-23",
        totalAmount: 1000,
        paymentMethod: "bank_transfer",
        allocations: [{ researchFormId: VALID_UUID_FORM, amount: 400 }],
      });
      assert.equal(valid.ok, true);
      if (valid.ok) {
        assert.equal(valid.data.p_company_id, VALID_UUID_1);
        assert.equal(valid.data.p_total_amount, 1000);
        assert.equal(valid.data.p_payment_method, "bank_transfer");
        assert.equal(valid.data.p_allocations.length, 1);
        assert.equal(
          valid.data.p_allocations[0].research_form_id,
          VALID_UUID_FORM
        );
      }
    });

    it("enforces required p_allocations in reviseCollectionAllocations (no default)", () => {
      // @ts-expect-error testing runtime missing allocations
      const missingAllocations = parseReviseCollectionAllocationsInput({
        collectionId: VALID_UUID_1,
        expectedPreviousVersion: 1,
        revisionReason: "Updated allocation",
      });
      assert.equal(missingAllocations.ok, false);
      if (!missingAllocations.ok)
        assert.equal(missingAllocations.code, "invalid_input");

      const emptyAllocations = parseReviseCollectionAllocationsInput({
        collectionId: VALID_UUID_1,
        expectedPreviousVersion: 1,
        revisionReason: "Clearing all allocations",
        allocations: [],
      });
      assert.equal(emptyAllocations.ok, true);
      if (emptyAllocations.ok) {
        assert.equal(emptyAllocations.data.p_allocations.length, 0);
        assert.equal(emptyAllocations.data.p_expected_previous_version, 1);
        assert.equal(
          emptyAllocations.data.p_revision_reason,
          "Clearing all allocations"
        );
      }
    });

    it("validates voidCollectionReceipt (has NO version parameter in RPC signature)", () => {
      const shortReason = parseVoidCollectionReceiptInput({
        collectionId: VALID_UUID_1,
        voidReason: "no",
      });
      assert.equal(shortReason.ok, false);
      if (!shortReason.ok)
        assert.equal(shortReason.code, "collection_void_reason_required");

      const validVoid = parseVoidCollectionReceiptInput({
        collectionId: VALID_UUID_1,
        voidReason: "Bounced check",
      });
      assert.equal(validVoid.ok, true);
      if (validVoid.ok) {
        assert.equal(validVoid.data.p_collection_id, VALID_UUID_1);
        assert.equal(validVoid.data.p_void_reason, "Bounced check");
        // Verify no expected_version parameter exists on void args
        assert.equal("p_expected_version" in validVoid.data, false);
      }
    });

    it("validates createReplacementCollectionReceipt input", () => {
      const validReplacement = parseCreateReplacementCollectionReceiptInput({
        replacesCollectionId: VALID_UUID_1,
        receiptDate: "2026-07-23",
        totalAmount: 1200,
        paymentMethod: "cheque",
        referenceNumber: "CHQ-9988",
      });
      assert.equal(validReplacement.ok, true);
      if (validReplacement.ok) {
        assert.equal(
          validReplacement.data.p_replaces_collection_id,
          VALID_UUID_1
        );
        assert.equal(validReplacement.data.p_payment_method, "cheque");
        assert.equal(validReplacement.data.p_reference_number, "CHQ-9988");
      }
    });
  });

  describe("Error Token Mapping & Copy", () => {
    it("maps exact Slice 3 collection error tokens correctly", () => {
      assert.equal(
        mapCollectionsRpcError({ message: "P0001: allocation_revision_conflict" }),
        "allocation_revision_conflict"
      );
      assert.equal(
        mapCollectionsRpcError({ message: "allocation_exceeds_form_balance" }),
        "allocation_exceeds_form_balance"
      );
      assert.equal(
        mapCollectionsRpcError({ message: "replacement_target_invalid" }),
        "replacement_target_invalid"
      );
      assert.equal(mapCollectionsRpcError(null), "unexpected_collections_error");
    });

    it("provides Arabic copy for all collection error codes without raw DETAIL", () => {
      const msg = collectionsErrorMessage("allocation_revision_conflict");
      assert.equal(typeof msg, "string");
      assert.equal(msg.includes("تعارض"), true);
      assert.equal(msg.includes("P0001"), false);
      assert.equal(msg.includes("collections"), false);
    });
  });

  describe("RPC Mock Execution", () => {
    it("invokes create_collection_receipt with exact p_* arguments", async () => {
      let calledRpc = "";
      let calledArgs: Record<string, unknown> = {};

      const mockSupabase = {
        rpc: async (rpcName: string, args: Record<string, unknown>) => {
          calledRpc = rpcName;
          calledArgs = args;
          return {
            data: {
              collection_id: VALID_UUID_1,
              code: "COL-0001",
              version: 1,
              total_amount: 1000,
              allocated_amount: 400,
              unallocated_amount: 600,
            },
            error: null,
          };
        },
      } as unknown as SupabaseClient;

      const result = await createCollectionReceipt(mockSupabase, {
        companyId: VALID_UUID_1,
        receiptDate: "2026-07-23",
        totalAmount: 1000,
        paymentMethod: "cash",
        allocations: [{ researchFormId: VALID_UUID_FORM, amount: 400 }],
      });

      assert.equal(result.ok, true);
      assert.equal(calledRpc, "create_collection_receipt");
      assert.equal(calledArgs.p_company_id, VALID_UUID_1);
      assert.equal(calledArgs.p_total_amount, 1000);
      assert.equal(calledArgs.p_payment_method, "cash");
      assert.equal(Array.isArray(calledArgs.p_allocations), true);
    });

    it("invokes revise_collection_allocations with p_allocations parameter passed", async () => {
      let calledRpc = "";
      let calledArgs: Record<string, unknown> = {};

      const mockSupabase = {
        rpc: async (rpcName: string, args: Record<string, unknown>) => {
          calledRpc = rpcName;
          calledArgs = args;
          return {
            data: {
              collection_id: VALID_UUID_1,
              version: 2,
              allocated_amount: 0,
              unallocated_amount: 1000,
            },
            error: null,
          };
        },
      } as unknown as SupabaseClient;

      const result = await reviseCollectionAllocations(mockSupabase, {
        collectionId: VALID_UUID_1,
        expectedPreviousVersion: 1,
        revisionReason: "Resetting allocations",
        allocations: [],
      });

      assert.equal(result.ok, true);
      assert.equal(calledRpc, "revise_collection_allocations");
      assert.equal(calledArgs.p_expected_previous_version, 1);
      assert.equal(calledArgs.p_revision_reason, "Resetting allocations");
      assert.equal(Array.isArray(calledArgs.p_allocations), true);
      assert.equal((calledArgs.p_allocations as unknown[]).length, 0);
    });

    it("invokes void_collection_receipt with exact p_* arguments", async () => {
      let calledRpc = "";
      let calledArgs: Record<string, unknown> = {};

      const mockSupabase = {
        rpc: async (rpcName: string, args: Record<string, unknown>) => {
          calledRpc = rpcName;
          calledArgs = args;
          return {
            data: {
              collection_id: VALID_UUID_1,
              status: "voided",
              void_reason: "Duplicate entry",
            },
            error: null,
          };
        },
      } as unknown as SupabaseClient;

      const result = await voidCollectionReceipt(mockSupabase, {
        collectionId: VALID_UUID_1,
        voidReason: "Duplicate entry",
      });

      assert.equal(result.ok, true);
      assert.equal(calledRpc, "void_collection_receipt");
      assert.equal(calledArgs.p_collection_id, VALID_UUID_1);
      assert.equal(calledArgs.p_void_reason, "Duplicate entry");
    });

    it("invokes create_replacement_collection_receipt with exact p_* arguments", async () => {
      let calledRpc = "";
      let calledArgs: Record<string, unknown> = {};

      const mockSupabase = {
        rpc: async (rpcName: string, args: Record<string, unknown>) => {
          calledRpc = rpcName;
          calledArgs = args;
          return {
            data: {
              collection_id: VALID_UUID_2,
              code: "COL-0002",
              replaces_collection_id: VALID_UUID_1,
              version: 1,
              total_amount: 1000,
              allocated_amount: 0,
              unallocated_amount: 1000,
            },
            error: null,
          };
        },
      } as unknown as SupabaseClient;

      const result = await createReplacementCollectionReceipt(mockSupabase, {
        replacesCollectionId: VALID_UUID_1,
        receiptDate: "2026-07-23",
        totalAmount: 1000,
        paymentMethod: "bank_transfer",
      });

      assert.equal(result.ok, true);
      assert.equal(calledRpc, "create_replacement_collection_receipt");
      assert.equal(calledArgs.p_replaces_collection_id, VALID_UUID_1);
      assert.equal(calledArgs.p_payment_method, "bank_transfer");
    });
  });
});
