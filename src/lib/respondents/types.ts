/**
 * Application-facing Respondent Registry types over verified DEV/DEMO RPCs.
 * No financial, Participation, Project-history, or internal audit fields.
 */

export type RespondentResidentType = "saudi" | "non_saudi" | "unknown";

export type RespondentErrorCode =
  | "respondent_access_denied"
  | "invalid_pagination"
  | "invalid_respondent_mobile"
  | "invalid_respondent_name"
  | "invalid_respondent_age"
  | "invalid_respondent_nationality"
  | "invalid_respondent_resident_type"
  | "invalid_respondent_notes"
  | "duplicate_respondent_mobile"
  | "respondent_not_found"
  | "stale_respondent_version"
  | "unexpected_respondent_error";

/** list_respondents return shape (no notes). */
export type RespondentListItem = {
  respondentId: string;
  name: string | null;
  mobile: string;
  age: number | null;
  nationality: string | null;
  residentType: RespondentResidentType;
  createdAt: string;
  updatedAt: string;
};

/** get/create/update return shape (includes notes). */
export type RespondentDetail = RespondentListItem & {
  notes: string | null;
};

export type RespondentListParams = {
  search: string | null;
  limit: number;
  offset: number;
};

export type CreateRespondentInput = {
  mobile: string;
  name: string | null;
  age: number | null;
  nationality: string | null;
  residentType: RespondentResidentType;
  notes: string | null;
};

export type UpdateRespondentInput = CreateRespondentInput & {
  respondentId: string;
  /** Required optimistic concurrency token; never defaulted. */
  expectedUpdatedAt: string;
};

export type RespondentsListResult = {
  respondents: RespondentListItem[];
};

export type RespondentSuccess<T> = { ok: true; data: T };
export type RespondentFailure = { ok: false; code: RespondentErrorCode };
export type RespondentResult<T> = RespondentSuccess<T> | RespondentFailure;

/** Raw list RPC row field names from PostgreSQL. */
export type RespondentListRpcRow = {
  respondent_id: unknown;
  name: unknown;
  mobile: unknown;
  age: unknown;
  nationality: unknown;
  resident_type: unknown;
  created_at: unknown;
  updated_at: unknown;
};

/** Raw detail/create/update RPC row field names from PostgreSQL. */
export type RespondentDetailRpcRow = RespondentListRpcRow & {
  notes: unknown;
};

/** Alias used by shared detail mapping. */
export type RespondentRpcRow = RespondentDetailRpcRow;
