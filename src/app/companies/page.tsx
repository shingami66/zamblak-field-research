import type { ReactNode } from "react";
import Link from "next/link";
import { requireAppSession } from "@/lib/auth/session";
import { companiesListCopy } from "@/lib/companies/list-copy";
import {
  COMPANIES_LIST_PAGE_SIZE,
  buildCompaniesListHref,
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
import styles from "./companies-list.module.css";

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
                    <div className={styles.cardActions}>
                      <Link href={item.detailHref} className={styles.textLink}>{companiesListCopy.view}</Link>
                      <Link href={item.editHref} className={styles.textLink}>{companiesListCopy.edit}</Link>
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
                    <Link href={item.detailHref} className={styles.textLink}>{companiesListCopy.view}</Link>
                    <Link href={item.editHref} className={styles.textLink}>{companiesListCopy.edit}</Link>
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
        <Link href="/companies/new" className={styles.primaryAction}>
          {companiesListCopy.addCompany}
        </Link>
      </header>
      <SuccessNotice message={successNotice} />

      <div className={styles.toolbar}>
        <form className={styles.searchForm} method="get" action="/companies">
          <div className={styles.searchField}>
            <label className={styles.searchLabel} htmlFor="company-search">
              {companiesListCopy.searchLabel}
            </label>
            <input
              id="company-search"
              className={styles.searchInput}
              type="search"
              name="q"
              defaultValue={search ?? ""}
              maxLength={120}
              placeholder={companiesListCopy.searchPlaceholder}
              autoComplete="off"
            />
          </div>
          <button type="submit" className={styles.searchSubmit}>
            {companiesListCopy.searchAction}
          </button>
        </form>
        {search ? (
          <Link href={buildCompaniesListHref({})} className={styles.secondaryAction}>
            {companiesListCopy.resetSearch}
          </Link>
        ) : null}
      </div>

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
        <p className={styles.emptyHint}>{companiesListCopy.noSearchResultsHint}</p>
        <Link
          href={buildCompaniesListHref({})}
          className={styles.secondaryAction}
        >
          {companiesListCopy.resetSearch}
        </Link>
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
        {companiesListCopy.addCompany}
      </Link>
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className={styles.errorState} role="alert">
      <h2 className={styles.errorTitle}>{message}</h2>
      <Link href="/companies" className={styles.secondaryAction}>
        {companiesListCopy.resetSearch}
      </Link>
    </div>
  );
}
