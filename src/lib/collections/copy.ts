import type { CollectionsErrorCode } from "./types";

export const COLLECTIONS_ERROR_MESSAGES: Record<CollectionsErrorCode, string> = {
  unauthorized: "جلسة العمل غير متاحة. يرجى تسجيل الدخول مجدداً.",
  forbidden: "عذراً، هذه العملية مخصصة لمالك الحساب فقط.",
  invalid_input: "البيانات المدخلة غير صحيحة أو ناقصة.",
  parent_not_found: "الشركة المحددة غير موجودة في حسابك.",
  collection_not_found: "إيصال التحصيل غير موجود في حسابك.",
  collection_not_active: "إيصال التحصيل غير نشط أو تم إلغاؤه بالفعل.",
  collection_amount_invalid: "مبلغ التحصيل يجب أن يكون رصيداً موجباً أكبر من صفر.",
  allocation_total_exceeds_collection: "إجمالي المبالغ المخصصة يتجاوز القيمة الإجمالية للإيصال.",
  allocation_target_invalid: "نموذج البحث المستهدف غير صالح، غير مقبول، أو لا يتبع للشركة.",
  allocation_exceeds_form_balance: "المبلغ المخصص يتجاوز المتبقي المستحق لنموذج البحث.",
  allocation_revision_conflict: "حدث تعارض في رقم الإصدار للإيصال. يرجى تحديث الصفحة والمحاولة مجدداً.",
  collection_void_reason_required: "سبب إبطال الإيصال مطلوب (3 حروف على الأقل).",
  replacement_target_invalid: "الإيصال المستهدف للبديل غير صالح أو ليس ملغى أو تم استبداله سابقاً.",
  idempotency_key_invalid: "مفتاح التكرار غير صالح.",
  idempotency_request_conflict: "تم استخدام مفتاح التكرار مع بيانات طلب مختلفة.",
  idempotency_processing_conflict: "الطلب قيد المعالجة حالياً. يرجى الانتظار...",
  unexpected_collections_error: "حدث خطأ غير متوقع أثناء معالجة إيصال التحصيل. يرجى المحاولة لاحقاً.",
};

export function collectionsErrorMessage(code: CollectionsErrorCode): string {
  return (
    COLLECTIONS_ERROR_MESSAGES[code] ||
    COLLECTIONS_ERROR_MESSAGES.unexpected_collections_error
  );
}
