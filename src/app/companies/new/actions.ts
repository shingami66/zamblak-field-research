"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAppSession } from "@/lib/auth/session";
import {
  mapCreateCompanyErrorPresentation,
  readCreateCompanyFormValues,
  type CreateCompanyActionState,
} from "@/lib/companies/create-form";
import { parseCreateCompanyInput } from "@/lib/companies/input";
import { createCompany } from "@/lib/companies/rpc";
import { createClient } from "@/lib/supabase/server";

/**
 * Creates a company via create_company RPC only.
 * Session gate + authenticated client; DB remains authorization authority.
 * Does not log personal form contents.
 */
export async function createCompanyAction(
  _prevState: CreateCompanyActionState,
  formData: FormData
): Promise<CreateCompanyActionState> {
  await requireAppSession();

  const values = readCreateCompanyFormValues(formData);

  const parsed = parseCreateCompanyInput({
    name: values.name,
    contactPerson: values.contactPerson,
    phone: values.phone,
    notes: values.notes,
  });

  if (!parsed.ok) {
    return mapCreateCompanyErrorPresentation(parsed.code, values);
  }

  const supabase = await createClient();
  const created = await createCompany(supabase, parsed.data);

  if (!created.ok) {
    return mapCreateCompanyErrorPresentation(created.code, values);
  }

  revalidatePath("/companies");
  redirect(`/companies/${created.data.companyId}`);
}
