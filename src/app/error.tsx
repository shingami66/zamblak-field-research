"use client";

import { StateAction } from "@/components/shared/StateAction";
import { StateLayout } from "@/components/shared/StateLayout";

export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <StateLayout
      isError
      headingLevel="h1"
      title="تعذر تحميل الصفحة"
      description="حدث خطأ غير متوقع. يمكنك إعادة المحاولة أو العودة إلى الصفحة الرئيسية."
      action={
        <div className="flex flex-wrap justify-center gap-3">
          <StateAction onClick={reset}>إعادة المحاولة</StateAction>
          <StateAction href="/">العودة للرئيسية</StateAction>
        </div>
      }
    />
  );
}
