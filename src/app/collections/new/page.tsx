"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePrototypeStore } from "@/lib/forms-prototype/store-context";
import {
  deriveFormFinance,
  validateCollectionDraft,
} from "@/lib/forms-prototype/domain";
import {
  formatCurrency,
  formatDate,
} from "@/lib/forms-prototype/format";
import {
  PROTOTYPE_ERROR_MESSAGES,
  COLLECTION_METHOD_LABELS,
  DEV_DEMO_NOTICE,
} from "@/lib/forms-prototype/copy";
import { BackLink } from "@/components/shared/BackLink";
import styles from "../collections.module.css";
import type { CollectionMethod } from "@/lib/forms-prototype/types";

export default function NewCollectionPage() {
  const { state, isHydrated, createCollection } = usePrototypeStore();
  const router = useRouter();

  // Wizard state
  const [step, setStep] = useState(1);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Step 1 Fields
  const [companyId, setCompanyId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [totalAmountStr, setTotalAmountStr] = useState("");
  const [method, setMethod] = useState<CollectionMethod | "">("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  // Step 2 Fields
  const [selectedFormIds, setSelectedFormIds] = useState<Set<string>>(new Set());
  const [allocations, setAllocations] = useState<Record<string, string>>({});

  const selectedCompanyObj = useMemo(() => {
    return state.companies.find((c) => c.id === companyId) ?? null;
  }, [state.companies, companyId]);

  // Outstanding accepted forms for selected company
  const outstandingForms = useMemo(() => {
    if (!companyId) return [];
    return state.forms
      .filter((form) => form.companyId === companyId && form.status === "accepted")
      .map((form) => {
        const finance = deriveFormFinance(form, state.collections);
        const project = state.projects.find((p) => p.id === form.projectId);
        const participant = state.participants.find((p) => p.id === form.participantId);
        return {
          ...form,
          finance,
          projectName: project?.name ?? "",
          participantName: participant?.name ?? "",
        };
      })
      .filter((form) => form.finance.outstandingAmount > 0);
  }, [state.forms, state.collections, companyId, state.projects, state.participants]);

  // Step 2 Totals
  const totalAmountVal = Number(totalAmountStr) || 0;
  const allocatedAmountVal = useMemo(() => {
    let sum = 0;
    for (const formId of selectedFormIds) {
      const amountStr = allocations[formId];
      if (amountStr) {
        sum += Number(amountStr) || 0;
      }
    }
    return sum;
  }, [selectedFormIds, allocations]);

  const unallocatedAmountVal = Math.max(totalAmountVal - allocatedAmountVal, 0);

  if (!isHydrated) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingBlock}>
          <div>جاري تحميل البيانات...</div>
        </div>
      </div>
    );
  }

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!companyId) {
      setValidationError(PROTOTYPE_ERROR_MESSAGES.collection_company_required);
      return;
    }
    if (!date) {
      setValidationError(PROTOTYPE_ERROR_MESSAGES.collection_date_required);
      return;
    }
    if (!method) {
      setValidationError(PROTOTYPE_ERROR_MESSAGES.collection_method_required);
      return;
    }
    const val = Number(totalAmountStr);
    if (isNaN(val) || val <= 0) {
      setValidationError(PROTOTYPE_ERROR_MESSAGES.collection_total_positive);
      return;
    }

    setStep(2);
  };

  const handleToggleForm = (formId: string, outstanding: number) => {
    const next = new Set(selectedFormIds);
    if (next.has(formId)) {
      next.delete(formId);
      // Clean up allocation input
      const nextAllocs = { ...allocations };
      delete nextAllocs[formId];
      setAllocations(nextAllocs);
    } else {
      next.add(formId);
      // Auto-set input value to outstanding or remaining total
      const currentAllocated = Object.entries(allocations)
        .filter(([id]) => selectedFormIds.has(id))
        .reduce((sum, [, amt]) => sum + (Number(amt) || 0), 0);
      const remainingTotal = Math.max(totalAmountVal - currentAllocated, 0);
      const defaultVal = Math.min(outstanding, remainingTotal);

      setAllocations({
        ...allocations,
        [formId]: defaultVal > 0 ? String(defaultVal) : "",
      });
    }
    setSelectedFormIds(next);
  };

  const handleAllocationChange = (formId: string, value: string) => {
    setAllocations({
      ...allocations,
      [formId]: value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const mappedAllocations = Array.from(selectedFormIds)
      .map((formId) => {
        const valStr = allocations[formId];
        const val = Number(valStr) || 0;
        return { formId, amount: val };
      })
      .filter((a) => a.amount > 0);

    const input = {
      companyId,
      date,
      totalAmount: totalAmountVal,
      method: method as CollectionMethod,
      reference: reference.trim() || null,
      notes: notes.trim() || null,
      allocations: mappedAllocations,
    };

    const validated = validateCollectionDraft(input, {
      forms: state.forms,
      collections: state.collections,
    });

    if (!validated.ok) {
      setValidationError(PROTOTYPE_ERROR_MESSAGES[validated.code]);
      return;
    }

    // Determine the next collection ID to redirect to it
    let max = 0;
    for (const col of state.collections) {
      if (col.id.startsWith("col-")) {
        const num = Number.parseInt(col.id.slice(4), 10);
        if (num > max) max = num;
      }
    }
    const nextId = `col-${max + 1}`;

    createCollection(input);
    router.push(`/collections/${nextId}?success=create_collection`);
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageIntro}>
        <div>
          <BackLink href="/collections">العودة إلى التحصيلات</BackLink>
          <h1 className={styles.pageTitle} style={{ marginTop: "0.5rem" }}>تسجيل تحصيل تجريبي جديد</h1>
        </div>
      </header>

      <div className={styles.devNotice} role="status">
        <strong>تنبيه:</strong> {DEV_DEMO_NOTICE}
      </div>

      <div className={`${styles.formContainer} ${step === 2 ? styles.formContainerWide : ""}`}>
        {/* Restrained Accessible Step Indicator */}
        <nav aria-label="خطوات تسديد التحصيل" className={styles.stepIndicatorNav}>
          <ol className={styles.stepIndicatorList}>
            <li
              className={`${styles.stepIndicatorItem} ${step === 1 ? styles.stepActive : styles.stepCompleted}`}
              aria-current={step === 1 ? "step" : undefined}
            >
              <span className={styles.stepBadge}>1</span>
              <span className={styles.stepLabel}>الخطوة 1: تفاصيل الدفعة</span>
            </li>
            <li className={styles.stepDivider} aria-hidden="true" />
            <li
              className={`${styles.stepIndicatorItem} ${step === 2 ? styles.stepActive : styles.stepInactive}`}
              aria-current={step === 2 ? "step" : undefined}
            >
              <span className={styles.stepBadge}>2</span>
              <span className={styles.stepLabel}>الخطوة 2: توزيع المبلغ</span>
            </li>
          </ol>
        </nav>

        {validationError && (
          <div
            className={styles.validationError}
            role="alert"
            style={{
              padding: "0.875rem 1rem",
              background: "var(--color-danger-bg)",
              borderRadius: "0.5rem",
              marginBlockEnd: "1.5rem",
            }}
          >
            {validationError}
          </div>
        )}

        {step === 1 ? (
          // STEP 1 Form
          <form onSubmit={handleStep1Next} className={styles.formGrid}>
            <div className={styles.formField}>
              <label className={styles.formLabel} htmlFor="col-company">الشركة المحصّل منها</label>
              <select
                id="col-company"
                className={styles.formInput}
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                required
              >
                <option value="">-- اختر الشركة --</option>
                {state.companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel} htmlFor="col-date">تاريخ التحصيل</label>
              <input
                id="col-date"
                type="date"
                className={styles.formInput}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
              {date && !isNaN(new Date(date).getTime()) && (
                <span className={styles.datePreviewHelper}>
                  التاريخ المحدد: <bdi dir="ltr">{formatDate(date)}</bdi>
                </span>
              )}
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel} htmlFor="col-amount">إجمالي المبلغ المحصّل (ر.س)</label>
              <input
                id="col-amount"
                type="number"
                min="1"
                step="any"
                placeholder="أدخل إجمالي قيمة التحصيل"
                className={styles.formInput}
                value={totalAmountStr}
                onChange={(e) => setTotalAmountStr(e.target.value)}
                required
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel} htmlFor="col-method">طريقة الدفع</label>
              <select
                id="col-method"
                className={styles.formInput}
                value={method}
                onChange={(e) => setMethod(e.target.value as CollectionMethod)}
                required
              >
                <option value="">-- اختر طريقة الدفع --</option>
                {Object.entries(COLLECTION_METHOD_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel} htmlFor="col-reference">رقم المرجع (اختياري)</label>
              <input
                id="col-reference"
                type="text"
                placeholder="مثال: رقم التحويل أو الشيك"
                className={styles.formInput}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel} htmlFor="col-notes">ملاحظات (اختياري)</label>
              <textarea
                id="col-notes"
                className={styles.formTextarea}
                placeholder="تفاصيل إضافية حول الدفعة..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Actions in RTL order: Primary first */}
            <div className={styles.formActions}>
              <button type="submit" className={styles.primaryAction}>
                متابعة لتوزيع المبلغ
              </button>
              <Link href="/collections" className={styles.secondaryAction}>
                إلغاء
              </Link>
            </div>
          </form>
        ) : (
          // STEP 2 Allocations
          <form onSubmit={handleSubmit} className={styles.formGrid}>
            <div className={styles.allocationSummaryBar}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>الشركة المحصّل منها</span>
                <strong className={styles.summaryValue}>{selectedCompanyObj?.name ?? "—"}</strong>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>المبلغ المراد توزيعه</span>
                <strong className={styles.summaryValue}>
                  <bdi dir="ltr">{formatCurrency(totalAmountVal)}</bdi>
                </strong>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>إجمالي المبلغ المخصص</span>
                <strong className={styles.summaryValue}>
                  <bdi dir="ltr">{formatCurrency(allocatedAmountVal)}</bdi>
                </strong>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>المتبقي غير الموزع</span>
                <strong
                  className={`${styles.summaryValue} ${
                    unallocatedAmountVal > 0 ? styles.summaryWarning : styles.summarySuccess
                  }`}
                >
                  <bdi dir="ltr">{formatCurrency(unallocatedAmountVal)}</bdi>
                </strong>
              </div>
            </div>

            <div className={styles.formField}>
              <span className={styles.formLabel}>الاستمارات المقبولة المعلقة بالتحصيل</span>
              {outstandingForms.length === 0 ? (
                <p className={styles.pageDescription} style={{ color: "var(--color-danger)" }}>
                  لا توجد استمارات مقبولة ذات مستحقات معلقة لهذه الشركة حالياً.
                </p>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className={styles.desktopView}>
                    <table className={styles.allocationsTable}>
                      <thead>
                        <tr>
                          <th scope="col" style={{ width: "3.5rem" }}>اختر</th>
                          <th scope="col">رمز الاستمارة</th>
                          <th scope="col">المشروع</th>
                          <th scope="col">المشارك</th>
                          <th scope="col">المتبقي المستحق</th>
                          <th scope="col" style={{ width: "10rem" }}>المبلغ الموزع</th>
                        </tr>
                      </thead>
                      <tbody>
                        {outstandingForms.map((form) => {
                          const isSelected = selectedFormIds.has(form.id);
                          const formInputId = `alloc-desktop-input-${form.id}`;
                          return (
                            <tr
                              key={form.id}
                              style={{ background: isSelected ? "rgb(15 61 62 / 3%)" : "none" }}
                            >
                              <td>
                                <div className={styles.checkboxTouchTarget}>
                                  <input
                                    type="checkbox"
                                    className={styles.allocCheckbox}
                                    aria-label={`تخصيص للاستمارة ${form.code}`}
                                    checked={isSelected}
                                    onChange={() => handleToggleForm(form.id, form.finance.outstandingAmount)}
                                  />
                                </div>
                              </td>
                              <td><bdi dir="ltr">{form.code}</bdi></td>
                              <td>{form.projectName}</td>
                              <td>{form.participantName}</td>
                              <td><bdi dir="ltr">{formatCurrency(form.finance.outstandingAmount)}</bdi></td>
                              <td>
                                <input
                                  id={formInputId}
                                  type="number"
                                  min="1"
                                  step="any"
                                  disabled={!isSelected}
                                  className={styles.allocInput}
                                  aria-label={`مبلغ التخصيص للاستمارة ${form.code}`}
                                  value={allocations[form.id] ?? ""}
                                  onChange={(e) => handleAllocationChange(form.id, e.target.value)}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card/List View */}
                  <div className={styles.mobileView}>
                    {outstandingForms.map((form) => {
                      const isSelected = selectedFormIds.has(form.id);
                      const formCheckboxId = `alloc-mobile-check-${form.id}`;
                      const formInputId = `alloc-mobile-input-${form.id}`;
                      return (
                        <div
                          key={form.id}
                          className={`${styles.allocationCard} ${
                            isSelected ? styles.allocationCardSelected : ""
                          }`}
                        >
                          <div className={styles.allocationCardHeader}>
                            <label htmlFor={formCheckboxId} className={styles.allocationCardSelectLabel}>
                              <input
                                id={formCheckboxId}
                                type="checkbox"
                                className={styles.allocCheckbox}
                                checked={isSelected}
                                onChange={() => handleToggleForm(form.id, form.finance.outstandingAmount)}
                              />
                              <span className={styles.allocationCardCode}>
                                <bdi dir="ltr">{form.code}</bdi>
                              </span>
                            </label>
                          </div>

                          <div className={styles.allocationCardBody}>
                            <div className={styles.allocationCardRow}>
                              <span className={styles.allocationCardLabel}>المشروع:</span>
                              <span className={styles.allocationCardVal}>{form.projectName}</span>
                            </div>
                            <div className={styles.allocationCardRow}>
                              <span className={styles.allocationCardLabel}>المشارك:</span>
                              <span className={styles.allocationCardVal}>{form.participantName}</span>
                            </div>
                            <div className={styles.allocationCardRow}>
                              <span className={styles.allocationCardLabel}>المتبقي المستحق:</span>
                              <span className={styles.allocationCardVal}>
                                <bdi dir="ltr">{formatCurrency(form.finance.outstandingAmount)}</bdi>
                              </span>
                            </div>
                            <div className={styles.allocationCardRowInput}>
                              <label htmlFor={formInputId} className={styles.allocationCardLabel}>
                                المبلغ الموزع (ر.س):
                              </label>
                              <input
                                id={formInputId}
                                type="number"
                                min="1"
                                step="any"
                                disabled={!isSelected}
                                className={styles.allocInputMobile}
                                aria-label={`مبلغ التخصيص للاستمارة ${form.code}`}
                                value={allocations[form.id] ?? ""}
                                onChange={(e) => handleAllocationChange(form.id, e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Actions in RTL order: Primary first */}
            <div className={styles.formActions}>
              <button
                type="submit"
                className={styles.primaryAction}
                disabled={outstandingForms.length === 0}
              >
                تأكيد وحفظ التحصيل
              </button>
              <button type="button" className={styles.secondaryAction} onClick={() => setStep(1)}>
                الرجوع
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
