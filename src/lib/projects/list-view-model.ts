import { projectsListCopy } from "./list-copy";
import type {
  ProjectDomain,
  ProjectErrorCode,
  ProjectListItem,
  ProjectStatus,
} from "./types";

export type ProjectListItemView = {
  projectId: string;
  projectName: string;
  companyName: string;
  domainLabel: string;
  status: ProjectStatus;
  statusLabel: string;
  startDateLabel: string;
  endDateLabel: string;
  quotaLabel: string;
  updatedAtLabel: string;
  detailHref: string;
  editHref: string;
};

export function projectStatusLabel(status: ProjectStatus): string {
  switch (status) {
    case "draft":
      return projectsListCopy.statusDraft;
    case "active":
      return projectsListCopy.statusActive;
    case "closed":
      return projectsListCopy.statusClosed;
    case "cancelled":
      return projectsListCopy.statusCancelled;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function projectDomainLabel(domain: ProjectDomain): string {
  return domain;
}

/**
 * Formats a date-only YYYY-MM-DD without timezone day-shift.
 * Emits a pure Latin-digit LTR token (DD/MM/YYYY) so RTL layout cannot
 * reorder the calendar day. Does not construct a Date for display.
 */
export function formatProjectDateOnly(value: string | null): string {
  if (value === null || value.trim() === "") {
    return projectsListCopy.notSpecified;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return projectsListCopy.notSpecified;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return projectsListCopy.notSpecified;
  }
  const dd = String(day).padStart(2, "0");
  const mm = String(month).padStart(2, "0");
  return `${dd}/${mm}/${year}`;
}

/** True when the label is a numeric date token that needs LTR isolation. */
export function isProjectDateDisplayToken(label: string): boolean {
  return /^\d{2}\/\d{2}\/\d{4}$/.test(label);
}

/**
 * Locale-aware timestamp for updated_at (matches Companies list/detail pattern).
 * Never returns raw ISO when formatting fails.
 */
export function formatProjectTimestamp(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    return projectsListCopy.notSpecified;
  }
  try {
    return new Intl.DateTimeFormat("ar-SA-u-nu-latn", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(ms));
  } catch {
    return projectsListCopy.notSpecified;
  }
}

export function formatProjectQuota(quota: number | null): string {
  if (quota === null) {
    return projectsListCopy.quotaUnspecified;
  }
  return String(quota);
}

/** Maps domain list item to list UI fields (no finance, no raw UUID display). */
export function toProjectListItemView(
  project: ProjectListItem
): ProjectListItemView {
  return {
    projectId: project.projectId,
    projectName: project.projectName,
    companyName: project.companyName,
    domainLabel: projectDomainLabel(project.domain),
    status: project.status,
    statusLabel: projectStatusLabel(project.status),
    startDateLabel: formatProjectDateOnly(project.startDate),
    endDateLabel: formatProjectDateOnly(project.endDate),
    quotaLabel: formatProjectQuota(project.quota),
    updatedAtLabel: formatProjectTimestamp(project.updatedAt),
    detailHref: `/projects/${project.projectId}`,
    editHref: `/projects/${project.projectId}/edit`,
  };
}

export function toProjectListItemViews(
  projects: ProjectListItem[]
): ProjectListItemView[] {
  return projects.map(toProjectListItemView);
}

/** Safe Arabic messages only — never raw DB text. */
export function projectsListErrorMessage(code: ProjectErrorCode): string {
  switch (code) {
    case "project_access_denied":
      return projectsListCopy.errorAccess;
    case "project_profile_unavailable":
      return projectsListCopy.errorProfile;
    case "invalid_project_pagination":
      return projectsListCopy.errorPagination;
    case "invalid_project_text_length":
      return projectsListCopy.errorTextLength;
    case "invalid_project_status":
      return projectsListCopy.errorStatus;
    case "invalid_company_id":
      return projectsListCopy.errorCompany;
    default:
      return projectsListCopy.errorUnexpected;
  }
}
