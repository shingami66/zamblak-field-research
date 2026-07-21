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
  withCreateProjectFormRevision,
  type CreateProjectActionState,
} from "@/lib/projects/create-form";
import { parseCreateProjectInput } from "@/lib/projects/input";
import { createProject } from "@/lib/projects/rpc";
import { createClient } from "@/lib/supabase/server";
import { successRedirectPath } from "@/lib/ui/success-notice";

/**
 * Creates a project via create_project RPC only.
 * Session gate + authenticated client; DB remains authorization authority.
 * Never submits status, account, or audit fields.
 * On success: revalidate list and redirect to /projects.
 * On validation/RPC error: return all submitted values with a bumped revision
 * so the client form remounts and preserves every field.
 */
export async function createProjectAction(
  prevState: CreateProjectActionState,
  formData: FormData
): Promise<CreateProjectActionState> {
  await requireAppSession();

  const values = readCreateProjectFormValues(formData);
  const rawMapped = formValuesToCreateInputRaw(values);

  if (!rawMapped.ok) {
    return withCreateProjectFormRevision(
      mapCreateProjectErrorPresentation(rawMapped.code, values),
      prevState
    );
  }

  const parsed = parseCreateProjectInput(rawMapped.data);
  if (!parsed.ok) {
    return withCreateProjectFormRevision(
      mapCreateProjectErrorPresentation(parsed.code, values),
      prevState
    );
  }

  const supabase = await createClient();
  const created = await createProject(supabase, parsed.data);

  if (!created.ok) {
    return withCreateProjectFormRevision(
      mapCreateProjectErrorPresentation(created.code, values),
      prevState
    );
  }

  // Success navigates to list — id unused for navigation.
  void created.data.projectId;

  revalidatePath(CREATE_PROJECT_SUCCESS_REVALIDATE_PATH);
  redirect(successRedirectPath(CREATE_PROJECT_SUCCESS_REDIRECT_PATH, "project_created"));
}
