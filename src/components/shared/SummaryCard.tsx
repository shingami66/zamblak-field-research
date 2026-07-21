import type { ReactNode } from "react";
import styles from "./summary-card.module.css";

interface SummaryCardProps {
  title: string;
  value: ReactNode;
  footer?: ReactNode;
  variant?: "operational" | "financial";
}

export function SummaryCard({ title, value, footer, variant = "operational" }: SummaryCardProps) {
  return (
    <article className={`${styles.card} ${styles[variant]}`}>
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.value} dir={variant === "financial" ? "ltr" : "auto"}>
        {value}
      </div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </article>
  );
}
