"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOwnerSession } from "../route-state";
import { reviewResearchForm } from "@/lib/forms/rpc";
import { isValidUuid } from "@/lib/forms/input";
import { formsErrorMessage } from "@/lib/forms/copy";
import { successRedirectPath, type SuccessNoticeCode } from "@/lib/ui/success-notice";
import type { FormsErrorCode } from "@/lib/forms/types";

export type ReviewFormActionResult =
  | { ok: true; formId: string; decision: "accept" | "reject" | "cancel" }
  | { ok: false; code: string; message: string };

export async function reviewResearchFormAction(
  _prevState: ReviewFormActionResult | null,
  formData: FormData
): Promise<ReviewFormActionResult> {
  await requireOwnerSession();

  const rawFormId = formData.get("researchFormId");
  const rawDecision = formData.get("decision");
  const rawRejectionReason = formData.get("rejectionReason");
  const rawQuotaOverrideReason = formData.get("quotaOverrideReason");
  const rawNotes = formData.get("notes");

  const researchFormId = typeof rawFormId === "string" ? rawFormId.trim() : "";
  const decision = typeof rawDecision === "string" ? rawDecision.trim() : "";

  if (!isValidUuid(researchFormId)) {
    return {
      ok: false,
      code: "invalid_input",
      message: formsErrorMessage("invalid_input"),
    };
  }

  if (decision !== "accept" && decision !== "reject" && decision !== "cancel") {
    return {
      ok: false,
      code: "invalid_input",
      message: formsErrorMessage("invalid_input"),
    };
  }

  let rejectionReason: string | null = null;
  let quotaOverrideReason: string | null = null;
  let notes: string | null = null;

  if (typeof rawNotes === "string" && rawNotes.trim().length > 0) {
    notes = rawNotes.trim();
  }

  if (decision === "reject") {
    const trimmedReason = typeof rawRejectionReason === "string" ? rawRejectionReason.trim() : "";
    if (trimmedReason.length < 3) {
      return {
        ok: false,
        code: "rejection_reason_required",
        message: "الرجاء إدخال سبب واضح للرفض (3 حروف على الأقل).",
      };
    }
    rejectionReason = trimmedReason;
  }

  if (decision === "accept") {
    if (typeof rawQuotaOverrideReason === "string" && rawQuotaOverrideReason.trim().length > 0) {
      quotaOverrideReason = rawQuotaOverrideReason.trim();
    }
  }

  const supabase = await createClient();
  const idempotencyKey = `review-form-${decision}-${researchFormId}-${Date.now()}`;

  const res = await reviewResearchForm(supabase, {
    idempotencyKey,
    researchFormId,
    decision,
    quotaOverrideReason,
    rejectionReason,
    notes,
  });

  if (!res.ok) {
    return {
      ok: false,
      code: res.code,
      message: formsErrorMessage(res.code as FormsErrorCode),
    };
  }

  const successCode: SuccessNoticeCode =
    decision === "accept"
      ? "form_accepted"
      : decision === "reject"
      ? "form_rejected"
      : "form_cancelled";

  revalidatePath("/forms");
  revalidatePath(`/forms/${researchFormId}`);
  redirect(successRedirectPath(`/forms/${researchFormId}`, successCode));
}
