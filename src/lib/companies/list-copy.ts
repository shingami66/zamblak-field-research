/**
 * Arabic-first Companies list copy.
 * Local dictionary module (project has no global i18n package yet).
 */
export const companiesListCopy = {
  pageTitle: "الشركات",
  pageDescription:
    "استعرض شركات العملاء وابحث بالاسم أو بشخص التواصل. استخدم إضافة شركة عند الحاجة.",
  addCompany: "إضافة شركة",
  searchLabel: "البحث عن شركة",
  searchPlaceholder: "ابحث بالاسم أو بشخص التواصل",
  searchAction: "بحث",
  resetSearch: "مسح البحث",
  contactPerson: "شخص التواصل",
  phone: "الهاتف",
  activeProjects: "المشاريع النشطة",
  completedProjects: "المشاريع المكتملة",
  noContact: "لا يوجد شخص تواصل",
  noPhone: "لا يوجد هاتف",
  noCompanies: "لا توجد شركات بعد",
  noCompaniesHint: "ابدأ بإضافة أول شركة لإدارة مشاريعها لاحقاً.",
  noSearchResults: "لا توجد شركات مطابقة لبحثك",
  noSearchResultsHint: "جرّب كلمات مختلفة أو امسح البحث لعرض كل الشركات.",
  previous: "السابق",
  next: "التالي",
  view: "عرض",
  edit: "تعديل",
  resultsHeading: "قائمة الشركات",
  paginationNav: "تصفح صفحات الشركات",
  loading: "جاري تحميل الشركات…",
  errorAccess: "لا يمكن عرض الشركات حالياً. تحقق من صلاحية الحساب أو أعد تسجيل الدخول.",
  errorPagination: "معاملات التصفح غير صالحة. عد إلى الصفحة الأولى.",
  errorUnexpected: "تعذّر تحميل قائمة الشركات. حاول مرة أخرى لاحقاً.",
} as const;

export type CompaniesListCopy = typeof companiesListCopy;
