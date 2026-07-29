import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("Form Detail Page Layout & Component Structure (ZAM-FORM-DETAIL-VISUAL-REMEDIATION-01)", () => {
  it("proves src/app/forms/[formId]/page.tsx contains no undefined CSS module class references", () => {
    const pagePath = path.join(
      process.cwd(),
      "src/app/forms/[formId]/page.tsx"
    );
    const content = fs.readFileSync(pagePath, "utf8");

    const undefinedClasses = [
      "styles.container",
      "styles.header",
      "styles.title",
      "styles.subtitle",
      "styles.card",
      "styles.primaryButton",
    ];

    for (const className of undefinedClasses) {
      assert.ok(
        !content.includes(className),
        `src/app/forms/[formId]/page.tsx must not reference undefined class ${className}`
      );
    }
  });

  it("proves src/app/forms/[formId]/page.tsx uses established page wrapper and detail cards", () => {
    const pagePath = path.join(
      process.cwd(),
      "src/app/forms/[formId]/page.tsx"
    );
    const content = fs.readFileSync(pagePath, "utf8");

    assert.ok(
      content.includes("styles.page"),
      "src/app/forms/[formId]/page.tsx must use styles.page wrapper"
    );
    assert.ok(
      content.includes("styles.detailCard"),
      "src/app/forms/[formId]/page.tsx must use styles.detailCard for section containers"
    );
    assert.ok(
      content.includes("styles.metaGrid"),
      "src/app/forms/[formId]/page.tsx must use styles.metaGrid for metadata layout"
    );
  });

  it("proves src/app/forms/[formId]/page.tsx imports and renders shared BackLink, SuccessNotice, and StatusBadge components", () => {
    const pagePath = path.join(
      process.cwd(),
      "src/app/forms/[formId]/page.tsx"
    );
    const content = fs.readFileSync(pagePath, "utf8");

    assert.ok(
      content.includes('import { BackLink } from "@/components/shared/BackLink"') &&
        content.includes("<BackLink"),
      "src/app/forms/[formId]/page.tsx must adopt shared BackLink component"
    );
    assert.ok(
      content.includes('import { SuccessNotice } from "@/components/shared/SuccessNotice"') &&
        content.includes("<SuccessNotice"),
      "src/app/forms/[formId]/page.tsx must adopt shared SuccessNotice component"
    );
    assert.ok(
      content.includes('import { StatusBadge } from "@/components/shared/StatusBadge"') &&
        content.includes("<StatusBadge"),
      "src/app/forms/[formId]/page.tsx must adopt shared StatusBadge component"
    );
  });
});
