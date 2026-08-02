import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getSuccessNotice, successRedirectPath } from "./success-notice";

describe("success notices", () => {
  it("builds a known-code redirect without accepting user-provided paths", () => {
    assert.equal(successRedirectPath("/projects", "project_created"), "/projects?success=project_created");
  });

  it("renders only whitelisted notice codes", () => {
    assert.equal(getSuccessNotice("participant_assigned"), "تمت إضافة المشارك إلى المشروع بنجاح.");
    assert.equal(getSuccessNotice("form_accepted"), "تم قبول استمارة البحث وتثبيت القيمة المقبولة المستحقة.");
    assert.equal(getSuccessNotice("form_rejected"), "تم رفض استمارة البحث وتسجيل سبب الرفض.");
    assert.equal(getSuccessNotice("form_cancelled"), "تم إلغاء استمارة البحث.");
    assert.equal(getSuccessNotice("<script>alert(1)</script>"), null);
    assert.equal(getSuccessNotice(["project_created"]), null);
  });
});
