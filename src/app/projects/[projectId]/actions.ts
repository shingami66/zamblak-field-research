"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAppSession } from "@/lib/auth/session";
import {
  EMPTY_TRANSITION_PROJECT_STATE,
  isProjectStatusValue,
  mapTransitionProjectErrorPresentation,
  readTransitionFormFields,
  transitionOwnerDeniedState,
  type TransitionProjectActionState,
} from "@/lib/projects/detail-transition";
import { isAllowedProjectStatusTransition } from "@/lib/projects/lifecycle";
import { parseTransitionProjectStatusInput } from "@/lib/projects/input";
import { getProject, transitionProjectStatus } from "@/lib/projects/rpc";
import { createClient } from "@/lib/supabase/server";

/**
 * Owner-only lifecycle transition via transition_project_status RPC.
 * expectedUpdatedAt must come from the loaded detail (form hidden field).
 * Support Helper is denied at the application layer; DB remains authoritative.
 */
export async function transitionProjectStatusAction(
  _prevState: TransitionProjectActionState,
  formData: FormData
): Promise<TransitionProjectActionState> {
  const session = await requireAppSession();

  if (session.profile.role !== "owner") {
    return transitionOwnerDeniedState();
  }

  const fields = readTransitionFormFields(formData);

  const parsed = parseTransitionProjectStatusInput({
    projectId: fields.projectId,
    expectedUpdatedAt: fields.expectedUpdatedAt,
    targetStatus: fields.targetStatus,
  });

  if (!parsed.ok) {
    return mapTransitionProjectErrorPresentation(parsed.code);
  }

  const supabase = await createClient();

  // Load current status to apply structural UI edge check before RPC.
  const current = await getProject(supabase, parsed.data.projectId);
  if (!current.ok) {
    return mapTransitionProjectErrorPresentation(current.code);
  }

  if (
    !isProjectStatusValue(parsed.data.targetStatus) ||
    !isAllowedProjectStatusTransition(
      current.data.status,
      parsed.data.targetStatus
    )
  ) {
    return mapTransitionProjectErrorPresentation(
      "invalid_project_status_transition"
    );
  }

  // Preserve expectedUpdatedAt from form (detail load), not browser clock.
  const transitioned = await transitionProjectStatus(supabase, {
    projectId: parsed.data.projectId,
    expectedUpdatedAt: parsed.data.expectedUpdatedAt,
    targetStatus: parsed.data.targetStatus,
  });

  if (!transitioned.ok) {
    return mapTransitionProjectErrorPresentation(transitioned.code);
  }

  const path = `/projects/${parsed.data.projectId}`;
  revalidatePath(path);
  revalidatePath("/projects");
  redirect(path);

  // Unreachable; satisfies return type for TypeScript.
  return EMPTY_TRANSITION_PROJECT_STATE;
}
