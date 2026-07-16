import { companiesDetailCopy } from "./detail-copy";
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

function formatTimestamp(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    return companiesDetailCopy.notProvided;
  }
  try {
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(ms));
  } catch {
    return iso;
  }
}

/** Maps CompanyDetail to presentation fields (no account_id, no finance). */
export function toCompanyDetailView(company: CompanyDetail): CompanyDetailView {
  const hasPhone = Boolean(company.phone && company.phone.trim() !== "");
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
    phoneLabel: hasPhone ? company.phone! : companiesDetailCopy.notProvided,
    phoneIsLtr: hasPhone,
    notesLabel: hasNotes ? company.notes! : companiesDetailCopy.notProvided,
    notesIsEmpty: !hasNotes,
    activeProjectsCount: company.activeProjectsCount,
    completedProjectsCount: company.completedProjectsCount,
    createdAtLabel: formatTimestamp(company.createdAt),
    updatedAtLabel: formatTimestamp(company.updatedAt),
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
