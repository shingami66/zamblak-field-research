import { requireAppSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import ProjectFormsPageClient from "./ProjectFormsPageClient";

type Props = {
  params: Promise<{ projectId: string }>;
};

export default async function Page({ params }: Props) {
  const session = await requireAppSession();
  if (session.profile.role !== "owner") {
    redirect("/forbidden");
  }
  const { projectId } = await params;
  return <ProjectFormsPageClient projectId={projectId} />;
}
