import type { ReactNode } from "react";
import Link from "next/link";
import { requireAppSession } from "@/lib/auth/session";
import { respondentsListCopy } from "@/lib/respondents/list-copy";
import {
  RESPONDENTS_LIST_PAGE_SIZE,
  buildRespondentsListHref,
  deriveRespondentsListPagination,
  parseRespondentsListSearchParams,
} from "@/lib/respondents/list-params";
import {
  respondentsListErrorMessage,
  toRespondentListItemViews,
} from "@/lib/respondents/list-view-model";
import { listRespondents } from "@/lib/respondents/rpc";
import { RESPONDENT_SEARCH_MAX_LENGTH } from "@/lib/respondents/input";
import { createClient } from "@/lib/supabase/server";
import styles from "./respondents-list.module.css";

type RespondentsPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    page?: string | string[];
  }>;
};

export default async function RespondentsPage({
  searchParams,
}: RespondentsPageProps) {
  await requireAppSession();
  const rawParams = await searchParams;

  const parsed = parseRespondentsListSearchParams(rawParams);
  if (!parsed.ok) {
    return (
      <RespondentsListShell>
        <ErrorPanel message={respondentsListErrorMessage(parsed.code)} />
      </RespondentsListShell>
    );
  }

  const { page, search, params } = parsed.data;
  const supabase = await createClient();
  const listResult = await listRespondents(supabase, params);

  if (!listResult.ok) {
    return (
      <RespondentsListShell search={search}>
        <ErrorPanel message={respondentsListErrorMessage(listResult.code)} />
      </RespondentsListShell>
    );
  }

  const rows = listResult.data.respondents;
  const pagination = deriveRespondentsListPagination({
    page,
    returnedCount: rows.length,
    search,
  });
  const visible = rows.slice(0, RESPONDENTS_LIST_PAGE_SIZE);
  const items = toRespondentListItemViews(visible);
  const hasSearch = Boolean(search);

  return (
    <RespondentsListShell search={search}>
      {items.length === 0 ? (
        <EmptyPanel hasSearch={hasSearch} page={page} search={search} />
      ) : (
        <>
          <section
            className={styles.listSection}
            aria-labelledby="respondents-list-heading"
          >
            <h2 id="respondents-list-heading" className={styles.visuallyHidden}>
              {respondentsListCopy.resultsHeading}
            </h2>
            {items.map((item) => (
              <article key={item.respondentId} className={styles.card}>
                <div className={styles.cardHeader}>
                  <Link href={item.detailHref} className={styles.cardLink}>
                    {item.nameLabel}
                  </Link>
                  <div className={styles.cardActions}>
                    <Link href={item.detailHref} className={styles.textLink}>
                      {respondentsListCopy.view}
                    </Link>
                  </div>
                </div>
                <dl className={styles.metaGrid}>
                  <div className={styles.metaItem}>
                    <dt className={styles.metaLabel}>
                      {respondentsListCopy.mobile}
                    </dt>
                    <dd className={styles.metaValue}>
                      <bdi dir="ltr" className={styles.ltrToken}>
                        {item.mobileLabel}
                      </bdi>
                    </dd>
                  </div>
                  <div className={styles.metaItem}>
                    <dt className={styles.metaLabel}>
                      {respondentsListCopy.age}
                    </dt>
                    <dd className={styles.metaValue}>{item.ageLabel}</dd>
                  </div>
                  <div className={styles.metaItem}>
                    <dt className={styles.metaLabel}>
                      {respondentsListCopy.nationality}
                    </dt>
                    <dd className={styles.metaValue}>
                      {item.nationalityLabel}
                    </dd>
                  </div>
                  <div className={styles.metaItem}>
                    <dt className={styles.metaLabel}>
                      {respondentsListCopy.residentType}
                    </dt>
                    <dd className={styles.metaValue}>
                      {item.residentTypeLabel}
                    </dd>
                  </div>
                  <div className={styles.metaItem}>
                    <dt className={styles.metaLabel}>
                      {respondentsListCopy.updatedAt}
                    </dt>
                    <dd className={styles.metaValue}>
                      <bdi dir="ltr" className={styles.ltrToken}>
                        {item.updatedAtLabel}
                      </bdi>
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </section>

          {(pagination.hasPrevious || pagination.hasNext) && (
            <nav
              className={styles.pagination}
              aria-label={respondentsListCopy.paginationNav}
            >
              {pagination.previousHref ? (
                <Link
                  href={pagination.previousHref}
                  className={styles.pageLink}
                  rel="prev"
                >
                  {respondentsListCopy.previous}
                </Link>
              ) : (
                <span className={styles.pageLinkDisabled} aria-disabled="true">
                  {respondentsListCopy.previous}
                </span>
              )}
              {pagination.nextHref ? (
                <Link
                  href={pagination.nextHref}
                  className={styles.pageLink}
                  rel="next"
                >
                  {respondentsListCopy.next}
                </Link>
              ) : (
                <span className={styles.pageLinkDisabled} aria-disabled="true">
                  {respondentsListCopy.next}
                </span>
              )}
            </nav>
          )}
        </>
      )}
    </RespondentsListShell>
  );
}

function RespondentsListShell({
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
          <h1 className={styles.pageTitle}>{respondentsListCopy.pageTitle}</h1>
          <p className={styles.pageDescription}>
            {respondentsListCopy.pageDescription}
          </p>
        </div>
        <Link href="/respondents/new" className={styles.primaryAction}>
          {respondentsListCopy.addRespondent}
        </Link>
      </header>

      <div className={styles.toolbar}>
        <form
          className={styles.searchForm}
          method="get"
          action="/respondents"
        >
          <div className={styles.searchField}>
            <label className={styles.searchLabel} htmlFor="respondent-search">
              {respondentsListCopy.searchLabel}
            </label>
            <input
              id="respondent-search"
              className={styles.searchInput}
              type="search"
              name="q"
              defaultValue={search ?? ""}
              maxLength={RESPONDENT_SEARCH_MAX_LENGTH}
              placeholder={respondentsListCopy.searchPlaceholder}
              autoComplete="off"
            />
          </div>
          <button type="submit" className={styles.searchSubmit}>
            {respondentsListCopy.searchAction}
          </button>
        </form>
        {search ? (
          <Link
            href={buildRespondentsListHref({})}
            className={styles.secondaryAction}
          >
            {respondentsListCopy.resetSearch}
          </Link>
        ) : null}
      </div>

      {children}
    </div>
  );
}

function EmptyPanel({
  hasSearch,
  page,
  search,
}: {
  hasSearch: boolean;
  page: number;
  search: string | null;
}) {
  if (hasSearch) {
    return (
      <div className={styles.emptyState} role="status">
        <h2 className={styles.emptyTitle}>
          {respondentsListCopy.noSearchResults}
        </h2>
        <p className={styles.emptyHint}>
          {respondentsListCopy.noSearchResultsHint}
        </p>
        <Link
          href={buildRespondentsListHref({})}
          className={styles.secondaryAction}
        >
          {respondentsListCopy.resetSearch}
        </Link>
      </div>
    );
  }

  if (page > 1) {
    return (
      <div className={styles.emptyState} role="status">
        <h2 className={styles.emptyTitle}>
          {respondentsListCopy.pageBeyondResults}
        </h2>
        <p className={styles.emptyHint}>
          {respondentsListCopy.pageBeyondResultsHint}
        </p>
        <nav
          className={styles.pagination}
          aria-label={respondentsListCopy.paginationNav}
        >
          <Link
            href={buildRespondentsListHref({ search, page: page - 1 })}
            className={styles.pageLink}
            rel="prev"
          >
            {respondentsListCopy.previous}
          </Link>
        </nav>
      </div>
    );
  }

  return (
    <div className={styles.emptyState} role="status">
      <h2 className={styles.emptyTitle}>{respondentsListCopy.noRespondents}</h2>
      <p className={styles.emptyHint}>{respondentsListCopy.noRespondentsHint}</p>
      <Link href="/respondents/new" className={styles.primaryAction}>
        {respondentsListCopy.addRespondent}
      </Link>
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className={styles.errorState} role="alert">
      <h2 className={styles.errorTitle}>{message}</h2>
      <Link href="/respondents" className={styles.secondaryAction}>
        {respondentsListCopy.resetSearch}
      </Link>
    </div>
  );
}
