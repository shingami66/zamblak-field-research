"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { usePrototypeStore } from "@/lib/forms-prototype/store-context";
import { deriveFormFinance } from "@/lib/forms-prototype/domain";
import {
  formatCurrency,
  formatDate,
} from "@/lib/forms-prototype/format";
import { DEV_DEMO_NOTICE } from "@/lib/forms-prototype/copy";
import { SummaryCard } from "@/components/shared/SummaryCard";
import { DataTable } from "@/components/shared/DataTable";
import { MobileListCard } from "@/components/shared/MobileListCard";
import styles from "./collections.module.css";

function HandCoins(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17" />
      <path d="m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9" />
      <path d="m2 16 6 6" />
      <circle cx="16" cy="6" r="3" />
    </svg>
  );
}

function Eye(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function CollectionsPage() {
  const { state, isHydrated } = usePrototypeStore();

  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedProject, setSelectedProject] = useState("");

  const handleResetFilters = () => {
    setSelectedCompany("");
    setSelectedProject("");
  };

  // Pre-filter summary metrics
  const metrics = useMemo(() => {
    let totalPaid = 0;
    const paidFormIds = new Set<string>();

    for (const col of state.collections) {
      totalPaid += col.totalAmount;
      for (const alloc of col.allocations) {
        paidFormIds.add(alloc.formId);
      }
    }

    let totalOutstanding = 0;
    for (const form of state.forms) {
      if (form.status === "accepted" && form.acceptedPriceSnapshot) {
        const finance = deriveFormFinance(form, state.collections);
        totalOutstanding += finance.outstandingAmount;
      }
    }

    return {
      totalPaid,
      paidFormsCount: paidFormIds.size,
      totalOutstanding,
    };
  }, [state.collections, state.forms]);

  // Projects filtered by selected company if company selected
  const availableProjects = useMemo(() => {
    if (!selectedCompany) return state.projects;
    return state.projects.filter((p) => p.companyId === selectedCompany);
  }, [state.projects, selectedCompany]);

  // Filtered collections
  const filteredCollections = useMemo(() => {
    return state.collections
      .map((col) => {
        const company = state.companies.find((c) => c.id === col.companyId);
        let project = state.projects.find((p) => p.id === col.projectId);

        // Fallback for legacy collections without explicit projectId: derive from first linked form
        if (!project && col.allocations.length > 0) {
          const firstForm = state.forms.find((f) => f.id === col.allocations[0].formId);
          if (firstForm) {
            project = state.projects.find((p) => p.id === firstForm.projectId);
          }
        }

        return {
          ...col,
          companyName: company?.name ?? "شركة غير محددة",
          projectName: project?.name ?? "مشروع غير محدد",
          formsCount: col.allocations.length,
          detailHref: `/collections/${col.id}`,
        };
      })
      .filter((col) => {
        if (selectedCompany && col.companyId !== selectedCompany) return false;
        if (selectedProject && col.projectId !== selectedProject) return false;
        return true;
      });
  }, [state.collections, state.companies, state.projects, state.forms, selectedCompany, selectedProject]);

  if (!isHydrated) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingBlock}>
          <div>جاري تحميل البيانات...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageIntro}>
        <div>
          <h1 className={styles.pageTitle}>الدفعات النقدية</h1>
          <p className={styles.pageDescription}>
            تسجيل ومراجعة الدفعات المستلمة مقابل الاستمارات المقبولة.
          </p>
          <div className={styles.headerActionRow}>
            <Link href="/collections/new" className={styles.primaryAction}>
              <HandCoins className={styles.actionIcon} aria-hidden="true" />
              <span>تسجيل دفعة نقدية</span>
            </Link>
          </div>
        </div>
      </header>

      <div className={styles.devNotice} role="status">
        <strong>تنبيه:</strong> {DEV_DEMO_NOTICE}
      </div>

      {/* Metrics Section */}
      <section className={styles.metricsGrid} aria-label="ملخص إحصائيات الدفعات">
        <SummaryCard
          title="إجمالي المدفوع"
          value={<bdi dir="ltr">{formatCurrency(metrics.totalPaid)}</bdi>}
          variant="financial"
        />
        <SummaryCard
          title="عدد الاستمارات المدفوعة"
          value={metrics.paidFormsCount.toString()}
          variant="operational"
        />
        <SummaryCard
          title="المستحقات غير المدفوعة"
          value={<bdi dir="ltr">{formatCurrency(metrics.totalOutstanding)}</bdi>}
          variant="financial"
        />
      </section>

      {/* Toolbar / Filters */}
      <div className={styles.toolbar}>
        <div className={styles.filterForm}>
          <div className={styles.filterField}>
            <label className={styles.filterLabel} htmlFor="company-select">
              الشركة
            </label>
            <select
              id="company-select"
              className={styles.filterInput}
              value={selectedCompany}
              onChange={(e) => {
                setSelectedCompany(e.target.value);
                setSelectedProject("");
              }}
            >
              <option value="">كل الشركات</option>
              {state.companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterField}>
            <label className={styles.filterLabel} htmlFor="project-select">
              المشروع
            </label>
            <select
              id="project-select"
              className={styles.filterInput}
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              <option value="">كل المشاريع</option>
              {availableProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {(selectedCompany || selectedProject) && (
            <button
              type="button"
              className={styles.resetButton}
              onClick={handleResetFilters}
            >
              إلغاء التصفية
            </button>
          )}
        </div>
      </div>

      {/* List Section */}
      <section className={styles.listSection} aria-label="قائمة الدفعات النقدية">
        {filteredCollections.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>لا توجد دفعات نقدية مطابقة</h3>
            <p>غيّر خيارات التصفية لعرض باقي الدفعات المسجلة.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className={styles.desktopView}>
              <DataTable
                data={filteredCollections}
                keyExtractor={(col) => col.id}
                columns={[
                  {
                    key: "code",
                    header: "رقم الدفعة",
                    render: (col) => <bdi dir="ltr">{col.code}</bdi>,
                  },
                  {
                    key: "company",
                    header: "الشركة",
                    render: (col) => col.companyName,
                  },
                  {
                    key: "project",
                    header: "المشروع",
                    render: (col) => col.projectName,
                  },
                  {
                    key: "date",
                    header: "تاريخ الدفع",
                    render: (col) => <bdi dir="ltr">{formatDate(col.date)}</bdi>,
                  },
                  {
                    key: "formsCount",
                    header: "عدد الاستمارات",
                    render: (col) => col.formsCount,
                  },
                  {
                    key: "totalAmount",
                    header: "إجمالي الدفعة",
                    render: (col) => <bdi dir="ltr">{formatCurrency(col.totalAmount)}</bdi>,
                  },
                  {
                    key: "actions",
                    header: "إجراءات",
                    render: (col) => (
                      <div className={styles.tableActions}>
                        <Link
                          href={col.detailHref}
                          className={styles.iconActionButton}
                          aria-label="عرض الدفعة"
                          title="عرض الدفعة"
                        >
                          <Eye className={styles.actionIcon} aria-hidden="true" />
                        </Link>
                      </div>
                    ),
                  },
                ]}
              />
            </div>

            {/* Mobile Card List View */}
            <div className={styles.mobileView}>
              {filteredCollections.map((col) => (
                <MobileListCard
                  key={col.id}
                  title={<bdi dir="ltr">{col.code}</bdi>}
                  subtitle={col.companyName}
                  details={[
                    { label: "المشروع", value: col.projectName },
                    { label: "تاريخ الدفع", value: <bdi dir="ltr">{formatDate(col.date)}</bdi> },
                    { label: "عدد الاستمارات", value: col.formsCount },
                    { label: "إجمالي الدفعة", value: <bdi dir="ltr">{formatCurrency(col.totalAmount)}</bdi> },
                  ]}
                  actions={
                    <Link href={col.detailHref} className={styles.mobileActionButton}>
                      <Eye className={styles.actionIcon} aria-hidden="true" />
                      <span>عرض</span>
                    </Link>
                  }
                />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
