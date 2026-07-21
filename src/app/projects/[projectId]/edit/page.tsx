import Link from "next/link";
import { notFound } from "next/navigation";
import { EditProjectForm } from "@/components/projects/EditProjectForm";
import { BackLink } from "@/components/shared/BackLink";
import { requireAppSession } from "@/lib/auth/session";
import { COMPANY_LIST_MAX_LIMIT } from "@/lib/companies/input";
import { listCompanies } from "@/lib/companies/rpc";
import { parseProjectIdParam } from "@/lib/projects/detail-params";
import { projectsDetailErrorBehavior } from "@/lib/projects/detail-view-model";
import { projectsEditCopy } from "@/lib/projects/edit-copy";
import {
  initialEditProjectState,
  isCompanyLockedStatus,
  isEditableProjectStatus,
  projectStatusEditLabel,
} from "@/lib/projects/edit-form";
import { getProject } from "@/lib/projects/rpc";
import { createClient } from "@/lib/supabase/server";
import styles from "@/app/projects/new/create-project.module.css";

type EditProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function EditProjectPage({
  params,
}: EditProjectPageProps) {
  await requireAppSession();
  const { projectId: rawId } = await params;

  const parsed = parseProjectIdParam(rawId);
  if (!parsed.ok) {
    notFound();
  }

  const supabase = await createClient();
  const result = await getProject(supabase, parsed.projectId);

  if (!result.ok) {
    const behavior = projectsDetailErrorBehavior(result.code);
    if (behavior.kind === "not_found") {
      notFound();
    }
    return (
      <div className={styles.page}>
        <BackLink href="/projects" className={styles.backLink}>{projectsEditCopy.backToDetail}</BackLink>
        <div className={styles.formError} role="alert">
          <h1 className={styles.formErrorTitle}>
            {behavior.message ?? projectsEditCopy.errorAccess}
          </h1>
        </div>
      </div>
    );
  }

  const project = result.data;
  const detailHref = `/projects/${project.projectId}`;
  const statusLabel = projectStatusEditLabel(project.status);

  if (!isEditableProjectStatus(project.status)) {
    const message =
      project.status === "closed"
        ? projectsEditCopy.closedReadOnly
        : projectsEditCopy.cancelledReadOnly;

    return (
      <div className={styles.page}>
        <BackLink href={detailHref} className={styles.backLink}>{projectsEditCopy.backToDetail}</BackLink>
        <h1 className={styles.pageTitle}>{projectsEditCopy.pageTitle}</h1>
        <div className={styles.emptyState} role="status">
          <h2 className={styles.emptyTitle}>{statusLabel}</h2>
          <p className={styles.emptyHint}>{message}</p>
          <Link href={detailHref} className={styles.submit}>
            {projectsEditCopy.viewDetail}
          </Link>
        </div>
      </div>
    );
  }

  const companyLocked = isCompanyLockedStatus(project.status);
  let companyOptions: { companyId: string; name: string }[] = [];
  let companiesLoadFailed = false;

  if (!companyLocked) {
    const companiesResult = await listCompanies(supabase, {
      search: null,
      limit: COMPANY_LIST_MAX_LIMIT,
      offset: 0,
    });
    if (!companiesResult.ok) {
      companiesLoadFailed = true;
    } else {
      companyOptions = companiesResult.data.companies.map((c) => ({
        companyId: c.companyId,
        name: c.name,
      }));
      // Ensure current company is present in options if still active.
      if (
        !companyOptions.some((c) => c.companyId === project.companyId)
      ) {
        companyOptions = [
          { companyId: project.companyId, name: project.companyName },
          ...companyOptions,
        ];
      }
    }
  }

  const initialState = initialEditProjectState(project);

  return (
    <div className={styles.page}>
      <BackLink href={detailHref} className={styles.backLink}>{projectsEditCopy.backToDetail}</BackLink>
      <h1 className={styles.pageTitle}>{projectsEditCopy.pageTitle}</h1>
      <p className={styles.pageDescription}>
        {projectsEditCopy.pageDescription}
      </p>

      {companiesLoadFailed ? (
        <div className={styles.loadError} role="alert">
          <h2 className={styles.emptyTitle}>
            {projectsEditCopy.formErrorHeading}
          </h2>
          <p className={styles.emptyHint}>
            {projectsEditCopy.companiesLoadError}
          </p>
          <Link href={detailHref} className={styles.secondaryAction}>
            {projectsEditCopy.backToDetail}
          </Link>
        </div>
      ) : !companyLocked && companyOptions.length === 0 ? (
        <div className={styles.emptyState} role="status">
          <h2 className={styles.emptyTitle}>
            {projectsEditCopy.noCompaniesTitle}
          </h2>
          <p className={styles.emptyHint}>{projectsEditCopy.noCompaniesHint}</p>
          <Link href="/companies/new" className={styles.submit}>
            {projectsEditCopy.goToCompanies}
          </Link>
          <Link href={detailHref} className={styles.secondaryAction}>
            {projectsEditCopy.cancel}
          </Link>
        </div>
      ) : (
        <div className={styles.surface}>
          <EditProjectForm
            initialState={initialState}
            companyOptions={companyOptions}
            companyLocked={companyLocked}
            currentCompanyName={project.companyName}
            statusLabel={statusLabel}
          />
        </div>
      )}
    </div>
  );
}
