import type { PrototypeErrorCode } from "./copy";
import type {
  Collection,
  CollectionState,
  DemoParticipant,
  DemoParticipation,
  DemoProject,
  FormTransition,
  NewCollectionInput,
  NewFormInput,
  ResearchForm,
  ResearchFormStatus,
} from "./types";

/**
 * Pure prototype domain logic. No React, no storage, no randomness. Every
 * function is deterministic given its inputs so it can be unit tested directly
 * and reused by the reducer and by view selectors without duplicating math.
 */

export type QuotaSummary = {
  targetAcceptedForms: number;
  totalAttempts: number;
  pending: number;
  accepted: number;
  rejected: number;
  cancelled: number;
  remaining: number;
  completionPercentage: number;
  overQuota: boolean;
};

export type FormFinance = {
  isReceivable: boolean;
  acceptedPriceSnapshot: number;
  allocatedAmount: number;
  outstandingAmount: number;
  collectionState: CollectionState;
};

export type CollectionTotals = {
  allocatedAmount: number;
  unallocatedAmount: number;
};

export type DomainResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: PrototypeErrorCode };

/* ------------------------------------------------------------------ */
/* Query helpers                                                       */
/* ------------------------------------------------------------------ */

export function formsForProject(
  forms: readonly ResearchForm[],
  projectId: string
): ResearchForm[] {
  return forms.filter((form) => form.projectId === projectId);
}

export function formsForParticipant(
  forms: readonly ResearchForm[],
  participantId: string
): ResearchForm[] {
  return forms.filter((form) => form.participantId === participantId);
}

export function formsForParticipation(
  forms: readonly ResearchForm[],
  projectId: string,
  participantId: string
): ResearchForm[] {
  return forms.filter(
    (form) =>
      form.projectId === projectId && form.participantId === participantId
  );
}

export function hasAcceptedForm(
  forms: readonly ResearchForm[],
  projectId: string,
  participantId: string,
  excludeFormId?: string
): boolean {
  return forms.some(
    (form) =>
      form.projectId === projectId &&
      form.participantId === participantId &&
      form.status === "accepted" &&
      form.id !== excludeFormId
  );
}

/* ------------------------------------------------------------------ */
/* Quota                                                               */
/* ------------------------------------------------------------------ */

export function computeQuotaSummary(
  project: Pick<DemoProject, "targetAcceptedForms">,
  forms: readonly ResearchForm[]
): QuotaSummary {
  const target = Math.max(project.targetAcceptedForms, 0);
  let pending = 0;
  let accepted = 0;
  let rejected = 0;
  let cancelled = 0;

  for (const form of forms) {
    switch (form.status) {
      case "pending_review":
        pending += 1;
        break;
      case "accepted":
        accepted += 1;
        break;
      case "rejected":
        rejected += 1;
        break;
      case "cancelled":
        cancelled += 1;
        break;
    }
  }

  const remaining = Math.max(target - accepted, 0);
  const completionPercentage =
    target > 0
      ? Math.min(Math.round((accepted / target) * 100), 100)
      : accepted > 0
        ? 100
        : 0;

  return {
    targetAcceptedForms: target,
    totalAttempts: forms.length,
    pending,
    accepted,
    rejected,
    cancelled,
    remaining,
    completionPercentage,
    overQuota: target > 0 && accepted > target,
  };
}

/* ------------------------------------------------------------------ */
/* Attempt numbering + code generation                                 */
/* ------------------------------------------------------------------ */

export function nextAttemptNumber(
  forms: readonly ResearchForm[],
  projectId: string,
  participantId: string
): number {
  return formsForParticipation(forms, projectId, participantId).length + 1;
}

function nextSequence(codes: readonly string[], prefix: string): number {
  let max = 0;
  for (const code of codes) {
    if (!code.startsWith(prefix)) {
      continue;
    }
    const tail = code.slice(prefix.length);
    const parsed = Number.parseInt(tail, 10);
    if (Number.isFinite(parsed) && parsed > max) {
      max = parsed;
    }
  }
  return max + 1;
}

export function generateFormCode(
  forms: readonly ResearchForm[],
  year: number
): string {
  const prefix = `FORM-${year}-`;
  const seq = nextSequence(
    forms.map((form) => form.code),
    prefix
  );
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

export function generateCollectionCode(
  collections: readonly Collection[],
  year: number
): string {
  const prefix = `COL-${year}-`;
  const seq = nextSequence(
    collections.map((collection) => collection.code),
    prefix
  );
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

/* ------------------------------------------------------------------ */
/* Receivables + collection finance                                    */
/* ------------------------------------------------------------------ */

export function allocatedAmountForForm(
  collections: readonly Collection[],
  formId: string
): number {
  let total = 0;
  for (const collection of collections) {
    for (const allocation of collection.allocations) {
      if (allocation.formId === formId) {
        total += allocation.amount;
      }
    }
  }
  return total;
}

export function computeCollectionState(
  snapshot: number,
  allocated: number
): CollectionState {
  if (allocated <= 0) {
    return "uncollected";
  }
  if (allocated >= snapshot) {
    return "collected";
  }
  return "partially_collected";
}

/** Derives the receivable/collection finance for a single form. */
export function deriveFormFinance(
  form: ResearchForm,
  collections: readonly Collection[]
): FormFinance {
  if (form.status !== "accepted" || form.acceptedPriceSnapshot === null) {
    return {
      isReceivable: false,
      acceptedPriceSnapshot: 0,
      allocatedAmount: 0,
      outstandingAmount: 0,
      collectionState: "uncollected",
    };
  }

  const snapshot = form.acceptedPriceSnapshot;
  const allocated = allocatedAmountForForm(collections, form.id);
  const outstanding = Math.max(snapshot - allocated, 0);

  return {
    isReceivable: true,
    acceptedPriceSnapshot: snapshot,
    allocatedAmount: allocated,
    outstandingAmount: outstanding,
    collectionState: computeCollectionState(snapshot, allocated),
  };
}

export function computeCollectionTotals(
  collection: Pick<Collection, "totalAmount" | "allocations">
): CollectionTotals {
  const allocated = collection.allocations.reduce(
    (sum, allocation) => sum + allocation.amount,
    0
  );
  return {
    allocatedAmount: allocated,
    unallocatedAmount: Math.max(collection.totalAmount - allocated, 0),
  };
}

/* ------------------------------------------------------------------ */
/* Due date policy: project end date + 40 days                         */
/* ------------------------------------------------------------------ */

export const DUE_DATE_OFFSET_DAYS = 40;

export function computeDueDate(endDate: string | null): string | null {
  if (!endDate) {
    return null;
  }
  const base = endDate.slice(0, 10);
  const parsed = new Date(`${base}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  parsed.setUTCDate(parsed.getUTCDate() + DUE_DATE_OFFSET_DAYS);
  return parsed.toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ */
/* Project + participant summaries                                     */
/* ------------------------------------------------------------------ */

export type ProjectFinanceSummary = {
  defaultAcceptedFormPrice: number;
  acceptedValue: number;
  collectedAmount: number;
  outstandingAmount: number;
  dueDate: string | null;
};

export function computeProjectFinanceSummary(
  project: DemoProject,
  forms: readonly ResearchForm[],
  collections: readonly Collection[]
): ProjectFinanceSummary {
  let acceptedValue = 0;
  let collected = 0;
  let outstanding = 0;

  for (const form of formsForProject(forms, project.id)) {
    const finance = deriveFormFinance(form, collections);
    if (!finance.isReceivable) {
      continue;
    }
    acceptedValue += finance.acceptedPriceSnapshot;
    collected += finance.allocatedAmount;
    outstanding += finance.outstandingAmount;
  }

  return {
    defaultAcceptedFormPrice: project.defaultAcceptedFormPrice,
    acceptedValue,
    collectedAmount: collected,
    outstandingAmount: outstanding,
    dueDate: computeDueDate(project.endDate),
  };
}

export type ParticipantSummary = {
  projectCount: number;
  totalAttempts: number;
  pending: number;
  accepted: number;
  rejected: number;
  cancelled: number;
  lastActivity: string | null;
};

export function computeParticipantSummary(
  participant: Pick<DemoParticipant, "id">,
  forms: readonly ResearchForm[]
): ParticipantSummary {
  const own = formsForParticipant(forms, participant.id);
  const projectIds = new Set(own.map((form) => form.projectId));

  let pending = 0;
  let accepted = 0;
  let rejected = 0;
  let cancelled = 0;
  let lastActivity: string | null = null;

  for (const form of own) {
    switch (form.status) {
      case "pending_review":
        pending += 1;
        break;
      case "accepted":
        accepted += 1;
        break;
      case "rejected":
        rejected += 1;
        break;
      case "cancelled":
        cancelled += 1;
        break;
    }
    const activity = form.reviewedDate ?? form.submittedDate;
    if (!lastActivity || activity > lastActivity) {
      lastActivity = activity;
    }
  }

  return {
    projectCount: projectIds.size,
    totalAttempts: own.length,
    pending,
    accepted,
    rejected,
    cancelled,
    lastActivity,
  };
}

/* ------------------------------------------------------------------ */
/* Form creation + status transitions                                  */
/* ------------------------------------------------------------------ */

function makeTransition(
  id: string,
  from: ResearchFormStatus | null,
  to: ResearchFormStatus,
  at: string,
  extra?: { reason?: string | null; note?: string | null }
): FormTransition {
  return {
    id,
    from,
    to,
    at,
    reason: extra?.reason ?? null,
    note: extra?.note ?? null,
  };
}

export type ValidatedNewForm = {
  input: NewFormInput;
  attemptNumber: number;
};

/** Validates a new form attempt against participations + duplicate rules. */
export function validateNewForm(
  input: NewFormInput,
  context: {
    participations: readonly DemoParticipation[];
    forms: readonly ResearchForm[];
  }
): DomainResult<ValidatedNewForm> {
  if (!input.projectId) {
    return { ok: false, code: "form_project_required" };
  }
  if (!input.participantId) {
    return { ok: false, code: "form_participant_required" };
  }

  const participationExists = context.participations.some(
    (participation) =>
      participation.projectId === input.projectId &&
      participation.participantId === input.participantId
  );
  if (!participationExists) {
    return { ok: false, code: "form_participation_missing" };
  }

  if (
    hasAcceptedForm(context.forms, input.projectId, input.participantId)
  ) {
    return { ok: false, code: "form_duplicate_accepted" };
  }

  return {
    ok: true,
    value: {
      input,
      attemptNumber: nextAttemptNumber(
        context.forms,
        input.projectId,
        input.participantId
      ),
    },
  };
}

/** Applies an acceptance decision, snapshotting the current project price. */
export function applyAccept(
  form: ResearchForm,
  project: DemoProject,
  forms: readonly ResearchForm[],
  now: string,
  transitionId: string
): DomainResult<ResearchForm> {
  if (form.status !== "pending_review") {
    return { ok: false, code: "form_not_pending" };
  }
  if (hasAcceptedForm(forms, form.projectId, form.participantId, form.id)) {
    return { ok: false, code: "form_duplicate_accepted" };
  }

  return {
    ok: true,
    value: {
      ...form,
      status: "accepted",
      reviewedDate: now.slice(0, 10),
      acceptedPriceSnapshot: project.defaultAcceptedFormPrice,
      history: [
        ...form.history,
        makeTransition(transitionId, form.status, "accepted", now),
      ],
    },
  };
}

/** Applies a rejection decision; a meaningful reason is required. */
export function applyReject(
  form: ResearchForm,
  reason: string,
  now: string,
  transitionId: string
): DomainResult<ResearchForm> {
  if (form.status !== "pending_review") {
    return { ok: false, code: "form_not_pending" };
  }
  const trimmed = reason.trim();
  if (trimmed.length < 3) {
    return { ok: false, code: "form_reject_reason_required" };
  }

  return {
    ok: true,
    value: {
      ...form,
      status: "rejected",
      reviewedDate: now.slice(0, 10),
      rejectionReason: trimmed,
      history: [
        ...form.history,
        makeTransition(transitionId, form.status, "rejected", now, {
          reason: trimmed,
        }),
      ],
    },
  };
}

/** Applies a cancellation decision. */
export function applyCancel(
  form: ResearchForm,
  now: string,
  transitionId: string
): DomainResult<ResearchForm> {
  if (form.status !== "pending_review") {
    return { ok: false, code: "form_not_pending" };
  }

  return {
    ok: true,
    value: {
      ...form,
      status: "cancelled",
      reviewedDate: now.slice(0, 10),
      history: [
        ...form.history,
        makeTransition(transitionId, form.status, "cancelled", now),
      ],
    },
  };
}

/* ------------------------------------------------------------------ */
/* Collection + allocation validation                                  */
/* ------------------------------------------------------------------ */

/** Validates a whole new collection draft including every allocation. */
export function validateCollectionDraft(
  input: NewCollectionInput,
  context: {
    forms: readonly ResearchForm[];
    collections: readonly Collection[];
  }
): DomainResult<NewCollectionInput> {
  if (!input.companyId) {
    return { ok: false, code: "collection_company_required" };
  }
  if (!input.date) {
    return { ok: false, code: "collection_date_required" };
  }
  if (!input.method) {
    return { ok: false, code: "collection_method_required" };
  }
  if (!(input.totalAmount > 0)) {
    return { ok: false, code: "collection_total_positive" };
  }

  const seen = new Set<string>();
  let allocatedTotal = 0;

  for (const allocation of input.allocations) {
    if (!(allocation.amount > 0)) {
      return { ok: false, code: "allocation_amount_positive" };
    }
    if (seen.has(allocation.formId)) {
      return { ok: false, code: "allocation_duplicate_form" };
    }
    seen.add(allocation.formId);

    const form = context.forms.find((item) => item.id === allocation.formId);
    if (!form || form.status !== "accepted") {
      return { ok: false, code: "allocation_form_not_accepted" };
    }
    if (form.companyId !== input.companyId) {
      return { ok: false, code: "allocation_cross_company" };
    }

    const finance = deriveFormFinance(form, context.collections);
    if (allocation.amount > finance.outstandingAmount) {
      return { ok: false, code: "allocation_exceeds_form_outstanding" };
    }

    allocatedTotal += allocation.amount;
  }

  if (allocatedTotal > input.totalAmount) {
    return { ok: false, code: "allocation_exceeds_collection_total" };
  }

  return { ok: true, value: input };
}
