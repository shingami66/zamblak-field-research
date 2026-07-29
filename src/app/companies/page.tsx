import type { ReactNode } from "react";
import Link from "next/link";
import { requireAppSession } from "@/lib/auth/session";
import { companiesListCopy } from "@/lib/companies/list-copy";
import {
  COMPANIES_LIST_PAGE_SIZE,
  deriveListPagination,
  parseCompaniesListSearchParams,
} from "@/lib/companies/list-params";
import {
  companiesListErrorMessage,
  toCompanyListItemViews,
} from "@/lib/companies/list-view-model";
import { listCompanies } from "@/lib/companies/rpc";
import { createClient } from "@/lib/supabase/server";
import { DataTable } from "@/components/shared/DataTable";
import { MobileListCard } from "@/components/shared/MobileListCard";
import { Pagination } from "@/components/shared/Pagination";
import { SuccessNotice } from "@/components/shared/SuccessNotice";
import { getSuccessNotice } from "@/lib/ui/success-notice";
import { CompaniesFilterToolbar } from "@/components/companies/CompaniesFilterToolbar";
import styles from "./companies-list.module.css";

function Building2(props: React.SVGProps<SVGSVGElement>) {
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

function Eye(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
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

type CompaniesPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    page?: string | string[];
    success?: string | string[];
  }>;
};

export default async function CompaniesPage({
  searchParams,
}: CompaniesPageProps) {
  await requireAppSession();
  const rawParams = await searchParams;
  const successNotice = getSuccessNotice(rawParams.success);

  const parsed = parseCompaniesListSearchParams(rawParams);
  if (!parsed.ok) {
    return (
      <CompaniesListShell>
        <ErrorPanel message={companiesListErrorMessage(parsed.code)} />
      </CompaniesListShell>
    );
  }

  const { page, search, params } = parsed.data;
  const supabase = await createClient();
  const listResult = await listCompanies(supabase, params);

  if (!listResult.ok) {
    return (
      <CompaniesListShell search={search}>
        <ErrorPanel message={companiesListErrorMessage(listResult.code)} />
      </CompaniesListShell>
    );
  }

  const rows = listResult.data.companies;
  const pagination = deriveListPagination({
    page,
    pageSize: COMPANIES_LIST_PAGE_SIZE,
    returnedCount: rows.length,
    search,
  });
  const items = toCompanyListItemViews(rows.slice(0, COMPANIES_LIST_PAGE_SIZE));

  const hasSearch = Boolean(search);

  return (
    <CompaniesListShell search={search} successNotice={successNotice}>
      {items.length === 0 ? (
        <EmptyPanel hasSearch={hasSearch} search={search} />
      ) : (
        <>
          <div className={styles.desktopView}>
            <DataTable
              data={items}
              keyExtractor={(item) => item.companyId}
              columns={[
                {
                  key: "name",
                  header: "الشركة",
                  render: (item) => <Link href={item.detailHref} className={styles.cardLink}>{item.name}</Link>,
                },
                {
                  key: "contact",
                  header: companiesListCopy.contactPerson,
                  render: (item) => item.contactPersonLabel,
                },
                {
                  key: "phone",
                  header: companiesListCopy.phone,
                  render: (item) => (
                    item.phoneIsLtr ? (
                      <span dir="ltr" className={styles.phoneLtr}>{item.phoneLabel}</span>
                    ) : (
                      item.phoneLabel
                    )
                  ),
                },
                {
                  key: "activeProjects",
                  header: companiesListCopy.activeProjects,
                  render: (item) => item.activeProjectsCount,
                },
                {
                  key: "actions",
                  header: "إجراءات",
                  render: (item) => (
                    <div className={styles.tableActions}>
                      <Link
                        href={item.detailHref}
                        className={styles.iconActionButton}
                        aria-label="عرض الشركة"
                        title="عرض الشركة"
                      >
                        <Eye className={styles.actionIcon} aria-hidden="true" />
                      </Link>
                      <Link
                        href={item.editHref}
                        className={styles.iconActionButton}
                        aria-label="تعديل الشركة"
                        title="تعديل الشركة"
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
                key={item.companyId}
                title={<Link href={item.detailHref} className={styles.cardLink}>{item.name}</Link>}
                details={[
                  { label: companiesListCopy.contactPerson, value: item.contactPersonLabel },
                  { label: companiesListCopy.phone, value: item.phoneIsLtr ? <span dir="ltr" className={styles.phoneLtr}>{item.phoneLabel}</span> : item.phoneLabel },
                  { label: companiesListCopy.activeProjects, value: item.activeProjectsCount },
                  { label: companiesListCopy.completedProjects, value: item.completedProjectsCount },
                ]}
                actions={
                  <div className={styles.cardActions}>
                    <Link
                      href={item.detailHref}
                      className={styles.mobileActionButton}
                      aria-label="عرض الشركة"
                      title="عرض الشركة"
                    >
                      <Eye className={styles.actionIcon} aria-hidden="true" />
                      <span>{companiesListCopy.view}</span>
                    </Link>
                    <Link
                      href={item.editHref}
                      className={styles.mobileActionButton}
                      aria-label="تعديل الشركة"
                      title="تعديل الشركة"
                    >
                      <PencilLine className={styles.actionIcon} aria-hidden="true" />
                      <span>{companiesListCopy.edit}</span>
                    </Link>
                  </div>
                }
              />
            ))}
          </div>

          <Pagination
            currentPage={page}
            visibleCount={items.length}
            pageSize={COMPANIES_LIST_PAGE_SIZE}
            previousHref={pagination.previousHref}
            nextHref={pagination.nextHref}
            previousLabel={companiesListCopy.previous}
            nextLabel={companiesListCopy.next}
          />
        </>
      )}
    </CompaniesListShell>
  );
}

function CompaniesListShell({
  children,
  search = null,
  successNotice = null,
}: {
  children: ReactNode;
  search?: string | null;
  successNotice?: string | null;
}) {
  return (
    <div className={styles.page}>
      <header className={styles.pageIntro}>
        <div>
          <h1 className={styles.pageTitle}>{companiesListCopy.pageTitle}</h1>
          <p className={styles.pageDescription}>
            {companiesListCopy.pageDescription}
          </p>
        </div>
        <div className={styles.headerActionRow}>
          <Link href="/companies/new" className={styles.primaryAction}>
            <Building2 className={styles.actionIcon} aria-hidden="true" />
            <span>شركة جديدة</span>
          </Link>
        </div>
      </header>
      <SuccessNotice message={successNotice} />

      <CompaniesFilterToolbar
        name="q"
        initialSearch={search}
        copy={{
          searchLabel: companiesListCopy.searchLabel,
          searchPlaceholder: companiesListCopy.searchPlaceholder,
          searchAction: companiesListCopy.searchAction,
        }}
      />

      {children}
    </div>
  );
}

function EmptyPanel({
  hasSearch,
  search,
}: {
  hasSearch: boolean;
  search: string | null;
}) {
  if (hasSearch) {
    return (
      <div className={styles.emptyState} role="status">
        <h2 className={styles.emptyTitle}>{companiesListCopy.noSearchResults}</h2>
        <p className={styles.emptyHint}>غيّر كلمة البحث أو امسحها لعرض كل الشركات.</p>
        {search ? (
          <p className={styles.visuallyHidden}>البحث الحالي: {search}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={styles.emptyState} role="status">
      <h2 className={styles.emptyTitle}>{companiesListCopy.noCompanies}</h2>
      <p className={styles.emptyHint}>{companiesListCopy.noCompaniesHint}</p>
      <Link href="/companies/new" className={styles.primaryAction}>
        <Building2 className={styles.actionIcon} aria-hidden="true" />
        <span>شركة جديدة</span>
      </Link>
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className={styles.errorState} role="alert">
      <h2 className={styles.errorTitle}>{message}</h2>
    </div>
  );
}
