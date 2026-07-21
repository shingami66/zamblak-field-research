import type { EligibilityWarningCode, ParticipationErrorCode } from "./types";

const errors: Record<ParticipationErrorCode, string> = {
  participation_access_denied: "لا تملك صلاحية إضافة مشارك إلى هذا المشروع.",
  project_not_found: "تعذر العثور على المشروع المطلوب.",
  respondent_not_found: "تعذر العثور على المشارك المطلوب.",
  project_not_active: "لا يمكن إضافة مشاركين إلا إلى مشروع نشط.",
  duplicate_participation: "هذا المشارك مضاف إلى المشروع مسبقاً",
  invalid_project_id: "رابط المشروع غير صالح.",
  invalid_respondent_id: "يرجى اختيار مشارك من القائمة.",
  unexpected_participation_error: "تعذر إتمام العملية الآن. حاول مرة أخرى.",
};

const eligibilityWarnings: Record<EligibilityWarningCode, string> = {
  age_missing: "عمر المشارك غير مسجل بينما للمشروع شرط عمر.",
  age_below_min: "عمر المشارك أقل من الحد المطلوب للمشروع.",
  age_above_max: "عمر المشارك أعلى من الحد المطلوب للمشروع.",
  resident_type_mismatch: "نوع الإقامة لا يطابق شرط المشروع.",
};

export const participationCopy = {
  noNameFallback: "مشارك بدون اسم",
  addRespondent: "إضافة مشارك",
  addRespondentTitle: "إضافة مشارك إلى المشروع",
  addRespondentIntro: "اختر مشاركاً ثم راجع التنبيهات قبل الإضافة.",
  backToProject: "العودة إلى المشروع",
  selectRespondent: "اختر المشارك",
  respondentSearchLabel: "ابحث عن مشارك",
  respondentSearchPlaceholder: "الاسم أو رقم الجوال",
  respondentSearchAction: "بحث",
  resetRespondentSearch: "مسح البحث",
  noRespondentSearchResults: "لا توجد نتائج مطابقة للبحث.",
  noRespondents: "لا يوجد مشاركون متاحون في الحساب حالياً.",
  checkWarnings: "مراجعة التنبيهات",
  checkingWarnings: "جارٍ مراجعة التنبيهات…",
  createParticipation: "إضافة المشارك",
  creatingParticipation: "جارٍ الإضافة…",
  warningsHeading: "تنبيهات قبل الإضافة",
  noWarnings: "لا توجد ملاحظات، يمكنك إضافة المشارك.",
  warningProceed: "هذه التنبيهات لا تمنع الإضافة. يمكنك المتابعة عند ملاءمة المشارك للمهمة.",
  threeMonthWarning: "للمشارك مشاركة حديثة ضمن نفس المجال خلال آخر ثلاثة أشهر.",
  eligibilityWarning: "هناك تنبيه متعلق بشروط أهلية المشروع.",
  participationList: "سجل المشاركين",
  noParticipations: "لا يوجد مشاركون مضافون إلى هذا المشروع بعد.",
  listUnavailable: "تعذر تحميل المشاركين الآن.",
  activeOnly: "تتاح إضافة المشاركين للمشاريع النشطة فقط.",
  errors,
  eligibilityWarnings,
} as const;

export function participationErrorMessage(code: ParticipationErrorCode): string {
  return participationCopy.errors[code];
}
