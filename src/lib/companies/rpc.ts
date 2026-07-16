import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildCreateCompanyRpcArgs,
  buildListCompaniesRpcArgs,
  buildUpdateCompanyRpcArgs,
} from "./input";
import { mapCompanyRpcError } from "./errors";
import { mapCompanyRpcRow, mapCompanyRpcRows } from "./map-row";
import type {
  CompaniesListResult,
  CompanyDetail,
  CompanyListParams,
  CompanyResult,
  CreateCompanyInput,
  UpdateCompanyInput,
} from "./types";

/**
 * Lists companies for the authenticated account via list_companies RPC only.
 * No direct table SELECT. Ordering is RPC-authoritative.
 */
export async function listCompanies(
  supabase: SupabaseClient,
  params: CompanyListParams
): Promise<CompanyResult<CompaniesListResult>> {
  const args = buildListCompaniesRpcArgs(params);
  const { data, error } = await supabase.rpc("list_companies", args);

  if (error) {
    return { ok: false, code: mapCompanyRpcError(error) };
  }

  const companies = mapCompanyRpcRows(data);
  if (companies === null) {
    return { ok: false, code: "unexpected_company_error" };
  }

  return { ok: true, data: { companies } };
}

/**
 * Loads one active company via get_company RPC only.
 */
export async function getCompany(
  supabase: SupabaseClient,
  companyId: string
): Promise<CompanyResult<CompanyDetail>> {
  const { data, error } = await supabase.rpc("get_company", {
    p_company_id: companyId,
  });

  if (error) {
    return { ok: false, code: mapCompanyRpcError(error) };
  }

  const rows = mapCompanyRpcRows(data);
  if (rows === null) {
    return { ok: false, code: "unexpected_company_error" };
  }
  if (rows.length === 0) {
    return { ok: false, code: "company_not_found" };
  }
  if (rows.length !== 1) {
    return { ok: false, code: "unexpected_company_error" };
  }

  return { ok: true, data: rows[0] };
}

/**
 * Creates a company via create_company RPC only.
 * Never inserts into public.companies from the application.
 */
export async function createCompany(
  supabase: SupabaseClient,
  input: CreateCompanyInput
): Promise<CompanyResult<CompanyDetail>> {
  const args = buildCreateCompanyRpcArgs(input);
  const { data, error } = await supabase.rpc("create_company", args);

  if (error) {
    return { ok: false, code: mapCompanyRpcError(error) };
  }

  const rows = mapCompanyRpcRows(data);
  if (rows === null || rows.length !== 1) {
    // Single-object return paths
    const one = mapCompanyRpcRow(
      Array.isArray(data) ? data[0] : data
    );
    if (!one) {
      return { ok: false, code: "unexpected_company_error" };
    }
    return { ok: true, data: one };
  }

  return { ok: true, data: rows[0] };
}

/**
 * Updates a company via update_company RPC only.
 * Preserves corrected parameter mapping including required p_expected_updated_at.
 * Never updates public.companies from the application. No stale-retry.
 */
export async function updateCompany(
  supabase: SupabaseClient,
  input: UpdateCompanyInput
): Promise<CompanyResult<CompanyDetail>> {
  const args = buildUpdateCompanyRpcArgs(input);
  const { data, error } = await supabase.rpc("update_company", args);

  if (error) {
    return { ok: false, code: mapCompanyRpcError(error) };
  }

  const rows = mapCompanyRpcRows(data);
  if (rows === null || rows.length !== 1) {
    const one = mapCompanyRpcRow(
      Array.isArray(data) ? data[0] : data
    );
    if (!one) {
      return { ok: false, code: "unexpected_company_error" };
    }
    return { ok: true, data: one };
  }

  return { ok: true, data: rows[0] };
}
