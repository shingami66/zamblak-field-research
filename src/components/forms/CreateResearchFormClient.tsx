"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createResearchFormAction } from "@/app/forms/new/actions";
import { BackLink } from "@/components/shared/BackLink";
import styles from "@/app/forms/forms.module.css";

export type EligibleParticipant = {
  participationId: string;
  respondentId: string;
  name: string;
  mobile: string;
};

export type EligibleProject = {
  id: string;
  name: string;
  availableCount: number;
  participants: EligibleParticipant[];
};

export type PrefilledContext = {
  projectId: string;
  projectName: string;
  participationId: string;
  participantName: string;
  participantMobile: string;
};

type Props = {
  prefilledContext: PrefilledContext | null;
  prefilledError: string | null;
  eligibleProjects: EligibleProject[];
};

export function CreateResearchFormClient({
  prefilledContext,
  prefilledError,
  eligibleProjects,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedProjectId, setSelectedProjectId] = useState(
    prefilledContext?.projectId ?? ""
  );
  const [selectedParticipationId, setSelectedParticipationId] = useState(
    prefilledContext?.participationId ?? ""
  );
  const [submittedDate, setSubmittedDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const activeProject = eligibleProjects.find((p) => p.id === selectedProjectId);
  const availableParticipants = activeProject?.participants ?? [];

  const noEligibleProjects = !prefilledContext && eligibleProjects.length === 0;

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProjectId(e.target.value);
    setSelectedParticipationId("");
    setSubmitError(null);
  };

  const handleParticipantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedParticipationId(e.target.value);
    setSubmitError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const targetParticipationId = prefilledContext
      ? prefilledContext.participationId
      : selectedParticipationId;

    if (!targetParticipationId) {
      setSubmitError("الرجاء اختيار المشارك المرتبط بالمشروع.");
      return;
    }

    if (!submittedDate) {
      setSubmitError("الرجاء اختيار تاريخ المقابلة.");
      return;
    }

    startTransition(async () => {
      const res = await createResearchFormAction({
        participationId: targetParticipationId,
        submittedDate,
        notes: notes.trim() || null,
      });

      if (!res.ok) {
        setSubmitError(res.message);
        return;
      }

      router.push(`/forms/${res.formId}?success=create_form`);
    });
  };

  return (
    <div className={styles.page}>
      <BackLink href="/forms">العودة إلى الاستمارات</BackLink>

      <header className={styles.pageIntro} style={{ marginTop: "1rem" }}>
        <h1 className={styles.pageTitle}>تسجيل استمارة جديدة</h1>
        <p className={styles.pageDescription}>
          اربط الاستمارة بمشارك داخل مشروع قائم، ثم أدخل تاريخ المقابلة.
        </p>
      </header>

      {prefilledError && (
        <div className={styles.detailCard} style={{ borderColor: "#ef4444", marginBottom: "1.5rem" }} role="alert">
          <h2 style={{ color: "#dc2626", fontSize: "1.125rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            تنبيه في البيانات الممررة
          </h2>
          <p style={{ color: "var(--color-muted)", margin: 0 }}>{prefilledError}</p>
        </div>
      )}

      {noEligibleProjects && (
        <div className={styles.detailCard} style={{ marginBottom: "1.5rem", borderInlineStart: "4px solid #f59e0b" }} role="status">
          <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--color-foreground)", margin: "0 0 0.5rem 0" }}>
            لا توجد مشاريع متاحة لتسجيل استمارات
          </h2>
          <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)", margin: "0 0 1rem 0", lineHeight: 1.6 }}>
            أضف مشاركاً إلى مشروع نشط، أو راجع المشاركين الذين تم تسجيل استمارات لهم.
          </p>
          <Link href="/projects" className={styles.secondaryAction} style={{ fontSize: "0.875rem" }}>
            عرض المشاريع
          </Link>
        </div>
      )}

      {prefilledContext ? (
        /* PREFILLED LOCKED CONTEXT CARD */
        <div className={styles.detailCard} style={{ marginBottom: "1.5rem" }}>
          <h2 className={styles.detailTitle}>سياق المشارك المحدد</h2>
          <dl className={styles.descriptionList}>
            <div className={styles.descriptionRow}>
              <dt className={styles.descriptionLabel}>المشروع</dt>
              <dd className={styles.descriptionValue}>{prefilledContext.projectName}</dd>
            </div>
            <div className={styles.descriptionRow}>
              <dt className={styles.descriptionLabel}>المشارك</dt>
              <dd className={styles.descriptionValue}>{prefilledContext.participantName}</dd>
            </div>
            <div className={styles.descriptionRow}>
              <dt className={styles.descriptionLabel}>رقم الجوال</dt>
              <dd className={styles.descriptionValue}>
                <bdi dir="ltr">{prefilledContext.participantMobile}</bdi>
              </dd>
            </div>
          </dl>
          <div style={{ marginTop: "1rem" }}>
            <Link
              href={`/projects/${prefilledContext.projectId}/participants`}
              className={styles.secondaryAction}
              style={{ fontSize: "0.875rem" }}
            >
              العودة لمشاركي المشروع
            </Link>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className={styles.detailCard} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {!prefilledContext && (
          <>
            {/* STEP 1: PROJECT SELECTOR */}
            <div className={styles.formField}>
              <label className={styles.formLabel} htmlFor="project-select">
                المشروع <span className={styles.required}>*</span>
              </label>
              <select
                id="project-select"
                className={styles.rejectTextarea}
                style={{ height: "3.25rem", paddingInline: "0.875rem" }}
                value={selectedProjectId}
                onChange={handleProjectChange}
                disabled={noEligibleProjects}
                required
              >
                <option value="">
                  {noEligibleProjects
                    ? "-- لا توجد مشاريع متاحة --"
                    : "-- اختر المشروع --"}
                </option>
                {eligibleProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.availableCount} مشارك متاح)
                  </option>
                ))}
              </select>
            </div>

            {/* STEP 2: PARTICIPANT SELECTOR */}
            <div className={styles.formField}>
              <label className={styles.formLabel} htmlFor="participant-select">
                المشارك <span className={styles.required}>*</span>
              </label>
              <select
                id="participant-select"
                className={styles.rejectTextarea}
                style={{ height: "3.25rem", paddingInline: "0.875rem" }}
                value={selectedParticipationId}
                onChange={handleParticipantChange}
                disabled={noEligibleProjects || !selectedProjectId || availableParticipants.length === 0}
                required
              >
                <option value="">
                  {noEligibleProjects
                    ? "-- لا يوجد مشاركون متاحون --"
                    : !selectedProjectId
                    ? "-- اختر المشروع أولاً --"
                    : availableParticipants.length === 0
                    ? "لا يوجد مشاركون متاحون لتسجيل استمارة في هذا المشروع."
                    : "-- اختر المشارك --"}
                </option>
                {availableParticipants.map((p) => (
                  <option key={p.participationId} value={p.participationId}>
                    {p.name} - {p.mobile}
                  </option>
                ))}
              </select>
              {selectedProjectId && availableParticipants.length === 0 && (
                <span style={{ fontSize: "0.875rem", color: "#92400e", marginTop: "0.25rem" }}>
                  لا يوجد مشاركون متاحون لتسجيل استمارة في هذا المشروع.
                </span>
              )}
            </div>
          </>
        )}

        {/* STEP 3: FORM DETAILS */}
        <div className={styles.formField}>
          <label className={styles.formLabel} htmlFor="submitted-date-input">
            تاريخ المقابلة <span className={styles.required}>*</span>
          </label>
          <input
            id="submitted-date-input"
            type="date"
            className={styles.rejectTextarea}
            style={{ height: "3.25rem", paddingInline: "0.875rem" }}
            value={submittedDate}
            onChange={(e) => {
              setSubmittedDate(e.target.value);
              setSubmitError(null);
            }}
            disabled={noEligibleProjects}
            required
          />
        </div>

        <div className={styles.formField}>
          <label className={styles.formLabel} htmlFor="notes-textarea">
            ملاحظات
          </label>
          <textarea
            id="notes-textarea"
            className={styles.rejectTextarea}
            rows={3}
            placeholder="أضف أي ملاحظة مهمة عن المقابلة، إن وجدت."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={noEligibleProjects}
          />
          <span style={{ fontSize: "0.875rem", color: "var(--color-muted)", marginTop: "0.25rem" }}>
            أضف أي ملاحظة مهمة عن المقابلة، إن وجدت.
          </span>
        </div>

        {submitError && (
          <div className={styles.validationError} role="alert" style={{ marginTop: "0.5rem" }}>
            {submitError}
          </div>
        )}

        <div className={styles.dialogActions} style={{ marginTop: "0.5rem" }}>
          <Link href="/forms" className={styles.secondaryAction}>
            إلغاء
          </Link>
          <button
            type="submit"
            className={styles.primaryAction}
            disabled={
              isPending ||
              noEligibleProjects ||
              (!prefilledContext && (!selectedProjectId || !selectedParticipationId))
            }
          >
            {isPending ? "جاري الحفظ..." : "حفظ الاستمارة"}
          </button>
        </div>
      </form>
    </div>
  );
}
