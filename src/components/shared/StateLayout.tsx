import type { ReactNode } from "react";
import styles from "./state-layout.module.css";

interface StateLayoutProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  isError?: boolean;
  headingLevel?: "h1" | "h2";
}

export function StateLayout({ title, description, icon, action, isError, headingLevel = "h2" }: StateLayoutProps) {
  const Heading = headingLevel;
  return (
    <div className={styles.stateLayout} role={isError ? "alert" : "status"}>
      {icon && (
        <div className={`${styles.icon} ${isError ? styles.iconDanger : ""}`} aria-hidden="true">
          {icon}
        </div>
      )}
      <Heading className={styles.title}>{title}</Heading>
      <p className={styles.description}>{description}</p>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
