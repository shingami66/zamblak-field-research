import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, "../../..");
const source = readFileSync(path.join(dir, "Pagination.tsx"), "utf8");

describe("Pagination server navigation boundary", () => {
  it("uses URL links rather than client event callbacks", () => {
    assert.match(source, /import Link from "next\/link"/);
    assert.match(source, /previousHref\?: string \| null/);
    assert.match(source, /nextHref\?: string \| null/);
    assert.match(source, /visibleCount: number/);
    assert.equal(source.includes("totalItems"), false);
    assert.match(source, /المعروض:/);
    assert.match(source, /<bdi dir="ltr">\{startItem\}–\{endItem\}<\/bdi>/);
    assert.match(source, /<Link className=\{styles\.link\} href=\{nextHref\} rel="next">/);
    assert.match(source, /<Link className=\{styles\.link\} href=\{previousHref\} rel="prev">/);
    assert.equal(source.includes("onClick"), false);
    assert.equal(source.includes("onPageChange"), false);
  });

  it("keeps each server list route on the URL-navigation contract", () => {
    const routes = [
      "src/app/companies/page.tsx",
      "src/app/projects/page.tsx",
      "src/app/respondents/page.tsx",
    ];

    for (const route of routes) {
      const text = readFileSync(path.join(root, route), "utf8");
      assert.match(text, /<Pagination/);
      assert.match(text, /previousHref=\{pagination\.previousHref\}/);
      assert.match(text, /nextHref=\{pagination\.nextHref\}/);
      assert.equal(text.includes("onPageChange"), false);
    }
  });
});
