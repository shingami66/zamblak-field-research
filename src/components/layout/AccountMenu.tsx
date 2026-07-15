"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { logoutAction } from "@/app/logout/actions";
import styles from "@/components/dashboard/authenticated-shell.module.css";

type AccountMenuProps = {
  displayName: string;
  roleLabel: string;
  avatarLabel: string;
};

function hasMeaningfulFocus(element: Element | null): element is HTMLElement {
  if (!element || element === document.body || element === document.documentElement) {
    return false;
  }

  return element instanceof HTMLElement && (element.tabIndex >= 0 || element.isContentEditable);
}

export function AccountMenu({
  displayName,
  roleLabel,
  avatarLabel,
}: AccountMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const closeMenu = useCallback(() => {
    setIsOpen(false);

    window.requestAnimationFrame(() => {
      if (!hasMeaningfulFocus(document.activeElement)) {
        triggerRef.current?.focus();
      }
    });
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        closeMenu();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMenu, isOpen]);

  useEffect(() => {
    if (!isOpen || !window.matchMedia("(max-width: 47.9375rem)").matches) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className={styles.accountMenuRoot}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.accountTrigger}
        aria-label={`${isOpen ? "إغلاق" : "فتح"} قائمة الحساب: ${displayName}، ${roleLabel}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className={styles.userAvatar} aria-hidden="true">
          {avatarLabel}
        </span>
        <span className={styles.mobileAccountLabel}>الحساب</span>
        <span className={styles.userText}>
          <span className={styles.userName}>{displayName}</span>
          <span className={styles.userRole}>{roleLabel}</span>
        </span>
        <svg
          className={styles.accountChevron}
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="m8 10 4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen ? (
        <>
          <div
            className={styles.accountOverlay}
            aria-hidden="true"
            onClick={() => closeMenu()}
          />
          <section
            id={menuId}
            className={styles.accountPanel}
            role="dialog"
            aria-modal="false"
            aria-labelledby={`${menuId}-name`}
          >
            <button
              type="button"
              className={styles.accountClose}
              onClick={() => closeMenu()}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="m7 7 10 10M17 7 7 17"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              <span>إغلاق</span>
            </button>

            <div className={styles.accountSummary}>
              <span className={styles.accountPanelText}>
                <strong id={`${menuId}-name`}>{displayName}</strong>
                <span>{roleLabel}</span>
              </span>
            </div>

            <div className={styles.accountDivider} />

            <form action={logoutAction} className={styles.accountLogoutForm}>
              <button type="submit" className={styles.logoutButton}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M10 17l5-5-5-5M15 12H3M14 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>تسجيل الخروج</span>
              </button>
            </form>
          </section>
        </>
      ) : null}
    </div>
  );
}
