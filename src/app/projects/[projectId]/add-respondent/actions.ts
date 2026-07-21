"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAppSession } from "@/lib/auth/session";
import { participationErrorMessage } from "@/lib/participations/copy";
import {
  checkRespondentAssignmentWarnings,
  createParticipation,
} from "@/lib/participations/rpc";

import { createClient } from "@/lib/supabase/server";
import { successRedirectPath } from "@/lib/ui/success-notice";

import {
  type AssignmentWarningActionState,
  type CreateParticipationActionState,
} from "./state";

function formValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function checkAssignmentWarningsAction(
  _previousState: AssignmentWarningActionState,
  formData: FormData
): Promise<AssignmentWarningActionState> {
  await requireAppSession();
  const projectId = formValue(formData, "project_id");
  const respondentId = formValue(formData, "respondent_id");
  const result = await checkRespondentAssignmentWarnings(
    await createClient(),
    { projectId, respondentId }
  );
  if (!result.ok) {
    return {
      status: "error",
      respondentId: null,
      warning: null,
      formError: participationErrorMessage(result.code),
    };
  }
  return { status: "ready", respondentId, warning: result.data, formError: null };
}

export async function createParticipationAction(
  _previousState: CreateParticipationActionState,
  formData: FormData
): Promise<CreateParticipationActionState> {
  await requireAppSession();
  const projectId = formValue(formData, "project_id");
  const respondentId = formValue(formData, "respondent_id");
  
  const warningsResult = await checkRespondentAssignmentWarnings(
    await createClient(),
    { projectId, respondentId }
  );
  if (!warningsResult.ok) {
    return { status: "error", formError: participationErrorMessage(warningsResult.code) };
  }

  const result = await createParticipation(await createClient(), {
    projectId,
    respondentId,
  });
  if (!result.ok) {
    return { status: "error", formError: participationErrorMessage(result.code) };
  }
  revalidatePath(`/projects/${projectId}`);
  redirect(successRedirectPath(`/projects/${projectId}`, "participant_assigned"));
}
