"use server";

import { createClient } from "@/lib/supabase/server";
import { requireOwnerSession } from "../route-state";
import { submitResearchForm } from "@/lib/forms/rpc";
import { isValidIsoDate, isValidUuid } from "@/lib/forms/input";

export type CreateFormActionResult =
  | { ok: true; formId: string }
  | { ok: false; code: string; message: string };

export async function createResearchFormAction(formData: {
  participationId: string;
  submittedDate: string;
  notes?: string | null;
}): Promise<CreateFormActionResult> {
  await requireOwnerSession();

  const { participationId, submittedDate, notes } = formData;

  if (!isValidUuid(participationId)) {
    return {
      ok: false,
      code: "invalid_input",
      message: "بيانات المشارك غير صالحة.",
    };
  }

  if (!isValidIsoDate(submittedDate)) {
    return {
      ok: false,
      code: "invalid_input",
      message: "تاريخ المقابلة غير صالح.",
    };
  }

  const supabase = await createClient();
  const idempotencyKey = `submit-form-${participationId}-${Date.now()}`;

  const res = await submitResearchForm(supabase, {
    idempotencyKey,
    participationId,
    submittedDate,
    notes: notes && notes.trim() ? notes.trim() : null,
  });

  if (!res.ok) {
    if (
      res.code === "duplicate_participation" ||
      res.code === "duplicate_accepted_form"
    ) {
      return {
        ok: false,
        code: "duplicate_form",
        message: "تم تسجيل استمارة لهذا المشارك في المشروع بالفعل. حدّث الصفحة لعرضها.",
      };
    }
    if (res.code === "research_form_state_invalid") {
      return {
        ok: false,
        code: "project_not_eligible",
        message: "تعذر تسجيل الاستمارة لأن المشروع لم يعد متاحاً لإضافة استمارات جديدة.",
      };
    }
    if (res.code === "participation_not_eligible") {
      return {
        ok: false,
        code: "participant_not_assigned",
        message: "هذا المشارك غير مسجل في المشروع المحدد.",
      };
    }
    return {
      ok: false,
      code: "generic_failure",
      message: "تعذر تسجيل الاستمارة حالياً. حاول مرة أخرى.",
    };
  }

  return {
    ok: true,
    formId: res.data.research_form_id,
  };
}
