import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AssignRespondentForm } from "./AssignRespondentForm";
import * as actions from "@/app/projects/[projectId]/add-respondent/actions";
import { participationCopy } from "@/lib/participations/copy";

vi.mock("@/app/projects/[projectId]/add-respondent/actions", () => ({
  checkAssignmentWarningsAction: vi.fn(),
  createParticipationAction: vi.fn(),
}));

vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useActionState: vi.fn((action, initialState) => [initialState, action]),
    useTransition: () => [false, (cb: () => void) => cb()],
  };
});

vi.mock("react-dom", async () => {
  const actual = await vi.importActual<typeof import("react-dom")>("react-dom");
  return {
    ...actual,
    useFormStatus: () => ({ pending: false }),
  };
});

describe("AssignRespondentForm UX and Arabic copy", () => {
  it("renders with مشارك instead of مستجيب", () => {
    render(<AssignRespondentForm projectId="p1" respondents={[{ respondentId: "r1", name: "Ahmed", mobile: "966500000000", age: 30, nationality: "Saudi", residentType: "saudi", createdAt: "2026", updatedAt: "2026" }]} />);
    
    // Check main legend
    expect(screen.getByText("اختر المشارك")).toBeDefined();
    
    // Check CTA
    expect(screen.getByRole("button", { name: "إضافة المشارك" })).toBeDefined();
  });

  it("automatically runs warning check after participant selection", async () => {
    const mockCheck = vi.mocked(actions.checkAssignmentWarningsAction).mockResolvedValue({
      status: "ready",
      respondentId: "r1",
      warning: { threeMonthWarning: true, eligibilityWarning: false, eligibilityWarningCodes: [] },
      formError: null,
    });

    render(<AssignRespondentForm projectId="p1" respondents={[{ respondentId: "r1", name: "Ahmed", mobile: "966500000000", age: 30, nationality: "Saudi", residentType: "saudi", createdAt: "2026", updatedAt: "2026" }]} />);
    
    const radio = screen.getByRole("radio");
    fireEvent.click(radio);

    await waitFor(() => {
      expect(mockCheck).toHaveBeenCalled();
    });
  });

  it("warning state does not block creation (CTA is enabled)", async () => {
    vi.mocked(actions.checkAssignmentWarningsAction).mockResolvedValue({
      status: "ready",
      respondentId: "r1",
      warning: { threeMonthWarning: true, eligibilityWarning: false, eligibilityWarningCodes: [] },
      formError: null,
    });

    render(<AssignRespondentForm projectId="p1" respondents={[{ respondentId: "r1", name: "Ahmed", mobile: "966500000000", age: 30, nationality: "Saudi", residentType: "saudi", createdAt: "2026", updatedAt: "2026" }]} />);
    
    const radio = screen.getByRole("radio");
    fireEvent.click(radio);

    // After selection, the button should be enabled
    await waitFor(() => {
      const button = screen.getByRole("button", { name: "إضافة المشارك" });
      expect(button).toBeEnabled();
    });
  });

  it("keeps the newest selection when an older warning request resolves last", async () => {
    let resolveFirst: ((value: Awaited<ReturnType<typeof actions.checkAssignmentWarningsAction>>) => void) | undefined;
    let resolveSecond: ((value: Awaited<ReturnType<typeof actions.checkAssignmentWarningsAction>>) => void) | undefined;
    vi.mocked(actions.checkAssignmentWarningsAction)
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveSecond = resolve; }));

    render(<AssignRespondentForm projectId="p1" respondents={[
      { respondentId: "r1", name: "A", mobile: "966500000001", age: 30, nationality: "Saudi", residentType: "saudi", createdAt: "2026", updatedAt: "2026" },
      { respondentId: "r2", name: "B", mobile: "966500000002", age: 31, nationality: "Saudi", residentType: "saudi", createdAt: "2026", updatedAt: "2026" },
    ]} />);

    const radios = screen.getAllByRole("radio");
    fireEvent.click(radios[0]);
    fireEvent.click(radios[1]);
    resolveSecond?.({ status: "ready", respondentId: "r2", warning: { threeMonthWarning: false, eligibilityWarning: false, eligibilityWarningCodes: [] }, formError: null });
    await waitFor(() => expect(screen.getByRole("button", { name: "إضافة المشارك" })).toBeEnabled());
    resolveFirst?.({ status: "ready", respondentId: "r1", warning: { threeMonthWarning: false, eligibilityWarning: false, eligibilityWarningCodes: [] }, formError: null });
    await waitFor(() => expect(radios[1]).toBeChecked());
    expect(radios[0]).not.toBeChecked();
  });

  it("handles duplicate participation safe error", () => {
    // If the creation fails with duplicate_participation, the text should be displayed
    expect(participationCopy.errors.duplicate_participation).toBe("هذا المشارك مضاف إلى المشروع مسبقاً");
  });
});
