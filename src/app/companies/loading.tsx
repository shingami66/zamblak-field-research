import { companiesListCopy } from "@/lib/companies/list-copy";
import styles from "./companies-list.module.css";

export default function CompaniesLoading() {
  return (
    <div className={styles.page} aria-busy="true" aria-live="polite">
      <div className={styles.loadingBlock}>
        <p>{companiesListCopy.loading}</p>
        <div className={styles.skeletonRow} aria-hidden="true" />
        <div className={styles.skeletonRow} aria-hidden="true" />
        <div className={styles.skeletonRow} aria-hidden="true" />
      </div>
    </div>
  );
}
