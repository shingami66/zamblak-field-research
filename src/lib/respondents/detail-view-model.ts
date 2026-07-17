import { respondentsDetailCopy } from "./detail-copy";
import { formatRespondentTimestamp } from "./list-view-model";
import type {
  RespondentDetail,
  RespondentErrorCode,
  RespondentResidentType,
} from "./types";

export type RespondentDetailView = {
  respondentId: string;
  nameLabel: string;
  mobileLabel: string;
  ageLabel: string;
  nationalityLabel: string;
  residentTypeLabel: string;
  notesLabel: string;
  notesIsEmpty: boolean;
  createdAtLabel: string;
  updatedAtLabel: string;
  backHref: string;
  editHref: string;
};

/**
 * Detail-specific resident labels (same Arabic as list; sourced from detail copy).
 */
export function respondentDetailResidentLabel(
  value: RespondentResidentType
): string {
  switch (value) {
    case "saudi":
      return respondentsDetailCopy.residentSaudi;
    case "non_saudi":
      return respondentsDetailCopy.residentNonSaudi;
    case "unknown":
      return respondentsDetailCopy.residentUnknown;
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}

/**
 * Maps RespondentDetail to presentation fields only.
 * No internal columns, no mobile in hrefs.
 */
export function toRespondentDetailView(
  respondent: RespondentDetail
): RespondentDetailView {
  const hasName = Boolean(respondent.name && respondent.name.trim() !== "");
  const hasNationality = Boolean(
    respondent.nationality && respondent.nationality.trim() !== ""
  );
  const hasNotes = Boolean(respondent.notes && respondent.notes.trim() !== "");

  return {
    respondentId: respondent.respondentId,
    nameLabel: hasName ? respondent.name! : respondentsDetailCopy.unnamed,
    mobileLabel: respondent.mobile,
    ageLabel:
      respondent.age === null
        ? respondentsDetailCopy.notSpecified
        : String(respondent.age),
    nationalityLabel: hasNationality
      ? respondent.nationality!
      : respondentsDetailCopy.notSpecifiedFeminine,
    residentTypeLabel: respondentDetailResidentLabel(respondent.residentType),
    notesLabel: hasNotes
      ? respondent.notes!
      : respondentsDetailCopy.emptyNotes,
    notesIsEmpty: !hasNotes,
    createdAtLabel: formatRespondentTimestamp(respondent.createdAt),
    updatedAtLabel: formatRespondentTimestamp(respondent.updatedAt),
    backHref: "/respondents",
    editHref: `/respondents/${respondent.respondentId}/edit`,
  };
}

/**
 * Presentation outcome for detail route load errors.
 * not_found → call notFound(); access/unexpected → safe Arabic message.
 * Does not leak raw tokens or database prose.
 */
export function respondentDetailErrorBehavior(code: RespondentErrorCode): {
  kind: "not_found" | "message";
  message?: string;
} {
  if (code === "respondent_not_found") {
    return { kind: "not_found" };
  }
  if (code === "respondent_access_denied") {
    return { kind: "message", message: respondentsDetailCopy.errorAccess };
  }
  return {
    kind: "message",
    message: respondentsDetailCopy.errorUnexpected,
  };
}
