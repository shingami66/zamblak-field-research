import { projectsListCopy } from "@/lib/projects/list-copy";
import styles from "./projects-list.module.css";

export default function ProjectsLoading() {
  return (
    <div className={styles.page} aria-busy="true" aria-live="polite">
      <div className={styles.loadingBlock}>
        <p>{projectsListCopy.loading}</p>
        <div className={styles.skeletonRow} aria-hidden="true" />
        <div className={styles.skeletonRow} aria-hidden="true" />
        <div className={styles.skeletonRow} aria-hidden="true" />
      </div>
    </div>
  );
}
