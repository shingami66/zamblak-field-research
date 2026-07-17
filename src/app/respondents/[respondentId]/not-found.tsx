import Link from "next/link";
import { respondentsDetailCopy } from "@/lib/respondents/detail-copy";
import styles from "./respondent-detail.module.css";

export default function RespondentDetailNotFound() {
  return (
    <div className={styles.page}>
      <Link href="/respondents" className={styles.backLink}>
        ← {respondentsDetailCopy.backToList}
      </Link>
      <div className={styles.notFoundState} role="status">
        <h1 className={styles.notFoundTitle}>
          {respondentsDetailCopy.notFoundTitle}
        </h1>
        <p className={styles.notFoundHint}>
          {respondentsDetailCopy.notFoundHint}
        </p>
        <Link href="/respondents" className={styles.secondaryAction}>
          {respondentsDetailCopy.backToList}
        </Link>
      </div>
    </div>
  );
}
