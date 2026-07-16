import Link from "next/link";
import { CreateCompanyForm } from "@/components/companies/CreateCompanyForm";
import { requireAppSession } from "@/lib/auth/session";
import { companiesCreateCopy } from "@/lib/companies/create-copy";
import styles from "./create-company.module.css";

export default async function CreateCompanyPage() {
  await requireAppSession();

  return (
    <div className={styles.page}>
      <Link href="/companies" className={styles.backLink}>
        ← {companiesCreateCopy.backToList}
      </Link>
      <h1 className={styles.pageTitle}>{companiesCreateCopy.pageTitle}</h1>
      <p className={styles.pageDescription}>
        {companiesCreateCopy.pageDescription}
      </p>
      <div className={styles.surface}>
        <CreateCompanyForm />
      </div>
    </div>
  );
}
