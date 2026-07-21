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
  deriveRespondentsEmptyState,
  respondentsListErrorMessage,
  toRespondentListItemViews,
} from "@/lib/respondents/list-view-model";
import { listRespondents } from "@/lib/respondents/rpc";
import { RESPONDENT_SEARCH_MAX_LENGTH } from "@/lib/respondents/input";
import { createClient } from "@/lib/supabase/server";
import { DataTable } from "@/components/shared/DataTable";
import { MobileListCard } from "@/components/shared/MobileListCard";
import { Pagination } from "@/components/shared/Pagination";
import { SuccessNotice } from "@/components/shared/SuccessNotice";
import { getSuccessNotice } from "@/lib/ui/success-notice";
import styles from "./respondents-list.module.css";

type RespondentsPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    page?: string | string[];
    success?: string | string[];
  }>;
};

export default async function RespondentsPage({
  searchParams,
}: RespondentsPageProps) {
  await requireAppSession();
  const rawParams = await searchParams;
  const successNotice = getSuccessNotice(rawParams.success);

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
    <RespondentsListShell search={search} successNotice={successNotice}>
      {items.length === 0 ? (
        <EmptyPanel hasSearch={hasSearch} page={page} search={search} />
      ) : (
        <>
          <div className={styles.desktopView}>
            <DataTable
              data={items}
              keyExtractor={(item) => item.respondentId}
              columns={[
                {
                  key: "name",
                  header: "المشارك",
                  render: (item) => <Link href={item.detailHref} className={styles.cardLink}>{item.nameLabel}</Link>,
                },
                {
                  key: "mobile",
                  header: respondentsListCopy.mobile,
                  render: (item) => <bdi dir="ltr" className={styles.ltrToken}>{item.mobileLabel}</bdi>,
                },
                {
                  key: "age",
                  header: respondentsListCopy.age,
                  render: (item) => item.ageLabel,
                },
                {
                  key: "nationality",
                  header: respondentsListCopy.nationality,
                  render: (item) => item.nationalityLabel,
                },
                {
                  key: "actions",
                  header: "إجراءات",
                  render: (item) => (
                    <div className={styles.cardActions}>
                      <Link href={item.detailHref} className={styles.textLink}>{respondentsListCopy.view}</Link>
                    </div>
                  ),
                },
              ]}
            />
          </div>
          <div className={styles.mobileView}>
            {items.map((item) => (
              <MobileListCard
                key={item.respondentId}
                title={<Link href={item.detailHref} className={styles.cardLink}>{item.nameLabel}</Link>}
                details={[
                  { label: respondentsListCopy.mobile, value: <bdi dir="ltr" className={styles.ltrToken}>{item.mobileLabel}</bdi> },
                  { label: respondentsListCopy.age, value: item.ageLabel },
                  { label: respondentsListCopy.nationality, value: item.nationalityLabel },
                  { label: respondentsListCopy.residentType, value: item.residentTypeLabel },
                ]}
                actions={
                  <div className={styles.cardActions}>
                    <Link href={item.detailHref} className={styles.textLink}>{respondentsListCopy.view}</Link>
                  </div>
                }
              />
            ))}
          </div>

          <Pagination
            currentPage={page}
            visibleCount={pagination.visibleCount}
            pageSize={RESPONDENTS_LIST_PAGE_SIZE}
            previousHref={pagination.previousHref}
            nextHref={pagination.nextHref}
            previousLabel={respondentsListCopy.previous}
            nextLabel={respondentsListCopy.next}
          />
        </>
      )}
    </RespondentsListShell>
  );
}

function RespondentsListShell({
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
          <h1 className={styles.pageTitle}>{respondentsListCopy.pageTitle}</h1>
          <p className={styles.pageDescription}>
            {respondentsListCopy.pageDescription}
          </p>
        </div>
        <Link href="/respondents/new" className={styles.primaryAction}>
          {respondentsListCopy.addRespondent}
        </Link>
      </header>
      <SuccessNotice message={successNotice} />

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
  const emptyState = deriveRespondentsEmptyState({ page, hasSearch });

  if (emptyState === "page_beyond") {
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
            href={buildRespondentsListHref({
              search,
              page: page - 1,
            })}
            className={styles.pageLink}
            rel="prev"
          >
            {respondentsListCopy.previous}
          </Link>
        </nav>
      </div>
    );
  }

  if (emptyState === "filtered_empty") {
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
