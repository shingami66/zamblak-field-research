import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getFormFinancialSummary,
  getResearchForm,
} from "@/lib/forms/queries";
import type { ResearchFormReviewStatus, SettlementState } from "@/lib/forms/types";
import { normalizeFormIdParam, requireOwnerSession } from "../route-state";
import { getSuccessNotice } from "@/lib/ui/success-notice";
import { BackLink } from "@/components/shared/BackLink";
import { SuccessNotice } from "@/components/shared/SuccessNotice";
import { StatusBadge } from "@/components/shared/StatusBadge";
import styles from "../forms.module.css";

type Props = {
  params: Promise<{ formId: string }>;
  searchParams?: Promise<{ success?: string }>;
};

const STATUS_LABELS: Record<ResearchFormReviewStatus, string> = {
  submitted: "قيد المراجعة",
  accepted: "مقبول",
  rejected: "مرفوض",
  cancelled: "ملغى",
};

const SETTLEMENT_LABELS: Record<SettlementState, string> = {
  uncollected: "غير محصل",
  partially_collected: "محصل جزئياً",
  collected: "محصل بالكامل",
};

export default function FormDetailPage(props: Props) {
  return renderFormDetailPage(props);
}

async function renderFormDetailPage(props: Props) {
  await requireOwnerSession();

  const { formId: rawFormId } = await props.params;
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const successNotice = getSuccessNotice(searchParams?.success);
  const formId = normalizeFormIdParam(rawFormId);
  if (!formId) {
    notFound();
  }

  const supabase = await createClient();
  const formRes = await getResearchForm(supabase, formId);

  if (!formRes.ok) {
    if (formRes.code === "research_form_not_found") {
      notFound();
    }
    return (
      <div className={styles.page}>
        <BackLink href="/forms">العودة إلى الاستمارات</BackLink>
        <div className={styles.detailCard} style={{ borderColor: "var(--color-danger)", padding: "1.5rem", marginTop: "1rem" }} role="alert">
          <h2 style={{ color: "var(--color-danger)", marginBottom: "0.5rem" }}>خطأ في التحميل</h2>
          <p style={{ marginBottom: "1rem", color: "var(--color-muted)" }}>
            حدث خطأ أثناء تحميل بيانات نموذج البحث. يرجى المحاولة لاحقاً.
          </p>
          <Link href="/forms" className={styles.secondaryAction}>
            العودة إلى القائمة
          </Link>
        </div>
      </div>
    );
  }

  const form = formRes.data;

  // Load financial summary ONLY if status is accepted
  let financialSummary = null;
  let financialWarning = false;

  if (form.review_status === "accepted") {
    const finRes = await getFormFinancialSummary(supabase, form.id);
    if (finRes.ok) {
      financialSummary = finRes.data;
    } else if (finRes.code === "financial_summary_not_found") {
      financialWarning = true;
    }
  }

  const statusVariant =
    form.review_status === "accepted"
      ? "active"
      : form.review_status === "submitted"
      ? "warning"
      : form.review_status === "rejected"
      ? "danger"
      : "neutral";

  return (
    <div className={styles.page}>
      <BackLink href="/forms">العودة إلى الاستمارات</BackLink>
      <SuccessNotice message={successNotice} />

      <header className={styles.pageIntro} style={{ marginTop: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <h1 className={styles.pageTitle}>
            نموذج البحث: <bdi dir="ltr" className={styles.ltrToken}>{form.code}</bdi>
          </h1>
          <StatusBadge variant={statusVariant}>
            {STATUS_LABELS[form.review_status]}
          </StatusBadge>
        </div>
        <p className={styles.pageDescription}>
          تفاصيل الحالة والمالية والمراجعة لنموذج البحث الميداني.
        </p>
      </header>

      <div className={styles.detailRows} style={{ gap: "1.5rem" }}>
        {/* CORE IDENTITY & METADATA CARD */}
        <section className={styles.detailCard}>
          <h2 className={styles.detailTitle}>البيانات الأساسية</h2>
          <dl className={styles.metaGrid}>
            <div className={styles.descriptionRow}>
              <dt className={styles.descriptionLabel}>رمز النموذج</dt>
              <dd className={styles.descriptionValue}>
                <bdi dir="ltr" className={styles.ltrToken}>{form.code}</bdi>
              </dd>
            </div>

            <div className={styles.descriptionRow}>
              <dt className={styles.descriptionLabel}>تاريخ التقديم</dt>
              <dd className={styles.descriptionValue}>{form.submitted_date}</dd>
            </div>

            <div className={styles.descriptionRow}>
              <dt className={styles.descriptionLabel}>رقم المحاولة</dt>
              <dd className={styles.descriptionValue}>{form.attempt_number}</dd>
            </div>

            <div className={styles.descriptionRow}>
              <dt className={styles.descriptionLabel}>السعر المقبول المستحق</dt>
              <dd className={styles.descriptionValue}>
                {form.accepted_price_snapshot !== null
                  ? `${form.accepted_price_snapshot.toFixed(2)} ر.س`
                  : "غير محدد"}
              </dd>
            </div>
          </dl>

          <hr style={{ margin: "1.25rem 0", border: 0, borderTop: "1px solid var(--color-border)" }} />

          <h3 className={styles.detailTitle} style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>
            المعرفات المرتبطة
          </h3>
          <dl className={styles.metaGrid}>
            <div className={styles.descriptionRow}>
              <dt className={styles.descriptionLabel}>معرف المشروع</dt>
              <dd className={styles.descriptionValue} style={{ fontFamily: "monospace", fontSize: "0.9rem" }}>
                <bdi dir="ltr" className={styles.ltrToken}>{form.project_id}</bdi>
              </dd>
            </div>
            <div className={styles.descriptionRow}>
              <dt className={styles.descriptionLabel}>معرف الشركة</dt>
              <dd className={styles.descriptionValue} style={{ fontFamily: "monospace", fontSize: "0.9rem" }}>
                <bdi dir="ltr" className={styles.ltrToken}>{form.company_id}</bdi>
              </dd>
            </div>
            <div className={styles.descriptionRow}>
              <dt className={styles.descriptionLabel}>معرف المشارك (الرئيسي)</dt>
              <dd className={styles.descriptionValue} style={{ fontFamily: "monospace", fontSize: "0.9rem" }}>
                <bdi dir="ltr" className={styles.ltrToken}>{form.respondent_id}</bdi>
              </dd>
            </div>
            <div className={styles.descriptionRow}>
              <dt className={styles.descriptionLabel}>معرف المشاركة</dt>
              <dd className={styles.descriptionValue} style={{ fontFamily: "monospace", fontSize: "0.9rem" }}>
                <bdi dir="ltr" className={styles.ltrToken}>{form.participation_id}</bdi>
              </dd>
            </div>
          </dl>
        </section>

        {/* ACCEPTED FINANCIAL SNAPSHOT SECTION */}
        {form.review_status === "accepted" && (
          <section className={styles.detailCard}>
            <h2 className={styles.detailTitle}>الملخص المالي والتحصيل</h2>

            {financialWarning && (
              <div style={{ padding: "0.75rem", backgroundColor: "#fffbeb", borderColor: "#fcd34d", border: "1px solid", borderRadius: "0.375rem", color: "#92400e", marginBottom: "1rem" }}>
                تنبيه: ملخص التحصيل المالي لهذا النموذج المقبول قيد التحديث أو غير مكتمل حالياً.
              </div>
            )}

            {financialSummary ? (
              <dl className={styles.metaGrid}>
                <div className={styles.descriptionRow}>
                  <dt className={styles.descriptionLabel}>السعر المقبول</dt>
                  <dd className={styles.descriptionValue}>
                    {financialSummary.accepted_price_snapshot.toFixed(2)} ر.س
                  </dd>
                </div>
                <div className={styles.descriptionRow}>
                  <dt className={styles.descriptionLabel}>المبلغ المخصص (المحصل)</dt>
                  <dd className={styles.descriptionValue} style={{ color: "var(--color-success)" }}>
                    {financialSummary.allocated_amount.toFixed(2)} ر.س
                  </dd>
                </div>
                <div className={styles.descriptionRow}>
                  <dt className={styles.descriptionLabel}>المتبقي المستحق</dt>
                  <dd className={styles.descriptionValue} style={{ color: "var(--color-danger)" }}>
                    {financialSummary.outstanding_amount.toFixed(2)} ر.س
                  </dd>
                </div>
                <div className={styles.descriptionRow}>
                  <dt className={styles.descriptionLabel}>حالة التسوية</dt>
                  <dd className={styles.descriptionValue}>
                    {SETTLEMENT_LABELS[financialSummary.settlement_state]}
                  </dd>
                </div>
                <div className={styles.descriptionRow}>
                  <dt className={styles.descriptionLabel}>تاريخ الاستحقاق</dt>
                  <dd className={styles.descriptionValue}>{financialSummary.due_date}</dd>
                </div>
              </dl>
            ) : (
              <p className={styles.descriptionValueText}>
                سعر النموذج المقبول: {form.accepted_price_snapshot !== null ? `${form.accepted_price_snapshot.toFixed(2)} ر.س` : "غير محدد"}
              </p>
            )}
          </section>
        )}

        {/* LIFECYCLE & REVISION EVIDENCE CARD */}
        <section className={styles.detailCard}>
          <h2 className={styles.detailTitle}>سجل الحالة والأدلة</h2>
          <dl className={styles.metaGrid}>
            <div className={styles.descriptionRow}>
              <dt className={styles.descriptionLabel}>وقت التقديم</dt>
              <dd className={styles.descriptionValue}>{new Date(form.submitted_at).toLocaleString("ar-SA")}</dd>
            </div>
            {form.reviewed_at && (
              <div className={styles.descriptionRow}>
                <dt className={styles.descriptionLabel}>وقت المراجعة</dt>
                <dd className={styles.descriptionValue}>{new Date(form.reviewed_at).toLocaleString("ar-SA")}</dd>
              </div>
            )}
            {form.accepted_at && (
              <div className={styles.descriptionRow}>
                <dt className={styles.descriptionLabel}>وقت القبول</dt>
                <dd className={styles.descriptionValue}>{new Date(form.accepted_at).toLocaleString("ar-SA")}</dd>
              </div>
            )}
            {form.rejected_at && (
              <div className={styles.descriptionRow}>
                <dt className={styles.descriptionLabel}>وقت الرفض</dt>
                <dd className={styles.descriptionValue}>{new Date(form.rejected_at).toLocaleString("ar-SA")}</dd>
              </div>
            )}
            {form.cancelled_at && (
              <div className={styles.descriptionRow}>
                <dt className={styles.descriptionLabel}>وقت الإلغاء</dt>
                <dd className={styles.descriptionValue}>{new Date(form.cancelled_at).toLocaleString("ar-SA")}</dd>
              </div>
            )}
          </dl>

          {form.rejection_reason && (
            <div style={{ marginTop: "1rem" }}>
              <div className={styles.descriptionLabel} style={{ color: "var(--color-danger)", fontWeight: 700 }}>سبب الرفض:</div>
              <div style={{ backgroundColor: "#fef2f2", padding: "0.75rem", borderRadius: "0.5rem", marginTop: "0.25rem", color: "var(--color-danger)" }}>
                {form.rejection_reason}
              </div>
            </div>
          )}

          {form.review_correction_reason && (
            <div style={{ marginTop: "1rem" }}>
              <div className={styles.descriptionLabel} style={{ color: "#b45309", fontWeight: 700 }}>سبب تصحيح المراجعة:</div>
              <div style={{ backgroundColor: "#fffbeb", padding: "0.75rem", borderRadius: "0.5rem", marginTop: "0.25rem", color: "#92400e" }}>
                {form.review_correction_reason}
              </div>
            </div>
          )}

          {form.quota_override_reason && (
            <div style={{ marginTop: "1rem" }}>
              <div className={styles.descriptionLabel} style={{ color: "#6b21a8", fontWeight: 700 }}>دليل تجاوز الحد الأقصى (الكوتا):</div>
              <div style={{ backgroundColor: "#faf5ff", padding: "0.75rem", borderRadius: "0.5rem", marginTop: "0.25rem", color: "#581c87" }}>
                <p style={{ margin: 0, marginBottom: "0.5rem" }}>{form.quota_override_reason}</p>
                <div style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}>
                  الحد: {form.quota_limit_snapshot} | المقبولة سابقاً: {form.accepted_count_before} | وقت التجاوز: {form.quota_overridden_at ? new Date(form.quota_overridden_at).toLocaleString("ar-SA") : "-"}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* NOTES CARD */}
        {form.notes && (
          <section className={styles.detailCard}>
            <h2 className={styles.detailTitle}>الملاحظات</h2>
            <p className={styles.descriptionValueText}>{form.notes}</p>
          </section>
        )}
      </div>
    </div>
  );
}
