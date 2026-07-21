import type { ParticipationWarning } from "@/lib/participations/types";

export type AssignmentWarningActionState = {
  status: "idle" | "error" | "ready";
  respondentId: string | null;
  warning: ParticipationWarning | null;
  formError: string | null;
};

export type CreateParticipationActionState = {
  status: "idle" | "error";
  formError: string | null;
};

export const EMPTY_ASSIGNMENT_WARNING_STATE: AssignmentWarningActionState = {
  status: "idle",
  respondentId: null,
  warning: null,
  formError: null,
};

export const EMPTY_CREATE_PARTICIPATION_STATE: CreateParticipationActionState = {
  status: "idle",
  formError: null,
};
