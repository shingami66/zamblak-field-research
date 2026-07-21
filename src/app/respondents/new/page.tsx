import { BackLink } from "@/components/shared/BackLink";
import { CreateRespondentForm } from "@/components/respondents/CreateRespondentForm";
import { requireAppSession } from "@/lib/auth/session";
import { respondentsCreateCopy } from "@/lib/respondents/create-copy";
import styles from "./create-respondent.module.css";

export default async function CreateRespondentPage() {
  await requireAppSession();

  return (
    <div className={styles.page}>
      <BackLink href="/respondents" className={styles.backLink}>{respondentsCreateCopy.backToList}</BackLink>
      <h1 className={styles.pageTitle}>{respondentsCreateCopy.pageTitle}</h1>
      <p className={styles.pageDescription}>
        {respondentsCreateCopy.pageDescription}
      </p>
      <div className={styles.surface}>
        <CreateRespondentForm />
      </div>
    </div>
  );
}
