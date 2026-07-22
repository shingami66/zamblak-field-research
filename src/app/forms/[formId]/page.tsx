import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getFormFinancialSummary,
  getResearchForm,
} from "@/lib/forms/queries";
import type { ResearchFormReviewStatus, SettlementState } from "@/lib/forms/types";
import { normalizeFormIdParam, requireOwnerSession } from "../route-state";
import styles from "../forms.module.css";

type Props = {
  params: Promise<{ formId: string }>;
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
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>تفاصيل نموذج البحث</h1>
        </header>
        <div className={styles.card} style={{ borderColor: "#ef4444", padding: "1.5rem" }}>
          <h2 style={{ color: "#dc2626", marginBottom: "0.5rem" }}>خطأ في التحميل</h2>
          <p style={{ marginBottom: "1rem" }}>
            حدث خطأ أثناء تحميل بيانات نموذج البحث. يرجى المحاولة لاحقاً.
          </p>
          <Link href="/forms" className={styles.primaryButton}>
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

  return (
    <div className={styles.container}>
      <header className={styles.header} style={{ marginBottom: "1.5rem" }}>
        <div>
          <div style={{ marginBottom: "0.5rem" }}>
            <Link href="/forms" style={{ textDecoration: "none", color: "#4b5563", fontSize: "0.875rem" }}>
              &rarr; العودة إلى نماذج البحث
            </Link>
          </div>
          <h1 className={styles.title}>نموذج البحث: {form.code}</h1>
          <p className={styles.subtitle}>
            تفاصيل الحالة والمالية والمراجعة لنموذج البحث الميداني.
          </p>
        </div>
      </header>

      {/* CORE IDENTITY & STATUS CARD */}
      <section className={styles.card} style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>البيانات الأساسية</h2>
          <span
            style={{
              padding: "0.35rem 0.75rem",
              borderRadius: "9999px",
              fontSize: "0.875rem",
              fontWeight: 600,
              backgroundColor:
                form.review_status === "accepted"
                  ? "#dcfce7"
                  : form.review_status === "submitted"
                  ? "#fef3c7"
                  : form.review_status === "rejected"
                  ? "#fee2e2"
                  : "#f3f4f6",
              color:
                form.review_status === "accepted"
                  ? "#166534"
                  : form.review_status === "submitted"
                  ? "#92400e"
                  : form.review_status === "rejected"
                  ? "#991b1b"
                  : "#374151",
            }}
          >
            {STATUS_LABELS[form.review_status]}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <div>
            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>رمز النموذج</div>
            <div style={{ fontWeight: 600, fontSize: "1.125rem" }}>{form.code}</div>
          </div>

          <div>
            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>تاريخ التقديم</div>
            <div style={{ fontWeight: 600 }}>{form.submitted_date}</div>
          </div>

          <div>
            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>رقم المحاولة</div>
            <div style={{ fontWeight: 600 }}>{form.attempt_number}</div>
          </div>

          <div>
            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>السعر المقبول المستحق</div>
            <div style={{ fontWeight: 600 }}>
              {form.accepted_price_snapshot !== null
                ? `${form.accepted_price_snapshot.toFixed(2)} ر.س`
                : "غير محدد"}
            </div>
          </div>
        </div>

        <hr style={{ margin: "1rem 0", border: 0, borderTop: "1px solid #e5e7eb" }} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
          <div>
            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>معرف المشروع</div>
            <div style={{ fontFamily: "monospace", fontSize: "0.9rem" }}>{form.project_id}</div>
          </div>
          <div>
            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>معرف الشركة</div>
            <div style={{ fontFamily: "monospace", fontSize: "0.9rem" }}>{form.company_id}</div>
          </div>
          <div>
            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>معرف المشارك (الرئيسي)</div>
            <div style={{ fontFamily: "monospace", fontSize: "0.9rem" }}>{form.respondent_id}</div>
          </div>
          <div>
            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>معرف المشاركة</div>
            <div style={{ fontFamily: "monospace", fontSize: "0.9rem" }}>{form.participation_id}</div>
          </div>
        </div>
      </section>

      {/* ACCEPTED FINANCIAL SNAPSHOT SECTION */}
      {form.review_status === "accepted" && (
        <section className={styles.card} style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>
            الملخص المالي والتحصيل
          </h2>

          {financialWarning && (
            <div style={{ padding: "0.75rem", backgroundColor: "#fffbeb", borderColor: "#fcd34d", border: "1px solid", borderRadius: "0.375rem", color: "#92400e", marginBottom: "1rem" }}>
              تنبيه: ملخص التحصيل المالي لهذا النموذج المقبول قيد التحديث أو غير مكتمل حالياً.
            </div>
          )}

          {financialSummary ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
              <div>
                <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>السعر المقبول</div>
                <div style={{ fontWeight: 600, fontSize: "1.125rem" }}>
                  {financialSummary.accepted_price_snapshot.toFixed(2)} ر.س
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>المبلغ المخصص (المحصل)</div>
                <div style={{ fontWeight: 600, fontSize: "1.125rem", color: "#166534" }}>
                  {financialSummary.allocated_amount.toFixed(2)} ر.س
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>المتبقي المستحق</div>
                <div style={{ fontWeight: 600, fontSize: "1.125rem", color: "#991b1b" }}>
                  {financialSummary.outstanding_amount.toFixed(2)} ر.س
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>حالة التسوية</div>
                <div style={{ fontWeight: 600, fontSize: "1rem" }}>
                  {SETTLEMENT_LABELS[financialSummary.settlement_state]}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>تاريخ الاستحقاق</div>
                <div style={{ fontWeight: 600 }}>{financialSummary.due_date}</div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: "0.9rem", color: "#4b5563" }}>
              سعر النموذج المقبول: {form.accepted_price_snapshot !== null ? `${form.accepted_price_snapshot.toFixed(2)} ر.س` : "غير محدد"}
            </div>
          )}
        </section>
      )}

      {/* LIFECYCLE & REVISION EVIDENCE CARD */}
      <section className={styles.card} style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>
          سجل الحالة والأدلة
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <div>
            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>وقت التقديم</div>
            <div style={{ fontSize: "0.9rem" }}>{new Date(form.submitted_at).toLocaleString("ar-SA")}</div>
          </div>
          {form.reviewed_at && (
            <div>
              <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>وقت المراجعة</div>
              <div style={{ fontSize: "0.9rem" }}>{new Date(form.reviewed_at).toLocaleString("ar-SA")}</div>
            </div>
          )}
          {form.accepted_at && (
            <div>
              <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>وقت القبول</div>
              <div style={{ fontSize: "0.9rem" }}>{new Date(form.accepted_at).toLocaleString("ar-SA")}</div>
            </div>
          )}
          {form.rejected_at && (
            <div>
              <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>وقت الرفض</div>
              <div style={{ fontSize: "0.9rem" }}>{new Date(form.rejected_at).toLocaleString("ar-SA")}</div>
            </div>
          )}
          {form.cancelled_at && (
            <div>
              <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>وقت الإلغاء</div>
              <div style={{ fontSize: "0.9rem" }}>{new Date(form.cancelled_at).toLocaleString("ar-SA")}</div>
            </div>
          )}
        </div>

        {form.rejection_reason && (
          <div style={{ marginTop: "1rem" }}>
            <div style={{ fontSize: "0.875rem", color: "#dc2626", fontWeight: 600 }}>سبب الرفض:</div>
            <div style={{ backgroundColor: "#fef2f2", padding: "0.75rem", borderRadius: "0.375rem", marginTop: "0.25rem" }}>
              {form.rejection_reason}
            </div>
          </div>
        )}

        {form.review_correction_reason && (
          <div style={{ marginTop: "1rem" }}>
            <div style={{ fontSize: "0.875rem", color: "#b45309", fontWeight: 600 }}>سبب تصحيح المراجعة:</div>
            <div style={{ backgroundColor: "#fffbebf", padding: "0.75rem", borderRadius: "0.375rem", marginTop: "0.25rem" }}>
              {form.review_correction_reason}
            </div>
          </div>
        )}

        {form.quota_override_reason && (
          <div style={{ marginTop: "1rem" }}>
            <div style={{ fontSize: "0.875rem", color: "#6b21a8", fontWeight: 600 }}>دليل تجاوز الحد الأقصى (الكوتا):</div>
            <div style={{ backgroundColor: "#faf5ff", padding: "0.75rem", borderRadius: "0.375rem", marginTop: "0.25rem" }}>
              <p style={{ margin: 0, marginBottom: "0.5rem" }}>{form.quota_override_reason}</p>
              <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                الحد: {form.quota_limit_snapshot} | المقبولة سابقاً: {form.accepted_count_before} | وقت التجاوز: {form.quota_overridden_at ? new Date(form.quota_overridden_at).toLocaleString("ar-SA") : "-"}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* NOTES & AUDIT FOOTER */}
      {form.notes && (
        <section className={styles.card}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.5rem" }}>الملاحظات</h2>
          <p style={{ margin: 0, color: "#374151" }}>{form.notes}</p>
        </section>
      )}
    </div>
  );
}
