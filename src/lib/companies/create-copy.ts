/**
 * Arabic copy for Companies create form.
 */
export const companiesCreateCopy = {
  pageTitle: "إضافة شركة",
  pageDescription:
    "أدخل بيانات الشركة التشغيلية. الحقول المطلوبة مميزة. يمكنك العودة للقائمة في أي وقت.",
  backToList: "العودة إلى قائمة الشركات",
  nameLabel: "اسم الشركة",
  nameRequired: "مطلوب",
  nameHint: "بحد أقصى 120 حرفاً",
  contactLabel: "شخص التواصل",
  contactHint: "اختياري — بحد أقصى 80 حرفاً",
  phoneLabel: "الهاتف",
  phoneHint:
    "اختياري. يمكنك إدخال الرقم مع مسافات أو + أو أقواس. أرقام 05 السعودية تُحوَّل تلقائياً إلى صيغة 9665.",
  notesLabel: "ملاحظات",
  notesHint: "اختياري — بحد أقصى 2000 حرف",
  submit: "حفظ الشركة",
  submitting: "جارٍ الحفظ…",
  cancel: "إلغاء",
  formErrorHeading: "تعذّر حفظ الشركة",
  errorDuplicateName:
    "يوجد شركة نشطة بنفس الاسم في هذا الحساب. غيّر الاسم ثم أعد المحاولة.",
  errorInvalidName: "اسم الشركة غير صالح. تأكد من إدخاله وعدم تجاوز 120 حرفاً.",
  errorInvalidContact: "اسم شخص التواصل طويل جداً (الحد 80 حرفاً).",
  errorInvalidPhone:
    "رقم الهاتف غير صالح. استخدم أرقاماً فقط بعد الإزالة، بطول 8 إلى 15، أو رقم 05 سعودي صحيح.",
  errorInvalidNotes: "الملاحظات طويلة جداً (الحد 2000 حرف).",
  errorAccess: "لا يمكن إضافة شركة بهذا الحساب. تحقق من الصلاحية أو أعد تسجيل الدخول.",
  errorUnexpected: "تعذّر حفظ الشركة. حاول مرة أخرى لاحقاً.",
} as const;

export type CompaniesCreateCopy = typeof companiesCreateCopy;
