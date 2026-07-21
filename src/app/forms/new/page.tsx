"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePrototypeStore } from "@/lib/forms-prototype/store-context";
import {
  validateNewForm,
  computeQuotaSummary,
  formsForProject,
  formsForParticipation,
  hasAcceptedForm,
} from "@/lib/forms-prototype/domain";
import { PROTOTYPE_ERROR_MESSAGES, DEV_DEMO_NOTICE } from "@/lib/forms-prototype/copy";
import { formatDate } from "@/lib/forms-prototype/format";
import { BackLink } from "@/components/shared/BackLink";
import styles from "../forms.module.css";

export default function NewFormPage() {
  const { state, isHydrated, createForm } = usePrototypeStore();
  const router = useRouter();

  const [projectId, setProjectId] = useState("");
  const [participantId, setParticipantId] = useState("");
  const [submittedDate, setSubmittedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Selected Project and related metrics
  const selectedProjectObj = useMemo(() => {
    return state.projects.find((p) => p.id === projectId) ?? null;
  }, [state.projects, projectId]);

  const selectedCompanyObj = useMemo(() => {
    if (!selectedProjectObj) return null;
    return state.companies.find((c) => c.id === selectedProjectObj.companyId) ?? null;
  }, [state.companies, selectedProjectObj]);

  const projectQuota = useMemo(() => {
    if (!selectedProjectObj) return null;
    const prjForms = formsForProject(state.forms, projectId);
    return computeQuotaSummary(selectedProjectObj, prjForms);
  }, [state.forms, selectedProjectObj, projectId]);

  // Participants enrolled in selected project
  const enrolledParticipants = useMemo(() => {
    if (!projectId) return [];
    const pcpIds = state.participations
      .filter((p) => p.projectId === projectId)
      .map((p) => p.participantId);
    return state.participants.filter((p) => pcpIds.includes(p.id));
  }, [state.participations, state.participants, projectId]);

  const selectedParticipantObj = useMemo(() => {
    return state.participants.find((p) => p.id === participantId) ?? null;
  }, [state.participants, participantId]);

  // Existing attempt count and acceptance check
  const attemptInfo = useMemo(() => {
    if (!projectId || !participantId) return null;
    const past = formsForParticipation(state.forms, projectId, participantId);
    const hasAccepted = hasAcceptedForm(state.forms, projectId, participantId);
    return {
      count: past.length,
      hasAccepted,
    };
  }, [state.forms, projectId, participantId]);

  if (!isHydrated) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingBlock}>
          <div>جاري تحميل البيانات...</div>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const input = {
      projectId,
      participantId,
      submittedDate,
      notes: notes.trim() || null,
    };

    const validated = validateNewForm(input, {
      participations: state.participations,
      forms: state.forms,
    });

    if (!validated.ok) {
      setValidationError(PROTOTYPE_ERROR_MESSAGES[validated.code]);
      return;
    }

    createForm(input);
    // Success feedback and redirect
    router.push("/forms?success=create_form");
  };

  const isBlocked = attemptInfo?.hasAccepted ?? false;

  return (
    <div className={styles.page}>
      <header className={styles.pageIntro}>
        <div>
          <BackLink href="/forms">العودة إلى الاستمارات</BackLink>
          <h1 className={styles.pageTitle} style={{ marginTop: "0.5rem" }}>إضافة استمارة تجريبية</h1>
        </div>
      </header>

      <div className={styles.devNotice} role="status">
        <strong>تنبيه:</strong> {DEV_DEMO_NOTICE}
      </div>

      <div className={styles.formContainer}>
        <form onSubmit={handleSubmit} className={styles.formGrid}>
          <h2 className={styles.formTitle}>معلومات المحاولة الجديدة</h2>

          {validationError && (
            <div className={styles.validationError} role="alert" style={{ fontSize: "1rem", padding: "0.75rem", background: "var(--color-danger-bg)", borderRadius: "0.5rem" }}>
              {validationError}
            </div>
          )}

          {/* Project Field */}
          <div className={styles.formField}>
            <label className={styles.formLabel} htmlFor="project-select">المشروع</label>
            <select
              id="project-select"
              className={styles.formInput}
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                setParticipantId("");
                setValidationError(null);
              }}
              required
            >
              <option value="">-- اختر المشروع --</option>
              {state.projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Participant Field */}
          <div className={styles.formField}>
            <label className={styles.formLabel} htmlFor="participant-select">المشارك</label>
            <select
              id="participant-select"
              className={styles.formInput}
              value={participantId}
              onChange={(e) => {
                setParticipantId(e.target.value);
                setValidationError(null);
              }}
              disabled={!projectId}
              required
            >
              <option value="">-- اختر المشارك --</option>
              {enrolledParticipants.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Related Info Box */}
          {selectedProjectObj && (
            <div className={styles.infoBox}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>الشركة:</span>
                <span className={styles.infoValue}>{selectedCompanyObj?.name ?? "—"}</span>
              </div>
              {projectQuota && (
                <>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>حصة المشروع المستهدفة:</span>
                    <span className={styles.infoValue}>{projectQuota.targetAcceptedForms}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>الاستمارات المقبولة حالياً:</span>
                    <span className={styles.infoValue}>{projectQuota.accepted}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>المتبقي للحصة:</span>
                    <span className={styles.infoValue}>{projectQuota.remaining}</span>
                  </div>
                </>
              )}
              {selectedParticipantObj && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>جوال المشارك:</span>
                  <span className={styles.infoValue}><bdi dir="ltr">{selectedParticipantObj.mobile}</bdi></span>
                </div>
              )}
              {attemptInfo && (
                <>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>المحاولات السابقة:</span>
                    <span className={styles.infoValue}>{attemptInfo.count}</span>
                  </div>
                  {attemptInfo.hasAccepted && (
                    <div className={styles.validationError} role="alert" style={{ margin: 0, fontWeight: 700 }}>
                      {PROTOTYPE_ERROR_MESSAGES.form_duplicate_accepted}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Submission Date Field */}
          <div className={styles.formField}>
            <label className={styles.formLabel} htmlFor="submission-date">تاريخ التقديم</label>
            <input
              id="submission-date"
              type="date"
              className={styles.formInput}
              value={submittedDate}
              onChange={(e) => setSubmittedDate(e.target.value)}
              required
            />
            {submittedDate && !isNaN(new Date(submittedDate).getTime()) && (
              <span className={styles.datePreviewHelper}>
                التاريخ المحدد: <bdi dir="ltr">{formatDate(submittedDate)}</bdi>
              </span>
            )}
          </div>

          {/* Notes Field */}
          <div className={styles.formField}>
            <label className={styles.formLabel} htmlFor="form-notes">ملاحظات إضافية (اختياري)</label>
            <textarea
              id="form-notes"
              className={styles.formTextarea}
              placeholder="أي ملاحظات حول هذه المحاولة..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className={styles.formActions}>
            <Link href="/forms" className={styles.secondaryAction}>
              إلغاء
            </Link>
            <button
              type="submit"
              className={styles.primaryAction}
              disabled={isBlocked}
              style={isBlocked ? { opacity: 0.5, cursor: "not-allowed" } : {}}
            >
              تقديم الاستمارة
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
