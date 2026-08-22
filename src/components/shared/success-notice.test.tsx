import React from "react";
import { render, screen, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SuccessNotice, SUCCESS_NOTICE_DISMISS_MS } from "./SuccessNotice";

const MESSAGE = "تمت إضافة المشارك إلى المشروع بنجاح.";
const OTHER_MESSAGE = "تمت إضافة المشروع بنجاح.";

function setCurrentUrl(path: string, state: unknown = null) {
  window.history.replaceState(state, "", path);
}

function spyHistory() {
  return {
    replace: vi.spyOn(window.history, "replaceState"),
    push: vi.spyOn(window.history, "pushState"),
  };
}

describe("transient SuccessNotice", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    window.history.replaceState(null, "", "/");
  });

  it("renders the Arabic message immediately as a polite status region", () => {
    setCurrentUrl("/respondents?success=respondent_created");
    render(<SuccessNotice message={MESSAGE} />);

    const notice = screen.getByRole("status");
    expect(notice.textContent).toBe(MESSAGE);
    expect(notice.getAttribute("aria-live")).toBe("polite");
  });

  it("keeps the notice visible through 3999 ms without touching the URL", () => {
    setCurrentUrl("/respondents?success=respondent_created");
    const spies = spyHistory();
    render(<SuccessNotice message={MESSAGE} />);

    act(() => {
      vi.advanceTimersByTime(SUCCESS_NOTICE_DISMISS_MS - 1);
    });

    expect(screen.getByRole("status").textContent).toBe(MESSAGE);
    expect(window.location.search).toBe("?success=respondent_created");
    expect(spies.replace).not.toHaveBeenCalled();
    expect(spies.push).not.toHaveBeenCalled();
  });

  it("hides the notice at 4000 ms and removes only the success parameter", () => {
    setCurrentUrl("/projects/123?success=participant_assigned&tab=participants#history");
    spyHistory();
    render(<SuccessNotice message={MESSAGE} />);

    act(() => {
      vi.advanceTimersByTime(SUCCESS_NOTICE_DISMISS_MS);
    });

    expect(screen.queryByRole("status")).toBeNull();
    expect(window.location.pathname).toBe("/projects/123");
    expect(window.location.search).toBe("?tab=participants");
    expect(window.location.hash).toBe("#history");
  });

  it("preserves unrelated query parameters around the removed success parameter", () => {
    setCurrentUrl("/projects?foo=1&success=project_created&bar=2");
    render(<SuccessNotice message="تمت إضافة المشروع بنجاح." />);

    act(() => {
      vi.advanceTimersByTime(SUCCESS_NOTICE_DISMISS_MS);
    });

    expect(window.location.search).toBe("?foo=1&bar=2");
  });

  it("drops the trailing question mark when success was the only parameter", () => {
    setCurrentUrl("/projects?success=project_created");
    render(<SuccessNotice message="تمت إضافة المشروع بنجاح." />);

    act(() => {
      vi.advanceTimersByTime(SUCCESS_NOTICE_DISMISS_MS);
    });

    expect(`${window.location.pathname}${window.location.search}${window.location.hash}`).toBe("/projects");
    expect(window.location.href.includes("?")).toBe(false);
  });

  it("preserves the URL hash at dismissal", () => {
    setCurrentUrl("/projects?success=project_created#participants");
    render(<SuccessNotice message="تمت إضافة المشروع بنجاح." />);

    act(() => {
      vi.advanceTimersByTime(SUCCESS_NOTICE_DISMISS_MS);
    });

    expect(window.location.hash).toBe("#participants");
    expect(window.location.search).toBe("");
  });

  it("replaces history state without pushing a new entry and preserves existing state", () => {
    const originalState = { zamblak: "nav-state" };
    setCurrentUrl("/projects?success=project_created", originalState);
    const spies = spyHistory();
    render(<SuccessNotice message="تمت إضافة المشروع بنجاح." />);

    act(() => {
      vi.advanceTimersByTime(SUCCESS_NOTICE_DISMISS_MS);
    });

    expect(spies.push).not.toHaveBeenCalled();
    expect(spies.replace).toHaveBeenCalledTimes(1);
    expect(spies.replace.mock.calls[0][0]).toBe(originalState);
    expect(window.history.state).toBe(originalState);
  });

  it("cleans up the timer on unmount so neither state nor URL change later", () => {
    setCurrentUrl("/projects?success=project_created");
    const spies = spyHistory();
    const { unmount } = render(<SuccessNotice message="تمت إضافة المشروع بنجاح." />);

    act(() => {
      unmount();
    });
    act(() => {
      vi.advanceTimersByTime(SUCCESS_NOTICE_DISMISS_MS * 2);
    });

    expect(spies.replace).not.toHaveBeenCalled();
    expect(spies.push).not.toHaveBeenCalled();
    expect(window.location.search).toBe("?success=project_created");
  });

  it("renders nothing and creates no timer for a null message", () => {
    setCurrentUrl("/projects?success=project_created");
    const spies = spyHistory();
    const { container } = render(<SuccessNotice message={null} />);

    expect(container.firstChild).toBeNull();

    act(() => {
      vi.advanceTimersByTime(SUCCESS_NOTICE_DISMISS_MS * 2);
    });

    expect(container.firstChild).toBeNull();
    expect(spies.replace).not.toHaveBeenCalled();
    expect(window.location.search).toBe("?success=project_created");
  });

  it("never routes persistent alert feedback through auto-dismissal", () => {
    setCurrentUrl("/projects?success=project_created");
    render(
      <>
        <div role="alert">حدث خطأ أثناء الحفظ.</div>
        <SuccessNotice message="تمت إضافة المشروع بنجاح." />
      </>
    );

    act(() => {
      vi.advanceTimersByTime(SUCCESS_NOTICE_DISMISS_MS);
    });

    expect(screen.getByRole("alert").textContent).toBe("حدث خطأ أثناء الحفظ.");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows again and re-arms when a new success message arrives after dismissal", () => {
    setCurrentUrl("/projects?success=project_created");
    const { rerender } = render(<SuccessNotice message={OTHER_MESSAGE} />);

    act(() => {
      vi.advanceTimersByTime(SUCCESS_NOTICE_DISMISS_MS);
    });
    expect(screen.queryByRole("status")).toBeNull();

    window.history.replaceState(null, "", "/projects/9?success=participant_assigned");
    rerender(<SuccessNotice message={MESSAGE} />);

    expect(screen.getByRole("status").textContent).toBe(MESSAGE);

    act(() => {
      vi.advanceTimersByTime(SUCCESS_NOTICE_DISMISS_MS);
    });
    expect(screen.queryByRole("status")).toBeNull();
    expect(window.location.search).toBe("");
  });

  it("dismisses exactly once under Strict Mode double effect lifecycle", () => {
    setCurrentUrl("/respondents?success=respondent_created");
    const spies = spyHistory();
    render(
      <React.StrictMode>
        <SuccessNotice message={MESSAGE} />
      </React.StrictMode>
    );

    act(() => {
      vi.advanceTimersByTime(SUCCESS_NOTICE_DISMISS_MS);
    });

    expect(screen.queryByRole("status")).toBeNull();
    expect(spies.replace).toHaveBeenCalledTimes(1);
    expect(window.location.search).toBe("");
  });
});
