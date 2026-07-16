/**
 * Arabic copy for Projects create form.
 */
export const projectsCreateCopy = {
  pageTitle: "إضافة مشروع",
  pageDescription:
    "أدخل بيانات المشروع التشغيلية واربطه بشركة نشطة. المشروع الجديد يبدأ كمسودة. الحقول المطلوبة مميزة.",
  backToList: "العودة إلى قائمة المشاريع",
  draftNotice:
    "يُنشأ المشروع دائماً بحالة «مسودة». لا يُرسل حقل الحالة من هذا النموذج.",
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
    "يجب إضافة شركة أولاً قبل إنشاء مشروع. انتقل إلى صفحة الشركات لإضافة شركة.",
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
  residentHint: "الافتراضي: الجميع.",
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
  submit: "حفظ المشروع",
  submitting: "جارٍ الحفظ…",
  cancel: "إلغاء",
  formErrorHeading: "تعذّر حفظ المشروع",
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
  errorAccess:
    "لا يمكن إضافة مشروع بهذا الحساب. تحقق من الصلاحية أو أعد تسجيل الدخول.",
  errorProfile:
    "تعذّر التحقق من ملف الحساب. أعد تسجيل الدخول ثم حاول مرة أخرى.",
  errorUnexpected: "تعذّر حفظ المشروع. حاول مرة أخرى لاحقاً.",
} as const;

export type ProjectsCreateCopy = typeof projectsCreateCopy;
