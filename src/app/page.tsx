import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { mockRole } from "@/lib/auth/mock-role";

export default function Home() {
  return (
    <DashboardShell role={mockRole} />
  );
}
