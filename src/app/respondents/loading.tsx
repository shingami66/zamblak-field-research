import { ZamblakLoadingMark } from "@/components/brand/ZamblakLoadingMark";
import { respondentsListCopy } from "@/lib/respondents/list-copy";
import styles from "./respondents-list.module.css";

export default function RespondentsLoading() {
  return (
    <div
      className={styles.page}
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <div className={styles.loadingBlock}>
        <ZamblakLoadingMark
          variant="standard"
          label={respondentsListCopy.loading}
        />
        <div className={styles.skeletonRow} aria-hidden="true" />
        <div className={styles.skeletonRow} aria-hidden="true" />
        <div className={styles.skeletonRow} aria-hidden="true" />
      </div>
    </div>
  );
}
