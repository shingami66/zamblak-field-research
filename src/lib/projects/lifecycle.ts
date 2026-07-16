import type { ProjectStatus } from "./types";

/**
 * Structural lifecycle edges for Projects MVP.
 * UI/application convenience only — the database remains authoritative
 * and Owner-only transition enforcement is not represented here.
 */
const ALLOWED_TRANSITIONS: Readonly<
  Record<ProjectStatus, readonly ProjectStatus[]>
> = {
  draft: ["active", "cancelled"],
  active: ["closed", "cancelled"],
  closed: [],
  cancelled: [],
};

/** Returns allowed target statuses from the current status (edge set only). */
export function getAllowedProjectTransitions(
  currentStatus: ProjectStatus
): readonly ProjectStatus[] {
  return ALLOWED_TRANSITIONS[currentStatus];
}

/**
 * Whether the edge current → target is structurally allowed.
 * Same-status, reopening, and unknown edges are false.
 * Does not assert caller role authority.
 */
export function isAllowedProjectStatusTransition(
  currentStatus: ProjectStatus,
  targetStatus: ProjectStatus
): boolean {
  if (currentStatus === targetStatus) {
    return false;
  }
  return ALLOWED_TRANSITIONS[currentStatus].includes(targetStatus);
}
