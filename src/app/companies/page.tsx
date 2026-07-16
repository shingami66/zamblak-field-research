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
import styles from "./companies-list.module.css";

type CompaniesPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    page?: string | string[];
  }>;
};

export default async function CompaniesPage({
  searchParams,
}: CompaniesPageProps) {
  await requireAppSession();
  const rawParams = await searchParams;

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

  const companies = listResult.data.companies;
  const items = toCompanyListItemViews(companies);
  const pagination = deriveListPagination({
    page,
    pageSize: COMPANIES_LIST_PAGE_SIZE,
    returnedCount: companies.length,
    search,
  });

  const hasSearch = Boolean(search);

  return (
    <CompaniesListShell search={search}>
      {items.length === 0 ? (
        <EmptyPanel hasSearch={hasSearch} search={search} />
      ) : (
        <>
          <section
            className={styles.listSection}
            aria-labelledby="companies-list-heading"
          >
            <h2 id="companies-list-heading" className={styles.visuallyHidden}>
              {companiesListCopy.resultsHeading}
            </h2>
            {items.map((item) => (
              <article key={item.companyId} className={styles.card}>
                <div className={styles.cardHeader}>
                  <Link href={item.detailHref} className={styles.cardLink}>
                    {item.name}
                  </Link>
                  <div className={styles.cardActions}>
                    <Link href={item.detailHref} className={styles.textLink}>
                      {companiesListCopy.view}
                    </Link>
                    <Link href={item.editHref} className={styles.textLink}>
                      {companiesListCopy.edit}
                    </Link>
                  </div>
                </div>
                <dl className={styles.metaGrid}>
                  <div className={styles.metaItem}>
                    <dt className={styles.metaLabel}>
                      {companiesListCopy.contactPerson}
                    </dt>
                    <dd className={styles.metaValue}>
                      {item.contactPersonLabel}
                    </dd>
                  </div>
                  <div className={styles.metaItem}>
                    <dt className={styles.metaLabel}>
                      {companiesListCopy.phone}
                    </dt>
                    <dd
                      className={`${styles.metaValue} ${
                        item.phoneIsLtr ? styles.phoneLtr : ""
                      }`}
                    >
                      {item.phoneLabel}
                    </dd>
                  </div>
                  <div className={styles.metaItem}>
                    <dt className={styles.metaLabel}>
                      {companiesListCopy.activeProjects}
                    </dt>
                    <dd className={styles.metaValue}>
                      {item.activeProjectsCount}
                    </dd>
                  </div>
                  <div className={styles.metaItem}>
                    <dt className={styles.metaLabel}>
                      {companiesListCopy.completedProjects}
                    </dt>
                    <dd className={styles.metaValue}>
                      {item.completedProjectsCount}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </section>

          {(pagination.hasPrevious || pagination.hasNext) && (
            <nav
              className={styles.pagination}
              aria-label={companiesListCopy.paginationNav}
            >
              {pagination.previousHref ? (
                <Link
                  href={pagination.previousHref}
                  className={styles.pageLink}
                  rel="prev"
                >
                  {companiesListCopy.previous}
                </Link>
              ) : (
                <span className={styles.pageLinkDisabled} aria-hidden="true">
                  {companiesListCopy.previous}
                </span>
              )}
              {pagination.nextHref ? (
                <Link
                  href={pagination.nextHref}
                  className={styles.pageLink}
                  rel="next"
                >
                  {companiesListCopy.next}
                </Link>
              ) : (
                <span className={styles.pageLinkDisabled} aria-hidden="true">
                  {companiesListCopy.next}
                </span>
              )}
            </nav>
          )}
        </>
      )}
    </CompaniesListShell>
  );
}

function CompaniesListShell({
  children,
  search = null,
}: {
  children: ReactNode;
  search?: string | null;
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
