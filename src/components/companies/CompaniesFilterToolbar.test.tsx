import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CompaniesFilterToolbar } from "./CompaniesFilterToolbar";

let mockSearchParams = new URLSearchParams();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/companies",
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockCopy = {
  searchLabel: "البحث في الشركات",
  searchPlaceholder: "اسم الشركة، الشخص المسؤول...",
  searchAction: "بحث",
};

describe("CompaniesFilterToolbar Search Clear & Sync Interaction Invariants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it("q=بحث renders visible input value 'بحث'", () => {
    mockSearchParams = new URLSearchParams("q=%D8%A8%D8%AD%D8%AB");
    render(<CompaniesFilterToolbar copy={mockCopy} />);
    const searchInput = screen.getByLabelText(mockCopy.searchLabel) as HTMLInputElement;
    expect(searchInput.value).toBe("بحث");
  });

  it("changing input to empty automatically removes q and page", () => {
    mockSearchParams = new URLSearchParams("q=%D8%A8%D8%AD%D8%AB&page=3");
    render(<CompaniesFilterToolbar initialSearch="بحث" copy={mockCopy} />);

    const searchInput = screen.getByLabelText(mockCopy.searchLabel);
    fireEvent.change(searchInput, { target: { value: "" } });

    expect(mockPush).toHaveBeenCalledWith("/companies");
  });

  it("manual deletion to empty or whitespace-only automatically removes q", () => {
    mockSearchParams = new URLSearchParams("q=alpha&page=2");
    render(<CompaniesFilterToolbar initialSearch="alpha" copy={mockCopy} />);

    const searchInput = screen.getByLabelText(mockCopy.searchLabel);
    fireEvent.change(searchInput, { target: { value: "   " } });

    expect(mockPush).toHaveBeenCalledWith("/companies");
  });

  it("already-empty input with no q parameter causes no navigation when changed to empty", () => {
    mockSearchParams = new URLSearchParams();
    render(<CompaniesFilterToolbar copy={mockCopy} />);

    const searchInput = screen.getByLabelText(mockCopy.searchLabel);
    fireEvent.change(searchInput, { target: { value: "" } });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("non-empty typing alone causes no navigation", () => {
    mockSearchParams = new URLSearchParams();
    render(<CompaniesFilterToolbar copy={mockCopy} />);

    const searchInput = screen.getByLabelText(mockCopy.searchLabel);
    fireEvent.change(searchInput, { target: { value: "شركة" } });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("non-empty search requires search button click or Enter press to submit", () => {
    mockSearchParams = new URLSearchParams();
    render(<CompaniesFilterToolbar copy={mockCopy} />);

    const searchInput = screen.getByLabelText(mockCopy.searchLabel);
    fireEvent.change(searchInput, { target: { value: "شركة" } });
    expect(mockPush).not.toHaveBeenCalled();

    const searchButton = screen.getByRole("button", { name: mockCopy.searchAction });
    fireEvent.click(searchButton);

    expect(mockPush).toHaveBeenCalledWith("/companies?q=%D8%B4%D8%B1%D9%83%D8%A9");
  });

  it("produces no q= parameter or trailing ? when search is cleared", () => {
    mockSearchParams = new URLSearchParams("q=test");
    render(<CompaniesFilterToolbar initialSearch="test" copy={mockCopy} />);

    const searchInput = screen.getByLabelText(mockCopy.searchLabel);
    fireEvent.change(searchInput, { target: { value: "" } });

    expect(mockPush).toHaveBeenCalledWith("/companies");
  });
});
