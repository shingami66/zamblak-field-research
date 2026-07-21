export type ParticipationErrorCode =
  | "participation_access_denied"
  | "project_not_found"
  | "respondent_not_found"
  | "project_not_active"
  | "duplicate_participation"
  | "invalid_project_id"
  | "invalid_respondent_id"
  | "unexpected_participation_error";

export type ParticipationWarning = {
  threeMonthWarning: boolean;
  requiresThreeMonthFlag: boolean;
  projectDomain: string | null;
  matchCount: number;
  eligibilityWarning: boolean;
  eligibilityWarningCodes: EligibilityWarningCode[];
};

export type EligibilityWarningCode =
  | "age_missing"
  | "age_below_min"
  | "age_above_max"
  | "resident_type_mismatch";

export type ParticipationListItem = {
  participationId: string;
  respondentId: string;
  respondentName: string | null;
  respondentMobile: string;
  respondentAge: number | null;
  respondentResidentType: "saudi" | "non_saudi" | "unknown";
  contactStatus: "new";
  participationDecisionStatus: "unknown";
  consentStatus: "unknown";
  whatsappStatus: "not_opened";
  formStatus: "not_started";
  createdAt: string;
  updatedAt: string;
};

export type Participation = {
  participationId: string;
  projectId: string;
  respondentId: string;
  contactStatus: "new";
  participationDecisionStatus: "unknown";
  consentStatus: "unknown";
  whatsappStatus: "not_opened";
  formStatus: "not_started";
  createdAt: string;
  updatedAt: string;
  warning: Pick<
    ParticipationWarning,
    "threeMonthWarning" | "eligibilityWarning" | "eligibilityWarningCodes"
  >;
};

export type ParticipationResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: ParticipationErrorCode };

export type ParticipationWarningRpcRow = {
  three_month_warning: unknown;
  requires_three_month_flag: unknown;
  project_domain: unknown;
  match_count: unknown;
  eligibility_warning: unknown;
  eligibility_warning_codes: unknown;
};

export type ParticipationRpcRow = {
  participation_id: unknown;
  project_id: unknown;
  respondent_id: unknown;
  contact_status: unknown;
  participation_decision_status: unknown;
  consent_status: unknown;
  whatsapp_status: unknown;
  form_status: unknown;
  created_at: unknown;
  updated_at: unknown;
  three_month_warning: unknown;
  eligibility_warning: unknown;
  eligibility_warning_codes: unknown;
};

export type ParticipationListRpcRow = Omit<
  ParticipationRpcRow,
  "project_id" | "three_month_warning" | "eligibility_warning" | "eligibility_warning_codes"
> & {
  respondent_name: unknown;
  respondent_mobile: unknown;
  respondent_age: unknown;
  respondent_resident_type: unknown;
};