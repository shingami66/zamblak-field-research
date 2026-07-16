import { ZamblakLoadingMark } from "@/components/brand/ZamblakLoadingMark";
import { projectsEditCopy } from "@/lib/projects/edit-copy";
import styles from "@/app/projects/new/create-project.module.css";

export default function EditProjectLoading() {
  return (
    <div className={styles.page} aria-busy="true" aria-live="polite">
      <div className={styles.surface}>
        <div className={styles.loadingHeader}>
          <ZamblakLoadingMark variant="standard" />
          <p className={styles.loadingText}>{projectsEditCopy.loading}</p>
        </div>
      </div>
    </div>
  );
}
