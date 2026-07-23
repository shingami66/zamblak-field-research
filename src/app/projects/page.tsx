import type { ReactNode } from "react";
import Link from "next/link";
import { requireAppSession } from "@/lib/auth/session";
import { COMPANY_LIST_MAX_LIMIT } from "@/lib/companies/input";
import { listCompanies } from "@/lib/companies/rpc";
import { projectsListCopy } from "@/lib/projects/list-copy";
import {
  PROJECTS_LIST_PAGE_SIZE,
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
import { ProjectsFilterToolbar } from "@/components/projects/ProjectsFilterToolbar";
import styles from "./projects-list.module.css";

function Eye(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function PencilLine(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M12 20h9" />
      <path d="M16.376 3.622a1 1 0 0 1 1.414 0l2.588 2.588a1 1 0 0 1 0 1.414L8.5 19.5 3 21l1.5-5.5Z" />
      <path d="m15 5 3 3" />
    </svg>
  );
}

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
                    <div className={styles.tableActions}>
                      <Link
                        href={item.detailHref}
                        className={styles.iconActionButton}
                        aria-label="عرض المشروع"
                        title="عرض المشروع"
                      >
                        <Eye className={styles.actionIcon} aria-hidden="true" />
                      </Link>
                      <Link
                        href={item.editHref}
                        className={styles.iconActionButton}
                        aria-label="تعديل المشروع"
                        title="تعديل المشروع"
                      >
                        <PencilLine className={styles.actionIcon} aria-hidden="true" />
                      </Link>
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
                    <Link
                      href={item.detailHref}
                      className={styles.mobileActionButton}
                      aria-label="عرض المشروع"
                      title="عرض المشروع"
                    >
                      <Eye className={styles.actionIcon} aria-hidden="true" />
                      <span>{projectsListCopy.view}</span>
                    </Link>
                    <Link
                      href={item.editHref}
                      className={styles.mobileActionButton}
                      aria-label="تعديل المشروع"
                      title="تعديل المشروع"
                    >
                      <PencilLine className={styles.actionIcon} aria-hidden="true" />
                      <span>{projectsListCopy.edit}</span>
                    </Link>
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


function FolderPlus2(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M12 10v6" />
      <path d="M9 13h6" />
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    </svg>
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
          <FolderPlus2 className={styles.actionIcon} aria-hidden="true" />
          <span>مشروع جديد</span>
        </Link>
      </header>
      <SuccessNotice message={successNotice} />

      {/* Filter parameters contract: name="q", name="company", name="status" */}
      <ProjectsFilterToolbar
        initialSearch={search}
        initialCompanyId={companyId}
        initialStatus={status}
        companyOptions={companyOptions}
        statusOptions={STATUS_OPTIONS}
        copy={{
          searchLabel: projectsListCopy.searchLabel,
          searchPlaceholder: projectsListCopy.searchPlaceholder,
          searchAction: projectsListCopy.searchAction,
          companyFilterLabel: projectsListCopy.companyFilterLabel,
          companyFilterAll: projectsListCopy.companyFilterAll,
          statusFilterLabel: projectsListCopy.statusFilterLabel,
          statusFilterAll: projectsListCopy.statusFilterAll,
        }}
      />

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
        <p className={styles.emptyHint}>
          غيّر كلمة البحث أو اختر كل الشركات أو كل الحالات.
        </p>
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
