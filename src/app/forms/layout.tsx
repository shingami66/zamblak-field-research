import { requireAppSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { PrototypeStoreProvider } from "@/lib/forms-prototype/store-context";

export default async function FormsLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAppSession();
  if (session.profile.role !== "owner") {
    redirect("/forbidden");
  }
  return <PrototypeStoreProvider>{children}</PrototypeStoreProvider>;
}
