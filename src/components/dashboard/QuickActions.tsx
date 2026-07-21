import Link from "next/link";
import styles from "./quick-actions.module.css";

export function QuickActions() {
  const actions = [
    {
      label: "إضافة مشارك",
      description: "سجل جديد",
      href: "/respondents/new",
      icon: "respondent",
    },
    {
      label: "الشركات",
      description: "السجل التشغيلي",
      href: "/companies",
      icon: "company",
    },
    {
      label: "المشاريع",
      description: "العمل الميداني",
      href: "/projects",
      icon: "project",
    },
  ];

  return (
    <section className={styles.container} aria-labelledby="quick-actions-title">
      <h2 id="quick-actions-title" className={styles.title}>
        إجراءات سريعة
      </h2>
      <div className={styles.actions}>
        {actions.map((action) => (
          <Link key={action.href} href={action.href} className={styles.actionCard}>
            <ActionIcon name={action.icon} />
            <span className={styles.actionText}>
              <strong>{action.label}</strong>
              <span>{action.description}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ActionIcon({ name }: { name: string }) {
  if (name === "respondent") {
    return (
      <span className={styles.actionIcon} aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M15 19a6 6 0 0 0-12 0M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M19 8v6M16 11h6" />
        </svg>
      </span>
    );
  }

  if (name === "company") {
    return (
      <span className={styles.actionIcon} aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M4 21V5l8-3v19M12 8h8v13M2 21h20M7 7h2M7 11h2M7 15h2M15 12h2M15 16h2" />
        </svg>
      </span>
    );
  }

  return (
    <span className={styles.actionIcon} aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M3 6.5h7l2 2h9v11H3zM3 6.5V4h7l2 2h9v2.5" />
      </svg>
    </span>
  );
}
