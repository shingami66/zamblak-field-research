"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAppSession } from "@/lib/auth/session";
import {
  CREATE_PROJECT_SUCCESS_REDIRECT_PATH,
  CREATE_PROJECT_SUCCESS_REVALIDATE_PATH,
  formValuesToCreateInputRaw,
  mapCreateProjectErrorPresentation,
  readCreateProjectFormValues,
  type CreateProjectActionState,
} from "@/lib/projects/create-form";
import { parseCreateProjectInput } from "@/lib/projects/input";
import { createProject } from "@/lib/projects/rpc";
import { createClient } from "@/lib/supabase/server";

/**
 * Creates a project via create_project RPC only.
 * Session gate + authenticated client; DB remains authorization authority.
 * Never submits status, account, or audit fields.
 * On success: revalidate list and redirect to /projects (detail not implemented).
 */
export async function createProjectAction(
  _prevState: CreateProjectActionState,
  formData: FormData
): Promise<CreateProjectActionState> {
  await requireAppSession();

  const values = readCreateProjectFormValues(formData);
  const rawMapped = formValuesToCreateInputRaw(values);

  if (!rawMapped.ok) {
    return mapCreateProjectErrorPresentation(rawMapped.code, values);
  }

  const parsed = parseCreateProjectInput(rawMapped.data);
  if (!parsed.ok) {
    return mapCreateProjectErrorPresentation(parsed.code, values);
  }

  const supabase = await createClient();
  const created = await createProject(supabase, parsed.data);

  if (!created.ok) {
    return mapCreateProjectErrorPresentation(created.code, values);
  }

  // Detail route not implemented — id unused for navigation.
  void created.data.projectId;

  revalidatePath(CREATE_PROJECT_SUCCESS_REVALIDATE_PATH);
  redirect(CREATE_PROJECT_SUCCESS_REDIRECT_PATH);
}
