import Link from "next/link";
import { notFound } from "next/navigation";
import { AssignRespondentForm } from "@/components/participations/AssignRespondentForm";
import { requireAppSession } from "@/lib/auth/session";
import { participationCopy } from "@/lib/participations/copy";
import { parseProjectIdParam } from "@/lib/projects/detail-params";
import { projectsDetailErrorBehavior } from "@/lib/projects/detail-view-model";
import { getProject } from "@/lib/projects/rpc";
import { listRespondents } from "@/lib/respondents/rpc";
import {
  RESPONDENTS_LIST_PAGE_SIZE,
  deriveRespondentsListPagination,
  parseRespondentsListSearchParams,
} from "@/lib/respondents/list-params";
import { RESPONDENT_SEARCH_MAX_LENGTH } from "@/lib/respondents/input";
import { createClient } from "@/lib/supabase/server";
import { Pagination } from "@/components/shared/Pagination";
import { BackLink } from "@/components/shared/BackLink";
import styles from "./add-respondent.module.css";

type AddRespondentPageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ q?: string | string[]; page?: string | string[] }>;
};

function buildAddRespondentHref(
  projectId: string,
  options: { search?: string | null; page?: number }
): string {
  const query = new URLSearchParams();
  const search = options.search?.trim() ?? "";
  if (search) query.set("q", search);
  if ((options.page ?? 1) > 1) query.set("page", String(options.page));
  const suffix = query.toString();
  return `/projects/${projectId}/add-respondent${suffix ? `?${suffix}` : ""}`;
}

export default async function AddRespondentPage({
  params,
  searchParams,
}: AddRespondentPageProps) {
  await requireAppSession();
  const { projectId: rawProjectId } = await params;
  const parsed = parseProjectIdParam(rawProjectId);
  if (!parsed.ok) notFound();

  const supabase = await createClient();
  const project = await getProject(supabase, parsed.projectId);
  if (!project.ok) {
    const behavior = projectsDetailErrorBehavior(project.code);
    if (behavior.kind === "not_found") {
      notFound();
    }
    return (
      <div className={styles.page} dir="rtl">
        <BackLink className={styles.backLink} href="/projects">{participationCopy.backToProject}</BackLink>
        <p className={styles.formError} role="alert">
          {behavior.message ?? participationCopy.errors.unexpected_participation_error}
        </p>
      </div>
    );
  }

  if (project.data.status !== "active") {
    return (
      <div className={styles.page} dir="rtl">
        <BackLink className={styles.backLink} href={"/projects/" + parsed.projectId}>{participationCopy.backToProject}</BackLink>
        <div className={styles.emptyState} role="status">
          {participationCopy.activeOnly}
        </div>
      </div>
    );
  }

  const respondentParams = parseRespondentsListSearchParams(await searchParams);
  if (!respondentParams.ok) {
    return (
      <div className={styles.page} dir="rtl">
        <BackLink className={styles.backLink} href={`/projects/${parsed.projectId}`}>{participationCopy.backToProject}</BackLink>
        <p className={styles.formError} role="alert">
          {participationCopy.errors.invalid_respondent_id}
        </p>
      </div>
    );
  }

  const respondents = await listRespondents(supabase, {
    ...respondentParams.data.params,
  });

  return (
    <div className={styles.page} dir="rtl">
      <BackLink className={styles.backLink} href={`/projects/${parsed.projectId}`}>{participationCopy.backToProject}</BackLink>
      <header className={styles.header}>
        <h1 className={styles.title}>{participationCopy.addRespondentTitle}</h1>
        <p className={styles.intro}>{participationCopy.addRespondentIntro}</p>
      </header>
      {respondents.ok ? (
        <>
          <div className={styles.toolbar}>
            <form className={styles.searchForm} method="get" action={`/projects/${parsed.projectId}/add-respondent`}>
              <label className={styles.searchLabel} htmlFor="respondent-search">
                {participationCopy.respondentSearchLabel}
              </label>
              <input
                id="respondent-search"
                className={styles.searchInput}
                type="search"
                name="q"
                defaultValue={respondentParams.data.search ?? ""}
                maxLength={RESPONDENT_SEARCH_MAX_LENGTH}
                placeholder={participationCopy.respondentSearchPlaceholder}
                autoComplete="off"
              />
              <button className={styles.searchSubmit} type="submit">
                {participationCopy.respondentSearchAction}
              </button>
            </form>
            {respondentParams.data.search ? (
              <Link
                className={styles.resetSearch}
                href={buildAddRespondentHref(parsed.projectId, {})}
              >
                {participationCopy.resetRespondentSearch}
              </Link>
            ) : null}
          </div>
          {respondents.data.respondents.length > 0 ? (
            <>
              <AssignRespondentForm
                projectId={parsed.projectId}
                respondents={respondents.data.respondents.slice(0, RESPONDENTS_LIST_PAGE_SIZE)}
              />
              {(() => {
                const pagination = deriveRespondentsListPagination({
                  page: respondentParams.data.page,
                  returnedCount: respondents.data.respondents.length,
                  search: respondentParams.data.search,
                });
                return (
                  <Pagination
                    currentPage={respondentParams.data.page}
                    visibleCount={pagination.visibleCount}
                    pageSize={RESPONDENTS_LIST_PAGE_SIZE}
                    previousHref={pagination.hasPrevious ? buildAddRespondentHref(parsed.projectId, { search: respondentParams.data.search, page: respondentParams.data.page - 1 }) : null}
                    nextHref={pagination.hasNext ? buildAddRespondentHref(parsed.projectId, { search: respondentParams.data.search, page: respondentParams.data.page + 1 }) : null}
                  />
                );
              })()}
            </>
          ) : (
            <p className={styles.emptyState} role="status">
              {respondentParams.data.search
                ? participationCopy.noRespondentSearchResults
                : participationCopy.noRespondents}
            </p>
          )}
        </>
      ) : (
        <p className={styles.formError} role="alert">
          {participationCopy.errors.unexpected_participation_error}
        </p>
      )}
    </div>
  );
}
