export const successNoticeMessages = {
  company_created: "تمت إضافة الشركة بنجاح.",
  company_updated: "تم تحديث بيانات الشركة بنجاح.",
  project_created: "تمت إضافة المشروع بنجاح.",
  project_updated: "تم تحديث بيانات المشروع بنجاح.",
  respondent_created: "تمت إضافة المشارك بنجاح.",
  respondent_updated: "تم تحديث بيانات المشارك بنجاح.",
  participant_assigned: "تمت إضافة المشارك إلى المشروع بنجاح.",
  create_collection: "تم تسجيل التحصيل وتوزيع المبلغ بنجاح.",
} as const;

export type SuccessNoticeCode = keyof typeof successNoticeMessages;

export function successRedirectPath(path: string, code: SuccessNoticeCode): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}success=${code}`;
}

export function getSuccessNotice(value: string | string[] | undefined): string | null {
  if (typeof value !== "string") return null;
  return value in successNoticeMessages
    ? successNoticeMessages[value as SuccessNoticeCode]
    : null;
}
