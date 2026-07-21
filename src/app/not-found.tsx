import { StateLayout } from "@/components/shared/StateLayout";
import { StateAction } from "@/components/shared/StateAction";

export default function GlobalNotFound() {
  return (
    <StateLayout
      title="الصفحة غير موجودة"
      description="عذراً، لم نتمكن من العثور على الصفحة التي تبحث عنها. قد تكون حذفت أو نقلت."
      headingLevel="h1"
      action={<StateAction href="/">العودة للرئيسية</StateAction>}
    />
  );
}
