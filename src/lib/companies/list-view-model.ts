import { companiesListCopy } from "./list-copy";
import type { CompanyErrorCode, CompanySummary } from "./types";

export type CompanyListItemView = {
  companyId: string;
  name: string;
  contactPersonLabel: string;
  phoneLabel: string;
  phoneIsLtr: boolean;
  activeProjectsCount: number;
  completedProjectsCount: number;
  detailHref: string;
  editHref: string;
};

/** Maps domain summary to list UI fields (no finance, no account_id). */
export function toCompanyListItemView(
  company: CompanySummary
): CompanyListItemView {
  const hasPhone = Boolean(company.phone && company.phone.trim() !== "");
  return {
    companyId: company.companyId,
    name: company.name,
    contactPersonLabel:
      company.contactPerson && company.contactPerson.trim() !== ""
        ? company.contactPerson
        : companiesListCopy.noContact,
    phoneLabel: hasPhone ? company.phone! : companiesListCopy.noPhone,
    phoneIsLtr: hasPhone,
    activeProjectsCount: company.activeProjectsCount,
    completedProjectsCount: company.completedProjectsCount,
    detailHref: `/companies/${company.companyId}`,
    editHref: `/companies/${company.companyId}/edit`,
  };
}

export function toCompanyListItemViews(
  companies: CompanySummary[]
): CompanyListItemView[] {
  return companies.map(toCompanyListItemView);
}

/** Safe Arabic messages only — never raw DB text. */
export function companiesListErrorMessage(code: CompanyErrorCode): string {
  switch (code) {
    case "company_access_denied":
      return companiesListCopy.errorAccess;
    case "invalid_pagination":
      return companiesListCopy.errorPagination;
    default:
      return companiesListCopy.errorUnexpected;
  }
}
