import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createResearchFormAction } from "@/app/forms/new/actions";
import {
  CreateResearchFormClient,
  type EligibleProject,
  type PrefilledContext,
} from "./CreateResearchFormClient";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/app/forms/new/actions", () => ({
  createResearchFormAction: vi.fn(async () => ({
    ok: true,
    formId: "form-1",
  })),
}));

const projects: EligibleProject[] = [
  {
    id: "proj-1",
    name: "مشروع تجريبي",
    availableCount: 1,
    participants: [
      {
        participationId: "part-1",
        respondentId: "res-1",
        name: "سارة أحمد",
        mobile: "0555555555",
      },
    ],
  },
];

const prefilled: PrefilledContext = {
  projectId: "proj-1",
  projectName: "مشروع تجريبي",
  participationId: "part-1",
  participantName: "سارة أحمد",
  participantMobile: "0555555555",
};

describe("CreateResearchFormClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders direct-mode fields in approved order with Participant disabled until a Project is selected", () => {
    const { container } = render(
      <CreateResearchFormClient
        prefilledContext={null}
        prefilledError={null}
        eligibleProjects={projects}
      />
    );

    const labels = Array.from(container.querySelectorAll("label")).map(
      (label) => label.textContent
    );
    expect(labels).toEqual([
      "المشروع *",
      "المشارك *",
      "تاريخ المقابلة *",
      "ملاحظات",
    ]);

    const project = screen.getByLabelText(/^المشروع/) as HTMLSelectElement;
    const participant = screen.getByLabelText(/^المشارك/) as HTMLSelectElement;
    expect(participant.disabled).toBe(true);

    fireEvent.change(project, { target: { value: "proj-1" } });
    expect(participant.disabled).toBe(false);
  });

  it("displays the locked prefilled context and hides Project and Participant selectors", () => {
    render(
      <CreateResearchFormClient
        prefilledContext={prefilled}
        prefilledError={null}
        eligibleProjects={projects}
      />
    );

    expect(screen.getByText("مشروع تجريبي")).toBeDefined();
    expect(screen.getByText("سارة أحمد")).toBeDefined();
    expect(screen.getByText("0555555555")).toBeDefined();
    expect(screen.queryAllByRole("combobox")).toHaveLength(0);
    expect(
      screen.getByRole("link", { name: "العودة لمشاركي المشروع" }).getAttribute(
        "href"
      )
    ).toBe("/projects/proj-1/participants");
  });

  it("shows the status and عرض المشاريع without rendering the form when no eligible projects exist", () => {
    render(
      <CreateResearchFormClient
        prefilledContext={null}
        prefilledError={null}
        eligibleProjects={[]}
      />
    );

    expect(
      screen.getByText("لا توجد مشاريع متاحة لتسجيل استمارات")
    ).toBeDefined();
    expect(
      screen.getByRole("link", { name: "عرض المشاريع" }).getAttribute("href")
    ).toBe("/projects");
    expect(
      screen.queryByRole("button", { name: "حفظ الاستمارة" })
    ).toBeNull();
    expect(screen.queryAllByRole("combobox")).toHaveLength(0);
    expect(screen.queryByLabelText(/^تاريخ المقابلة/)).toBeNull();
  });

  it("keeps Participant disabled and Save disabled with the approved helper when the selected Project has no eligible participants", () => {
    const emptyProjects: EligibleProject[] = [
      {
        id: "proj-2",
        name: "مشروع بلا مشاركين",
        availableCount: 0,
        participants: [],
      },
    ];

    render(
      <CreateResearchFormClient
        prefilledContext={null}
        prefilledError={null}
        eligibleProjects={emptyProjects}
      />
    );

    const project = screen.getByLabelText(/^المشروع/) as HTMLSelectElement;
    fireEvent.change(project, { target: { value: "proj-2" } });

    expect(
      (screen.getByLabelText(/^المشارك/) as HTMLSelectElement).disabled
    ).toBe(true);
    expect(
      screen.getAllByText(
        "لا يوجد مشاركون متاحون لتسجيل استمارة في هذا المشروع."
      )
    ).toHaveLength(2);
    expect(
      (screen.getByRole("button", { name: "حفظ الاستمارة" }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
  });

  it("renders the invalid prefilled alert with role alert while keeping the direct form when eligible projects exist", () => {
    render(
      <CreateResearchFormClient
        prefilledContext={null}
        prefilledError="تم تسجيل استمارة لهذا المشارك في المشروع بالفعل."
        eligibleProjects={projects}
      />
    );

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("تنبيه في البيانات الممررة");
    expect(alert.textContent).toContain(
      "تم تسجيل استمارة لهذا المشارك في المشروع بالفعل."
    );
    expect(screen.queryAllByRole("combobox").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: "حفظ الاستمارة" })
    ).toBeDefined();
  });

  it("renders Cancel before Save in DOM order", () => {
    render(
      <CreateResearchFormClient
        prefilledContext={null}
        prefilledError={null}
        eligibleProjects={projects}
      />
    );

    const cancel = screen.getByRole("link", { name: "إلغاء" });
    const save = screen.getByRole("button", { name: "حفظ الاستمارة" });
    expect(cancel.compareDocumentPosition(save)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });

  it("shows the shared role alert error on client validation failure without calling the server action", async () => {
    render(
      <CreateResearchFormClient
        prefilledContext={null}
        prefilledError={null}
        eligibleProjects={projects}
      />
    );

    const project = screen.getByLabelText(/^المشروع/) as HTMLSelectElement;
    fireEvent.change(project, { target: { value: "proj-1" } });
    const form = project.closest("form") as HTMLFormElement;
    fireEvent.submit(form);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(
      "الرجاء اختيار المشارك المرتبط بالمشروع."
    );
    expect(vi.mocked(createResearchFormAction)).not.toHaveBeenCalled();
  });
});
