import type { DashboardRole } from "@/lib/auth/dashboard-role";
import { SearchCard } from "./SearchCard";
import { QuickActions } from "./QuickActions";
import { SummaryCard } from "@/components/shared/SummaryCard";
import { mockDashboardSummary } from "@/lib/mock-adapters/dashboard";
import styles from "./authenticated-shell.module.css";

interface DashboardShellProps {
  role: DashboardRole;
}

export function DashboardShell({ role }: DashboardShellProps) {
  const isOwner = role === "owner";

  return (
    <div className={styles.dashboard}>
      <section className={styles.pageIntro} aria-labelledby="dashboard-title">
        <div>
          <h1 id="dashboard-title" className={styles.pageTitle}>
            لوحة المتابعة الميدانية
          </h1>
          <p className={styles.pageDescription}>
            {isOwner
              ? "متابعة المشاريع والمشاركين"
              : "متابعة العمليات وتحديث بيانات المشاركين"}
          </p>
        </div>
      </section>

      <div className={styles.workflowGrid}>
        <SearchCard />
        <QuickActions />
      </div>

      <section className={styles.summarySection} aria-labelledby="summary-title">
        <p className={styles.demoNotice} role="status">
          بيانات المتابعة أدناه للعرض التجريبي فقط وليست تحديثات تشغيلية مباشرة.
        </p>
        <h2 id="summary-title" className={styles.sectionTitle}>
          نظرة عامة
        </h2>
        <div
          className={`${styles.summaryGrid} ${
            isOwner ? "" : styles.summaryGridOperational
          }`}
        >
          <SummaryCard
            title="مشاريع نشطة"
            value={mockDashboardSummary.activeProjects}
            variant="operational"
          />
          <SummaryCard
            title="مشاركات اليوم"
            value={mockDashboardSummary.todayParticipations}
            variant="operational"
          />
          <SummaryCard
            title="نماذج بانتظار المراجعة"
            value={mockDashboardSummary.pendingReviews}
            variant="operational"
          />
          {isOwner && mockDashboardSummary.upcomingPayments !== undefined && (
            <SummaryCard
              title="مستحقات قريبة (تجريبي)"
              value={`${mockDashboardSummary.upcomingPayments.toLocaleString("en-US")} ر.س`}
              variant="financial"
            />
          )}
        </div>
      </section>
    </div>
  );
}
