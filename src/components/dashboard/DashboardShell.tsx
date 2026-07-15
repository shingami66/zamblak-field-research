import Image from "next/image";
import type { DashboardRole } from "@/lib/auth/dashboard-role";
import styles from "./authenticated-shell.module.css";

interface DashboardShellProps {
  role: DashboardRole;
}

export function DashboardShell({ role }: DashboardShellProps) {
  const isOwner = role === "owner";
  const availableAreas = isOwner
    ? ["متابعة الشركات", "متابعة المشاريع", "مراجعة المستحقات"]
    : ["متابعة الشركات", "متابعة المشاريع", "متابعة العمليات الميدانية"];

  return (
    <div className={styles.dashboard}>
      <section className={styles.pageIntro} aria-labelledby="dashboard-title">
        <div>
          <h1 id="dashboard-title" className={styles.pageTitle}>
            لوحة المتابعة الميدانية
          </h1>
          <p className={styles.pageDescription}>
            {isOwner
              ? "متابعة المشاريع والمستجيبين"
              : "متابعة العمليات وتحديث بيانات المستجيبين"}
          </p>
        </div>
        <span className={styles.roleBadge}>
          {isOwner ? "مساحة المالك" : "مساحة الدعم"}
        </span>
      </section>

      <section className={styles.emptyState} aria-labelledby="empty-state-title">
        <div className={styles.emptyStateContent}>
          <span className={styles.statusLabel}>
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M12 7v5l3 2"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="12"
                cy="12"
                r="8.25"
                stroke="currentColor"
                strokeWidth="1.8"
              />
            </svg>
            مساحة المتابعة قيد التجهيز
          </span>

          <h2 id="empty-state-title" className={styles.emptyStateTitle}>
            {isOwner
              ? "مساحة عمل واضحة لإدارة البحث الميداني"
              : "مساحة مرتبة لمتابعة العمل الميداني"}
          </h2>

          <p className={styles.emptyStateDescription}>
            {isOwner
              ? "لا توجد بيانات تشغيلية لعرضها الآن. عند توفر الشركات والمشاريع ستظهر هنا صورة موجزة تساعدك على متابعة العمل، مع بقاء المستحقات ضمن صلاحيات المالك فقط."
              : "لا توجد عمليات ميدانية للمتابعة الآن. عند توفر الشركات والمشاريع ستظهر هنا المهام التشغيلية المتاحة لحسابك، من دون أي معلومات مالية."}
          </p>

          <div className={styles.nextStep}>
            <span className={styles.nextStepIcon} aria-hidden="true">
              ←
            </span>
            <span>
              <strong>الخطوة التالية</strong>
              راجع أقسام الشركات والمشاريع من شريط التنقل عند بدء العمل عليها.
            </span>
          </div>
        </div>

        <aside className={styles.brandPanel} aria-label="نطاق مساحة العمل">
          <div className={styles.emptyStateLogoPlate}>
            <Image
              src="/brand/zamblak-mark.svg"
              alt="علامة زمبلك"
              width={88}
              height={88}
              className={styles.emptyStateMark}
            />
          </div>
          <h3 className={styles.brandPanelTitle}>عملك الميداني في مكان واحد</h3>
          <p className={styles.brandPanelDescription}>
            واجهة هادئة ومباشرة تضع المساحات الأساسية في متناولك.
          </p>
          <ul className={styles.areaList}>
            {availableAreas.map((area) => (
              <li key={area}>
                <span aria-hidden="true" />
                {area}
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </div>
  );
}
