import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectLifecycleActions } from "@/components/projects/ProjectLifecycleActions";
import { ProjectLtrToken } from "@/components/projects/ProjectLtrToken";
import { requireAppSession } from "@/lib/auth/session";
import { participationCopy } from "@/lib/participations/copy";
import { listProjectParticipations } from "@/lib/participations/rpc";
import { DataTable } from "@/components/shared/DataTable";
import { MobileListCard } from "@/components/shared/MobileListCard";
import { projectsDetailCopy } from "@/lib/projects/detail-copy";
import { parseProjectIdParam } from "@/lib/projects/detail-params";
import {
  projectsDetailErrorBehavior,
  toProjectDetailView,
} from "@/lib/projects/detail-view-model";
import { getProject } from "@/lib/projects/rpc";
import type { ProjectStatus } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";
import { SuccessNotice } from "@/components/shared/SuccessNotice";
import { BackLink } from "@/components/shared/BackLink";
import { getSuccessNotice } from "@/lib/ui/success-notice";
import styles from "./project-detail.module.css";

function UserPlus(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="16" y1="11" x2="22" y2="11" />
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

type ProjectDetailPageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ success?: string | string[] }>;
};

export default async function ProjectDetailPage({
  params,
  searchParams,
}: ProjectDetailPageProps) {
  const session = await requireAppSession();
  const { projectId: rawId } = await params;
  const successNotice = getSuccessNotice((await searchParams).success);

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
        <BackLink href="/projects" className={styles.backLink}>{projectsDetailCopy.backToList}</BackLink>
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
  const participations = await listProjectParticipations(supabase, {
    projectId: view.projectId,
    search: null,
    limit: 5,
    offset: 0,
  });

  return (
    <div className={styles.page}>
      <BackLink href={view.backHref} className={styles.backLink}>{projectsDetailCopy.backToList}</BackLink>
      <SuccessNotice message={successNotice} />

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
          {view.status === "active" ? (
            <Link
              href={`/projects/${view.projectId}/add-respondent`}
              className={styles.addRespondentAction}
            >
              <UserPlus className={styles.actionIcon} aria-hidden="true" />
              <span>{participationCopy.addRespondent}</span>
            </Link>
          ) : null}
          {view.canEdit ? (
            <Link href={view.editHref} className={styles.editAction}>
              <PencilLine className={styles.actionIcon} aria-hidden="true" />
              <span>{projectsDetailCopy.editProject}</span>
            </Link>
          ) : null}
        </div>
      </header>

      {view.isTerminal ? (
        <p className={styles.readOnlyNotice} role="status">
          {projectsDetailCopy.readOnlyNotice}
        </p>
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
              <ProjectLtrToken className={styles.dateLtr}>
                {view.startDateLabel}
              </ProjectLtrToken>
            </dd>
          </div>
          <div className={styles.metaItem}>
            <dt className={styles.metaLabel}>{projectsDetailCopy.endDate}</dt>
            <dd className={styles.metaValue}>
              <ProjectLtrToken className={styles.dateLtr}>
                {view.endDateLabel}
              </ProjectLtrToken>
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

      <section className={styles.surface} aria-labelledby="section-project-participations">
        <div className={styles.participationsHeader}>
          <h2 id="section-project-participations" className={styles.sectionTitle}>
            {participationCopy.participationList}
          </h2>
          {view.status !== "active" ? (
            <p className={styles.participationsNote}>{participationCopy.activeOnly}</p>
          ) : null}
        </div>
        {!participations.ok ? (
          <p className={styles.participationsError} role="alert">
            {participationCopy.listUnavailable}
          </p>
        ) : participations.data.length === 0 ? (
          <p className={styles.participationsNote}>{participationCopy.noParticipations}</p>
        ) : (
          <>
            <div className={styles.desktopView}>
              <DataTable
                data={participations.data}
                keyExtractor={(item) => item.participationId}
                columns={[
                  {
                    key: "name",
                    header: "المشارك",
                    render: (item) => <span className={styles.participationName}>{item.respondentName || participationCopy.noNameFallback}</span>,
                  },
                  {
                    key: "mobile",
                    header: "رقم الجوال",
                    render: (item) => <ProjectLtrToken className={styles.participationMobile}>{item.respondentMobile}</ProjectLtrToken>,
                  },
                ]}
              />
            </div>
            <div className={styles.mobileView}>
              {participations.data.map((item) => (
                <MobileListCard
                  key={item.participationId}
                  title={<span className={styles.participationName}>{item.respondentName || participationCopy.noNameFallback}</span>}
                  details={[
                    { label: "رقم الجوال", value: <ProjectLtrToken className={styles.participationMobile}>{item.respondentMobile}</ProjectLtrToken> },
                  ]}
                />
              ))}
            </div>
            <div className={styles.participationsFooter} style={{ marginTop: "1rem", textAlign: "center" }}>
              <Link href={`/projects/${view.projectId}/participants`} className={styles.secondaryAction} style={{ textDecoration: "none", color: "var(--color-primary)", fontWeight: "bold" }}>
                عرض جميع المشاركين
              </Link>
            </div>
          </>
        )}
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
              <ProjectLtrToken className={styles.timestampValue}>
                {view.createdAtLabel}
              </ProjectLtrToken>
            </dd>
          </div>
          <div className={styles.metaItem}>
            <dt className={styles.metaLabel}>{projectsDetailCopy.updatedAt}</dt>
            <dd className={styles.metaValue}>
              <ProjectLtrToken className={styles.timestampValue}>
                {view.updatedAtLabel}
              </ProjectLtrToken>
            </dd>
          </div>
        </dl>
      </section>

      {isOwner && view.lifecycleActions.length > 0 ? (
        <ProjectLifecycleActions
          projectId={view.projectId}
          expectedUpdatedAt={view.expectedUpdatedAt}
          projectName={view.projectName}
          actions={view.lifecycleActions}
        />
      ) : null}
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
