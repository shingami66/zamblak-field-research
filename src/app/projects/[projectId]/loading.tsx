import { projectsDetailCopy } from "@/lib/projects/detail-copy";
import styles from "./project-detail.module.css";

export default function ProjectDetailLoading() {
  return (
    <div className={styles.page} aria-busy="true" aria-live="polite">
      <div className={styles.loadingBlock}>
        <p>{projectsDetailCopy.loading}</p>
        <div className={styles.skeletonRow} aria-hidden="true" />
        <div className={styles.skeletonRow} aria-hidden="true" />
        <div className={styles.skeletonRow} aria-hidden="true" />
      </div>
    </div>
  );
}
