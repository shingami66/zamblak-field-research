#!/usr/bin/env node
/**
 * Zamblak Review Delegation · delegate-reviewer.mjs
 *
 * Launches a fresh, independent, read-only Antigravity Reviewer context via `agy`.
 * Enforces worktree fingerprint integrity, headless execution without dangerous permissions,
 * and deterministic runtime report capture outside the Git working tree.
 */

import { spawn, execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { computeWorktreeFingerprint } from "./fingerprint.mjs";

export const DELEGATION_SCHEMA_VERSION = "zamblak-review-delegation.v1";

/**
 * Parses duration string (e.g., "10m", "300s") to milliseconds.
 */
export function parseDuration(val, defaultMs = 600_000) {
  if (!val) return defaultMs;
  const match = /^(\d+)(s|m|h)?$/.exec(String(val).trim());
  if (!match) return defaultMs;
  const count = parseInt(match[1], 10);
  const unit = match[2] || "s";
  if (unit === "h") return count * 3600 * 1000;
  if (unit === "m") return count * 60 * 1000;
  return count * 1000;
}

/**
 * Extracts conversation and project IDs from the agy log.
 */
export function parseAgyLog(logPath) {
  if (!existsSync(logPath)) return { projectId: null, conversationId: null };
  try {
    const text = readFileSync(logPath, "utf8");
    const projectMatch =
      text.match(/project: created project "[^"]*" \(id=([0-9a-f-]+)\)/i) ||
      text.match(/Conversation using project ID: ([0-9a-f-]+)/i) ||
      text.match(/Backend project ID updated dynamically to: ([0-9a-f-]+)/i);
    const conversationMatch =
      text.match(/Created conversation ([0-9a-f-]+)/i) ||
      text.match(/Print mode: conversation=([0-9a-f-]+)/i) ||
      text.match(/conversation=([0-9a-f-]+)/i);

    return {
      projectId: projectMatch ? projectMatch[1] : null,
      conversationId: conversationMatch ? conversationMatch[1] : null,
    };
  } catch {
    return { projectId: null, conversationId: null };
  }
}

/**
 * Parses CLI options.
 */
export function parseArgs(argv = process.argv.slice(2)) {
  const opts = {
    brief: null,
    briefFile: null,
    cwd: process.cwd(),
    outDir: null,
    model: null,
    effort: null,
    timeout: "10m",
    rereview: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dangerously-skip-permissions") {
      throw new Error("SECURITY VIOLATION: --dangerously-skip-permissions is strictly forbidden in Zamblak governance.");
    }
    if (arg === "--brief" && i + 1 < argv.length) {
      const val = argv[++i];
      if (existsSync(val)) {
        opts.briefFile = resolve(val);
        opts.brief = readFileSync(opts.briefFile, "utf8");
      } else {
        opts.brief = val;
      }
    } else if (arg === "--brief-file" && i + 1 < argv.length) {
      opts.briefFile = resolve(argv[++i]);
      opts.brief = readFileSync(opts.briefFile, "utf8");
    } else if (arg === "--cwd" && i + 1 < argv.length) {
      opts.cwd = resolve(argv[++i]);
    } else if (arg === "--out-dir" && i + 1 < argv.length) {
      opts.outDir = resolve(argv[++i]);
    } else if (arg === "--model" && i + 1 < argv.length) {
      opts.model = argv[++i];
    } else if (arg === "--effort" && i + 1 < argv.length) {
      opts.effort = argv[++i];
    } else if (arg === "--timeout" && i + 1 < argv.length) {
      opts.timeout = argv[++i];
    } else if (arg === "--rereview") {
      opts.rereview = true;
    }
  }

  if (!opts.brief) {
    throw new Error("Missing mandatory --brief <file|string>");
  }

  return opts;
}

/**
 * Dispatches the independent reviewer.
 */
export async function dispatchReviewer(opts) {
  const cwd = resolve(opts.cwd || process.cwd());
  const runId = `review-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const outDir = opts.outDir || join(tmpdir(), "zamblak-delegation", "reviews", runId);
  mkdirSync(outDir, { recursive: true });

  const logPath = join(outDir, "agy.log");
  const briefPath = join(outDir, "brief.txt");
  const resultPath = join(outDir, "result.json");
  const reportPath = join(outDir, "review-report.md");
  const stderrPath = join(outDir, "stderr.txt");

  writeFileSync(briefPath, opts.brief, "utf8");

  // Verify agy availability
  let agyVersion = "unknown";
  try {
    const probe = execFileSync("agy", ["changelog"], {
      encoding: "utf8",
      timeout: 10_000,
    }).trim();
    const firstLine = probe.split("\n").find(Boolean) || "";
    const m = firstLine.match(/^([^:\s]+):/);
    agyVersion = m ? m[1] : firstLine || "available";
  } catch (err) {
    throw new Error(`Antigravity CLI ('agy') is unavailable or failed probe: ${err.message}`);
  }

  // Pre-run worktree fingerprint
  const beforeFingerprint = computeWorktreeFingerprint(cwd);

  // Construct agy arguments
  // Strictly read-only via --mode plan, fresh project via --new-project, no dangerous permissions
  const agyArgs = [
    "--new-project",
    "--add-dir", cwd,
    "--mode", "plan",
    "--log-file", logPath,
    "--print-timeout", opts.timeout || "10m",
  ];

  if (opts.model) {
    agyArgs.push("--model", opts.model);
  }
  if (opts.effort) {
    agyArgs.push("--effort", opts.effort);
  }

  agyArgs.push(`--print=${opts.brief}`);

  const startTime = Date.now();
  const timeoutMs = parseDuration(opts.timeout, 600_000);

  let stdoutText = "";
  let stderrText = "";
  let exitCode = null;
  let exitSignal = null;
  let watchdogFired = false;

  const child = spawn("agy", agyArgs, {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });

  child.stdout.on("data", (chunk) => {
    const str = chunk.toString("utf8");
    stdoutText += str;
  });

  child.stderr.on("data", (chunk) => {
    const str = chunk.toString("utf8");
    stderrText += str;
  });

  const watchdog = setTimeout(() => {
    watchdogFired = true;
    try {
      if (process.platform === "win32") {
        execFileSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
      } else {
        child.kill("SIGKILL");
      }
    } catch {
      // ignore
    }
  }, timeoutMs);

  await new Promise((resolve) => {
    child.on("close", (code, signal) => {
      clearTimeout(watchdog);
      exitCode = code;
      exitSignal = signal;
      resolve();
    });
    child.on("error", (err) => {
      clearTimeout(watchdog);
      stderrText += `\nSPAWN_ERROR: ${err.message}\n`;
      exitCode = 127;
      resolve();
    });
  });

  const durationMs = Date.now() - startTime;
  writeFileSync(stderrPath, stderrText, "utf8");

  // Post-run worktree fingerprint
  const afterFingerprint = computeWorktreeFingerprint(cwd);

  const readOnlyViolation = beforeFingerprint.hash !== afterFingerprint.hash;

  // Extract fresh context IDs
  const { projectId, conversationId } = parseAgyLog(logPath);

  // Extract report from stdout
  const finalReport = stdoutText.trim();
  writeFileSync(reportPath, finalReport, "utf8");

  // Evaluate task verdict from report
  let extractedVerdict = "UNKNOWN";
  if (/TASK RESULT:\s*PASS WITH WARN/i.test(finalReport)) {
    extractedVerdict = "PASS WITH WARN";
  } else if (/TASK RESULT:\s*PASS/i.test(finalReport)) {
    extractedVerdict = "PASS";
  } else if (/TASK RESULT:\s*HOLD/i.test(finalReport)) {
    extractedVerdict = "HOLD";
  } else if (/TASK RESULT:\s*PARTIAL/i.test(finalReport)) {
    extractedVerdict = "PARTIAL";
  } else if (/TASK RESULT:\s*FAIL/i.test(finalReport)) {
    extractedVerdict = "FAIL";
  }

  let finalStatus = "COMPLETED";
  let failureReason = null;

  const permissionDenied = /no output produced\s+[—-]\s+a tool required the "([^"]+)" permission that headless\s+mode cannot prompt for/i.exec(stderrText);

  if (watchdogFired) {
    finalStatus = "TIMEOUT";
    failureReason = `Reviewer exceeded timeout (${opts.timeout})`;
  } else if (readOnlyViolation) {
    finalStatus = "FAIL_READ_ONLY_VIOLATION";
    failureReason = "REVIEWER_MUTATION_VIOLATION: Read-only reviewer modified the Git worktree!";
  } else if (permissionDenied) {
    finalStatus = "FAILED_PERMISSION_DENIED";
    failureReason = `A tool required the "${permissionDenied[1]}" permission that headless mode cannot prompt for. Headless review briefs should instruct the reviewer to use view_file and avoid running shell commands.`;
  } else if (exitCode !== 0) {
    finalStatus = "FAILED";
    failureReason = `agy exited with code ${exitCode} (${exitSignal || "none"})`;
  } else if (!finalReport) {
    finalStatus = "FAILED_EMPTY_REPORT";
    failureReason = "Reviewer process exited 0 but produced no report output.";
  }

  const result = {
    schema_version: DELEGATION_SCHEMA_VERSION,
    run_id: runId,
    timestamp: new Date().toISOString(),
    status: finalStatus,
    exit_code: exitCode,
    exit_signal: exitSignal,
    duration_ms: durationMs,
    agy_version: agyVersion,
    is_rereview: opts.rereview,
    context_isolation: {
      fresh_context_proven: Boolean(conversationId),
      project_id: projectId,
      conversation_id: conversationId,
    },
    worktree_integrity: {
      read_only_passed: !readOnlyViolation,
      before_hash: beforeFingerprint.hash,
      after_hash: afterFingerprint.hash,
      before_dirty_count: beforeFingerprint.dirtyCount,
      after_dirty_count: afterFingerprint.dirtyCount,
    },
    reviewer_output: {
      extracted_verdict: extractedVerdict,
      report_length: finalReport.length,
      failure_reason: failureReason,
    },
    artifacts: {
      out_dir: outDir,
      brief_file: briefPath,
      result_file: resultPath,
      report_file: reportPath,
      log_file: logPath,
      stderr_file: stderrPath,
    },
  };

  writeFileSync(resultPath, JSON.stringify(result, null, 2) + "\n", "utf8");

  return {
    ok: finalStatus === "COMPLETED" && !readOnlyViolation,
    result,
    finalReport,
  };
}

// CLI entry point
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))) {
  (async () => {
    try {
      const opts = parseArgs(process.argv.slice(2));
      const { ok, result, finalReport } = await dispatchReviewer(opts);

      process.stdout.write(`\n=== REVIEWER DELEGATION RESULT ===\n`);
      process.stdout.write(`Run ID: ${result.run_id}\n`);
      process.stdout.write(`Status: ${result.status}\n`);
      process.stdout.write(`Fresh Conversation: ${result.context_isolation.conversation_id || "none"}\n`);
      process.stdout.write(`Worktree Mutation: ${result.worktree_integrity.read_only_passed ? "NONE (PASS)" : "VIOLATION (FAIL)"}\n`);
      process.stdout.write(`Extracted Verdict: ${result.reviewer_output.extracted_verdict}\n`);
      process.stdout.write(`Artifacts: ${result.artifacts.out_dir}\n`);
      process.stdout.write(`\n--- REVIEWER REPORT ---\n${finalReport}\n-----------------------\n`);

      process.exit(ok ? 0 : 1);
    } catch (err) {
      process.stderr.write(`delegate-reviewer error: ${err.message}\n`);
      process.exit(2);
    }
  })();
}
