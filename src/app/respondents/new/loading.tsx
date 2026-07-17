import { ZamblakLoadingMark } from "@/components/brand/ZamblakLoadingMark";
import { respondentsCreateCopy } from "@/lib/respondents/create-copy";
import styles from "./create-respondent.module.css";

export default function CreateRespondentLoading() {
  return (
    <div className={styles.page} aria-busy="true" aria-live="polite">
      <div className={styles.surface}>
        <div className={styles.loadingHeader}>
          <ZamblakLoadingMark variant="standard" />
          <p className={styles.loadingText}>{respondentsCreateCopy.loading}</p>
        </div>
      </div>
    </div>
  );
}
