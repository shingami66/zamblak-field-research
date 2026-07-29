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
import { SuccessNotice } from "@/components/shared/SuccessNotice";
import { BackLink } from "@/components/shared/BackLink";
import { getSuccessNotice } from "@/lib/ui/success-notice";
import styles from "./company-detail.module.css";

function Building2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 0 2 2h-4" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </svg>
  );
}

function PencilLine(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 20h9" />
      <path d="M16.376 3.622a1 1 0 0 1 1.414 0l2.588 2.588a1 1 0 0 1 0 1.414L8.5 19.5 3 21l1.5-5.5Z" />
      <path d="m15 5 3 3" />
    </svg>
  );
}

type CompanyDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string | string[] }>;
};

export default async function CompanyDetailPage({
  params,
  searchParams,
}: CompanyDetailPageProps) {
  await requireAppSession();
  const { id: rawId } = await params;
  const successNotice = getSuccessNotice((await searchParams).success);

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
        <BackLink href="/companies" className={styles.backLink}>{companiesDetailCopy.backToList}</BackLink>
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
      <BackLink href={view.backHref} className={styles.backLink}>{companiesDetailCopy.backToList}</BackLink>
      <SuccessNotice message={successNotice} />

      <header className={styles.headerRow}>
        <div className={styles.headerMain}>
          <Building2 className={styles.identityIcon} aria-hidden="true" />
          <h1 className={styles.pageTitle}>{view.name}</h1>
        </div>
        <div className={styles.headerActions}>
          <Link href={view.editHref} className={styles.editAction}>
            <PencilLine className={styles.actionIcon} aria-hidden="true" />
            <span>{companiesDetailCopy.editCompany}</span>
          </Link>
        </div>
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
