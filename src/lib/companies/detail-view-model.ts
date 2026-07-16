import { companiesDetailCopy } from "./detail-copy";
import { companyPhoneDisplayText } from "./presentation";
import type { CompanyDetail, CompanyErrorCode } from "./types";

export type CompanyDetailView = {
  companyId: string;
  name: string;
  contactPersonLabel: string;
  phoneLabel: string;
  phoneIsLtr: boolean;
  notesLabel: string;
  notesIsEmpty: boolean;
  activeProjectsCount: number;
  completedProjectsCount: number;
  createdAtLabel: string;
  updatedAtLabel: string;
  backHref: string;
  editHref: string;
};

/**
 * Locale-aware timestamp for Arabic-first UI.
 * Latin digits (nu-latn) keep phone/date digit order stable; callers wrap
 * the result in a bidi-isolated container for mixed-script safety.
 * Never returns raw ISO when formatting fails.
 */
export function formatCompanyTimestamp(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    return companiesDetailCopy.notProvided;
  }
  try {
    return new Intl.DateTimeFormat("ar-SA-u-nu-latn", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(ms));
  } catch {
    return companiesDetailCopy.notProvided;
  }
}

/** Maps CompanyDetail to presentation fields (no account_id, no finance). */
export function toCompanyDetailView(company: CompanyDetail): CompanyDetailView {
  const phone = companyPhoneDisplayText(
    company.phone,
    companiesDetailCopy.notProvided
  );
  const hasContact = Boolean(
    company.contactPerson && company.contactPerson.trim() !== ""
  );
  const hasNotes = Boolean(company.notes && company.notes.trim() !== "");

  return {
    companyId: company.companyId,
    name: company.name,
    contactPersonLabel: hasContact
      ? company.contactPerson!
      : companiesDetailCopy.notProvided,
    phoneLabel: phone.text,
    phoneIsLtr: phone.isLtr,
    notesLabel: hasNotes ? company.notes! : companiesDetailCopy.notProvided,
    notesIsEmpty: !hasNotes,
    activeProjectsCount: company.activeProjectsCount,
    completedProjectsCount: company.completedProjectsCount,
    createdAtLabel: formatCompanyTimestamp(company.createdAt),
    updatedAtLabel: formatCompanyTimestamp(company.updatedAt),
    backHref: "/companies",
    editHref: `/companies/${company.companyId}/edit`,
  };
}

/**
 * Presentation outcome for detail route errors.
 * not_found → call notFound(); access/unexpected → safe Arabic message.
 */
export function companiesDetailErrorBehavior(code: CompanyErrorCode): {
  kind: "not_found" | "message";
  message?: string;
} {
  if (code === "company_not_found") {
    return { kind: "not_found" };
  }
  if (code === "company_access_denied") {
    return { kind: "message", message: companiesDetailCopy.errorAccess };
  }
  return { kind: "message", message: companiesDetailCopy.errorUnexpected };
}
