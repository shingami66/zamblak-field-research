import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const readSource = (name: string) => readFileSync(path.join(dir, name), "utf8");

describe("Dashboard server and motion boundaries", () => {
  it("keeps quick navigation on Link and interaction callbacks out of server components", () => {
    const quickActions = readSource("QuickActions.tsx");
    const searchCard = readSource("SearchCard.tsx");

    assert.match(quickActions, /import Link from "next\/link"/);
    assert.equal(quickActions.includes('"use client"'), false);
    assert.equal(quickActions.includes("onClick"), false);
    assert.equal(searchCard.includes('"use client"'), false);
    assert.equal(searchCard.includes("onClick"), false);
    assert.match(searchCard, /"use server"/);
    assert.match(searchCard, /<form action=\{search\}/);
  });

  it("provides reduced-motion fallbacks for every new Dashboard motion surface", () => {
    const shellCss = readSource("authenticated-shell.module.css");
    const searchCss = readSource("search-card.module.css");
    const quickCss = readSource("quick-actions.module.css");
    const summaryCss = readFileSync(
      path.join(dir, "../shared/summary-card.module.css"),
      "utf8"
    );

    for (const css of [shellCss, searchCss, quickCss, summaryCss]) {
      assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
    }
    assert.match(shellCss, /animation:\s*none/);
    assert.match(shellCss, /transform:\s*none/);
  });

  it("labels dashboard summary data as demo data before rendering mock metrics", () => {
    const shell = readSource("DashboardShell.tsx");
    assert.match(shell, /mockDashboardSummary/);
    assert.match(shell, /للعرض التجريبي فقط/);
  });

  it("keeps the financial summary owner-only", () => {
    const shell = readSource("DashboardShell.tsx");
    assert.match(shell, /isOwner && mockDashboardSummary\.upcomingPayments/);
  });
});
