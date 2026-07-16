import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const repoSrc = join(here, "..", "..");

const componentPath = join(here, "ZamblakLoadingMark.tsx");
const cssPath = join(here, "zamblak-loading-mark.module.css");

describe("ZamblakLoadingMark component invariants", () => {
  const tsx = readFileSync(componentPath, "utf8");
  const css = readFileSync(cssPath, "utf8");

  it("renders inline SVG without client runtime or media assets", () => {
    assert.equal(tsx.includes("<svg"), true);
    assert.equal(tsx.includes('aria-hidden="true"'), true);
    assert.equal(tsx.includes('focusable="false"'), true);
    assert.equal(tsx.includes("viewBox="), true);
    assert.equal(tsx.includes('"use client"'), false);
    assert.equal(tsx.includes("<img"), false);
    assert.equal(tsx.includes("<image"), false);
    assert.equal(tsx.includes("<canvas"), false);
    assert.equal(tsx.includes("<video"), false);
    assert.equal(tsx.includes(".gif"), false);
    assert.equal(tsx.includes(".png"), false);
    assert.equal(tsx.includes(".jpg"), false);
    assert.equal(tsx.includes("http://"), false);
    assert.equal(tsx.includes("https://"), false);
    assert.equal(tsx.includes("setTimeout"), false);
    assert.equal(tsx.includes("setInterval"), false);
    assert.equal(tsx.includes("requestAnimationFrame"), false);
    assert.equal(tsx.includes("Date.now"), false);
    assert.equal(tsx.includes("PNGTree"), false);
  });

  it("supports compact, standard, and full variants with wordmark rules", () => {
    assert.equal(tsx.includes('"compact"'), true);
    assert.equal(tsx.includes('"standard"'), true);
    assert.equal(tsx.includes('"full"'), true);
    assert.equal(tsx.includes("showWordmark"), true);
    assert.equal(tsx.includes("Zamblak"), true);
    // Compact never shows wordmark.
    assert.equal(tsx.includes("!isCompact && (showWordmark ?? isFull)"), true);
    assert.equal(css.includes(".compact"), true);
    assert.equal(css.includes(".standard"), true);
    assert.equal(css.includes(".full"), true);
    assert.equal(css.includes(".wordmark"), true);
  });

  it("uses original stopwatch geometry classes and token-friendly color", () => {
    assert.equal(tsx.includes("bezel") || css.includes(".bezel"), true);
    assert.equal(css.includes(".hand"), true);
    assert.equal(css.includes(".pivot"), true);
    assert.equal(css.includes("currentColor") || tsx.includes("currentColor"), true);
    assert.equal(css.includes("--color-primary"), true);
    assert.equal(css.includes("--color-accent"), true);
    assert.equal(css.includes("var(--zlm-size"), true);
  });

  it("animates seconds hand with transform within 0.9–1.2s and rebound", () => {
    assert.equal(css.includes("@keyframes zlm-seconds-hand"), true);
    assert.equal(css.includes("transform: rotate"), true);
    assert.equal(css.includes("1.05s"), true);
    // Rebound below full turn then settle.
    assert.equal(css.includes("346deg") || css.includes("348deg"), true);
    assert.equal(css.includes("360deg"), true);
    assert.equal(css.includes("transform-origin"), true);
    assert.equal(css.includes("animation: zlm-seconds-hand"), true);
    // Keyframes must not animate layout properties.
    const keyframes = css.match(/@keyframes zlm-seconds-hand\s*\{[\s\S]*?\n\}/);
    assert.equal(Boolean(keyframes), true);
    assert.equal(/\b(width|height|top|left|margin)\s*:/.test(keyframes?.[0] ?? ""), false);
  });

  it("disables continuous motion under prefers-reduced-motion", () => {
    assert.equal(css.includes("@media (prefers-reduced-motion: reduce)"), true);
    assert.equal(css.includes("animation: none"), true);
  });
});

describe("ZamblakLoadingMark Projects integration", () => {
  it("list/detail loading keep skeletons and add standard mark", () => {
    const listLoading = readFileSync(
      join(repoSrc, "app", "projects", "loading.tsx"),
      "utf8"
    );
    const detailLoading = readFileSync(
      join(repoSrc, "app", "projects", "[projectId]", "loading.tsx"),
      "utf8"
    );
    const editLoading = readFileSync(
      join(repoSrc, "app", "projects", "[projectId]", "edit", "loading.tsx"),
      "utf8"
    );

    for (const text of [listLoading, detailLoading]) {
      assert.equal(text.includes("ZamblakLoadingMark"), true);
      assert.equal(text.includes('variant="standard"'), true);
      assert.equal(text.includes("skeletonRow"), true);
      assert.equal(text.includes('aria-busy="true"'), true);
    }

    assert.equal(editLoading.includes("ZamblakLoadingMark"), true);
    assert.equal(editLoading.includes('variant="standard"'), true);
    assert.equal(editLoading.includes("projectsEditCopy.loading"), true);
  });

  it("pending create/edit/lifecycle buttons keep text and use compact mark", () => {
    const create = readFileSync(
      join(repoSrc, "components", "projects", "CreateProjectForm.tsx"),
      "utf8"
    );
    const edit = readFileSync(
      join(repoSrc, "components", "projects", "EditProjectForm.tsx"),
      "utf8"
    );
    const lifecycle = readFileSync(
      join(repoSrc, "components", "projects", "ProjectLifecycleActions.tsx"),
      "utf8"
    );

    assert.equal(create.includes('variant="compact"'), true);
    assert.equal(create.includes("projectsCreateCopy.submitting"), true);
    assert.equal(edit.includes('variant="compact"'), true);
    assert.equal(edit.includes("projectsEditCopy.saving"), true);
    assert.equal(lifecycle.includes('variant="compact"'), true);
    assert.equal(lifecycle.includes("projectsDetailCopy.transitioning"), true);
    assert.equal(lifecycle.includes("targetStatus"), true);
    assert.equal(lifecycle.includes("expectedUpdatedAt"), true);
    assert.equal(lifecycle.includes("lifecycleActivate"), true);
    assert.equal(lifecycle.includes("lifecycleCancel"), true);
    assert.equal(lifecycle.includes("lifecycleClose"), true);
  });

  it("root loading uses full variant inside main host without assets", () => {
    const rootLoading = readFileSync(join(repoSrc, "app", "loading.tsx"), "utf8");
    assert.equal(rootLoading.includes('variant="full"'), true);
    assert.equal(rootLoading.includes("showWordmark"), true);
    assert.equal(rootLoading.includes("جاري التحميل"), true);
    assert.equal(rootLoading.includes("http"), false);
  });

  it("integrations remain free of finance and remote loaders", () => {
    const files = [
      join(here, "ZamblakLoadingMark.tsx"),
      join(here, "zamblak-loading-mark.module.css"),
      join(repoSrc, "app", "loading.tsx"),
      join(repoSrc, "app", "projects", "loading.tsx"),
      join(repoSrc, "app", "projects", "[projectId]", "loading.tsx"),
      join(repoSrc, "app", "projects", "[projectId]", "edit", "loading.tsx"),
      join(repoSrc, "components", "projects", "CreateProjectForm.tsx"),
      join(repoSrc, "components", "projects", "EditProjectForm.tsx"),
      join(repoSrc, "components", "projects", "ProjectLifecycleActions.tsx"),
    ];
    const forbidden = [
      "project_financial_settings",
      "payments",
      "settlement",
      "service_role",
      'from("projects")',
      "from('projects')",
      "http://",
      "https://",
      "setTimeout",
      "requestAnimationFrame",
      "PNGTree",
    ];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const token of forbidden) {
        assert.equal(text.includes(token), false, `${file} ${token}`);
      }
    }
  });
});
