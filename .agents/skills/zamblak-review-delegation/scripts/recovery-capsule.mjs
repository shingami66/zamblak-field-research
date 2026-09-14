#!/usr/bin/env node
/**
 * Zamblak Review Delegation · recovery-capsule.mjs
 *
 * Single-mutating-writer mutex and compact session Recovery Capsule manager.
 * Persists runtime metadata in the OS temp directory outside the Git working tree.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  unlinkSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { computeWorktreeFingerprint } from "./fingerprint.mjs";

export const CAPSULE_SCHEMA_VERSION = "zamblak-recovery-capsule.v1";
export const LOCK_SCHEMA_VERSION = "zamblak-writer-lock.v1";

export const LIVENESS_STATE = Object.freeze({
  CONFIRMED_ALIVE: "CONFIRMED_ALIVE",
  CONFIRMED_DEAD: "CONFIRMED_DEAD",
  AMBIGUOUS: "AMBIGUOUS",
});

/**
 * Returns the OS-local runtime storage directory.
 */
export function getRuntimeDir(subdir = "locks") {
  const dir = join(tmpdir(), "zamblak-delegation", subdir);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Computes lockfile path for a repository working directory.
 */
export function getLockFilePath(workdir) {
  const hash = createHash("sha256")
    .update((workdir || process.cwd()).toLowerCase())
    .digest("hex")
    .slice(0, 16);
  return join(getRuntimeDir("locks"), `writer-lock-${hash}.json`);
}

/**
 * Inspects process liveness with tri-state guarantee.
 */
export function inspectProcess(pid) {
  if (!pid || typeof pid !== "number") {
    return { state: LIVENESS_STATE.AMBIGUOUS, pid, startTime: null };
  }

  try {
    if (process.platform === "win32") {
      const psScript = `$p = Get-Process -Id ${pid} -ErrorAction SilentlyContinue; if ($null -eq $p) { Write-Output '{"state":"CONFIRMED_DEAD"}' } else { @{ state='CONFIRMED_ALIVE'; Id=$p.Id; ProcessName=$p.ProcessName; StartTime=$p.StartTime.ToUniversalTime().ToString('o') } | ConvertTo-Json -Compress }`;
      const res = spawnSync("powershell", ["-NoProfile", "-Command", psScript], {
        encoding: "utf8",
        timeout: 5000,
      });

      if (res.status === 0 && res.stdout.trim()) {
        try {
          const info = JSON.parse(res.stdout.trim());
          if (info.state === LIVENESS_STATE.CONFIRMED_DEAD) {
            return { state: LIVENESS_STATE.CONFIRMED_DEAD, pid, startTime: null };
          }
          return {
            state: LIVENESS_STATE.CONFIRMED_ALIVE,
            pid: info.Id,
            processName: info.ProcessName,
            startTime: info.StartTime || null,
          };
        } catch {
          return { state: LIVENESS_STATE.AMBIGUOUS, pid, startTime: null };
        }
      }
      return { state: LIVENESS_STATE.AMBIGUOUS, pid, startTime: null };
    }

    // POSIX fallback
    try {
      process.kill(pid, 0);
      const out = execFileSync("ps", ["-p", String(pid), "-o", "lstart="], {
        encoding: "utf8",
        timeout: 3000,
      }).trim();
      return { state: LIVENESS_STATE.CONFIRMED_ALIVE, pid, startTime: out || null };
    } catch (err) {
      if (err && err.code === "ESRCH") {
        return { state: LIVENESS_STATE.CONFIRMED_DEAD, pid, startTime: null };
      }
      return { state: LIVENESS_STATE.AMBIGUOUS, pid, startTime: null };
    }
  } catch {
    return { state: LIVENESS_STATE.AMBIGUOUS, pid, startTime: null };
  }
}

/**
 * Acquires mutating Writer lock atomically.
 */
export function acquireWriterLock({ workdir = process.cwd(), taskId, writerId, pid = process.pid }) {
  if (!taskId || !writerId) {
    return { ok: false, error: "MISSING_IDENTITY", message: "taskId and writerId are required" };
  }

  const lockFile = getLockFilePath(workdir);
  const procInfo = inspectProcess(pid);

  const lock = {
    schema_version: LOCK_SCHEMA_VERSION,
    task_id: taskId,
    writer_id: writerId,
    pid,
    process_start_time: procInfo.startTime || null,
    workdir,
    acquired_at: new Date().toISOString(),
  };

  try {
    writeFileSync(lockFile, JSON.stringify(lock, null, 2) + "\n", { flag: "wx", encoding: "utf8" });
    return { ok: true, lockFile, lock, newlyCreated: true };
  } catch (err) {
    if (err && err.code !== "EEXIST") {
      return { ok: false, error: "LOCK_WRITE_FAILED", message: err.message };
    }
  }

  // Lock file exists - check liveness
  let existing;
  try {
    existing = JSON.parse(readFileSync(lockFile, "utf8"));
  } catch {
    return { ok: false, error: "LOCK_UNREADABLE", message: "Existing lock unreadable. Safe stop." };
  }

  if (existing.writer_id === writerId && existing.task_id === taskId && existing.pid === pid) {
    return { ok: true, lockFile, lock: existing, reentrant: true };
  }

  const existingProc = inspectProcess(existing.pid);
  if (existingProc.state === LIVENESS_STATE.CONFIRMED_ALIVE) {
    return {
      ok: false,
      error: "CONCURRENT_MUTATING_WRITER_FORBIDDEN",
      message: `Active mutating Writer exists (PID ${existing.pid}, writer: ${existing.writer_id}, task: ${existing.task_id}). Concurrent mutating writers are strictly prohibited.`,
      existingLock: existing,
    };
  }

  if (existingProc.state === LIVENESS_STATE.AMBIGUOUS) {
    return {
      ok: false,
      error: "LOCK_LIVENESS_AMBIGUOUS",
      message: `PID ${existing.pid} liveness cannot be confirmed reliably. Refusing to reclaim lock.`,
      existingLock: existing,
    };
  }

  // Confirmed dead: reclaim
  try {
    unlinkSync(lockFile);
    writeFileSync(lockFile, JSON.stringify(lock, null, 2) + "\n", { flag: "wx", encoding: "utf8" });
    return { ok: true, lockFile, lock, reclaimed: true };
  } catch (reclaimErr) {
    return { ok: false, error: "LOCK_RECLAIM_FAILED", message: reclaimErr.message };
  }
}

/**
 * Releases mutating Writer lock.
 */
export function releaseWriterLock({ workdir = process.cwd(), taskId, writerId }) {
  const lockFile = getLockFilePath(workdir);
  if (!existsSync(lockFile)) return { ok: true, released: false };

  try {
    const existing = JSON.parse(readFileSync(lockFile, "utf8"));
    if (existing.writer_id === writerId && (!taskId || existing.task_id === taskId)) {
      unlinkSync(lockFile);
      return { ok: true, released: true };
    }
    return {
      ok: false,
      error: "LOCK_OWNERSHIP_MISMATCH",
      message: `Cannot release lock owned by writer "${existing.writer_id}" / task "${existing.task_id}"`,
    };
  } catch (err) {
    return { ok: false, error: "LOCK_RELEASE_FAILED", message: err.message };
  }
}

/**
 * Capsule path helper.
 */
export function getCapsulePath(taskId) {
  const safeId = String(taskId || "default").replace(/[^a-zA-Z0-9_-]/g, "_");
  return join(getRuntimeDir("capsules"), `capsule-${safeId}.json`);
}

/**
 * Creates and writes a compact Recovery Capsule.
 */
export function saveRecoveryCapsule({
  taskId,
  writerId,
  cwd = process.cwd(),
  allowedFiles = [],
  completedWork = [],
  passingValidation = [],
  remainingDiagnostics = "",
  protectedBoundaries = [],
}) {
  const fingerprint = computeWorktreeFingerprint(cwd);

  let branch = "main";
  try {
    branch = execFileSync("git", ["branch", "--show-current"], { cwd, encoding: "utf8" }).trim();
  } catch {
    // fallback
  }

  const capsule = {
    schema_version: CAPSULE_SCHEMA_VERSION,
    task_id: taskId,
    writer_id: writerId,
    created_at: new Date().toISOString(),
    cwd,
    branch,
    head_sha: fingerprint.head,
    fingerprint_hash: fingerprint.hash,
    dirty_count: fingerprint.dirtyCount,
    status_entries: fingerprint.statusEntries,
    allowed_files: allowedFiles,
    completed_work: completedWork,
    passing_validation: passingValidation,
    remaining_diagnostics: remainingDiagnostics,
    protected_boundaries: protectedBoundaries.length > 0
      ? protectedBoundaries
      : [
          "No .env modification or secret access",
          "No broad staging (git add . or wildcards)",
          "No unapproved DB/migration writes",
          "No force push or destructive Git operations",
          "Strict anti-contamination: No G7 CRM/accounting rules",
        ],
  };

  const path = getCapsulePath(taskId);
  writeFileSync(path, JSON.stringify(capsule, null, 2) + "\n", "utf8");
  return { ok: true, path, capsule };
}

/**
 * Loads an existing Recovery Capsule.
 */
export function loadRecoveryCapsule(taskId) {
  const path = getCapsulePath(taskId);
  if (!existsSync(path)) return { ok: false, error: "CAPSULE_NOT_FOUND", path };
  try {
    const data = JSON.parse(readFileSync(path, "utf8"));
    return { ok: true, path, capsule: data };
  } catch (err) {
    return { ok: false, error: "CAPSULE_CORRUPT", message: err.message, path };
  }
}

// CLI handler
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))) {
  const [cmd, ...args] = process.argv.slice(2);
  const getArg = (flag) => {
    const idx = args.indexOf(flag);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
  };

  if (cmd === "lock") {
    const res = acquireWriterLock({
      taskId: getArg("--task"),
      writerId: getArg("--writer"),
      workdir: getArg("--cwd") || process.cwd(),
    });
    process.stdout.write(JSON.stringify(res, null, 2) + "\n");
    process.exit(res.ok ? 0 : 1);
  } else if (cmd === "unlock") {
    const res = releaseWriterLock({
      taskId: getArg("--task"),
      writerId: getArg("--writer"),
      workdir: getArg("--cwd") || process.cwd(),
    });
    process.stdout.write(JSON.stringify(res, null, 2) + "\n");
    process.exit(res.ok ? 0 : 1);
  } else if (cmd === "inspect") {
    const res = loadRecoveryCapsule(getArg("--task"));
    process.stdout.write(JSON.stringify(res, null, 2) + "\n");
    process.exit(res.ok ? 0 : 1);
  } else {
    process.stdout.write("Usage: recovery-capsule.mjs <lock|unlock|inspect> [options]\n");
    process.exit(0);
  }
}
