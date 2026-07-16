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
