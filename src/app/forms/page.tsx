import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  listResearchForms,
  listSubmittedResearchForms,
} from "@/lib/forms/queries";
import type { ResearchFormReviewStatus } from "@/lib/forms/types";
import {
  buildPaginationUrl,
  parseFormsListRouteFilters,
  requireOwnerSession,
} from "./route-state";
import styles from "./forms.module.css";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const STATUS_LABELS: Record<ResearchFormReviewStatus, string> = {
  submitted: "قيد المراجعة",
  accepted: "مقبول",
  rejected: "مرفوض",
  cancelled: "ملغى",
};

export default function FormsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  return renderFormsPage(searchParams);
}

async function renderFormsPage(searchParams?: SearchParams) {
  await requireOwnerSession();
  const rawParams = searchParams ? await searchParams : {};
  const parsedFilters = parseFormsListRouteFilters(rawParams);

  if (!parsedFilters.ok) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>نماذج البحث الميداني</h1>
        </header>
        <div className={styles.card} style={{ borderColor: "#ef4444", padding: "1.5rem" }}>
          <h2 style={{ color: "#dc2626", marginBottom: "0.5rem" }}>خطأ في الفلترة</h2>
          <p style={{ marginBottom: "1rem" }}>
            نطاق التاريخ غير صالح: تاريخ البداية لا يمكن أن يكون بعد تاريخ النهاية.
          </p>
          <Link href="/forms" className={styles.primaryButton}>
            إعادة ضبط الفلاتر
          </Link>
        </div>
      </div>
    );
  }

  const filters = parsedFilters.filters;
  const supabase = await createClient();

  const [formsResult, queueResult] = await Promise.all([
    listResearchForms(supabase, filters),
    listSubmittedResearchForms(supabase, { page: 1, pageSize: 10 }),
  ]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>نماذج البحث الميداني</h1>
          <p className={styles.subtitle}>
            إدارة ومراجعة نماذج البحث الميداني وحالات التقييم والمالية.
          </p>
        </div>
      </header>

      {/* SUBMITTED REVIEW QUEUE SECTION */}
      <section className={styles.card} style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>
          قائمة الانتظار والمراجعة (الأقدم أولاً)
        </h2>
        {!queueResult.ok ? (
          <p style={{ color: "#dc2626" }}>
            تعذر تحميل قائمة الانتظار والمراجعة حالياً.
          </p>
        ) : queueResult.data.items.length === 0 ? (
          <p style={{ color: "#6b7280" }}>
            لا توجد نماذج قيد الانتظار حالياً. جميع النماذج تمت مراجعتها.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>رمز النموذج</th>
                  <th>تاريخ التقديم</th>
                  <th>رقم المحاولة</th>
                  <th>معرف المشروع</th>
                  <th>معرف المشارك</th>
                  <th>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {queueResult.data.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.code}</strong>
                    </td>
                    <td>{item.submitted_date}</td>
                    <td>{item.attempt_number}</td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                      {item.project_id.slice(0, 8)}...
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                      {item.respondent_id.slice(0, 8)}...
                    </td>
                    <td>
                      <Link href={`/forms/${item.id}`} className={styles.tableLink}>
                        عرض والتصحيح &larr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* FILTER FORM */}
      <section className={styles.card} style={{ marginBottom: "2rem" }}>
        <form method="GET" action="/forms" style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
              بحث بالرمز
            </label>
            <input
              type="text"
              name="code"
              defaultValue={filters.code || ""}
              placeholder="مثال: RF-001"
              style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
              حالة المراجعة
            </label>
            <select
              name="reviewStatus"
              defaultValue={filters.reviewStatus || ""}
              style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db" }}
            >
              <option value="">جميع الحالات</option>
              <option value="submitted">قيد المراجعة</option>
              <option value="accepted">مقبول</option>
              <option value="rejected">مرفوض</option>
              <option value="cancelled">ملغى</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
              تاريخ التقديم (من)
            </label>
            <input
              type="date"
              name="submittedDateFrom"
              defaultValue={filters.submittedDateFrom || ""}
              style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
              تاريخ التقديم (إلى)
            </label>
            <input
              type="date"
              name="submittedDateTo"
              defaultValue={filters.submittedDateTo || ""}
              style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
              عدد العناصر بالصفحة
            </label>
            <select
              name="pageSize"
              defaultValue={filters.pageSize || 20}
              style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db" }}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem" }}>
            <button type="submit" className={styles.primaryButton} style={{ padding: "0.5rem 1rem" }}>
              تطبيق الفلاتر
            </button>
            <Link href="/forms" style={{ padding: "0.5rem 1rem", border: "1px solid #d1d5db", borderRadius: "0.375rem", textDecoration: "none", color: "#374151" }}>
              إلغاء
            </Link>
          </div>
        </form>
      </section>

      {/* MAIN FORMS LIST TABLE */}
      <section className={styles.card}>
        {!formsResult.ok ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#dc2626" }}>
            حدث خطأ أثناء تحميل نماذج البحث. يرجى المحاولة لاحقاً.
          </div>
        ) : formsResult.data.items.length === 0 ? (
          <div style={{ padding: "3rem 1rem", textAlign: "center", color: "#6b7280" }}>
            لا توجد نماذج بحث مطابقة للشروط المحددة.
          </div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>رمز النموذج</th>
                    <th>تاريخ التقديم</th>
                    <th>الحالة</th>
                    <th>رقم المحاولة</th>
                    <th>معرف المشروع</th>
                    <th>معرف المشارك</th>
                    <th>السعر المقبول (ر.س)</th>
                    <th>التفاصيل</th>
                  </tr>
                </thead>
                <tbody>
                  {formsResult.data.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.code}</strong>
                      </td>
                      <td>{item.submitted_date}</td>
                      <td>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "0.25rem 0.5rem",
                            borderRadius: "9999px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            backgroundColor:
                              item.review_status === "accepted"
                                ? "#dcfce7"
                                : item.review_status === "submitted"
                                ? "#fef3c7"
                                : item.review_status === "rejected"
                                ? "#fee2e2"
                                : "#f3f4f6",
                            color:
                              item.review_status === "accepted"
                                ? "#166534"
                                : item.review_status === "submitted"
                                ? "#92400e"
                                : item.review_status === "rejected"
                                ? "#991b1b"
                                : "#374151",
                          }}
                        >
                          {STATUS_LABELS[item.review_status]}
                        </span>
                      </td>
                      <td>{item.attempt_number}</td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                        {item.project_id.slice(0, 8)}...
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                        {item.respondent_id.slice(0, 8)}...
                      </td>
                      <td>
                        {item.accepted_price_snapshot !== null
                          ? item.accepted_price_snapshot.toFixed(2)
                          : "-"}
                      </td>
                      <td>
                        <Link href={`/forms/${item.id}`} className={styles.tableLink}>
                          التفاصيل &larr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* PAGINATION CONTROLS */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "1.5rem",
                paddingTop: "1rem",
                borderTop: "1px solid #e5e7eb",
              }}
            >
              <div style={{ fontSize: "0.875rem", color: "#4b5563" }}>
                صفحة {formsResult.data.pagination.page} من{" "}
                {formsResult.data.pagination.totalPages} (إجمالي{" "}
                {formsResult.data.pagination.total} نموذج)
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {formsResult.data.pagination.hasPreviousPage ? (
                  <Link
                    href={buildPaginationUrl(
                      "/forms",
                      filters,
                      formsResult.data.pagination.page - 1
                    )}
                    style={{
                      padding: "0.5rem 1rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "0.375rem",
                      textDecoration: "none",
                      color: "#374151",
                    }}
                  >
                    &rarr; السابقة
                  </Link>
                ) : (
                  <span
                    style={{
                      padding: "0.5rem 1rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.375rem",
                      color: "#9ca3af",
                      cursor: "not-allowed",
                    }}
                  >
                    &rarr; السابقة
                  </span>
                )}

                {formsResult.data.pagination.hasNextPage ? (
                  <Link
                    href={buildPaginationUrl(
                      "/forms",
                      filters,
                      formsResult.data.pagination.page + 1
                    )}
                    style={{
                      padding: "0.5rem 1rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "0.375rem",
                      textDecoration: "none",
                      color: "#374151",
                    }}
                  >
                    التالية &larr;
                  </Link>
                ) : (
                  <span
                    style={{
                      padding: "0.5rem 1rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.375rem",
                      color: "#9ca3af",
                      cursor: "not-allowed",
                    }}
                  >
                    التالية &larr;
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
