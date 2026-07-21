import { requireAppSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import CollectionDetailPageClient from "./CollectionDetailPageClient";

type Props = {
  params: Promise<{ collectionId: string }>;
};

export default async function Page({ params }: Props) {
  const session = await requireAppSession();
  if (session.profile.role !== "owner") {
    redirect("/forbidden");
  }
  const { collectionId } = await params;
  return <CollectionDetailPageClient collectionId={collectionId} />;
}
