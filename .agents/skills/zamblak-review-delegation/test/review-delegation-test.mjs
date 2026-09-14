#!/usr/bin/env node
/**
 * Zamblak Review Delegation · review-delegation-test.mjs
 *
 * Deterministic unit and integration test suite for Zamblak Review Delegation.
 */

import { strict as assert } from "node:assert";
import { computeWorktreeFingerprint } from "../scripts/fingerprint.mjs";
import {
  acquireWriterLock,
  releaseWriterLock,
  saveRecoveryCapsule,
  loadRecoveryCapsule,
  getCapsulePath,
} from "../scripts/recovery-capsule.mjs";
import { parseArgs, parseDuration, parseAgyLog } from "../scripts/delegate-reviewer.mjs";
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

  process.stdout.write("Running Zamblak Review Delegation Test Suite...\n\n");

  // 1. Fingerprint tests
  test("Fingerprint: computes deterministic SHA-256 hash and head SHA", () => {
    const fp = computeWorktreeFingerprint();
    assert.ok(fp.hash && fp.hash.length === 64, "Hash must be 64-char SHA-256 hex");
    assert.ok(fp.head && fp.head.length === 40, "HEAD must be 40-char commit SHA");
    assert.strictEqual(typeof fp.dirtyCount, "number");
    assert.ok(Array.isArray(fp.statusEntries));
  });

  test("Fingerprint: identical subsequent call produces identical hash", () => {
    const fp1 = computeWorktreeFingerprint();
    const fp2 = computeWorktreeFingerprint();
    assert.strictEqual(fp1.hash, fp2.hash, "Fingerprints without worktree changes must match exactly");
  });

  // 2. Duration parsing
  test("Delegate: parseDuration handles seconds, minutes, hours, and defaults", () => {
    assert.strictEqual(parseDuration("30s"), 30000);
    assert.strictEqual(parseDuration("5m"), 300000);
    assert.strictEqual(parseDuration("2h"), 7200000);
    assert.strictEqual(parseDuration(null, 600000), 600000);
    assert.strictEqual(parseDuration("invalid", 12345), 12345);
  });

  // 3. Security gate: rejects --dangerously-skip-permissions
  test("Delegate: rejects --dangerously-skip-permissions with security error", () => {
    assert.throws(
      () => parseArgs(["--brief", "test", "--dangerously-skip-permissions"]),
      /SECURITY VIOLATION.*strictly forbidden/
    );
  });

  test("Delegate: requires --brief", () => {
    assert.throws(() => parseArgs(["--cwd", process.cwd()]), /Missing mandatory --brief/);
  });

  // 4. Log parsing
  test("Delegate: parseAgyLog extracts project ID and conversation ID", () => {
    const testLog = join(tmpdir(), `test-log-${Date.now()}.txt`);
    const logContent = `
ERROR: logging before google.Init: I0914 13:41:06.640248 1 project.go:77] project: created project "test" (id=11111111-2222-3333-4444-555555555555)
ERROR: logging before google.Init: I0914 13:41:11.971350 1 server.go:1153] Created conversation 99999999-8888-7777-6666-555555555555
    `;
    writeFileSync(testLog, logContent, "utf8");
    try {
      const parsed = parseAgyLog(testLog);
      assert.strictEqual(parsed.projectId, "11111111-2222-3333-4444-555555555555");
      assert.strictEqual(parsed.conversationId, "99999999-8888-7777-6666-555555555555");
    } finally {
      if (existsSync(testLog)) unlinkSync(testLog);
    }
  });

  // 5. Writer Lock & Single Writer Invariant
  test("WriterLock: atomic acquisition and re-entrancy", () => {
    const taskId = `TEST-LOCK-${Date.now()}`;
    const writerId = "test-writer-1";
    const cwd = join(tmpdir(), `repo-${Date.now()}`);

    const acq1 = acquireWriterLock({ workdir: cwd, taskId, writerId, pid: process.pid });
    assert.strictEqual(acq1.ok, true, "First acquisition must succeed");
    assert.strictEqual(acq1.newlyCreated, true);

    // Re-entrant by same writer, task, and PID
    const acq2 = acquireWriterLock({ workdir: cwd, taskId, writerId, pid: process.pid });
    assert.strictEqual(acq2.ok, true, "Re-entrant call must succeed");
    assert.strictEqual(acq2.reentrant, true);

    // Release
    const rel = releaseWriterLock({ workdir: cwd, taskId, writerId });
    assert.strictEqual(rel.ok, true);
    assert.strictEqual(rel.released, true);
  });

  test("WriterLock: prevents concurrent mutating writers", () => {
    const taskId = `TEST-LOCK-${Date.now()}`;
    const cwd = join(tmpdir(), `repo-${Date.now()}`);

    const acq1 = acquireWriterLock({ workdir: cwd, taskId, writerId: "writer-A", pid: process.pid });
    assert.strictEqual(acq1.ok, true);

    // Different writer attempted while current process PID is active
    const acq2 = acquireWriterLock({ workdir: cwd, taskId, writerId: "writer-B", pid: process.pid });
    assert.strictEqual(acq2.ok, false);
    assert.strictEqual(acq2.error, "CONCURRENT_MUTATING_WRITER_FORBIDDEN");

    releaseWriterLock({ workdir: cwd, taskId, writerId: "writer-A" });
  });

  // 6. Recovery Capsule
  test("RecoveryCapsule: saves and loads structured capsule with repo fingerprint", () => {
    const taskId = `ZAM-CAP-${Date.now()}`;
    const saveRes = saveRecoveryCapsule({
      taskId,
      writerId: "writer-test",
      allowedFiles: ["AGENTS.md"],
      completedWork: ["Added delegation tests"],
      passingValidation: ["Unit tests green"],
      remainingDiagnostics: "None",
    });

    assert.strictEqual(saveRes.ok, true);
    assert.ok(existsSync(saveRes.path));

    const loadRes = loadRecoveryCapsule(taskId);
    assert.strictEqual(loadRes.ok, true);
    assert.strictEqual(loadRes.capsule.task_id, taskId);
    assert.strictEqual(loadRes.capsule.writer_id, "writer-test");
    assert.strictEqual(loadRes.capsule.allowed_files[0], "AGENTS.md");
    assert.strictEqual(loadRes.capsule.schema_version, "zamblak-recovery-capsule.v1");

    // Clean up
    if (existsSync(saveRes.path)) unlinkSync(saveRes.path);
  });

  process.stdout.write(`\nTest results: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
