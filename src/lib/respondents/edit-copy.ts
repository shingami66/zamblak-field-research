/**
 * Arabic copy for Respondents edit form.
 * Field semantics align with create; edit adds concurrency messaging.
 */
export const respondentsEditCopy = {
  pageTitle: "تعديل المستجيب",
  pageDescription:
    "حدّث بيانات المستجيب في السجل. رقم الجوال مطلوب. إذا عدّل شخص آخر السجل، أعد التحميل قبل الحفظ.",
  loading: "جاري تحميل نموذج تعديل المستجيب…",
  backToDetail: "العودة إلى تفاصيل المستجيب",
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
  residentTypeHint: "اختر نوع الإقامة.",
  residentUnknown: "غير محدد",
  residentSaudi: "سعودي",
  residentNonSaudi: "غير سعودي",
  notesLabel: "ملاحظات",
  notesHint: "اختياري — بحد أقصى 2000 حرف. ملاحظات السجل فقط.",
  save: "حفظ التعديلات",
  saving: "جارٍ حفظ التعديلات…",
  cancel: "إلغاء التعديل",
  reloadRecord: "إعادة تحميل أحدث بيانات المستجيب",
  formErrorHeading: "تعذّر حفظ التعديلات",
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
  errorStale:
    "تم تعديل بيانات هذا المستجيب من مكان آخر بعد تحميل الصفحة. أعد التحميل ثم أدخل التعديلات مرة أخرى. لا يُعاد الحفظ تلقائياً.",
  errorNotFound:
    "لم يعد هذا المستجيب متاحاً. قد يكون الرابط غير صالح أو السجل غير موجود.",
  errorAccess:
    "لا يمكن تعديل هذا المستجيب بهذا الحساب. تحقق من الصلاحية أو أعد تسجيل الدخول.",
  errorUnexpected: "تعذّر حفظ تعديلات المستجيب. حاول مرة أخرى لاحقاً.",
} as const;

export type RespondentsEditCopy = typeof respondentsEditCopy;
