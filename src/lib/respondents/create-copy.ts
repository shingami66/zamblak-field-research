/**
 * Arabic copy for Respondents create form.
 * Local dictionary module (project has no global i18n package yet).
 */
export const respondentsCreateCopy = {
  pageTitle: "إضافة مستجيب",
  pageDescription:
    "أدخل بيانات المستجيب في السجل. رقم الجوال مطلوب. يمكنك ترك الاسم فارغاً عند الحاجة، والعودة إلى القائمة في أي وقت.",
  backToList: "العودة إلى قائمة المستجيبين",
  loading: "جاري تحميل نموذج إضافة مستجيب…",
  optional: "اختياري",
  required: "مطلوب",
  mobileLabel: "رقم الجوال",
  mobileHint:
    "مطلوب. الصيغ المقبولة: 05xxxxxxxx أو 5xxxxxxxx أو 9665xxxxxxxx أو +9665xxxxxxxx. لا تُدخل الرقم بعد التطبيع يدوياً.",
  mobileExamples: "أمثلة: 0512345678 — 512345678 — 966512345678 — +966512345678",
  nameLabel: "الاسم",
  nameHint:
    "اختياري — بحد أقصى 120 حرفاً. يُسمح بتسجيل مستجيب بدون اسم.",
  ageLabel: "العمر",
  ageHint: "اختياري — عدد صحيح من 0 إلى 120 دون كسور.",
  nationalityLabel: "الجنسية",
  nationalityHint: "اختياري — بحد أقصى 80 حرفاً.",
  residentTypeLabel: "نوع الإقامة",
  residentTypeHint: "الافتراضي: غير محدد.",
  residentUnknown: "غير محدد",
  residentSaudi: "سعودي",
  residentNonSaudi: "غير سعودي",
  notesLabel: "ملاحظات",
  notesHint: "اختياري — بحد أقصى 2000 حرف. ملاحظات السجل فقط.",
  submit: "حفظ المستجيب",
  submitting: "جارٍ الحفظ…",
  cancel: "إلغاء",
  formErrorHeading: "تعذّر حفظ المستجيب",
  errorInvalidMobile:
    "رقم الجوال غير صالح. استخدم إحدى الصيغ السعودية المقبولة.",
  errorDuplicateMobile:
    "يوجد مستجيب نشط بنفس رقم الجوال في هذا الحساب. راجع السجل أو غيّر الرقم ثم أعد المحاولة.",
  errorInvalidName: "الاسم غير صالح. تأكد من عدم تجاوز 120 حرفاً.",
  errorInvalidAge:
    "العمر غير صالح. استخدم عدداً صحيحاً من 0 إلى 120 دون إشارة أو كسور.",
  errorInvalidNationality:
    "الجنسية غير صالحة. تأكد من عدم تجاوز 80 حرفاً.",
  errorInvalidResidentType: "نوع الإقامة غير صالح.",
  errorInvalidNotes: "الملاحظات طويلة جداً (الحد 2000 حرف).",
  errorAccess:
    "لا يمكن إضافة مستجيب بهذا الحساب. تحقق من الصلاحية أو أعد تسجيل الدخول.",
  errorUnexpected: "تعذّر حفظ المستجيب. حاول مرة أخرى لاحقاً.",
} as const;

export type RespondentsCreateCopy = typeof respondentsCreateCopy;
