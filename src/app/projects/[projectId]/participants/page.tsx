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
import { listResearchForms } from "@/lib/forms/queries";
import styles from "./participants.module.css";

export const metadata = {
  title: "المشاركون في المشروع | زمبلك",
};

function FilePlus2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M3 15h6" />
      <path d="M6 12v6" />
    </svg>
  );
}

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

  const formsResult = await listResearchForms(supabase, { projectId, pageSize: 100 });
  const existingFormIdMap = new Map<string, string>();
  if (formsResult.ok) {
    for (const f of formsResult.data.items) {
      existingFormIdMap.set(f.participation_id, f.id);
    }
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
                  {
                    key: "formAction",
                    header: "الاستمارة",
                    render: (item) => {
                      const existingFormId = existingFormIdMap.get(item.participationId);
                      if (existingFormId) {
                        return (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <span style={{ fontSize: "0.85rem", color: "var(--color-success, #166534)", fontWeight: 600 }}>
                              تم تسجيل الاستمارة
                            </span>
                            <Link href={`/forms/${existingFormId}`} className={styles.pageLink} style={{ fontSize: "0.85rem" }}>
                              عرض الاستمارة
                            </Link>
                          </div>
                        );
                      }
                      return (
                        <Link
                          href={`/forms/new?project=${projectId}&participant=${item.participationId}`}
                          className={styles.secondaryAction}
                          style={{ minHeight: "2.25rem", paddingInline: "0.75rem", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "0.375rem" }}
                        >
                          <FilePlus2 style={{ width: "16px", height: "16px" }} aria-hidden="true" />
                          <span>تسجيل استمارة</span>
                        </Link>
                      );
                    },
                  },
                ]}
              />
            </div>

            <div className={styles.mobileView}>
              {participations.map((item) => {
                const existingFormId = existingFormIdMap.get(item.participationId);
                return (
                  <MobileListCard
                    key={item.participationId}
                    title={item.respondentName || participationCopy.noNameFallback}
                    details={[
                      { label: "رقم الجوال", value: <ProjectLtrToken>{item.respondentMobile}</ProjectLtrToken> },
                      { label: "العمر", value: item.respondentAge ?? "-" },
                      { label: "نوع الإقامة", value: item.respondentResidentType === "saudi" ? "سعودي" : item.respondentResidentType === "non_saudi" ? "مقيم" : "-" },
                      { label: "تاريخ التعيين", value: <ProjectLtrToken>{new Date(item.createdAt).toLocaleDateString("en-SA")}</ProjectLtrToken> },
                    ]}
                    actions={
                      existingFormId ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <span style={{ fontSize: "0.85rem", color: "var(--color-success, #166534)", fontWeight: 600 }}>
                            تم تسجيل الاستمارة
                          </span>
                          <Link href={`/forms/${existingFormId}`} className={styles.pageLink} style={{ fontSize: "0.85rem" }}>
                            عرض الاستمارة
                          </Link>
                        </div>
                      ) : (
                        <Link
                          href={`/forms/new?project=${projectId}&participant=${item.participationId}`}
                          className={styles.secondaryAction}
                          style={{ minHeight: "2.25rem", paddingInline: "0.75rem", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "0.375rem" }}
                        >
                          <FilePlus2 style={{ width: "16px", height: "16px" }} aria-hidden="true" />
                          <span>تسجيل استمارة</span>
                        </Link>
                      )
                    }
                  />
                );
              })}
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
