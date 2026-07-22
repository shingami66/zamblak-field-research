import type { SupabaseClient } from "@supabase/supabase-js";
import { mapCollectionsRpcError } from "./errors";
import {
  parseCreateCollectionReceiptInput,
  parseCreateReplacementCollectionReceiptInput,
  parseReviseCollectionAllocationsInput,
  parseVoidCollectionReceiptInput,
} from "./input";
import type {
  CollectionsResult,
  CreateCollectionReceiptInput,
  CreateCollectionReceiptResponse,
  CreateReplacementCollectionReceiptInput,
  CreateReplacementCollectionReceiptResponse,
  ReviseCollectionAllocationsInput,
  ReviseCollectionAllocationsResponse,
  VoidCollectionReceiptInput,
  VoidCollectionReceiptResponse,
} from "./types";

export async function createCollectionReceipt(
  supabase: SupabaseClient,
  input: CreateCollectionReceiptInput
): Promise<CollectionsResult<CreateCollectionReceiptResponse>> {
  const parsed = parseCreateCollectionReceiptInput(input);
  if (!parsed.ok) return parsed;

  const { data, error } = await supabase.rpc("create_collection_receipt", {
    p_idempotency_key: parsed.data.p_idempotency_key,
    p_company_id: parsed.data.p_company_id,
    p_receipt_date: parsed.data.p_receipt_date,
    p_total_amount: parsed.data.p_total_amount,
    p_payment_method: parsed.data.p_payment_method,
    p_reference_number: parsed.data.p_reference_number,
    p_allocations: parsed.data.p_allocations,
    p_notes: parsed.data.p_notes,
  });

  if (error) return { ok: false, code: mapCollectionsRpcError(error) };
  if (!data || typeof data !== "object") {
    return { ok: false, code: "unexpected_collections_error" };
  }

  const res = data as Partial<CreateCollectionReceiptResponse>;
  if (
    typeof res.collection_id !== "string" ||
    typeof res.code !== "string" ||
    res.version !== 1 ||
    typeof res.total_amount !== "number" ||
    typeof res.allocated_amount !== "number" ||
    typeof res.unallocated_amount !== "number"
  ) {
    return { ok: false, code: "unexpected_collections_error" };
  }

  return {
    ok: true,
    data: {
      collection_id: res.collection_id,
      code: res.code,
      version: 1,
      total_amount: res.total_amount,
      allocated_amount: res.allocated_amount,
      unallocated_amount: res.unallocated_amount,
    },
  };
}

export async function reviseCollectionAllocations(
  supabase: SupabaseClient,
  input: ReviseCollectionAllocationsInput
): Promise<CollectionsResult<ReviseCollectionAllocationsResponse>> {
  const parsed = parseReviseCollectionAllocationsInput(input);
  if (!parsed.ok) return parsed;

  const { data, error } = await supabase.rpc("revise_collection_allocations", {
    p_idempotency_key: parsed.data.p_idempotency_key,
    p_collection_id: parsed.data.p_collection_id,
    p_expected_previous_version: parsed.data.p_expected_previous_version,
    p_revision_reason: parsed.data.p_revision_reason,
    p_allocations: parsed.data.p_allocations,
    p_notes: parsed.data.p_notes,
  });

  if (error) return { ok: false, code: mapCollectionsRpcError(error) };
  if (!data || typeof data !== "object") {
    return { ok: false, code: "unexpected_collections_error" };
  }

  const res = data as Partial<ReviseCollectionAllocationsResponse>;
  if (
    typeof res.collection_id !== "string" ||
    typeof res.version !== "number" ||
    typeof res.allocated_amount !== "number" ||
    typeof res.unallocated_amount !== "number"
  ) {
    return { ok: false, code: "unexpected_collections_error" };
  }

  return {
    ok: true,
    data: {
      collection_id: res.collection_id,
      version: res.version,
      allocated_amount: res.allocated_amount,
      unallocated_amount: res.unallocated_amount,
    },
  };
}

export async function voidCollectionReceipt(
  supabase: SupabaseClient,
  input: VoidCollectionReceiptInput
): Promise<CollectionsResult<VoidCollectionReceiptResponse>> {
  const parsed = parseVoidCollectionReceiptInput(input);
  if (!parsed.ok) return parsed;

  const { data, error } = await supabase.rpc("void_collection_receipt", {
    p_idempotency_key: parsed.data.p_idempotency_key,
    p_collection_id: parsed.data.p_collection_id,
    p_void_reason: parsed.data.p_void_reason,
    p_notes: parsed.data.p_notes,
  });

  if (error) return { ok: false, code: mapCollectionsRpcError(error) };
  if (!data || typeof data !== "object") {
    return { ok: false, code: "unexpected_collections_error" };
  }

  const res = data as Partial<VoidCollectionReceiptResponse>;
  if (
    typeof res.collection_id !== "string" ||
    res.status !== "voided" ||
    typeof res.void_reason !== "string"
  ) {
    return { ok: false, code: "unexpected_collections_error" };
  }

  return {
    ok: true,
    data: {
      collection_id: res.collection_id,
      status: "voided",
      void_reason: res.void_reason,
    },
  };
}

export async function createReplacementCollectionReceipt(
  supabase: SupabaseClient,
  input: CreateReplacementCollectionReceiptInput
): Promise<CollectionsResult<CreateReplacementCollectionReceiptResponse>> {
  const parsed = parseCreateReplacementCollectionReceiptInput(input);
  if (!parsed.ok) return parsed;

  const { data, error } = await supabase.rpc(
    "create_replacement_collection_receipt",
    {
      p_idempotency_key: parsed.data.p_idempotency_key,
      p_replaces_collection_id: parsed.data.p_replaces_collection_id,
      p_receipt_date: parsed.data.p_receipt_date,
      p_total_amount: parsed.data.p_total_amount,
      p_payment_method: parsed.data.p_payment_method,
      p_reference_number: parsed.data.p_reference_number,
      p_allocations: parsed.data.p_allocations,
      p_notes: parsed.data.p_notes,
    }
  );

  if (error) return { ok: false, code: mapCollectionsRpcError(error) };
  if (!data || typeof data !== "object") {
    return { ok: false, code: "unexpected_collections_error" };
  }

  const res = data as Partial<CreateReplacementCollectionReceiptResponse>;
  if (
    typeof res.collection_id !== "string" ||
    typeof res.code !== "string" ||
    typeof res.replaces_collection_id !== "string" ||
    res.version !== 1 ||
    typeof res.total_amount !== "number" ||
    typeof res.allocated_amount !== "number" ||
    typeof res.unallocated_amount !== "number"
  ) {
    return { ok: false, code: "unexpected_collections_error" };
  }

  return {
    ok: true,
    data: {
      collection_id: res.collection_id,
      code: res.code,
      replaces_collection_id: res.replaces_collection_id,
      version: 1,
      total_amount: res.total_amount,
      allocated_amount: res.allocated_amount,
      unallocated_amount: res.unallocated_amount,
    },
  };
}
