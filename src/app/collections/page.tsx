"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { usePrototypeStore } from "@/lib/forms-prototype/store-context";
import { computeCollectionTotals } from "@/lib/forms-prototype/domain";
import {
  formatCurrency,
  formatDate,
} from "@/lib/forms-prototype/format";
import {
  COLLECTION_METHOD_LABELS,
  DEV_DEMO_NOTICE,
} from "@/lib/forms-prototype/copy";
import { SummaryCard } from "@/components/shared/SummaryCard";
import { DataTable } from "@/components/shared/DataTable";
import { MobileListCard } from "@/components/shared/MobileListCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import styles from "./collections.module.css";

export default function CollectionsPage() {
  const { state, isHydrated } = usePrototypeStore();

  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("");
  const [search, setSearch] = useState("");

  const handleResetFilters = () => {
    setSelectedCompany("");
    setSelectedMethod("");
    setSearch("");
  };

  // Pre-filter summary metrics
  const metrics = useMemo(() => {
    let total = 0;
    let allocated = 0;
    let unallocated = 0;

    for (const col of state.collections) {
      total += col.totalAmount;
      const t = computeCollectionTotals(col);
      allocated += t.allocatedAmount;
      unallocated += t.unallocatedAmount;
    }

    return { total, allocated, unallocated };
  }, [state.collections]);

  // Filtering collections
  const filteredCollections = useMemo(() => {
    return state.collections
      .map((col) => {
        const company = state.companies.find((c) => c.id === col.companyId);
        const totals = computeCollectionTotals(col);
        return {
          ...col,
          companyName: company?.name ?? "",
          allocatedAmount: totals.allocatedAmount,
          unallocatedAmount: totals.unallocatedAmount,
        };
      })
      .filter((col) => {
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchCode = col.code.toLowerCase().includes(q);
          const matchRef = col.reference?.toLowerCase().includes(q) ?? false;
          if (!matchCode && !matchRef) return false;
        }
        if (selectedCompany && col.companyId !== selectedCompany) return false;
        if (selectedMethod && col.method !== selectedMethod) return false;
        return true;
      });
  }, [state.collections, state.companies, search, selectedCompany, selectedMethod]);

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
          <h1 className={styles.pageTitle}>التحصيلات التجريبية</h1>
          <p className={styles.pageDescription}>
            إدارة المبالغ المحصلة من الشركات وتخصيصها للاستمارات المقبولة.
          </p>
        </div>
        <Link href="/collections/new" className={styles.primaryAction}>
          تسجيل تحصيل جديد
        </Link>
      </header>

      <div className={styles.devNotice} role="status">
        <strong>تنبيه:</strong> {DEV_DEMO_NOTICE}
      </div>

      {/* Metrics Section */}
      <section className={styles.metricsGrid} aria-label="ملخص إحصائيات التحصيلات">
        <SummaryCard title="إجمالي المقبوضات" value={<bdi dir="ltr">{formatCurrency(metrics.total)}</bdi>} variant="financial" />
        <SummaryCard title="الموزع (المخصص)" value={<bdi dir="ltr">{formatCurrency(metrics.allocated)}</bdi>} variant="financial" />
        <SummaryCard title="غير الموزع (المتبقي)" value={<bdi dir="ltr">{formatCurrency(metrics.unallocated)}</bdi>} variant="financial" />
      </section>

      {/* Toolbar / Filters */}
      <div className={styles.toolbar}>
        <div className={styles.filterForm}>
          <div className={styles.filterField}>
            <label className={styles.filterLabel} htmlFor="collection-search">البحث</label>
            <input
              id="collection-search"
              type="search"
              placeholder="رمز التحصيل، رقم المرجع"
              className={styles.filterInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className={styles.filterField}>
            <label className={styles.filterLabel} htmlFor="company-select">الشركة</label>
            <select
              id="company-select"
              className={styles.filterInput}
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
            >
              <option value="">كل الشركات</option>
              {state.companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.filterField}>
            <label className={styles.filterLabel} htmlFor="method-select">طريقة الدفع</label>
            <select
              id="method-select"
              className={styles.filterInput}
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
            >
              <option value="">كل الطرق</option>
              {Object.entries(COLLECTION_METHOD_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {(selectedCompany || selectedMethod || search) && (
            <button type="button" className={styles.secondaryAction} onClick={handleResetFilters}>
              إعادة ضبط الفلاتر
            </button>
          )}
        </div>
      </div>

      {/* Collections List Table / Cards */}
      <section className={styles.listSection} aria-label="سجلات التحصيل">
        <div className={styles.desktopView}>
          <DataTable
            data={filteredCollections}
            keyExtractor={(item) => item.id}
            columns={[
              {
                key: "code",
                header: "رمز التحصيل",
                render: (item) => (
                  <Link href={`/collections/${item.id}`} className={styles.cardLink}>
                    <bdi className={styles.ltrToken}>{item.code}</bdi>
                  </Link>
                ),
              },
              {
                key: "company",
                header: "الشركة",
                render: (item) => item.companyName,
              },
              {
                key: "date",
                header: "التاريخ",
                render: (item) => <bdi className={styles.ltrToken}>{formatDate(item.date)}</bdi>,
              },
              {
                key: "totalAmount",
                header: "إجمالي التحصيل",
                render: (item) => <bdi className={styles.ltrToken}>{formatCurrency(item.totalAmount)}</bdi>,
              },
              {
                key: "allocatedAmount",
                header: "المخصص",
                render: (item) => <bdi className={styles.ltrToken}>{formatCurrency(item.allocatedAmount)}</bdi>,
              },
              {
                key: "unallocatedAmount",
                header: "المتبقي غير الموزع",
                render: (item) => <bdi className={styles.ltrToken}>{formatCurrency(item.unallocatedAmount)}</bdi>,
              },
              {
                key: "method",
                header: "طريقة الدفع",
                render: (item) => COLLECTION_METHOD_LABELS[item.method],
              },
              {
                key: "reference",
                header: "رقم المرجع",
                render: (item) => (
                  item.reference ? <bdi className={styles.ltrToken}>{item.reference}</bdi> : "—"
                ),
              },
              {
                key: "status",
                header: "الحالة",
                render: (item) => {
                  const isFullyAllocated = item.unallocatedAmount === 0;
                  return (
                    <StatusBadge variant={isFullyAllocated ? "active" : "warning"}>
                      {isFullyAllocated ? "مبلغ السند موزع بالكامل" : "مبلغ السند غير موزع بالكامل"}
                    </StatusBadge>
                  );
                },
              },
            ]}
            emptyMessage={filteredCollections.length === 0 ? "لم يتم العثور على أي تحصيلات تطابق خيارات البحث." : "لا توجد تحصيلات مسجلة."}
          />
        </div>

        <div className={styles.mobileView}>
          {filteredCollections.length === 0 ? (
            <div className={styles.devNotice} style={{ textAlign: "center", paddingBlock: "2rem" }}>
              لم يتم العثور على أي تحصيلات تطابق خيارات البحث.
            </div>
          ) : (
            filteredCollections.map((item) => (
              <MobileListCard
                key={item.id}
                title={
                  <Link href={`/collections/${item.id}`} className={styles.cardLink}>
                    <bdi className={styles.ltrToken}>{item.code}</bdi>
                  </Link>
                }
                badge={
                  <StatusBadge variant={item.unallocatedAmount === 0 ? "active" : "warning"}>
                    {item.unallocatedAmount === 0 ? "مبلغ السند موزع بالكامل" : "مبلغ السند غير موزع بالكامل"}
                  </StatusBadge>
                }
                details={[
                  {
                    label: "الشركة",
                    value: item.companyName,
                  },
                  {
                    label: "التاريخ",
                    value: <bdi className={styles.ltrToken}>{formatDate(item.date)}</bdi>,
                  },
                  {
                    label: "إجمالي التحصيل",
                    value: <bdi className={styles.ltrToken}>{formatCurrency(item.totalAmount)}</bdi>,
                  },
                  {
                    label: "طريقة الدفع",
                    value: COLLECTION_METHOD_LABELS[item.method],
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
