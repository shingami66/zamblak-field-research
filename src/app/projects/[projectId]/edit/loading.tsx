import { projectsEditCopy } from "@/lib/projects/edit-copy";
import styles from "@/app/projects/new/create-project.module.css";

export default function EditProjectLoading() {
  return (
    <div className={styles.page} aria-busy="true" aria-live="polite">
      <div className={styles.surface}>
        <p>{projectsEditCopy.loading}</p>
      </div>
    </div>
  );
}
