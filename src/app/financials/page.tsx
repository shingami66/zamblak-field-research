import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAppSession } from "@/lib/auth/session";
import { getMockFinancialSummary, getMockInvoices } from "@/lib/mock-adapters/financials";
import { SummaryCard } from "@/components/shared/SummaryCard";
import { DataTable } from "@/components/shared/DataTable";
import { MobileListCard } from "@/components/shared/MobileListCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ProjectLtrToken } from "@/components/projects/ProjectLtrToken";
import styles from "./financials.module.css";

export default async function FinancialsPage() {
  const session = await requireAppSession();

  // Support Helpers are finance-blind. If they reach this route, deny access.
  if (session.profile.role !== "owner") {
    redirect("/forbidden");
  }

  const summary = getMockFinancialSummary();
  const invoices = getMockInvoices();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.pageTitle}>المستحقات</h1>
        <p className={styles.pageDescription}>
          ملخص واضح للمستحقات وسجلات العرض المالي.
        </p>
        <div className={styles.devWarning} role="alert">
          <strong>بيانات للعرض فقط:</strong> هذه الصفحة تستخدم بيانات تجريبية لأغراض العرض والتصميم.
        </div>
      </header>

      <section className={styles.summarySection} aria-label="ملخص مالي">
        <div className={styles.summaryGrid}>
          <SummaryCard title="إجمالي الإيرادات" value={summary.totalRevenue} variant="financial" />
          <SummaryCard title="إجمالي المصروفات" value={summary.totalExpenses} variant="financial" />
          <SummaryCard title="صافي الربح" value={summary.netProfit} variant="financial" />
          <SummaryCard title="فواتير معلقة" value={summary.pendingInvoices} variant="operational" />
        </div>
      </section>

      <section className={styles.listSection} aria-labelledby="invoices-heading">
        <h2 id="invoices-heading" className={styles.sectionTitle}>
          أحدث الفواتير
        </h2>

        <div className={styles.desktopView}>
          <DataTable
            data={invoices}
            keyExtractor={(item) => item.id}
            columns={[
              {
                key: "id",
                header: "رقم الفاتورة",
                render: (item) => <ProjectLtrToken>{item.id}</ProjectLtrToken>,
              },
              {
                key: "client",
                header: "العميل",
                render: (item) => item.clientName,
              },
              {
                key: "amount",
                header: "المبلغ",
                render: (item) => <ProjectLtrToken>{item.amount}</ProjectLtrToken>,
              },
              {
                key: "dueDate",
                header: "تاريخ الاستحقاق",
                render: (item) => <ProjectLtrToken>{item.dueDate}</ProjectLtrToken>,
              },
              {
                key: "status",
                header: "الحالة",
                render: (item) => <StatusBadge variant={item.status === "paid" ? "active" : item.status === "overdue" ? "danger" : "neutral"}>{item.status === "paid" ? "مدفوعة" : item.status === "overdue" ? "متأخرة" : "معلقة"}</StatusBadge>,
              },
            ]}
          />
        </div>

        <div className={styles.mobileView}>
          {invoices.map((invoice) => (
            <MobileListCard
              key={invoice.id}
              title={invoice.clientName}
              details={[
                { label: "رقم الفاتورة", value: <ProjectLtrToken>{invoice.id}</ProjectLtrToken> },
                { label: "المبلغ", value: <ProjectLtrToken>{invoice.amount}</ProjectLtrToken> },
                { label: "تاريخ الاستحقاق", value: <ProjectLtrToken>{invoice.dueDate}</ProjectLtrToken> },
                { label: "الحالة", value: <StatusBadge variant={invoice.status === "paid" ? "active" : invoice.status === "overdue" ? "danger" : "neutral"}>{invoice.status === "paid" ? "مدفوعة" : invoice.status === "overdue" ? "متأخرة" : "معلقة"}</StatusBadge> },
              ]}
            />
          ))}
        </div>
      </section>

      <section className={styles.protoSection} aria-labelledby="proto-financials-heading">
        <h2 id="proto-financials-heading" className={styles.protoTitle}>
          التحصيلات التجريبية (نموذج أولي)
        </h2>
        <p className={styles.protoDescription}>
          عرض وإدارة التحصيلات التجريبية المسجلة وتوزيعها على الاستمارات المقبولة.
        </p>
        <div className={styles.protoActions}>
          <Link href="/collections" className={`${styles.protoLink} ${styles.protoLinkSecondary}`}>
            عرض التحصيلات التجريبية
          </Link>
          <Link href="/collections/new" className={`${styles.protoLink} ${styles.protoLinkPrimary}`}>
            تسجيل تحصيل تجريبي
          </Link>
        </div>
      </section>
    </div>
  );
}
