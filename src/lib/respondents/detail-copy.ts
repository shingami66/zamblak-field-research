/**
 * Arabic-first Respondents detail page copy.
 * Local dictionary module (project has no global i18n package yet).
 */
export const respondentsDetailCopy = {
  backToList: "العودة إلى قائمة المستجيبين",
  editRespondent: "تعديل المستجيب",
  sectionBasic: "بيانات المستجيب",
  sectionNotes: "الملاحظات",
  sectionAudit: "سجل التحديث",
  name: "الاسم",
  mobile: "الجوال",
  age: "العمر",
  nationality: "الجنسية",
  residentType: "نوع الإقامة",
  notes: "ملاحظات",
  createdAt: "تاريخ الإنشاء",
  updatedAt: "آخر تحديث",
  unnamed: "بدون اسم",
  notSpecified: "غير محدد",
  notSpecifiedFeminine: "غير محددة",
  emptyNotes: "لا توجد ملاحظات",
  residentSaudi: "سعودي",
  residentNonSaudi: "غير سعودي",
  residentUnknown: "غير محدد",
  loading: "جاري تحميل بيانات المستجيب…",
  notFoundTitle: "المستجيب غير موجود",
  notFoundHint:
    "تعذّر العثور على هذا المستجيب. قد يكون الرابط غير صالح أو لم يعد متاحاً.",
  errorAccess:
    "لا يمكن عرض هذا المستجيب حالياً. تحقق من صلاحية الحساب أو أعد تسجيل الدخول.",
  errorUnexpected: "تعذّر تحميل بيانات المستجيب. حاول مرة أخرى لاحقاً.",
} as const;

export type RespondentsDetailCopy = typeof respondentsDetailCopy;
