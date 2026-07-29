import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import { Navigation } from "@/components/layout/Navigation";
import { PrototypeStoreProvider } from "@/lib/forms-prototype/store-context";
import { CreateResearchFormClient } from "@/components/forms/CreateResearchFormClient";
import FormDetailPageClient from "@/app/forms/[formId]/FormDetailPageClient";
import ProjectFormsPageClient from "@/app/forms/projects/[projectId]/ProjectFormsPageClient";
import ParticipantFormsPageClient from "@/app/forms/participants/[participantId]/ParticipantFormsPageClient";
import CollectionsPage from "@/app/collections/page";
import NewCollectionPage from "@/app/collections/new/page";
import CollectionDetailPageClient from "@/app/collections/[collectionId]/CollectionDetailPageClient";
import FormsLayout from "@/app/forms/layout";
import CollectionsLayout from "@/app/collections/layout";

let mockSearchParams = new URLSearchParams();

// Mock Next.js Navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/forms",
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  redirect: vi.fn((url) => {
    throw new Error(`Redirected to ${url}`);
  }),
}));

// Mock Auth Sessions
vi.mock("@/lib/auth/session", () => ({
  requireAppSession: vi.fn(),
}));

import { requireAppSession, type AppSession } from "@/lib/auth/session";

describe("Role and Navigation Gates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it("Owner sees the Forms navigation option", () => {
    render(<Navigation role="owner" />);
    expect(screen.queryByText("الاستمارات")).not.toBeNull();
  });

  it("Support Helper does NOT see the Forms navigation option", () => {
    render(<Navigation role="support_helper" />);
    expect(screen.queryByText("الاستمارات")).toBeNull();
  });

  it("FormsLayout gates access and redirects Support Helper", async () => {
    vi.mocked(requireAppSession).mockResolvedValue({
      user: { id: "u-1" },
      profile: { role: "support_helper", name: "Helper" },
    } as unknown as AppSession);

    await expect(FormsLayout({ children: <div /> })).rejects.toThrow("Redirected to /forbidden");
  });

  it("CollectionsLayout gates access and redirects Support Helper", async () => {
    vi.mocked(requireAppSession).mockResolvedValue({
      user: { id: "u-1" },
      profile: { role: "support_helper", name: "Helper" },
    } as unknown as AppSession);

    await expect(CollectionsLayout({ children: <div /> })).rejects.toThrow("Redirected to /forbidden");
  });

  it("FormsLayout allows access for Owner", async () => {
    vi.mocked(requireAppSession).mockResolvedValue({
      user: { id: "u-1" },
      profile: { role: "owner", name: "Owner User" },
    } as unknown as AppSession);

    const res = await FormsLayout({ children: <div data-testid="child" /> });
    expect(res).toBeDefined();
  });
});

describe("UI Components & Content Safeguards", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
  });

  it("renders FormDetailPageClient with DEV/DEMO warning and no raw IDs", async () => {
    render(
      <PrototypeStoreProvider>
        <FormDetailPageClient formId="frm-1" />
      </PrototypeStoreProvider>
    );

    // Wait for hydration
    await waitFor(() => {
      expect(screen.queryByText(/بيانات تجريبية للعرض فقط/)).not.toBeNull();
    });

    // Code matches but not internal database IDs
    expect(screen.queryAllByText("FORM-2026-0001").length).toBeGreaterThan(0);
    expect(screen.queryByText("frm-1")).toBeNull();
  });

  it("renders CreateResearchFormClient and allows selecting projects", async () => {
    render(
      <CreateResearchFormClient
        prefilledContext={null}
        prefilledError={null}
        eligibleProjects={[
          {
            id: "prj-1",
            name: "مشروع بحث ميداني",
            availableCount: 1,
            participants: [
              {
                participationId: "pt-1",
                respondentId: "rsp-1",
                name: "علي أحمد",
                mobile: "0501234567",
              },
            ],
          },
        ]}
      />
    );

    await waitFor(() => {
      expect(screen.queryByLabelText(/المشروع/)).not.toBeNull();
    });
    expect(screen.getByText(/مشروع بحث ميداني/)).toBeDefined();
    expect(screen.queryByLabelText(/رمز الاستمارة/)).toBeNull();
    expect(screen.queryByLabelText(/السعر المقبول/)).toBeNull();
  });

  it("displays prefilled locked context card when prefilledContext is provided", async () => {
    render(
      <CreateResearchFormClient
        prefilledContext={{
          projectId: "prj-1",
          projectName: "مشروع الصحة الرياضية",
          participationId: "pt-1",
          participantName: "خالد سعيد",
          participantMobile: "0559988776",
        }}
        prefilledError={null}
        eligibleProjects={[]}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText("سياق المشارك المحدد")).not.toBeNull();
    });

    expect(screen.getByText("مشروع الصحة الرياضية")).toBeDefined();
    expect(screen.getByText("خالد سعيد")).toBeDefined();
    expect(screen.getByText("0559988776")).toBeDefined();
  });

  it("renders deliberate empty state when no eligible projects exist and disables inputs", async () => {
    render(
      <CreateResearchFormClient
        prefilledContext={null}
        prefilledError={null}
        eligibleProjects={[]}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText("لا توجد مشاريع متاحة لتسجيل استمارات")).not.toBeNull();
    });

    expect(
      screen.getByText("أضف مشاركاً إلى مشروع نشط، أو راجع المشاركين الذين تم تسجيل استمارات لهم.")
    ).toBeDefined();

    const projectSelect = screen.getByLabelText(/المشروع/) as HTMLSelectElement;
    expect(projectSelect.disabled).toBe(true);

    const participantSelect = screen.getByLabelText(/المشارك/) as HTMLSelectElement;
    expect(participantSelect.disabled).toBe(true);

    const submitBtn = screen.getByRole("button", { name: "حفظ الاستمارة" }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);

    expect(screen.getByText("عرض المشاريع")).toBeDefined();
  });

  it("renders ProjectFormsPage with progress values", async () => {
    render(
      <PrototypeStoreProvider>
        <ProjectFormsPageClient projectId="prj-1" />
      </PrototypeStoreProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText("متابعة الحصة المستهدفة")).not.toBeNull();
    });
  });

  it("renders ParticipantFormsPage with individual history", async () => {
    render(
      <PrototypeStoreProvider>
        <ParticipantFormsPageClient participantId="pt-1" />
      </PrototypeStoreProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText("ملخص المشاركة حسب المشروع")).not.toBeNull();
      expect(screen.queryByText("سجل المحاولات التفصيلي")).not.toBeNull();
    });
  });

  it("renders CollectionsPage and shows total metrics", async () => {
    render(
      <PrototypeStoreProvider>
        <CollectionsPage />
      </PrototypeStoreProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText("الدفعات النقدية")).not.toBeNull();
    });
  });

  it("renders CollectionDetailPage allocations detail", async () => {
    render(
      <PrototypeStoreProvider>
        <CollectionDetailPageClient collectionId="col-1" />
      </PrototypeStoreProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText("بيانات الدفعة النقدية")).not.toBeNull();
      expect(screen.queryByText("الاستمارات المدفوعة في هذه الدفعة")).not.toBeNull();
    });
  });

  it("renders ProjectFormsPage with correct progressbar and transform attributes", async () => {
    render(
      <PrototypeStoreProvider>
        <ProjectFormsPageClient projectId="prj-1" />
      </PrototypeStoreProvider>
    );

    await waitFor(() => {
      const bar = screen.getByRole("progressbar");
      expect(bar).toBeDefined();
      expect(bar.getAttribute("aria-valuenow")).toBeDefined();
      const fill = bar.firstElementChild as HTMLElement;
      expect(fill).toBeDefined();
      expect(fill.style.transform).toContain("scaleX");
    });
  });

  it("hydrates prototype store state from sessionStorage on mount", async () => {
    const mockState = {
      version: 1,
      companies: [],
      projects: [],
      participants: [],
      participations: [],
      forms: [
        {
          id: "frm-test",
          code: "FORM-TEST",
          companyId: "cmp-1",
          projectId: "prj-1",
          participantId: "pt-1",
          attemptNumber: 1,
          status: "accepted" as const,
          submittedDate: "2026-07-21",
          history: [],
          acceptedPriceSnapshot: 200,
        }
      ],
      collections: [],
    };

    window.sessionStorage.setItem("zamblak.forms-prototype.v1", JSON.stringify(mockState));

    try {
      render(
        <PrototypeStoreProvider>
          <FormDetailPageClient formId="frm-test" />
        </PrototypeStoreProvider>
      );

      await waitFor(() => {
        expect(screen.queryAllByText("FORM-TEST").length).toBeGreaterThan(0);
      });
    } finally {
      window.sessionStorage.clear();
    }
  });

  it("renders FormDetailPageClient with semantic description list, bidi isolation, and no raw IDs", async () => {
    render(
      <PrototypeStoreProvider>
        <FormDetailPageClient formId="frm-1" />
      </PrototypeStoreProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText("المعلومات التشغيلية")).not.toBeNull();
    });

    // Check description elements (dt/dd)
    const labelNode = screen.getByText("رمز الاستمارة");
    expect(labelNode.tagName).toBe("DT");

    const codeBdiNodes = screen.getAllByText("FORM-2026-0001");
    const codeBdiNode = codeBdiNodes.find(node => node.tagName === "BDI" && node.parentElement?.tagName === "DD");
    expect(codeBdiNode).toBeDefined();
    expect(codeBdiNode?.getAttribute("dir")).toBe("ltr");
    expect(codeBdiNode?.parentElement?.tagName).toBe("DD");

    // Internal ID should not be visible
    expect(screen.queryByText("frm-1")).toBeNull();
    expect(screen.queryByText("pt-1")).toBeNull();

    // Check link routes
    const projectLink = screen.getByRole("link", { name: "مسح رضا عملاء الاتصالات" });
    expect(projectLink.getAttribute("href")).toBe("/forms/projects/prj-1");
  });

  it("checks participant forms page uses general field-research copy and separate metrics", async () => {
    render(
      <PrototypeStoreProvider>
        <ParticipantFormsPageClient participantId="pt-1" />
      </PrototypeStoreProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText("ملخص المشاركة حسب المشروع")).not.toBeNull();
    });

    // Separate summary metrics checked
    expect(screen.queryAllByText("مرفوضة").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("ملغاة").length).toBeGreaterThan(0);
    expect(screen.queryByText("قيد المراجعة")).not.toBeNull();
  });
});

describe("Collections Allocation Reflow & Responsive Safeguards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it("exposes active step semantically and enforces RTL action order in Step 1", async () => {
    render(
      <PrototypeStoreProvider>
        <NewCollectionPage />
      </PrototypeStoreProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText("الخطوة 1: اختيار الشركة والمشروع")).not.toBeNull();
    });

    // Step Indicator validation
    const stepNav = screen.getByRole("navigation", { name: "خطوات تسجيل الدفعة النقدية" });
    expect(stepNav).toBeDefined();

    const activeStep = screen.getByText("الخطوة 1: اختيار الشركة والمشروع").closest("li");
    expect(activeStep?.getAttribute("aria-current")).toBe("step");

    const inactiveStep = screen.getByText("الخطوة 2: اختيار الاستمارات المدفوعة").closest("li");
    expect(inactiveStep?.getAttribute("aria-current")).toBeNull();

    // Primary and Secondary button order
    const primaryBtn = screen.getByRole("button", { name: "متابعة لاختيار الاستمارات" });
    const secondaryLink = screen.getByRole("link", { name: "إلغاء" });

    // Primary action comes first in DOM order
    expect(primaryBtn.compareDocumentPosition(secondaryLink) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("switches to wide workspace and renders desktop table & mobile cards with bidi isolation in Step 2", async () => {
    render(
      <PrototypeStoreProvider>
        <NewCollectionPage />
      </PrototypeStoreProvider>
    );

    await waitFor(() => {
      expect(screen.queryByLabelText(/الشركة/)).not.toBeNull();
    });

    // Fill Step 1 values to proceed to Step 2
    fireEvent.change(screen.getByLabelText(/الشركة/), { target: { value: "cmp-1" } });
    fireEvent.change(screen.getByLabelText(/المشروع/), { target: { value: "prj-1" } });

    fireEvent.click(screen.getByRole("button", { name: "متابعة لاختيار الاستمارات" }));

    await waitFor(() => {
      expect(screen.queryByText("الخطوة 2: اختيار الاستمارات المدفوعة")).not.toBeNull();
    });

    // Step 2 Step Indicator semantics
    const step2Active = screen.getByText("الخطوة 2: اختيار الاستمارات المدفوعة").closest("li");
    expect(step2Active?.getAttribute("aria-current")).toBe("step");

    // Check Live Summary Bar
    expect(screen.getByText("الاستمارات المحددة:")).toBeDefined();

    // Desktop Table headers
    expect(screen.getByRole("columnheader", { name: "اختر" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "رمز الاستمارة" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "المشارك" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "تاريخ القبول" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "القيمة" })).toBeDefined();

    // Verify BDI tags for LTR tokens
    const bdiElements = screen.getAllByText("FORM-2026-0001");
    const codeBdi = bdiElements.find((el) => el.tagName === "BDI");
    expect(codeBdi).toBeDefined();
    expect(codeBdi?.getAttribute("dir")).toBe("ltr");

    // RTL Action buttons order in Step 2
    const reviewBtn = screen.getByRole("button", { name: "مراجعة الدفعة" });
    const backBtn = screen.getByRole("button", { name: "العودة لاختيار المشروع" });
    expect(reviewBtn.compareDocumentPosition(backBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("renders collection detail page with cash payment data", async () => {
    render(
      <PrototypeStoreProvider>
        <CollectionDetailPageClient collectionId="col-1" />
      </PrototypeStoreProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText("بيانات الدفعة النقدية")).not.toBeNull();
    });

    const metaHeading = screen.getByText("بيانات الدفعة النقدية");
    expect(metaHeading).toBeDefined();

    // Verify BDI directional isolation on codes
    const codeBdi = screen.getAllByText("COL-2026-0001").find((el) => el.tagName === "BDI");
    expect(codeBdi).toBeDefined();
    expect(codeBdi?.getAttribute("dir")).toBe("ltr");

    // No raw internal IDs displayed
    expect(screen.queryByText("col-1")).toBeNull();
    expect(screen.queryByText("cmp-1")).toBeNull();
  });
});

describe("Collections P1 Consistency Safeguards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it("displays success notice when query parameter is exactly success=create_collection", async () => {
    mockSearchParams = new URLSearchParams("success=create_collection");

    render(
      <PrototypeStoreProvider>
        <CollectionDetailPageClient collectionId="col-1" />
      </PrototypeStoreProvider>
    );

    await waitFor(() => {
      const notice = screen.getByText("تم تسجيل الدفعة النقدية وربطها بالاستمارات المحددة.");
      expect(notice).toBeDefined();
      expect(notice.getAttribute("role")).toBe("status");
    });
  });

  it("does NOT display success notice for unknown success query parameters", async () => {
    mockSearchParams = new URLSearchParams("success=invalid_test_param");

    render(
      <PrototypeStoreProvider>
        <CollectionDetailPageClient collectionId="col-1" />
      </PrototypeStoreProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText("invalid_test_param")).toBeNull();
      expect(screen.queryByText("تم تسجيل الدفعة النقدية وربطها بالاستمارات المحددة.")).toBeNull();
    });
  });

  it("renders cash payments page title and summary cards correctly and verifies payment method absence", async () => {
    render(
      <PrototypeStoreProvider>
        <CollectionsPage />
      </PrototypeStoreProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText("الدفعات النقدية")).not.toBeNull();
    });

    expect(screen.getByText("عدد الاستمارات المدفوعة")).toBeDefined();
    expect(screen.queryByText("طريقة الدفع")).toBeNull();
    expect(screen.queryByText("نقداً")).toBeNull();
  });

  it("requires accepted form amount entry on form acceptance dialog", async () => {
    render(
      <PrototypeStoreProvider>
        <FormDetailPageClient formId="frm-5" />
      </PrototypeStoreProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText("قبول الاستمارة")).not.toBeNull();
    });

    // Open acceptance dialog
    fireEvent.click(screen.getByRole("button", { name: "قبول الاستمارة" }));

    await waitFor(() => {
      expect(screen.queryByLabelText(/قيمة الاستمارة المقبولة/)).not.toBeNull();
    });

    expect(screen.getByText("أدخل المبلغ المستحق لهذه الاستمارة بعد قبولها.")).toBeDefined();
  });
});
