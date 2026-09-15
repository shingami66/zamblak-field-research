#!/usr/bin/env node
/**
 * Zamblak Agent Control · skill-routing-acceptance-test.mjs
 *
 * Deterministic acceptance test suite for Zamblak's agent workflow,
 * selective skill routing, authority boundaries, and non-overlap invariants.
 *
 * Requirements:
 * - Pure Node.js (no external dependencies, no LLM calls)
 * - Tests all 10 synthetic task classes against routing contracts
 * - Verifies skill directory manifests and frontmatter integrity
 * - Verifies authority boundaries and non-overlap invariants
 */

import { strict as assert } from "node:assert";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

// Locate repository root relative to this test file
const repoRoot = resolve(import.meta.dirname, "../../../..");
const skillsDir = join(repoRoot, ".agents", "skills");
const agentsMdPath = join(repoRoot, "AGENTS.md");
const briefRefPath = join(skillsDir, "zamblak-agent-control", "references", "writing-the-brief.md");

/**
 * 10 Synthetic Task Classes & Expected Routing Matrix
 */
export const SYNTHETIC_ROUTING_MATRIX = [
  {
    id: 1,
    name: "Simple Next.js App Router mechanics issue",
    primary: ["zamblak-nextjs-framework-engineering"],
    forbiddenAutoRoute: ["zamblak-db-rls-migration-guard", "zamblak-nextjs-performance-engineering"],
    rationale: "Framework mechanics only; do not route DB migration or performance skills speculatively.",
  },
  {
    id: 2,
    name: "Supabase server runtime query/RPC issue with authenticated tenant data",
    primary: ["zamblak-supabase-data-engineering"],
    conditional: ["zamblak-security-privacy-guard"],
    forbiddenAutoRoute: ["zamblak-db-rls-migration-guard"],
    rationale: "Runtime data API and RPC execution only; route security when trust-boundary is involved; no migration guard unless schema/DDL becomes material.",
  },
  {
    id: 3,
    name: "RLS migration review",
    primary: ["zamblak-db-rls-migration-guard"],
    conditional: ["zamblak-security-privacy-guard"],
    forbiddenAutoRoute: ["zamblak-supabase-data-engineering"],
    rationale: "Schema, migration, and RLS authority belongs strictly to DB guard; runtime data engineering has zero migration authority.",
  },
  {
    id: 4,
    name: "Measured slow page caused by a database query",
    primary: ["zamblak-nextjs-performance-engineering"],
    evidenceRouted: ["zamblak-postgres-query-index-guidance", "zamblak-supabase-data-engineering"],
    forbiddenAutoRoute: ["zamblak-db-rls-migration-guard"],
    rationale: "Starts with evidence-first performance engineering; Postgres/Supabase routed upon layer identification; index migrations require separate DB migration authority.",
  },
  {
    id: 5,
    name: "Non-trivial production-code implementation",
    primary: ["zamblak-clean-code-guard"],
    forbiddenOnDocsOnly: true,
    rationale: "Acts as quality judgment layer before independent review; never routed for documentation-only work.",
  },
  {
    id: 6,
    name: "Arabic fieldwork UI change",
    primary: ["zamblak-ui-rtl-senior-ux-guard"],
    conditional: ["zamblak-fieldwork-domain-guard", "zamblak-product-manager", "zamblak-security-privacy-guard"],
    rationale: "RTL UX and layout logic; add fieldwork/product/security only if task crosses those domains.",
  },
  {
    id: 7,
    name: "Auth / direct-ID / cross-account access bug",
    primary: ["zamblak-security-privacy-guard"],
    implementationSpecialists: ["zamblak-nextjs-framework-engineering", "zamblak-supabase-data-engineering"],
    rationale: "Application security, IDOR/BOLA, and tenant boundaries; route framework/Supabase only for affected mechanics.",
  },
  {
    id: 8,
    name: "Independent review",
    primary: ["zamblak-review-delegation"],
    conditional: ["zamblak-opencodereview"],
    rationale: "Antigravity Reviewer delegation; OCR packet preparation routed only when OCR-backed review is explicitly requested or materially useful.",
  },
  {
    id: 9,
    name: "Documentation-only correction",
    primary: ["zamblak-docs-guard"],
    forbiddenAutoRoute: [
      "zamblak-clean-code-guard",
      "zamblak-nextjs-framework-engineering",
      "zamblak-supabase-data-engineering",
      "zamblak-db-rls-migration-guard",
    ],
    rationale: "Documentation integrity only; no clean-code, Next.js, Supabase, or DB skills by default.",
  },
  {
    id: 10,
    name: "Git / precommit landing",
    primary: ["zamblak-precommit-gate"],
    forbiddenManufacturedAuthority: true,
    rationale: "Git staging and commit verification; no product or engineering skill may manufacture extra Git authority.",
  },
  {
    id: 11,
    name: "Changed or generated test code quality",
    primary: ["zamblak-test-guard"],
    conditional: ["zamblak-security-privacy-guard", "zamblak-db-rls-migration-guard", "zamblak-supabase-data-engineering"],
    forbiddenAutoRoute: ["zamblak-clean-code-guard"],
    forbiddenOnDocsOnly: true,
    forbiddenOnExecutionOnly: true,
    forbiddenManufacturedAuthority: true,
    rationale: "Test code quality and behavioral integrity only; clean-code guard is for production code; running tests alone does not route it; docs-only does not route it; never manufactures DB, Git, or product authority.",
  },
];

/**
 * Parses YAML frontmatter from a markdown string.
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const yaml = match[1];
  const result = {};
  for (const line of yaml.split("\n")) {
    const kv = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (kv) {
      result[kv[1].trim()] = kv[2].trim();
    }
  }
  return result;
}

/**
 * Test runner
 */
async function runTests() {
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      process.stdout.write(`  ✓ ${name}\n`);
      passed++;
    } catch (err) {
      process.stderr.write(`  ✗ ${name}: ${err.message}\n`);
      failed++;
    }
  }

  process.stdout.write("Running Zamblak Agent Control Acceptance Test Suite...\n\n");

  // 1. Synthetic Routing Matrix Contract
  test("Routing Matrix: covers all 11 canonical task scenarios with non-empty primary skills", () => {
    assert.strictEqual(SYNTHETIC_ROUTING_MATRIX.length, 11, "Must define exactly 11 synthetic task classes");
    for (const scenario of SYNTHETIC_ROUTING_MATRIX) {
      assert.ok(scenario.primary && scenario.primary.length > 0, `Scenario ${scenario.id} must define primary skill`);
      assert.ok(scenario.rationale, `Scenario ${scenario.id} must define rationale`);
    }
  });

  test("Routing Matrix: Scenario 1 (Next.js mechanics) forbids DB and performance auto-routing", () => {
    const s1 = SYNTHETIC_ROUTING_MATRIX[0];
    assert.deepStrictEqual(s1.primary, ["zamblak-nextjs-framework-engineering"]);
    assert.ok(s1.forbiddenAutoRoute.includes("zamblak-db-rls-migration-guard"));
    assert.ok(s1.forbiddenAutoRoute.includes("zamblak-nextjs-performance-engineering"));
  });

  test("Routing Matrix: Scenario 2 (Supabase runtime) forbids DB migration guard authority", () => {
    const s2 = SYNTHETIC_ROUTING_MATRIX[1];
    assert.deepStrictEqual(s2.primary, ["zamblak-supabase-data-engineering"]);
    assert.ok(s2.forbiddenAutoRoute.includes("zamblak-db-rls-migration-guard"));
  });

  test("Routing Matrix: Scenario 3 (RLS migration) strictly assigns authority to DB guard", () => {
    const s3 = SYNTHETIC_ROUTING_MATRIX[2];
    assert.deepStrictEqual(s3.primary, ["zamblak-db-rls-migration-guard"]);
    assert.ok(s3.forbiddenAutoRoute.includes("zamblak-supabase-data-engineering"));
  });

  test("Routing Matrix: Scenario 4 (Performance) starts with performance skill before DB/index guidance", () => {
    const s4 = SYNTHETIC_ROUTING_MATRIX[3];
    assert.deepStrictEqual(s4.primary, ["zamblak-nextjs-performance-engineering"]);
    assert.ok(s4.evidenceRouted.includes("zamblak-postgres-query-index-guidance"));
    assert.ok(s4.forbiddenAutoRoute.includes("zamblak-db-rls-migration-guard"));
  });

  test("Routing Matrix: Scenario 5 & 9 (Clean Code & Docs) enforce docs-only isolation", () => {
    const s5 = SYNTHETIC_ROUTING_MATRIX[4];
    const s9 = SYNTHETIC_ROUTING_MATRIX[8];
    assert.strictEqual(s5.forbiddenOnDocsOnly, true);
    assert.deepStrictEqual(s9.primary, ["zamblak-docs-guard"]);
    assert.ok(s9.forbiddenAutoRoute.includes("zamblak-clean-code-guard"));
    assert.ok(s9.forbiddenAutoRoute.includes("zamblak-nextjs-framework-engineering"));
    assert.ok(s9.forbiddenAutoRoute.includes("zamblak-supabase-data-engineering"));
    assert.ok(s9.forbiddenAutoRoute.includes("zamblak-db-rls-migration-guard"));
  });

  test("Routing Matrix: Scenario 11 (Test Guard) routes zamblak-test-guard for test code, forbids clean-code guard, and isolates from execution/docs", () => {
    const s11 = SYNTHETIC_ROUTING_MATRIX[10];
    assert.deepStrictEqual(s11.primary, ["zamblak-test-guard"]);
    assert.ok(s11.forbiddenAutoRoute.includes("zamblak-clean-code-guard"));
    assert.strictEqual(s11.forbiddenOnDocsOnly, true);
    assert.strictEqual(s11.forbiddenOnExecutionOnly, true);
    assert.strictEqual(s11.forbiddenManufacturedAuthority, true);

    // Verify Scenario 5 (production code) does not route zamblak-test-guard automatically
    const s5 = SYNTHETIC_ROUTING_MATRIX[4];
    assert.deepStrictEqual(s5.primary, ["zamblak-clean-code-guard"]);
    assert.ok(!s5.primary.includes("zamblak-test-guard"));

    // Verify Scenario 9 (docs-only) does not route zamblak-test-guard
    const s9 = SYNTHETIC_ROUTING_MATRIX[8];
    assert.ok(!s9.primary.includes("zamblak-test-guard"));
  });

  // 2. Skill Inventory & Frontmatter Verification
  test("Skill Inventory: every skill in routing matrix exists with valid YAML frontmatter", () => {
    const allRoutedSkills = new Set();
    for (const s of SYNTHETIC_ROUTING_MATRIX) {
      (s.primary || []).forEach((k) => allRoutedSkills.add(k));
      (s.conditional || []).forEach((k) => allRoutedSkills.add(k));
      (s.evidenceRouted || []).forEach((k) => allRoutedSkills.add(k));
      (s.implementationSpecialists || []).forEach((k) => allRoutedSkills.add(k));
      (s.forbiddenAutoRoute || []).forEach((k) => allRoutedSkills.add(k));
    }

    for (const skillName of allRoutedSkills) {
      const skillFile = join(skillsDir, skillName, "SKILL.md");
      assert.ok(existsSync(skillFile), `Skill file must exist: ${skillFile}`);
      const content = readFileSync(skillFile, "utf8");
      const fm = parseFrontmatter(content);
      assert.ok(fm, `Skill ${skillName} must have valid YAML frontmatter`);
      assert.strictEqual(fm.name, skillName, `Frontmatter name must match directory for ${skillName}`);
      assert.ok(fm.description && fm.description.length > 10, `Skill ${skillName} must have descriptive summary`);
    }
  });

  // 3. Governance Document Sync
  test("Governance Sync: AGENTS.md registers all routed skills", () => {
    assert.ok(existsSync(agentsMdPath), "AGENTS.md must exist");
    const agentsMd = readFileSync(agentsMdPath, "utf8");

    const coreSkills = [
      "zamblak-agent-control",
      "zamblak-review-delegation",
      "zamblak-opencodereview",
      "zamblak-supabase-data-engineering",
      "zamblak-nextjs-framework-engineering",
      "zamblak-nextjs-performance-engineering",
      "zamblak-postgres-query-index-guidance",
      "zamblak-db-rls-migration-guard",
      "zamblak-clean-code-guard",
      "zamblak-test-guard",
      "zamblak-security-privacy-guard",
      "zamblak-precommit-gate",
      "zamblak-product-manager",
      "zamblak-fieldwork-domain-guard",
      "zamblak-docs-guard",
      "zamblak-ui-rtl-senior-ux-guard",
      "zamblak-graphify-navigation",
    ];

    for (const sk of coreSkills) {
      assert.ok(agentsMd.includes(`\`${sk}\``), `AGENTS.md must document skill \`${sk}\``);
    }
  });

  test("Governance Sync: writing-the-brief.md quick reference table registers all routed skills", () => {
    assert.ok(existsSync(briefRefPath), "writing-the-brief.md must exist");
    const briefRef = readFileSync(briefRefPath, "utf8");

    const expectedTableSkills = [
      "zamblak-agent-control",
      "zamblak-review-delegation",
      "zamblak-opencodereview",
      "zamblak-supabase-data-engineering",
      "zamblak-nextjs-framework-engineering",
      "zamblak-nextjs-performance-engineering",
      "zamblak-postgres-query-index-guidance",
      "zamblak-db-rls-migration-guard",
      "zamblak-clean-code-guard",
      "zamblak-test-guard",
      "zamblak-precommit-gate",
      "zamblak-product-manager",
      "zamblak-fieldwork-domain-guard",
      "zamblak-security-privacy-guard",
      "zamblak-docs-guard",
      "zamblak-ui-rtl-senior-ux-guard",
      "zamblak-graphify-navigation",
    ];

    for (const sk of expectedTableSkills) {
      assert.ok(briefRef.includes(`\`${sk}\``), `writing-the-brief.md table must include \`${sk}\``);
    }
  });

  // 4. Authority Boundaries & Invariants
  test("Authority Invariants: Supabase data engineering disclaims schema/migration authority", () => {
    const content = readFileSync(join(skillsDir, "zamblak-supabase-data-engineering", "SKILL.md"), "utf8");
    assert.ok(content.includes("zamblak-db-rls-migration-guard"), "Must route db guard for migrations");
    assert.ok(content.includes("does not own schema migrations") || content.includes("Schema & Migration Exclusion"));
  });

  test("Authority Invariants: Postgres query guidance disclaims DDL/index mutation authority", () => {
    const content = readFileSync(join(skillsDir, "zamblak-postgres-query-index-guidance", "SKILL.md"), "utf8");
    assert.ok(content.includes("NO Migration Authority") || content.includes("NO Schema Mutation Authority"));
    assert.ok(content.includes("zamblak-db-rls-migration-guard"), "Must hand off to db guard for migrations");
  });

  test("Authority Invariants: Clean code guard disclaims product and domain override authority", () => {
    const content = readFileSync(join(skillsDir, "zamblak-clean-code-guard", "SKILL.md"), "utf8");
    assert.ok(content.includes("NOT Product Authority"));
    assert.ok(content.includes("Cannot Override Domain Guards"));
  });

  test("Authority Invariants: Test guard disclaims running tests, production code review, and product/DB authority", () => {
    const content = readFileSync(join(skillsDir, "zamblak-test-guard", "SKILL.md"), "utf8");
    assert.ok(content.includes("Does NOT Run Tests") || content.includes("does not execute test runners"));
    assert.ok(content.includes("NOT Production Code Authority") || content.includes("zamblak-clean-code-guard"));
    assert.ok(content.includes("NOT Product Authority"));
    assert.ok(content.includes("Zero Database/Secret Authority"));
  });

  test("Authority Invariants: Security guard prohibits reading secret credentials and enforces fail-closed", () => {
    const content = readFileSync(join(skillsDir, "zamblak-security-privacy-guard", "SKILL.md"), "utf8");
    assert.ok(content.includes("secrets") && (content.includes(".env") || content.includes("credentials")));
    assert.ok(content.includes("Fail-Closed") || content.includes("fail closed") || content.includes("fail-closed"));
  });

  test("Authority Invariants: DB guard maintains SQL_DRAFT_ONLY vs SUPABASE_APPLY_ONLY gate", () => {
    const content = readFileSync(join(skillsDir, "zamblak-db-rls-migration-guard", "SKILL.md"), "utf8");
    assert.ok(content.includes("SQL_DRAFT_ONLY"));
    assert.ok(content.includes("SUPABASE_APPLY_ONLY"));
  });

  // 5. Anti-Contamination Verification
  test("Anti-Contamination: zero G7 business/product terms in skills or AGENTS.md", () => {
    const forbiddenPatterns = [
      /\bClerk\b/i,
      /\bCRM\b/,
      /\bERP\b/,
      /\bquotations?\b/i,
      /\binvoices?\b/i,
      /\bVAT\b/,
      /\baccounting rules\b/i,
      /\bService\/Booking\b/i,
    ];

    const filesToCheck = [
      agentsMdPath,
      briefRefPath,
      join(skillsDir, "zamblak-supabase-data-engineering", "SKILL.md"),
      join(skillsDir, "zamblak-nextjs-framework-engineering", "SKILL.md"),
      join(skillsDir, "zamblak-nextjs-performance-engineering", "SKILL.md"),
      join(skillsDir, "zamblak-postgres-query-index-guidance", "SKILL.md"),
      join(skillsDir, "zamblak-security-privacy-guard", "SKILL.md"),
      join(skillsDir, "zamblak-db-rls-migration-guard", "SKILL.md"),
      join(skillsDir, "zamblak-clean-code-guard", "SKILL.md"),
      join(skillsDir, "zamblak-test-guard", "SKILL.md"),
    ];

    for (const file of filesToCheck) {
      const text = readFileSync(file, "utf8");
      // If the file explicitly mentions anti-contamination rules, exclude that specific explanatory paragraph
      const scrubbed = text.replaceAll(/Strict Anti-Contamination Rule[\s\S]*?(?=\n\n|\n-)/g, "");
      for (const pat of forbiddenPatterns) {
        assert.ok(!pat.test(scrubbed), `File ${file} must not match forbidden pattern ${pat}`);
      }
    }
  });

  process.stdout.write(`\nTest results: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
