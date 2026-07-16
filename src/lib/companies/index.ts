export type {
  CompaniesListResult,
  CompanyDetail,
  CompanyErrorCode,
  CompanyFailure,
  CompanyListParams,
  CompanyRecord,
  CompanyResult,
  CompanyRpcRow,
  CompanySuccess,
  CompanySummary,
  CreateCompanyInput,
  UpdateCompanyInput,
} from "./types";

export {
  COMPANY_CONTACT_MAX_LENGTH,
  COMPANY_LIST_DEFAULT_LIMIT,
  COMPANY_LIST_MAX_LIMIT,
  COMPANY_NAME_MAX_LENGTH,
  COMPANY_NOTES_MAX_LENGTH,
  COMPANY_SEARCH_MAX_LENGTH,
  buildCreateCompanyRpcArgs,
  buildListCompaniesRpcArgs,
  buildUpdateCompanyRpcArgs,
  collapseWhitespace,
  normalizePhoneInput,
  parseCreateCompanyInput,
  parseListCompaniesInput,
  parseUpdateCompanyInput,
} from "./input";

export { mapCompanyRpcError, mapCompanyErrorMessage } from "./errors";
export { mapCompanyRpcRow, mapCompanyRpcRows } from "./map-row";
export {
  createCompany,
  getCompany,
  listCompanies,
  updateCompany,
} from "./rpc";

export { companiesListCopy } from "./list-copy";
export {
  COMPANIES_LIST_PAGE_SIZE,
  buildCompaniesListHref,
  deriveListPagination,
  parseCompaniesListSearchParams,
} from "./list-params";
export {
  companiesListErrorMessage,
  toCompanyListItemView,
  toCompanyListItemViews,
} from "./list-view-model";

export { companiesCreateCopy } from "./create-copy";
export {
  CREATE_COMPANY_SUCCESS_REDIRECT_PATH,
  CREATE_COMPANY_SUCCESS_REVALIDATE_PATH,
  EMPTY_CREATE_COMPANY_STATE,
  mapCreateCompanyErrorPresentation,
  readCreateCompanyFormValues,
} from "./create-form";
export type {
  CreateCompanyActionState,
  CreateCompanyFieldErrors,
  CreateCompanyFormValues,
} from "./create-form";

export { companiesDetailCopy } from "./detail-copy";
export { parseCompanyIdParam } from "./detail-params";
export {
  companiesDetailErrorBehavior,
  formatCompanyTimestamp,
  toCompanyDetailView,
} from "./detail-view-model";
export type { CompanyDetailView } from "./detail-view-model";

export {
  companyPhoneDisplayText,
  companyPhonePresentation,
} from "./presentation";

export { companiesEditCopy } from "./edit-copy";
export {
  editCompanySuccessRedirectPath,
  editCompanySuccessRevalidatePaths,
  initialEditCompanyState,
  mapEditCompanyErrorPresentation,
  readEditCompanyFormValues,
} from "./edit-form";
export type {
  EditCompanyActionState,
  EditCompanyFieldErrors,
  EditCompanyFormValues,
} from "./edit-form";
