import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PROJECT_LIST_MAX_LIMIT, parseListProjectsInput } from "@/lib/projects/input";

describe("New Form Page Eligibility Contract (ZAM-FORMS-ELIGIBILITY-REMEDIATION-01)", () => {
  it("enforces PROJECT_LIST_MAX_LIMIT is exactly 50", () => {
    assert.equal(PROJECT_LIST_MAX_LIMIT, 50);
  });

  it("validates parseListProjectsInput accepts PROJECT_LIST_MAX_LIMIT and rejects > 50", () => {
    const validRes = parseListProjectsInput({
      search: null,
      companyId: null,
      status: null,
      limit: PROJECT_LIST_MAX_LIMIT,
      offset: 0,
    });
    assert.equal(validRes.ok, true);
    if (validRes.ok) {
      assert.equal(validRes.data.limit, 50);
    }

    const invalidRes = parseListProjectsInput({
      search: null,
      companyId: null,
      status: null,
      limit: 100,
      offset: 0,
    });
    assert.equal(invalidRes.ok, false);
    if (!invalidRes.ok) {
      assert.equal(invalidRes.code, "invalid_project_pagination");
    }
  });

  it("proves src/app/forms/new/page.tsx passes PROJECT_LIST_MAX_LIMIT to listProjects instead of 100", () => {
    const pagePath = path.join(process.cwd(), "src/app/forms/new/page.tsx");
    const content = fs.readFileSync(pagePath, "utf8");

    assert.ok(
      content.includes("PROJECT_LIST_MAX_LIMIT"),
      "src/app/forms/new/page.tsx must import and use PROJECT_LIST_MAX_LIMIT"
    );

    const listProjectsCallMatch = content.match(
      /listProjects\(supabase,\s*\{[\s\S]*?\}\)/
    );
    assert.ok(
      listProjectsCallMatch !== null,
      "src/app/forms/new/page.tsx must call listProjects"
    );

    const callText = listProjectsCallMatch[0];
    assert.ok(
      callText.includes("limit: PROJECT_LIST_MAX_LIMIT"),
      "src/app/forms/new/page.tsx must pass limit: PROJECT_LIST_MAX_LIMIT to listProjects"
    );
    assert.ok(
      !callText.includes("limit: 100"),
      "src/app/forms/new/page.tsx must not pass limit: 100 to listProjects"
    );
  });
});
