import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getSuccessNotice, successRedirectPath } from "./success-notice";

describe("success notices", () => {
  it("builds a known-code redirect without accepting user-provided paths", () => {
    assert.equal(successRedirectPath("/projects", "project_created"), "/projects?success=project_created");
  });

  it("renders only whitelisted notice codes", () => {
    assert.equal(getSuccessNotice("participant_assigned"), "تمت إضافة المشارك إلى المشروع بنجاح.");
    assert.equal(getSuccessNotice("<script>alert(1)</script>"), null);
    assert.equal(getSuccessNotice(["project_created"]), null);
  });
});
