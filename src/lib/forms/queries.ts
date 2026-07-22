import type { SupabaseClient } from "@supabase/supabase-js";
import { isValidIsoDate, isValidUuid } from "./input";
import type {
  FormFinancialSummaryFilters,
  FormFinancialSummaryPage,
  FormFinancialSummaryRow,
  FormsListFilters,
  FormsListPage,
  FormsQueryResult,
  PaginationMeta,
  ResearchFormRow,
} from "./types";

export const RESEARCH_FORM_SELECT_FIELDS =
  "id, account_id, project_id, company_id, respondent_id, participation_id, code, attempt_number, submitted_date, review_status, submitted_at, reviewed_at, accepted_at, rejected_at, cancelled_at, rejection_reason, review_correction_reason, accepted_price_snapshot, quota_limit_snapshot, accepted_count_before, quota_override_reason, quota_overridden_at, quota_overridden_by, notes, created_by, updated_by, created_at, updated_at";

export const FORM_FINANCIAL_SUMMARY_SELECT_FIELDS =
  "research_form_id, account_id, project_id, company_id, respondent_id, participation_id, form_code, submitted_date, accepted_at, accepted_price_snapshot, allocated_amount, outstanding_amount, settlement_state, due_date";

export function escapeIlikePattern(val: string): string {
  return val.replace(/[%_\\]/g, "\\$&");
}

export function parsePaginationInput(
  pageRaw?: number,
  pageSizeRaw?: number
): { ok: true; page: number; pageSize: number; from: number; to: number } | { ok: false } {
  const page = pageRaw === undefined ? 1 : pageRaw;
  const pageSize = pageSizeRaw === undefined ? 20 : pageSizeRaw;

  if (
    typeof page !== "number" ||
    !Number.isInteger(page) ||
    page < 1 ||
    typeof pageSize !== "number" ||
    !Number.isInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 100
  ) {
    return { ok: false };
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return { ok: true, page, pageSize, from, to };
}

export function buildPaginationMeta(
  page: number,
  pageSize: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / pageSize) || 1;
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages,
  };
}

export function parseResearchFormRow(raw: unknown): ResearchFormRow | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  if (
    !isValidUuid(r.id) ||
    !isValidUuid(r.account_id) ||
    !isValidUuid(r.project_id) ||
    !isValidUuid(r.company_id) ||
    !isValidUuid(r.respondent_id) ||
    !isValidUuid(r.participation_id) ||
    typeof r.code !== "string" ||
    typeof r.attempt_number !== "number" ||
    !Number.isInteger(r.attempt_number) ||
    r.attempt_number < 1 ||
    !isValidIsoDate(r.submitted_date) ||
    !["submitted", "accepted", "rejected", "cancelled"].includes(
      String(r.review_status)
    ) ||
    typeof r.submitted_at !== "string" ||
    !isValidUuid(r.created_by) ||
    !isValidUuid(r.updated_by) ||
    typeof r.created_at !== "string" ||
    typeof r.updated_at !== "string"
  ) {
    return null;
  }

  // Nullable validations
  const reviewed_at = r.reviewed_at === null || typeof r.reviewed_at === "string" ? (r.reviewed_at as string | null) : undefined;
  const accepted_at = r.accepted_at === null || typeof r.accepted_at === "string" ? (r.accepted_at as string | null) : undefined;
  const rejected_at = r.rejected_at === null || typeof r.rejected_at === "string" ? (r.rejected_at as string | null) : undefined;
  const cancelled_at = r.cancelled_at === null || typeof r.cancelled_at === "string" ? (r.cancelled_at as string | null) : undefined;
  const rejection_reason = r.rejection_reason === null || typeof r.rejection_reason === "string" ? (r.rejection_reason as string | null) : undefined;
  const review_correction_reason = r.review_correction_reason === null || typeof r.review_correction_reason === "string" ? (r.review_correction_reason as string | null) : undefined;
  const accepted_price_snapshot = r.accepted_price_snapshot === null || (typeof r.accepted_price_snapshot === "number" && !isNaN(r.accepted_price_snapshot) && r.accepted_price_snapshot >= 0) ? (r.accepted_price_snapshot as number | null) : undefined;
  const quota_limit_snapshot = r.quota_limit_snapshot === null || (typeof r.quota_limit_snapshot === "number" && Number.isInteger(r.quota_limit_snapshot) && r.quota_limit_snapshot >= 0) ? (r.quota_limit_snapshot as number | null) : undefined;
  const accepted_count_before = r.accepted_count_before === null || (typeof r.accepted_count_before === "number" && Number.isInteger(r.accepted_count_before) && r.accepted_count_before >= 0) ? (r.accepted_count_before as number | null) : undefined;
  const quota_override_reason = r.quota_override_reason === null || typeof r.quota_override_reason === "string" ? (r.quota_override_reason as string | null) : undefined;
  const quota_overridden_at = r.quota_overridden_at === null || typeof r.quota_overridden_at === "string" ? (r.quota_overridden_at as string | null) : undefined;
  const quota_overridden_by = r.quota_overridden_by === null || isValidUuid(r.quota_overridden_by) ? (r.quota_overridden_by as string | null) : undefined;
  const notes = r.notes === null || typeof r.notes === "string" ? (r.notes as string | null) : undefined;

  if (
    reviewed_at === undefined ||
    accepted_at === undefined ||
    rejected_at === undefined ||
    cancelled_at === undefined ||
    rejection_reason === undefined ||
    review_correction_reason === undefined ||
    accepted_price_snapshot === undefined ||
    quota_limit_snapshot === undefined ||
    accepted_count_before === undefined ||
    quota_override_reason === undefined ||
    quota_overridden_at === undefined ||
    quota_overridden_by === undefined ||
    notes === undefined
  ) {
    return null;
  }

  return {
    id: r.id as string,
    account_id: r.account_id as string,
    project_id: r.project_id as string,
    company_id: r.company_id as string,
    respondent_id: r.respondent_id as string,
    participation_id: r.participation_id as string,
    code: r.code as string,
    attempt_number: r.attempt_number as number,
    submitted_date: r.submitted_date as string,
    review_status: r.review_status as ResearchFormRow["review_status"],
    submitted_at: r.submitted_at as string,
    reviewed_at,
    accepted_at,
    rejected_at,
    cancelled_at,
    rejection_reason,
    review_correction_reason,
    accepted_price_snapshot,
    quota_limit_snapshot,
    accepted_count_before,
    quota_override_reason,
    quota_overridden_at,
    quota_overridden_by,
    notes,
    created_by: r.created_by as string,
    updated_by: r.updated_by as string,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}

export function parseFormFinancialSummaryRow(
  raw: unknown
): FormFinancialSummaryRow | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  if (
    !isValidUuid(r.research_form_id) ||
    !isValidUuid(r.account_id) ||
    !isValidUuid(r.project_id) ||
    !isValidUuid(r.company_id) ||
    !isValidUuid(r.respondent_id) ||
    !isValidUuid(r.participation_id) ||
    typeof r.form_code !== "string" ||
    !isValidIsoDate(r.submitted_date) ||
    typeof r.accepted_at !== "string" ||
    typeof r.accepted_price_snapshot !== "number" ||
    isNaN(r.accepted_price_snapshot) ||
    typeof r.allocated_amount !== "number" ||
    isNaN(r.allocated_amount) ||
    typeof r.outstanding_amount !== "number" ||
    isNaN(r.outstanding_amount) ||
    !["uncollected", "partially_collected", "collected"].includes(
      String(r.settlement_state)
    ) ||
    !isValidIsoDate(r.due_date)
  ) {
    return null;
  }

  return {
    research_form_id: r.research_form_id as string,
    account_id: r.account_id as string,
    project_id: r.project_id as string,
    company_id: r.company_id as string,
    respondent_id: r.respondent_id as string,
    participation_id: r.participation_id as string,
    form_code: r.form_code as string,
    submitted_date: r.submitted_date as string,
    accepted_at: r.accepted_at as string,
    accepted_price_snapshot: r.accepted_price_snapshot as number,
    allocated_amount: r.allocated_amount as number,
    outstanding_amount: r.outstanding_amount as number,
    settlement_state: r.settlement_state as FormFinancialSummaryRow["settlement_state"],
    due_date: r.due_date as string,
  };
}

export async function listResearchForms(
  supabase: SupabaseClient,
  filters: FormsListFilters = {}
): Promise<FormsQueryResult<FormsListPage>> {
  const pag = parsePaginationInput(filters.page, filters.pageSize);
  if (!pag.ok) return { ok: false, code: "invalid_query_input" };

  if (
    (filters.projectId && !isValidUuid(filters.projectId)) ||
    (filters.companyId && !isValidUuid(filters.companyId)) ||
    (filters.respondentId && !isValidUuid(filters.respondentId)) ||
    (filters.participationId && !isValidUuid(filters.participationId))
  ) {
    return { ok: false, code: "invalid_query_input" };
  }

  if (
    (filters.submittedDateFrom && !isValidIsoDate(filters.submittedDateFrom)) ||
    (filters.submittedDateTo && !isValidIsoDate(filters.submittedDateTo))
  ) {
    return { ok: false, code: "invalid_query_input" };
  }

  if (
    filters.submittedDateFrom &&
    filters.submittedDateTo &&
    filters.submittedDateFrom > filters.submittedDateTo
  ) {
    return { ok: false, code: "invalid_query_input" };
  }

  let query = supabase
    .from("research_forms")
    .select(RESEARCH_FORM_SELECT_FIELDS, { count: "exact" });

  if (filters.projectId) query = query.eq("project_id", filters.projectId);
  if (filters.companyId) query = query.eq("company_id", filters.companyId);
  if (filters.respondentId) query = query.eq("respondent_id", filters.respondentId);
  if (filters.participationId) query = query.eq("participation_id", filters.participationId);
  if (filters.reviewStatus) query = query.eq("review_status", filters.reviewStatus);
  if (filters.submittedDateFrom) query = query.gte("submitted_date", filters.submittedDateFrom);
  if (filters.submittedDateTo) query = query.lte("submitted_date", filters.submittedDateTo);
  if (filters.code && filters.code.trim().length > 0) {
    const escaped = escapeIlikePattern(filters.code.trim());
    query = query.ilike("code", `%${escaped}%`);
  }

  query = query
    .order("submitted_date", { ascending: false })
    .order("submitted_at", { ascending: false })
    .order("id", { ascending: false })
    .range(pag.from, pag.to);

  const { data, error, count } = await query;
  if (error) return { ok: false, code: "forms_query_failed" };

  if (!Array.isArray(data) || typeof count !== "number") {
    return { ok: false, code: "malformed_query_response" };
  }

  const items: ResearchFormRow[] = [];
  for (const rawRow of data) {
    const parsed = parseResearchFormRow(rawRow);
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

export async function listSubmittedResearchForms(
  supabase: SupabaseClient,
  filters: Omit<FormsListFilters, "reviewStatus"> = {}
): Promise<FormsQueryResult<FormsListPage>> {
  const pag = parsePaginationInput(filters.page, filters.pageSize);
  if (!pag.ok) return { ok: false, code: "invalid_query_input" };

  if (
    (filters.projectId && !isValidUuid(filters.projectId)) ||
    (filters.companyId && !isValidUuid(filters.companyId)) ||
    (filters.respondentId && !isValidUuid(filters.respondentId)) ||
    (filters.participationId && !isValidUuid(filters.participationId))
  ) {
    return { ok: false, code: "invalid_query_input" };
  }

  if (
    (filters.submittedDateFrom && !isValidIsoDate(filters.submittedDateFrom)) ||
    (filters.submittedDateTo && !isValidIsoDate(filters.submittedDateTo))
  ) {
    return { ok: false, code: "invalid_query_input" };
  }

  if (
    filters.submittedDateFrom &&
    filters.submittedDateTo &&
    filters.submittedDateFrom > filters.submittedDateTo
  ) {
    return { ok: false, code: "invalid_query_input" };
  }

  let query = supabase
    .from("research_forms")
    .select(RESEARCH_FORM_SELECT_FIELDS, { count: "exact" })
    .eq("review_status", "submitted");

  if (filters.projectId) query = query.eq("project_id", filters.projectId);
  if (filters.companyId) query = query.eq("company_id", filters.companyId);
  if (filters.respondentId) query = query.eq("respondent_id", filters.respondentId);
  if (filters.participationId) query = query.eq("participation_id", filters.participationId);
  if (filters.submittedDateFrom) query = query.gte("submitted_date", filters.submittedDateFrom);
  if (filters.submittedDateTo) query = query.lte("submitted_date", filters.submittedDateTo);
  if (filters.code && filters.code.trim().length > 0) {
    const escaped = escapeIlikePattern(filters.code.trim());
    query = query.ilike("code", `%${escaped}%`);
  }

  query = query
    .order("submitted_at", { ascending: true })
    .order("id", { ascending: true })
    .range(pag.from, pag.to);

  const { data, error, count } = await query;
  if (error) return { ok: false, code: "forms_query_failed" };

  if (!Array.isArray(data) || typeof count !== "number") {
    return { ok: false, code: "malformed_query_response" };
  }

  const items: ResearchFormRow[] = [];
  for (const rawRow of data) {
    const parsed = parseResearchFormRow(rawRow);
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

export async function getResearchForm(
  supabase: SupabaseClient,
  researchFormId: string
): Promise<FormsQueryResult<ResearchFormRow>> {
  if (!isValidUuid(researchFormId)) {
    return { ok: false, code: "invalid_query_input" };
  }

  const { data, error } = await supabase
    .from("research_forms")
    .select(RESEARCH_FORM_SELECT_FIELDS)
    .eq("id", researchFormId.trim());

  if (error) return { ok: false, code: "forms_query_failed" };
  if (!Array.isArray(data)) return { ok: false, code: "malformed_query_response" };

  if (data.length === 0) return { ok: false, code: "research_form_not_found" };
  if (data.length !== 1) return { ok: false, code: "malformed_query_response" };

  const parsed = parseResearchFormRow(data[0]);
  if (!parsed) return { ok: false, code: "malformed_query_response" };

  return { ok: true, data: parsed };
}

export async function listFormFinancialSummaries(
  supabase: SupabaseClient,
  filters: FormFinancialSummaryFilters = {}
): Promise<FormsQueryResult<FormFinancialSummaryPage>> {
  const pag = parsePaginationInput(filters.page, filters.pageSize);
  if (!pag.ok) return { ok: false, code: "invalid_query_input" };

  if (
    (filters.projectId && !isValidUuid(filters.projectId)) ||
    (filters.companyId && !isValidUuid(filters.companyId)) ||
    (filters.respondentId && !isValidUuid(filters.respondentId)) ||
    (filters.participationId && !isValidUuid(filters.participationId))
  ) {
    return { ok: false, code: "invalid_query_input" };
  }

  if (
    (filters.dueDateFrom && !isValidIsoDate(filters.dueDateFrom)) ||
    (filters.dueDateTo && !isValidIsoDate(filters.dueDateTo))
  ) {
    return { ok: false, code: "invalid_query_input" };
  }

  if (
    filters.dueDateFrom &&
    filters.dueDateTo &&
    filters.dueDateFrom > filters.dueDateTo
  ) {
    return { ok: false, code: "invalid_query_input" };
  }

  let query = supabase
    .from("form_financial_summary")
    .select(FORM_FINANCIAL_SUMMARY_SELECT_FIELDS, { count: "exact" });

  if (filters.projectId) query = query.eq("project_id", filters.projectId);
  if (filters.companyId) query = query.eq("company_id", filters.companyId);
  if (filters.respondentId) query = query.eq("respondent_id", filters.respondentId);
  if (filters.participationId) query = query.eq("participation_id", filters.participationId);
  if (filters.settlementState) query = query.eq("settlement_state", filters.settlementState);
  if (filters.dueDateFrom) query = query.gte("due_date", filters.dueDateFrom);
  if (filters.dueDateTo) query = query.lte("due_date", filters.dueDateTo);
  if (filters.formCode && filters.formCode.trim().length > 0) {
    const escaped = escapeIlikePattern(filters.formCode.trim());
    query = query.ilike("form_code", `%${escaped}%`);
  }

  query = query
    .order("due_date", { ascending: true })
    .order("research_form_id", { ascending: false })
    .range(pag.from, pag.to);

  const { data, error, count } = await query;
  if (error) return { ok: false, code: "forms_query_failed" };

  if (!Array.isArray(data) || typeof count !== "number") {
    return { ok: false, code: "malformed_query_response" };
  }

  const items: FormFinancialSummaryRow[] = [];
  for (const rawRow of data) {
    const parsed = parseFormFinancialSummaryRow(rawRow);
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

export async function getFormFinancialSummary(
  supabase: SupabaseClient,
  researchFormId: string
): Promise<FormsQueryResult<FormFinancialSummaryRow>> {
  if (!isValidUuid(researchFormId)) {
    return { ok: false, code: "invalid_query_input" };
  }

  const { data, error } = await supabase
    .from("form_financial_summary")
    .select(FORM_FINANCIAL_SUMMARY_SELECT_FIELDS)
    .eq("research_form_id", researchFormId.trim());

  if (error) return { ok: false, code: "forms_query_failed" };
  if (!Array.isArray(data)) return { ok: false, code: "malformed_query_response" };

  if (data.length === 0) return { ok: false, code: "financial_summary_not_found" };
  if (data.length !== 1) return { ok: false, code: "malformed_query_response" };

  const parsed = parseFormFinancialSummaryRow(data[0]);
  if (!parsed) return { ok: false, code: "malformed_query_response" };

  return { ok: true, data: parsed };
}
