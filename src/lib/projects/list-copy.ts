/**
 * Arabic-first Projects list copy.
 * Local dictionary module (project has no global i18n package yet).
 */
export const projectsListCopy = {
  pageTitle: "المشاريع",
  pageDescription:
    "استعرض مشاريع العمل الميداني وابحث باسم المشروع أو الشركة، مع التصفية حسب الشركة والحالة.",
  addProject: "إضافة مشروع",
  searchLabel: "البحث عن مشروع",
  searchPlaceholder: "البحث باسم المشروع أو الشركة",
  searchAction: "بحث",
  resetFilters: "مسح عوامل التصفية",
  companyFilterLabel: "الشركة",
  companyFilterAll: "جميع الشركات",
  statusFilterLabel: "الحالة",
  statusFilterAll: "جميع الحالات",
  companyName: "الشركة",
  domain: "المجال",
  status: "الحالة",
  startDate: "تاريخ البداية",
  endDate: "تاريخ النهاية",
  quota: "الحصة",
  updatedAt: "آخر تحديث",
  notSpecified: "غير محدد",
  quotaUnspecified: "غير محددة",
  noProjects: "لا توجد مشاريع بعد",
  noProjectsHint: "ستظهر هنا مشاريع العمل الميداني بعد إضافتها.",
  noFilterResults: "لا توجد مشاريع مطابقة لعوامل التصفية الحالية",
  noFilterResultsHint:
    "جرّب تعديل البحث أو عوامل التصفية، أو امسحها لعرض كل المشاريع.",
  companiesFilterUnavailable:
    "تعذّر تحميل قائمة الشركات للتصفية. يمكنك متابعة عرض المشاريع.",
  previous: "السابق",
  next: "التالي",
  view: "عرض",
  edit: "تعديل",
  resultsHeading: "قائمة المشاريع",
  paginationNav: "تصفح صفحات المشاريع",
  loading: "جاري تحميل المشاريع…",
  errorAccess:
    "لا يمكن عرض المشاريع حالياً. تحقق من صلاحية الحساب أو أعد تسجيل الدخول.",
  errorProfile:
    "تعذّر التحقق من ملف الحساب. أعد تسجيل الدخول ثم حاول مرة أخرى.",
  errorPagination: "معاملات التصفح غير صالحة. عد إلى الصفحة الأولى.",
  errorTextLength: "نص البحث أطول من الحد المسموح. اختصر البحث وحاول مرة أخرى.",
  errorStatus: "قيمة حالة المشروع غير صالحة.",
  errorCompany: "معرّف الشركة غير صالح.",
  errorUnexpected: "تعذّر تحميل قائمة المشاريع. حاول مرة أخرى لاحقاً.",
  statusDraft: "مسودة",
  statusActive: "نشط",
  statusClosed: "مغلق",
  statusCancelled: "ملغي",
  domainTelecom: "اتصالات",
  domainBanking: "بنوك",
  domainInsurance: "تأمين",
  domainProduct: "منتجات",
  domainOther: "أخرى",
} as const;

export type ProjectsListCopy = typeof projectsListCopy;
