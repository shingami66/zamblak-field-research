"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAppSession } from "@/lib/auth/session";
import {
  editRespondentSuccessRedirectPath,
  editRespondentSuccessRevalidatePaths,
  formValuesToUpdateInputRaw,
  mapEditRespondentErrorPresentation,
  readEditRespondentFormValues,
  withEditRespondentFormRevision,
  type EditRespondentActionState,
  type UpdateRespondentActionContext,
} from "@/lib/respondents/edit-form";
import { parseUpdateRespondentInput } from "@/lib/respondents/input";
import { updateRespondent } from "@/lib/respondents/rpc";
import { createClient } from "@/lib/supabase/server";

/**
 * Updates a respondent via update_respondent RPC only.
 * respondentId and expectedUpdatedAt come only from server-bound context.
 * Never retries stale versions. Does not log form contents.
 */
export async function updateRespondentAction(
  context: UpdateRespondentActionContext,
  prevState: EditRespondentActionState,
  formData: FormData
): Promise<EditRespondentActionState> {
  await requireAppSession();

  const read = readEditRespondentFormValues(formData);
  if (!read.ok) {
    return withEditRespondentFormRevision(
      mapEditRespondentErrorPresentation(read.code, read.values),
      prevState
    );
  }

  const values = read.values;
  const mapped = formValuesToUpdateInputRaw(context, values);
  if (!mapped.ok) {
    return withEditRespondentFormRevision(
      mapEditRespondentErrorPresentation(mapped.code, values),
      prevState
    );
  }

  const parsed = parseUpdateRespondentInput(mapped.data);
  if (!parsed.ok) {
    return withEditRespondentFormRevision(
      mapEditRespondentErrorPresentation(parsed.code, values),
      prevState
    );
  }

  const supabase = await createClient();
  const updated = await updateRespondent(supabase, parsed.data);

  if (!updated.ok) {
    return withEditRespondentFormRevision(
      mapEditRespondentErrorPresentation(updated.code, values),
      prevState
    );
  }

  const respondentId = updated.data.respondentId;
  editRespondentSuccessRevalidatePaths(respondentId).forEach((path) => {
    revalidatePath(path);
  });
  redirect(editRespondentSuccessRedirectPath(respondentId));
}
