#!/usr/bin/env node
/**
 * Zamblak Review Delegation · fingerprint.mjs
 *
 * Deterministic Git worktree fingerprinting for read-only mutation verification.
 * Uses SHA-256 over status, HEAD, cached diff, and unstaged diff.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";

/**
 * Computes a deterministic SHA-256 fingerprint of the current Git worktree state.
 * @param {string} cwd - Repository working directory.
 * @returns {{ hash: string, head: string, dirtyCount: number, statusLines: string[] }}
 */
export function computeWorktreeFingerprint(cwd = process.cwd()) {
  const git = (args) =>
    execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      timeout: 15_000,
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 32 * 1024 * 1024,
    });

  let root = cwd;
  try {
    root = realpathSync.native(git(["rev-parse", "--show-toplevel"]).trim());
  } catch {
    // fallback to cwd
  }

  let head = "";
  try {
    head = git(["rev-parse", "HEAD"]).trim();
  } catch {
    head = "UNBORN";
  }

  // Porcelain status with all untracked files
  const statusOutput = git([
    "status",
    "--porcelain=v1",
    "-z",
    "--untracked-files=all",
    "--no-renames",
  ]);

  // Cached diff (staged)
  const cachedDiff = git([
    "diff",
    "--cached",
    "--raw",
    "--full-index",
    "--no-renames",
    "-z",
  ]);

  // Unstaged diff
  const worktreeDiff = git([
    "diff",
    "--raw",
    "--full-index",
    "--no-renames",
    "-z",
  ]);

  const hasher = createHash("sha256");
  hasher.update("head\0").update(head);
  hasher.update("\0status\0").update(statusOutput);
  hasher.update("\0cached\0").update(cachedDiff);
  hasher.update("\0worktree\0").update(worktreeDiff);

  const statusEntries = statusOutput.split("\0").filter(Boolean);
  const hash = hasher.digest("hex");

  return {
    hash,
    head,
    root,
    dirtyCount: statusEntries.length,
    statusEntries,
  };
}

// CLI entry point
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))) {
  try {
    const targetCwd = process.argv[2] || process.cwd();
    const result = computeWorktreeFingerprint(targetCwd);
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } catch (err) {
    process.stderr.write(`fingerprint error: ${err.message || String(err)}\n`);
    process.exit(1);
  }
}
