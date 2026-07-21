/**
 * Isolated frontend-only prototype domain types.
 *
 * These types describe deterministic in-browser prototype records only. They are
 * never persisted to Supabase and must never be mixed with live operational data.
 * Internal `id` fields are routing/keying handles only and must not be rendered
 * in the product UI; human-readable `code` fields are the visible identifiers.
 */

export type ResearchFormStatus =
  | "pending_review"
  | "accepted"
  | "rejected"
  | "cancelled";

export type CollectionMethod =
  | "bank_transfer"
  | "cash"
  | "cheque";

export type CollectionState =
  | "uncollected"
  | "partially_collected"
  | "collected";

/** Read-only reference company for the prototype (never a live Supabase row). */
export type DemoCompany = {
  id: string;
  name: string;
};

/** Read-only reference project carrying its own quota + default price config. */
export type DemoProject = {
  id: string;
  companyId: string;
  name: string;
  status: "active" | "ended";
  startDate: string | null;
  endDate: string | null;
  /** Target number of accepted forms (quota). */
  targetAcceptedForms: number;
  /** Default accepted-form price snapshotted at acceptance. */
  defaultAcceptedFormPrice: number;
};

/** Read-only reference participant. */
export type DemoParticipant = {
  id: string;
  name: string;
  mobile: string;
};

/** Conceptual participation: a participant enrolled in a project. */
export type DemoParticipation = {
  id: string;
  projectId: string;
  participantId: string;
};

/** One transition entry in a form's audit-style history. */
export type FormTransition = {
  id: string;
  from: ResearchFormStatus | null;
  to: ResearchFormStatus;
  at: string;
  reason?: string | null;
  note?: string | null;
};

/**
 * A single research form attempt.
 *
 * `acceptedPriceSnapshot` is copied from the project at acceptance and is
 * immutable afterwards. Collected/outstanding/collection-state values are
 * derived from collection allocations at read time (see domain functions), not
 * stored here, to keep a single source of truth.
 */
export type ResearchForm = {
  id: string;
  code: string;
  companyId: string;
  projectId: string;
  participantId: string;
  participationId: string;
  attemptNumber: number;
  submittedDate: string;
  reviewedDate: string | null;
  status: ResearchFormStatus;
  rejectionReason: string | null;
  notes: string | null;
  acceptedPriceSnapshot: number | null;
  history: FormTransition[];
};

/** An explicit allocation of a collection amount to one accepted form. */
export type CollectionAllocation = {
  id: string;
  formId: string;
  amount: number;
};

/** Money received from one company, optionally allocated to accepted forms. */
export type Collection = {
  id: string;
  code: string;
  companyId: string;
  date: string;
  totalAmount: number;
  method: CollectionMethod;
  reference: string | null;
  notes: string | null;
  allocations: CollectionAllocation[];
};

/** The full isolated prototype store state. */
export type PrototypeStoreState = {
  version: 1;
  companies: DemoCompany[];
  projects: DemoProject[];
  participants: DemoParticipant[];
  participations: DemoParticipation[];
  forms: ResearchForm[];
  collections: Collection[];
};

/** Payload for creating a new pending form attempt. */
export type NewFormInput = {
  projectId: string;
  participantId: string;
  submittedDate: string;
  notes: string | null;
};

/** Payload for creating a new collection with explicit allocations. */
export type NewCollectionInput = {
  companyId: string;
  date: string;
  totalAmount: number;
  method: CollectionMethod;
  reference: string | null;
  notes: string | null;
  allocations: Array<{ formId: string; amount: number }>;
};

/** All supported prototype store actions (pure, reducer-driven). */
export type PrototypeStoreAction =
  | { type: "hydrate"; state: PrototypeStoreState }
  | { type: "reset" }
  | { type: "create_form"; input: NewFormInput; now: string }
  | { type: "accept_form"; formId: string; now: string }
  | { type: "reject_form"; formId: string; reason: string; now: string }
  | { type: "cancel_form"; formId: string; now: string }
  | { type: "create_collection"; input: NewCollectionInput; now: string };
