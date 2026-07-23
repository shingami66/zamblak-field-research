import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FormsFilterToolbar } from "./FormsFilterToolbar";

let mockSearchParams = new URLSearchParams();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/forms",
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("FormsFilterToolbar In-Field Date Clear Action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it("old detached 'مسح التاريخ' text link is absent", () => {
    render(
      <FormsFilterToolbar
        initialFilters={{
          submittedDateFrom: "2026-07-23",
          submittedDateTo: "2026-07-23",
        }}
      />
    );
    expect(screen.queryByText("مسح التاريخ")).toBeNull();
  });

  it("in-field clear action '× إزالة' is absent when no date parameters exist", () => {
    render(<FormsFilterToolbar initialFilters={{}} />);
    expect(screen.queryByRole("button", { name: "إزالة فلتر تاريخ الاستمارة" })).toBeNull();
  });

  it("in-field clear action appears with accessible name when matching dates exist", () => {
    render(
      <FormsFilterToolbar
        initialFilters={{
          submittedDateFrom: "2026-07-23",
          submittedDateTo: "2026-07-23",
        }}
      />
    );

    const clearButton = screen.getByRole("button", { name: "إزالة فلتر تاريخ الاستمارة" });
    expect(clearButton).toBeDefined();
    expect(clearButton.textContent).toContain("إزالة");
  });

  it("in-field clear action appears for mismatched legacy dates while date input remains empty", () => {
    render(
      <FormsFilterToolbar
        initialFilters={{
          submittedDateFrom: "2026-07-24",
          submittedDateTo: "2026-07-27",
        }}
      />
    );

    const dateInput = screen.getByLabelText("تاريخ الاستمارة") as HTMLInputElement;
    expect(dateInput.value).toBe("");
    expect(screen.getByRole("button", { name: "إزالة فلتر تاريخ الاستمارة" })).toBeDefined();
  });

  it("in-field clear action appears for from-only and to-only states", () => {
    const { unmount } = render(
      <FormsFilterToolbar
        initialFilters={{
          submittedDateFrom: "2026-07-24",
        }}
      />
    );
    expect(screen.getByRole("button", { name: "إزالة فلتر تاريخ الاستمارة" })).toBeDefined();
    unmount();

    render(
      <FormsFilterToolbar
        initialFilters={{
          submittedDateTo: "2026-07-27",
        }}
      />
    );
    expect(screen.getByRole("button", { name: "إزالة فلتر تاريخ الاستمارة" })).toBeDefined();
  });

  it("clicking in-field clear action removes both date parameters and resets page while preserving unrelated filters", () => {
    mockSearchParams = new URLSearchParams(
      "submittedDateFrom=2026-07-24&submittedDateTo=2026-07-27&code=RF-001&reviewStatus=accepted&page=3"
    );
    render(
      <FormsFilterToolbar
        initialFilters={{
          code: "RF-001",
          reviewStatus: "accepted",
          submittedDateFrom: "2026-07-24",
          submittedDateTo: "2026-07-27",
        }}
      />
    );

    const clearButton = screen.getByRole("button", { name: "إزالة فلتر تاريخ الاستمارة" });
    fireEvent.click(clearButton);

    expect(mockPush).toHaveBeenCalledWith("/forms?code=RF-001&reviewStatus=accepted");
  });

  it("selecting a date sets both submittedDateFrom and submittedDateTo to the same value and resets page", () => {
    mockSearchParams = new URLSearchParams("reviewStatus=submitted&page=2");
    render(
      <FormsFilterToolbar
        initialFilters={{
          reviewStatus: "submitted",
        }}
      />
    );

    const dateInput = screen.getByLabelText("تاريخ الاستمارة");
    fireEvent.change(dateInput, { target: { value: "2026-07-23" } });

    expect(mockPush).toHaveBeenCalledWith(
      "/forms?reviewStatus=submitted&submittedDateFrom=2026-07-23&submittedDateTo=2026-07-23"
    );
  });

  it("code typing does not navigate automatically", () => {
    render(<FormsFilterToolbar initialFilters={{}} />);
    const codeInput = screen.getByLabelText("بحث بالرمز");

    fireEvent.change(codeInput, { target: { value: "RF-999" } });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("code submit preserves structured filters and resets page", () => {
    mockSearchParams = new URLSearchParams(
      "reviewStatus=submitted&submittedDateFrom=2026-07-23&submittedDateTo=2026-07-23&page=3"
    );
    render(
      <FormsFilterToolbar
        initialFilters={{
          reviewStatus: "submitted",
          submittedDateFrom: "2026-07-23",
          submittedDateTo: "2026-07-23",
        }}
      />
    );

    const codeInput = screen.getByLabelText("بحث بالرمز");
    fireEvent.change(codeInput, { target: { value: "RF-100" } });

    const searchButton = screen.getByRole("button", { name: "بحث" });
    fireEvent.click(searchButton);

    expect(mockPush).toHaveBeenCalledWith(
      "/forms?reviewStatus=submitted&submittedDateFrom=2026-07-23&submittedDateTo=2026-07-23&code=RF-100"
    );
  });

  it("status change submits automatically", () => {
    render(<FormsFilterToolbar initialFilters={{}} />);
    const statusSelect = screen.getByLabelText("حالة المراجعة");

    fireEvent.change(statusSelect, { target: { value: "submitted" } });
    expect(mockPush).toHaveBeenCalledWith("/forms?reviewStatus=submitted");
  });

  it("no global apply or global reset buttons exist", () => {
    render(<FormsFilterToolbar initialFilters={{}} />);
    expect(screen.queryByRole("button", { name: "تطبيق الفلاتر" })).toBeNull();
    expect(screen.queryByText("إعادة تعيين الفلاتر")).toBeNull();
    expect(screen.queryByText("مسح الفلاتر")).toBeNull();
  });
});
