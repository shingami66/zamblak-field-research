import {
  RESPONDENT_LIST_DEFAULT_LIMIT,
  RESPONDENT_SEARCH_MAX_LENGTH,
  parseListRespondentsInput,
} from "./input";
import type { RespondentListParams, RespondentResult } from "./types";

/** Visible page size for the list UI. */
export const RESPONDENTS_LIST_PAGE_SIZE = RESPONDENT_LIST_DEFAULT_LIMIT;

/** RPC request limit includes one sentinel row for hasNext detection. */
export const RESPONDENTS_LIST_RPC_LIMIT = RESPONDENTS_LIST_PAGE_SIZE + 1;

/** PostgreSQL integer max (signed 32-bit). */
const PG_INT_MAX = 2_147_483_647;

export type RespondentsListUrlState = {
  /** 1-based page for the URL. */
  page: number;
  search: string | null;
  params: RespondentListParams;
};

function isScalarString(value: string | string[] | undefined): value is string {
  return typeof value === "string";
}

/**
 * Parses App Router searchParams for the Respondents list.
 * URL uses `q` (search) and `page` (1-based).
 * Rejects ambiguous arrays and invalid page/search values.
 */
export function parseRespondentsListSearchParams(searchParams: {
  q?: string | string[];
  page?: string | string[];
}): RespondentResult<RespondentsListUrlState> {
  if (Array.isArray(searchParams.q) || Array.isArray(searchParams.page)) {
    return { ok: false, code: "invalid_pagination" };
  }

  const qRaw = isScalarString(searchParams.q) ? searchParams.q : undefined;
  const pageRaw = isScalarString(searchParams.page)
    ? searchParams.page
    : undefined;

  let page = 1;
  if (pageRaw !== undefined) {
    if (pageRaw.trim() === "" || !/^[1-9]\d*$/.test(pageRaw)) {
      return { ok: false, code: "invalid_pagination" };
    }
    const parsed = Number(pageRaw);
    if (
      !Number.isInteger(parsed) ||
      !Number.isSafeInteger(parsed) ||
      parsed < 1
    ) {
      return { ok: false, code: "invalid_pagination" };
    }
    page = parsed;
  }

  const offset = (page - 1) * RESPONDENTS_LIST_PAGE_SIZE;
  if (
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    offset > PG_INT_MAX ||
    offset + RESPONDENTS_LIST_RPC_LIMIT > PG_INT_MAX
  ) {
    return { ok: false, code: "invalid_pagination" };
  }

  const listParsed = parseListRespondentsInput({
    search: qRaw ?? null,
    limit: RESPONDENTS_LIST_RPC_LIMIT,
    offset,
  });

  if (!listParsed.ok) {
    return listParsed;
  }

  if (
    listParsed.data.search &&
    listParsed.data.search.length > RESPONDENT_SEARCH_MAX_LENGTH
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
export function buildRespondentsListHref(options: {
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
  return qs ? `/respondents?${qs}` : "/respondents";
}

export function deriveRespondentsListPagination(options: {
  page: number;
  returnedCount: number;
  search: string | null;
}): {
  hasPrevious: boolean;
  hasNext: boolean;
  previousHref: string | null;
  nextHref: string | null;
  visibleCount: number;
} {
  const page = Math.max(1, options.page);
  const hasPrevious = page > 1;
  const hasNext = options.returnedCount > RESPONDENTS_LIST_PAGE_SIZE;
  const visibleCount = Math.min(
    RESPONDENTS_LIST_PAGE_SIZE,
    Math.max(0, options.returnedCount)
  );

  return {
    hasPrevious,
    hasNext,
    visibleCount,
    previousHref: hasPrevious
      ? buildRespondentsListHref({ search: options.search, page: page - 1 })
      : null,
    nextHref: hasNext
      ? buildRespondentsListHref({ search: options.search, page: page + 1 })
      : null,
  };
}
