import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RespondentsFilterToolbar } from "./RespondentsFilterToolbar";

const mockPush = vi.fn();
let mockSearchParamsStr = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/respondents",
  useSearchParams: () => new URLSearchParams(mockSearchParamsStr),
}));

describe("RespondentsFilterToolbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParamsStr = "";
  });

  const copy = {
    searchLabel: "بحث المشاركين",
    searchPlaceholder: "ابحث بالاسم أو الهوية أو الجوال...",
    searchAction: "بحث",
  };

  it("renders with initial value from props or searchParams", () => {
    mockSearchParamsStr = "q=أحمد";
    render(<RespondentsFilterToolbar copy={copy} />);

    const input = screen.getByLabelText("بحث المشاركين") as HTMLInputElement;
    expect(input.value).toBe("أحمد");
  });

  it("does not trigger navigation on typing non-empty text", () => {
    render(<RespondentsFilterToolbar copy={copy} />);

    const input = screen.getByLabelText("بحث المشاركين");
    fireEvent.change(input, { target: { value: "سارة" } });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("triggers search navigation when user submits form with search query", () => {
    render(<RespondentsFilterToolbar copy={copy} />);

    const input = screen.getByLabelText("بحث المشاركين");
    fireEvent.change(input, { target: { value: "سارة" } });

    const submitBtn = screen.getByRole("button", { name: "بحث" });
    fireEvent.click(submitBtn);

    expect(mockPush).toHaveBeenCalledWith("/respondents?q=%D8%B3%D8%A7%D8%B1%D8%A9");
  });

  it("automatically removes active q parameter when search text is cleared", () => {
    mockSearchParamsStr = "q=أحمد&page=2";
    render(<RespondentsFilterToolbar copy={copy} />);

    const input = screen.getByLabelText("بحث المشاركين");
    fireEvent.change(input, { target: { value: "" } });

    expect(mockPush).toHaveBeenCalledWith("/respondents");
  });
});
