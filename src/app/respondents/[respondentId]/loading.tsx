import { ZamblakLoadingMark } from "@/components/brand/ZamblakLoadingMark";
import { respondentsDetailCopy } from "@/lib/respondents/detail-copy";
import styles from "./respondent-detail.module.css";

export default function RespondentDetailLoading() {
  return (
    <div
      className={styles.page}
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <div className={styles.loadingBlock}>
        <div className={styles.loadingHeader}>
          <ZamblakLoadingMark variant="standard" />
          <p className={styles.loadingText}>{respondentsDetailCopy.loading}</p>
        </div>
        <div className={styles.skeletonRow} aria-hidden="true" />
        <div className={styles.skeletonRow} aria-hidden="true" />
        <div className={styles.skeletonRow} aria-hidden="true" />
      </div>
    </div>
  );
}
