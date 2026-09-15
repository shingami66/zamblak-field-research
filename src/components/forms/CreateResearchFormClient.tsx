"use client";

import React, { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createResearchFormAction } from "@/app/forms/new/actions";
import { BackLink } from "@/components/shared/BackLink";
import { generateIdempotencyKey } from "@/lib/idempotency/key";
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

interface SubmissionOperation {
  fingerprint: string;
  key: string;
}

export function CreateResearchFormClient({
  prefilledContext,
  prefilledError,
  eligibleProjects,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const submissionOperationRef = useRef<SubmissionOperation | null>(null);

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
  const hasNoAvailableParticipants =
    Boolean(selectedProjectId) && availableParticipants.length === 0;

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

    const canonicalNotes =
      typeof notes === "string" && notes.trim().length > 0
        ? notes.trim()
        : null;

    const canonicalPayload = {
      participationId: targetParticipationId,
      submittedDate: submittedDate.trim(),
      notes: canonicalNotes,
    };
    const currentFingerprint = JSON.stringify(canonicalPayload);

    let idempotencyKey: string;
    if (
      submissionOperationRef.current &&
      submissionOperationRef.current.fingerprint === currentFingerprint
    ) {
      idempotencyKey = submissionOperationRef.current.key;
    } else {
      idempotencyKey = generateIdempotencyKey();
      submissionOperationRef.current = {
        fingerprint: currentFingerprint,
        key: idempotencyKey,
      };
    }

    startTransition(async () => {
      const res = await createResearchFormAction({
        idempotencyKey,
        participationId: targetParticipationId,
        submittedDate: submittedDate.trim(),
        notes: canonicalNotes,
      });

      if (!res.ok) {
        setSubmitError(res.message);
        return;
      }

      router.push(`/forms/${res.formId}?success=create_form`);
    });
  };

  const saveDisabled =
    isPending ||
    (!prefilledContext && (!selectedProjectId || !selectedParticipationId));

  return (
    <div className={styles.createFormPage}>
      <BackLink href="/forms" className={styles.createFormBackLink}>
        العودة إلى الاستمارات
      </BackLink>

      <header className={styles.createFormIntro}>
        <h1 className={styles.createFormTitle}>تسجيل استمارة جديدة</h1>
        <p className={styles.createFormDescription}>
          اربط الاستمارة بمشارك داخل مشروع قائم، ثم أدخل تاريخ المقابلة.
        </p>
      </header>

      {prefilledError && (
        <div className={styles.createFormAlert} role="alert">
          <h2 className={styles.createFormAlertTitle}>تنبيه في البيانات الممررة</h2>
          <p className={styles.createFormAlertBody}>{prefilledError}</p>
        </div>
      )}

      {noEligibleProjects && (
        <div className={styles.createFormStatus} role="status">
          <h2 className={styles.createFormStatusTitle}>
            لا توجد مشاريع متاحة لتسجيل استمارات
          </h2>
          <p className={styles.createFormStatusBody}>
            أضف مشاركاً إلى مشروع نشط، أو راجع المشاركين الذين تم تسجيل استمارات
            لهم.
          </p>
          <Link href="/projects" className={styles.createFormSecondaryAction}>
            عرض المشاريع
          </Link>
        </div>
      )}

      {prefilledContext && (
        <section className={styles.createFormLocked}>
          <h2 className={styles.createFormLockedTitle}>سياق المشارك المحدد</h2>
          <dl className={styles.createFormLockedRows}>
            <div className={styles.createFormLockedRow}>
              <dt className={styles.createFormLockedLabel}>المشروع</dt>
              <dd className={styles.createFormLockedValue}>
                {prefilledContext.projectName}
              </dd>
            </div>
            <div className={styles.createFormLockedRow}>
              <dt className={styles.createFormLockedLabel}>المشارك</dt>
              <dd className={styles.createFormLockedValue}>
                {prefilledContext.participantName}
              </dd>
            </div>
            <div className={styles.createFormLockedRow}>
              <dt className={styles.createFormLockedLabel}>رقم الجوال</dt>
              <dd className={styles.createFormLockedValue}>
                <bdi dir="ltr">{prefilledContext.participantMobile}</bdi>
              </dd>
            </div>
          </dl>
          <Link
            href={`/projects/${prefilledContext.projectId}/participants`}
            className={styles.createFormReturnLink}
          >
            العودة لمشاركي المشروع
          </Link>
        </section>
      )}

      {!noEligibleProjects && (
        <form onSubmit={handleSubmit} className={styles.createFormCard}>
          {!prefilledContext && (
            <>
              <div className={styles.createFormField}>
                <label className={styles.createFormLabel} htmlFor="project-select">
                  المشروع <span className={styles.createFormRequired}>*</span>
                </label>
                <select
                  id="project-select"
                  className={styles.createFormControl}
                  value={selectedProjectId}
                  onChange={handleProjectChange}
                  required
                >
                  <option value="">-- اختر المشروع --</option>
                  {eligibleProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.availableCount} مشارك متاح)
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.createFormField}>
                <label
                  className={styles.createFormLabel}
                  htmlFor="participant-select"
                >
                  المشارك <span className={styles.createFormRequired}>*</span>
                </label>
                <select
                  id="participant-select"
                  className={styles.createFormControl}
                  value={selectedParticipationId}
                  onChange={handleParticipantChange}
                  disabled={
                    !selectedProjectId || availableParticipants.length === 0
                  }
                  required
                >
                  <option value="">
                    {!selectedProjectId
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
                {hasNoAvailableParticipants && (
                  <span className={styles.createFormHelperWarning}>
                    لا يوجد مشاركون متاحون لتسجيل استمارة في هذا المشروع.
                  </span>
                )}
              </div>
            </>
          )}

          <div className={styles.createFormField}>
            <label
              className={styles.createFormLabel}
              htmlFor="submitted-date-input"
            >
              تاريخ المقابلة <span className={styles.createFormRequired}>*</span>
            </label>
            <input
              id="submitted-date-input"
              type="date"
              className={styles.createFormControl}
              value={submittedDate}
              onChange={(e) => {
                setSubmittedDate(e.target.value);
                setSubmitError(null);
              }}
              required
            />
          </div>

          <div className={styles.createFormField}>
            <label className={styles.createFormLabel} htmlFor="notes-textarea">
              ملاحظات
            </label>
            <textarea
              id="notes-textarea"
              className={styles.createFormTextarea}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <span className={styles.createFormHelper}>
              أضف أي ملاحظة مهمة عن المقابلة، إن وجدت.
            </span>
          </div>

          {submitError && (
            <div className={styles.createFormError} role="alert">
              {submitError}
            </div>
          )}

          <div className={styles.createFormActions}>
            <Link href="/forms" className={styles.createFormSecondaryAction}>
              إلغاء
            </Link>
            <button
              type="submit"
              className={styles.createFormPrimaryAction}
              disabled={saveDisabled}
            >
              {isPending ? "جاري الحفظ..." : "حفظ الاستمارة"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
