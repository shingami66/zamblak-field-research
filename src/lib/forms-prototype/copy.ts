import type {
  CollectionMethod,
  CollectionState,
  ResearchFormStatus,
} from "./types";

/**
 * Arabic user-facing copy for the Owner-only forms/collections prototype.
 * Centralised so pages never hardcode raw technical states.
 */

export const FORM_STATUS_LABELS: Record<ResearchFormStatus, string> = {
  pending_review: "قيد المراجعة",
  accepted: "مقبولة",
  rejected: "مرفوضة",
  cancelled: "ملغاة",
};

export const COLLECTION_STATE_LABELS: Record<CollectionState, string> = {
  uncollected: "غير محصلة",
  partially_collected: "محصلة جزئياً",
  collected: "محصلة",
};

export const COLLECTION_METHOD_LABELS: Record<CollectionMethod, string> = {
  bank_transfer: "تحويل بنكي",
  cash: "نقداً",
  cheque: "شيك",
};

export const PROJECT_STATUS_LABELS: Record<"active" | "ended", string> = {
  active: "نشط",
  ended: "منتهٍ",
};

/** Stable prototype validation/error codes mapped to Arabic messages. */
export type PrototypeErrorCode =
  | "form_project_required"
  | "form_participant_required"
  | "form_participation_missing"
  | "form_duplicate_accepted"
  | "form_reject_reason_required"
  | "form_not_pending"
  | "collection_company_required"
  | "collection_total_positive"
  | "collection_date_required"
  | "collection_method_required"
  | "allocation_amount_positive"
  | "allocation_form_not_accepted"
  | "allocation_cross_company"
  | "allocation_exceeds_form_outstanding"
  | "allocation_exceeds_collection_total"
  | "allocation_duplicate_form";

export const PROTOTYPE_ERROR_MESSAGES: Record<PrototypeErrorCode, string> = {
  form_project_required: "اختر المشروع أولاً.",
  form_participant_required: "اختر المشارك أولاً.",
  form_participation_missing:
    "هذا المشارك غير مضاف إلى قائمة مشاركي هذا المشروع في البيانات التجريبية.",
  form_duplicate_accepted:
    "يوجد استمارة مقبولة لهذا المشارك في هذا المشروع مسبقاً؛ لا يمكن قبول استمارة أخرى.",
  form_reject_reason_required: "الرجاء إدخال سبب واضح للرفض.",
  form_not_pending: "لا يمكن تغيير حالة استمارة اكتملت مراجعتها.",
  collection_company_required: "اختر الشركة أولاً.",
  collection_total_positive: "أدخل مبلغ تحصيل أكبر من صفر.",
  collection_date_required: "أدخل تاريخ التحصيل.",
  collection_method_required: "اختر طريقة الدفع.",
  allocation_amount_positive: "أدخل مبلغ توزيع أكبر من صفر.",
  allocation_form_not_accepted: "لا يمكن توزيع مبلغ إلا على استمارة مقبولة.",
  allocation_cross_company:
    "لا يمكن ربط التحصيل باستمارة تخص شركة مختلفة عن شركة التحصيل.",
  allocation_exceeds_form_outstanding:
    "المبلغ الموزّع يتجاوز المتبقي على هذه الاستمارة.",
  allocation_exceeds_collection_total:
    "مجموع المبالغ الموزّعة يتجاوز إجمالي التحصيل.",
  allocation_duplicate_form: "تم توزيع مبلغ على هذه الاستمارة أكثر من مرة.",
};

export function prototypeErrorMessage(code: PrototypeErrorCode): string {
  return PROTOTYPE_ERROR_MESSAGES[code];
}

/** Shared DEV/DEMO notice text shown on every prototype surface. */
export const DEV_DEMO_NOTICE =
  "بيانات تجريبية للعرض فقط: هذه الوحدة نموذج أولي في المتصفح ولا تُحفظ في قاعدة البيانات ولا تؤثر على السجلات الفعلية.";

export const RESET_LABEL = "إعادة ضبط البيانات التجريبية";
export const RESET_CONFIRM_TITLE = "تأكيد إعادة الضبط";
export const RESET_CONFIRM_BODY =
  "سيتم استرجاع البيانات التجريبية الأولية فقط. لن يتأثر أي سجل فعلي. هل تريد المتابعة؟";
export const RESET_CONFIRM_ACTION = "نعم، إعادة الضبط";
export const CANCEL_LABEL = "إلغاء";
