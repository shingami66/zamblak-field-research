import type { ReactNode } from "react";
import Link from "next/link";
import { requireAppSession } from "@/lib/auth/session";
import { COMPANY_LIST_MAX_LIMIT } from "@/lib/companies/input";
import { listCompanies } from "@/lib/companies/rpc";
import { projectsListCopy } from "@/lib/projects/list-copy";
import {
  PROJECTS_LIST_PAGE_SIZE,
  buildProjectsListHref,
  deriveProjectsListPagination,
  parseProjectsListSearchParams,
} from "@/lib/projects/list-params";
import {
  projectsListErrorMessage,
  toProjectListItemViews,
} from "@/lib/projects/list-view-model";
import { listProjects } from "@/lib/projects/rpc";
import type { ProjectStatus } from "@/lib/projects/types";
import { ProjectLtrToken } from "@/components/projects/ProjectLtrToken";
import { createClient } from "@/lib/supabase/server";
import styles from "./projects-list.module.css";

type ProjectsPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    company?: string | string[];
    status?: string | string[];
    page?: string | string[];
  }>;
};

type CompanyFilterOption = {
  companyId: string;
  name: string;
};

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "draft", label: projectsListCopy.statusDraft },
  { value: "active", label: projectsListCopy.statusActive },
  { value: "closed", label: projectsListCopy.statusClosed },
  { value: "cancelled", label: projectsListCopy.statusCancelled },
];

export default async function ProjectsPage({
  searchParams,
}: ProjectsPageProps) {
  await requireAppSession();
  const rawParams = await searchParams;

  const parsed = parseProjectsListSearchParams(rawParams);
  if (!parsed.ok) {
    return (
      <ProjectsListShell>
        <ErrorPanel message={projectsListErrorMessage(parsed.code)} />
      </ProjectsListShell>
    );
  }

  const { page, search, companyId, status, params } = parsed.data;
  const supabase = await createClient();

  const [listResult, companiesResult] = await Promise.all([
    listProjects(supabase, params),
    listCompanies(supabase, {
      search: null,
      limit: COMPANY_LIST_MAX_LIMIT,
      offset: 0,
    }),
  ]);

  const companyOptions: CompanyFilterOption[] = companiesResult.ok
    ? companiesResult.data.companies.map((c) => ({
        companyId: c.companyId,
        name: c.name,
      }))
    : [];
  const companiesFilterFailed = !companiesResult.ok;

  if (!listResult.ok) {
    return (
      <ProjectsListShell
        search={search}
        companyId={companyId}
        status={status}
        companyOptions={companyOptions}
        companiesFilterFailed={companiesFilterFailed}
      >
        <ErrorPanel message={projectsListErrorMessage(listResult.code)} />
      </ProjectsListShell>
    );
  }

  const projects = listResult.data.projects;
  const items = toProjectListItemViews(projects);
  const pagination = deriveProjectsListPagination({
    page,
    pageSize: PROJECTS_LIST_PAGE_SIZE,
    returnedCount: projects.length,
    search,
    companyId,
    status,
  });

  const hasFilters = Boolean(search || companyId || status);

  return (
    <ProjectsListShell
      search={search}
      companyId={companyId}
      status={status}
      companyOptions={companyOptions}
      companiesFilterFailed={companiesFilterFailed}
    >
      {items.length === 0 ? (
        <EmptyPanel hasFilters={hasFilters} />
      ) : (
        <>
          <section
            className={styles.listSection}
            aria-labelledby="projects-list-heading"
          >
            <h2 id="projects-list-heading" className={styles.visuallyHidden}>
              {projectsListCopy.resultsHeading}
            </h2>
            {items.map((item) => (
              <article key={item.projectId} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleRow}>
                    <Link href={item.detailHref} className={styles.cardLink}>
                      {item.projectName}
                    </Link>
                    <span
                      className={`${styles.statusBadge} ${statusBadgeClass(item.status)}`}
                    >
                      {item.statusLabel}
                    </span>
                  </div>
                  <div className={styles.cardActions}>
                    <Link href={item.detailHref} className={styles.textLink}>
                      {projectsListCopy.view}
                    </Link>
                    <Link href={item.editHref} className={styles.textLink}>
                      {projectsListCopy.edit}
                    </Link>
                  </div>
                </div>
                <dl className={styles.metaGrid}>
                  <div className={styles.metaItem}>
                    <dt className={styles.metaLabel}>
                      {projectsListCopy.companyName}
                    </dt>
                    <dd className={styles.metaValue}>{item.companyName}</dd>
                  </div>
                  <div className={styles.metaItem}>
                    <dt className={styles.metaLabel}>
                      {projectsListCopy.domain}
                    </dt>
                    <dd className={styles.metaValue}>{item.domainLabel}</dd>
                  </div>
                  <div className={styles.metaItem}>
                    <dt className={styles.metaLabel}>
                      {projectsListCopy.startDate}
                    </dt>
                    <dd className={styles.metaValue}>
                      <ProjectLtrToken className={styles.dateLtr}>
                        {item.startDateLabel}
                      </ProjectLtrToken>
                    </dd>
                  </div>
                  <div className={styles.metaItem}>
                    <dt className={styles.metaLabel}>
                      {projectsListCopy.endDate}
                    </dt>
                    <dd className={styles.metaValue}>
                      <ProjectLtrToken className={styles.dateLtr}>
                        {item.endDateLabel}
                      </ProjectLtrToken>
                    </dd>
                  </div>
                  <div className={styles.metaItem}>
                    <dt className={styles.metaLabel}>
                      {projectsListCopy.quota}
                    </dt>
                    <dd className={styles.metaValue}>{item.quotaLabel}</dd>
                  </div>
                  <div className={styles.metaItem}>
                    <dt className={styles.metaLabel}>
                      {projectsListCopy.updatedAt}
                    </dt>
                    <dd className={styles.metaValue}>
                      <ProjectLtrToken className={styles.dateLtr}>
                        {item.updatedAtLabel}
                      </ProjectLtrToken>
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </section>

          {(pagination.hasPrevious || pagination.hasNext) && (
            <nav
              className={styles.pagination}
              aria-label={projectsListCopy.paginationNav}
            >
              {pagination.previousHref ? (
                <Link
                  href={pagination.previousHref}
                  className={styles.pageLink}
                  rel="prev"
                >
                  {projectsListCopy.previous}
                </Link>
              ) : (
                <span className={styles.pageLinkDisabled} aria-hidden="true">
                  {projectsListCopy.previous}
                </span>
              )}
              {pagination.nextHref ? (
                <Link
                  href={pagination.nextHref}
                  className={styles.pageLink}
                  rel="next"
                >
                  {projectsListCopy.next}
                </Link>
              ) : (
                <span className={styles.pageLinkDisabled} aria-hidden="true">
                  {projectsListCopy.next}
                </span>
              )}
            </nav>
          )}
        </>
      )}
    </ProjectsListShell>
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

function ProjectsListShell({
  children,
  search = null,
  companyId = null,
  status = null,
  companyOptions = [],
  companiesFilterFailed = false,
}: {
  children: ReactNode;
  search?: string | null;
  companyId?: string | null;
  status?: ProjectStatus | null;
  companyOptions?: CompanyFilterOption[];
  companiesFilterFailed?: boolean;
}) {
  const hasFilters = Boolean(search || companyId || status);

  return (
    <div className={styles.page}>
      <header className={styles.pageIntro}>
        <div>
          <h1 className={styles.pageTitle}>{projectsListCopy.pageTitle}</h1>
          <p className={styles.pageDescription}>
            {projectsListCopy.pageDescription}
          </p>
        </div>
        <Link href="/projects/new" className={styles.primaryAction}>
          {projectsListCopy.addProject}
        </Link>
      </header>

      <div className={styles.toolbar}>
        <form className={styles.filterForm} method="get" action="/projects">
          <div className={styles.searchField}>
            <label className={styles.searchLabel} htmlFor="project-search">
              {projectsListCopy.searchLabel}
            </label>
            <input
              id="project-search"
              className={styles.searchInput}
              type="search"
              name="q"
              defaultValue={search ?? ""}
              maxLength={120}
              placeholder={projectsListCopy.searchPlaceholder}
              autoComplete="off"
            />
          </div>

          <div className={styles.searchField}>
            <label className={styles.searchLabel} htmlFor="project-company">
              {projectsListCopy.companyFilterLabel}
            </label>
            <select
              id="project-company"
              className={styles.selectInput}
              name="company"
              defaultValue={companyId ?? ""}
            >
              <option value="">{projectsListCopy.companyFilterAll}</option>
              {companyOptions.map((option) => (
                <option key={option.companyId} value={option.companyId}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.searchField}>
            <label className={styles.searchLabel} htmlFor="project-status">
              {projectsListCopy.statusFilterLabel}
            </label>
            <select
              id="project-status"
              className={styles.selectInput}
              name="status"
              defaultValue={status ?? ""}
            >
              <option value="">{projectsListCopy.statusFilterAll}</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className={styles.searchSubmit}>
            {projectsListCopy.searchAction}
          </button>
        </form>

        {hasFilters ? (
          <Link
            href={buildProjectsListHref({})}
            className={styles.secondaryAction}
          >
            {projectsListCopy.resetFilters}
          </Link>
        ) : null}
      </div>

      {companiesFilterFailed ? (
        <p className={styles.filterWarning} role="status">
          {projectsListCopy.companiesFilterUnavailable}
        </p>
      ) : null}

      {children}
    </div>
  );
}

function EmptyPanel({ hasFilters }: { hasFilters: boolean }) {
  if (hasFilters) {
    return (
      <div className={styles.emptyState} role="status">
        <h2 className={styles.emptyTitle}>{projectsListCopy.noFilterResults}</h2>
        <p className={styles.emptyHint}>{projectsListCopy.noFilterResultsHint}</p>
        <Link
          href={buildProjectsListHref({})}
          className={styles.secondaryAction}
        >
          {projectsListCopy.resetFilters}
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.emptyState} role="status">
      <h2 className={styles.emptyTitle}>{projectsListCopy.noProjects}</h2>
      <p className={styles.emptyHint}>{projectsListCopy.noProjectsHint}</p>
      <Link href="/projects/new" className={styles.primaryAction}>
        {projectsListCopy.addProject}
      </Link>
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className={styles.errorState} role="alert">
      <h2 className={styles.errorTitle}>{message}</h2>
      <Link href="/projects" className={styles.secondaryAction}>
        {projectsListCopy.resetFilters}
      </Link>
    </div>
  );
}
