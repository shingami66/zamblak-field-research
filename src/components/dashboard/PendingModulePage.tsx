import Link from "next/link";
import styles from "./pending-module-page.module.css";

type PendingModulePageProps = {
  title: string;
  description: string;
};

export function PendingModulePage({
  title,
  description,
}: PendingModulePageProps) {
  return (
    <section className={styles.page} aria-labelledby="pending-module-title">
      <div className={styles.surface}>
        <p className={styles.status}>
          <span className={styles.statusDot} aria-hidden="true" />
          هذه المساحة قيد الإعداد
        </p>

        <div className={styles.copy}>
          <h1 id="pending-module-title" className={styles.title}>
            {title}
          </h1>
          <p className={styles.description}>{description}</p>
        </div>

        <nav aria-label="العودة إلى لوحة المتابعة">
          <Link href="/" className={styles.backLink}>
            العودة إلى لوحة المتابعة
          </Link>
        </nav>
      </div>
    </section>
  );
}
