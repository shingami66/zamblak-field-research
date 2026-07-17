import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildCreateRespondentRpcArgs,
  buildListRespondentsRpcArgs,
  buildUpdateRespondentRpcArgs,
  parseCreateRespondentInput,
  parseListRespondentsInput,
  parseRespondentId,
  parseUpdateRespondentInput,
  type ListRespondentsInputRaw,
  type RespondentWriteInputRaw,
  type UpdateRespondentInputRaw,
} from "./input";
import { mapRespondentRpcError } from "./errors";
import {
  mapRespondentDetailRpcRows,
  mapRespondentListRpcRows,
  mapRespondentRpcRow,
} from "./map-row";
import type {
  CreateRespondentInput,
  RespondentDetail,
  RespondentListParams,
  RespondentResult,
  RespondentsListResult,
  UpdateRespondentInput,
} from "./types";

/**
 * Lists respondents for the authenticated account via list_respondents RPC only.
 * No direct table SELECT. Ordering is RPC-authoritative.
 */
export async function listRespondents(
  supabase: SupabaseClient,
  params: RespondentListParams | ListRespondentsInputRaw
): Promise<RespondentResult<RespondentsListResult>> {
  const validated = parseListRespondentsInput(params);
  if (!validated.ok) {
    return validated;
  }

  const args = buildListRespondentsRpcArgs(validated.data);
  const { data, error } = await supabase.rpc("list_respondents", args);

  if (error) {
    return { ok: false, code: mapRespondentRpcError(error) };
  }

  const respondents = mapRespondentListRpcRows(data);
  if (respondents === null) {
    return { ok: false, code: "unexpected_respondent_error" };
  }

  return { ok: true, data: { respondents } };
}

/**
 * Loads one active respondent via get_respondent RPC only.
 */
export async function getRespondent(
  supabase: SupabaseClient,
  respondentId: string
): Promise<RespondentResult<RespondentDetail>> {
  const idResult = parseRespondentId(respondentId);
  if (!idResult.ok) {
    return idResult;
  }

  const { data, error } = await supabase.rpc("get_respondent", {
    p_respondent_id: idResult.data,
  });

  if (error) {
    return { ok: false, code: mapRespondentRpcError(error) };
  }

  const rows = mapRespondentDetailRpcRows(data);
  if (rows === null) {
    return { ok: false, code: "unexpected_respondent_error" };
  }
  if (rows.length === 0) {
    return { ok: false, code: "respondent_not_found" };
  }
  if (rows.length !== 1) {
    return { ok: false, code: "unexpected_respondent_error" };
  }

  return { ok: true, data: rows[0] };
}

/**
 * Creates a respondent via create_respondent RPC only.
 * Never inserts into public.respondents from the application.
 */
export async function createRespondent(
  supabase: SupabaseClient,
  input: CreateRespondentInput | RespondentWriteInputRaw
): Promise<RespondentResult<RespondentDetail>> {
  const parsed = parseCreateRespondentInput(input);
  if (!parsed.ok) {
    return parsed;
  }

  const args = buildCreateRespondentRpcArgs(parsed.data);
  const { data, error } = await supabase.rpc("create_respondent", args);

  if (error) {
    return { ok: false, code: mapRespondentRpcError(error) };
  }

  const rows = mapRespondentDetailRpcRows(data);
  if (rows === null || rows.length !== 1) {
    const one = mapRespondentRpcRow(Array.isArray(data) ? data[0] : data);
    if (!one) {
      return { ok: false, code: "unexpected_respondent_error" };
    }
    return { ok: true, data: one };
  }

  return { ok: true, data: rows[0] };
}

/**
 * Updates a respondent via update_respondent RPC only.
 * Preserves required p_expected_updated_at optimistic concurrency mapping.
 * Never updates public.respondents from the application. No stale-retry.
 */
export async function updateRespondent(
  supabase: SupabaseClient,
  input: UpdateRespondentInput | UpdateRespondentInputRaw
): Promise<RespondentResult<RespondentDetail>> {
  const parsed = parseUpdateRespondentInput(input);
  if (!parsed.ok) {
    return parsed;
  }

  const args = buildUpdateRespondentRpcArgs(parsed.data);
  const { data, error } = await supabase.rpc("update_respondent", args);

  if (error) {
    return { ok: false, code: mapRespondentRpcError(error) };
  }

  const rows = mapRespondentDetailRpcRows(data);
  if (rows === null || rows.length !== 1) {
    const one = mapRespondentRpcRow(Array.isArray(data) ? data[0] : data);
    if (!one) {
      return { ok: false, code: "unexpected_respondent_error" };
    }
    return { ok: true, data: one };
  }

  return { ok: true, data: rows[0] };
}
