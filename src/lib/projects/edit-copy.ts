/**
 * Arabic copy for Projects edit form.
 * Field semantics align with create; edit-specific concurrency and status rules.
 */
export const projectsEditCopy = {
  pageTitle: "تعديل المشروع",
  pageDescription:
    "حدّث بيانات المشروع التشغيلية. حالة المشروع للعرض فقط. إذا عدّل شخص آخر السجل، أعد التحميل قبل الحفظ.",
  loading: "جاري تحميل نموذج التعديل…",
  backToDetail: "العودة إلى تفاصيل المشروع",
  cancel: "إلغاء التعديل",
  save: "حفظ التعديلات",
  saving: "جارٍ حفظ التعديلات…",
  reloadProject: "إعادة تحميل بيانات المشروع",
  statusContext: "حالة المشروع",
  companyLockedNote: "لا يمكن تغيير الشركة بعد تفعيل المشروع",
  closedReadOnly: "هذا المشروع مغلق ومتاح للعرض فقط",
  cancelledReadOnly: "هذا المشروع ملغي ومتاح للعرض فقط",
  viewDetail: "عرض تفاصيل المشروع",
  formErrorHeading: "تعذّر حفظ التعديلات",
  sectionBasic: "المعلومات الأساسية",
  sectionSchedule: "مدة المشروع والعدد المستهدف",
  sectionParticipants: "معايير المشاركين",
  sectionContact: "التواصل والملاحظات",
  nameLabel: "اسم المشروع",
  nameRequired: "مطلوب",
  nameHint: "بحد أقصى 120 حرفاً. يُسمح بتكرار الاسم.",
  companyLabel: "الشركة",
  companyRequired: "مطلوب",
  companyPlaceholder: "اختر الشركة",
  companyHint: "اختر شركة نشطة من الحساب.",
  noCompaniesTitle: "لا توجد شركات نشطة",
  noCompaniesHint:
    "يجب توفر شركة نشطة لتغيير الشركة. انتقل إلى الشركات لإضافة شركة.",
  goToCompanies: "الانتقال إلى الشركات",
  companiesLoadError:
    "تعذّر تحميل قائمة الشركات. حاول مرة أخرى لاحقاً أو أعد تحميل الصفحة.",
  domainLabel: "المجال",
  domainRequired: "مطلوب",
  domainPlaceholder: "اختر المجال",
  domainHint: "اختر مجال البحث المعتمد.",
  domainTelecom: "اتصالات",
  domainBanking: "بنوك",
  domainInsurance: "تأمين",
  domainProduct: "منتجات",
  domainOther: "أخرى",
  startDateLabel: "تاريخ البداية",
  endDateLabel: "تاريخ النهاية",
  dateHint: "اختياري — بتنسيق التاريخ فقط. لا يمكن أن يسبق تاريخ النهاية البداية.",
  quotaLabel: "العدد المستهدف",
  quotaHint: "اختياري — عدد صحيح غير سالب. ليس سعراً ولا ميزانية.",
  minAgeLabel: "الحد الأدنى للعمر",
  maxAgeLabel: "الحد الأعلى للعمر",
  ageHint: "اختياري — أعداد صحيحة غير سالبة. الحد الأعلى لا يقل عن الأدنى.",
  residentLabel: "نوع الإقامة المطلوب",
  residentHint: "اختر نوع الإقامة المطلوب.",
  residentAny: "الجميع",
  residentSaudi: "سعودي",
  residentNonSaudi: "غير سعودي",
  residentUnknown: "غير محدد",
  threeMonthLabel:
    "تنبيه المشاركة خلال ثلاثة أشهر في نفس مجال البحث",
  threeMonthHint:
    "عند التفعيل يُفضَّل تنبيه الفريق بشأن مشاركة حديثة في نفس المجال. لا يمنع المشاركة تلقائياً.",
  eligibilityLabel: "ملاحظات الأهلية",
  eligibilityHint: "اختياري — بحد أقصى 2000 حرف",
  whatsappArLabel: "قالب واتساب بالعربية",
  whatsappEnLabel: "قالب واتساب بالإنجليزية",
  whatsappHint: "اختياري — بحد أقصى 2000 حرف لكل قالب. لا ترجمة تلقائية.",
  notesLabel: "ملاحظات",
  notesHint: "اختياري — بحد أقصى 2000 حرف",
  errorInvalidName:
    "اسم المشروع غير صالح. تأكد من إدخاله وعدم تجاوز 120 حرفاً.",
  errorInvalidCompany: "معرّف الشركة غير صالح أو غير محدد.",
  errorInvalidDomain: "مجال المشروع غير صالح.",
  errorInvalidDates:
    "التواريخ غير صالحة. استخدم تاريخاً صحيحاً، ولا تجعل النهاية قبل البداية.",
  errorInvalidQuota: "العدد المستهدف غير صالح. استخدم عدداً صحيحاً غير سالب.",
  errorInvalidAge:
    "نطاق العمر غير صالح. استخدم أعداداً صحيحة غير سالبة، والحد الأعلى لا يقل عن الأدنى.",
  errorInvalidResident: "نوع الإقامة غير صالح.",
  errorInvalidText: "أحد الحقول النصية طويل جداً (الحد 2000 حرف).",
  errorCompanyNotFound:
    "الشركة المحددة غير متاحة أو غير نشطة. اختر شركة أخرى.",
  errorCompanyLocked:
    "لا يمكن تغيير الشركة لهذا المشروع. الشركة ثابتة بعد التفعيل.",
  errorNotEditable:
    "هذا المشروع غير قابل للتعديل حالياً. ارجع إلى صفحة التفاصيل.",
  errorAccess:
    "لا يمكن تعديل هذا المشروع. تحقق من صلاحية الحساب أو أعد تسجيل الدخول.",
  errorProfile:
    "تعذّر التحقق من ملف الحساب. أعد تسجيل الدخول ثم حاول مرة أخرى.",
  errorNotFound:
    "تعذّر العثور على المشروع أو لم يعد بالإمكان تعديله. ارجع إلى قائمة المشاريع.",
  errorStale:
    "تم تعديل المشروع في جلسة أخرى. حدّث الصفحة وراجع البيانات قبل المحاولة مجدداً.",
  errorUnexpected: "تعذّر حفظ التعديلات. حاول مرة أخرى لاحقاً.",
  statusDraft: "مسودة",
  statusActive: "نشط",
  statusClosed: "مغلق",
  statusCancelled: "ملغي",
} as const;

export type ProjectsEditCopy = typeof projectsEditCopy;
