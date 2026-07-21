/**
 * ZAM-PARTICIPATION-UI-DESIGN-FREEZE-1 — Presentation Tests
 *
 * Validates all locked UX decisions for the Participation UI slice.
 * These are source-file assertions using node:test + node:assert/strict.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, "..", "..");

// File paths
const copyPath = join(src, "lib", "participations", "copy.ts");
const formPath = join(here, "AssignRespondentForm.tsx");
const addRespondentCssPath = join(src, "app", "projects", "[projectId]", "add-respondent", "add-respondent.module.css");
const projectDetailPagePath = join(src, "app", "projects", "[projectId]", "page.tsx");
const projectDetailCssPath = join(src, "app", "projects", "[projectId]", "project-detail.module.css");
const navigationPath = join(src, "components", "layout", "Navigation.tsx");
const addRespondentLoadingPath = join(src, "app", "projects", "[projectId]", "add-respondent", "loading.tsx");

// Read all files
const copySrc = readFileSync(copyPath, "utf8");
const formSrc = readFileSync(formPath, "utf8");
const addRespondentCss = readFileSync(addRespondentCssPath, "utf8");
const projectDetailPage = readFileSync(projectDetailPagePath, "utf8");
const projectDetailCss = readFileSync(projectDetailCssPath, "utf8");
const navigationSrc = readFileSync(navigationPath, "utf8");

describe("Participation Copy — locked UX terms", () => {
  it('uses "مشارك" (not "مبحوث" or "مستجيب") in all participation copy', () => {
    // The copy module should use مشارك
    assert.equal(copySrc.includes("مشارك"), true, "copy.ts must include مشارك");
    assert.equal(copySrc.includes("مبحوث"), false, "copy.ts must not include مبحوث");
    assert.equal(copySrc.includes("مستجيب"), false, "copy.ts must not include مستجيب");
  });

  it("project detail page does not contain inline مبحوث", () => {
    assert.equal(projectDetailPage.includes("مبحوث"), false,
      "Project detail page must use centralized copy, not inline مبحوث");
  });

  it("form component does not contain inline مبحوث", () => {
    assert.equal(formSrc.includes("مبحوث"), false,
      "Form component must not contain inline مبحوث");
  });

  it("noNameFallback is centralized in copy module", () => {
    assert.equal(copySrc.includes("noNameFallback"), true,
      "copy.ts must export noNameFallback key");
    assert.equal(copySrc.includes("مشارك بدون اسم"), true,
      "noNameFallback must be مشارك بدون اسم");
  });

  it('no-warning copy matches exact locked string', () => {
    assert.equal(
      copySrc.includes("لا توجد ملاحظات، يمكنك إضافة المشارك."),
      true,
      "noWarnings must match exact locked string"
    );
  });

  it('CTA label matches locked string "إضافة المشارك"', () => {
    assert.equal(
      copySrc.includes('createParticipation: "إضافة المشارك"'),
      true,
      "Primary CTA label must be إضافة المشارك"
    );
  });

  it('duplicate error copy is present', () => {
    assert.equal(
      copySrc.includes("هذا المشارك مضاف إلى المشروع مسبقاً"),
      true,
      "Duplicate participation error copy must exist"
    );
  });
});

describe("Participation CSS — design freeze polish", () => {
  it("formError CSS has no side-stripe border (impeccable ban)", () => {
    // The add-respondent CSS must not use border-inline-start as a colored accent
    assert.equal(
      addRespondentCss.includes("border-inline-start"),
      false,
      "add-respondent.module.css must not use border-inline-start side-stripe"
    );
  });

  it("formError uses full border + background pattern", () => {
    assert.equal(addRespondentCss.includes("border: 1px solid #ba1a1a"), true,
      "formError must use full border");
    assert.equal(addRespondentCss.includes("border-radius: 0.75rem"), true,
      "formError must use border-radius");
  });

  it("has prefers-reduced-motion rule", () => {
    assert.equal(addRespondentCss.includes("prefers-reduced-motion"), true,
      "add-respondent CSS must include prefers-reduced-motion");
  });

  it("project-detail CSS has skeleton animation", () => {
    assert.equal(projectDetailCss.includes("skeleton-shimmer"), true,
      "project-detail CSS must include skeleton shimmer animation");
  });

  it("project-detail CSS has participation hover state", () => {
    assert.equal(projectDetailCss.includes(".participationItem:hover"), true,
      "Participation items must have hover state");
  });

  it("project-detail prefers-reduced-motion covers skeleton", () => {
    assert.equal(projectDetailCss.includes("animation: none"), true,
      "Skeleton animation must be disabled in reduced-motion");
  });
});

describe("Navigation — role-based financial access", () => {
  it('financial nav item is owner-only', () => {
    // The المستحقات link must have roles: ["owner"] only
    const financialsMatch = navigationSrc.match(
      /\{\s*name:\s*"المستحقات"[^}]*roles:\s*\["owner"\]/
    );
    assert.ok(financialsMatch, "المستحقات must be restricted to owner role only");
  });

  it("support_helper does not have financial navigation access", () => {
    // The المستحقات entry must NOT include support_helper
    const financialsLine = navigationSrc.split("\n").find(
      (line) => line.includes("المستحقات")
    );
    assert.ok(financialsLine, "Financial nav line must exist");
    assert.equal(
      financialsLine!.includes("support_helper"),
      false,
      "Financial nav must not include support_helper"
    );
  });
});

describe("Mobile numbers — LTR direction", () => {
  it("form component uses dir=ltr for mobile numbers", () => {
    assert.equal(formSrc.includes('dir="ltr"'), true,
      "Mobile numbers must use dir=ltr in the form");
  });

  it("project detail uses ProjectLtrToken for participation mobile", () => {
    assert.equal(
      projectDetailPage.includes("ProjectLtrToken"),
      true,
      "Project detail must use ProjectLtrToken for LTR number display"
    );
    assert.equal(
      projectDetailPage.includes("participationMobile"),
      true,
      "Project detail must reference participationMobile style"
    );
  });
});

describe("Warning behavior — non-blocking", () => {
  it("warnings region exists with aria-live", () => {
    assert.equal(formSrc.includes('aria-live="polite"'), true,
      "Warning region must have aria-live=polite");
  });

  it("CTA waits for the current selection check but not warning content", () => {
    assert.equal(formSrc.includes("warningState.respondentId !== selectedRespondentId"), true,
      "CTA must wait for a warning result tied to the current selection");
    assert.equal(formSrc.includes("isPending"), true,
      "CTA must stay disabled while the warning check is pending");
    assert.equal(formSrc.includes("hasRealWarning"), true,
      "Warning presentation remains separate from submission eligibility");
  });
});

describe("Loading page — add-respondent", () => {
  it("loading.tsx exists and uses ZamblakLoadingMark", () => {
    const loadingSrc = readFileSync(addRespondentLoadingPath, "utf8");
    assert.equal(loadingSrc.includes("ZamblakLoadingMark"), true,
      "Loading page must use ZamblakLoadingMark");
    assert.equal(loadingSrc.includes('aria-busy="true"'), true,
      "Loading page must have aria-busy");
  });
});
