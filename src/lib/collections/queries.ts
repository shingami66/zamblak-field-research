import type { SupabaseClient } from "@supabase/supabase-js";
import { escapeIlikePattern, buildPaginationMeta, parsePaginationInput } from "@/lib/forms/queries";
import { isValidIsoDate, isValidUuid } from "@/lib/forms/input";
import type {
  CollectionAllocationRevisionRow,
  CollectionAllocationRevisionWithLines,
  CollectionAllocationRow,
  CollectionCurrentAllocations,
  CollectionReplacementRelations,
  CollectionRow,
  CollectionsListFilters,
  CollectionsListPage,
  CollectionsQueryResult,
  CollectionSummaryRow,
} from "./types";

export const COLLECTION_SELECT_FIELDS =
  "id, account_id, company_id, code, receipt_date, total_amount, payment_method, reference_number, status, version, void_reason, voided_at, voided_by, replaces_collection_id, notes, created_by, updated_by, created_at, updated_at";

export const COLLECTION_SUMMARY_SELECT_FIELDS =
  "collection_id, account_id, company_id, collection_code, receipt_date, total_amount, payment_method, reference_number, status, version, void_reason, voided_at, replaces_collection_id, allocated_amount, unallocated_amount, allocation_state";

export const COLLECTION_REVISION_SELECT_FIELDS =
  "id, account_id, collection_id, revision_number, expected_previous_version, reason, created_by, created_at";

export const COLLECTION_ALLOCATION_SELECT_FIELDS =
  "id, account_id, revision_id, research_form_id, amount, created_by, created_at";

export function parseCollectionRow(raw: unknown): CollectionRow | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  if (
    !isValidUuid(r.id) ||
    !isValidUuid(r.account_id) ||
    !isValidUuid(r.company_id) ||
    typeof r.code !== "string" ||
    !isValidIsoDate(r.receipt_date) ||
    typeof r.total_amount !== "number" ||
    isNaN(r.total_amount) ||
    r.total_amount <= 0 ||
    !["bank_transfer", "cash", "cheque"].includes(String(r.payment_method)) ||
    !["active", "voided"].includes(String(r.status)) ||
    typeof r.version !== "number" ||
    !Number.isInteger(r.version) ||
    r.version < 1 ||
    !isValidUuid(r.created_by) ||
    !isValidUuid(r.updated_by) ||
    typeof r.created_at !== "string" ||
    typeof r.updated_at !== "string"
  ) {
    return null;
  }

  const reference_number = r.reference_number === null || typeof r.reference_number === "string" ? (r.reference_number as string | null) : undefined;
  const void_reason = r.void_reason === null || typeof r.void_reason === "string" ? (r.void_reason as string | null) : undefined;
  const voided_at = r.voided_at === null || typeof r.voided_at === "string" ? (r.voided_at as string | null) : undefined;
  const voided_by = r.voided_by === null || isValidUuid(r.voided_by) ? (r.voided_by as string | null) : undefined;
  const replaces_collection_id = r.replaces_collection_id === null || isValidUuid(r.replaces_collection_id) ? (r.replaces_collection_id as string | null) : undefined;
  const notes = r.notes === null || typeof r.notes === "string" ? (r.notes as string | null) : undefined;

  if (
    reference_number === undefined ||
    void_reason === undefined ||
    voided_at === undefined ||
    voided_by === undefined ||
    replaces_collection_id === undefined ||
    notes === undefined
  ) {
    return null;
  }

  return {
    id: r.id as string,
    account_id: r.account_id as string,
    company_id: r.company_id as string,
    code: r.code as string,
    receipt_date: r.receipt_date as string,
    total_amount: r.total_amount as number,
    payment_method: r.payment_method as CollectionRow["payment_method"],
    reference_number,
    status: r.status as CollectionRow["status"],
    version: r.version as number,
    void_reason,
    voided_at,
    voided_by,
    replaces_collection_id,
    notes,
    created_by: r.created_by as string,
    updated_by: r.updated_by as string,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}

export function parseCollectionSummaryRow(raw: unknown): CollectionSummaryRow | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  if (
    !isValidUuid(r.collection_id) ||
    !isValidUuid(r.account_id) ||
    !isValidUuid(r.company_id) ||
    typeof r.collection_code !== "string" ||
    !isValidIsoDate(r.receipt_date) ||
    typeof r.total_amount !== "number" ||
    isNaN(r.total_amount) ||
    r.total_amount <= 0 ||
    !["bank_transfer", "cash", "cheque"].includes(String(r.payment_method)) ||
    !["active", "voided"].includes(String(r.status)) ||
    typeof r.version !== "number" ||
    !Number.isInteger(r.version) ||
    r.version < 1 ||
    typeof r.allocated_amount !== "number" ||
    isNaN(r.allocated_amount) ||
    typeof r.unallocated_amount !== "number" ||
    isNaN(r.unallocated_amount) ||
    !["voided", "unallocated", "partially_allocated", "fully_allocated"].includes(
      String(r.allocation_state)
    )
  ) {
    return null;
  }

  const reference_number = r.reference_number === null || typeof r.reference_number === "string" ? (r.reference_number as string | null) : undefined;
  const void_reason = r.void_reason === null || typeof r.void_reason === "string" ? (r.void_reason as string | null) : undefined;
  const voided_at = r.voided_at === null || typeof r.voided_at === "string" ? (r.voided_at as string | null) : undefined;
  const replaces_collection_id = r.replaces_collection_id === null || isValidUuid(r.replaces_collection_id) ? (r.replaces_collection_id as string | null) : undefined;

  if (
    reference_number === undefined ||
    void_reason === undefined ||
    voided_at === undefined ||
    replaces_collection_id === undefined
  ) {
    return null;
  }

  return {
    collection_id: r.collection_id as string,
    account_id: r.account_id as string,
    company_id: r.company_id as string,
    collection_code: r.collection_code as string,
    receipt_date: r.receipt_date as string,
    total_amount: r.total_amount as number,
    payment_method: r.payment_method as CollectionSummaryRow["payment_method"],
    reference_number,
    status: r.status as CollectionSummaryRow["status"],
    version: r.version as number,
    void_reason,
    voided_at,
    replaces_collection_id,
    allocated_amount: r.allocated_amount as number,
    unallocated_amount: r.unallocated_amount as number,
    allocation_state: r.allocation_state as CollectionSummaryRow["allocation_state"],
  };
}

export function parseCollectionAllocationRevisionRow(
  raw: unknown
): CollectionAllocationRevisionRow | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  if (
    !isValidUuid(r.id) ||
    !isValidUuid(r.account_id) ||
    !isValidUuid(r.collection_id) ||
    typeof r.revision_number !== "number" ||
    !Number.isInteger(r.revision_number) ||
    r.revision_number < 1 ||
    typeof r.expected_previous_version !== "number" ||
    !Number.isInteger(r.expected_previous_version) ||
    r.expected_previous_version < 0 ||
    !isValidUuid(r.created_by) ||
    typeof r.created_at !== "string"
  ) {
    return null;
  }

  const reason = r.reason === null || typeof r.reason === "string" ? (r.reason as string | null) : undefined;
  if (reason === undefined) return null;

  return {
    id: r.id as string,
    account_id: r.account_id as string,
    collection_id: r.collection_id as string,
    revision_number: r.revision_number as number,
    expected_previous_version: r.expected_previous_version as number,
    reason,
    created_by: r.created_by as string,
    created_at: r.created_at as string,
  };
}

export function parseCollectionAllocationRow(
  raw: unknown
): CollectionAllocationRow | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  if (
    !isValidUuid(r.id) ||
    !isValidUuid(r.account_id) ||
    !isValidUuid(r.revision_id) ||
    !isValidUuid(r.research_form_id) ||
    typeof r.amount !== "number" ||
    isNaN(r.amount) ||
    r.amount <= 0 ||
    !isValidUuid(r.created_by) ||
    typeof r.created_at !== "string"
  ) {
    return null;
  }

  return {
    id: r.id as string,
    account_id: r.account_id as string,
    revision_id: r.revision_id as string,
    research_form_id: r.research_form_id as string,
    amount: r.amount as number,
    created_by: r.created_by as string,
    created_at: r.created_at as string,
  };
}

export async function listCollections(
  supabase: SupabaseClient,
  filters: CollectionsListFilters = {}
): Promise<CollectionsQueryResult<CollectionsListPage>> {
  const pag = parsePaginationInput(filters.page, filters.pageSize);
  if (!pag.ok) return { ok: false, code: "invalid_query_input" };

  if (filters.companyId && !isValidUuid(filters.companyId)) {
    return { ok: false, code: "invalid_query_input" };
  }

  if (
    (filters.receiptDateFrom && !isValidIsoDate(filters.receiptDateFrom)) ||
    (filters.receiptDateTo && !isValidIsoDate(filters.receiptDateTo))
  ) {
    return { ok: false, code: "invalid_query_input" };
  }

  if (
    filters.receiptDateFrom &&
    filters.receiptDateTo &&
    filters.receiptDateFrom > filters.receiptDateTo
  ) {
    return { ok: false, code: "invalid_query_input" };
  }

  let query = supabase
    .from("collection_summary")
    .select(COLLECTION_SUMMARY_SELECT_FIELDS, { count: "exact" });

  if (filters.companyId) query = query.eq("company_id", filters.companyId);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.paymentMethod) query = query.eq("payment_method", filters.paymentMethod);
  if (filters.allocationState) query = query.eq("allocation_state", filters.allocationState);
  if (filters.receiptDateFrom) query = query.gte("receipt_date", filters.receiptDateFrom);
  if (filters.receiptDateTo) query = query.lte("receipt_date", filters.receiptDateTo);
  if (filters.code && filters.code.trim().length > 0) {
    const escaped = escapeIlikePattern(filters.code.trim());
    query = query.ilike("collection_code", `%${escaped}%`);
  }

  query = query
    .order("receipt_date", { ascending: false })
    .order("collection_id", { ascending: false })
    .range(pag.from, pag.to);

  const { data, error, count } = await query;
  if (error) return { ok: false, code: "collections_query_failed" };

  if (!Array.isArray(data) || typeof count !== "number") {
    return { ok: false, code: "malformed_query_response" };
  }

  const items: CollectionSummaryRow[] = [];
  for (const rawRow of data) {
    const parsed = parseCollectionSummaryRow(rawRow);
    if (!parsed) return { ok: false, code: "malformed_query_response" };
    items.push(parsed);
  }

  return {
    ok: true,
    data: {
      items,
      pagination: buildPaginationMeta(pag.page, pag.pageSize, count),
    },
  };
}

export async function getCollection(
  supabase: SupabaseClient,
  collectionId: string
): Promise<CollectionsQueryResult<CollectionRow>> {
  if (!isValidUuid(collectionId)) {
    return { ok: false, code: "invalid_query_input" };
  }

  const { data, error } = await supabase
    .from("collections")
    .select(COLLECTION_SELECT_FIELDS)
    .eq("id", collectionId.trim());

  if (error) return { ok: false, code: "collections_query_failed" };
  if (!Array.isArray(data)) return { ok: false, code: "malformed_query_response" };

  if (data.length === 0) return { ok: false, code: "collection_not_found" };
  if (data.length !== 1) return { ok: false, code: "malformed_query_response" };

  const parsed = parseCollectionRow(data[0]);
  if (!parsed) return { ok: false, code: "malformed_query_response" };

  return { ok: true, data: parsed };
}

export async function listCurrentCollectionAllocations(
  supabase: SupabaseClient,
  collectionId: string
): Promise<CollectionsQueryResult<CollectionCurrentAllocations>> {
  if (!isValidUuid(collectionId)) {
    return { ok: false, code: "invalid_query_input" };
  }

  const cleanId = collectionId.trim();

  // Step 1: Read collection version
  const { data: colData, error: colErr } = await supabase
    .from("collections")
    .select("id, version")
    .eq("id", cleanId);

  if (colErr) return { ok: false, code: "collections_query_failed" };
  if (!Array.isArray(colData) || colData.length !== 1) {
    return { ok: false, code: "collection_not_found" };
  }

  const currentVersion = colData[0].version as number;

  // Step 2: Read revision header for currentVersion
  const { data: revData, error: revErr } = await supabase
    .from("collection_allocation_revisions")
    .select(COLLECTION_REVISION_SELECT_FIELDS)
    .eq("collection_id", cleanId)
    .eq("revision_number", currentVersion);

  if (revErr) return { ok: false, code: "collections_query_failed" };
  if (!Array.isArray(revData) || revData.length !== 1) {
    return { ok: false, code: "collection_revision_not_found" };
  }

  const revision = parseCollectionAllocationRevisionRow(revData[0]);
  if (!revision) return { ok: false, code: "malformed_query_response" };

  // Step 3: Read allocation lines for revision.id
  const { data: allocData, error: allocErr } = await supabase
    .from("collection_allocations")
    .select(COLLECTION_ALLOCATION_SELECT_FIELDS)
    .eq("revision_id", revision.id)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (allocErr) return { ok: false, code: "collections_query_failed" };
  if (!Array.isArray(allocData)) return { ok: false, code: "malformed_query_response" };

  const allocations: CollectionAllocationRow[] = [];
  for (const rawAlloc of allocData) {
    const parsedAlloc = parseCollectionAllocationRow(rawAlloc);
    if (!parsedAlloc) return { ok: false, code: "malformed_query_response" };
    allocations.push(parsedAlloc);
  }

  // Step 4 & 5: Re-read collection version to verify no race/stale read occurred
  const { data: checkData, error: checkErr } = await supabase
    .from("collections")
    .select("version")
    .eq("id", cleanId);

  if (checkErr || !Array.isArray(checkData) || checkData.length !== 1) {
    return { ok: false, code: "collections_query_failed" };
  }

  if (checkData[0].version !== currentVersion) {
    return { ok: false, code: "stale_collection_read" };
  }

  return {
    ok: true,
    data: {
      collection_id: cleanId,
      current_version: currentVersion,
      revision,
      allocations,
    },
  };
}

export async function listCollectionAllocationHistory(
  supabase: SupabaseClient,
  collectionId: string
): Promise<CollectionsQueryResult<CollectionAllocationRevisionWithLines[]>> {
  if (!isValidUuid(collectionId)) {
    return { ok: false, code: "invalid_query_input" };
  }

  const cleanId = collectionId.trim();

  // Verify collection existence
  const { data: colData, error: colErr } = await supabase
    .from("collections")
    .select("id")
    .eq("id", cleanId);

  if (colErr) return { ok: false, code: "collections_query_failed" };
  if (!Array.isArray(colData) || colData.length !== 1) {
    return { ok: false, code: "collection_not_found" };
  }

  // Step 1: Read all revision headers
  const { data: revData, error: revErr } = await supabase
    .from("collection_allocation_revisions")
    .select(COLLECTION_REVISION_SELECT_FIELDS)
    .eq("collection_id", cleanId)
    .order("revision_number", { ascending: false });

  if (revErr) return { ok: false, code: "collections_query_failed" };
  if (!Array.isArray(revData)) return { ok: false, code: "malformed_query_response" };

  if (revData.length === 0) {
    return { ok: true, data: [] };
  }

  const revisions: CollectionAllocationRevisionRow[] = [];
  const revisionIds: string[] = [];

  for (const rawRev of revData) {
    const parsedRev = parseCollectionAllocationRevisionRow(rawRev);
    if (!parsedRev) return { ok: false, code: "malformed_query_response" };
    revisions.push(parsedRev);
    revisionIds.push(parsedRev.id);
  }

  // Step 2: Read all allocation lines using single .in() query
  const { data: allocData, error: allocErr } = await supabase
    .from("collection_allocations")
    .select(COLLECTION_ALLOCATION_SELECT_FIELDS)
    .in("revision_id", revisionIds)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (allocErr) return { ok: false, code: "collections_query_failed" };
  if (!Array.isArray(allocData)) return { ok: false, code: "malformed_query_response" };

  const allocsByRevision = new Map<string, CollectionAllocationRow[]>();
  for (const revId of revisionIds) {
    allocsByRevision.set(revId, []);
  }

  for (const rawAlloc of allocData) {
    const parsedAlloc = parseCollectionAllocationRow(rawAlloc);
    if (!parsedAlloc) return { ok: false, code: "malformed_query_response" };
    const list = allocsByRevision.get(parsedAlloc.revision_id);
    if (list) list.push(parsedAlloc);
  }

  const result: CollectionAllocationRevisionWithLines[] = revisions.map(
    (rev) => ({
      revision: rev,
      allocations: allocsByRevision.get(rev.id) || [],
    })
  );

  return { ok: true, data: result };
}

export async function getCollectionReplacementRelations(
  supabase: SupabaseClient,
  collectionId: string
): Promise<CollectionsQueryResult<CollectionReplacementRelations>> {
  if (!isValidUuid(collectionId)) {
    return { ok: false, code: "invalid_query_input" };
  }

  const currentResult = await getCollection(supabase, collectionId);
  if (!currentResult.ok) return currentResult;

  const current = currentResult.data;

  // Replaced Parent Lookup
  let replacedParent: CollectionSummaryRow | null = null;
  if (current.replaces_collection_id) {
    const { data: parentData, error: parentErr } = await supabase
      .from("collection_summary")
      .select(COLLECTION_SUMMARY_SELECT_FIELDS)
      .eq("collection_id", current.replaces_collection_id);

    if (parentErr) return { ok: false, code: "collections_query_failed" };
    if (!Array.isArray(parentData) || parentData.length !== 1) {
      return { ok: false, code: "malformed_query_response" };
    }
    replacedParent = parseCollectionSummaryRow(parentData[0]);
    if (!replacedParent) return { ok: false, code: "malformed_query_response" };
  }

  // Replacement Child Lookup (request at most 2 rows to detect violations)
  let replacementChild: CollectionSummaryRow | null = null;
  const { data: childData, error: childErr } = await supabase
    .from("collection_summary")
    .select(COLLECTION_SUMMARY_SELECT_FIELDS)
    .eq("replaces_collection_id", current.id)
    .range(0, 1);

  if (childErr) return { ok: false, code: "collections_query_failed" };
  if (!Array.isArray(childData)) return { ok: false, code: "malformed_query_response" };

  if (childData.length > 1) {
    return { ok: false, code: "malformed_query_response" };
  }

  if (childData.length === 1) {
    replacementChild = parseCollectionSummaryRow(childData[0]);
    if (!replacementChild) return { ok: false, code: "malformed_query_response" };
  }

  return {
    ok: true,
    data: {
      current,
      replacedParent,
      replacementChild,
    },
  };
}
