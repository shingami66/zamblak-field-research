import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectLifecycleActions } from "@/components/projects/ProjectLifecycleActions";
import { requireAppSession } from "@/lib/auth/session";
import { projectsDetailCopy } from "@/lib/projects/detail-copy";
import { parseProjectIdParam } from "@/lib/projects/detail-params";
import {
  projectsDetailErrorBehavior,
  toProjectDetailView,
} from "@/lib/projects/detail-view-model";
import { getProject } from "@/lib/projects/rpc";
import type { ProjectStatus } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";
import styles from "./project-detail.module.css";

type ProjectDetailPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const session = await requireAppSession();
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
        <Link href="/projects" className={styles.backLink}>
          ← {projectsDetailCopy.backToList}
        </Link>
        <div className={styles.errorState} role="alert">
          <h1 className={styles.errorTitle}>
            {behavior.message ?? projectsDetailCopy.errorUnexpected}
          </h1>
        </div>
      </div>
    );
  }

  const view = toProjectDetailView(result.data);
  const isOwner = session.profile.role === "owner";

  return (
    <div className={styles.page}>
      <Link href={view.backHref} className={styles.backLink}>
        ← {projectsDetailCopy.backToList}
      </Link>

      <header className={styles.headerRow}>
        <div className={styles.headerMain}>
          <h1 className={styles.pageTitle}>{view.projectName}</h1>
          <div className={styles.headerMeta}>
            <span className={styles.companyLine}>{view.companyName}</span>
            <span
              className={`${styles.statusBadge} ${statusBadgeClass(view.status)}`}
            >
              {view.statusLabel}
            </span>
            <span className={styles.domainChip}>{view.domainLabel}</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          {view.canEdit ? (
            <Link href={view.editHref} className={styles.editAction}>
              {projectsDetailCopy.editProject}
            </Link>
          ) : null}
        </div>
      </header>

      {view.isTerminal ? (
        <p className={styles.readOnlyNotice} role="status">
          {projectsDetailCopy.readOnlyNotice}
        </p>
      ) : null}

      {isOwner && view.lifecycleActions.length > 0 ? (
        <ProjectLifecycleActions
          projectId={view.projectId}
          expectedUpdatedAt={view.expectedUpdatedAt}
          actions={view.lifecycleActions}
        />
      ) : null}

      <section className={styles.surface} aria-labelledby="section-basic">
        <h2 id="section-basic" className={styles.sectionTitle}>
          {projectsDetailCopy.sectionBasic}
        </h2>
        <dl className={styles.metaList}>
          <div className={styles.metaItem}>
            <dt className={styles.metaLabel}>
              {projectsDetailCopy.companyName}
            </dt>
            <dd className={styles.metaValue}>{view.companyName}</dd>
          </div>
          <div className={styles.metaItem}>
            <dt className={styles.metaLabel}>{projectsDetailCopy.domain}</dt>
            <dd className={styles.metaValue}>{view.domainLabel}</dd>
          </div>
          <div className={styles.metaItem}>
            <dt className={styles.metaLabel}>{projectsDetailCopy.status}</dt>
            <dd className={styles.metaValue}>{view.statusLabel}</dd>
          </div>
        </dl>
      </section>

      <section className={styles.surface} aria-labelledby="section-schedule">
        <h2 id="section-schedule" className={styles.sectionTitle}>
          {projectsDetailCopy.sectionSchedule}
        </h2>
        <dl className={styles.metaList}>
          <div className={styles.metaItem}>
            <dt className={styles.metaLabel}>{projectsDetailCopy.startDate}</dt>
            <dd className={styles.metaValue}>
              <span dir="ltr" className={styles.dateLtr}>
                {view.startDateLabel}
              </span>
            </dd>
          </div>
          <div className={styles.metaItem}>
            <dt className={styles.metaLabel}>{projectsDetailCopy.endDate}</dt>
            <dd className={styles.metaValue}>
              <span dir="ltr" className={styles.dateLtr}>
                {view.endDateLabel}
              </span>
            </dd>
          </div>
          <div className={styles.metaItem}>
            <dt className={styles.metaLabel}>{projectsDetailCopy.quota}</dt>
            <dd className={styles.metaValue}>{view.quotaLabel}</dd>
          </div>
        </dl>
      </section>

      <section
        className={styles.surface}
        aria-labelledby="section-participants"
      >
        <h2 id="section-participants" className={styles.sectionTitle}>
          {projectsDetailCopy.sectionParticipants}
        </h2>
        <dl className={styles.metaList}>
          <div className={styles.metaItem}>
            <dt className={styles.metaLabel}>{projectsDetailCopy.ageRange}</dt>
            <dd className={styles.metaValue}>{view.ageRangeLabel}</dd>
          </div>
          <div className={styles.metaItem}>
            <dt className={styles.metaLabel}>
              {projectsDetailCopy.residentType}
            </dt>
            <dd className={styles.metaValue}>{view.residentLabel}</dd>
          </div>
          <div className={styles.metaItem}>
            <dt className={styles.metaLabel}>
              {projectsDetailCopy.threeMonthWarning}
            </dt>
            <dd className={styles.metaValue}>{view.threeMonthLabel}</dd>
          </div>
        </dl>
        <div className={styles.textBlock}>
          <h3 className={styles.subSectionTitle}>
            {projectsDetailCopy.eligibilityNotes}
          </h3>
          <p
            className={`${styles.notesText} ${
              view.eligibilityIsEmpty ? styles.notesEmpty : ""
            }`}
          >
            {view.eligibilityNotesLabel}
          </p>
        </div>
      </section>

      <section className={styles.surface} aria-labelledby="section-templates">
        <h2 id="section-templates" className={styles.sectionTitle}>
          {projectsDetailCopy.sectionTemplates}
        </h2>
        <div className={styles.textBlock}>
          <h3 className={styles.subSectionTitle}>
            {projectsDetailCopy.whatsappAr}
          </h3>
          <p
            className={`${styles.notesText} ${
              view.whatsappArIsEmpty ? styles.notesEmpty : ""
            }`}
          >
            {view.whatsappArLabel}
          </p>
        </div>
        <div className={styles.textBlock}>
          <h3 className={styles.subSectionTitle}>
            {projectsDetailCopy.whatsappEn}
          </h3>
          <p
            className={`${styles.notesText} ${
              view.whatsappEnIsEmpty ? styles.notesEmpty : ""
            }`}
          >
            {view.whatsappEnLabel}
          </p>
        </div>
      </section>

      <section className={styles.surface} aria-labelledby="section-notes">
        <h2 id="section-notes" className={styles.sectionTitle}>
          {projectsDetailCopy.sectionNotes}
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
          {projectsDetailCopy.sectionAudit}
        </h2>
        <dl className={styles.metaList}>
          <div className={styles.metaItem}>
            <dt className={styles.metaLabel}>{projectsDetailCopy.createdAt}</dt>
            <dd className={styles.metaValue}>
              <span className={styles.timestampValue}>
                {view.createdAtLabel}
              </span>
            </dd>
          </div>
          <div className={styles.metaItem}>
            <dt className={styles.metaLabel}>{projectsDetailCopy.updatedAt}</dt>
            <dd className={styles.metaValue}>
              <span className={styles.timestampValue}>
                {view.updatedAtLabel}
              </span>
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

function statusBadgeClass(status: ProjectStatus): string {
  switch (status) {
    case "draft":
      return styles.statusDraft;
    case "active":
      return styles.statusActive;
    case "closed":
      return styles.statusClosed;
    case "cancelled":
      return styles.statusCancelled;
    default:
      return "";
  }
}
