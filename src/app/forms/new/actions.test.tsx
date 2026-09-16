import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockCreateClient,
  mockRequireOwnerSession,
  mockSubmitResearchForm,
} = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
  mockRequireOwnerSession: vi.fn(),
  mockSubmitResearchForm: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

vi.mock("../route-state", () => ({
  requireOwnerSession: mockRequireOwnerSession,
}));

vi.mock("@/lib/forms/rpc", () => ({
  submitResearchForm: mockSubmitResearchForm,
}));

import { createResearchFormAction } from "./actions";

const VALID_PARTICIPATION_ID = "11111111-1111-4111-8111-111111111111";
const VALID_SUBMITTED_DATE = "2026-07-23";
const VALID_KEY = "submit-form-key-12345678";

describe("New Form Server Action - Idempotency & Domain Contracts (DEC-FORM-006)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateClient.mockResolvedValue({});
    mockRequireOwnerSession.mockResolvedValue({
      user: { id: "owner-1" },
      profile: { role: "owner" },
    });
  });

  it.each(["", "short"])(
    "rejects a missing or malformed idempotency key before the RPC (%j)",
    async (idempotencyKey) => {
      const result = await createResearchFormAction({
        idempotencyKey,
        participationId: VALID_PARTICIPATION_ID,
        submittedDate: VALID_SUBMITTED_DATE,
      });

      expect(result).toEqual({
        ok: false,
        code: "invalid_input",
        message: "معرّف العملية غير صالح.",
      });
      expect(mockSubmitResearchForm).not.toHaveBeenCalled();
      expect(mockCreateClient).not.toHaveBeenCalled();
    }
  );

  it("forwards the caller key and canonical submission values on success", async () => {
    mockSubmitResearchForm.mockResolvedValue({
      ok: true,
      data: {
        research_form_id: "22222222-2222-4222-8222-222222222222",
        code: "RF-20260723-001",
        attempt_number: 1,
        review_status: "submitted",
        submitted_date: VALID_SUBMITTED_DATE,
      },
    });

    const result = await createResearchFormAction({
      idempotencyKey: VALID_KEY,
      participationId: VALID_PARTICIPATION_ID,
      submittedDate: VALID_SUBMITTED_DATE,
      notes: "  Interview completed  ",
    });

    expect(mockSubmitResearchForm).toHaveBeenCalledWith(
      {},
      {
        idempotencyKey: VALID_KEY,
        participationId: VALID_PARTICIPATION_ID,
        submittedDate: VALID_SUBMITTED_DATE,
        notes: "Interview completed",
      }
    );
    expect(result).toEqual({
      ok: true,
      formId: "22222222-2222-4222-8222-222222222222",
    });
  });

  it.each([
    ["duplicate_participation", "duplicate_form"],
    ["duplicate_accepted_form", "duplicate_form"],
    ["research_form_state_invalid", "project_not_eligible"],
    ["participation_not_eligible", "participant_not_assigned"],
  ] as const)(
    "preserves the existing %s domain mapping",
    async (rpcCode, expectedCode) => {
      mockSubmitResearchForm.mockResolvedValue({ ok: false, code: rpcCode });

      const result = await createResearchFormAction({
        idempotencyKey: VALID_KEY,
        participationId: VALID_PARTICIPATION_ID,
        submittedDate: VALID_SUBMITTED_DATE,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe(expectedCode);
    }
  );
});
