"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAppSession } from "@/lib/auth/session";
import {
  editCompanySuccessRedirectPath,
  editCompanySuccessRevalidatePaths,
  mapEditCompanyErrorPresentation,
  readEditCompanyFormValues,
  type EditCompanyActionState,
} from "@/lib/companies/edit-form";
import { parseUpdateCompanyInput } from "@/lib/companies/input";
import { updateCompany } from "@/lib/companies/rpc";
import { createClient } from "@/lib/supabase/server";

/**
 * Updates a company via update_company RPC only.
 * Requires hidden company_id + expected_updated_at from loaded record.
 * On success: revalidate list/detail/edit and redirect to detail.
 */
export async function updateCompanyAction(
  _prevState: EditCompanyActionState,
  formData: FormData
): Promise<EditCompanyActionState> {
  await requireAppSession();

  const values = readEditCompanyFormValues(formData);

  const parsed = parseUpdateCompanyInput({
    companyId: values.companyId,
    expectedUpdatedAt: values.expectedUpdatedAt,
    name: values.name,
    contactPerson: values.contactPerson,
    phone: values.phone,
    notes: values.notes,
  });

  if (!parsed.ok) {
    return mapEditCompanyErrorPresentation(parsed.code, values);
  }

  const supabase = await createClient();
  const updated = await updateCompany(supabase, parsed.data);

  if (!updated.ok) {
    return mapEditCompanyErrorPresentation(updated.code, values);
  }

  const companyId = updated.data.companyId;
  for (const path of editCompanySuccessRevalidatePaths(companyId)) {
    revalidatePath(path);
  }
  redirect(editCompanySuccessRedirectPath(companyId));
}
