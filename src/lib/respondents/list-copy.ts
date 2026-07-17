/**
 * Arabic-first Respondents list copy.
 * Local dictionary module (project has no global i18n package yet).
 */
export const respondentsListCopy = {
  pageTitle: "سجل المستجيبين",
  pageDescription:
    "استعرض المستجيبين وابحث بالاسم أو رقم الجوال. استخدم إضافة مستجيب عند الحاجة.",
  addRespondent: "إضافة مستجيب",
  searchLabel: "البحث عن مستجيب",
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
  noRespondents: "لا يوجد مستجيبون مسجّلون بعد",
  noRespondentsHint: "ابدأ بإضافة أول مستجيب إلى السجل.",
  noSearchResults: "لا يوجد مستجيبون مطابقون لبحثك",
  noSearchResultsHint: "جرّب كلمات أو رقم جوال مختلف، أو امسح البحث لعرض الكل.",
  pageBeyondResults: "لا توجد نتائج في هذه الصفحة",
  pageBeyondResultsHint: "يمكنك الرجوع إلى الصفحة السابقة إن وُجدت.",
  previous: "السابق",
  next: "التالي",
  view: "عرض التفاصيل",
  resultsHeading: "قائمة المستجيبين",
  paginationNav: "تصفح صفحات المستجيبين",
  loading: "جاري تحميل سجل المستجيبين…",
  errorAccess:
    "لا يمكن عرض المستجيبين حالياً. تحقق من صلاحية الحساب أو أعد تسجيل الدخول.",
  errorPagination: "معاملات التصفح أو البحث غير صالحة. عد إلى الصفحة الأولى.",
  errorUnexpected: "تعذّر تحميل قائمة المستجيبين. حاول مرة أخرى لاحقاً.",
} as const;

export type RespondentsListCopy = typeof respondentsListCopy;
