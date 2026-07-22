import type { FormsErrorCode } from "./types";

export const FORMS_ERROR_MESSAGES: Record<FormsErrorCode, string> = {
  unauthorized: "جلسة العمل غير متاحة. يرجى تسجيل الدخول مجدداً.",
  forbidden: "عذراً، هذه العملية مخصصة لمالك الحساب فقط.",
  invalid_input: "البيانات المدخلة غير صحيحة أو ناقصة.",
  participation_not_eligible: "المشاركة المحددة غير متاحة لتقديم النماذج في هذا الحساب.",
  research_form_not_found: "نموذج البحث غير موجود في حسابك.",
  research_form_state_invalid: "حالة نموذج البحث الحالية لا تسمح بإجراء هذه العملية.",
  duplicate_accepted_form: "يوجد بالفعل نموذج مقبول للمشارك في هذا المشروع.",
  accepted_price_unavailable: "لم يتم تحديد السعر المتفق عليه أو الافتراضي لهذا النموذج.",
  quota_override_reason_required: "تم الوصول إلى الحد الأقصى للمشروع. يرجى تقديم سبب التجاوز.",
  accepted_form_has_active_allocations: "لا يمكن تعديل نموذج مقبول مرتبط بتخصيصات مالية نشطة.",
  correction_reason_required: "سبب التصحيح مطلوب (3 حروف على الأقل).",
  idempotency_key_invalid: "مفتاح التكرار غير صالح.",
  idempotency_request_conflict: "تم استخدام مفتاح التكرار مع بيانات طلب مختلفة.",
  idempotency_processing_conflict: "الطلب قيد المعالجة حالياً. يرجى الانتظار...",
  unexpected_forms_error: "حدث خطأ غير متوقع أثناء معالجة نموذج البحث. يرجى المحاولة لاحقاً.",
};

export function formsErrorMessage(code: FormsErrorCode): string {
  return FORMS_ERROR_MESSAGES[code] || FORMS_ERROR_MESSAGES.unexpected_forms_error;
}
