import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import { Navigation } from "@/components/layout/Navigation";
import { PrototypeStoreProvider } from "@/lib/forms-prototype/store-context";
import NewFormPage from "@/app/forms/new/page";
import FormDetailPageClient from "@/app/forms/[formId]/FormDetailPageClient";
import ProjectFormsPageClient from "@/app/forms/projects/[projectId]/ProjectFormsPageClient";
import ParticipantFormsPageClient from "@/app/forms/participants/[participantId]/ParticipantFormsPageClient";
import CollectionsPage from "@/app/collections/page";
import NewCollectionPage from "@/app/collections/new/page";
import CollectionDetailPageClient from "@/app/collections/[collectionId]/CollectionDetailPageClient";
import FormsLayout from "@/app/forms/layout";
import CollectionsLayout from "@/app/collections/layout";
import { COLLECTION_STATE_LABELS } from "@/lib/forms-prototype/copy";

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

  it("renders NewFormPage and allows selecting projects", async () => {
    render(
      <PrototypeStoreProvider>
        <NewFormPage />
      </PrototypeStoreProvider>
    );

    await waitFor(() => {
      expect(screen.queryByLabelText("المشروع")).not.toBeNull();
    });
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
      expect(screen.queryByText("إجمالي المقبوضات")).not.toBeNull();
    });
  });

  it("renders CollectionDetailPage allocations detail", async () => {
    render(
      <PrototypeStoreProvider>
        <CollectionDetailPageClient collectionId="col-1" />
      </PrototypeStoreProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText("بيانات سند التحصيل")).not.toBeNull();
      expect(screen.queryByText("تفاصيل توزيع المبالغ")).not.toBeNull();
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
      expect(screen.queryByText("الخطوة 1: تفاصيل الدفعة")).not.toBeNull();
    });

    // Step Indicator validation
    const stepNav = screen.getByRole("navigation", { name: "خطوات تسديد التحصيل" });
    expect(stepNav).toBeDefined();

    const activeStep = screen.getByText("الخطوة 1: تفاصيل الدفعة").closest("li");
    expect(activeStep?.getAttribute("aria-current")).toBe("step");

    const inactiveStep = screen.getByText("الخطوة 2: توزيع المبلغ").closest("li");
    expect(inactiveStep?.getAttribute("aria-current")).toBeNull();

    // Primary and Secondary button order
    const primaryBtn = screen.getByRole("button", { name: "متابعة لتوزيع المبلغ" });
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
      expect(screen.queryByLabelText("الشركة المحصّل منها")).not.toBeNull();
    });

    // Fill Step 1 values to proceed to Step 2
    fireEvent.change(screen.getByLabelText("الشركة المحصّل منها"), { target: { value: "cmp-1" } });
    fireEvent.change(screen.getByLabelText("إجمالي المبلغ المحصّل (ر.س)"), { target: { value: "1000" } });
    fireEvent.change(screen.getByLabelText("طريقة الدفع"), { target: { value: "bank_transfer" } });

    fireEvent.click(screen.getByRole("button", { name: "متابعة لتوزيع المبلغ" }));

    await waitFor(() => {
      expect(screen.queryByText("الاستمارات المقبولة المعلقة بالتحصيل")).not.toBeNull();
    });

    // Step 2 Step Indicator semantics
    const step2Active = screen.getByText("الخطوة 2: توزيع المبلغ").closest("li");
    expect(step2Active?.getAttribute("aria-current")).toBe("step");

    // Check Summary Bar metrics
    expect(screen.getByText("شركة أفق للاتصالات")).toBeDefined();
    expect(screen.getByText("المبلغ المراد توزيعه")).toBeDefined();
    expect(screen.getByText("إجمالي المبلغ المخصص")).toBeDefined();
    expect(screen.getByText("المتبقي غير الموزع")).toBeDefined();

    // Desktop Table headers
    expect(screen.getByRole("columnheader", { name: "اختر" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "رمز الاستمارة" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "المشروع" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "المشارك" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "المتبقي المستحق" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "المبلغ الموزع" })).toBeDefined();

    // Verify BDI tags for LTR tokens
    const bdiElements = screen.getAllByText("FORM-2026-0001");
    const codeBdi = bdiElements.find((el) => el.tagName === "BDI");
    expect(codeBdi).toBeDefined();
    expect(codeBdi?.getAttribute("dir")).toBe("ltr");

    // RTL Action buttons order in Step 2
    const confirmBtn = screen.getByRole("button", { name: "تأكيد وحفظ التحصيل" });
    const backBtn = screen.getByRole("button", { name: "الرجوع" });
    expect(confirmBtn.compareDocumentPosition(backBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("renders collection detail page reflowed into vertical sections without row sharing", async () => {
    render(
      <PrototypeStoreProvider>
        <CollectionDetailPageClient collectionId="col-1" />
      </PrototypeStoreProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText("بيانات سند التحصيل")).not.toBeNull();
      expect(screen.queryByText("تفاصيل توزيع المبالغ")).not.toBeNull();
    });

    // Metadata card title and allocation table title
    const metaHeading = screen.getByText("بيانات سند التحصيل");
    const allocHeading = screen.getByText("تفاصيل توزيع المبالغ");

    // Metadata card heading comes before allocation heading in DOM
    expect(metaHeading.compareDocumentPosition(allocHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // Verify BDI directional isolation on amounts and codes
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
      const notice = screen.getByText("تم تسجيل التحصيل وتوزيع المبلغ بنجاح.");
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
      expect(screen.queryByText("تم تسجيل التحصيل وتوزيع المبلغ بنجاح.")).toBeNull();
    });
  });

  it("uses updated unambiguous collection allocation status copy while preserving form settlement labels", async () => {
    render(
      <PrototypeStoreProvider>
        <CollectionsPage />
      </PrototypeStoreProvider>
    );

    await waitFor(() => {
      expect(screen.queryAllByText("مبلغ السند موزع بالكامل").length).toBeGreaterThan(0);
    });

    // Form collection state labels remain intact and unchanged
    expect(COLLECTION_STATE_LABELS.uncollected).toBe("غير محصلة");
    expect(COLLECTION_STATE_LABELS.partially_collected).toBe("محصلة جزئياً");
    expect(COLLECTION_STATE_LABELS.collected).toBe("محصلة");
  });

  it("renders formatted date preview as DD/MM/YYYY under native date inputs in NewCollectionPage", async () => {
    render(
      <PrototypeStoreProvider>
        <NewCollectionPage />
      </PrototypeStoreProvider>
    );

    await waitFor(() => {
      expect(screen.queryByLabelText("تاريخ التحصيل")).not.toBeNull();
    });

    const dateInput = screen.getByLabelText("تاريخ التحصيل") as HTMLInputElement;
    // Set ISO date
    fireEvent.change(dateInput, { target: { value: "2026-07-21" } });

    // Native value is preserved as ISO
    expect(dateInput.value).toBe("2026-07-21");

    // Preview helper displays DD/MM/YYYY inside <bdi dir="ltr">
    const previewBdi = screen.getByText("21/07/2026");
    expect(previewBdi.tagName).toBe("BDI");
    expect(previewBdi.getAttribute("dir")).toBe("ltr");
    expect(screen.queryByText(/التاريخ المحدد:/)).not.toBeNull();
  });
});
