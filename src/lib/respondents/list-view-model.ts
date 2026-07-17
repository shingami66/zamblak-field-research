import { respondentsListCopy } from "./list-copy";
import type {
  RespondentErrorCode,
  RespondentListItem,
  RespondentResidentType,
} from "./types";

export type RespondentListItemView = {
  respondentId: string;
  nameLabel: string;
  mobileLabel: string;
  ageLabel: string;
  nationalityLabel: string;
  residentTypeLabel: string;
  updatedAtLabel: string;
  detailHref: string;
};

export function residentTypeLabel(
  value: RespondentResidentType
): string {
  switch (value) {
    case "saudi":
      return respondentsListCopy.residentSaudi;
    case "non_saudi":
      return respondentsListCopy.residentNonSaudi;
    case "unknown":
      return respondentsListCopy.residentUnknown;
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}

/**
 * Formats a timestamptz ISO string for list display (Latin digits, ar-SA).
 * Matches Companies detail timestamp precedent.
 */
export function formatRespondentTimestamp(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    return respondentsListCopy.notSpecified;
  }
  try {
    return new Intl.DateTimeFormat("ar-SA-u-nu-latn", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(ms));
  } catch {
    return respondentsListCopy.notSpecified;
  }
}

/** Maps domain list item to list UI fields (no notes, no internal columns). */
export function toRespondentListItemView(
  item: RespondentListItem
): RespondentListItemView {
  const name =
    item.name && item.name.trim() !== ""
      ? item.name
      : respondentsListCopy.unnamed;

  return {
    respondentId: item.respondentId,
    nameLabel: name,
    mobileLabel: item.mobile,
    ageLabel:
      item.age === null ? respondentsListCopy.notSpecified : String(item.age),
    nationalityLabel:
      item.nationality && item.nationality.trim() !== ""
        ? item.nationality
        : respondentsListCopy.notSpecifiedFeminine,
    residentTypeLabel: residentTypeLabel(item.residentType),
    updatedAtLabel: formatRespondentTimestamp(item.updatedAt),
    detailHref: `/respondents/${item.respondentId}`,
  };
}

export function toRespondentListItemViews(
  items: RespondentListItem[]
): RespondentListItemView[] {
  return items.map(toRespondentListItemView);
}

/** Safe Arabic messages only — never raw DB text. */
export function respondentsListErrorMessage(
  code: RespondentErrorCode
): string {
  switch (code) {
    case "respondent_access_denied":
      return respondentsListCopy.errorAccess;
    case "invalid_pagination":
      return respondentsListCopy.errorPagination;
    default:
      return respondentsListCopy.errorUnexpected;
  }
}
