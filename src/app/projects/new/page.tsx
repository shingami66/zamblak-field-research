import Link from "next/link";
import { CreateProjectForm } from "@/components/projects/CreateProjectForm";
import { BackLink } from "@/components/shared/BackLink";
import { requireAppSession } from "@/lib/auth/session";
import { COMPANY_LIST_MAX_LIMIT } from "@/lib/companies/input";
import { listCompanies } from "@/lib/companies/rpc";
import { projectsCreateCopy } from "@/lib/projects/create-copy";
import { createClient } from "@/lib/supabase/server";
import styles from "./create-project.module.css";

export default async function CreateProjectPage() {
  await requireAppSession();

  const supabase = await createClient();
  const companiesResult = await listCompanies(supabase, {
    search: null,
    limit: COMPANY_LIST_MAX_LIMIT,
    offset: 0,
  });

  const companiesLoadFailed = !companiesResult.ok;
  const companyOptions = companiesResult.ok
    ? companiesResult.data.companies.map((c) => ({
        companyId: c.companyId,
        name: c.name,
      }))
    : [];

  return (
    <div className={styles.page}>
      <BackLink href="/projects" className={styles.backLink}>{projectsCreateCopy.backToList}</BackLink>
      <h1 className={styles.pageTitle}>{projectsCreateCopy.pageTitle}</h1>
      <p className={styles.pageDescription}>
        {projectsCreateCopy.pageDescription}
      </p>
      <p className={styles.draftNotice} role="note">
        {projectsCreateCopy.draftNotice}
      </p>

      {companiesLoadFailed ? (
        <div className={styles.loadError} role="alert">
          <h2 className={styles.emptyTitle}>
            {projectsCreateCopy.formErrorHeading}
          </h2>
          <p className={styles.emptyHint}>
            {projectsCreateCopy.companiesLoadError}
          </p>
          <Link href="/projects" className={styles.secondaryAction}>
            {projectsCreateCopy.backToList}
          </Link>
        </div>
      ) : companyOptions.length === 0 ? (
        <div className={styles.emptyState} role="status">
          <h2 className={styles.emptyTitle}>
            {projectsCreateCopy.noCompaniesTitle}
          </h2>
          <p className={styles.emptyHint}>
            {projectsCreateCopy.noCompaniesHint}
          </p>
          <Link href="/companies/new" className={styles.submit}>
            {projectsCreateCopy.goToCompanies}
          </Link>
          <Link href="/projects" className={styles.secondaryAction}>
            {projectsCreateCopy.cancel}
          </Link>
        </div>
      ) : (
        <div className={styles.surface}>
          <CreateProjectForm companyOptions={companyOptions} />
        </div>
      )}
    </div>
  );
}
