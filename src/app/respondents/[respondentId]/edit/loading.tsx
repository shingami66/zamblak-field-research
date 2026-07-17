import { ZamblakLoadingMark } from "@/components/brand/ZamblakLoadingMark";
import { respondentsEditCopy } from "@/lib/respondents/edit-copy";
import styles from "@/app/respondents/new/create-respondent.module.css";

export default function EditRespondentLoading() {
  return (
    <div
      className={styles.page}
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <div className={styles.surface}>
        <div className={styles.loadingHeader}>
          <ZamblakLoadingMark variant="standard" />
          <p className={styles.loadingText}>{respondentsEditCopy.loading}</p>
        </div>
      </div>
    </div>
  );
}
