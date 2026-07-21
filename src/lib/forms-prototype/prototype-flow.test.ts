import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeQuotaSummary,
  computeDueDate,
  computeParticipantSummary,
  validateNewForm,
  applyAccept,
  validateCollectionDraft,
} from "./domain";
import {
  formatCurrency,
  formatNumber,
  formatDate,
  formatDateTime,
  formatPhone,
  formatFormCode,
  formatCollectionCode,
} from "./format";
import type {
  NewFormInput,
  NewCollectionInput,
  ResearchForm,
  DemoProject,
  DemoParticipation,
  Collection,
} from "./types";

describe("Forms & Collections Prototype Domain Rules", () => {
  it("computes project quota summary correctly", () => {
    const project = { targetAcceptedForms: 5 } as unknown as DemoProject;
    const mockForms = [
      { status: "accepted" as const },
      { status: "accepted" as const },
      { status: "pending_review" as const },
      { status: "rejected" as const },
      { status: "cancelled" as const },
    ] as unknown as ResearchForm[];

    const summary = computeQuotaSummary(project, mockForms);
    assert.equal(summary.targetAcceptedForms, 5);
    assert.equal(summary.totalAttempts, 5);
    assert.equal(summary.pending, 1);
    assert.equal(summary.accepted, 2);
    assert.equal(summary.rejected, 1);
    assert.equal(summary.cancelled, 1);
    assert.equal(summary.remaining, 3);
    assert.equal(summary.completionPercentage, 40);
    assert.equal(summary.overQuota, false);
  });

  it("handles over-quota state", () => {
    const project = { targetAcceptedForms: 2 } as unknown as DemoProject;
    const mockForms = [
      { status: "accepted" as const },
      { status: "accepted" as const },
      { status: "accepted" as const },
    ] as unknown as ResearchForm[];

    const summary = computeQuotaSummary(project, mockForms);
    assert.equal(summary.overQuota, true);
    assert.equal(summary.remaining, 0);
  });

  it("validates new form attempts and locks duplicates", () => {
    const context = {
      participations: [{ id: "pcp-1", projectId: "prj-1", participantId: "pt-1" }] as DemoParticipation[],
      forms: [
        {
          id: "frm-1",
          code: "FORM-2026-0001",
          companyId: "cmp-1",
          projectId: "prj-1",
          participantId: "pt-1",
          attemptNumber: 1,
          status: "accepted" as const,
        },
      ] as unknown as ResearchForm[],
    };

    const inputOk: NewFormInput = {
      projectId: "prj-1",
      participantId: "pt-1",
      submittedDate: "2026-07-21",
      notes: null,
    };

    // Fails since an accepted form already exists
    const res = validateNewForm(inputOk, context);
    assert.equal(res.ok, false);
    if (!res.ok) {
      assert.equal(res.code, "form_duplicate_accepted");
    }
  });

  it("allows form attempt retry after rejection or cancellation", () => {
    const context = {
      participations: [{ id: "pcp-1", projectId: "prj-1", participantId: "pt-1" }] as DemoParticipation[],
      forms: [
        {
          id: "frm-1",
          code: "FORM-2026-0001",
          companyId: "cmp-1",
          projectId: "prj-1",
          participantId: "pt-1",
          attemptNumber: 1,
          status: "rejected" as const,
        },
      ] as unknown as ResearchForm[],
    };

    const input: NewFormInput = {
      projectId: "prj-1",
      participantId: "pt-1",
      submittedDate: "2026-07-21",
      notes: null,
    };

    const res = validateNewForm(input, context);
    assert.equal(res.ok, true);
    if (res.ok) {
      assert.equal(res.value.attemptNumber, 2);
    }
  });

  it("implements price snapshot immutability on acceptance", () => {
    const form = {
      id: "frm-1",
      projectId: "prj-1",
      participantId: "pt-1",
      status: "pending_review" as const,
      history: [],
    } as unknown as ResearchForm;

    const project = {
      id: "prj-1",
      defaultAcceptedFormPrice: 150,
    } as unknown as DemoProject;

    const res = applyAccept(form, project, [], "2026-07-21", "tr-1");
    assert.equal(res.ok, true);
    if (res.ok) {
      assert.equal(res.value.status, "accepted");
      assert.equal(res.value.acceptedPriceSnapshot, 150);
    }
  });

  it("validates collection allocation rules", () => {
    const forms = [
      {
        id: "frm-1",
        companyId: "cmp-1",
        projectId: "prj-1",
        status: "accepted" as const,
        acceptedPriceSnapshot: 100,
      },
    ] as unknown as ResearchForm[];

    const collections: Collection[] = [];

    // Correct Allocation
    const draftOk: NewCollectionInput = {
      companyId: "cmp-1",
      date: "2026-07-21",
      totalAmount: 100,
      method: "cash",
      reference: null,
      notes: null,
      allocations: [{ formId: "frm-1", amount: 80 }],
    };

    const resOk = validateCollectionDraft(draftOk, { forms, collections });
    assert.equal(resOk.ok, true);

    // Cross-company Allocation
    const draftCross: NewCollectionInput = {
      companyId: "cmp-2",
      date: "2026-07-21",
      totalAmount: 100,
      method: "cash",
      reference: null,
      notes: null,
      allocations: [{ formId: "frm-1", amount: 80 }],
    };

    const resCross = validateCollectionDraft(draftCross, { forms, collections });
    assert.equal(resCross.ok, false);
    if (!resCross.ok) {
      assert.equal(resCross.code, "allocation_cross_company");
    }

    // Over-allocation (exceeds outstanding)
    const draftOver: NewCollectionInput = {
      companyId: "cmp-1",
      date: "2026-07-21",
      totalAmount: 200,
      method: "cash",
      reference: null,
      notes: null,
      allocations: [{ formId: "frm-1", amount: 150 }],
    };

    const resOver = validateCollectionDraft(draftOver, { forms, collections });
    assert.equal(resOver.ok, false);
    if (!resOver.ok) {
      assert.equal(resOver.code, "allocation_exceeds_form_outstanding");
    }

    // Over total collection limit
    const draftTotal: NewCollectionInput = {
      companyId: "cmp-1",
      date: "2026-07-21",
      totalAmount: 50,
      method: "cash",
      reference: null,
      notes: null,
      allocations: [{ formId: "frm-1", amount: 80 }],
    };

    const resTotal = validateCollectionDraft(draftTotal, { forms, collections });
    assert.equal(resTotal.ok, false);
    if (!resTotal.ok) {
      assert.equal(resTotal.code, "allocation_exceeds_collection_total");
    }
  });

  it("calculates due date at project end + 40 days", () => {
    const end = "2026-05-10";
    const due = computeDueDate(end);
    assert.equal(due, "2026-06-19"); // May has 31 days. May 10 + 40 days = June 19.

    // Missing end date
    assert.equal(computeDueDate(null), null);
  });

  it("computes participant summary correctly", () => {
    const forms = [
      { projectId: "prj-1", participantId: "pt-1", status: "accepted", submittedDate: "2026-02-01" },
      { projectId: "prj-1", participantId: "pt-1", status: "rejected", submittedDate: "2026-02-02" },
      { projectId: "prj-2", participantId: "pt-1", status: "pending_review", submittedDate: "2026-02-03" },
    ] as unknown as ResearchForm[];

    const summary = computeParticipantSummary({ id: "pt-1" }, forms);
    assert.equal(summary.projectCount, 2);
    assert.equal(summary.totalAttempts, 3);
    assert.equal(summary.accepted, 1);
    assert.equal(summary.pending, 1);
    assert.equal(summary.rejected, 1);
  });

  it("formats stable visual formatting values deterministically", () => {
    assert.equal(formatCurrency(120), "120 ر.س");
    assert.equal(formatCurrency(960), "960 ر.س");
    assert.equal(formatNumber(16), "16");
    assert.equal(formatNumber(12500), "12,500");
    assert.equal(formatDate("2026-02-05"), "05/02/2026");
    assert.equal(formatDateTime("2026-02-05T06:45:00.000Z"), "05/02/2026 6:45 ص");
    assert.equal(formatPhone("966599887766"), "966599887766");
    assert.equal(formatFormCode("FORM-2026-0001"), "FORM-2026-0001");
    assert.equal(formatCollectionCode("COL-2026-0001"), "COL-2026-0001");
  });
});
