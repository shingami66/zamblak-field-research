import type { ParticipationResult } from "./types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ParticipationIds = {
  projectId: string;
  respondentId: string;
};

export type ParticipationListParams = {
  projectId: string;
  search: string | null;
  limit: number;
  offset: number;
};

export function parseParticipationIds(
  input: ParticipationIds
): ParticipationResult<ParticipationIds> {
  if (!UUID_RE.test(input.projectId)) {
    return { ok: false, code: "invalid_project_id" };
  }
  if (!UUID_RE.test(input.respondentId)) {
    return { ok: false, code: "invalid_respondent_id" };
  }
  return { ok: true, data: input };
}

export function parseParticipationListParams(
  input: ParticipationListParams
): ParticipationResult<ParticipationListParams> {
  if (!UUID_RE.test(input.projectId)) {
    return { ok: false, code: "invalid_project_id" };
  }
  if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 100 || input.offset < 0) {
    return { ok: false, code: "unexpected_participation_error" };
  }
  const search = input.search?.trim() || null;
  if (search && search.length > 80) {
    return { ok: false, code: "unexpected_participation_error" };
  }
  return { ok: true, data: { ...input, search } };
}