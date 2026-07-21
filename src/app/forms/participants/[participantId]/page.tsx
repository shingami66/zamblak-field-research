import { requireAppSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import ParticipantFormsPageClient from "./ParticipantFormsPageClient";

type Props = {
  params: Promise<{ participantId: string }>;
};

export default async function Page({ params }: Props) {
  const session = await requireAppSession();
  if (session.profile.role !== "owner") {
    redirect("/forbidden");
  }
  const { participantId } = await params;
  return <ParticipantFormsPageClient participantId={participantId} />;
}
