import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FormsFilterToolbar } from "@/components/forms/FormsFilterToolbar";
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
      <div className={styles.page}>
        <header className={styles.pageIntro}>
          <div>
            <h1 className={styles.pageTitle}>نماذج البحث الميداني</h1>
            <p className={styles.pageDescription}>
              إدارة ومراجعة نماذج البحث الميداني وحالات التقييم والمالية.
            </p>
          </div>
        </header>
        <div className={styles.detailCard} style={{ borderColor: "#ef4444" }}>
          <h2 style={{ color: "#dc2626", fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            خطأ في الفلترة
          </h2>
          <p style={{ marginBottom: "1rem", color: "var(--color-muted)" }}>
            نطاق التاريخ غير صالح: تاريخ البداية لا يمكن أن يكون بعد تاريخ النهاية.
          </p>
          <Link href="/forms" className={styles.primaryAction}>
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

  const hasActiveFilters = Boolean(
    filters.code ||
    filters.reviewStatus ||
    filters.submittedDateFrom ||
    filters.submittedDateTo ||
    (filters.pageSize && filters.pageSize !== 20)
  );

  return (
    <div className={styles.page}>
      <header className={styles.pageIntro}>
        <div>
          <h1 className={styles.pageTitle}>نماذج البحث الميداني</h1>
          <p className={styles.pageDescription}>
            إدارة ومراجعة نماذج البحث الميداني وحالات التقييم والمالية.
          </p>
        </div>
      </header>

      {/* SUBMITTED REVIEW QUEUE SECTION */}
      <section className={styles.detailCard} style={{ marginBottom: "1rem", padding: "1rem 1.25rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-foreground)", marginBottom: "0.625rem" }}>
          قائمة الانتظار والمراجعة (الأقدم أولاً)
        </h2>
        {!queueResult.ok ? (
          <p style={{ color: "#dc2626", fontSize: "0.875rem", margin: 0 }}>
            تعذر تحميل قائمة الانتظار والمراجعة حالياً.
          </p>
        ) : queueResult.data.items.length === 0 ? (
          <p style={{ color: "var(--color-muted)", fontSize: "0.875rem", margin: 0 }}>
            لا توجد نماذج قيد الانتظار حالياً. جميع النماذج تمت مراجعتها.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)", color: "var(--color-muted)", fontSize: "0.8125rem" }}>
                  <th style={{ padding: "0.5rem 0.75rem", fontWeight: 700 }}>رمز النموذج</th>
                  <th style={{ padding: "0.5rem 0.75rem", fontWeight: 700 }}>تاريخ التقديم</th>
                  <th style={{ padding: "0.5rem 0.75rem", fontWeight: 700 }}>رقم المحاولة</th>
                  <th style={{ padding: "0.5rem 0.75rem", fontWeight: 700 }}>معرف المشروع</th>
                  <th style={{ padding: "0.5rem 0.75rem", fontWeight: 700 }}>معرف المشارك</th>
                  <th style={{ padding: "0.5rem 0.75rem", fontWeight: 700 }}>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {queueResult.data.items.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "0.5rem 0.75rem" }}>
                      <strong style={{ color: "var(--color-foreground)" }}>{item.code}</strong>
                    </td>
                    <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.875rem" }}>{item.submitted_date}</td>
                    <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.875rem" }}>{item.attempt_number}</td>
                    <td style={{ padding: "0.5rem 0.75rem" }}>
                      <span className={styles.ltrToken} style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                        {item.project_id.slice(0, 8)}...
                      </span>
                    </td>
                    <td style={{ padding: "0.5rem 0.75rem" }}>
                      <span className={styles.ltrToken} style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                        {item.respondent_id.slice(0, 8)}...
                      </span>
                    </td>
                    <td style={{ padding: "0.5rem 0.75rem" }}>
                      <Link href={`/forms/${item.id}`} className={styles.textLink}>
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

      {/* FILTER TOOLBAR */}
      <FormsFilterToolbar initialFilters={filters} />

      {/* MAIN FORMS LIST TABLE */}
      <section className={styles.detailCard}>
        {!formsResult.ok ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#dc2626", fontSize: "1rem" }}>
            حدث خطأ أثناء تحميل نماذج البحث. يرجى المحاولة لاحقاً.
          </div>
        ) : formsResult.data.items.length === 0 ? (
          <div style={{ padding: "3rem 1.5rem", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: "3.5rem", height: "3.5rem", borderRadius: "50%", background: "var(--color-muted-bg, #f3f4f6)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-muted)" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <line x1="10" y1="9" x2="8" y2="9" />
              </svg>
            </div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-foreground)", margin: 0 }}>
              لا توجد استمارات بعد
            </h2>
            <p style={{ fontSize: "0.9375rem", color: "var(--color-muted)", margin: 0, maxWidth: "32rem", lineHeight: 1.6 }}>
              ستظهر هنا نماذج البحث بعد تسجيلها ومراجعتها.
            </p>
            {hasActiveFilters ? (
              <p style={{ fontSize: "0.875rem", color: "#92400e", backgroundColor: "#fef3c7", padding: "0.375rem 0.75rem", borderRadius: "0.5rem", margin: "0.25rem 0 0 0" }}>
                لا توجد نتائج مطابقة للفلاتر الحالية.
              </p>
            ) : null}
          </div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--color-border)", color: "var(--color-muted)", fontSize: "0.875rem" }}>
                    <th style={{ padding: "0.75rem", fontWeight: 700 }}>رمز النموذج</th>
                    <th style={{ padding: "0.75rem", fontWeight: 700 }}>تاريخ التقديم</th>
                    <th style={{ padding: "0.75rem", fontWeight: 700 }}>الحالة</th>
                    <th style={{ padding: "0.75rem", fontWeight: 700 }}>رقم المحاولة</th>
                    <th style={{ padding: "0.75rem", fontWeight: 700 }}>معرف المشروع</th>
                    <th style={{ padding: "0.75rem", fontWeight: 700 }}>معرف المشارك</th>
                    <th style={{ padding: "0.75rem", fontWeight: 700 }}>السعر المقبول (ر.س)</th>
                    <th style={{ padding: "0.75rem", fontWeight: 700 }}>التفاصيل</th>
                  </tr>
                </thead>
                <tbody>
                  {formsResult.data.items.map((item) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td style={{ padding: "0.75rem" }}>
                        <strong style={{ color: "var(--color-foreground)" }}>{item.code}</strong>
                      </td>
                      <td style={{ padding: "0.75rem", fontSize: "0.9375rem" }}>{item.submitted_date}</td>
                      <td style={{ padding: "0.75rem" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "0.25rem 0.625rem",
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
                      <td style={{ padding: "0.75rem", fontSize: "0.9375rem" }}>{item.attempt_number}</td>
                      <td style={{ padding: "0.75rem" }}>
                        <span className={styles.ltrToken} style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                          {item.project_id.slice(0, 8)}...
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem" }}>
                        <span className={styles.ltrToken} style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                          {item.respondent_id.slice(0, 8)}...
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem", fontSize: "0.9375rem" }}>
                        {item.accepted_price_snapshot !== null
                          ? item.accepted_price_snapshot.toFixed(2)
                          : "-"}
                      </td>
                      <td style={{ padding: "0.75rem" }}>
                        <Link href={`/forms/${item.id}`} className={styles.textLink}>
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
                borderTop: "1px solid var(--color-border)",
                flexWrap: "wrap",
                gap: "0.75rem",
              }}
            >
              <div style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>
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
                    className={styles.secondaryAction}
                    style={{ minHeight: "2.5rem", paddingInline: "0.875rem", fontSize: "0.875rem" }}
                  >
                    &rarr; السابقة
                  </Link>
                ) : (
                  <span
                    style={{
                      display: "inline-flex",
                      minHeight: "2.5rem",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "0.75rem",
                      border: "1px solid var(--color-border)",
                      background: "var(--color-muted-bg, #f8fafa)",
                      paddingInline: "0.875rem",
                      fontSize: "0.875rem",
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
                    className={styles.secondaryAction}
                    style={{ minHeight: "2.5rem", paddingInline: "0.875rem", fontSize: "0.875rem" }}
                  >
                    التالية &larr;
                  </Link>
                ) : (
                  <span
                    style={{
                      display: "inline-flex",
                      minHeight: "2.5rem",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "0.75rem",
                      border: "1px solid var(--color-border)",
                      background: "var(--color-muted-bg, #f8fafa)",
                      paddingInline: "0.875rem",
                      fontSize: "0.875rem",
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
