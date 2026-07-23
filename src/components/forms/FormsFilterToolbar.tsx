"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "@/app/forms/forms.module.css";

export interface FormsFilterToolbarProps {
  initialFilters: {
    code?: string;
    reviewStatus?: string;
    submittedDateFrom?: string;
    submittedDateTo?: string;
    pageSize?: number;
  };
}

export function FormsFilterToolbar({ initialFilters }: FormsFilterToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [codeInput, setCodeInput] = useState(initialFilters.code || "");

  const hasAnyDateFilter = Boolean(
    (initialFilters.submittedDateFrom && initialFilters.submittedDateFrom.trim() !== "") ||
    (initialFilters.submittedDateTo && initialFilters.submittedDateTo.trim() !== "")
  );

  const isValidSingleDate = Boolean(
    initialFilters.submittedDateFrom &&
    initialFilters.submittedDateTo &&
    initialFilters.submittedDateFrom === initialFilters.submittedDateTo &&
    initialFilters.submittedDateFrom.trim() !== ""
  );

  const initialDate = isValidSingleDate ? initialFilters.submittedDateFrom! : "";

  const pushUpdatedFilters = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());

    // Reset pagination to page 1 whenever filters change
    params.delete("page");

    // Apply explicit updates
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && value.trim() !== "" && !(key === "pageSize" && value.trim() === "20")) {
        params.set(key, value.trim());
      } else {
        params.delete(key);
      }
    });

    // Sweep and purge any remaining empty or whitespace parameters and default values
    Array.from(params.keys()).forEach((key) => {
      const val = params.get(key);
      if (!val || val.trim() === "" || (key === "pageSize" && val.trim() === "20")) {
        params.delete(key);
      }
    });

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    pushUpdatedFilters({ code: codeInput.trim() || undefined });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    pushUpdatedFilters({ reviewStatus: e.target.value || undefined });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value || undefined;
    pushUpdatedFilters({
      submittedDateFrom: selectedDate,
      submittedDateTo: selectedDate,
    });
  };

  const handleClearDate = () => {
    pushUpdatedFilters({
      submittedDateFrom: undefined,
      submittedDateTo: undefined,
    });
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    pushUpdatedFilters({ pageSize: e.target.value === "20" ? undefined : e.target.value });
  };

  return (
    <section className={styles.toolbar}>
      <form onSubmit={handleCodeSubmit} className={styles.filterForm} style={{ flexDirection: "column", gap: "1rem" }}>
        {/* Row 1: Code Search & Review Status */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", width: "100%", alignItems: "flex-start" }}>
          <div className={styles.filterField} style={{ flex: "1 1 280px" }}>
            <label className={styles.filterLabel} htmlFor="code-filter">
              بحث بالرمز
            </label>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                id="code-filter"
                type="text"
                name="code"
                className={styles.filterInput}
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder="مثال: RF-001"
              />
              <button
                type="submit"
                className={styles.primaryAction}
                style={{ minHeight: "3.25rem", paddingInline: "1.25rem", whiteSpace: "nowrap" }}
              >
                بحث
              </button>
            </div>
          </div>

          <div className={styles.filterField} style={{ flex: "1 1 200px" }}>
            <label className={styles.filterLabel} htmlFor="status-filter">
              حالة المراجعة
            </label>
            <select
              id="status-filter"
              name="reviewStatus"
              className={styles.filterInput}
              value={initialFilters.reviewStatus || ""}
              onChange={handleStatusChange}
            >
              <option value="">جميع الحالات</option>
              <option value="submitted">قيد المراجعة</option>
              <option value="accepted">مقبول</option>
              <option value="rejected">مرفوض</option>
              <option value="cancelled">ملغى</option>
            </select>
          </div>
        </div>

        {/* Row 2: Submission Date & Page Size */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", width: "100%", alignItems: "flex-start" }}>
          <div className={styles.filterField} style={{ flex: "1 1 240px" }}>
            <label className={styles.filterLabel} htmlFor="date-filter">
              تاريخ الاستمارة
            </label>
            <div style={{ position: "relative", width: "100%" }}>
              <input
                id="date-filter"
                type="date"
                name="submittedDate"
                className={styles.filterInput}
                style={{
                  paddingLeft: hasAnyDateFilter ? "4.75rem" : "0.875rem",
                  paddingRight: "0.875rem",
                }}
                value={initialDate}
                onChange={handleDateChange}
              />
              {hasAnyDateFilter ? (
                <button
                  type="button"
                  onClick={handleClearDate}
                  aria-label="إزالة فلتر تاريخ الاستمارة"
                  style={{
                    position: "absolute",
                    left: "0.5rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    zIndex: 2,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    padding: "0.25rem 0.5rem",
                    borderRadius: "9999px",
                    border: "1px solid var(--color-border, #d1d5db)",
                    background: "var(--color-muted-bg, #f3f4f6)",
                    color: "var(--color-foreground, #1f2937)",
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    lineHeight: 1,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span aria-hidden="true" style={{ fontSize: "0.9375rem", fontWeight: 700 }}>×</span>
                  <span>إزالة</span>
                </button>
              ) : null}
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--color-muted)", marginTop: "0.125rem" }}>
              يوم / شهر / سنة
            </span>
          </div>

          <div className={styles.filterField} style={{ flex: "1 1 240px" }}>
            <label className={styles.filterLabel} htmlFor="pagesize-filter">
              عدد العناصر بالصفحة
            </label>
            <select
              id="pagesize-filter"
              name="pageSize"
              className={styles.filterInput}
              value={String(initialFilters.pageSize || 20)}
              onChange={handlePageSizeChange}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span style={{ fontSize: "0.75rem", color: "transparent", marginTop: "0.125rem", userSelect: "none" }} aria-hidden="true">
              &nbsp;
            </span>
          </div>
        </div>
      </form>
    </section>
  );
}
