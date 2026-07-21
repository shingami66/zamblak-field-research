import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAppSession } from "@/lib/auth/session";
import { respondentsDetailCopy } from "@/lib/respondents/detail-copy";
import { parseRespondentDetailParam } from "@/lib/respondents/detail-params";
import {
  respondentDetailErrorBehavior,
  toRespondentDetailView,
} from "@/lib/respondents/detail-view-model";
import { getRespondent } from "@/lib/respondents/rpc";
import { createClient } from "@/lib/supabase/server";
import { SuccessNotice } from "@/components/shared/SuccessNotice";
import { BackLink } from "@/components/shared/BackLink";
import { getSuccessNotice } from "@/lib/ui/success-notice";
import styles from "./respondent-detail.module.css";

type RespondentDetailPageProps = {
  params: Promise<{ respondentId: string }>;
  searchParams: Promise<{ success?: string | string[] }>;
};

export default async function RespondentDetailPage({
  params,
  searchParams,
}: RespondentDetailPageProps) {
  await requireAppSession();
  const { respondentId: rawId } = await params;
  const successNotice = getSuccessNotice((await searchParams).success);

  const parsed = parseRespondentDetailParam(rawId);
  if (!parsed.ok) {
    notFound();
  }

  const supabase = await createClient();
  const result = await getRespondent(supabase, parsed.respondentId);

  if (!result.ok) {
    const behavior = respondentDetailErrorBehavior(result.code);
    if (behavior.kind === "not_found") {
      notFound();
    }
    return (
      <div className={styles.page}>
        <BackLink href="/respondents" className={styles.backLink}>{respondentsDetailCopy.backToList}</BackLink>
        <div className={styles.errorState} role="alert">
          <h1 className={styles.errorTitle}>
            {behavior.message ?? respondentsDetailCopy.errorUnexpected}
          </h1>
          <Link href="/respondents" className={styles.secondaryAction}>
            {respondentsDetailCopy.backToList}
          </Link>
        </div>
      </div>
    );
  }

  const view = toRespondentDetailView(result.data);

  return (
    <div className={styles.page}>
      <BackLink href={view.backHref} className={styles.backLink}>{respondentsDetailCopy.backToList}</BackLink>
      <SuccessNotice message={successNotice} />

      <header className={styles.headerRow}>
        <h1 className={styles.pageTitle}>{view.nameLabel}</h1>
        <Link href={view.editHref} className={styles.editAction}>
          {respondentsDetailCopy.editRespondent}
        </Link>
      </header>

      <section className={styles.surface} aria-labelledby="section-basic">
        <h2 id="section-basic" className={styles.sectionTitle}>
          {respondentsDetailCopy.sectionBasic}
        </h2>
        <dl className={styles.metaList}>
          <div className={styles.metaItem}>
            <dt className={styles.metaLabel}>{respondentsDetailCopy.name}</dt>
            <dd className={styles.metaValue}>{view.nameLabel}</dd>
          </div>
          <div className={styles.metaItem}>
            <dt className={styles.metaLabel}>{respondentsDetailCopy.mobile}</dt>
            <dd className={styles.metaValue}>
              <bdi className={styles.mobileLtr}>{view.mobileLabel}</bdi>
            </dd>
          </div>
          <div className={styles.metaItem}>
            <dt className={styles.metaLabel}>{respondentsDetailCopy.age}</dt>
            <dd className={styles.metaValue}>
              <bdi className={styles.tokenLtr}>{view.ageLabel}</bdi>
            </dd>
          </div>
          <div className={styles.metaItem}>
            <dt className={styles.metaLabel}>
              {respondentsDetailCopy.nationality}
            </dt>
            <dd className={styles.metaValue}>{view.nationalityLabel}</dd>
          </div>
          <div className={styles.metaItem}>
            <dt className={styles.metaLabel}>
              {respondentsDetailCopy.residentType}
            </dt>
            <dd className={styles.metaValue}>{view.residentTypeLabel}</dd>
          </div>
        </dl>
      </section>

      <section className={styles.surface} aria-labelledby="section-notes">
        <h2 id="section-notes" className={styles.sectionTitle}>
          {respondentsDetailCopy.sectionNotes}
        </h2>
        <p
          className={`${styles.notesText} ${
            view.notesIsEmpty ? styles.notesEmpty : ""
          }`}
        >
          {view.notesLabel}
        </p>
      </section>

      <section className={styles.surface} aria-labelledby="section-audit">
        <h2 id="section-audit" className={styles.sectionTitle}>
          {respondentsDetailCopy.sectionAudit}
        </h2>
        <dl className={styles.metaList}>
          <div className={styles.metaItem}>
            <dt className={styles.metaLabel}>
              {respondentsDetailCopy.createdAt}
            </dt>
            <dd className={styles.metaValue}>
              <bdi className={styles.timestampValue}>{view.createdAtLabel}</bdi>
            </dd>
          </div>
          <div className={styles.metaItem}>
            <dt className={styles.metaLabel}>
              {respondentsDetailCopy.updatedAt}
            </dt>
            <dd className={styles.metaValue}>
              <bdi className={styles.timestampValue}>{view.updatedAtLabel}</bdi>
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
