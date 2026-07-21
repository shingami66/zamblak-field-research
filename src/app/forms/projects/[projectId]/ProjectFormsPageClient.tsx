"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { usePrototypeStore } from "@/lib/forms-prototype/store-context";
import {
  computeQuotaSummary,
  formsForProject,
  computeProjectFinanceSummary,
  deriveFormFinance,
} from "@/lib/forms-prototype/domain";
import {
  formatCurrency,
  formatNumber,
  formatDate,
  formatPercentage,
} from "@/lib/forms-prototype/format";
import {
  FORM_STATUS_LABELS,
  COLLECTION_STATE_LABELS,
  DEV_DEMO_NOTICE,
} from "@/lib/forms-prototype/copy";
import { BackLink } from "@/components/shared/BackLink";
import { SummaryCard } from "@/components/shared/SummaryCard";
import { DataTable } from "@/components/shared/DataTable";
import { MobileListCard } from "@/components/shared/MobileListCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import styles from "../../forms.module.css";
import type { CollectionState } from "@/lib/forms-prototype/types";

type Props = {
  projectId: string;
};

export default function ProjectFormsPageClient({ projectId }: Props) {
  const { state, isHydrated } = usePrototypeStore();

  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  const project = useMemo(() => {
    return state.projects.find((p) => p.id === projectId) ?? null;
  }, [state.projects, projectId]);

  const company = useMemo(() => {
    if (!project) return null;
    return state.companies.find((c) => c.id === project.companyId) ?? null;
  }, [state.companies, project]);

  const projectForms = useMemo(() => {
    return formsForProject(state.forms, projectId);
  }, [state.forms, projectId]);

  // Derived summaries
  const quota = useMemo(() => {
    if (!project) return null;
    return computeQuotaSummary(project, projectForms);
  }, [project, projectForms]);

  const finance = useMemo(() => {
    if (!project) return null;
    return computeProjectFinanceSummary(project, state.forms, state.collections);
  }, [project, state.forms, state.collections]);

  const filteredForms = useMemo(() => {
    return projectForms
      .map((form) => {
        const participant = state.participants.find((p) => p.id === form.participantId);
        const derived = deriveFormFinance(form, state.collections);

        return {
          ...form,
          derivedFinance: derived,
          participantName: participant?.name ?? "",
          participantMobile: participant?.mobile ?? "",
        };
      })
      .filter((form) => {
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchCode = form.code.toLowerCase().includes(q);
          const matchName = form.participantName.toLowerCase().includes(q);
          const matchMobile = form.participantMobile.includes(q);
          if (!matchCode && !matchName && !matchMobile) return false;
        }
        if (selectedStatus && form.status !== selectedStatus) return false;
        return true;
      });
  }, [projectForms, state.participants, state.collections, search, selectedStatus]);

  if (!isHydrated) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingBlock}>
          <div>جاري تحميل البيانات...</div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className={styles.page}>
        <header className={styles.pageIntro}>
          <div>
            <BackLink href="/forms">العودة إلى الاستمارات</BackLink>
            <h1 className={styles.pageTitle} style={{ marginTop: "0.5rem" }}>المشروع غير موجود</h1>
          </div>
        </header>
        <div className={styles.devNotice} role="alert">
          لم يتم العثور على هذا المشروع في البيانات التجريبية.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageIntro}>
        <div>
          <BackLink href="/forms">العودة إلى الاستمارات</BackLink>
          <h1 className={styles.pageTitle} style={{ marginTop: "0.5rem" }}>مشروع: {project.name}</h1>
          <p className={styles.pageDescription}>شركة: {company?.name ?? "—"}</p>
        </div>
        <Link href={`/forms/new?projectId=${project.id}`} className={styles.primaryAction}>
          إضافة استمارة لهذا المشروع
        </Link>
      </header>

      <div className={styles.devNotice} role="status">
        <strong>تنبيه:</strong> {DEV_DEMO_NOTICE}
      </div>

      {/* Quota Progress Bar */}
      {quota && (
        <div className={styles.detailCard} style={{ marginBlockEnd: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 className={styles.detailTitle} style={{ margin: 0 }}>متابعة الحصة المستهدفة</h2>
            <span style={{ fontSize: "1.125rem", fontWeight: 700 }}>
              <bdi dir="ltr">{formatPercentage(quota.completionPercentage)}</bdi>
            </span>
          </div>

          <div
            className={styles.progressContainer}
            role="progressbar"
            aria-valuenow={quota.completionPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="نسبة إنجاز الحصة المستهدفة للمشروع"
          >
            <div
              className={styles.progressFill}
              style={{
                transform: `scaleX(${quota.completionPercentage / 100})`,
                backgroundColor: quota.overQuota ? "var(--color-warning)" : "var(--color-success)",
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
            <span>مقبولة: <strong><bdi dir="ltr">{formatNumber(quota.accepted)}</bdi></strong> من الحصة المستهدفة: <strong><bdi dir="ltr">{formatNumber(quota.targetAcceptedForms)}</bdi></strong></span>
            {quota.overQuota && (
              <span style={{ color: "var(--color-warning)", fontWeight: 700 }}>
                (لقد تجاوز المشروع الحصة المستهدفة!)
              </span>
            )}
            <span>المتبقي للحصة: <strong><bdi dir="ltr">{formatNumber(quota.remaining)}</bdi></strong></span>
          </div>
        </div>
      )}

      {/* Quota and Financial Grid */}
      {quota && finance && (
        <section className={styles.metricsGrid} aria-label="ملخص إحصائيات المشروع">
          <SummaryCard title="إجمالي المحاولات" value={<bdi dir="ltr">{formatNumber(quota.totalAttempts)}</bdi>} variant="operational" />
          <SummaryCard title="قيد المراجعة" value={<bdi dir="ltr">{formatNumber(quota.pending)}</bdi>} variant="operational" />
          <SummaryCard title="مرفوضة" value={<bdi dir="ltr">{formatNumber(quota.rejected)}</bdi>} variant="operational" />
          <SummaryCard title="ملغاة" value={<bdi dir="ltr">{formatNumber(quota.cancelled)}</bdi>} variant="operational" />
          <SummaryCard title="سعر الاستمارة الافتراضي" value={<bdi dir="ltr">{formatCurrency(finance.defaultAcceptedFormPrice)}</bdi>} variant="financial" />
          <SummaryCard title="القيمة المقبولة" value={<bdi dir="ltr">{formatCurrency(finance.acceptedValue)}</bdi>} variant="financial" />
          <SummaryCard title="المحصل" value={<bdi dir="ltr">{formatCurrency(finance.collectedAmount)}</bdi>} variant="financial" />
          <SummaryCard title="المتبقي للتحصيل" value={<bdi dir="ltr">{formatCurrency(finance.outstandingAmount)}</bdi>} variant="financial" />
          <SummaryCard
            title="تاريخ الاستحقاق المتوقع"
            value={
              finance.dueDate ? (
                <bdi dir="ltr">{formatDate(finance.dueDate)}</bdi>
              ) : (
                "غير متوفر"
              )
            }
            variant="operational"
          />
        </section>
      )}

      {/* Filter toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.filterForm}>
          <div className={styles.filterField}>
            <label className={styles.filterLabel} htmlFor="project-search-input">البحث في استمارات المشروع</label>
            <input
              id="project-search-input"
              type="search"
              placeholder="رمز الاستمارة، اسم المشارك، الجوال"
              className={styles.filterInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className={styles.filterField}>
            <label className={styles.filterLabel} htmlFor="project-status-filter">حالة الاستمارة</label>
            <select
              id="project-status-filter"
              className={styles.filterInput}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">كل الحالات</option>
              {Object.entries(FORM_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* List of Forms */}
      <section className={styles.listSection} aria-label="استمارات المشروع">
        <div className={styles.desktopView}>
          <DataTable
            data={filteredForms}
            keyExtractor={(item) => item.id}
            columns={[
              {
                key: "code",
                header: "رمز الاستمارة",
                render: (item) => (
                  <Link href={`/forms/${item.id}`} className={styles.cardLink}>
                    <bdi className={styles.ltrToken}>{item.code}</bdi>
                  </Link>
                ),
              },
              {
                key: "participant",
                header: "المشارك",
                render: (item) => (
                  <Link href={`/forms/participants/${item.participantId}`} className={styles.textLink}>
                    {item.participantName}
                  </Link>
                ),
              },
              {
                key: "mobile",
                header: "رقم الجوال",
                render: (item) => <bdi className={styles.ltrToken}>{item.participantMobile}</bdi>,
              },
              {
                key: "attemptNumber",
                header: "رقم المحاولة",
                render: (item) => item.attemptNumber,
              },
              {
                key: "submittedDate",
                header: "تاريخ التقديم",
                render: (item) => <bdi className={styles.ltrToken}>{formatDate(item.submittedDate)}</bdi>,
              },
              {
                key: "status",
                header: "حالة الاستمارة",
                render: (item) => (
                  <StatusBadge
                    variant={
                      item.status === "accepted"
                        ? "active"
                        : item.status === "pending_review"
                        ? "warning"
                        : item.status === "rejected"
                        ? "danger"
                        : "neutral"
                    }
                  >
                    {FORM_STATUS_LABELS[item.status]}
                  </StatusBadge>
                ),
              },
              {
                key: "finance",
                header: "التحصيل",
                render: (item) => {
                  const stateLabel = item.derivedFinance
                    ? COLLECTION_STATE_LABELS[item.derivedFinance.collectionState as CollectionState]
                    : "—";
                  return (
                    <span style={{ fontSize: "0.9375rem" }}>
                      {item.status === "accepted" ? stateLabel : "—"}
                    </span>
                  );
                },
              },
            ]}
            emptyMessage="لا توجد استمارات مطابقة للبحث في هذا المشروع."
          />
        </div>

        <div className={styles.mobileView}>
          {filteredForms.length === 0 ? (
            <div className={styles.devNotice} style={{ textAlign: "center", paddingBlock: "2rem" }}>
              لا توجد استمارات مطابقة للبحث في هذا المشروع.
            </div>
          ) : (
            filteredForms.map((item) => (
              <MobileListCard
                key={item.id}
                title={
                  <Link href={`/forms/${item.id}`} className={styles.cardLink}>
                    <bdi className={styles.ltrToken}>{item.code}</bdi>
                  </Link>
                }
                badge={
                  <StatusBadge
                    variant={
                      item.status === "accepted"
                        ? "active"
                        : item.status === "pending_review"
                        ? "warning"
                        : item.status === "rejected"
                        ? "danger"
                        : "neutral"
                    }
                  >
                    {FORM_STATUS_LABELS[item.status]}
                  </StatusBadge>
                }
                details={[
                  {
                    label: "المشارك",
                    value: (
                      <Link href={`/forms/participants/${item.participantId}`} className={styles.textLink}>
                        {item.participantName}
                      </Link>
                    ),
                  },
                  {
                    label: "رقم الجوال",
                    value: <bdi className={styles.ltrToken}>{item.participantMobile}</bdi>,
                  },
                  {
                    label: "رقم المحاولة",
                    value: item.attemptNumber,
                  },
                  {
                    label: "حالة التحصيل",
                    value: item.status === "accepted" && item.derivedFinance ? (
                      COLLECTION_STATE_LABELS[item.derivedFinance.collectionState as CollectionState]
                    ) : "—",
                  },
                ]}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
