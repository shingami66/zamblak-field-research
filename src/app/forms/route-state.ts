import { redirect } from "next/navigation";
import { isValidIsoDate, isValidUuid } from "@/lib/forms/input";
import type {
  FormsListFilters,
  ResearchFormReviewStatus,
} from "@/lib/forms/types";
import { requireAppSession, type AppSession } from "@/lib/auth/session";

export async function requireOwnerSession(): Promise<AppSession> {
  const session = await requireAppSession();
  if (session.profile.role !== "owner") {
    redirect("/forbidden");
  }
  return session;
}

export function getSingleSearchParam(
  param: string | string[] | undefined
): string | undefined {
  if (!param) return undefined;
  if (Array.isArray(param)) {
    return param[0] && param[0].trim().length > 0 ? param[0].trim() : undefined;
  }
  const trimmed = param.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function parsePageParam(param: string | string[] | undefined): number {
  const raw = getSingleSearchParam(param);
  if (!raw) return 1;
  const num = Number(raw);
  if (!Number.isInteger(num) || num < 1) return 1;
  return num;
}

const ALLOWED_PAGE_SIZES = [10, 20, 50, 100] as const;

export function parsePageSizeParam(
  param: string | string[] | undefined
): number {
  const raw = getSingleSearchParam(param);
  if (!raw) return 20;
  const num = Number(raw);
  if (!ALLOWED_PAGE_SIZES.includes(num as (typeof ALLOWED_PAGE_SIZES)[number])) {
    return 20;
  }
  return num;
}

const ALLOWED_STATUSES: ResearchFormReviewStatus[] = [
  "submitted",
  "accepted",
  "rejected",
  "cancelled",
];

export function parseReviewStatusParam(
  param: string | string[] | undefined
): ResearchFormReviewStatus | undefined {
  const raw = getSingleSearchParam(param);
  if (!raw || !ALLOWED_STATUSES.includes(raw as ResearchFormReviewStatus)) {
    return undefined;
  }
  return raw as ResearchFormReviewStatus;
}

export function parseIsoDateParam(
  param: string | string[] | undefined
): string | undefined {
  const raw = getSingleSearchParam(param);
  if (!raw || !isValidIsoDate(raw)) return undefined;
  return raw;
}

export function parseCodeParam(
  param: string | string[] | undefined
): string | undefined {
  const raw = getSingleSearchParam(param);
  if (!raw) return undefined;
  const trimmed = raw.slice(0, 64);
  return trimmed.length > 0 ? trimmed : undefined;
}

export type ParseRouteFiltersResult =
  | { ok: true; filters: FormsListFilters }
  | { ok: false; code: "invalid_date_range" };

export function parseFormsListRouteFilters(
  searchParams: Record<string, string | string[] | undefined>
): ParseRouteFiltersResult {
  const page = parsePageParam(searchParams.page);
  const pageSize = parsePageSizeParam(searchParams.pageSize);
  const reviewStatus = parseReviewStatusParam(searchParams.reviewStatus);
  const submittedDateFrom = parseIsoDateParam(searchParams.submittedDateFrom);
  const submittedDateTo = parseIsoDateParam(searchParams.submittedDateTo);
  const code = parseCodeParam(searchParams.code);

  if (submittedDateFrom && submittedDateTo && submittedDateFrom > submittedDateTo) {
    return { ok: false, code: "invalid_date_range" };
  }

  return {
    ok: true,
    filters: {
      page,
      pageSize,
      reviewStatus,
      submittedDateFrom,
      submittedDateTo,
      code,
    },
  };
}

export function buildPaginationUrl(
  basePath: string,
  currentFilters: FormsListFilters,
  newPage: number
): string {
  const params = new URLSearchParams();

  if (currentFilters.code) params.set("code", currentFilters.code);
  if (currentFilters.reviewStatus) params.set("reviewStatus", currentFilters.reviewStatus);
  if (currentFilters.submittedDateFrom) params.set("submittedDateFrom", currentFilters.submittedDateFrom);
  if (currentFilters.submittedDateTo) params.set("submittedDateTo", currentFilters.submittedDateTo);
  if (currentFilters.pageSize && currentFilters.pageSize !== 20) {
    params.set("pageSize", String(currentFilters.pageSize));
  }
  if (newPage > 1) {
    params.set("page", String(newPage));
  }

  const queryStr = params.toString();
  return queryStr ? `${basePath}?${queryStr}` : basePath;
}

export function normalizeFormIdParam(formId: string | undefined): string | null {
  if (!formId || typeof formId !== "string") return null;
  const trimmed = formId.trim();
  if (!isValidUuid(trimmed)) return null;
  return trimmed;
}
