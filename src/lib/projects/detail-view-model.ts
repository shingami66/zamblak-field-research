import { projectsDetailCopy } from "./detail-copy";
import { getAllowedProjectTransitions } from "./lifecycle";
import {
  formatProjectDateOnly,
  formatProjectQuota,
  formatProjectTimestamp,
  projectDomainLabel,
  projectStatusLabel,
} from "./list-view-model";
import type {
  ProjectDetail,
  ProjectErrorCode,
  ProjectResidentType,
  ProjectStatus,
} from "./types";

export type ProjectLifecycleActionView = {
  targetStatus: ProjectStatus;
  label: string;
};

export type ProjectDetailView = {
  projectId: string;
  projectName: string;
  companyName: string;
  domainLabel: string;
  status: ProjectStatus;
  statusLabel: string;
  startDateLabel: string;
  endDateLabel: string;
  quotaLabel: string;
  ageRangeLabel: string;
  residentLabel: string;
  eligibilityNotesLabel: string;
  eligibilityIsEmpty: boolean;
  threeMonthLabel: string;
  whatsappArLabel: string;
  whatsappArIsEmpty: boolean;
  whatsappEnLabel: string;
  whatsappEnIsEmpty: boolean;
  notesLabel: string;
  notesIsEmpty: boolean;
  createdAtLabel: string;
  updatedAtLabel: string;
  /** Exact server concurrency token — never browser-generated. */
  expectedUpdatedAt: string;
  backHref: string;
  editHref: string;
  /** draft/active only — closed/cancelled are read-only in UI. */
  canEdit: boolean;
  isTerminal: boolean;
  /** Structural edges only; caller must also require Owner role. */
  lifecycleActions: ProjectLifecycleActionView[];
};

export function projectResidentLabel(value: ProjectResidentType): string {
  switch (value) {
    case "any":
      return projectsDetailCopy.residentAny;
    case "saudi":
      return projectsDetailCopy.residentSaudi;
    case "non_saudi":
      return projectsDetailCopy.residentNonSaudi;
    case "unknown":
      return projectsDetailCopy.residentUnknown;
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}

export function projectTransitionActionLabel(target: ProjectStatus): string {
  switch (target) {
    case "active":
      return projectsDetailCopy.transitionToActive;
    case "closed":
      return projectsDetailCopy.transitionToClosed;
    case "cancelled":
      return projectsDetailCopy.transitionToCancelled;
    case "draft":
      return projectsDetailCopy.statusDraft;
    default: {
      const _exhaustive: never = target;
      return _exhaustive;
    }
  }
}

/**
 * Age range presentation per approved detail contract.
 * Does not invent eligibility beyond stored min/max.
 */
export function formatProjectAgeRange(
  minAge: number | null,
  maxAge: number | null
): string {
  if (minAge === null && maxAge === null) {
    return projectsDetailCopy.notSpecified;
  }
  if (minAge !== null && maxAge === null) {
    return `من ${minAge} سنة`;
  }
  if (minAge === null && maxAge !== null) {
    return `حتى ${maxAge} سنة`;
  }
  return `من ${minAge} إلى ${maxAge} سنة`;
}

function formatOptionalText(value: string | null): {
  label: string;
  isEmpty: boolean;
} {
  if (value === null || value.trim() === "") {
    return { label: projectsDetailCopy.emptyText, isEmpty: true };
  }
  return { label: value, isEmpty: false };
}

export function isTerminalProjectStatus(status: ProjectStatus): boolean {
  return status === "closed" || status === "cancelled";
}

/** Maps ProjectDetail to presentation fields (no UUIDs as labels, no finance). */
export function toProjectDetailView(project: ProjectDetail): ProjectDetailView {
  const eligibility = formatOptionalText(project.eligibilityNotes);
  const notes = formatOptionalText(project.notes);
  const waAr = formatOptionalText(project.whatsappTemplateAr);
  const waEn = formatOptionalText(project.whatsappTemplateEn);
  const terminal = isTerminalProjectStatus(project.status);

  const lifecycleActions = getAllowedProjectTransitions(project.status).map(
    (targetStatus) => ({
      targetStatus,
      label: projectTransitionActionLabel(targetStatus),
    })
  );

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
    ageRangeLabel: formatProjectAgeRange(project.minAge, project.maxAge),
    residentLabel: projectResidentLabel(project.requiredResidentType),
    eligibilityNotesLabel: eligibility.label,
    eligibilityIsEmpty: eligibility.isEmpty,
    threeMonthLabel: project.requiresThreeMonthWarning
      ? projectsDetailCopy.threeMonthYes
      : projectsDetailCopy.threeMonthNo,
    whatsappArLabel: waAr.label,
    whatsappArIsEmpty: waAr.isEmpty,
    whatsappEnLabel: waEn.label,
    whatsappEnIsEmpty: waEn.isEmpty,
    notesLabel: notes.label,
    notesIsEmpty: notes.isEmpty,
    createdAtLabel: formatProjectTimestamp(project.createdAt),
    updatedAtLabel: formatProjectTimestamp(project.updatedAt),
    expectedUpdatedAt: project.updatedAt,
    backHref: "/projects",
    editHref: `/projects/${project.projectId}/edit`,
    canEdit: !terminal,
    isTerminal: terminal,
    lifecycleActions,
  };
}

/**
 * Presentation outcome for detail route load errors.
 * not_found → call notFound(); access/unexpected → safe Arabic message.
 * Does not leak cross-account existence.
 */
export function projectsDetailErrorBehavior(code: ProjectErrorCode): {
  kind: "not_found" | "message";
  message?: string;
} {
  if (
    code === "project_not_found" ||
    code === "invalid_project_id" ||
    code === "project_company_not_found"
  ) {
    return { kind: "not_found" };
  }
  if (code === "project_access_denied") {
    return { kind: "message", message: projectsDetailCopy.errorAccess };
  }
  if (code === "project_profile_unavailable") {
    return { kind: "message", message: projectsDetailCopy.errorProfile };
  }
  return { kind: "message", message: projectsDetailCopy.errorUnexpected };
}

/** Safe Arabic messages for transition action errors. */
export function projectsTransitionErrorMessage(code: ProjectErrorCode): string {
  switch (code) {
    case "project_access_denied":
      return projectsDetailCopy.errorTransitionAccess;
    case "invalid_project_status_transition":
    case "invalid_project_status":
      return projectsDetailCopy.errorTransitionInvalid;
    case "stale_project_version":
      return projectsDetailCopy.errorStale;
    case "project_not_editable":
      return projectsDetailCopy.errorNotEditable;
    case "project_company_locked":
      return projectsDetailCopy.errorCompanyLocked;
    case "project_not_found":
    case "invalid_project_id":
    case "project_company_not_found":
      return projectsDetailCopy.errorUnexpected;
    case "project_profile_unavailable":
      return projectsDetailCopy.errorProfile;
    default:
      return projectsDetailCopy.errorUnexpected;
  }
}
