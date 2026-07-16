import { companiesDetailCopy } from "@/lib/companies/detail-copy";
import styles from "./company-detail.module.css";

export default function CompanyDetailLoading() {
  return (
    <div className={styles.page} aria-busy="true" aria-live="polite">
      <div className={styles.loadingBlock}>
        <p>{companiesDetailCopy.loading}</p>
        <div className={styles.skeletonRow} aria-hidden="true" />
        <div className={styles.skeletonRow} aria-hidden="true" />
      </div>
    </div>
  );
}
