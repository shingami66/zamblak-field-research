import { isValidIsoDate, isValidUuid } from "@/lib/forms/input";
import { normalizeIdempotencyKey } from "@/lib/idempotency/key";
import type {
  AllocationInput,
  AllocationRpcItem,
  CollectionPaymentMethod,
  CollectionsResult,
  CreateCollectionReceiptInput,
  CreateCollectionReceiptRpcArgs,
  CreateReplacementCollectionReceiptInput,
  CreateReplacementCollectionReceiptRpcArgs,
  ReviseCollectionAllocationsInput,
  ReviseCollectionAllocationsRpcArgs,
  VoidCollectionReceiptInput,
  VoidCollectionReceiptRpcArgs,
} from "./types";

const PAYMENT_METHODS: CollectionPaymentMethod[] = [
  "bank_transfer",
  "cash",
  "cheque",
];

export function parseAllocationsInput(
  raw: unknown
): CollectionsResult<AllocationRpcItem[]> {
  if (raw === undefined || raw === null) {
    return { ok: true, data: [] };
  }
  if (!Array.isArray(raw)) {
    return { ok: false, code: "invalid_input" };
  }

  const items: AllocationRpcItem[] = [];
  const seenForms = new Set<string>();

  for (const item of raw) {
    if (!item || typeof item !== "object") {
      return { ok: false, code: "allocation_target_invalid" };
    }
    const alloc = item as AllocationInput;
    if (!isValidUuid(alloc.researchFormId)) {
      return { ok: false, code: "allocation_target_invalid" };
    }
    if (typeof alloc.amount !== "number" || isNaN(alloc.amount) || alloc.amount <= 0) {
      return { ok: false, code: "allocation_target_invalid" };
    }

    const formId = alloc.researchFormId.trim();
    if (seenForms.has(formId)) {
      return { ok: false, code: "allocation_target_invalid" };
    }
    seenForms.add(formId);

    items.push({
      research_form_id: formId,
      amount: Number(alloc.amount.toFixed(2)),
    });
  }

  return { ok: true, data: items };
}

export function parseCreateCollectionReceiptInput(
  input: CreateCollectionReceiptInput
): CollectionsResult<CreateCollectionReceiptRpcArgs> {
  if (!input || typeof input !== "object") {
    return { ok: false, code: "invalid_input" };
  }
  if (!isValidUuid(input.companyId)) {
    return { ok: false, code: "invalid_input" };
  }
  if (!isValidIsoDate(input.receiptDate)) {
    return { ok: false, code: "invalid_input" };
  }
  if (
    typeof input.totalAmount !== "number" ||
    isNaN(input.totalAmount) ||
    input.totalAmount <= 0
  ) {
    return { ok: false, code: "collection_amount_invalid" };
  }
  if (!PAYMENT_METHODS.includes(input.paymentMethod)) {
    return { ok: false, code: "invalid_input" };
  }

  const allocParsed = parseAllocationsInput(input.allocations);
  if (!allocParsed.ok) return allocParsed;

  const totalAllocated = allocParsed.data.reduce(
    (sum, item) => sum + item.amount,
    0
  );
  if (totalAllocated > input.totalAmount) {
    return { ok: false, code: "allocation_total_exceeds_collection" };
  }

  const key = normalizeIdempotencyKey(input.idempotencyKey);
  const refNum =
    typeof input.referenceNumber === "string" &&
    input.referenceNumber.trim().length > 0
      ? input.referenceNumber.trim()
      : null;
  const notes =
    typeof input.notes === "string" && input.notes.trim().length > 0
      ? input.notes.trim()
      : null;

  return {
    ok: true,
    data: {
      p_idempotency_key: key,
      p_company_id: input.companyId.trim(),
      p_receipt_date: input.receiptDate.trim(),
      p_total_amount: Number(input.totalAmount.toFixed(2)),
      p_payment_method: input.paymentMethod,
      p_reference_number: refNum,
      p_allocations: allocParsed.data,
      p_notes: notes,
    },
  };
}

export function parseReviseCollectionAllocationsInput(
  input: ReviseCollectionAllocationsInput
): CollectionsResult<ReviseCollectionAllocationsRpcArgs> {
  if (!input || typeof input !== "object") {
    return { ok: false, code: "invalid_input" };
  }
  if (!isValidUuid(input.collectionId)) {
    return { ok: false, code: "invalid_input" };
  }
  if (
    typeof input.expectedPreviousVersion !== "number" ||
    !Number.isInteger(input.expectedPreviousVersion) ||
    input.expectedPreviousVersion < 1
  ) {
    return { ok: false, code: "invalid_input" };
  }

  const reason =
    typeof input.revisionReason === "string"
      ? input.revisionReason.trim()
      : "";
  if (reason.length < 3) {
    return { ok: false, code: "invalid_input" };
  }

  // Critical requirement: p_allocations is required for revision (no default in SQL)
  if (!Array.isArray(input.allocations)) {
    return { ok: false, code: "invalid_input" };
  }

  const allocParsed = parseAllocationsInput(input.allocations);
  if (!allocParsed.ok) return allocParsed;

  const key = normalizeIdempotencyKey(input.idempotencyKey);
  const notes =
    typeof input.notes === "string" && input.notes.trim().length > 0
      ? input.notes.trim()
      : null;

  return {
    ok: true,
    data: {
      p_idempotency_key: key,
      p_collection_id: input.collectionId.trim(),
      p_expected_previous_version: input.expectedPreviousVersion,
      p_revision_reason: reason,
      p_allocations: allocParsed.data,
      p_notes: notes,
    },
  };
}

export function parseVoidCollectionReceiptInput(
  input: VoidCollectionReceiptInput
): CollectionsResult<VoidCollectionReceiptRpcArgs> {
  if (!input || typeof input !== "object") {
    return { ok: false, code: "invalid_input" };
  }
  if (!isValidUuid(input.collectionId)) {
    return { ok: false, code: "invalid_input" };
  }

  const reason =
    typeof input.voidReason === "string" ? input.voidReason.trim() : "";
  if (reason.length < 3) {
    return { ok: false, code: "collection_void_reason_required" };
  }

  const key = normalizeIdempotencyKey(input.idempotencyKey);
  const notes =
    typeof input.notes === "string" && input.notes.trim().length > 0
      ? input.notes.trim()
      : null;

  return {
    ok: true,
    data: {
      p_idempotency_key: key,
      p_collection_id: input.collectionId.trim(),
      p_void_reason: reason,
      p_notes: notes,
    },
  };
}

export function parseCreateReplacementCollectionReceiptInput(
  input: CreateReplacementCollectionReceiptInput
): CollectionsResult<CreateReplacementCollectionReceiptRpcArgs> {
  if (!input || typeof input !== "object") {
    return { ok: false, code: "invalid_input" };
  }
  if (!isValidUuid(input.replacesCollectionId)) {
    return { ok: false, code: "replacement_target_invalid" };
  }
  if (!isValidIsoDate(input.receiptDate)) {
    return { ok: false, code: "invalid_input" };
  }
  if (
    typeof input.totalAmount !== "number" ||
    isNaN(input.totalAmount) ||
    input.totalAmount <= 0
  ) {
    return { ok: false, code: "collection_amount_invalid" };
  }
  if (!PAYMENT_METHODS.includes(input.paymentMethod)) {
    return { ok: false, code: "invalid_input" };
  }

  const allocParsed = parseAllocationsInput(input.allocations);
  if (!allocParsed.ok) return allocParsed;

  const totalAllocated = allocParsed.data.reduce(
    (sum, item) => sum + item.amount,
    0
  );
  if (totalAllocated > input.totalAmount) {
    return { ok: false, code: "allocation_total_exceeds_collection" };
  }

  const key = normalizeIdempotencyKey(input.idempotencyKey);
  const refNum =
    typeof input.referenceNumber === "string" &&
    input.referenceNumber.trim().length > 0
      ? input.referenceNumber.trim()
      : null;
  const notes =
    typeof input.notes === "string" && input.notes.trim().length > 0
      ? input.notes.trim()
      : null;

  return {
    ok: true,
    data: {
      p_idempotency_key: key,
      p_replaces_collection_id: input.replacesCollectionId.trim(),
      p_receipt_date: input.receiptDate.trim(),
      p_total_amount: Number(input.totalAmount.toFixed(2)),
      p_payment_method: input.paymentMethod,
      p_reference_number: refNum,
      p_allocations: allocParsed.data,
      p_notes: notes,
    },
  };
}
