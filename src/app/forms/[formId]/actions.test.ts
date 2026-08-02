import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { formsErrorMessage } from "@/lib/forms/copy";
import { successNoticeMessages, successRedirectPath } from "@/lib/ui/success-notice";

describe("Forms Review Mutations - Server Actions & Component Contracts", () => {
  const validUuid = "11111111-1111-4111-8111-111111111111";

  it("proves actions.ts revalidates /forms and exact /forms/${researchFormId} without using literal pattern", () => {
    const actionsFilePath = path.join(__dirname, "actions.ts");
    const source = fs.readFileSync(actionsFilePath, "utf8");

    // 1. Revalidates /forms
    assert.ok(
      source.includes('revalidatePath("/forms");'),
      'Must revalidate "/forms"'
    );
    // 2. Revalidates exact /forms/${researchFormId} URL
    assert.ok(
      source.includes("revalidatePath(`/forms/${researchFormId}`);"),
      'Must revalidate exact URL `/forms/${researchFormId}`'
    );
    // 3. Does not revalidate literal string "/forms/[formId]"
    assert.equal(
      source.includes('revalidatePath("/forms/[formId]")'),
      false,
      'Must not revalidate literal string "/forms/[formId]"'
    );
  });

  it("ensures success notice codes and messages are preserved", () => {
    assert.equal(successNoticeMessages.form_accepted, "تم قبول استمارة البحث وتثبيت القيمة المقبولة المستحقة.");
    assert.equal(successNoticeMessages.form_rejected, "تم رفض استمارة البحث وتسجيل سبب الرفض.");
    assert.equal(successNoticeMessages.form_cancelled, "تم إلغاء استمارة البحث.");
    assert.equal(successRedirectPath(`/forms/${validUuid}`, "form_accepted"), `/forms/${validUuid}?success=form_accepted`);
    assert.equal(successRedirectPath(`/forms/${validUuid}`, "form_rejected"), `/forms/${validUuid}?success=form_rejected`);
    assert.equal(successRedirectPath(`/forms/${validUuid}`, "form_cancelled"), `/forms/${validUuid}?success=form_cancelled`);
  });

  it("ensures forms error messages are preserved", () => {
    assert.equal(formsErrorMessage("quota_override_reason_required"), "تم الوصول إلى الحد الأقصى للمشروع. يرجى تقديم سبب التجاوز.");
    assert.equal(formsErrorMessage("forbidden"), "عذراً، هذه العملية مخصصة لمالك الحساب فقط.");
    assert.equal(formsErrorMessage("research_form_state_invalid"), "حالة نموذج البحث الحالية لا تسمح بإجراء هذه العملية.");
  });
});
