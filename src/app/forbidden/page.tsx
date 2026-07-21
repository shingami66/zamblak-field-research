import { StateLayout } from "@/components/shared/StateLayout";
import { StateAction } from "@/components/shared/StateAction";

export default function ForbiddenPage() {
  return (
    <StateLayout
      title="غير مصرح لك"
      description="عذراً، ليس لديك الصلاحية للوصول إلى هذه الصفحة."
      headingLevel="h1"
      action={<StateAction href="/">العودة للرئيسية</StateAction>}
    />
  );
}
