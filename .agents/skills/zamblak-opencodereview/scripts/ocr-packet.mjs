#!/usr/bin/env node
/**
 * Zamblak OpenCodeReview · ocr-packet.mjs
 *
 * Deterministic host utility for OpenCodeReview delegation packet preparation.
 * Interacts only with `ocr delegate preview` and `ocr delegate rule`.
 * Strictly prohibits `ocr review` and `ocr llm test`. Requires zero LLM credentials.
 * Stores packets in OS temp runtime directory outside the Git working tree.
 */

import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

export const OCR_PACKET_SCHEMA_VERSION = "zamblak-ocr-packet.v1";
const MAX_BATCH_FILES = 15;
const MAX_BATCH_BYTES = 4096;

export const STRICTLY_PROTECTED_PATTERNS = [
  /(^|[/\\])\.env/i,
  /\.(key|pem|cert|pfx|pkcs12)$/i,
  /(^|[/\\])id_[a-z0-9_]+$/i,
  /(^|[/\\])(secrets?|credentials?)\.[a-z0-9]+$/i,
  /\.log$/i,
];

/**
 * Returns OS temp directory for review packets.
 */
export function getRuntimePacketDir() {
  const dir = join(tmpdir(), "zamblak-delegation", "packets");
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Checks if a path matches strictly protected secret/credential patterns.
 */
export function isStrictlyProtected(filePath) {
  const norm = String(filePath || "").replaceAll("\\", "/");
  for (const pat of STRICTLY_PROTECTED_PATTERNS) {
    if (pat.test(norm)) return true;
  }
  return false;
}

/**
 * Probes whether the OCR CLI is installed and available.
 */
export function checkOcrAvailability(cwd = process.cwd()) {
  const isWin = process.platform === "win32";
  try {
    const res = spawnSync("ocr", ["--version"], {
      cwd,
      encoding: "utf8",
      timeout: 10_000,
      shell: isWin,
    });
    if (res.status === 0) {
      const firstLine = (res.stdout || "").split("\n").find(Boolean) || "ocr available";
      return { available: true, version: firstLine.trim() };
    }
    return { available: false, version: null, error: res.stderr || "exit non-zero" };
  } catch (err) {
    return { available: false, version: null, error: err.message };
  }
}

/**
 * Runs `ocr delegate preview --format json`.
 */
export function runOcrPreview({ cwd = process.cwd(), ruleFile, backgroundFile, commit, from, to }) {
  const isWin = process.platform === "win32";
  const args = ["delegate", "preview", "--format", "json"];

  if (commit) args.push("-c", commit);
  if (from) args.push("--from", from);
  if (to) args.push("--to", to);
  if (ruleFile) args.push("--rule", ruleFile);
  if (backgroundFile) args.push("-B", backgroundFile);

  const res = spawnSync("ocr", args, {
    cwd,
    encoding: "utf8",
    timeout: 30_000,
    shell: isWin,
  });

  if (res.error) {
    throw new Error(`OCR_PREVIEW_SPAWN_ERROR: ${res.error.message}`);
  }
  if (res.status !== 0) {
    throw new Error(`OCR_PREVIEW_FAILED (${res.status}): ${res.stderr || res.stdout}`);
  }

  try {
    return JSON.parse(res.stdout);
  } catch (err) {
    throw new Error(`OCR_PREVIEW_INVALID_JSON: ${err.message}\nOutput: ${res.stdout.slice(0, 300)}`);
  }
}

/**
 * Runs `ocr delegate rule --format json <files...>` in bounded batches.
 */
export function runOcrRules(files, { cwd = process.cwd(), ruleFile, backgroundFile }) {
  if (!files || files.length === 0) {
    return [];
  }

  const isWin = process.platform === "win32";
  const allGroups = [];
  let groupId = 1;

  // Split into manageable batches
  const batches = [];
  let currentBatch = [];
  let currentBytes = 0;

  for (const f of files) {
    const fileBytes = Buffer.byteLength(f, "utf8");
    if (currentBatch.length >= MAX_BATCH_FILES || currentBytes + fileBytes > MAX_BATCH_BYTES) {
      if (currentBatch.length > 0) batches.push(currentBatch);
      currentBatch = [f];
      currentBytes = fileBytes;
    } else {
      currentBatch.push(f);
      currentBytes += fileBytes;
    }
  }
  if (currentBatch.length > 0) batches.push(currentBatch);

  for (const batch of batches) {
    const args = ["delegate", "rule", "--format", "json"];
    if (ruleFile) args.push("--rule", ruleFile);
    if (backgroundFile) args.push("-B", backgroundFile);
    args.push(...batch);

    const res = spawnSync("ocr", args, {
      cwd,
      encoding: "utf8",
      timeout: 30_000,
      shell: isWin,
    });

    if (res.status !== 0) {
      throw new Error(`OCR_RULE_RESOLVE_FAILED (${res.status}): ${res.stderr || res.stdout}`);
    }

    try {
      const parsed = JSON.parse(res.stdout);
      if (Array.isArray(parsed.groups)) {
        for (const grp of parsed.groups) {
          allGroups.push({
            ...grp,
            group_id: groupId++,
          });
        }
      }
    } catch (err) {
      throw new Error(`OCR_RULE_INVALID_JSON: ${err.message}`);
    }
  }

  return allGroups;
}

/**
 * Builds a structured, validated review packet.
 */
export function buildReviewPacket({
  cwd = process.cwd(),
  ruleFile = ".opencodereview/rule.json",
  backgroundFile = ".opencodereview/background.md",
  targetFiles = null,
  commit = null,
  from = null,
  to = null,
  outDir = null,
}) {
  const resolvedCwd = resolve(cwd);
  const resolvedRule = ruleFile && existsSync(join(resolvedCwd, ruleFile))
    ? join(resolvedCwd, ruleFile)
    : (ruleFile && existsSync(ruleFile) ? ruleFile : null);
  const resolvedBg = backgroundFile && existsSync(join(resolvedCwd, backgroundFile))
    ? join(resolvedCwd, backgroundFile)
    : (backgroundFile && existsSync(backgroundFile) ? backgroundFile : null);

  const preview = runOcrPreview({
    cwd: resolvedCwd,
    ruleFile: resolvedRule,
    backgroundFile: resolvedBg,
    commit,
    from,
    to,
  });

  const rawReviewable = Array.isArray(preview.reviewable_files) ? preview.reviewable_files : [];
  const rawExcluded = Array.isArray(preview.excluded_files) ? preview.excluded_files : [];

  const reviewableFiles = [];
  const protectedExclusions = [];
  const targetFilterExclusions = [];

  // Normalize target paths if supplied
  const targetSet = targetFiles
    ? new Set(targetFiles.map((t) => t.replaceAll("\\", "/").replace(/^\.\//, "")))
    : null;

  for (const item of rawReviewable) {
    const itemPath = (typeof item === "string" ? item : item.path || "").replaceAll("\\", "/");

    // 1. Strict protection check
    if (isStrictlyProtected(itemPath)) {
      protectedExclusions.push({
        path: itemPath,
        reason: "STRICTLY_PROTECTED_FILE",
      });
      continue;
    }

    // 2. Target filter check (if targetFiles specified)
    if (targetSet) {
      const matches = [...targetSet].some(
        (target) => itemPath === target || itemPath.startsWith(`${target}/`)
      );
      if (!matches) {
        targetFilterExclusions.push({
          path: itemPath,
          reason: "OUTSIDE_TASK_TARGET_FILES",
        });
        continue;
      }
    }

    reviewableFiles.push(typeof item === "string" ? { path: itemPath, status: "modified" } : item);
  }

  // Double check excluded files to ensure no user-excluded file is admitted
  const finalExcludedFiles = [
    ...rawExcluded,
    ...protectedExclusions,
    ...targetFilterExclusions,
  ];

  // Resolve rules for the reviewable paths
  const pathsToResolve = reviewableFiles.map((f) => (typeof f === "string" ? f : f.path));
  let ruleGroups = [];
  if (pathsToResolve.length > 0) {
    ruleGroups = runOcrRules(pathsToResolve, {
      cwd: resolvedCwd,
      ruleFile: resolvedRule,
      backgroundFile: resolvedBg,
    });
  }

  const packetId = `ocr-packet-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const packetOutDir = outDir || getRuntimePacketDir();
  mkdirSync(packetOutDir, { recursive: true });

  const packet = {
    schema_version: OCR_PACKET_SCHEMA_VERSION,
    packet_id: packetId,
    generated_at: new Date().toISOString(),
    repository: resolvedCwd,
    mode: preview.mode || "workspace",
    summary: {
      total_files: preview.total_files || (reviewableFiles.length + finalExcludedFiles.length),
      reviewable_count: reviewableFiles.length,
      excluded_count: finalExcludedFiles.length,
      protected_count: protectedExclusions.length,
      rule_groups_count: ruleGroups.length,
    },
    reviewable_files: reviewableFiles,
    excluded_files: finalExcludedFiles,
    protected_exclusions: protectedExclusions,
    rule_groups: ruleGroups,
    background: preview.background || "",
  };

  const packetJsonPath = join(packetOutDir, `${packetId}.json`);
  writeFileSync(packetJsonPath, JSON.stringify(packet, null, 2) + "\n", "utf8");

  // Formatted markdown summary for insertion into Reviewer briefs
  const mdSummary = formatPacketMarkdown(packet);
  const packetMdPath = join(packetOutDir, `${packetId}.md`);
  writeFileSync(packetMdPath, mdSummary, "utf8");

  return {
    ok: true,
    packetId,
    packet,
    packetJsonPath,
    packetMdPath,
    mdSummary,
  };
}

/**
 * Formats a concise Markdown summary of the packet for Reviewer prompts.
 */
export function formatPacketMarkdown(packet) {
  const lines = [
    `### OpenCodeReview Delegation Packet (${packet.packet_id})`,
    `- **Reviewable Files (${packet.summary.reviewable_count}):**`,
  ];

  if (packet.reviewable_files.length === 0) {
    lines.push("  *(No reviewable source files identified)*");
  } else {
    for (const f of packet.reviewable_files) {
      const p = typeof f === "string" ? f : f.path;
      lines.push(`  - \`${p}\``);
    }
  }

  lines.push(`- **Excluded Files (${packet.summary.excluded_count}):**`);
  for (const f of packet.excluded_files.slice(0, 10)) {
    const p = typeof f === "string" ? f : f.path;
    const r = f.exclude_reason || f.reason || "excluded";
    lines.push(`  - \`${p}\` (${r})`);
  }
  if (packet.excluded_files.length > 10) {
    lines.push(`  - ... and ${packet.excluded_files.length - 10} more`);
  }

  if (packet.rule_groups.length > 0) {
    lines.push(`- **Applicable Review Rules (${packet.rule_groups.length} groups):**`);
    for (const grp of packet.rule_groups) {
      lines.push(`  - **Group ${grp.group_id}** (Pattern: \`${grp.pattern || "*"}\`):`);
      const filesStr = (grp.files || []).map((f) => `\`${f}\``).join(", ");
      lines.push(`    Files: ${filesStr}`);
      const ruleExcerpt = (grp.rule || "").split("\n")[0].slice(0, 120);
      lines.push(`    Rule: ${ruleExcerpt}...`);
    }
  }

  return lines.join("\n");
}

// CLI handler
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))) {
  const args = process.argv.slice(2);
  const getArg = (flag) => {
    const idx = args.indexOf(flag);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
  };

  try {
    const cmd = args[0] || "build";
    if (cmd === "check") {
      const avail = checkOcrAvailability(getArg("--cwd") || process.cwd());
      process.stdout.write(JSON.stringify(avail, null, 2) + "\n");
      process.exit(avail.available ? 0 : 1);
    } else if (cmd === "build") {
      const targetStr = getArg("--target");
      const targetFiles = targetStr ? targetStr.split(",").map((s) => s.trim()) : null;

      const res = buildReviewPacket({
        cwd: getArg("--cwd") || process.cwd(),
        ruleFile: getArg("--rule") || ".opencodereview/rule.json",
        backgroundFile: getArg("-B") || getArg("--background-file") || ".opencodereview/background.md",
        targetFiles,
        commit: getArg("-c"),
        from: getArg("--from"),
        to: getArg("--to"),
        outDir: getArg("--out-dir"),
      });

      process.stdout.write(`\n=== OCR DELEGATION PACKET GENERATED ===\n`);
      process.stdout.write(`Packet ID: ${res.packetId}\n`);
      process.stdout.write(`Reviewable Count: ${res.packet.summary.reviewable_count}\n`);
      process.stdout.write(`Excluded Count: ${res.packet.summary.excluded_count}\n`);
      process.stdout.write(`Rule Groups: ${res.packet.summary.rule_groups_count}\n`);
      process.stdout.write(`JSON Path: ${res.packetJsonPath}\n`);
      process.stdout.write(`Markdown Path: ${res.packetMdPath}\n\n`);
      process.stdout.write(res.mdSummary + "\n");
      process.exit(0);
    } else {
      process.stdout.write("Usage: ocr-packet.mjs <build|check> [options]\n");
      process.exit(0);
    }
  } catch (err) {
    process.stderr.write(`ocr-packet error: ${err.message}\n`);
    process.exit(1);
  }
}
