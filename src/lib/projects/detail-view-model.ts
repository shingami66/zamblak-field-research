import { projectsDetailCopy } from "./detail-copy";
import {
  getAllowedProjectTransitions,
} from "./lifecycle";
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
  minAgeLabel: string;
  maxAgeLabel: string;
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
  /** Structural edges only; caller must also require Owner role. */
  lifecycleActions: ProjectLifecycleActionView[];
};

export function projectResidentLabel(
  value: ProjectResidentType
): string {
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

export function projectTransitionActionLabel(
  target: ProjectStatus
): string {
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

function formatNullableText(value: string | null): {
  label: string;
  isEmpty: boolean;
} {
  if (value === null || value.trim() === "") {
    return { label: projectsDetailCopy.notProvided, isEmpty: true };
  }
  return { label: value, isEmpty: false };
}

function formatNullableAge(value: number | null): string {
  if (value === null) {
    return projectsDetailCopy.notSpecified;
  }
  return String(value);
}

/** Maps ProjectDetail to presentation fields (no UUIDs as labels, no finance). */
export function toProjectDetailView(project: ProjectDetail): ProjectDetailView {
  const eligibility = formatNullableText(project.eligibilityNotes);
  const notes = formatNullableText(project.notes);
  const waAr = formatNullableText(project.whatsappTemplateAr);
  const waEn = formatNullableText(project.whatsappTemplateEn);

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
    minAgeLabel: formatNullableAge(project.minAge),
    maxAgeLabel: formatNullableAge(project.maxAge),
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
    code === "invalid_project_id"
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
export function projectsTransitionErrorMessage(
  code: ProjectErrorCode
): string {
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
      return projectsDetailCopy.errorUnexpected;
    case "project_profile_unavailable":
      return projectsDetailCopy.errorProfile;
    default:
      return projectsDetailCopy.errorUnexpected;
  }
}
