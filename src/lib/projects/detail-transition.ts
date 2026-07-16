import { projectsDetailCopy } from "./detail-copy";
import { projectsTransitionErrorMessage } from "./detail-view-model";
import type { ProjectErrorCode, ProjectStatus } from "./types";

export type TransitionProjectActionState = {
  status: "idle" | "error" | "success";
  code: ProjectErrorCode | null;
  formError: string | null;
};

export const EMPTY_TRANSITION_PROJECT_STATE: TransitionProjectActionState = {
  status: "idle",
  code: null,
  formError: null,
};

export function mapTransitionProjectErrorPresentation(
  code: ProjectErrorCode
): TransitionProjectActionState {
  return {
    status: "error",
    code,
    formError: projectsTransitionErrorMessage(code),
  };
}

/** Owner-only gate failure (application layer; DB remains authoritative). */
export function transitionOwnerDeniedState(): TransitionProjectActionState {
  return {
    status: "error",
    code: "project_access_denied",
    formError: projectsDetailCopy.errorTransitionAccess,
  };
}

export type TransitionFormFields = {
  projectId: string;
  expectedUpdatedAt: string;
  targetStatus: string;
};

export function readTransitionFormFields(
  formData: FormData
): TransitionFormFields {
  return {
    projectId: readString(formData, "project_id"),
    expectedUpdatedAt: readString(formData, "expected_updated_at"),
    targetStatus: readString(formData, "target_status"),
  };
}

function readString(formData: FormData, key: string): string {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw : "";
}

export function isProjectStatusValue(
  value: string
): value is ProjectStatus {
  return (
    value === "draft" ||
    value === "active" ||
    value === "closed" ||
    value === "cancelled"
  );
}
