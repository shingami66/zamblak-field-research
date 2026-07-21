"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { usePrototypeStore } from "@/lib/forms-prototype/store-context";
import {
  computeParticipantSummary,
  formsForParticipant,
} from "@/lib/forms-prototype/domain";
import {
  formatNumber,
  formatDate,
  formatPhone,
} from "@/lib/forms-prototype/format";
import {
  FORM_STATUS_LABELS,
  DEV_DEMO_NOTICE,
} from "@/lib/forms-prototype/copy";
import { BackLink } from "@/components/shared/BackLink";
import { SummaryCard } from "@/components/shared/SummaryCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import styles from "../../forms.module.css";

type Props = {
  participantId: string;
};

export default function ParticipantFormsPageClient({ participantId }: Props) {
  const { state, isHydrated } = usePrototypeStore();

  const participant = useMemo(() => {
    return state.participants.find((p) => p.id === participantId) ?? null;
  }, [state.participants, participantId]);

  const ownForms = useMemo(() => {
    return formsForParticipant(state.forms, participantId);
  }, [state.forms, participantId]);

  const summary = useMemo(() => {
    if (!participant) return null;
    return computeParticipantSummary(participant, state.forms);
  }, [participant, state.forms]);


  // Project-grouped summary data
  const projectGroupedSummary = useMemo(() => {
    const groups: Record<
      string,
      {
        projectId: string;
        projectName: string;
        attempts: number;
        pending: number;
        accepted: number;
        rejected: number;
        cancelled: number;
      }
    > = {};

    for (const form of ownForms) {
      const project = state.projects.find((p) => p.id === form.projectId);
      const prjName = project?.name ?? "مشروع غير معروف";

      if (!groups[form.projectId]) {
        groups[form.projectId] = {
          projectId: form.projectId,
          projectName: prjName,
          attempts: 0,
          pending: 0,
          accepted: 0,
          rejected: 0,
          cancelled: 0,
        };
      }

      const g = groups[form.projectId];
      g.attempts++;
      if (form.status === "pending_review") g.pending++;
      else if (form.status === "accepted") g.accepted++;
      else if (form.status === "rejected") g.rejected++;
      else if (form.status === "cancelled") g.cancelled++;
    }

    return Object.values(groups);
  }, [ownForms, state.projects]);

  if (!isHydrated) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingBlock}>
          <div>جاري تحميل البيانات...</div>
        </div>
      </div>
    );
  }

  if (!participant) {
    return (
      <div className={styles.page}>
        <header className={styles.pageIntro}>
          <div>
            <BackLink href="/forms">العودة إلى الاستمارات</BackLink>
            <h1 className={styles.pageTitle} style={{ marginTop: "0.5rem" }}>المشارك غير موجود</h1>
          </div>
        </header>
        <div className={styles.devNotice} role="alert">
          لم يتم العثور على هذا المشارك في البيانات التجريبية.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageIntro}>
        <div>
          <BackLink href="/forms">العودة إلى الاستمارات</BackLink>
          <h1 className={styles.pageTitle} style={{ marginTop: "0.5rem" }}>تاريخ المشارك: {participant.name}</h1>
          <p className={styles.pageDescription}><bdi dir="ltr">{formatPhone(participant.mobile)}</bdi></p>
        </div>
      </header>

      <div className={styles.devNotice} role="status">
        <strong>تنبيه:</strong> {DEV_DEMO_NOTICE}
      </div>

      {/* Participant Stats Summary */}
      {summary && (
        <section className={styles.metricsGrid} aria-label="ملخص إحصائيات المشارك">
          <SummaryCard title="عدد المشاريع المسجلة" value={<bdi dir="ltr">{formatNumber(summary.projectCount)}</bdi>} variant="operational" />
          <SummaryCard title="إجمالي المحاولات" value={<bdi dir="ltr">{formatNumber(summary.totalAttempts)}</bdi>} variant="operational" />
          <SummaryCard title="مقبولة" value={<bdi dir="ltr">{formatNumber(summary.accepted)}</bdi>} variant="operational" />
          <SummaryCard title="قيد المراجعة" value={<bdi dir="ltr">{formatNumber(summary.pending)}</bdi>} variant="operational" />
          <SummaryCard title="مرفوضة" value={<bdi dir="ltr">{formatNumber(summary.rejected)}</bdi>} variant="operational" />
          <SummaryCard title="ملغاة" value={<bdi dir="ltr">{formatNumber(summary.cancelled)}</bdi>} variant="operational" />
          <SummaryCard
            title="آخر نشاط"
            value={
              summary.lastActivity ? (
                <bdi dir="ltr">{formatDate(summary.lastActivity)}</bdi>
              ) : (
                "لا يوجد نشاط"
              )
            }
            variant="operational"
          />
        </section>
      )}

      <div className={styles.detailGrid}>
        {/* Section 1: Project-grouped summary */}
        <div className={styles.detailCard}>
          <h2 className={styles.detailTitle}>ملخص المشاركة حسب المشروع</h2>
          <div className={styles.detailRows} style={{ gap: "1.25rem" }}>
            {projectGroupedSummary.length === 0 ? (
              <p className={styles.pageDescription}>لم يشارك في أي مشروع بعد.</p>
            ) : (
              projectGroupedSummary.map((g) => (
                <div
                  key={g.projectId}
                  style={{
                    border: "1px solid var(--color-border)",
                    borderRadius: "0.75rem",
                    padding: "1rem",
                  }}
                >
                  <h3 style={{ margin: "0 0 0.75rem 0", fontSize: "1.0625rem", fontWeight: 700 }}>
                    <Link href={`/forms/projects/${g.projectId}`} className={styles.textLink}>
                      {g.projectName}
                    </Link>
                  </h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 1.5rem", fontSize: "0.9375rem" }}>
                    <span>المحاولات: <strong>{g.attempts}</strong></span>
                    <span style={{ color: "var(--color-success)" }}>مقبولة: <strong>{g.accepted}</strong></span>
                    <span style={{ color: "var(--color-warning)" }}>قيد المراجعة: <strong>{g.pending}</strong></span>
                    <span style={{ color: "var(--color-danger)" }}>مرفوضة: <strong>{g.rejected}</strong></span>
                    <span style={{ color: "var(--color-muted)" }}>ملغاة: <strong>{g.cancelled}</strong></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Section 2: Individual form history */}
        <div className={styles.detailCard}>
          <h2 className={styles.detailTitle}>سجل المحاولات التفصيلي</h2>
          <div className={styles.detailRows} style={{ gap: "1.25rem" }}>
            {ownForms.length === 0 ? (
              <p className={styles.pageDescription}>لا يوجد سجل استمارات لهذا المشارك.</p>
            ) : (
              ownForms.map((form) => (
                <div
                  key={form.id}
                  style={{
                    border: "1px solid var(--color-border)",
                    borderRadius: "0.75rem",
                    padding: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Link href={`/forms/${form.id}`} className={styles.cardLink}>
                      <bdi dir="ltr">{form.code}</bdi>
                    </Link>
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
                  <div style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>
                    المحاولة رقم {form.attemptNumber} · تاريخ التقديم:{" "}
                    <bdi dir="ltr">{formatDate(form.submittedDate)}</bdi>
                  </div>
                  {form.notes && (
                    <div style={{ fontSize: "0.9375rem" }}>
                      ملاحظة: <span style={{ color: "var(--color-muted)" }}>{form.notes}</span>
                    </div>
                  )}
                  {form.rejectionReason && (
                    <div style={{ fontSize: "0.9375rem", color: "var(--color-danger)" }}>
                      سبب الرفض: <strong>{form.rejectionReason}</strong>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
