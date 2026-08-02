"use client";

import React, { useActionState, useState, useRef, useEffect } from "react";
import { reviewResearchFormAction, type ReviewFormActionResult } from "./actions";
import styles from "../forms.module.css";

type Props = {
  formId: string;
  formCode: string;
  reviewStatus: string;
};

type ActiveDialog = "none" | "accept" | "reject";

export function FormReviewActions({ formId, reviewStatus }: Props) {
  const [state, formAction, isPending] = useActionState<ReviewFormActionResult | null, FormData>(
    reviewResearchFormAction,
    null
  );

  const [activeDialog, setActiveDialog] = useState<ActiveDialog>("none");
  const [rejectionReason, setRejectionReason] = useState("");
  const [quotaOverrideReason, setQuotaOverrideReason] = useState("");
  const [notes, setNotes] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  // References for keyboard focus restoration
  const acceptTriggerRef = useRef<HTMLButtonElement>(null);
  const rejectTriggerRef = useRef<HTMLButtonElement>(null);
  const activeTriggerRef = useRef<HTMLButtonElement | null>(null);

  // If server returns error, show server error message
  const displayError = localError || (state && !state.ok ? state.message : null);

  // Automatically show quota override input if RPC returned quota_override_reason_required
  const needsQuotaOverride = state && !state.ok && state.code === "quota_override_reason_required";

  const closeDialog = () => {
    setActiveDialog("none");
    setLocalError(null);
    if (activeTriggerRef.current) {
      activeTriggerRef.current.focus();
      activeTriggerRef.current = null;
    }
  };

  const openDialog = (type: ActiveDialog, triggerRef: React.RefObject<HTMLButtonElement | null>) => {
    activeTriggerRef.current = triggerRef.current;
    setLocalError(null);
    setActiveDialog(type);
  };

  // Close dialog on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeDialog !== "none") {
        closeDialog();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeDialog]);

  if (reviewStatus !== "submitted") {
    return null;
  }

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (activeDialog === "reject") {
      const trimmed = rejectionReason.trim();
      if (trimmed.length < 3) {
        e.preventDefault();
        setLocalError("الرجاء إدخال سبب واضح للرفض (3 حروف على الأقل).");
        return;
      }
    }
    setLocalError(null);
  };

  return (
    <section className={styles.detailCard} aria-label="قرارات مراجعة الاستمارة">
      <h2 className={styles.detailTitle}>قرارات مراجعة الاستمارة</h2>
      <p className={styles.pageDescription} style={{ marginBottom: "1.25rem" }}>
        راجع بيانات الاستمارة، ثم اختر قبولها أو رفضها مع تسجيل سبب الرفض.
      </p>

      {displayError && (
        <div className={styles.validationError} role="alert" style={{ marginBottom: "1rem", padding: "0.75rem", backgroundColor: "#fef2f2", borderRadius: "0.5rem", border: "1px solid #fca5a5" }}>
          {displayError}
        </div>
      )}

      <div className={styles.tableActions} style={{ gap: "0.75rem", flexWrap: "wrap" }}>
        <button
          ref={acceptTriggerRef}
          type="button"
          className={styles.primaryAction}
          onClick={() => openDialog("accept", acceptTriggerRef)}
          disabled={isPending}
        >
          قبول الاستمارة
        </button>

        <button
          ref={rejectTriggerRef}
          type="button"
          className={styles.mobileActionButton}
          style={{ borderColor: "var(--color-danger)", color: "var(--color-danger)" }}
          onClick={() => openDialog("reject", rejectTriggerRef)}
          disabled={isPending}
        >
          رفض الاستمارة
        </button>
      </div>

      {/* DIALOG BACKDROP & MODAL */}
      {activeDialog !== "none" && (
        <div
          className={styles.reviewDialogBackdrop}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDialog();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            className={styles.reviewDialogPanel}
          >
            <form action={formAction} onSubmit={handleFormSubmit}>
              <input type="hidden" name="researchFormId" value={formId} />
              <input type="hidden" name="decision" value={activeDialog} />

              <h3 id="dialog-title" className={styles.detailTitle} style={{ marginBottom: "0.75rem" }}>
                {activeDialog === "accept" && "تأكيد قبول الاستمارة"}
                {activeDialog === "reject" && "تأكيد رفض الاستمارة"}
              </h3>

              {activeDialog === "accept" && (
                <div style={{ marginBottom: "1rem", fontSize: "0.9375rem", color: "var(--color-foreground)", lineHeight: "1.6" }}>
                  <p style={{ marginBottom: "0.5rem" }}>
                    سيتم قبول الاستمارة وتثبيت القيمة المستحقة تلقائياً حسب السعر المحدد للمشروع.
                  </p>

                  {(needsQuotaOverride || quotaOverrideReason) && (
                    <div className={styles.formField} style={{ marginTop: "1rem" }}>
                      <label className={styles.formLabel} htmlFor="quotaOverrideReason">
                        سبب تجاوز الحد الأقصى (الكوتا)
                      </label>
                      <input
                        id="quotaOverrideReason"
                        name="quotaOverrideReason"
                        type="text"
                        className={styles.formInput}
                        placeholder="أدخل سبب السماح بتجاوز الكوتا..."
                        value={quotaOverrideReason}
                        onChange={(e) => setQuotaOverrideReason(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}

              {activeDialog === "reject" && (
                <div style={{ marginBottom: "1rem" }}>
                  <p style={{ marginBottom: "0.75rem", fontSize: "0.9375rem", color: "var(--color-foreground)", lineHeight: "1.6" }}>
                    أدخل سبب رفض الاستمارة ليظهر في سجل المراجعة.
                  </p>
                  <div className={styles.formField}>
                    <label className={styles.formLabel} htmlFor="rejectionReason">
                      سبب الرفض <span style={{ color: "var(--color-danger)" }}>*</span>
                    </label>
                    <textarea
                      id="rejectionReason"
                      name="rejectionReason"
                      className={styles.formTextarea}
                      rows={3}
                      placeholder="أدخل سبب رفض هذه الاستمارة (3 حروف على الأقل)..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              <div className={styles.formField} style={{ marginBottom: "1.25rem" }}>
                <label className={styles.formLabel} htmlFor="notes">
                  ملاحظات إضافية (اختياري)
                </label>
                <input
                  id="notes"
                  name="notes"
                  type="text"
                  className={styles.formInput}
                  placeholder="ملاحظات تشغيلية..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className={styles.dialogActions}>
                <button
                  type="button"
                  className={styles.secondaryAction}
                  onClick={closeDialog}
                  disabled={isPending}
                >
                  تراجع
                </button>

                <button
                  type="submit"
                  className={activeDialog === "reject" ? styles.mobileActionButton : styles.primaryAction}
                  style={activeDialog === "reject" ? { backgroundColor: "var(--color-danger)", color: "#fff", borderColor: "var(--color-danger)" } : {}}
                  disabled={isPending}
                >
                  {isPending ? "جاري الحفظ..." : activeDialog === "reject" ? "تأكيد الرفض" : "تأكيد القبول"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
