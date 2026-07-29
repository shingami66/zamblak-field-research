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
import { createClient } from "@/lib/supabase/server";
import { DataTable } from "@/components/shared/DataTable";
import { MobileListCard } from "@/components/shared/MobileListCard";
import { Pagination } from "@/components/shared/Pagination";
import { SuccessNotice } from "@/components/shared/SuccessNotice";
import { getSuccessNotice } from "@/lib/ui/success-notice";
import { RespondentsFilterToolbar } from "@/components/respondents/RespondentsFilterToolbar";
import styles from "./respondents-list.module.css";

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
      <line x1="19" x2="19" y1="8" y2="14" />
      <line x1="16" x2="22" y1="11" y2="11" />
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
                    <div className={styles.tableActions}>
                      <Link
                        href={item.detailHref}
                        className={styles.iconActionButton}
                        aria-label="عرض المشارك"
                        title="عرض المشارك"
                      >
                        <Eye className={styles.actionIcon} aria-hidden="true" />
                      </Link>
                      <Link
                        href={`/respondents/${item.respondentId}/edit`}
                        className={styles.iconActionButton}
                        aria-label="تعديل المشارك"
                        title="تعديل المشارك"
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
                    <Link
                      href={item.detailHref}
                      className={styles.mobileActionButton}
                      aria-label="عرض المشارك"
                      title="عرض المشارك"
                    >
                      <Eye className={styles.actionIcon} aria-hidden="true" />
                      <span>{respondentsListCopy.view}</span>
                    </Link>
                    <Link
                      href={`/respondents/${item.respondentId}/edit`}
                      className={styles.mobileActionButton}
                      aria-label="تعديل المشارك"
                      title="تعديل المشارك"
                    >
                      <PencilLine className={styles.actionIcon} aria-hidden="true" />
                      <span>تعديل</span>
                    </Link>
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
        <div className={styles.headerActionRow}>
          <Link href="/respondents/new" className={styles.primaryAction}>
            <UserPlus className={styles.actionIcon} aria-hidden="true" />
            <span>مشارك جديد</span>
          </Link>
        </div>
      </header>
      <SuccessNotice message={successNotice} />

      <RespondentsFilterToolbar
        name="q"
        initialSearch={search}
        copy={{
          searchLabel: respondentsListCopy.searchLabel,
          searchPlaceholder: respondentsListCopy.searchPlaceholder,
          searchAction: respondentsListCopy.searchAction,
        }}
      />

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
          غيّر كلمة البحث أو امسحها لعرض كل المشاركين.
        </p>
        {search ? (
          <p className={styles.visuallyHidden}>البحث الحالي: {search}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={styles.emptyState} role="status">
      <h2 className={styles.emptyTitle}>{respondentsListCopy.noRespondents}</h2>
      <p className={styles.emptyHint}>{respondentsListCopy.noRespondentsHint}</p>
      <Link href="/respondents/new" className={styles.primaryAction}>
        <UserPlus className={styles.actionIcon} aria-hidden="true" />
        <span>مشارك جديد</span>
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
