#!/usr/bin/env node
/**
 * Zamblak OpenCodeReview · ocr-packet-test.mjs
 *
 * Deterministic unit test suite for OpenCodeReview delegation packet preparation.
 */

import { strict as assert } from "node:assert";
import {
  isStrictlyProtected,
  OCR_PACKET_SCHEMA_VERSION,
  buildReviewPacket,
  formatPacketMarkdown,
  checkOcrAvailability,
} from "../scripts/ocr-packet.mjs";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

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

  process.stdout.write("Running Zamblak OpenCodeReview Packet Test Suite...\n\n");

  // 1. Protected file exclusion
  test("Protected Files: identifies secrets, credentials, keys, certs, and logs", () => {
    assert.strictEqual(isStrictlyProtected(".env"), true);
    assert.strictEqual(isStrictlyProtected(".env.local"), true);
    assert.strictEqual(isStrictlyProtected("config/.env.production"), true);
    assert.strictEqual(isStrictlyProtected("certs/server.key"), true);
    assert.strictEqual(isStrictlyProtected("certs/ca.pem"), true);
    assert.strictEqual(isStrictlyProtected("certs/client.cert"), true);
    assert.strictEqual(isStrictlyProtected("keys/auth.pfx"), true);
    assert.strictEqual(isStrictlyProtected("ssh/id_rsa"), true);
    assert.strictEqual(isStrictlyProtected("data/secrets.json"), true);
    assert.strictEqual(isStrictlyProtected("config/credentials.yaml"), true);
    assert.strictEqual(isStrictlyProtected("debug.log"), true);
    assert.strictEqual(isStrictlyProtected("logs/build.log"), true);

    // Normal safe files must not be protected
    assert.strictEqual(isStrictlyProtected("src/app/page.tsx"), false);
    assert.strictEqual(isStrictlyProtected("src/lib/supabase/client.ts"), false);
    assert.strictEqual(isStrictlyProtected(".opencodereview/rule.json"), false);
    assert.strictEqual(isStrictlyProtected("AGENTS.md"), false);
  });

  // 2. Target file filtering & user-exclude preservation logic
  test("Filtering: targets constrain reviewable files without re-admitting user excludes", () => {
    const mockPreview = {
      mode: "workspace",
      total_files: 5,
      reviewable_files: [
        { path: "src/app/forms/page.tsx", status: "modified" },
        { path: "src/lib/pricing/calc.ts", status: "modified" },
        { path: ".env.local", status: "modified" }, // should be rejected by protected rule
      ],
      excluded_files: [
        { path: ".opencodereview/rule.json", status: "modified", exclude_reason: "user_exclude" },
        { path: "README.md", status: "modified", exclude_reason: "unsupported_ext" },
      ],
    };

    // Filter with targetFiles = ["src/lib/pricing/calc.ts"]
    const targetFiles = ["src/lib/pricing/calc.ts"];
    const targetSet = new Set(targetFiles);

    const reviewable = [];
    const protectedExclusions = [];
    const targetFilterExclusions = [];

    for (const item of mockPreview.reviewable_files) {
      if (isStrictlyProtected(item.path)) {
        protectedExclusions.push({ path: item.path, reason: "STRICTLY_PROTECTED_FILE" });
        continue;
      }
      if (!targetSet.has(item.path)) {
        targetFilterExclusions.push({ path: item.path, reason: "OUTSIDE_TASK_TARGET_FILES" });
        continue;
      }
      reviewable.push(item);
    }

    assert.strictEqual(reviewable.length, 1);
    assert.strictEqual(reviewable[0].path, "src/lib/pricing/calc.ts");
    assert.strictEqual(protectedExclusions.length, 1);
    assert.strictEqual(protectedExclusions[0].path, ".env.local");
    assert.strictEqual(targetFilterExclusions.length, 1);
    assert.strictEqual(targetFilterExclusions[0].path, "src/app/forms/page.tsx");

    // Ensure user-excluded files remain in final exclusion list
    const finalExcluded = [...mockPreview.excluded_files, ...protectedExclusions, ...targetFilterExclusions];
    assert.strictEqual(finalExcluded.length, 4);
    assert.ok(finalExcluded.some((f) => f.path === ".opencodereview/rule.json"));
  });

  // 3. OCR CLI availability and version probe
  test("CLI Probe: detects local ocr binary and version", () => {
    const probe = checkOcrAvailability();
    assert.strictEqual(probe.available, true, "OCR must be available in the local environment");
    assert.ok(probe.version && probe.version.includes("open-code-review"), "Version must reflect open-code-review");
  });

  // 4. Packet Schema validation
  test("Packet Schema: generates valid zamblak-ocr-packet.v1 structure", () => {
    const res = buildReviewPacket({
      cwd: process.cwd(),
      ruleFile: ".opencodereview/rule.json",
      backgroundFile: ".opencodereview/background.md",
    });

    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.packet.schema_version, OCR_PACKET_SCHEMA_VERSION);
    assert.ok(res.packet.packet_id.startsWith("ocr-packet-"));
    assert.strictEqual(typeof res.packet.summary.reviewable_count, "number");
    assert.strictEqual(typeof res.packet.summary.excluded_count, "number");
    assert.ok(Array.isArray(res.packet.reviewable_files));
    assert.ok(Array.isArray(res.packet.excluded_files));
    assert.ok(Array.isArray(res.packet.rule_groups));
    assert.ok(existsSync(res.packetJsonPath));
    assert.ok(existsSync(res.packetMdPath));

    // Cleanup generated test packet
    if (existsSync(res.packetJsonPath)) unlinkSync(res.packetJsonPath);
    if (existsSync(res.packetMdPath)) unlinkSync(res.packetMdPath);
  });

  // 5. Markdown formatting
  test("Markdown Formatting: produces concise reviewable summary", () => {
    const mockPacket = {
      packet_id: "test-packet-1",
      summary: { reviewable_count: 1, excluded_count: 1, rule_groups_count: 1 },
      reviewable_files: [{ path: "src/app/page.tsx" }],
      excluded_files: [{ path: "README.md", exclude_reason: "unsupported_ext" }],
      rule_groups: [{ group_id: 1, pattern: "**/*.tsx", files: ["src/app/page.tsx"], rule: "React best practices" }],
    };

    const md = formatPacketMarkdown(mockPacket);
    assert.ok(md.includes("OpenCodeReview Delegation Packet (test-packet-1)"));
    assert.ok(md.includes("`src/app/page.tsx`"));
    assert.ok(md.includes("`README.md` (unsupported_ext)"));
    assert.ok(md.includes("React best practices"));
  });

  process.stdout.write(`\nTest results: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
