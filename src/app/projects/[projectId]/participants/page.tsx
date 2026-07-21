import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAppSession } from "@/lib/auth/session";
import { parseProjectIdParam } from "@/lib/projects/detail-params";
import { projectsDetailErrorBehavior } from "@/lib/projects/detail-view-model";
import { getProject } from "@/lib/projects/rpc";
import { createClient } from "@/lib/supabase/server";
import { listProjectParticipations } from "@/lib/participations/rpc";
import { DataTable } from "@/components/shared/DataTable";
import { MobileListCard } from "@/components/shared/MobileListCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ProjectLtrToken } from "@/components/projects/ProjectLtrToken";
import { participationCopy } from "@/lib/participations/copy";
import { Pagination } from "@/components/shared/Pagination";
import styles from "./participants.module.css";

export const metadata = {
  title: "المشاركون في المشروع | زمبلك",
};

export default async function ProjectParticipantsPage(props: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  await requireAppSession();
  const supabase = await createClient();
  const { projectId: rawProjectId } = await props.params;
  const searchParams = await props.searchParams;
  const parsed = parseProjectIdParam(rawProjectId);
  if (!parsed.ok) {
    notFound();
  }
  const projectId = parsed.projectId;

  const projectResult = await getProject(supabase, projectId);
  if (!projectResult.ok) {
    const behavior = projectsDetailErrorBehavior(projectResult.code);
    if (behavior.kind === "not_found") {
      notFound();
    }
    return (
      <div className={styles.page}>
        <div className={styles.errorState} role="alert">
          <h1 className={styles.errorTitle}>
            {behavior.message ?? "تعذر تحميل المشروع الآن."}
          </h1>
          <Link href="/projects" className={styles.pageLink}>
            العودة إلى المشاريع
          </Link>
        </div>
      </div>
    );
  }
  const project = projectResult.data;

  const page = parseInt(searchParams.page || "1", 10);
  const limit = 25;
  const offset = (page > 0 ? page - 1 : 0) * limit;
  const search = searchParams.search || "";

  const listResult = await listProjectParticipations(supabase, {
    projectId,
    search: search || null,
    limit: limit + 1, // fetch one extra to know if there's a next page
    offset,
  });

  if (!listResult.ok) {
    return (
      <div className={styles.page}>
        <div className={styles.errorState}>
          <h2 className={styles.errorTitle}>خطأ في جلب المشاركين</h2>
          <p className={styles.emptyHint}>
            {participationCopy.errors[listResult.code] || "حدث خطأ غير متوقع."}
          </p>
          <Link href={`/projects/${projectId}`} className={styles.pageLink}>
            العودة للمشروع
          </Link>
        </div>
      </div>
    );
  }

  let participations = listResult.data;
  const hasNextPage = participations.length > limit;
  if (hasNextPage) {
    participations = participations.slice(0, limit);
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageIntro}>
        <div className={styles.titleBlock}>
          <h1 className={styles.pageTitle}>مشاركو {project.projectName}</h1>
          <p className={styles.pageDescription}>
            تصفح قائمة المشاركين المعينين في هذا المشروع.
          </p>
        </div>
        <Link href={`/projects/${projectId}`} className={styles.secondaryAction}>
          العودة للمشروع
        </Link>
      </header>

      <div className={styles.toolbar}>
        <form className={styles.searchForm}>
          <div className={styles.searchField}>
            <label htmlFor="search" className={styles.searchLabel}>
              البحث بالاسم أو رقم الجوال
            </label>
            <input
              type="search"
              id="search"
              name="search"
              defaultValue={search}
              placeholder="ابحث..."
              className={styles.searchInput}
            />
          </div>
          <button type="submit" className={styles.searchSubmit}>
            بحث
          </button>
        </form>
      </div>

      <section className={styles.listSection} aria-labelledby="participations-heading">
        <h2 id="participations-heading" className={styles.visuallyHidden}>
          قائمة المشاركين
        </h2>

        {participations.length === 0 ? (
          <div className={styles.emptyState}>
            <h3 className={styles.emptyTitle}>لا يوجد مشاركين</h3>
            <p className={styles.emptyHint}>
              لم يتم العثور على أي مشاركين مطابقين لبحثك في هذا المشروع.
            </p>
          </div>
        ) : (
          <>
            <div className={styles.desktopView}>
              <DataTable
                data={participations}
                keyExtractor={(item) => item.participationId}
                columns={[
                  {
                    key: "name",
                    header: "الاسم",
                    render: (item) => item.respondentName || participationCopy.noNameFallback,
                  },
                  {
                    key: "mobile",
                    header: "رقم الجوال",
                    render: (item) => <ProjectLtrToken>{item.respondentMobile}</ProjectLtrToken>,
                  },
                  {
                    key: "age",
                    header: "العمر",
                    render: (item) => item.respondentAge ?? "-",
                  },
                  {
                    key: "residentType",
                    header: "نوع الإقامة",
                    render: (item) => (item.respondentResidentType === "saudi" ? "سعودي" : item.respondentResidentType === "non_saudi" ? "مقيم" : "-"),
                  },
                  {
                    key: "contactStatus",
                    header: "حالة التواصل",
                    render: (item) => (
                      <StatusBadge variant={item.contactStatus === "new" ? "neutral" : "neutral"}>
                        {item.contactStatus === "new" ? "جديد" : item.contactStatus}
                      </StatusBadge>
                    ),
                  },
                  {
                    key: "createdAt",
                    header: "تاريخ التعيين",
                    render: (item) => (
                      <ProjectLtrToken>
                        {new Date(item.createdAt).toLocaleDateString("en-SA")}
                      </ProjectLtrToken>
                    ),
                  },
                ]}
              />
            </div>

            <div className={styles.mobileView}>
              {participations.map((item) => (
                <MobileListCard
                  key={item.participationId}
                  title={item.respondentName || participationCopy.noNameFallback}
                  details={[
                    { label: "رقم الجوال", value: <ProjectLtrToken>{item.respondentMobile}</ProjectLtrToken> },
                    { label: "العمر", value: item.respondentAge ?? "-" },
                    { label: "نوع الإقامة", value: item.respondentResidentType === "saudi" ? "سعودي" : item.respondentResidentType === "non_saudi" ? "مقيم" : "-" },
                    { label: "تاريخ التعيين", value: <ProjectLtrToken>{new Date(item.createdAt).toLocaleDateString("en-SA")}</ProjectLtrToken> },
                  ]}
                />
              ))}
            </div>

            <Pagination
              currentPage={page}
              visibleCount={participations.length}
              pageSize={limit}
              previousHref={page > 1 ? `/projects/${projectId}/participants?page=${page - 1}${search ? `&search=${encodeURIComponent(search)}` : ""}` : null}
              nextHref={hasNextPage ? `/projects/${projectId}/participants?page=${page + 1}${search ? `&search=${encodeURIComponent(search)}` : ""}` : null}
            />
          </>
        )}
      </section>
    </div>
  );
}
