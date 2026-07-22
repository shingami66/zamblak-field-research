export type CollectionPaymentMethod = "bank_transfer" | "cash" | "cheque";

export type CollectionStatus = "active" | "voided";

export type CollectionsErrorCode =
  | "unauthorized"
  | "forbidden"
  | "invalid_input"
  | "parent_not_found"
  | "collection_not_found"
  | "collection_not_active"
  | "collection_amount_invalid"
  | "allocation_total_exceeds_collection"
  | "allocation_target_invalid"
  | "allocation_exceeds_form_balance"
  | "allocation_revision_conflict"
  | "collection_void_reason_required"
  | "replacement_target_invalid"
  | "idempotency_key_invalid"
  | "idempotency_request_conflict"
  | "idempotency_processing_conflict"
  | "unexpected_collections_error";

export type CollectionsResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: CollectionsErrorCode };

export interface AllocationInput {
  researchFormId: string;
  amount: number;
}

export interface AllocationRpcItem {
  research_form_id: string;
  amount: number;
}

export interface CreateCollectionReceiptInput {
  idempotencyKey?: string;
  companyId: string;
  receiptDate: string;
  totalAmount: number;
  paymentMethod: CollectionPaymentMethod;
  referenceNumber?: string | null;
  allocations?: AllocationInput[];
  notes?: string | null;
}

export interface ReviseCollectionAllocationsInput {
  idempotencyKey?: string;
  collectionId: string;
  expectedPreviousVersion: number;
  revisionReason: string;
  allocations: AllocationInput[];
  notes?: string | null;
}

export interface VoidCollectionReceiptInput {
  idempotencyKey?: string;
  collectionId: string;
  voidReason: string;
  notes?: string | null;
}

export interface CreateReplacementCollectionReceiptInput {
  idempotencyKey?: string;
  replacesCollectionId: string;
  receiptDate: string;
  totalAmount: number;
  paymentMethod: CollectionPaymentMethod;
  referenceNumber?: string | null;
  allocations?: AllocationInput[];
  notes?: string | null;
}

export interface CreateCollectionReceiptRpcArgs {
  p_idempotency_key: string;
  p_company_id: string;
  p_receipt_date: string;
  p_total_amount: number;
  p_payment_method: string;
  p_reference_number: string | null;
  p_allocations: AllocationRpcItem[];
  p_notes: string | null;
}

export interface ReviseCollectionAllocationsRpcArgs {
  p_idempotency_key: string;
  p_collection_id: string;
  p_expected_previous_version: number;
  p_revision_reason: string;
  p_allocations: AllocationRpcItem[];
  p_notes: string | null;
}

export interface VoidCollectionReceiptRpcArgs {
  p_idempotency_key: string;
  p_collection_id: string;
  p_void_reason: string;
  p_notes: string | null;
}

export interface CreateReplacementCollectionReceiptRpcArgs {
  p_idempotency_key: string;
  p_replaces_collection_id: string;
  p_receipt_date: string;
  p_total_amount: number;
  p_payment_method: string;
  p_reference_number: string | null;
  p_allocations: AllocationRpcItem[];
  p_notes: string | null;
}

export interface CreateCollectionReceiptResponse {
  collection_id: string;
  code: string;
  version: 1;
  total_amount: number;
  allocated_amount: number;
  unallocated_amount: number;
}

export interface ReviseCollectionAllocationsResponse {
  collection_id: string;
  version: number;
  allocated_amount: number;
  unallocated_amount: number;
}

export interface VoidCollectionReceiptResponse {
  collection_id: string;
  status: "voided";
  void_reason: string;
}

export interface CreateReplacementCollectionReceiptResponse {
  collection_id: string;
  code: string;
  replaces_collection_id: string;
  version: 1;
  total_amount: number;
  allocated_amount: number;
  unallocated_amount: number;
}
