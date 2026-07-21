"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAppSession } from "@/lib/auth/session";
import {
  editProjectSuccessRedirectPath,
  editProjectSuccessRevalidatePaths,
  formValuesToUpdateInputRaw,
  isCompanyLockedStatus,
  isEditableProjectStatus,
  mapEditProjectErrorPresentation,
  readEditProjectFormValues,
  type EditProjectActionState,
} from "@/lib/projects/edit-form";
import { parseUpdateProjectInput } from "@/lib/projects/input";
import { getProject, updateProject } from "@/lib/projects/rpc";
import { createClient } from "@/lib/supabase/server";
import { successRedirectPath } from "@/lib/ui/success-notice";

/**
 * Updates a project via update_project RPC only.
 * Never submits status, account, or audit fields.
 * Active Projects must keep companyId fixed; expectedUpdatedAt is never generated.
 */
export async function updateProjectAction(
  _prevState: EditProjectActionState,
  formData: FormData
): Promise<EditProjectActionState> {
  await requireAppSession();

  const values = readEditProjectFormValues(formData);
  const mapped = formValuesToUpdateInputRaw(values);

  if (!mapped.ok) {
    return mapEditProjectErrorPresentation(mapped.code, values);
  }

  const supabase = await createClient();

  // Load current Project for editability and active Company lock (DB still authoritative).
  const current = await getProject(supabase, mapped.data.projectId);
  if (!current.ok) {
    return mapEditProjectErrorPresentation(current.code, values);
  }

  if (!isEditableProjectStatus(current.data.status)) {
    return mapEditProjectErrorPresentation("project_not_editable", values);
  }

  let companyId = mapped.data.companyId;
  if (isCompanyLockedStatus(current.data.status)) {
    if (
      typeof companyId === "string" &&
      companyId !== "" &&
      companyId !== current.data.companyId
    ) {
      return mapEditProjectErrorPresentation("project_company_locked", values);
    }
    companyId = current.data.companyId;
  }

  const parsed = parseUpdateProjectInput({
    projectId: mapped.data.projectId,
    expectedUpdatedAt: mapped.data.expectedUpdatedAt,
    name: mapped.data.name,
    companyId,
    domain: mapped.data.domain,
    startDate: mapped.data.startDate,
    endDate: mapped.data.endDate,
    quota: mapped.data.quota,
    minAge: mapped.data.minAge,
    maxAge: mapped.data.maxAge,
    requiredResidentType: mapped.data.requiredResidentType,
    eligibilityNotes: mapped.data.eligibilityNotes,
    requiresThreeMonthWarning: mapped.data.requiresThreeMonthWarning,
    whatsappTemplateAr: mapped.data.whatsappTemplateAr,
    whatsappTemplateEn: mapped.data.whatsappTemplateEn,
    notes: mapped.data.notes,
  });

  if (!parsed.ok) {
    return mapEditProjectErrorPresentation(parsed.code, values);
  }

  // Preserve exact expectedUpdatedAt from form (loaded detail), not browser clock.
  const updated = await updateProject(supabase, parsed.data);

  if (!updated.ok) {
    return mapEditProjectErrorPresentation(updated.code, {
      ...values,
      companyId: parsed.data.companyId,
    });
  }

  const projectId = updated.data.projectId;
  for (const path of editProjectSuccessRevalidatePaths(projectId)) {
    revalidatePath(path);
  }
  redirect(successRedirectPath(editProjectSuccessRedirectPath(projectId), "project_updated"));
}
