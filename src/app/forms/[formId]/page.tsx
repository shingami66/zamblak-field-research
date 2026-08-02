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
import { FormReviewActions } from "./FormReviewActions";
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

const ARABIC_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

function formatArabicDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const datePart = iso.slice(0, 10);
  const parts = datePart.split("-");
  if (parts.length !== 3) return iso;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11 || isNaN(day)) return iso;
  return `${day} ${ARABIC_MONTHS[monthIdx]} ${year}`;
}

function formatArabicDateTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;

  const year = d.getUTCFullYear();
  const monthIdx = d.getUTCMonth();
  const day = d.getUTCDate();
  let hours = d.getUTCHours();
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  const period = hours >= 12 ? "م" : "ص";
  hours = hours % 12;
  if (hours === 0) hours = 12;

  const monthName = ARABIC_MONTHS[monthIdx];
  return `${day} ${monthName} ${year}، ${hours}:${minutes} ${period}`;
}

function getShortFormCode(code: string): string {
  const parts = code.split("-");
  const lastPart = parts[parts.length - 1];
  return lastPart || code;
}

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
        <div className={styles.errorCard} role="alert">
          <h2 className={styles.errorTitle}>خطأ في التحميل</h2>
          <p className={styles.descriptionValueText} style={{ marginBottom: "1rem" }}>
            حدث خطأ أثناء تحميل بيانات الاستمارة. يرجى المحاولة لاحقاً.
          </p>
          <Link href="/forms" className={styles.secondaryAction}>
            العودة إلى القائمة
          </Link>
        </div>
      </div>
    );
  }

  const form = formRes.data;
  const displayCode = getShortFormCode(form.code);

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

      <header className={styles.pageIntro}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <h1 className={styles.pageTitle}>
            الاستمارة رقم <bdi dir="ltr" className={styles.ltrToken}>{displayCode}</bdi>
          </h1>
          <StatusBadge variant={statusVariant}>
            {STATUS_LABELS[form.review_status]}
          </StatusBadge>
        </div>
        <p className={styles.pageDescription}>
          تفاصيل الحالة والمالية والمراجعة للاستمارة الميدانية.
        </p>
      </header>

      <div className={styles.detailRows}>
        {/* CORE IDENTITY & METADATA CARD */}
        <section className={styles.detailCard}>
          <h2 className={styles.detailTitle}>البيانات الأساسية</h2>
          <dl className={styles.summaryGrid3}>
            <div className={styles.descriptionRow}>
              <dt className={styles.descriptionLabel}>رقم الاستمارة</dt>
              <dd className={styles.descriptionValue}>
                <bdi dir="ltr" className={styles.ltrToken}>{displayCode}</bdi>
              </dd>
            </div>

            <div className={styles.descriptionRow}>
              <dt className={styles.descriptionLabel}>تاريخ التقديم</dt>
              <dd className={styles.descriptionValue}>{formatArabicDate(form.submitted_date)}</dd>
            </div>

            <div className={styles.descriptionRow}>
              <dt className={styles.descriptionLabel}>قيمة الاستمارة</dt>
              <dd className={styles.descriptionValue}>
                {form.accepted_price_snapshot !== null
                  ? `${form.accepted_price_snapshot.toFixed(2)} ر.س`
                  : "لم تُحدد بعد"}
              </dd>
            </div>
          </dl>
        </section>



        {/* ACCEPTED FINANCIAL SNAPSHOT SECTION */}
        {form.review_status === "accepted" && (
          <section className={styles.detailCard}>
            <h2 className={styles.detailTitle}>الملخص المالي والتحصيل</h2>

            {financialWarning && (
              <div className={styles.warningBox}>
                تنبيه: ملخص التحصيل المالي لهذه الاستمارة المقبولة قيد التحديث أو غير مكتمل حالياً.
              </div>
            )}

            {financialSummary ? (
              <dl className={styles.metaGrid}>
                <div className={styles.descriptionRow}>
                  <dt className={styles.descriptionLabel}>قيمة الاستمارة</dt>
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
                  <dd className={styles.descriptionValue}>{formatArabicDate(financialSummary.due_date)}</dd>
                </div>
              </dl>
            ) : (
              <p className={styles.descriptionValueText}>
                قيمة الاستمارة المقبولة: {form.accepted_price_snapshot !== null ? `${form.accepted_price_snapshot.toFixed(2)} ر.س` : "لم تُحدد بعد"}
              </p>
            )}
          </section>
        )}

        {/* OWNER REVIEW ACTIONS CARD (submitted forms only) */}
        {form.review_status === "submitted" && (
          <FormReviewActions
            formId={form.id}
            formCode={form.code}
            reviewStatus={form.review_status}
          />
        )}

        {/* LIFECYCLE & REVISION EVIDENCE CARD */}
        <section className={styles.detailCard}>
          <h2 className={styles.detailTitle}>سجل الحالة والأدلة</h2>
          <dl className={styles.metaGrid}>
            <div className={styles.descriptionRow}>
              <dt className={styles.descriptionLabel}>وقت التقديم</dt>
              <dd className={styles.descriptionValue}>{formatArabicDateTime(form.submitted_at)}</dd>
            </div>
            {form.reviewed_at && (
              <div className={styles.descriptionRow}>
                <dt className={styles.descriptionLabel}>وقت المراجعة</dt>
                <dd className={styles.descriptionValue}>{formatArabicDateTime(form.reviewed_at)}</dd>
              </div>
            )}
            {form.accepted_at && (
              <div className={styles.descriptionRow}>
                <dt className={styles.descriptionLabel}>وقت القبول</dt>
                <dd className={styles.descriptionValue}>{formatArabicDateTime(form.accepted_at)}</dd>
              </div>
            )}
            {form.rejected_at && (
              <div className={styles.descriptionRow}>
                <dt className={styles.descriptionLabel}>وقت الرفض</dt>
                <dd className={styles.descriptionValue}>{formatArabicDateTime(form.rejected_at)}</dd>
              </div>
            )}
            {form.cancelled_at && (
              <div className={styles.descriptionRow}>
                <dt className={styles.descriptionLabel}>وقت الإلغاء</dt>
                <dd className={styles.descriptionValue}>{formatArabicDateTime(form.cancelled_at)}</dd>
              </div>
            )}
          </dl>

          {form.rejection_reason && (
            <div style={{ marginTop: "1rem" }}>
              <div className={styles.descriptionLabel} style={{ color: "var(--color-danger)", fontWeight: 700 }}>سبب الرفض:</div>
              <div className={styles.evidenceBoxDanger}>
                {form.rejection_reason}
              </div>
            </div>
          )}

          {form.review_correction_reason && (
            <div style={{ marginTop: "1rem" }}>
              <div className={styles.descriptionLabel} style={{ color: "#b45309", fontWeight: 700 }}>سبب تصحيح المراجعة:</div>
              <div className={styles.evidenceBoxWarning}>
                {form.review_correction_reason}
              </div>
            </div>
          )}

          {form.quota_override_reason && (
            <div style={{ marginTop: "1rem" }}>
              <div className={styles.descriptionLabel} style={{ color: "#6b21a8", fontWeight: 700 }}>دليل تجاوز الحد الأقصى (الكوتا):</div>
              <div className={styles.evidenceBoxPurple}>
                <p style={{ margin: 0, marginBottom: "0.5rem" }}>{form.quota_override_reason}</p>
                <div style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}>
                  الحد: {form.quota_limit_snapshot} | المقبولة سابقاً: {form.accepted_count_before} | وقت التجاوز: {form.quota_overridden_at ? formatArabicDateTime(form.quota_overridden_at) : "-"}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* NOTES CARD */}
        <section className={styles.detailCard}>
          <h2 className={styles.detailTitle}>الملاحظات</h2>
          {form.notes ? (
            <p className={styles.descriptionValueText}>{form.notes}</p>
          ) : (
            <p className={styles.notesEmpty}>لا توجد ملاحظات مسجلة.</p>
          )}
        </section>
      </div>
    </div>
  );
}
