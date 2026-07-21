import type { SupabaseClient } from "@supabase/supabase-js";
import { mapParticipationRpcError } from "./errors";
import {
  parseParticipationIds,
  parseParticipationListParams,
  type ParticipationIds,
  type ParticipationListParams,
} from "./input";
import {
  mapParticipationListRows,
  mapParticipationRow,
  mapParticipationWarningRow,
} from "./map-row";
import type {
  Participation,
  ParticipationListItem,
  ParticipationResult,
  ParticipationWarning,
} from "./types";

export async function checkRespondentAssignmentWarnings(
  supabase: SupabaseClient,
  input: ParticipationIds
): Promise<ParticipationResult<ParticipationWarning>> {
  const parsed = parseParticipationIds(input);
  if (!parsed.ok) return parsed;

  const { data, error } = await supabase.rpc(
    "check_respondent_three_month_warning",
    {
      p_project_id: parsed.data.projectId,
      p_respondent_id: parsed.data.respondentId,
    }
  );
  if (error) return { ok: false, code: mapParticipationRpcError(error) };
  if (!Array.isArray(data) || data.length !== 1) {
    return { ok: false, code: "unexpected_participation_error" };
  }
  const warning = mapParticipationWarningRow(data[0]);
  return warning
    ? { ok: true, data: warning }
    : { ok: false, code: "unexpected_participation_error" };
}

export async function createParticipation(
  supabase: SupabaseClient,
  input: ParticipationIds
): Promise<ParticipationResult<Participation>> {
  const parsed = parseParticipationIds(input);
  if (!parsed.ok) return parsed;

  const { data, error } = await supabase.rpc("create_participation", {
    p_project_id: parsed.data.projectId,
    p_respondent_id: parsed.data.respondentId,
  });
  if (error) return { ok: false, code: mapParticipationRpcError(error) };
  if (!Array.isArray(data) || data.length !== 1) {
    return { ok: false, code: "unexpected_participation_error" };
  }
  const participation = mapParticipationRow(data[0]);
  return participation
    ? { ok: true, data: participation }
    : { ok: false, code: "unexpected_participation_error" };
}

export async function listProjectParticipations(
  supabase: SupabaseClient,
  input: ParticipationListParams
): Promise<ParticipationResult<ParticipationListItem[]>> {
  const parsed = parseParticipationListParams(input);
  if (!parsed.ok) return parsed;

  const { data, error } = await supabase.rpc("list_project_participations", {
    p_project_id: parsed.data.projectId,
    p_search: parsed.data.search,
    p_limit: parsed.data.limit,
    p_offset: parsed.data.offset,
  });
  if (error) return { ok: false, code: mapParticipationRpcError(error) };
  const participations = mapParticipationListRows(data);
  return participations
    ? { ok: true, data: participations }
    : { ok: false, code: "unexpected_participation_error" };
}