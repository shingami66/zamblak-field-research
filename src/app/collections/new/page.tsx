"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePrototypeStore } from "@/lib/forms-prototype/store-context";
import {
  deriveFormFinance,
  getEligibleProjectsForCompany,
  isFormEligibleForPayment,
} from "@/lib/forms-prototype/domain";
import {
  formatCurrency,
  formatDate,
} from "@/lib/forms-prototype/format";
import {
  PROTOTYPE_ERROR_MESSAGES,
  DEV_DEMO_NOTICE,
} from "@/lib/forms-prototype/copy";
import { BackLink } from "@/components/shared/BackLink";
import styles from "../collections.module.css";

export default function NewCollectionPage() {
  const { state, isHydrated, createCollection } = usePrototypeStore();
  const router = useRouter();

  // Wizard state (Steps 1, 2, 3)
  const [step, setStep] = useState(1);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Selection state
  const [companyId, setCompanyId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [selectedFormIds, setSelectedFormIds] = useState<Set<string>>(new Set());
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Objects
  const selectedCompanyObj = useMemo(() => {
    return state.companies.find((c) => c.id === companyId) ?? null;
  }, [state.companies, companyId]);

  const eligibleProjects = useMemo(() => {
    if (!companyId) return [];
    return getEligibleProjectsForCompany(
      companyId,
      state.projects,
      state.forms,
      state.collections
    );
  }, [companyId, state.projects, state.forms, state.collections]);

  const selectedProjectObj = useMemo(() => {
    return state.projects.find((p) => p.id === projectId) ?? null;
  }, [state.projects, projectId]);

  // Eligible forms for selected company + project
  const eligibleFormsForProject = useMemo(() => {
    if (!companyId || !projectId) return [];
    return state.forms
      .filter((form) => form.companyId === companyId && form.projectId === projectId)
      .filter((form) => isFormEligibleForPayment(form, state.collections))
      .map((form) => {
        const participant = state.participants.find((p) => p.id === form.participantId);
        const finance = deriveFormFinance(form, state.collections);
        return {
          ...form,
          participantName: participant?.name ?? "",
          finance,
        };
      });
  }, [state.forms, state.collections, companyId, projectId, state.participants]);

  // Calculated total amount (sum of selected form price snapshots)
  const selectedFormsList = useMemo(() => {
    return eligibleFormsForProject.filter((f) => selectedFormIds.has(f.id));
  }, [eligibleFormsForProject, selectedFormIds]);

  const calculatedTotal = useMemo(() => {
    return selectedFormsList.reduce(
      (sum, f) => sum + (f.acceptedPriceSnapshot ?? 0),
      0
    );
  }, [selectedFormsList]);

  // Handlers
  const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCompanyId(e.target.value);
    setProjectId("");
    setSelectedFormIds(new Set());
    setValidationError(null);
  };

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setProjectId(e.target.value);
    setSelectedFormIds(new Set());
    setValidationError(null);
  };

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!companyId) {
      setValidationError(PROTOTYPE_ERROR_MESSAGES.payment_company_required);
      return;
    }
    if (!projectId) {
      setValidationError(PROTOTYPE_ERROR_MESSAGES.payment_project_required);
      return;
    }
    if (eligibleFormsForProject.length === 0) {
      setValidationError("لا توجد استمارات مؤهلة للدفع في هذا المشروع.");
      return;
    }

    setStep(2);
  };

  const handleToggleForm = (formId: string) => {
    const next = new Set(selectedFormIds);
    if (next.has(formId)) {
      next.delete(formId);
    } else {
      next.add(formId);
    }
    setSelectedFormIds(next);
    setValidationError(null);
  };

  const handleSelectAllForms = () => {
    if (selectedFormIds.size === eligibleFormsForProject.length) {
      setSelectedFormIds(new Set());
    } else {
      const all = new Set(eligibleFormsForProject.map((f) => f.id));
      setSelectedFormIds(all);
    }
    setValidationError(null);
  };

  const handleStep2Next = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (selectedFormIds.size === 0) {
      setValidationError(PROTOTYPE_ERROR_MESSAGES.payment_forms_required);
      return;
    }

    setStep(3);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!date) {
      setValidationError(PROTOTYPE_ERROR_MESSAGES.collection_date_required);
      return;
    }

    if (selectedFormIds.size === 0) {
      setValidationError(PROTOTYPE_ERROR_MESSAGES.payment_forms_required);
      return;
    }

    // Atomic re-verification: verify no selected form has been paid concurrently
    for (const form of selectedFormsList) {
      const freshFinance = deriveFormFinance(form, state.collections);
      if (freshFinance.outstandingAmount <= 0) {
        setValidationError(PROTOTYPE_ERROR_MESSAGES.payment_stale_paid);
        return;
      }
    }

    const allocations = selectedFormsList.map((form) => ({
      formId: form.id,
      amount: form.acceptedPriceSnapshot ?? 0,
    }));

    createCollection({
      companyId,
      projectId,
      date,
      totalAmount: calculatedTotal,
      method: "cash",
      reference: null,
      notes: null,
      allocations,
    });

    router.push("/collections?success=create_collection");
  };

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
          <BackLink href="/collections">العودة للدفعات النقدية</BackLink>
          <h1 className={styles.pageTitle}>تسجيل دفعة نقدية جديدة</h1>
          <p className={styles.pageDescription}>
            اختر الشركة والمشروع ثم حدّد الاستمارات المقبولة التي تم تسديد قيمتها.
          </p>
        </div>
      </header>

      <div className={styles.devNotice} role="status">
        <strong>تنبيه:</strong> {DEV_DEMO_NOTICE}
      </div>

      {/* Step Indicator */}
      <nav className={styles.wizardNav} aria-label="خطوات تسجيل الدفعة النقدية">
        <ol className={styles.wizardSteps}>
          <li
            className={`${styles.wizardStep} ${step === 1 ? styles.activeStep : ""}`}
            aria-current={step === 1 ? "step" : undefined}
          >
            الخطوة 1: اختيار الشركة والمشروع
          </li>
          <li
            className={`${styles.wizardStep} ${step === 2 ? styles.activeStep : ""}`}
            aria-current={step === 2 ? "step" : undefined}
          >
            الخطوة 2: اختيار الاستمارات المدفوعة
          </li>
          <li
            className={`${styles.wizardStep} ${step === 3 ? styles.activeStep : ""}`}
            aria-current={step === 3 ? "step" : undefined}
          >
            الخطوة 3: مراجعة وتأكيد الدفعة
          </li>
        </ol>
      </nav>

      {validationError && (
        <div className={styles.errorAlert} role="alert">
          {validationError}
        </div>
      )}

      {/* STEP 1: COMPANY AND PROJECT */}
      {step === 1 && (
        <form onSubmit={handleStep1Next} className={styles.formCard}>
          <h2 className={styles.cardTitle}>اختر الشركة والمشروع</h2>

          <div className={styles.fieldGroup}>
            <label htmlFor="company-select" className={styles.label}>
              الشركة <span className={styles.required}>*</span>
            </label>
            <select
              id="company-select"
              className={styles.selectInput}
              value={companyId}
              onChange={handleCompanyChange}
              required
            >
              <option value="">-- اختر الشركة --</option>
              {state.companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="project-select" className={styles.label}>
              المشروع <span className={styles.required}>*</span>
            </label>
            <select
              id="project-select"
              className={styles.selectInput}
              value={projectId}
              onChange={handleProjectChange}
              disabled={!companyId}
              required
            >
              <option value="">
                {!companyId
                  ? "-- اختر الشركة أولاً --"
                  : eligibleProjects.length === 0
                  ? "-- لا توجد مشاريع بها استمارات غير مدفوعة --"
                  : "-- اختر المشروع --"}
              </option>
              {eligibleProjects.map(({ project, unpaidCount, totalOutstanding }) => (
                <option key={project.id} value={project.id}>
                  {project.name} - {unpaidCount} استمارات غير مدفوعة · {formatCurrency(totalOutstanding)}
                </option>
              ))}
            </select>
          </div>

          {companyId && eligibleProjects.length === 0 && (
            <div className={styles.emptyNotice} role="status">
              لا توجد مشاريع لديها استمارات مقبولة غير مدفوعة لهذه الشركة.
            </div>
          )}

          <div className={styles.formActions}>
            <button
              type="submit"
              className={styles.primaryBtn}
              disabled={!companyId || !projectId || eligibleProjects.length === 0}
            >
              متابعة لاختيار الاستمارات
            </button>
            <Link href="/collections" className={styles.secondaryLink}>
              إلغاء
            </Link>
          </div>
        </form>
      )}

      {/* STEP 2: SELECT PAID FORMS */}
      {step === 2 && (
        <form onSubmit={handleStep2Next} className={styles.formCardWide}>
          <div className={styles.step2Header}>
            <div>
              <h2 className={styles.cardTitle}>اختيار الاستمارات المدفوعة</h2>
              <p className={styles.cardSubtitle}>
                المشروع: <strong>{selectedProjectObj?.name}</strong> · الشركة:{" "}
                <strong>{selectedCompanyObj?.name}</strong>
              </p>
            </div>
            <button
              type="button"
              className={styles.selectAllBtn}
              onClick={handleSelectAllForms}
            >
              {selectedFormIds.size === eligibleFormsForProject.length
                ? "إلغاء تحديد الكل"
                : "اختيار الكل"}
            </button>
          </div>

          {/* Live Summary Bar */}
          <div className={styles.liveSummaryBar} role="status">
            <span>
              الاستمارات المحددة: <strong>{selectedFormIds.size}</strong>
            </span>
            <span>
              إجمالي الدفعة:{" "}
              <bdi dir="ltr">
                <strong>{formatCurrency(calculatedTotal)}</strong>
              </bdi>
            </span>
          </div>

          {eligibleFormsForProject.length === 0 ? (
            <div className={styles.emptyNotice}>
              لا توجد استمارات مؤهلة للدفع في هذا المشروع.
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className={styles.desktopView}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col" style={{ width: "3.5rem" }}>
                        اختر
                      </th>
                      <th scope="col">رمز الاستمارة</th>
                      <th scope="col">المشارك</th>
                      <th scope="col">تاريخ القبول</th>
                      <th scope="col">القيمة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eligibleFormsForProject.map((form) => {
                      const isSelected = selectedFormIds.has(form.id);
                      return (
                        <tr
                          key={form.id}
                          className={isSelected ? styles.selectedRow : undefined}
                        >
                          <td>
                            <input
                              type="checkbox"
                              id={`form-check-${form.id}`}
                              checked={isSelected}
                              onChange={() => handleToggleForm(form.id)}
                              aria-label={`اختيار الاستمارة ${form.code}`}
                            />
                          </td>
                          <td>
                            <bdi dir="ltr">{form.code}</bdi>
                          </td>
                          <td>{form.participantName}</td>
                          <td>
                            {form.reviewedDate ? (
                              <bdi dir="ltr">{formatDate(form.reviewedDate)}</bdi>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td>
                            <bdi dir="ltr">
                              {form.acceptedPriceSnapshot
                                ? formatCurrency(form.acceptedPriceSnapshot)
                                : "القيمة غير محددة"}
                            </bdi>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className={styles.mobileView}>
                {eligibleFormsForProject.map((form) => {
                  const isSelected = selectedFormIds.has(form.id);
                  return (
                    <div
                      key={form.id}
                      className={`${styles.mobileFormCard} ${
                        isSelected ? styles.mobileCardSelected : ""
                      }`}
                      onClick={() => handleToggleForm(form.id)}
                    >
                      <div className={styles.mobileCardHeader}>
                        <input
                          type="checkbox"
                          id={`m-form-check-${form.id}`}
                          checked={isSelected}
                          onChange={() => handleToggleForm(form.id)}
                          aria-label={`اختيار الاستمارة ${form.code}`}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className={styles.mobileCardCode}>
                          <bdi dir="ltr">{form.code}</bdi>
                        </span>
                      </div>
                      <div className={styles.mobileCardBody}>
                        <div>المشارك: {form.participantName}</div>
                        <div>
                          القيمة:{" "}
                          <bdi dir="ltr">
                            {form.acceptedPriceSnapshot
                              ? formatCurrency(form.acceptedPriceSnapshot)
                              : "القيمة غير محددة"}
                          </bdi>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className={styles.formActions}>
            <button
              type="submit"
              className={styles.primaryBtn}
              disabled={selectedFormIds.size === 0}
            >
              مراجعة الدفعة
            </button>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => setStep(1)}
            >
              العودة لاختيار المشروع
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: REVIEW AND CONFIRM */}
      {step === 3 && (
        <form onSubmit={handleSubmit} className={styles.formCard}>
          <h2 className={styles.cardTitle}>مراجعة وتأكيد الدفعة النقدية</h2>

          <div className={styles.reviewCard}>
            <div className={styles.reviewRow}>
              <span className={styles.reviewLabel}>الشركة:</span>
              <span className={styles.reviewValue}>{selectedCompanyObj?.name}</span>
            </div>
            <div className={styles.reviewRow}>
              <span className={styles.reviewLabel}>المشروع:</span>
              <span className={styles.reviewValue}>{selectedProjectObj?.name}</span>
            </div>
            <div className={styles.reviewRow}>
              <span className={styles.reviewLabel}>عدد الاستمارات:</span>
              <span className={styles.reviewValue}>{selectedFormsList.length}</span>
            </div>
            <div className={styles.reviewRow}>
              <span className={styles.reviewLabel}>الاستمارات المحددة:</span>
              <span className={styles.reviewValue}>
                {selectedFormsList.map((f) => f.code).join(" ، ")}
              </span>
            </div>
            <div className={styles.reviewRowHighlight}>
              <span className={styles.reviewLabel}>إجمالي الدفعة النقدية:</span>
              <span className={styles.reviewValue}>
                <bdi dir="ltr">{formatCurrency(calculatedTotal)}</bdi>
              </span>
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="payment-date" className={styles.label}>
              تاريخ الدفع <span className={styles.required}>*</span>
            </label>
            <input
              id="payment-date"
              type="date"
              className={styles.textInput}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            {date && (
              <span className={styles.fieldHelper}>
                التاريخ المحدد: <bdi dir="ltr">{formatDate(date)}</bdi>
              </span>
            )}
          </div>

          <div className={styles.confirmNotice} role="status">
            سيتم تسجيل دفعة نقدية وربطها بالاستمارات المحددة.
          </div>

          <div className={styles.formActions}>
            <button type="submit" className={styles.primaryBtn}>
              تأكيد تسجيل الدفعة
            </button>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => setStep(2)}
            >
              العودة لاختيار الاستمارات
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
