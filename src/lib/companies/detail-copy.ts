/**
 * Arabic-first Companies detail page copy.
 */
export const companiesDetailCopy = {
  backToList: "العودة إلى قائمة الشركات",
  editCompany: "تعديل الشركة",
  contactPerson: "شخص التواصل",
  phone: "الهاتف",
  notes: "ملاحظات",
  activeProjects: "المشاريع النشطة",
  completedProjects: "المشاريع المكتملة",
  createdAt: "تاريخ الإنشاء",
  updatedAt: "آخر تحديث",
  notProvided: "غير متوفر",
  loading: "جاري تحميل بيانات الشركة…",
  errorAccess:
    "لا يمكن عرض هذه الشركة حالياً. تحقق من صلاحية الحساب أو أعد تسجيل الدخول.",
  errorUnexpected: "تعذّر تحميل بيانات الشركة. حاول مرة أخرى لاحقاً.",
  countsHeading: "ملخص المشاريع",
  detailsHeading: "بيانات الشركة",
} as const;

export type CompaniesDetailCopy = typeof companiesDetailCopy;
