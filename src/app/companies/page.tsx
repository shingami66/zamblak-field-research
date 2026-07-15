import { PendingModulePage } from "@/components/dashboard/PendingModulePage";
import { requireAppSession } from "@/lib/auth/session";

export default async function CompaniesPage() {
  await requireAppSession();

  return (
    <PendingModulePage
      title="الشركات"
      description="يجري إعداد أدوات إدارة الشركات. لا نعرض أي سجلات تشغيلية للشركات في هذه الصفحة حالياً."
    />
  );
}
