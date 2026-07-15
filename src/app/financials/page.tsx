import { redirect } from "next/navigation";
import { PendingModulePage } from "@/components/dashboard/PendingModulePage";
import { requireAppSession } from "@/lib/auth/session";

export default async function FinancialsPage() {
  const session = await requireAppSession();

  if (session.profile.role !== "owner") {
    redirect("/");
  }

  return (
    <PendingModulePage
      title="المستحقات"
      description="يجري إعداد إدارة المستحقات والتسويات المالية. لا نعرض أي مبالغ أو أسعار أو مدفوعات أو أرقام مالية في هذه الصفحة حالياً."
    />
  );
}
