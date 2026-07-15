import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { requireAppSession } from "@/lib/auth/session";

export default async function Home() {
  const session = await requireAppSession();

  return <DashboardShell role={session.profile.role} />;
}
