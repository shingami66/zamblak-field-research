import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isDashboardRole,
  type DashboardRole,
} from "@/lib/auth/dashboard-role";

/** Stable failure codes from public.resolve_current_profile() (P0001 message tokens). */
export type ProfileFailureCode =
  | "auth_required"
  | "profile_not_found"
  | "profile_ambiguous"
  | "profile_deleted"
  | "profile_inactive"
  | "profile_invalid_role"
  | "account_deleted"
  | "profile_unavailable";

export type AppProfile = {
  profileId: string;
  accountId: string;
  role: DashboardRole;
  name: string;
  active: true;
};

type ResolveSuccess = { ok: true; profile: AppProfile };
type ResolveFailure = { ok: false; code: ProfileFailureCode };
export type ResolveProfileResult = ResolveSuccess | ResolveFailure;

const FAILURE_TOKENS: readonly Exclude<
  ProfileFailureCode,
  "profile_unavailable"
>[] = [
  "auth_required",
  "profile_not_found",
  "profile_ambiguous",
  "profile_deleted",
  "profile_inactive",
  "profile_invalid_role",
  "account_deleted",
] as const;

type RpcRow = {
  profile_id: string;
  account_id: string;
  role: string;
  name: string;
  active: boolean;
};

/**
 * Maps PostgREST / Postgres exception text to stable profile failure codes.
 * Never returns raw database messages to the UI.
 */
export function mapProfileErrorMessage(message: string | undefined): ProfileFailureCode {
  if (!message) {
    return "profile_unavailable";
  }

  const normalized = message.toLowerCase();
  for (const token of FAILURE_TOKENS) {
    if (normalized.includes(token)) {
      return token;
    }
  }

  return "profile_unavailable";
}

/**
 * Resolves the signed-in user's active profile via SECURITY DEFINER RPC.
 * Identity is bound server-side to auth.uid(); no browser profile/account/role input.
 */
export async function resolveCurrentProfile(
  supabase: SupabaseClient
): Promise<ResolveProfileResult> {
  const { data, error } = await supabase.rpc("resolve_current_profile");

  if (error) {
    return { ok: false, code: mapProfileErrorMessage(error.message) };
  }

  const rows = normalizeRpcRows(data);
  if (rows.length !== 1) {
    return { ok: false, code: "profile_unavailable" };
  }

  const row = rows[0];
  if (
    !row.profile_id ||
    !row.account_id ||
    !row.name ||
    row.active !== true ||
    !isDashboardRole(row.role)
  ) {
    return { ok: false, code: "profile_invalid_role" };
  }

  return {
    ok: true,
    profile: {
      profileId: row.profile_id,
      accountId: row.account_id,
      role: row.role,
      name: row.name,
      active: true,
    },
  };
}

function normalizeRpcRows(data: unknown): RpcRow[] {
  if (!data) {
    return [];
  }
  if (Array.isArray(data)) {
    return data as RpcRow[];
  }
  if (typeof data === "object") {
    return [data as RpcRow];
  }
  return [];
}
