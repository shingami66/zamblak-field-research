import type { ReactNode } from "react";
import styles from "./status-badge.module.css";

type StatusVariant = "active" | "warning" | "neutral" | "danger";

interface StatusBadgeProps {
  variant: StatusVariant;
  children: ReactNode;
}

export function StatusBadge({ variant, children }: StatusBadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[variant]}`}>
      {children}
    </span>
  );
}
