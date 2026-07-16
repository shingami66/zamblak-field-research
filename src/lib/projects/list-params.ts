import {
  PROJECT_LIST_DEFAULT_LIMIT,
  PROJECT_SEARCH_MAX_LENGTH,
  parseListProjectsInput,
} from "./input";
import type { ProjectListParams, ProjectResult, ProjectStatus } from "./types";

export const PROJECTS_LIST_PAGE_SIZE = PROJECT_LIST_DEFAULT_LIMIT;

export type ProjectsListUrlState = {
  /** 1-based page for the URL. */
  page: number;
  search: string | null;
  companyId: string | null;
  status: ProjectStatus | null;
  params: ProjectListParams;
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
 * Parses App Router searchParams for the Projects list.
 * URL uses `q` (search), `company`, `status`, and `page` (1-based).
 * Fixed page size 25 (≤ live RPC max 50).
 * Invalid page values fail closed to page 1 (safe UX).
 */
export function parseProjectsListSearchParams(searchParams: {
  q?: string | string[];
  company?: string | string[];
  status?: string | string[];
  page?: string | string[];
}): ProjectResult<ProjectsListUrlState> {
  const qRaw = firstString(searchParams.q);
  const companyRaw = firstString(searchParams.company);
  const statusRaw = firstString(searchParams.status);
  const pageRaw = firstString(searchParams.page);

  let page = 1;
  if (pageRaw !== undefined && pageRaw.trim() !== "") {
    const parsed = Number(pageRaw);
    if (Number.isInteger(parsed) && parsed >= 1) {
      page = parsed;
    }
  }

  const offset = (page - 1) * PROJECTS_LIST_PAGE_SIZE;

  const listParsed = parseListProjectsInput({
    search: qRaw ?? null,
    companyId: companyRaw ?? null,
    status: statusRaw ?? null,
    limit: PROJECTS_LIST_PAGE_SIZE,
    offset,
  });

  if (!listParsed.ok) {
    return listParsed;
  }

  if (
    listParsed.data.search &&
    listParsed.data.search.length > PROJECT_SEARCH_MAX_LENGTH
  ) {
    return { ok: false, code: "invalid_project_text_length" };
  }

  return {
    ok: true,
    data: {
      page,
      search: listParsed.data.search,
      companyId: listParsed.data.companyId,
      status: listParsed.data.status,
      params: listParsed.data,
    },
  };
}

/** Shareable list URL; omits empty filters and page=1. */
export function buildProjectsListHref(options: {
  search?: string | null;
  companyId?: string | null;
  status?: ProjectStatus | null;
  page?: number;
}): string {
  const sp = new URLSearchParams();
  const search = options.search?.trim() ?? "";
  if (search) {
    sp.set("q", search);
  }
  const companyId = options.companyId?.trim() ?? "";
  if (companyId) {
    sp.set("company", companyId);
  }
  if (options.status) {
    sp.set("status", options.status);
  }
  const page = options.page ?? 1;
  if (page > 1) {
    sp.set("page", String(page));
  }
  const qs = sp.toString();
  return qs ? `/projects?${qs}` : "/projects";
}

export function deriveProjectsListPagination(options: {
  page: number;
  pageSize: number;
  returnedCount: number;
  search: string | null;
  companyId: string | null;
  status: ProjectStatus | null;
}): {
  hasPrevious: boolean;
  hasNext: boolean;
  previousHref: string | null;
  nextHref: string | null;
} {
  const page = Math.max(1, options.page);
  const hasPrevious = page > 1;
  const hasNext = options.returnedCount >= options.pageSize;
  const filter = {
    search: options.search,
    companyId: options.companyId,
    status: options.status,
  };

  return {
    hasPrevious,
    hasNext,
    previousHref: hasPrevious
      ? buildProjectsListHref({ ...filter, page: page - 1 })
      : null,
    nextHref: hasNext
      ? buildProjectsListHref({ ...filter, page: page + 1 })
      : null,
  };
}
