"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { usePrototypeStore } from "@/lib/forms-prototype/store-context";
import {
  deriveFormFinance,
  computeQuotaSummary,
  formsForProject,
} from "@/lib/forms-prototype/domain";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPhone,
  formatNumber,
} from "@/lib/forms-prototype/format";
import {
  FORM_STATUS_LABELS,
  COLLECTION_STATE_LABELS,
  DEV_DEMO_NOTICE,
  CANCEL_LABEL,
} from "@/lib/forms-prototype/copy";
import { BackLink } from "@/components/shared/BackLink";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { AccessibleDialog } from "@/components/forms-prototype/AccessibleDialog";
import styles from "../forms.module.css";
import type { CollectionState } from "@/lib/forms-prototype/types";

type Props = {
  formId: string;
};

export default function FormDetailPageClient({ formId }: Props) {
  const { state, isHydrated, acceptForm, rejectForm, cancelForm } = usePrototypeStore();

  // Find form and related data
  const form = useMemo(() => {
    return state.forms.find((f) => f.id === formId) ?? null;
  }, [state.forms, formId]);

  const project = useMemo(() => {
    if (!form) return null;
    return state.projects.find((p) => p.id === form.projectId) ?? null;
  }, [state.projects, form]);

  const company = useMemo(() => {
    if (!form) return null;
    return state.companies.find((c) => c.id === form.companyId) ?? null;
  }, [state.companies, form]);

  const participant = useMemo(() => {
    if (!form) return null;
    return state.participants.find((p) => p.id === form.participantId) ?? null;
  }, [state.participants, form]);

  // Derived financials
  const finance = useMemo(() => {
    if (!form) return null;
    return deriveFormFinance(form, state.collections);
  }, [form, state.collections]);

  // Project quota summary
  const projectQuota = useMemo(() => {
    if (!project) return null;
    const prjForms = formsForProject(state.forms, project.id);
    return computeQuotaSummary(project, prjForms);
  }, [state.forms, project]);

  // Dialog states
  const [isAcceptOpen, setIsAcceptOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  // Input states
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionError, setRejectionError] = useState<string | null>(null);

  if (!isHydrated) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingBlock}>
          <div>جاري تحميل البيانات...</div>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className={styles.page}>
        <header className={styles.pageIntro}>
          <div>
            <BackLink href="/forms">العودة إلى الاستمارات</BackLink>
            <h1 className={styles.pageTitle} style={{ marginTop: "0.5rem" }}>الاستمارة غير موجودة</h1>
          </div>
        </header>
        <div className={styles.devNotice} role="alert">
          لم يتم العثور على الاستمارة المطلوبة في البيانات التجريبية.
        </div>
      </div>
    );
  }

  const handleAccept = () => {
    acceptForm(form.id);
    setIsAcceptOpen(false);
  };

  const handleReject = (e: React.FormEvent) => {
    e.preventDefault();
    setRejectionError(null);

    const trimmed = rejectionReason.trim();
    if (trimmed.length < 3) {
      setRejectionError("الرجاء إدخال سبب واضح للرفض (لا يقل عن 3 أحرف).");
      return;
    }

    rejectForm(form.id, trimmed);
    setIsRejectOpen(false);
    setRejectionReason("");
  };

  const handleCancel = () => {
    cancelForm(form.id);
    setIsCancelOpen(false);
  };

  const isPending = form.status === "pending_review";

  return (
    <div className={styles.page}>
      <header className={styles.pageIntro}>
        <div>
          <BackLink href="/forms">العودة إلى الاستمارات</BackLink>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.5rem" }}>
            <h1 className={styles.pageTitle}>استمارة: <bdi dir="ltr">{form.code}</bdi></h1>
            <StatusBadge
              variant={
                form.status === "accepted"
                  ? "active"
                  : form.status === "pending_review"
                  ? "warning"
                  : form.status === "rejected"
                  ? "danger"
                  : "neutral"
              }
            >
              {FORM_STATUS_LABELS[form.status]}
            </StatusBadge>
          </div>
        </div>
      </header>

      <div className={styles.devNotice} role="status">
        <strong>تنبيه:</strong> {DEV_DEMO_NOTICE}
      </div>

      <div className={styles.detailGrid}>
        {/* Main Columns (Operational & Timeline) */}
        <div className={styles.detailRows} style={{ gap: "1.5rem" }}>
          {/* Operational Information description-list */}
          <div className={styles.detailCard}>
            <h2 className={styles.detailTitle}>المعلومات التشغيلية</h2>
            <dl className={styles.descriptionList}>
              <div className={styles.descriptionRow}>
                <dt className={styles.descriptionLabel}>رمز الاستمارة</dt>
                <dd className={styles.descriptionValue}><bdi dir="ltr">{form.code}</bdi></dd>
              </div>
              <div className={styles.descriptionRow}>
                <dt className={styles.descriptionLabel}>المشروع</dt>
                <dd className={styles.descriptionValue}>
                  {project ? (
                    <Link href={`/forms/projects/${project.id}`} className={styles.textLink}>
                      {project.name}
                    </Link>
                  ) : "—"}
                </dd>
              </div>
              <div className={styles.descriptionRow}>
                <dt className={styles.descriptionLabel}>الشركة</dt>
                <dd className={styles.descriptionValue}>{company?.name ?? "—"}</dd>
              </div>
              <div className={styles.descriptionRow}>
                <dt className={styles.descriptionLabel}>المشارك</dt>
                <dd className={styles.descriptionValue}>
                  {participant ? (
                    <Link href={`/forms/participants/${participant.id}`} className={styles.textLink}>
                      {participant.name}
                    </Link>
                  ) : "—"}
                </dd>
              </div>
              <div className={styles.descriptionRow}>
                <dt className={styles.descriptionLabel}>جوال المشارك</dt>
                <dd className={styles.descriptionValue}><bdi dir="ltr">{formatPhone(participant?.mobile ?? null)}</bdi></dd>
              </div>
              <div className={styles.descriptionRow}>
                <dt className={styles.descriptionLabel}>رقم المحاولة</dt>
                <dd className={styles.descriptionValue}><bdi dir="ltr">{formatNumber(form.attemptNumber)}</bdi></dd>
              </div>
              <div className={styles.descriptionRow}>
                <dt className={styles.descriptionLabel}>تاريخ التقديم</dt>
                <dd className={styles.descriptionValue}><bdi dir="ltr">{formatDate(form.submittedDate)}</bdi></dd>
              </div>
              {form.reviewedDate && (
                <div className={styles.descriptionRow}>
                  <dt className={styles.descriptionLabel}>تاريخ المراجعة</dt>
                  <dd className={styles.descriptionValue}><bdi dir="ltr">{formatDate(form.reviewedDate)}</bdi></dd>
                </div>
              )}
              {form.notes && (
                <div className={styles.descriptionRowFull}>
                  <dt className={styles.descriptionLabel}>ملاحظات التقديم</dt>
                  <dd className={styles.descriptionValueText}>{form.notes}</dd>
                </div>
              )}
              {form.rejectionReason && (
                <div className={styles.descriptionRowFull} style={{ color: "var(--color-danger)" }}>
                  <dt className={styles.descriptionLabel} style={{ color: "var(--color-danger)" }}>سبب الرفض</dt>
                  <dd className={styles.descriptionValueText} style={{ color: "var(--color-danger)" }}>{form.rejectionReason}</dd>
                </div>
              )}
            </dl>

            {/* Pending actions */}
            {isPending && (
              <div className={styles.actionPanel}>
                <h3 className={styles.detailTitle} style={{ fontSize: "1.0625rem", margin: "0 0 1rem 0" }}>مراجعة الاستمارة</h3>
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  <button type="button" className={`${styles.primaryAction} ${styles.btnAccept}`} style={{ flex: 1, minHeight: "48px" }} onClick={() => setIsAcceptOpen(true)}>
                    قبول الاستمارة
                  </button>
                  <button type="button" className={`${styles.primaryAction} ${styles.btnReject}`} style={{ flex: 1, minHeight: "48px" }} onClick={() => setIsRejectOpen(true)}>
                    رفض الاستمارة
                  </button>
                  <button type="button" className={`${styles.primaryAction} ${styles.btnCancel}`} style={{ flex: 1, minHeight: "48px" }} onClick={() => setIsCancelOpen(true)}>
                    إلغاء الاستمارة
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Structured Timeline History */}
          <div className={styles.detailCard}>
            <h2 className={styles.detailTitle}>سجل الحالات والمراجعة</h2>
            <ol className={styles.timelineList}>
              {form.history.map((h, i) => (
                <li key={h.id} className={styles.timelineItem}>
                  <div className={styles.timelinePoint} aria-hidden="true" />
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineMeta}>
                      <span className={styles.timelineStep}>الخطوة {i + 1}</span>
                      <time className={styles.timelineTime} dateTime={h.at}>
                        <bdi dir="ltr">{formatDateTime(h.at)}</bdi>
                      </time>
                    </div>
                    <div className={styles.timelineState}>
                      الحالة:{" "}
                      <strong>{FORM_STATUS_LABELS[h.to]}</strong>
                      {h.from && (
                        <span style={{ color: "var(--color-muted)" }}>
                          {" "}
                          (من {FORM_STATUS_LABELS[h.from]})
                        </span>
                      )}
                    </div>
                    {h.reason && <div className={styles.timelineReason}>السبب: {h.reason}</div>}
                    {h.note && <div className={styles.timelineNote}>ملاحظة: {h.note}</div>}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Sidebar Financials Card */}
        <div className={styles.detailCard}>
          <h2 className={styles.detailTitle}>البيانات المالية التجريبية</h2>
          {finance && finance.isReceivable ? (
            <dl className={styles.financialList}>
              <div className={styles.financialRow}>
                <dt className={styles.financialLabel}>سعر الاستمارة المثبّت</dt>
                <dd className={styles.financialValue}><bdi dir="ltr">{formatCurrency(finance.acceptedPriceSnapshot)}</bdi></dd>
              </div>
              <div className={styles.financialRow}>
                <dt className={styles.financialLabel}>المحصل</dt>
                <dd className={styles.financialValue} style={{ color: "var(--color-success)" }}><bdi dir="ltr">{formatCurrency(finance.allocatedAmount)}</bdi></dd>
              </div>
              <div className={styles.financialRow}>
                <dt className={styles.financialLabel}>المتبقي للتحصيل</dt>
                <dd className={styles.financialValue} style={{ color: finance.outstandingAmount > 0 ? "var(--color-warning)" : "var(--color-success)" }}><bdi dir="ltr">{formatCurrency(finance.outstandingAmount)}</bdi></dd>
              </div>
              <div className={styles.financialRow}>
                <dt className={styles.financialLabel}>حالة التحصيل</dt>
                <dd className={styles.financialValue}>
                  <StatusBadge
                    variant={
                      finance.collectionState === "collected"
                        ? "active"
                        : finance.collectionState === "partially_collected"
                        ? "warning"
                        : "neutral"
                    }
                  >
                    {COLLECTION_STATE_LABELS[finance.collectionState as CollectionState]}
                  </StatusBadge>
                </dd>
              </div>
              <div className={styles.financialRow}>
                <dt className={styles.financialLabel}>تاريخ الاستحقاق المتوقع</dt>
                <dd className={styles.financialValue}>
                  <bdi dir="ltr">
                    {project?.endDate
                      ? formatDate(
                          new Date(new Date(project.endDate).getTime() + 40 * 24 * 60 * 60 * 1000).toISOString()
                        )
                      : "غير متوفر"}
                  </bdi>
                </dd>
              </div>
            </dl>
          ) : (
            <p className={styles.pageDescription} style={{ fontSize: "0.9375rem" }}>
              لا تترتب أي مستحقات مالية على الاستمارات غير المقبولة (قيد المراجعة، المرفوضة، أو الملغاة).
            </p>
          )}
        </div>
      </div>

      {/* Acceptance Dialog */}
      <AccessibleDialog isOpen={isAcceptOpen} onClose={() => setIsAcceptOpen(false)} title="تأكيد قبول الاستمارة">
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <p>
            هل أنت متأكد من قبول الاستمارة؟ سيتم تثبيت السعر الحالي للمشروع
            (<strong>{project ? formatCurrency(project.defaultAcceptedFormPrice) : ""}</strong>) على هذه الاستمارة.
          </p>
          {projectQuota && (
            <div className={styles.infoBox} style={{ margin: 0 }}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>حصة المشروع:</span>
                <span className={styles.infoValue}>{projectQuota.accepted} / {projectQuota.targetAcceptedForms}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>المتبقي من الحصة:</span>
                <span className={styles.infoValue}>{projectQuota.remaining}</span>
              </div>
            </div>
          )}
          <div className={styles.dialogActions}>
            <button type="button" className={styles.secondaryAction} onClick={() => setIsAcceptOpen(false)}>
              {CANCEL_LABEL}
            </button>
            <button type="button" className={`${styles.primaryAction} ${styles.btnAccept}`} onClick={handleAccept}>
              تأكيد القبول وتثبيت السعر
            </button>
          </div>
        </div>
      </AccessibleDialog>

      {/* Rejection Dialog */}
      <AccessibleDialog isOpen={isRejectOpen} onClose={() => setIsRejectOpen(false)} title="تأكيد رفض الاستمارة">
        <form onSubmit={handleReject} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <p>يرجى تحديد سبب رفض هذه الاستمارة. هذا الحقل إلزامي وسيسجل في تاريخ المراجعة.</p>
          <div className={styles.formField}>
            <label className={styles.formLabel} htmlFor="reject-reason-input">سبب الرفض</label>
            <textarea
              id="reject-reason-input"
              className={styles.rejectTextarea}
              placeholder="مثال: بيانات مفقودة، المشارك غير متجاوب..."
              value={rejectionReason}
              onChange={(e) => {
                setRejectionReason(e.target.value);
                setRejectionError(null);
              }}
              required
            />
            {rejectionError && <div className={styles.validationError} role="alert">{rejectionError}</div>}
          </div>
          <div className={styles.dialogActions}>
            <button type="button" className={styles.secondaryAction} onClick={() => setIsRejectOpen(false)}>
              {CANCEL_LABEL}
            </button>
            <button type="submit" className={`${styles.primaryAction} ${styles.btnReject}`}>
              تأكيد الرفض
            </button>
          </div>
        </form>
      </AccessibleDialog>

      {/* Cancellation Dialog */}
      <AccessibleDialog isOpen={isCancelOpen} onClose={() => setIsCancelOpen(false)} title="تأكيد إلغاء الاستمارة">
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <p>هل أنت متأكد من إلغاء هذه الاستمارة؟ سيتم تحويل حالتها إلى «ملغاة» ولن تدخل في احتساب الحصص أو المستحقات.</p>
          <div className={styles.dialogActions}>
            <button type="button" className={styles.secondaryAction} onClick={() => setIsCancelOpen(false)}>
              {CANCEL_LABEL}
            </button>
            <button type="button" className={`${styles.primaryAction} ${styles.btnCancel}`} onClick={handleCancel}>
              تأكيد الإلغاء
            </button>
          </div>
        </div>
      </AccessibleDialog>
    </div>
  );
}
