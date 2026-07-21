/**
 * Arabic-first Respondents list copy.
 * Local dictionary module (project has no global i18n package yet).
 */
export const respondentsListCopy = {
  pageTitle: "سجل المشاركين",
  pageDescription:
    "استعرض المشاركين وابحث بالاسم أو رقم الجوال. استخدم إضافة مشارك عند الحاجة.",
  addRespondent: "إضافة مشارك",
  searchLabel: "البحث عن مشارك",
  searchPlaceholder: "ابحث بالاسم أو برقم الجوال",
  searchAction: "بحث",
  resetSearch: "مسح البحث",
  name: "الاسم",
  mobile: "الجوال",
  age: "العمر",
  nationality: "الجنسية",
  residentType: "نوع الإقامة",
  updatedAt: "آخر تحديث",
  unnamed: "بدون اسم",
  notSpecified: "غير محدد",
  notSpecifiedFeminine: "غير محددة",
  residentSaudi: "سعودي",
  residentNonSaudi: "غير سعودي",
  residentUnknown: "غير محدد",
  noRespondents: "لا يوجد مشاركون مسجّلون بعد",
  noRespondentsHint: "ابدأ بإضافة أول مشارك إلى السجل.",
  noSearchResults: "لا يوجد مشاركون مطابقون لبحثك",
  noSearchResultsHint: "جرّب كلمات أو رقم جوال مختلف، أو امسح البحث لعرض الكل.",
  pageBeyondResults: "لا توجد نتائج في هذه الصفحة",
  pageBeyondResultsHint: "يمكنك الرجوع إلى الصفحة السابقة إن وُجدت.",
  previous: "السابق",
  next: "التالي",
  view: "عرض التفاصيل",
  resultsHeading: "قائمة المشاركين",
  paginationNav: "تصفح صفحات المشاركين",
  loading: "جاري تحميل سجل المشاركين…",
  errorAccess:
    "لا يمكن عرض المشاركين حالياً. تحقق من صلاحية الحساب أو أعد تسجيل الدخول.",
  errorPagination: "معاملات التصفح أو البحث غير صالحة. عد إلى الصفحة الأولى.",
  errorUnexpected: "تعذّر تحميل قائمة المشاركين. حاول مرة أخرى لاحقاً.",
} as const;

export type RespondentsListCopy = typeof respondentsListCopy;
