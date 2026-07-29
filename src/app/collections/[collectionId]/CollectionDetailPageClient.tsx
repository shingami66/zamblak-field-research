"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePrototypeStore } from "@/lib/forms-prototype/store-context";
import {
  formatCurrency,
  formatDate,
} from "@/lib/forms-prototype/format";
import { DEV_DEMO_NOTICE } from "@/lib/forms-prototype/copy";
import { BackLink } from "@/components/shared/BackLink";
import { SuccessNotice } from "@/components/shared/SuccessNotice";
import { getSuccessNotice } from "@/lib/ui/success-notice";
import styles from "../collections.module.css";

type Props = {
  collectionId: string;
};

export default function CollectionDetailPageClient({ collectionId }: Props) {
  const { state, isHydrated } = usePrototypeStore();
  const searchParams = useSearchParams();
  const rawSuccess = searchParams.get("success") ?? undefined;
  const successNotice = getSuccessNotice(rawSuccess);

  const collection = useMemo(() => {
    return state.collections.find((c) => c.id === collectionId) ?? null;
  }, [state.collections, collectionId]);

  const company = useMemo(() => {
    if (!collection) return null;
    return state.companies.find((c) => c.id === collection.companyId) ?? null;
  }, [state.companies, collection]);

  // Project lookup: explicit or derived from first form
  const project = useMemo(() => {
    if (!collection) return null;
    if (collection.projectId) {
      return state.projects.find((p) => p.id === collection.projectId) ?? null;
    }
    if (collection.allocations.length > 0) {
      const firstForm = state.forms.find((f) => f.id === collection.allocations[0].formId);
      if (firstForm) {
        return state.projects.find((p) => p.id === firstForm.projectId) ?? null;
      }
    }
    return null;
  }, [collection, state.projects, state.forms]);

  // Linked forms details
  const paidFormsDetails = useMemo(() => {
    if (!collection) return [];
    return collection.allocations.map((alloc) => {
      const form = state.forms.find((f) => f.id === alloc.formId);
      const participant = form
        ? state.participants.find((p) => p.id === form.participantId)
        : null;

      return {
        ...alloc,
        formCode: form?.code ?? "—",
        participantName: participant?.name ?? "—",
        reviewedDate: form?.reviewedDate ?? form?.submittedDate ?? null,
        priceSnapshot: form?.acceptedPriceSnapshot ?? alloc.amount,
      };
    });
  }, [collection, state.forms, state.participants]);

  const isLegacyRecord = collection
    ? collection.allocations.length === 0 || collection.method !== "cash" || !collection.projectId
    : false;

  if (!isHydrated) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingBlock}>
          <div>جاري تحميل البيانات...</div>
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className={styles.page}>
        <header className={styles.pageIntro}>
          <div>
            <BackLink href="/collections">العودة إلى الدفعات النقدية</BackLink>
            <h1 className={styles.pageTitle} style={{ marginTop: "0.5rem" }}>
              الدفعة النقدية غير موجودة
            </h1>
          </div>
        </header>
        <div className={styles.devNotice} role="alert">
          لم يتم العثور على سجل الدفعة النقدية المطلوب في البيانات التجريبية.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageIntro}>
        <div>
          <BackLink href="/collections">العودة إلى الدفعات النقدية</BackLink>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.5rem" }}>
            <h1 className={styles.pageTitle}>
              تفاصيل الدفعة النقدية: <bdi dir="ltr">{collection.code}</bdi>
            </h1>
          </div>
        </div>
      </header>

      <SuccessNotice message={successNotice} />

      <div className={styles.devNotice} role="status">
        <strong>تنبيه:</strong> {DEV_DEMO_NOTICE}
      </div>

      {isLegacyRecord && (
        <div className={styles.emptyNotice} role="status" style={{ marginBottom: "1.5rem" }}>
          <strong>سجل تجريبي قديم:</strong> هذا السجل تم إنشاؤه وفق نموذج أولي سابق.
        </div>
      )}

      <div className={styles.detailStack}>
        {/* Payment details card */}
        <div className={styles.detailCard}>
          <h2 className={styles.detailTitle}>بيانات الدفعة النقدية</h2>
          <dl className={styles.descriptionList}>
            <div className={styles.descriptionRow}>
              <dt className={styles.descriptionLabel}>رقم الدفعة</dt>
              <dd className={styles.descriptionValue}>
                <bdi dir="ltr">{collection.code}</bdi>
              </dd>
            </div>
            <div className={styles.descriptionRow}>
              <dt className={styles.descriptionLabel}>الشركة</dt>
              <dd className={styles.descriptionValue}>{company?.name ?? "—"}</dd>
            </div>
            <div className={styles.descriptionRow}>
              <dt className={styles.descriptionLabel}>المشروع</dt>
              <dd className={styles.descriptionValue}>{project?.name ?? "—"}</dd>
            </div>
            <div className={styles.descriptionRow}>
              <dt className={styles.descriptionLabel}>تاريخ الدفع</dt>
              <dd className={styles.descriptionValue}>
                <bdi dir="ltr">{formatDate(collection.date)}</bdi>
              </dd>
            </div>
            <div className={styles.descriptionRow}>
              <dt className={styles.descriptionLabel}>إجمالي الدفعة</dt>
              <dd className={styles.descriptionValue}>
                <bdi dir="ltr">{formatCurrency(collection.totalAmount)}</bdi>
              </dd>
            </div>
            <div className={styles.descriptionRow}>
              <dt className={styles.descriptionLabel}>عدد الاستمارات المدفوعة</dt>
              <dd className={styles.descriptionValue}>{paidFormsDetails.length}</dd>
            </div>
          </dl>
        </div>

        {/* Paid forms details card */}
        <div className={styles.detailCard}>
          <h2 className={styles.detailTitle}>الاستمارات المدفوعة في هذه الدفعة</h2>
          {paidFormsDetails.length === 0 ? (
            <p className={styles.pageDescription}>
              لا توجد استمارات مقبولة مربوطة بهذه الدفعة النقدية.
            </p>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className={styles.desktopView}>
                <table className={styles.allocationsTable} style={{ marginTop: 0 }}>
                  <thead>
                    <tr>
                      <th scope="col">رمز الاستمارة</th>
                      <th scope="col">المشارك</th>
                      <th scope="col">تاريخ القبول</th>
                      <th scope="col">القيمة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paidFormsDetails.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <Link href={`/forms/${item.formId}`} className={styles.cardLink}>
                            <bdi dir="ltr">{item.formCode}</bdi>
                          </Link>
                        </td>
                        <td>{item.participantName}</td>
                        <td>
                          {item.reviewedDate ? (
                            <bdi dir="ltr">{formatDate(item.reviewedDate)}</bdi>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          <bdi dir="ltr">{formatCurrency(item.priceSnapshot)}</bdi>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className={styles.mobileView}>
                {paidFormsDetails.map((item) => (
                  <div key={item.id} className={styles.allocationDetailCard}>
                    <div className={styles.allocationCardHeader}>
                      <span className={styles.allocationCardLabel}>رمز الاستمارة</span>
                      <Link href={`/forms/${item.formId}`} className={styles.cardLink}>
                        <bdi dir="ltr">{item.formCode}</bdi>
                      </Link>
                    </div>
                    <div className={styles.allocationCardBody}>
                      <div className={styles.allocationCardRow}>
                        <span className={styles.allocationCardLabel}>المشارك:</span>
                        <span>{item.participantName}</span>
                      </div>
                      <div className={styles.allocationCardRow}>
                        <span className={styles.allocationCardLabel}>تاريخ القبول:</span>
                        {item.reviewedDate ? (
                          <bdi dir="ltr">{formatDate(item.reviewedDate)}</bdi>
                        ) : (
                          "—"
                        )}
                      </div>
                      <div className={styles.allocationCardRow}>
                        <span className={styles.allocationCardLabel}>القيمة:</span>
                        <bdi dir="ltr">{formatCurrency(item.priceSnapshot)}</bdi>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
