import { requireAppSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import FormDetailPageClient from "./FormDetailPageClient";

type Props = {
  params: Promise<{ formId: string }>;
};

export default async function Page({ params }: Props) {
  const session = await requireAppSession();
  if (session.profile.role !== "owner") {
    redirect("/forbidden");
  }
  const { formId } = await params;
  return <FormDetailPageClient formId={formId} />;
}
