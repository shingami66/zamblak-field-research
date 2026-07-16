export type {
  CreateProjectInput,
  ProjectDetail,
  ProjectDetailRpcRow,
  ProjectDomain,
  ProjectErrorCode,
  ProjectFailure,
  ProjectListItem,
  ProjectListParams,
  ProjectListRpcRow,
  ProjectResidentType,
  ProjectResult,
  ProjectStatus,
  ProjectSuccess,
  ProjectsListResult,
  TransitionProjectStatusInput,
  UpdateProjectInput,
} from "./types";

export {
  PROJECT_DOMAINS,
  PROJECT_LIST_DEFAULT_LIMIT,
  PROJECT_LIST_MAX_LIMIT,
  PROJECT_LONG_TEXT_MAX_LENGTH,
  PROJECT_NAME_MAX_LENGTH,
  PROJECT_RESIDENT_TYPES,
  PROJECT_SEARCH_MAX_LENGTH,
  PROJECT_STATUSES,
  buildCreateProjectRpcArgs,
  buildListProjectsRpcArgs,
  buildTransitionProjectStatusRpcArgs,
  buildUpdateProjectRpcArgs,
  collapseWhitespace,
  parseCreateProjectInput,
  parseGetProjectInput,
  parseListProjectsInput,
  parseTransitionProjectStatusInput,
  parseUpdateProjectInput,
} from "./input";

export {
  LIVE_PROJECT_ERROR_TOKENS,
  RESERVED_PROJECT_ERROR_TOKENS,
  mapProjectErrorMessage,
  mapProjectRpcError,
} from "./errors";

export {
  mapProjectDetailRpcRow,
  mapProjectDetailRpcRows,
  mapProjectListRpcRow,
  mapProjectListRpcRows,
} from "./map-row";

export {
  getAllowedProjectTransitions,
  isAllowedProjectStatusTransition,
} from "./lifecycle";

export {
  createProject,
  getProject,
  listProjects,
  transitionProjectStatus,
  updateProject,
} from "./rpc";

export { projectsListCopy } from "./list-copy";
export type { ProjectsListCopy } from "./list-copy";
export {
  PROJECTS_LIST_PAGE_SIZE,
  buildProjectsListHref,
  deriveProjectsListPagination,
  parseProjectsListSearchParams,
} from "./list-params";
export type { ProjectsListUrlState } from "./list-params";
export {
  formatProjectDateOnly,
  formatProjectQuota,
  formatProjectTimestamp,
  projectDomainLabel,
  projectStatusLabel,
  projectsListErrorMessage,
  toProjectListItemView,
  toProjectListItemViews,
} from "./list-view-model";
export type { ProjectListItemView } from "./list-view-model";

export { projectsCreateCopy } from "./create-copy";
export type { ProjectsCreateCopy } from "./create-copy";
export {
  CREATE_PROJECT_SUCCESS_REDIRECT_PATH,
  CREATE_PROJECT_SUCCESS_REVALIDATE_PATH,
  EMPTY_CREATE_PROJECT_STATE,
  formValuesToCreateInputRaw,
  mapCreateProjectErrorPresentation,
  readCheckboxField,
  readCreateProjectFormValues,
} from "./create-form";
export type {
  CreateProjectActionState,
  CreateProjectFieldErrors,
  CreateProjectFieldKey,
  CreateProjectFormValues,
  FormValuesToCreateInputResult,
} from "./create-form";

export { projectsDetailCopy } from "./detail-copy";
export type { ProjectsDetailCopy } from "./detail-copy";
export { parseProjectIdParam } from "./detail-params";
export type { ParseProjectIdResult } from "./detail-params";
export {
  formatProjectAgeRange,
  isTerminalProjectStatus,
  projectResidentLabel,
  projectTransitionActionLabel,
  projectsDetailErrorBehavior,
  projectsTransitionErrorMessage,
  toProjectDetailView,
} from "./detail-view-model";
export type {
  ProjectDetailView,
  ProjectLifecycleActionView,
} from "./detail-view-model";
export {
  EMPTY_TRANSITION_PROJECT_STATE,
  isProjectStatusValue,
  mapTransitionProjectErrorPresentation,
  readTransitionFormFields,
  transitionOwnerDeniedState,
} from "./detail-transition";
export type {
  TransitionFormFields,
  TransitionProjectActionState,
} from "./detail-transition";
