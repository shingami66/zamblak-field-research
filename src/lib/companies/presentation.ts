/**
 * Presentation metadata for Companies UI polish.
 * Does not mutate stored phone or timestamp values.
 */

/** CSS-facing hints shared by list/detail/create/edit phone surfaces. */
export const companyPhonePresentation = {
  /** HTML dir for exact digit order (not stored-value mutation). */
  dir: "ltr" as const,
  /**
   * Visual alignment: LTR digit stream, right-aligned under Arabic labels.
   * Implemented in CSS modules as direction:ltr; unicode-bidi:isolate; text-align:right.
   */
  textAlign: "right" as const,
  unicodeBidi: "isolate" as const,
} as const;

/**
 * Display text for a company phone field.
 * Preserves exact stored digits when present; never inserts spaces.
 */
export function companyPhoneDisplayText(
  phone: string | null | undefined,
  emptyFallback: string
): { text: string; isLtr: boolean } {
  const trimmed = typeof phone === "string" ? phone.trim() : "";
  if (trimmed === "") {
    return { text: emptyFallback, isLtr: false };
  }
  // Use original string (not trimmed) so stored presentation matches model.
  return { text: phone as string, isLtr: true };
}
