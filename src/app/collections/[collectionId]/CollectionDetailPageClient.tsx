"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePrototypeStore } from "@/lib/forms-prototype/store-context";
import {
  computeCollectionTotals,
  deriveFormFinance,
} from "@/lib/forms-prototype/domain";
import {
  formatCurrency,
  formatDate,
} from "@/lib/forms-prototype/format";
import {
  COLLECTION_METHOD_LABELS,
  DEV_DEMO_NOTICE,
} from "@/lib/forms-prototype/copy";
import { BackLink } from "@/components/shared/BackLink";
import { StatusBadge } from "@/components/shared/StatusBadge";
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

  const totals = useMemo(() => {
    if (!collection) return null;
    return computeCollectionTotals(collection);
  }, [collection]);

  // Denormalized allocation details for rendering
  const allocationDetails = useMemo(() => {
    if (!collection) return [];
    return collection.allocations.map((alloc) => {
      const form = state.forms.find((f) => f.id === alloc.formId);
      const project = form ? state.projects.find((p) => p.id === form.projectId) : null;
      const participant = form ? state.participants.find((p) => p.id === form.participantId) : null;

      // Re-evaluate outstanding AFTER this collection's allocation
      const formFinance = form ? deriveFormFinance(form, state.collections) : null;

      return {
        ...alloc,
        formCode: form?.code ?? "—",
        formStatus: form?.status ?? "pending_review",
        projectName: project?.name ?? "—",
        projectId: project?.id ?? "",
        participantName: participant?.name ?? "—",
        participantId: participant?.id ?? "",
        priceSnapshot: form?.acceptedPriceSnapshot ?? 0,
        outstanding: formFinance?.outstandingAmount ?? 0,
      };
    });
  }, [collection, state.forms, state.projects, state.participants, state.collections]);

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
            <BackLink href="/collections">العودة إلى التحصيلات</BackLink>
            <h1 className={styles.pageTitle} style={{ marginTop: "0.5rem" }}>التحصيل غير موجود</h1>
          </div>
        </header>
        <div className={styles.devNotice} role="alert">
          لم يتم العثور على سجل التحصيل المطلوب في البيانات التجريبية.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageIntro}>
        <div>
          <BackLink href="/collections">العودة إلى التحصيلات</BackLink>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.5rem" }}>
            <h1 className={styles.pageTitle}>سند تحصيل: <bdi dir="ltr">{collection.code}</bdi></h1>
            {totals && (
              <StatusBadge variant={totals.unallocatedAmount === 0 ? "active" : "warning"}>
                {totals.unallocatedAmount === 0 ? "مبلغ السند موزع بالكامل" : "مبلغ السند غير موزع بالكامل"}
              </StatusBadge>
            )}
          </div>
        </div>
      </header>

      <SuccessNotice message={successNotice} />

      <div className={styles.devNotice} role="status">
        <strong>تنبيه:</strong> {DEV_DEMO_NOTICE}
      </div>

      <div className={styles.detailStack}>
        {/* Collection details card - Full Width Section */}
        <div className={styles.detailCard}>
          <h2 className={styles.detailTitle}>بيانات سند التحصيل</h2>
          {totals && (
            <dl className={styles.descriptionList}>
              <div className={styles.descriptionRow}>
                <dt className={styles.descriptionLabel}>رمز التحصيل</dt>
                <dd className={styles.descriptionValue}><bdi dir="ltr">{collection.code}</bdi></dd>
              </div>
              <div className={styles.descriptionRow}>
                <dt className={styles.descriptionLabel}>الشركة</dt>
                <dd className={styles.descriptionValue}>{company?.name ?? "—"}</dd>
              </div>
              <div className={styles.descriptionRow}>
                <dt className={styles.descriptionLabel}>تاريخ الاستلام</dt>
                <dd className={styles.descriptionValue}><bdi dir="ltr">{formatDate(collection.date)}</bdi></dd>
              </div>
              <div className={styles.descriptionRow}>
                <dt className={styles.descriptionLabel}>إجمالي المبلغ المحصّل</dt>
                <dd className={styles.descriptionValue}><bdi dir="ltr">{formatCurrency(collection.totalAmount)}</bdi></dd>
              </div>
              <div className={styles.descriptionRow}>
                <dt className={styles.descriptionLabel}>المبلغ المخصص</dt>
                <dd className={styles.descriptionValue}><bdi dir="ltr">{formatCurrency(totals.allocatedAmount)}</bdi></dd>
              </div>
              <div className={styles.descriptionRow}>
                <dt className={styles.descriptionLabel}>المتبقي غير الموزع</dt>
                <dd className={styles.descriptionValue} style={{ color: totals.unallocatedAmount > 0 ? "var(--color-warning)" : "var(--color-success)" }}>
                  <bdi dir="ltr">{formatCurrency(totals.unallocatedAmount)}</bdi>
                </dd>
              </div>
              <div className={styles.descriptionRow}>
                <dt className={styles.descriptionLabel}>طريقة التحصيل</dt>
                <dd className={styles.descriptionValue}>{COLLECTION_METHOD_LABELS[collection.method]}</dd>
              </div>
              <div className={styles.descriptionRow}>
                <dt className={styles.descriptionLabel}>رقم المرجع</dt>
                <dd className={styles.descriptionValue}>
                  {collection.reference ? <bdi dir="ltr">{collection.reference}</bdi> : "—"}
                </dd>
              </div>
              {collection.notes && (
                <div className={styles.descriptionRowFull}>
                  <dt className={styles.descriptionLabel}>ملاحظات السند</dt>
                  <dd className={styles.descriptionValueText}>{collection.notes}</dd>
                </div>
              )}
            </dl>
          )}
        </div>

        {/* Allocations details card - Full Width Section Below */}
        <div className={styles.detailCard}>
          <h2 className={styles.detailTitle}>تفاصيل توزيع المبالغ</h2>
          {allocationDetails.length === 0 ? (
            <p className={styles.pageDescription}>لم يتم توزيع أي مبالغ من هذا التحصيل على استمارات بعد.</p>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className={styles.desktopView}>
                <table className={styles.allocationsTable} style={{ marginTop: 0 }}>
                  <thead>
                    <tr>
                      <th scope="col">رمز الاستمارة</th>
                      <th scope="col">المشروع</th>
                      <th scope="col">المشارك</th>
                      <th scope="col">سعر الاستمارة</th>
                      <th scope="col">المبلغ المخصص</th>
                      <th scope="col">المتبقي المستحق</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocationDetails.map((alloc) => (
                      <tr key={alloc.id}>
                        <td>
                          <Link href={`/forms/${alloc.formId}`} className={styles.cardLink}>
                            <bdi dir="ltr">{alloc.formCode}</bdi>
                          </Link>
                        </td>
                        <td>
                          {alloc.projectId ? (
                            <Link href={`/forms/projects/${alloc.projectId}`} className={styles.textLink}>
                              {alloc.projectName}
                            </Link>
                          ) : alloc.projectName}
                        </td>
                        <td>
                          {alloc.participantId ? (
                            <Link href={`/forms/participants/${alloc.participantId}`} className={styles.textLink}>
                              {alloc.participantName}
                            </Link>
                          ) : alloc.participantName}
                        </td>
                        <td><bdi dir="ltr">{formatCurrency(alloc.priceSnapshot)}</bdi></td>
                        <td><bdi dir="ltr" style={{ fontWeight: 700, color: "var(--color-primary)" }}>{formatCurrency(alloc.amount)}</bdi></td>
                        <td><bdi dir="ltr">{formatCurrency(alloc.outstanding)}</bdi></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className={styles.mobileView}>
                {allocationDetails.map((alloc) => (
                  <div key={alloc.id} className={styles.allocationDetailCard}>
                    <div className={styles.allocationCardHeader}>
                      <span className={styles.allocationCardLabel}>رمز الاستمارة</span>
                      <Link href={`/forms/${alloc.formId}`} className={styles.cardLink}>
                        <bdi dir="ltr">{alloc.formCode}</bdi>
                      </Link>
                    </div>
                    <div className={styles.allocationCardBody}>
                      <div className={styles.allocationCardRow}>
                        <span className={styles.allocationCardLabel}>المشروع:</span>
                        <span>
                          {alloc.projectId ? (
                            <Link href={`/forms/projects/${alloc.projectId}`} className={styles.textLink}>
                              {alloc.projectName}
                            </Link>
                          ) : alloc.projectName}
                        </span>
                      </div>
                      <div className={styles.allocationCardRow}>
                        <span className={styles.allocationCardLabel}>المشارك:</span>
                        <span>
                          {alloc.participantId ? (
                            <Link href={`/forms/participants/${alloc.participantId}`} className={styles.textLink}>
                              {alloc.participantName}
                            </Link>
                          ) : alloc.participantName}
                        </span>
                      </div>
                      <div className={styles.allocationCardRow}>
                        <span className={styles.allocationCardLabel}>سعر الاستمارة:</span>
                        <bdi dir="ltr">{formatCurrency(alloc.priceSnapshot)}</bdi>
                      </div>
                      <div className={styles.allocationCardRow}>
                        <span className={styles.allocationCardLabel}>المبلغ المخصص:</span>
                        <bdi dir="ltr" style={{ fontWeight: 700, color: "var(--color-primary)" }}>
                          {formatCurrency(alloc.amount)}
                        </bdi>
                      </div>
                      <div className={styles.allocationCardRow}>
                        <span className={styles.allocationCardLabel}>المتبقي المستحق:</span>
                        <bdi dir="ltr">{formatCurrency(alloc.outstanding)}</bdi>
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
