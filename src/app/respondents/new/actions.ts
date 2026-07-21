"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAppSession } from "@/lib/auth/session";
import {
  CREATE_RESPONDENT_SUCCESS_REDIRECT_PATH,
  CREATE_RESPONDENT_SUCCESS_REVALIDATE_PATH,
  formValuesToCreateInputRaw,
  mapCreateRespondentErrorPresentation,
  readCreateRespondentFormValues,
  withCreateRespondentFormRevision,
  type CreateRespondentActionState,
} from "@/lib/respondents/create-form";
import { parseCreateRespondentInput } from "@/lib/respondents/input";
import { createRespondent } from "@/lib/respondents/rpc";
import { createClient } from "@/lib/supabase/server";
import { successRedirectPath } from "@/lib/ui/success-notice";

/**
 * Creates a respondent via create_respondent RPC only.
 * Session gate + authenticated client; DB remains authorization authority.
 * Never submits internal ids or normalized mobile.
 * On success: revalidate list and redirect to /respondents.
 * On validation/RPC error: return all submitted values with a bumped revision
 * so the client form remounts and preserves every field.
 * Does not log form contents.
 */
export async function createRespondentAction(
  prevState: CreateRespondentActionState,
  formData: FormData
): Promise<CreateRespondentActionState> {
  await requireAppSession();

  const read = readCreateRespondentFormValues(formData);
  if (!read.ok) {
    return withCreateRespondentFormRevision(
      mapCreateRespondentErrorPresentation(read.code, read.values),
      prevState
    );
  }

  const values = read.values;
  const rawMapped = formValuesToCreateInputRaw(values);

  if (!rawMapped.ok) {
    return withCreateRespondentFormRevision(
      mapCreateRespondentErrorPresentation(rawMapped.code, values),
      prevState
    );
  }

  const parsed = parseCreateRespondentInput(rawMapped.data);
  if (!parsed.ok) {
    return withCreateRespondentFormRevision(
      mapCreateRespondentErrorPresentation(parsed.code, values),
      prevState
    );
  }

  const supabase = await createClient();
  const created = await createRespondent(supabase, parsed.data);

  if (!created.ok) {
    return withCreateRespondentFormRevision(
      mapCreateRespondentErrorPresentation(created.code, values),
      prevState
    );
  }

  // Success navigates to list — id unused for navigation.
  void created.data.respondentId;

  revalidatePath(CREATE_RESPONDENT_SUCCESS_REVALIDATE_PATH);
  redirect(successRedirectPath(CREATE_RESPONDENT_SUCCESS_REDIRECT_PATH, "respondent_created"));
}
