import { createClient } from "@/lib/supabase/server";
import { requireOwnerSession } from "../route-state";
import { listProjects } from "@/lib/projects/rpc";
import { listProjectParticipations } from "@/lib/participations/rpc";
import { listResearchForms } from "@/lib/forms/queries";
import { isValidUuid } from "@/lib/forms/input";
import { PROJECT_LIST_MAX_LIMIT } from "@/lib/projects/input";
import {
  CreateResearchFormClient,
  type EligibleProject,
  type PrefilledContext,
} from "@/components/forms/CreateResearchFormClient";

export const metadata = {
  title: "تسجيل استمارة جديدة | زمبلك",
};

type SearchParams = Promise<{ project?: string; participant?: string }>;

export default async function NewFormPage(props: {
  searchParams?: SearchParams;
}) {
  await requireOwnerSession();
  const searchParams = props.searchParams ? await props.searchParams : {};
  const projectParam = searchParams.project?.trim();
  const participantParam = searchParams.participant?.trim();

  const supabase = await createClient();

  // Load projects for current tenant account
  const projectsRes = await listProjects(supabase, {
    search: null,
    companyId: null,
    status: null,
    limit: PROJECT_LIST_MAX_LIMIT,
    offset: 0,
  });
  const rawProjects = projectsRes.ok ? projectsRes.data.projects : [];
  const activeProjects = rawProjects.filter(
    (p) => p.status !== "closed" && p.status !== "cancelled"
  );

  const eligibleProjects: EligibleProject[] = [];
  let prefilledContext: PrefilledContext | null = null;
  let prefilledError: string | null = null;

  for (const proj of activeProjects) {
    const [partsRes, formsRes] = await Promise.all([
      listProjectParticipations(supabase, {
        projectId: proj.projectId,
        search: null,
        limit: 100,
        offset: 0,
      }),
      listResearchForms(supabase, { projectId: proj.projectId, pageSize: 100 }),
    ]);

    const parts = partsRes.ok ? partsRes.data : [];
    const forms = formsRes.ok ? formsRes.data.items : [];
    const existingParticipationIds = new Set(forms.map((f) => f.participation_id));

    const available = parts.filter(
      (part) => !existingParticipationIds.has(part.participationId)
    );

    if (available.length > 0) {
      eligibleProjects.push({
        id: proj.projectId,
        name: proj.projectName,
        availableCount: available.length,
        participants: available.map((part) => ({
          participationId: part.participationId,
          respondentId: part.respondentId,
          name: part.respondentName || "مشارك",
          mobile: part.respondentMobile,
        })),
      });
    }

    // Check prefilled parameters match
    if (projectParam && participantParam && proj.projectId === projectParam) {
      const targetPart = parts.find(
        (part) => part.participationId === participantParam
      );
      if (targetPart) {
        if (existingParticipationIds.has(targetPart.participationId)) {
          prefilledError = "تم تسجيل استمارة لهذا المشارك في المشروع بالفعل.";
        } else {
          prefilledContext = {
            projectId: proj.projectId,
            projectName: proj.projectName,
            participationId: targetPart.participationId,
            participantName: targetPart.respondentName || "مشارك",
            participantMobile: targetPart.respondentMobile,
          };
        }
      } else {
        prefilledError = "هذا المشارك غير مسجل في المشروع المحدد.";
      }
    }
  }

  if (projectParam && participantParam && !prefilledContext && !prefilledError) {
    if (!isValidUuid(projectParam) || !isValidUuid(participantParam)) {
      prefilledError = "معرف المشروع أو المشارك غير صالح.";
    } else {
      prefilledError = "المشروع أو المشارك المحدد غير متاح لتسجيل استمارة حالياً.";
    }
  }

  return (
    <CreateResearchFormClient
      prefilledContext={prefilledContext}
      prefilledError={prefilledError}
      eligibleProjects={eligibleProjects}
    />
  );
}
