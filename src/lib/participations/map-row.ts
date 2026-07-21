import type {
  EligibilityWarningCode,
  Participation,
  ParticipationListItem,
  ParticipationListRpcRow,
  ParticipationRpcRow,
  ParticipationWarning,
  ParticipationWarningRpcRow,
} from "./types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ELIGIBILITY_CODES = new Set<EligibilityWarningCode>([
  "age_missing",
  "age_below_min",
  "age_above_max",
  "resident_type_mismatch",
]);


function asNullableString(value: unknown): string | null | undefined {
  return value === null ? null : typeof value === "string" ? value : undefined;
}
function asNullableNonNegativeInt(value: unknown): number | null | undefined {
  return value === null ? null : typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined;
}
function asWarningCodes(value: unknown): EligibilityWarningCode[] | null {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string" && ELIGIBILITY_CODES.has(item as EligibilityWarningCode))) return null;
  return value as EligibilityWarningCode[];
}

export function mapParticipationWarningRow(row: unknown): ParticipationWarning | null {
  if (!row || typeof row !== "object") return null;
  const raw = row as ParticipationWarningRpcRow;
  const projectDomain = asNullableString(raw.project_domain);
  const codes = asWarningCodes(raw.eligibility_warning_codes);
  if (typeof raw.three_month_warning !== "boolean" || typeof raw.requires_three_month_flag !== "boolean" || projectDomain === undefined || typeof raw.match_count !== "number" || !Number.isInteger(raw.match_count) || raw.match_count < 0 || typeof raw.eligibility_warning !== "boolean" || codes === null) return null;
  return { threeMonthWarning: raw.three_month_warning, requiresThreeMonthFlag: raw.requires_three_month_flag, projectDomain, matchCount: raw.match_count, eligibilityWarning: raw.eligibility_warning, eligibilityWarningCodes: codes };
}

export function mapParticipationRow(row: unknown): Participation | null {
  if (!row || typeof row !== "object") return null;
  const raw = row as ParticipationRpcRow;
  const warningCodes = asWarningCodes(raw.eligibility_warning_codes);
  if (
    typeof raw.participation_id !== "string" ||
    !UUID_RE.test(raw.participation_id) ||
    typeof raw.project_id !== "string" ||
    !UUID_RE.test(raw.project_id) ||
    typeof raw.respondent_id !== "string" ||
    !UUID_RE.test(raw.respondent_id) ||
    typeof raw.created_at !== "string" ||
    Number.isNaN(Date.parse(raw.created_at)) ||
    typeof raw.updated_at !== "string" ||
    Number.isNaN(Date.parse(raw.updated_at)) ||
    typeof raw.three_month_warning !== "boolean" ||
    typeof raw.eligibility_warning !== "boolean" ||
    warningCodes === null ||
    raw.contact_status !== "new" ||
    raw.participation_decision_status !== "unknown" ||
    raw.consent_status !== "unknown" ||
    raw.whatsapp_status !== "not_opened" ||
    raw.form_status !== "not_started"
  ) return null;
  return { participationId: raw.participation_id, projectId: raw.project_id, respondentId: raw.respondent_id, contactStatus: raw.contact_status, participationDecisionStatus: raw.participation_decision_status, consentStatus: raw.consent_status, whatsappStatus: raw.whatsapp_status, formStatus: raw.form_status, createdAt: raw.created_at, updatedAt: raw.updated_at, warning: { threeMonthWarning: raw.three_month_warning, eligibilityWarning: raw.eligibility_warning, eligibilityWarningCodes: warningCodes } };
}

export function mapParticipationListRows(rows: unknown): ParticipationListItem[] | null {
  if (!Array.isArray(rows)) return null;
  const mapped = rows.map((row) => {
    if (!row || typeof row !== "object") return null;
    const raw = row as ParticipationListRpcRow;
    const respondentName = asNullableString(raw.respondent_name);
    const respondentMobile = typeof raw.respondent_mobile === "string" && raw.respondent_mobile !== "" ? raw.respondent_mobile : null;
    const respondentAge = asNullableNonNegativeInt(raw.respondent_age);
    const residentType = raw.respondent_resident_type;
    if (typeof raw.participation_id !== "string" || !UUID_RE.test(raw.participation_id) || typeof raw.respondent_id !== "string" || !UUID_RE.test(raw.respondent_id) || respondentName === undefined || !respondentMobile || respondentAge === undefined || typeof raw.created_at !== "string" || Number.isNaN(Date.parse(raw.created_at)) || typeof raw.updated_at !== "string" || Number.isNaN(Date.parse(raw.updated_at)) || (residentType !== "saudi" && residentType !== "non_saudi" && residentType !== "unknown") || raw.contact_status !== "new" || raw.participation_decision_status !== "unknown" || raw.consent_status !== "unknown" || raw.whatsapp_status !== "not_opened" || raw.form_status !== "not_started") return null;
    return { participationId: raw.participation_id, respondentId: raw.respondent_id, respondentName, respondentMobile, respondentAge, respondentResidentType: residentType as ParticipationListItem["respondentResidentType"], contactStatus: raw.contact_status as ParticipationListItem["contactStatus"], participationDecisionStatus: raw.participation_decision_status as ParticipationListItem["participationDecisionStatus"], consentStatus: raw.consent_status as ParticipationListItem["consentStatus"], whatsappStatus: raw.whatsapp_status as ParticipationListItem["whatsappStatus"], formStatus: raw.form_status as ParticipationListItem["formStatus"], createdAt: raw.created_at, updatedAt: raw.updated_at };
  });
  return mapped.every((row) => row !== null) ? mapped : null;
}