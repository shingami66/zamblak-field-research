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
import { createClient } from "@/lib/supabase/server";
import { DataTable } from "@/components/shared/DataTable";
import { MobileListCard } from "@/components/shared/MobileListCard";
import { Pagination } from "@/components/shared/Pagination";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ProjectLtrToken } from "@/components/projects/ProjectLtrToken";
import { SuccessNotice } from "@/components/shared/SuccessNotice";
import { getSuccessNotice } from "@/lib/ui/success-notice";
import styles from "./projects-list.module.css";

type ProjectsPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    company?: string | string[];
    status?: string | string[];
    page?: string | string[];
    success?: string | string[];
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
  const successNotice = getSuccessNotice(rawParams.success);

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

  const rows = listResult.data.projects;
  const pagination = deriveProjectsListPagination({
    page,
    pageSize: PROJECTS_LIST_PAGE_SIZE,
    returnedCount: rows.length,
    search,
    companyId,
    status,
  });
  const items = toProjectListItemViews(rows.slice(0, PROJECTS_LIST_PAGE_SIZE));

  const hasFilters = Boolean(search || companyId || status);

  return (
    <ProjectsListShell
      search={search}
      companyId={companyId}
      status={status}
      companyOptions={companyOptions}
      companiesFilterFailed={companiesFilterFailed}
      successNotice={successNotice}
    >
      {items.length === 0 ? (
        <EmptyPanel hasFilters={hasFilters} />
      ) : (
        <>
          <div className={styles.desktopView}>
            <DataTable
              data={items}
              keyExtractor={(item) => item.projectId}
              columns={[
                {
                  key: "name",
                  header: "المشروع",
                  render: (item) => <Link href={item.detailHref} className={styles.cardLink}>{item.projectName}</Link>,
                },
                {
                  key: "company",
                  header: projectsListCopy.companyName,
                  render: (item) => item.companyName,
                },
                {
                  key: "domain",
                  header: projectsListCopy.domain,
                  render: (item) => item.domainLabel,
                },
                {
                  key: "status",
                  header: projectsListCopy.status,
                  render: (item) => (
                    <StatusBadge variant={item.status === "active" ? "active" : item.status === "closed" ? "neutral" : "warning"}>
                      {item.statusLabel}
                    </StatusBadge>
                  ),
                },
                {
                  key: "actions",
                  header: "إجراءات",
                  render: (item) => (
                    <div className={styles.cardActions}>
                      <Link href={item.detailHref} className={styles.textLink}>{projectsListCopy.view}</Link>
                      <Link href={item.editHref} className={styles.textLink}>{projectsListCopy.edit}</Link>
                    </div>
                  ),
                },
              ]}
            />
          </div>
          <div className={styles.mobileView}>
            {items.map((item) => (
              <MobileListCard
                key={item.projectId}
                title={<Link href={item.detailHref} className={styles.cardLink}>{item.projectName}</Link>}
                badge={
                  <StatusBadge variant={item.status === "active" ? "active" : item.status === "closed" ? "neutral" : "warning"}>
                    {item.statusLabel}
                  </StatusBadge>
                }
                details={[
                  { label: projectsListCopy.companyName, value: item.companyName },
                  { label: projectsListCopy.domain, value: item.domainLabel },
                  { label: projectsListCopy.startDate, value: <ProjectLtrToken className={styles.dateLtr}>{item.startDateLabel}</ProjectLtrToken> },
                  { label: projectsListCopy.endDate, value: <ProjectLtrToken className={styles.dateLtr}>{item.endDateLabel}</ProjectLtrToken> },
                ]}
                actions={
                  <div className={styles.cardActions}>
                    <Link href={item.detailHref} className={styles.textLink}>{projectsListCopy.view}</Link>
                    <Link href={item.editHref} className={styles.textLink}>{projectsListCopy.edit}</Link>
                  </div>
                }
              />
            ))}
          </div>
          <Pagination
            currentPage={page}
            visibleCount={items.length}
            pageSize={PROJECTS_LIST_PAGE_SIZE}
            previousHref={pagination.previousHref}
            nextHref={pagination.nextHref}
            previousLabel={projectsListCopy.previous}
            nextLabel={projectsListCopy.next}
          />
        </>
      )}
    </ProjectsListShell>
  );
}


function ProjectsListShell({
  children,
  search = null,
  companyId = null,
  status = null,
  companyOptions = [],
  companiesFilterFailed = false,
  successNotice = null,
}: {
  children: ReactNode;
  search?: string | null;
  companyId?: string | null;
  status?: ProjectStatus | null;
  companyOptions?: CompanyFilterOption[];
  companiesFilterFailed?: boolean;
  successNotice?: string | null;
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
      <SuccessNotice message={successNotice} />

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
