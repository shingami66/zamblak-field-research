import {
  COMPANY_LIST_DEFAULT_LIMIT,
  COMPANY_SEARCH_MAX_LENGTH,
  parseListCompaniesInput,
} from "./input";
import type { CompanyListParams, CompanyResult } from "./types";

export const COMPANIES_LIST_PAGE_SIZE = COMPANY_LIST_DEFAULT_LIMIT;

export type CompaniesListUrlState = {
  /** 1-based page for the URL. */
  page: number;
  search: string | null;
  params: CompanyListParams;
};

function firstString(
  value: string | string[] | undefined
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

/**
 * Parses App Router searchParams for the Companies list.
 * URL uses `q` (search) and `page` (1-based). Fixed page size 25.
 * Invalid page values fail closed to page 1 (safe UX).
 * Overlong search maps to invalid_pagination.
 */
export function parseCompaniesListSearchParams(searchParams: {
  q?: string | string[];
  page?: string | string[];
}): CompanyResult<CompaniesListUrlState> {
  const qRaw = firstString(searchParams.q);
  const pageRaw = firstString(searchParams.page);

  let page = 1;
  if (pageRaw !== undefined && pageRaw.trim() !== "") {
    const parsed = Number(pageRaw);
    if (Number.isInteger(parsed) && parsed >= 1) {
      page = parsed;
    }
    // invalid page/offset → page 1 (safe), not a hard error
  }

  const offset = (page - 1) * COMPANIES_LIST_PAGE_SIZE;

  const listParsed = parseListCompaniesInput({
    search: qRaw ?? null,
    limit: COMPANIES_LIST_PAGE_SIZE,
    offset,
  });

  if (!listParsed.ok) {
    return listParsed;
  }

  // Cap defensive: search already limited in parseListCompaniesInput
  if (
    listParsed.data.search &&
    listParsed.data.search.length > COMPANY_SEARCH_MAX_LENGTH
  ) {
    return { ok: false, code: "invalid_pagination" };
  }

  return {
    ok: true,
    data: {
      page,
      search: listParsed.data.search,
      params: listParsed.data,
    },
  };
}

/** Shareable list URL; omits empty search and page=1. */
export function buildCompaniesListHref(options: {
  search?: string | null;
  page?: number;
}): string {
  const sp = new URLSearchParams();
  const search = options.search?.trim() ?? "";
  if (search) {
    sp.set("q", search);
  }
  const page = options.page ?? 1;
  if (page > 1) {
    sp.set("page", String(page));
  }
  const qs = sp.toString();
  return qs ? `/companies?${qs}` : "/companies";
}

export function deriveListPagination(options: {
  page: number;
  pageSize: number;
  returnedCount: number;
  search: string | null;
}): {
  hasPrevious: boolean;
  hasNext: boolean;
  previousHref: string | null;
  nextHref: string | null;
} {
  const page = Math.max(1, options.page);
  const hasPrevious = page > 1;
  const hasNext = options.returnedCount >= options.pageSize;

  return {
    hasPrevious,
    hasNext,
    previousHref: hasPrevious
      ? buildCompaniesListHref({ search: options.search, page: page - 1 })
      : null,
    nextHref: hasNext
      ? buildCompaniesListHref({ search: options.search, page: page + 1 })
      : null,
  };
}
