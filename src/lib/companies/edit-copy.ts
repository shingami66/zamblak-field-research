/**
 * Arabic copy for Companies edit form.
 * Reuses field semantics from create; edit-specific actions and concurrency messages.
 */
export const companiesEditCopy = {
  pageTitle: "تعديل الشركة",
  pageDescription:
    "حدّث بيانات الشركة التشغيلية. إذا عدّل شخص آخر السجل، سيُطلب منك إعادة التحميل قبل الحفظ.",
  backToCompany: "العودة إلى الشركة",
  save: "حفظ التعديلات",
  saving: "جارٍ حفظ التعديلات…",
  cancel: "إلغاء",
  reloadCompany: "إعادة تحميل بيانات الشركة",
  formErrorHeading: "تعذّر حفظ التعديلات",
  errorDuplicateName:
    "يوجد شركة نشطة بنفس الاسم في هذا الحساب. غيّر الاسم ثم أعد المحاولة.",
  errorInvalidName: "اسم الشركة غير صالح. تأكد من إدخاله وعدم تجاوز 120 حرفاً.",
  errorInvalidContact: "اسم شخص التواصل طويل جداً (الحد 80 حرفاً).",
  errorInvalidPhone:
    "رقم الهاتف غير صالح. استخدم أرقاماً فقط بعد الإزالة، بطول 8 إلى 15، أو رقم 05 سعودي صحيح.",
  errorInvalidNotes: "الملاحظات طويلة جداً (الحد 2000 حرف).",
  errorAccess:
    "لا يمكن تعديل هذه الشركة حالياً. تحقق من صلاحية الحساب أو أعد تسجيل الدخول.",
  errorNotFound:
    "تعذّر العثور على الشركة أو لم يعد بالإمكان تعديلها. ارجع إلى قائمة الشركات.",
  errorStale:
    "تم تعديل بيانات هذه الشركة من جهة أخرى. أعد تحميل الصفحة ثم طبّق تعديلاتك على النسخة الأحدث.",
  errorUnexpected: "تعذّر حفظ التعديلات. حاول مرة أخرى لاحقاً.",
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
} as const;

export type CompaniesEditCopy = typeof companiesEditCopy;
