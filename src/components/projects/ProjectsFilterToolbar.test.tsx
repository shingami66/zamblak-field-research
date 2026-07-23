import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProjectsFilterToolbar } from "./ProjectsFilterToolbar";

let mockSearchParams = new URLSearchParams();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/projects",
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockCopy = {
  searchLabel: "البحث في المشاريع",
  searchPlaceholder: "اسم المشروع، النطاق...",
  searchAction: "بحث",
  companyFilterLabel: "الشركة",
  companyFilterAll: "كل الشركات",
  statusFilterLabel: "حالة المشروع",
  statusFilterAll: "كل الحالات",
};

const mockCompanyOptions = [
  { companyId: "comp-1", name: "شركة الأبحاث الأولى" },
  { companyId: "comp-2", name: "شركة الأبحاث الثانية" },
];

const mockStatusOptions = [
  { value: "draft", label: "مسودة" },
  { value: "active", label: "نشط" },
  { value: "closed", label: "مغلق" },
];

describe("ProjectsFilterToolbar Search Clear & Sync Interaction Invariants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it("q=بحث renders visible input value 'بحث'", () => {
    mockSearchParams = new URLSearchParams("q=%D8%A8%D8%AD%D8%AB");
    render(
      <ProjectsFilterToolbar
        companyOptions={mockCompanyOptions}
        statusOptions={mockStatusOptions}
        copy={mockCopy}
      />
    );
    const searchInput = screen.getByLabelText(mockCopy.searchLabel) as HTMLInputElement;
    expect(searchInput.value).toBe("بحث");
  });

  it("clicking/changing input to empty automatically removes q, page, and preserves company/status", () => {
    mockSearchParams = new URLSearchParams("q=%D8%A8%D8%AD%D8%AB&company=comp-1&status=active&page=3");
    render(
      <ProjectsFilterToolbar
        initialSearch="بحث"
        initialCompanyId="comp-1"
        initialStatus="active"
        companyOptions={mockCompanyOptions}
        statusOptions={mockStatusOptions}
        copy={mockCopy}
      />
    );

    const searchInput = screen.getByLabelText(mockCopy.searchLabel);
    // Simulates native clear × click or selecting text & deleting
    fireEvent.change(searchInput, { target: { value: "" } });

    expect(mockPush).toHaveBeenCalledWith("/projects?company=comp-1&status=active");
  });

  it("manual deletion to empty (or whitespace-only) automatically removes q", () => {
    mockSearchParams = new URLSearchParams("q=alpha&status=closed&page=2");
    render(
      <ProjectsFilterToolbar
        initialSearch="alpha"
        initialStatus="closed"
        companyOptions={mockCompanyOptions}
        statusOptions={mockStatusOptions}
        copy={mockCopy}
      />
    );

    const searchInput = screen.getByLabelText(mockCopy.searchLabel);
    fireEvent.change(searchInput, { target: { value: "   " } });

    expect(mockPush).toHaveBeenCalledWith("/projects?status=closed");
  });

  it("already-empty input with no q parameter causes no navigation when changed to empty", () => {
    mockSearchParams = new URLSearchParams("company=comp-1");
    render(
      <ProjectsFilterToolbar
        initialCompanyId="comp-1"
        companyOptions={mockCompanyOptions}
        statusOptions={mockStatusOptions}
        copy={mockCopy}
      />
    );

    const searchInput = screen.getByLabelText(mockCopy.searchLabel);
    fireEvent.change(searchInput, { target: { value: "" } });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("non-empty typing alone causes no navigation", () => {
    mockSearchParams = new URLSearchParams("company=comp-1");
    render(
      <ProjectsFilterToolbar
        initialCompanyId="comp-1"
        companyOptions={mockCompanyOptions}
        statusOptions={mockStatusOptions}
        copy={mockCopy}
      />
    );

    const searchInput = screen.getByLabelText(mockCopy.searchLabel);
    fireEvent.change(searchInput, { target: { value: "مشروع" } });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("non-empty search still requires search button click or Enter press to submit", () => {
    mockSearchParams = new URLSearchParams("company=comp-1");
    render(
      <ProjectsFilterToolbar
        initialCompanyId="comp-1"
        companyOptions={mockCompanyOptions}
        statusOptions={mockStatusOptions}
        copy={mockCopy}
      />
    );

    const searchInput = screen.getByLabelText(mockCopy.searchLabel);
    fireEvent.change(searchInput, { target: { value: "مشروع" } });
    expect(mockPush).not.toHaveBeenCalled();

    const searchButton = screen.getByRole("button", { name: mockCopy.searchAction });
    fireEvent.click(searchButton);

    expect(mockPush).toHaveBeenCalledWith("/projects?company=comp-1&q=%D9%85%D8%B4%D8%B1%D9%88%D8%B9");
  });

  it("produces no q= parameter or trailing ? when all filters are cleared", () => {
    mockSearchParams = new URLSearchParams("q=test");
    render(
      <ProjectsFilterToolbar
        initialSearch="test"
        companyOptions={mockCompanyOptions}
        statusOptions={mockStatusOptions}
        copy={mockCopy}
      />
    );

    const searchInput = screen.getByLabelText(mockCopy.searchLabel);
    fireEvent.change(searchInput, { target: { value: "" } });

    expect(mockPush).toHaveBeenCalledWith("/projects");
  });

  it("searchParams updates automatically synchronize the visible text input value", () => {
    const { rerender } = render(
      <ProjectsFilterToolbar
        companyOptions={mockCompanyOptions}
        statusOptions={mockStatusOptions}
        copy={mockCopy}
      />
    );

    const searchInput = screen.getByLabelText(mockCopy.searchLabel) as HTMLInputElement;
    expect(searchInput.value).toBe("");

    // Simulate router navigation / back-forward searchParams update
    mockSearchParams = new URLSearchParams("q=جديد");
    rerender(
      <ProjectsFilterToolbar
        companyOptions={mockCompanyOptions}
        statusOptions={mockStatusOptions}
        copy={mockCopy}
      />
    );

    expect(searchInput.value).toBe("جديد");
  });
});
