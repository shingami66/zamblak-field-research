import type {
  Collection,
  DemoCompany,
  DemoParticipant,
  DemoParticipation,
  DemoProject,
  FormTransition,
  PrototypeStoreState,
  ResearchForm,
  ResearchFormStatus,
} from "./types";

/**
 * Deterministic synthetic fixtures for the forms/collections prototype.
 *
 * Everything here is hand-authored and stable — there is NO randomness and NO
 * live Supabase data. `createInitialPrototypeState()` returns a fresh deep copy
 * on every call so a reset restores a clean baseline and runtime mutations can
 * never leak back into the seed.
 */

const COMPANIES: DemoCompany[] = [
  { id: "cmp-1", name: "شركة أفق للاتصالات" },
  { id: "cmp-2", name: "مؤسسة رؤية للأبحاث" },
];

const PROJECTS: DemoProject[] = [
  {
    id: "prj-1",
    companyId: "cmp-1",
    name: "مسح رضا عملاء الاتصالات",
    status: "active",
    startDate: "2026-01-10",
    endDate: "2026-08-31",
    targetAcceptedForms: 5,
    defaultAcceptedFormPrice: 120,
  },
  {
    id: "prj-2",
    companyId: "cmp-1",
    name: "دراسة تغطية الشبكة",
    status: "ended",
    startDate: "2025-09-01",
    endDate: "2026-03-15",
    targetAcceptedForms: 4,
    defaultAcceptedFormPrice: 90,
  },
  {
    id: "prj-3",
    companyId: "cmp-2",
    name: "استطلاع العادات الشرائية",
    status: "active",
    startDate: "2026-02-01",
    endDate: null,
    targetAcceptedForms: 6,
    defaultAcceptedFormPrice: 150,
  },
];

const PARTICIPANTS: DemoParticipant[] = [
  { id: "pt-1", name: "محمد العتيبي", mobile: "0501000001" },
  { id: "pt-2", name: "سارة القحطاني", mobile: "0501000002" },
  { id: "pt-3", name: "عبدالله الشهري", mobile: "0501000003" },
  { id: "pt-4", name: "نورة الدوسري", mobile: "0501000004" },
  { id: "pt-5", name: "خالد المطيري", mobile: "0501000005" },
  { id: "pt-6", name: "ريم الغامدي", mobile: "0501000006" },
  { id: "pt-7", name: "فهد الحربي", mobile: "0501000007" },
  { id: "pt-8", name: "لطيفة السبيعي", mobile: "0501000008" },
];

const PARTICIPATION_PAIRS: Array<[string, string]> = [
  ["prj-1", "pt-1"],
  ["prj-1", "pt-2"],
  ["prj-1", "pt-3"],
  ["prj-1", "pt-4"],
  ["prj-1", "pt-5"],
  ["prj-1", "pt-6"],
  ["prj-2", "pt-1"],
  ["prj-2", "pt-3"],
  ["prj-2", "pt-7"],
  ["prj-3", "pt-2"],
  ["prj-3", "pt-5"],
  ["prj-3", "pt-6"],
  ["prj-3", "pt-8"],
];

function buildParticipations(): DemoParticipation[] {
  return PARTICIPATION_PAIRS.map(([projectId, participantId], index) => ({
    id: `pcp-${index + 1}`,
    projectId,
    participantId,
  }));
}

function participationId(
  participations: readonly DemoParticipation[],
  projectId: string,
  participantId: string
): string {
  const match = participations.find(
    (item) =>
      item.projectId === projectId && item.participantId === participantId
  );
  return match ? match.id : `pcp-missing-${projectId}-${participantId}`;
}

function at(date: string): string {
  return `${date}T09:00:00.000Z`;
}

type FormSpec = {
  seq: number;
  companyId: string;
  projectId: string;
  participantId: string;
  attemptNumber: number;
  status: ResearchFormStatus;
  submittedDate: string;
  reviewedDate: string | null;
  price: number;
  rejectionReason?: string;
  notes?: string;
};

const FORM_SPECS: FormSpec[] = [
  // prj-1 (cmp-1, price 120, target 5)
  {
    seq: 1,
    companyId: "cmp-1",
    projectId: "prj-1",
    participantId: "pt-1",
    attemptNumber: 1,
    status: "accepted",
    submittedDate: "2026-02-05",
    reviewedDate: "2026-02-07",
    price: 120,
  },
  {
    seq: 2,
    companyId: "cmp-1",
    projectId: "prj-1",
    participantId: "pt-2",
    attemptNumber: 1,
    status: "accepted",
    submittedDate: "2026-02-06",
    reviewedDate: "2026-02-08",
    price: 120,
  },
  {
    seq: 3,
    companyId: "cmp-1",
    projectId: "prj-1",
    participantId: "pt-3",
    attemptNumber: 1,
    status: "rejected",
    submittedDate: "2026-02-07",
    reviewedDate: "2026-02-09",
    price: 120,
    rejectionReason: "بيانات غير مكتملة في الاستمارة",
  },
  {
    seq: 4,
    companyId: "cmp-1",
    projectId: "prj-1",
    participantId: "pt-3",
    attemptNumber: 2,
    status: "accepted",
    submittedDate: "2026-02-12",
    reviewedDate: "2026-02-14",
    price: 120,
    notes: "محاولة ثانية بعد استكمال البيانات",
  },
  {
    seq: 5,
    companyId: "cmp-1",
    projectId: "prj-1",
    participantId: "pt-4",
    attemptNumber: 1,
    status: "pending_review",
    submittedDate: "2026-02-15",
    reviewedDate: null,
    price: 120,
  },
  {
    seq: 6,
    companyId: "cmp-1",
    projectId: "prj-1",
    participantId: "pt-5",
    attemptNumber: 1,
    status: "cancelled",
    submittedDate: "2026-02-16",
    reviewedDate: "2026-02-17",
    price: 120,
  },
  {
    seq: 7,
    companyId: "cmp-1",
    projectId: "prj-1",
    participantId: "pt-6",
    attemptNumber: 1,
    status: "accepted",
    submittedDate: "2026-02-18",
    reviewedDate: "2026-02-20",
    price: 120,
  },
  {
    // Second pending attempt for pt-4 in prj-1: lets Mozfer accept one attempt
    // then observe the duplicate-acceptance block on the other.
    seq: 8,
    companyId: "cmp-1",
    projectId: "prj-1",
    participantId: "pt-4",
    attemptNumber: 2,
    status: "pending_review",
    submittedDate: "2026-02-19",
    reviewedDate: null,
    price: 120,
  },
  // prj-2 (cmp-1, price 90, ended, target 4)
  {
    seq: 9,
    companyId: "cmp-1",
    projectId: "prj-2",
    participantId: "pt-1",
    attemptNumber: 1,
    status: "accepted",
    submittedDate: "2026-01-10",
    reviewedDate: "2026-01-12",
    price: 90,
  },
  {
    seq: 10,
    companyId: "cmp-1",
    projectId: "prj-2",
    participantId: "pt-3",
    attemptNumber: 1,
    status: "accepted",
    submittedDate: "2026-01-15",
    reviewedDate: "2026-01-17",
    price: 90,
  },
  {
    seq: 11,
    companyId: "cmp-1",
    projectId: "prj-2",
    participantId: "pt-7",
    attemptNumber: 1,
    status: "rejected",
    submittedDate: "2026-01-18",
    reviewedDate: "2026-01-20",
    price: 90,
    rejectionReason: "المشارك غير مؤهل حسب شروط المشروع",
  },
  {
    seq: 12,
    companyId: "cmp-1",
    projectId: "prj-2",
    participantId: "pt-7",
    attemptNumber: 2,
    status: "pending_review",
    submittedDate: "2026-01-25",
    reviewedDate: null,
    price: 90,
  },
  // prj-3 (cmp-2, price 150, active, no end date, target 6)
  {
    seq: 13,
    companyId: "cmp-2",
    projectId: "prj-3",
    participantId: "pt-2",
    attemptNumber: 1,
    status: "accepted",
    submittedDate: "2026-02-20",
    reviewedDate: "2026-02-22",
    price: 150,
  },
  {
    seq: 14,
    companyId: "cmp-2",
    projectId: "prj-3",
    participantId: "pt-5",
    attemptNumber: 1,
    status: "accepted",
    submittedDate: "2026-02-21",
    reviewedDate: "2026-02-23",
    price: 150,
  },
  {
    seq: 15,
    companyId: "cmp-2",
    projectId: "prj-3",
    participantId: "pt-6",
    attemptNumber: 1,
    status: "pending_review",
    submittedDate: "2026-02-24",
    reviewedDate: null,
    price: 150,
  },
  {
    seq: 16,
    companyId: "cmp-2",
    projectId: "prj-3",
    participantId: "pt-8",
    attemptNumber: 1,
    status: "cancelled",
    submittedDate: "2026-02-25",
    reviewedDate: "2026-02-26",
    price: 150,
  },
];

function buildHistory(spec: FormSpec, formId: string): FormTransition[] {
  const history: FormTransition[] = [
    {
      id: `tr-${formId}-1`,
      from: null,
      to: "pending_review",
      at: at(spec.submittedDate),
      reason: null,
      note: null,
    },
  ];

  if (spec.status !== "pending_review" && spec.reviewedDate) {
    history.push({
      id: `tr-${formId}-2`,
      from: "pending_review",
      to: spec.status,
      at: at(spec.reviewedDate),
      reason: spec.rejectionReason ?? null,
      note: null,
    });
  }

  return history;
}

function buildForms(
  participations: readonly DemoParticipation[]
): ResearchForm[] {
  return FORM_SPECS.map((spec) => {
    const id = `frm-${spec.seq}`;
    const code = `FORM-2026-${String(spec.seq).padStart(4, "0")}`;
    return {
      id,
      code,
      companyId: spec.companyId,
      projectId: spec.projectId,
      participantId: spec.participantId,
      participationId: participationId(
        participations,
        spec.projectId,
        spec.participantId
      ),
      attemptNumber: spec.attemptNumber,
      submittedDate: spec.submittedDate,
      reviewedDate: spec.reviewedDate,
      status: spec.status,
      rejectionReason: spec.rejectionReason ?? null,
      notes: spec.notes ?? null,
      acceptedPriceSnapshot: spec.status === "accepted" ? spec.price : null,
      history: buildHistory(spec, id),
    };
  });
}

function buildCollections(): Collection[] {
  return [
    {
      id: "col-1",
      code: "COL-2026-0001",
      companyId: "cmp-1",
      date: "2026-03-01",
      totalAmount: 210,
      method: "bank_transfer",
      reference: "TRX-1001",
      notes: "تحصيل يغطي مشروعين لنفس الشركة",
      allocations: [
        { id: "col-1-alloc-1", formId: "frm-2", amount: 60 },
        { id: "col-1-alloc-2", formId: "frm-9", amount: 90 },
      ],
    },
    {
      id: "col-2",
      code: "COL-2026-0002",
      companyId: "cmp-1",
      date: "2026-03-10",
      totalAmount: 120,
      method: "cash",
      reference: null,
      notes: null,
      allocations: [{ id: "col-2-alloc-1", formId: "frm-4", amount: 120 }],
    },
    {
      id: "col-3",
      code: "COL-2026-0003",
      companyId: "cmp-2",
      date: "2026-03-05",
      totalAmount: 200,
      method: "cheque",
      reference: "CHQ-77",
      notes: "يتبقى رصيد غير موزّع",
      allocations: [{ id: "col-3-alloc-1", formId: "frm-14", amount: 75 }],
    },
  ];
}

/** Returns a fresh deterministic prototype baseline (deep copy every call). */
export function createInitialPrototypeState(): PrototypeStoreState {
  const participations = buildParticipations();
  return {
    version: 1,
    companies: COMPANIES.map((company) => ({ ...company })),
    projects: PROJECTS.map((project) => ({ ...project })),
    participants: PARTICIPANTS.map((participant) => ({ ...participant })),
    participations,
    forms: buildForms(participations),
    collections: buildCollections(),
  };
}
