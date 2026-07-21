import type { ParticipationErrorCode } from "./types";

const ERROR_TOKENS: readonly Exclude<
  ParticipationErrorCode,
  "unexpected_participation_error"
>[] = [
  "participation_access_denied",
  "duplicate_participation",
  "project_not_active",
  "invalid_respondent_id",
  "invalid_project_id",
  "respondent_not_found",
  "project_not_found",
] as const;

export function mapParticipationRpcError(error: unknown): ParticipationErrorCode {
  if (!error || typeof error !== "object") {
    return "unexpected_participation_error";
  }
  const record = error as { message?: unknown; details?: unknown; hint?: unknown };
  for (const candidate of [record.message, record.details, record.hint]) {
    if (typeof candidate === "string") {
      const normalized = candidate.toLowerCase();
      const match = ERROR_TOKENS.find((token) => normalized.includes(token));
      if (match) return match;
    }
  }
  return "unexpected_participation_error";
}