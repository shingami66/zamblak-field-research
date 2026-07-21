import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const formPath = join(here, "AssignRespondentForm.tsx");

describe("AssignRespondentForm UX and Arabic copy", () => {
  const tsx = readFileSync(formPath, "utf8");

  it("renders with مشارك instead of مستجيب", () => {
    assert.equal(tsx.includes("مشارك بدون اسم"), false,
      "Inline مشارك بدون اسم should be centralized in participationCopy");
    assert.equal(tsx.includes("مستجيب"), false);
    assert.equal(tsx.includes("participationCopy.noNameFallback"), true,
      "Name fallback should use centralized copy");
  });

  it("automatically runs warning check after participant selection", () => {
    assert.equal(tsx.includes('onChange={() => handleSelect('), true);
    assert.equal(tsx.includes('checkAssignmentWarningsAction'), true);
  });

  it("removes the separate review warnings button", () => {
    assert.equal(tsx.includes("CheckWarningsButton"), false);
  });

  it("provides one primary CTA only", () => {
    assert.equal(tsx.includes("CreateParticipationButton"), true);
  });

  it("no-warning state renders as inline text, not a warning panel", () => {
    assert.equal(tsx.includes("noWarnings"), true,
      "No-warning state should render using noWarnings class");
    assert.equal(tsx.includes("hasRealWarning"), true,
      "Must check hasRealWarning before rendering warning panel");
  });

  it("warnings region has aria-live for screen reader announcements", () => {
    assert.equal(tsx.includes('aria-live="polite"'), true);
  });

  it("has id attribute on warnings region for accessibility", () => {
    assert.equal(tsx.includes('id="participation-warnings"'), true);
  });

  it("guards warning responses by request sequence and selected respondent", () => {
    assert.equal(tsx.includes("requestSequence"), true);
    assert.equal(tsx.includes("selectedRespondentId"), true);
    assert.equal(tsx.includes("requestSequence.current !== requestId"), true);
  });
});
