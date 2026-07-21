import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, "../../..");
const readSource = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8");

describe("Authenticated static route recovery boundaries", () => {
  it("keeps list routes on empty and recoverable error states rather than notFound", () => {
    const routes = [
      "src/app/companies/page.tsx",
      "src/app/projects/page.tsx",
      "src/app/respondents/page.tsx",
    ];

    for (const route of routes) {
      const source = readSource(route);
      assert.match(source, /requireAppSession/);
      assert.match(source, /<EmptyPanel/);
      assert.match(source, /<ErrorPanel/);
      assert.equal(source.includes("notFound"), false, route + " must not invoke notFound");
    }
  });

  it("keeps login and role redirects on their approved destinations", () => {
    const login = readSource("src/app/login/page.tsx");
    const session = readSource("src/lib/auth/session.ts");
    const financials = readSource("src/app/financials/page.tsx");

    assert.match(login, /redirectIfAuthenticated/);
    assert.equal(login.includes("notFound"), false);
    assert.match(session, /redirect\("\/login"\)/);
    assert.match(financials, /session\.profile\.role !== "owner"/);
    assert.match(financials, /redirect\("\/forbidden"\)/);
  });

  it("reserves project subroute notFound behavior for invalid or missing entities", () => {
    const routes = [
      "src/app/projects/[projectId]/participants/page.tsx",
      "src/app/projects/[projectId]/add-respondent/page.tsx",
    ];

    for (const route of routes) {
      const source = readSource(route);
      assert.match(source, /projectsDetailErrorBehavior/);
      assert.match(source, /behavior\.kind === "not_found"/);
      assert.equal(
        /if\s*\(!project(?:Result)?\.ok\)\s*notFound\(\)/.test(source),
        false,
        route + " must preserve recoverable project errors"
      );
    }

    const addRespondent = readSource(
      "src/app/projects/[projectId]/add-respondent/page.tsx"
    );
    assert.equal(
      /status !== "active"\)\s*notFound\(\)/.test(addRespondent),
      false
    );
    assert.match(addRespondent, /participationCopy\.activeOnly/);
  });

  it("provides one root main landmark, a skip link, and a root error boundary", () => {
    const layout = readSource("src/app/layout.tsx");
    const participants = readSource("src/app/projects/[projectId]/participants/page.tsx");
    const errorBoundary = readSource("src/app/error.tsx");

    assert.match(layout, /href="#main-content"/);
    assert.match(layout, /<main id="main-content"/);
    assert.equal(participants.includes("<main"), false);
    assert.match(errorBoundary, /reset/);
    assert.match(errorBoundary, /StateLayout/);
  });
});
