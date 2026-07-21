import type { ReactNode } from "react";
import styles from "./mobile-list-card.module.css";

interface MobileListCardProps {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  details?: Array<{ label: string; value: ReactNode }>;
  actions?: ReactNode;
}

export function MobileListCard({
  title,
  subtitle,
  badge,
  details,
  actions,
}: MobileListCardProps) {
  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <div>
          <h3 className={styles.title}>{title}</h3>
          {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
        </div>
        {badge && <div>{badge}</div>}
      </header>
      
      {details && details.length > 0 && (
        <div className={styles.body}>
          {details.map((detail, idx) => (
            <div key={idx} className={styles.detailRow}>
              <span className={styles.detailLabel}>{detail.label}</span>
              <span className={styles.detailValue}>{detail.value}</span>
            </div>
          ))}
        </div>
      )}

      {actions && <footer className={styles.footer}>{actions}</footer>}
    </article>
  );
}
