import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildCreateProjectRpcArgs,
  buildListProjectsRpcArgs,
  buildTransitionProjectStatusRpcArgs,
  buildUpdateProjectRpcArgs,
} from "./input";
import { mapProjectRpcError } from "./errors";
import {
  mapProjectDetailRpcRow,
  mapProjectDetailRpcRows,
  mapProjectListRpcRows,
} from "./map-row";
import type {
  CreateProjectInput,
  ProjectDetail,
  ProjectListParams,
  ProjectResult,
  ProjectsListResult,
  TransitionProjectStatusInput,
  UpdateProjectInput,
} from "./types";

function mapSingleDetail(data: unknown): ProjectResult<ProjectDetail> {
  const rows = mapProjectDetailRpcRows(data);
  if (rows === null) {
    return { ok: false, code: "unexpected_project_error" };
  }
  if (rows.length === 1) {
    return { ok: true, data: rows[0] };
  }
  if (rows.length === 0) {
    const one = mapProjectDetailRpcRow(
      Array.isArray(data) ? data[0] : data
    );
    if (!one) {
      return { ok: false, code: "unexpected_project_error" };
    }
    return { ok: true, data: one };
  }
  return { ok: false, code: "unexpected_project_error" };
}

/**
 * Lists projects for the authenticated account via list_projects RPC only.
 * No direct table SELECT. Ordering is RPC-authoritative.
 */
export async function listProjects(
  supabase: SupabaseClient,
  params: ProjectListParams
): Promise<ProjectResult<ProjectsListResult>> {
  const args = buildListProjectsRpcArgs(params);
  const { data, error } = await supabase.rpc("list_projects", args);

  if (error) {
    return { ok: false, code: mapProjectRpcError(error) };
  }

  const projects = mapProjectListRpcRows(data);
  if (projects === null) {
    return { ok: false, code: "unexpected_project_error" };
  }

  return { ok: true, data: { projects } };
}

/**
 * Loads one active project via get_project RPC only.
 */
export async function getProject(
  supabase: SupabaseClient,
  projectId: string
): Promise<ProjectResult<ProjectDetail>> {
  const { data, error } = await supabase.rpc("get_project", {
    p_project_id: projectId,
  });

  if (error) {
    return { ok: false, code: mapProjectRpcError(error) };
  }

  const rows = mapProjectDetailRpcRows(data);
  if (rows === null) {
    return { ok: false, code: "unexpected_project_error" };
  }
  if (rows.length === 0) {
    return { ok: false, code: "project_not_found" };
  }
  if (rows.length !== 1) {
    return { ok: false, code: "unexpected_project_error" };
  }

  return { ok: true, data: rows[0] };
}

/**
 * Creates a project via create_project RPC only.
 * Never inserts into public.projects from the application.
 * Never passes status, account_id, or audit fields.
 */
export async function createProject(
  supabase: SupabaseClient,
  input: CreateProjectInput
): Promise<ProjectResult<ProjectDetail>> {
  const args = buildCreateProjectRpcArgs(input);
  const { data, error } = await supabase.rpc("create_project", args);

  if (error) {
    return { ok: false, code: mapProjectRpcError(error) };
  }

  return mapSingleDetail(data);
}

/**
 * Updates a project via update_project RPC only.
 * Preserves required p_expected_updated_at. Never updates status.
 * Never updates public.projects from the application. No stale-retry.
 */
export async function updateProject(
  supabase: SupabaseClient,
  input: UpdateProjectInput
): Promise<ProjectResult<ProjectDetail>> {
  const args = buildUpdateProjectRpcArgs(input);
  const { data, error } = await supabase.rpc("update_project", args);

  if (error) {
    return { ok: false, code: mapProjectRpcError(error) };
  }

  return mapSingleDetail(data);
}

/**
 * Transitions project lifecycle status via transition_project_status only.
 * Role enforcement remains at the database (Owner-only) and later UI layers.
 * Never invents Support Helper transition authority.
 */
export async function transitionProjectStatus(
  supabase: SupabaseClient,
  input: TransitionProjectStatusInput
): Promise<ProjectResult<ProjectDetail>> {
  const args = buildTransitionProjectStatusRpcArgs(input);
  const { data, error } = await supabase.rpc(
    "transition_project_status",
    args
  );

  if (error) {
    return { ok: false, code: mapProjectRpcError(error) };
  }

  return mapSingleDetail(data);
}
