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
  return Boolean(
    element &&
      element !== document.body &&
      element !== document.documentElement &&
      element instanceof HTMLElement &&
      (element.tabIndex >= 0 || element.isContentEditable)
  );
}

export function AccountMenu({ displayName, roleLabel, avatarLabel }: AccountMenuProps) {
  const [isDesktopOpen, setIsDesktopOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const mobileDialogRef = useRef<HTMLDialogElement>(null);
  const mobileCloseRef = useRef<HTMLButtonElement>(null);
  const isOpen = isDesktopOpen || isMobileOpen;

  const restoreTriggerFocus = useCallback(() => {
    window.requestAnimationFrame(() => {
      if (!hasMeaningfulFocus(document.activeElement)) triggerRef.current?.focus();
    });
  }, []);

  const closeDesktopMenu = useCallback(() => {
    setIsDesktopOpen(false);
    restoreTriggerFocus();
  }, [restoreTriggerFocus]);

  const openMenu = useCallback(() => {
    if (window.matchMedia("(max-width: 47.9375rem)").matches) {
      mobileDialogRef.current?.showModal();
      setIsMobileOpen(true);
      window.requestAnimationFrame(() => mobileCloseRef.current?.focus());
      return;
    }
    setIsDesktopOpen((open) => !open);
  }, []);

  useEffect(() => {
    if (!isDesktopOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) closeDesktopMenu();
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDesktopMenu();
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeDesktopMenu, isDesktopOpen]);

  return (
    <div ref={rootRef} className={styles.accountMenuRoot}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.accountTrigger}
        aria-label={`${isOpen ? "إغلاق" : "فتح"} قائمة الحساب: ${displayName}، ${roleLabel}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isMobileOpen ? `${menuId}-mobile` : isDesktopOpen ? menuId : undefined}
        onClick={openMenu}
      >
        <span className={styles.userAvatar} aria-hidden="true">{avatarLabel}</span>
        <span className={styles.mobileAccountLabel}>الحساب</span>
        <span className={styles.userText}>
          <span className={styles.userName}>{displayName}</span>
          <span className={styles.userRole}>{roleLabel}</span>
        </span>
        <svg className={styles.accountChevron} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m8 10 4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isDesktopOpen ? (
        <section id={menuId} className={styles.accountPanel} role="dialog" aria-modal="false" aria-labelledby={`${menuId}-name`}>
          <div className={styles.accountSummary}>
            <span className={styles.accountPanelText}>
              <strong id={`${menuId}-name`}>{displayName}</strong>
              <span>{roleLabel}</span>
            </span>
          </div>
          <div className={styles.accountDivider} />
          <form action={logoutAction} className={styles.accountLogoutForm}>
            <button type="submit" className={styles.logoutButton}>تسجيل الخروج</button>
          </form>
        </section>
      ) : null}

      <dialog
        id={`${menuId}-mobile`}
        ref={mobileDialogRef}
        className={styles.mobileAccountDialog}
        aria-labelledby={`${menuId}-mobile-name`}
        onCancel={(event) => {
          event.preventDefault();
          mobileDialogRef.current?.close();
        }}
        onClose={() => {
          setIsMobileOpen(false);
          restoreTriggerFocus();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) mobileDialogRef.current?.close();
        }}
      >
        <div className={styles.mobileAccountDialogPanel}>
          <button ref={mobileCloseRef} type="button" className={styles.accountClose} onClick={() => mobileDialogRef.current?.close()}>
            إغلاق
          </button>
          <div className={styles.accountSummary}>
            <span className={styles.accountPanelText}>
              <strong id={`${menuId}-mobile-name`}>{displayName}</strong>
              <span>{roleLabel}</span>
            </span>
          </div>
          <div className={styles.accountDivider} />
          <form action={logoutAction} className={styles.accountLogoutForm}>
            <button type="submit" className={styles.logoutButton}>تسجيل الخروج</button>
          </form>
        </div>
      </dialog>
    </div>
  );
}
