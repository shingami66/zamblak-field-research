import { PendingModulePage } from "@/components/dashboard/PendingModulePage";
import { requireAppSession } from "@/lib/auth/session";

export default async function ProjectsPage() {
  await requireAppSession();

  return (
    <PendingModulePage
      title="المشاريع"
      description="يجري إعداد إدارة المشاريع ومتابعة العمل الميداني. لا نعرض أي سجلات للمشاريع أو بيانات تشغيلية في هذه الصفحة حالياً."
    />
  );
}
