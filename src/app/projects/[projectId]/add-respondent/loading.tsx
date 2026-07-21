import { ZamblakLoadingMark } from "@/components/brand/ZamblakLoadingMark";
import { participationCopy } from "@/lib/participations/copy";
import styles from "./add-respondent.module.css";

export default function AddRespondentLoading() {
  return (
    <div className={styles.page} aria-busy="true" aria-live="polite">
      <div className={styles.header}>
        <div className={styles.title}>
          <ZamblakLoadingMark variant="compact" />
          {" "}
          {participationCopy.addRespondentTitle}
        </div>
        <p className={styles.intro}>{participationCopy.addRespondentIntro}</p>
      </div>
    </div>
  );
}
