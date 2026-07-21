"use client";

import React, { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { usePrototypeStore } from "@/lib/forms-prototype/store-context";
import {
  deriveFormFinance,
  computeQuotaSummary,
  formsForProject,
} from "@/lib/forms-prototype/domain";
import {
  formatCurrency,
  formatNumber,
  formatDate,
} from "@/lib/forms-prototype/format";
import {
  FORM_STATUS_LABELS,
  COLLECTION_STATE_LABELS,
  DEV_DEMO_NOTICE,
  RESET_LABEL,
  RESET_CONFIRM_TITLE,
  RESET_CONFIRM_BODY,
  RESET_CONFIRM_ACTION,
  CANCEL_LABEL,
} from "@/lib/forms-prototype/copy";
import { SummaryCard } from "@/components/shared/SummaryCard";
import { DataTable } from "@/components/shared/DataTable";
import { MobileListCard } from "@/components/shared/MobileListCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Pagination } from "@/components/shared/Pagination";
import { AccessibleDialog } from "@/components/forms-prototype/AccessibleDialog";
import styles from "./forms.module.css";
import type { CollectionState } from "@/lib/forms-prototype/types";

const PAGE_SIZE = 10;

function FormsPageContent() {
  const { state, isHydrated, resetStore } = usePrototypeStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isResetOpen, setIsResetOpen] = useState(false);

  // Filter states
  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedCollectionState, setSelectedCollectionState] = useState("");

  const page = Number(searchParams.get("page")) || 1;

  // Reset all filters
  const handleResetFilters = () => {
    setSearch("");
    setSelectedProject("");
    setSelectedCompany("");
    setSelectedStatus("");
    setSelectedCollectionState("");
    router.push("/forms");
  };

  // Derived overall metrics (pre-filter)
  const metrics = useMemo(() => {
    const attempts = state.forms.length;
    let pending = 0;
    let accepted = 0;
    let rejected = 0;
    let cancelled = 0;

    for (const form of state.forms) {
      if (form.status === "pending_review") pending++;
      else if (form.status === "accepted") accepted++;
      else if (form.status === "rejected") rejected++;
      else if (form.status === "cancelled") cancelled++;
    }

    const remainingQuota = state.projects.reduce((sum, prj) => {
      const prjForms = formsForProject(state.forms, prj.id);
      const q = computeQuotaSummary(prj, prjForms);
      return sum + q.remaining;
    }, 0);

    const finances = state.forms.map((f) => deriveFormFinance(f, state.collections));
    const receivable = finances.reduce((sum, f) => sum + (f.isReceivable ? f.acceptedPriceSnapshot : 0), 0);
    const collected = finances.reduce((sum, f) => sum + f.allocatedAmount, 0);
    const outstanding = finances.reduce((sum, f) => sum + f.outstandingAmount, 0);

    return {
      attempts,
      pending,
      accepted,
      rejected,
      cancelled,
      remainingQuota,
      receivable,
      collected,
      outstanding,
    };
  }, [state.forms, state.projects, state.collections]);

  // Filter & Search Forms
  const filteredForms = useMemo(() => {
    return state.forms
      .map((form) => {
        const finance = deriveFormFinance(form, state.collections);
        const project = state.projects.find((p) => p.id === form.projectId);
        const company = state.companies.find((c) => c.id === form.companyId);
        const participant = state.participants.find((p) => p.id === form.participantId);
        return {
          ...form,
          finance,
          projectName: project?.name ?? "",
          companyName: company?.name ?? "",
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
          if (!matchCode && !matchName && !matchMobile) {
            return false;
          }
        }
        if (selectedProject && form.projectId !== selectedProject) return false;
        if (selectedCompany && form.companyId !== selectedCompany) return false;
        if (selectedStatus && form.status !== selectedStatus) return false;
        if (selectedCollectionState && form.finance.collectionState !== selectedCollectionState) return false;
        return true;
      });
  }, [state.forms, state.projects, state.companies, state.participants, state.collections, search, selectedProject, selectedCompany, selectedStatus, selectedCollectionState]);

  // Pagination calculations
  const totalCount = filteredForms.length;
  const totalPages = Math.max(Math.ceil(totalCount / PAGE_SIZE), 1);
  const paginatedForms = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredForms.slice(start, start + PAGE_SIZE);
  }, [filteredForms, page]);

  const buildPageHref = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    return `/forms?${params.toString()}`;
  };

  const previousHref = page > 1 ? buildPageHref(page - 1) : null;
  const nextHref = page < totalPages ? buildPageHref(page + 1) : null;

  if (!isHydrated) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingBlock}>
          <div className={styles.skeletonRow} />
          <div>جاري تحميل البيانات...</div>
        </div>
      </div>
    );
  }

  const handleResetConfirm = () => {
    resetStore();
    setIsResetOpen(false);
    handleResetFilters();
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageIntro}>
        <div>
          <h1 className={styles.pageTitle}>إدارة الاستمارات والمراجعة</h1>
          <p className={styles.pageDescription}>
            متابعة استمارات ومقابلات المشاريع الميدانية، ومراجعة الحالات وإدارة التحصيل.
          </p>
        </div>
        <div className={styles.formActions} style={{ border: "none", padding: 0, margin: 0 }}>
          <button
            type="button"
            className={styles.secondaryAction}
            onClick={() => setIsResetOpen(true)}
            style={{ marginInlineEnd: "1rem" }}
          >
            {RESET_LABEL}
          </button>
          <Link href="/forms/new" className={styles.primaryAction}>
            إضافة استمارة جديدة
          </Link>
        </div>
      </header>

      <div className={styles.devNotice} role="status">
        <strong>تنبيه:</strong> {DEV_DEMO_NOTICE}
      </div>

      {/* Metrics Section */}
      <div className={styles.metricsGroups}>
        <section className={styles.metricsGroup} aria-label="إحصائيات التشغيل">
          <h2 className={styles.metricsGroupTitle}>التشغيل</h2>
          <div className={styles.metricsGrid}>
            <SummaryCard title="إجمالي المحاولات" value={formatNumber(metrics.attempts)} variant="operational" />
            <SummaryCard title="قيد المراجعة" value={formatNumber(metrics.pending)} variant="operational" />
            <SummaryCard title="مقبولة" value={formatNumber(metrics.accepted)} variant="operational" />
            <SummaryCard title="مرفوضة" value={formatNumber(metrics.rejected)} variant="operational" />
            <SummaryCard title="ملغاة" value={formatNumber(metrics.cancelled)} variant="operational" />
            <SummaryCard title="المتبقي من الكوتة" value={formatNumber(metrics.remainingQuota)} variant="operational" />
          </div>
        </section>

        <section className={styles.metricsGroup} aria-label="إحصائيات التحصيل">
          <h2 className={styles.metricsGroupTitle}>التحصيل</h2>
          <div className={styles.metricsGrid}>
            <SummaryCard title="إجمالي المستحقات" value={formatCurrency(metrics.receivable)} variant="financial" />
            <SummaryCard title="المحصل" value={formatCurrency(metrics.collected)} variant="financial" />
            <SummaryCard title="المتبقي للتحصيل" value={formatCurrency(metrics.outstanding)} variant="financial" />
          </div>
        </section>
      </div>

      {/* Toolbar / Filters */}
      <div className={styles.toolbar}>
        <div className={styles.filterForm}>
          <div className={styles.filterField}>
            <label className={styles.filterLabel} htmlFor="form-search">البحث</label>
            <input
              id="form-search"
              type="search"
              placeholder="رمز الاستمارة، اسم المشارك، الجوال"
              className={styles.filterInput}
              value={search}
              onChange={(e) => { setSearch(e.target.value); router.push("/forms"); }}
            />
          </div>

          <div className={styles.filterField}>
            <label className={styles.filterLabel} htmlFor="project-filter">المشروع</label>
            <select
              id="project-filter"
              className={styles.filterInput}
              value={selectedProject}
              onChange={(e) => { setSelectedProject(e.target.value); router.push("/forms"); }}
            >
              <option value="">كل المشاريع</option>
              {state.projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.filterField}>
            <label className={styles.filterLabel} htmlFor="company-filter">الشركة</label>
            <select
              id="company-filter"
              className={styles.filterInput}
              value={selectedCompany}
              onChange={(e) => { setSelectedCompany(e.target.value); router.push("/forms"); }}
            >
              <option value="">كل الشركات</option>
              {state.companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.filterField}>
            <label className={styles.filterLabel} htmlFor="status-filter">حالة الاستمارة</label>
            <select
              id="status-filter"
              className={styles.filterInput}
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); router.push("/forms"); }}
            >
              <option value="">كل الحالات</option>
              {Object.entries(FORM_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div className={styles.filterField}>
            <label className={styles.filterLabel} htmlFor="collection-filter">حالة التحصيل</label>
            <select
              id="collection-filter"
              className={styles.filterInput}
              value={selectedCollectionState}
              onChange={(e) => { setSelectedCollectionState(e.target.value); router.push("/forms"); }}
            >
              <option value="">كل حالات التحصيل</option>
              {Object.entries(COLLECTION_STATE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {(search || selectedProject || selectedCompany || selectedStatus || selectedCollectionState) && (
            <button type="button" className={styles.secondaryAction} onClick={handleResetFilters}>
              إعادة ضبط الفلاتر
            </button>
          )}
        </div>
      </div>

      {/* Forms Table / Cards */}
      <section className={styles.listSection} aria-label="قائمة الاستمارات">
        <div className={styles.desktopView}>
          <DataTable
            data={paginatedForms}
            keyExtractor={(item) => item.id}
            columns={[
              {
                key: "code",
                header: "رمز الاستمارة",
                render: (item) => (
                  <Link href={`/forms/${item.id}`} className={styles.cardLink}>
                    <bdi dir="ltr">{item.code}</bdi>
                  </Link>
                ),
              },
              {
                key: "project",
                header: "المشروع",
                render: (item) => (
                  <Link href={`/forms/projects/${item.projectId}`} className={styles.textLink}>
                    {item.projectName}
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
                key: "submittedDate",
                header: "تاريخ التقديم",
                render: (item) => <bdi dir="ltr">{formatDate(item.submittedDate)}</bdi>,
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
                key: "price",
                header: "المستحق",
                render: (item) => (
                  <bdi dir="ltr">
                    {item.finance.isReceivable ? formatCurrency(item.finance.acceptedPriceSnapshot) : "—"}
                  </bdi>
                ),
              },
              {
                key: "collection",
                header: "حالة التحصيل",
                render: (item) => (
                  <StatusBadge
                    variant={
                      item.finance.collectionState === "collected"
                        ? "active"
                        : item.finance.collectionState === "partially_collected"
                        ? "warning"
                        : "neutral"
                    }
                  >
                    {COLLECTION_STATE_LABELS[item.finance.collectionState as CollectionState]}
                  </StatusBadge>
                ),
              },
            ]}
            emptyMessage={totalCount === 0 ? "لم يتم العثور على أي استمارات تطابق خيارات البحث." : "لا توجد استمارات حالية."}
          />
        </div>

        <div className={styles.mobileView}>
          {totalCount === 0 ? (
            <div className={styles.devNotice} style={{ textAlign: "center", paddingBlock: "2rem" }}>
              لم يتم العثور على أي استمارات تطابق خيارات البحث.
            </div>
          ) : (
            paginatedForms.map((item) => (
              <MobileListCard
                key={item.id}
                title={
                  <Link href={`/forms/${item.id}`} className={styles.cardLink}>
                    <bdi dir="ltr">{item.code}</bdi>
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
                    label: "المشروع",
                    value: (
                      <Link href={`/forms/projects/${item.projectId}`} className={styles.textLink}>
                        {item.projectName}
                      </Link>
                    ),
                  },
                  {
                    label: "المشارك",
                    value: (
                      <Link href={`/forms/participants/${item.participantId}`} className={styles.textLink}>
                        {item.participantName}
                      </Link>
                    ),
                  },
                  {
                    label: "المستحق",
                    value: (
                      <bdi dir="ltr">
                        {item.finance.isReceivable ? formatCurrency(item.finance.acceptedPriceSnapshot) : "—"}
                      </bdi>
                    ),
                  },
                  {
                    label: "حالة التحصيل",
                    value: (
                      <StatusBadge
                        variant={
                          item.finance.collectionState === "collected"
                            ? "active"
                            : item.finance.collectionState === "partially_collected"
                            ? "warning"
                            : "neutral"
                        }
                      >
                        {COLLECTION_STATE_LABELS[item.finance.collectionState as CollectionState]}
                      </StatusBadge>
                    ),
                  },
                ]}
              />
            ))
          )}
        </div>

        {totalCount > PAGE_SIZE && (
          <Pagination
            currentPage={page}
            visibleCount={paginatedForms.length}
            pageSize={PAGE_SIZE}
            previousHref={previousHref}
            nextHref={nextHref}
            previousLabel="السابق"
            nextLabel="التالي"
          />
        )}
      </section>

      {/* Reset Confirmation Dialog */}
      <AccessibleDialog isOpen={isResetOpen} onClose={() => setIsResetOpen(false)} title={RESET_CONFIRM_TITLE}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <p>{RESET_CONFIRM_BODY}</p>
          <div className={styles.dialogActions}>
            <button type="button" className={styles.secondaryAction} onClick={() => setIsResetOpen(false)}>
              {CANCEL_LABEL}
            </button>
            <button type="button" className={styles.primaryAction} style={{ backgroundColor: "var(--color-danger)" }} onClick={handleResetConfirm}>
              {RESET_CONFIRM_ACTION}
            </button>
          </div>
        </div>
      </AccessibleDialog>
    </div>
  );
}

export default function FormsPage() {
  return (
    <Suspense fallback={<div className={styles.page}><div className={styles.loadingBlock}>جاري تحميل الصفحة...</div></div>}>
      <FormsPageContent />
    </Suspense>
  );
}
