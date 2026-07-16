import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAppSession } from "@/lib/auth/session";
import { companiesDetailCopy } from "@/lib/companies/detail-copy";
import { parseCompanyIdParam } from "@/lib/companies/detail-params";
import {
  companiesDetailErrorBehavior,
  toCompanyDetailView,
} from "@/lib/companies/detail-view-model";
import { getCompany } from "@/lib/companies/rpc";
import { createClient } from "@/lib/supabase/server";
import styles from "./company-detail.module.css";

type CompanyDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CompanyDetailPage({
  params,
}: CompanyDetailPageProps) {
  await requireAppSession();
  const { id: rawId } = await params;

  const parsed = parseCompanyIdParam(rawId);
  if (!parsed.ok) {
    notFound();
  }

  const supabase = await createClient();
  const result = await getCompany(supabase, parsed.companyId);

  if (!result.ok) {
    const behavior = companiesDetailErrorBehavior(result.code);
    if (behavior.kind === "not_found") {
      notFound();
    }
    return (
      <div className={styles.page}>
        <Link href="/companies" className={styles.backLink}>
          ← {companiesDetailCopy.backToList}
        </Link>
        <div className={styles.errorState} role="alert">
          <h1 className={styles.errorTitle}>
            {behavior.message ?? companiesDetailCopy.errorUnexpected}
          </h1>
        </div>
      </div>
    );
  }

  const view = toCompanyDetailView(result.data);

  return (
    <div className={styles.page}>
      <Link href={view.backHref} className={styles.backLink}>
        ← {companiesDetailCopy.backToList}
      </Link>

      <header className={styles.headerRow}>
        <h1 className={styles.pageTitle}>{view.name}</h1>
        <Link href={view.editHref} className={styles.editAction}>
          {companiesDetailCopy.editCompany}
        </Link>
      </header>

      <section className={styles.surface} aria-labelledby="company-details">
        <h2 id="company-details" className={styles.sectionTitle}>
          {companiesDetailCopy.detailsHeading}
        </h2>
        <dl className={styles.metaList}>
          <div className={styles.metaItem}>
            <dt className={styles.metaLabel}>
              {companiesDetailCopy.contactPerson}
            </dt>
            <dd className={styles.metaValue}>{view.contactPersonLabel}</dd>
          </div>
          <div className={styles.metaItem}>
            <dt className={styles.metaLabel}>{companiesDetailCopy.phone}</dt>
            <dd className={styles.metaValue}>
              {view.phoneIsLtr ? (
                <span dir="ltr" className={styles.phoneLtr}>
                  {view.phoneLabel}
                </span>
              ) : (
                view.phoneLabel
              )}
            </dd>
          </div>
          <div className={styles.metaItem}>
            <dt className={styles.metaLabel}>{companiesDetailCopy.createdAt}</dt>
            <dd className={styles.metaValue}>
              <span className={styles.timestampValue}>
                {view.createdAtLabel}
              </span>
            </dd>
          </div>
          <div className={styles.metaItem}>
            <dt className={styles.metaLabel}>{companiesDetailCopy.updatedAt}</dt>
            <dd className={styles.metaValue}>
              <span className={styles.timestampValue}>
                {view.updatedAtLabel}
              </span>
            </dd>
          </div>
        </dl>

        <div className={styles.notesBlock}>
          <h3 className={styles.sectionTitle}>{companiesDetailCopy.notes}</h3>
          <p
            className={`${styles.notesText} ${
              view.notesIsEmpty ? styles.notesEmpty : ""
            }`}
          >
            {view.notesLabel}
          </p>
        </div>

        <div aria-labelledby="company-counts">
          <h3 id="company-counts" className={styles.sectionTitle}>
            {companiesDetailCopy.countsHeading}
          </h3>
          <div className={styles.countsGrid}>
            <div className={styles.countCard}>
              <span className={styles.countLabel}>
                {companiesDetailCopy.activeProjects}
              </span>
              <span className={styles.countValue}>
                {view.activeProjectsCount}
              </span>
            </div>
            <div className={styles.countCard}>
              <span className={styles.countLabel}>
                {companiesDetailCopy.completedProjects}
              </span>
              <span className={styles.countValue}>
                {view.completedProjectsCount}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
