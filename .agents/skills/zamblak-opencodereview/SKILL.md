---
name: zamblak-opencodereview
description: Deterministic OpenCodeReview delegation-packet preparation protocol. Prepares structured review packets (reviewable files, exclusions, resolved path rules, and domain background) via `ocr delegate preview` and `ocr delegate rule` without invoking OCR LLM paths.
---

# Zamblak OpenCodeReview Delegation Protocol

## Authority & Hierarchy

Root `AGENTS.md` and `zamblak-agent-control` govern repository workflow, task lifecycle, and safety gates. This skill provides **deterministic review-preparation expertise only**. It is NOT workflow authority and cannot authorize file mutations, staging, commits, or deployments.

## When to Route

Route `zamblak-opencodereview` **only** when a task explicitly requires:
1. Generating a deterministic OpenCodeReview delegation packet for independent review;
2. Resolving path-specific rules via `ocr delegate rule`;
3. Preparing targeted review packets for rereview following same-Writer repair.

Do **not** route this skill for routine application development, documentation edits, or when OCR tooling is unneeded or unconfigured.

## Core Principles & Guarantees

### 1. Delegation Mode Only (No OCR LLM Paths)
- Uses Alibaba OpenCodeReview strictly for deterministic review preparation:
  - `ocr delegate preview --format json`
  - `ocr delegate rule --format json`
- Strictly prohibits:
  - `ocr review`
  - `ocr llm test`
  - OCR-hosted LLM reasoning
  - Any OCR API keys, model provider setups, or billing credentials.
- The actual review reasoning, findings, and verdicts remain exclusively with the fresh Antigravity Reviewer launched via `zamblak-review-delegation`.

### 2. Optional Tooling Infrastructure
- OCR tooling is an optional preparation layer.
- Missing OCR is a HOLD only when the current task explicitly requires OCR-backed review.
- Ordinary repository work is never globally blocked merely because OCR is unavailable or unconfigured.

### 3. Strict Secret & Sensitive File Protection
- Review packets automatically enforce strict protection:
  - `.env*` files
  - Private keys (`*.key`, `*.pem`, `*.pfx`, `id_*`)
  - Certificates (`*.cert`, `*.crt`)
  - Secret and credential files (`*secret*`, `*credential*`)
  - Log files (`*.log`)
- Strictly protected files are never admitted to `reviewable_files` under any circumstances.

### 4. Preservation of User Exclusions
- Files excluded by `.opencodereview/rule.json` or `.gitignore` (such as `.opencodereview/**`, build output, lockfiles) are never re-admitted to the reviewable set.
- Target file filtering (`--target`) can narrow the review scope further, but can never expand past exclusion boundaries.

### 5. Deterministic External Artifacts
- Generated packets (`.json`) and formatted markdown summaries (`.md`) are stored in the OS temp directory outside the Git working tree (`%TEMP%/zamblak-delegation/packets/`).
- The working tree remains completely clean and unpolluted.

---

## Review Delegation Workflow

The complete OCR-backed review lifecycle follows:
```
Task Implementation Green
       │
       ▼
1. OCR Preview (`ocr delegate preview`)
       │
       ▼
2. OCR Rule Resolution (`ocr delegate rule`)
       │
       ▼
3. Structured Review Packet (`zamblak-ocr-packet.v1`)
       │
       ▼
4. Fresh Antigravity Reviewer (`zamblak-review-delegation`)
       │
       ├── Findings Identified
       │       ▼
       │   Same Logical Writer Repair
       │       ▼
       │   Targeted OCR Packet & Rereview
       │
       ▼ (Clean PASS)
5. Controller Final Verdict → Standing Owner Auto-Land
```

---

## Scripts & CLI Usage

### Check OCR Availability
```bash
node .agents/skills/zamblak-opencodereview/scripts/ocr-packet.mjs check [--cwd <repo>]
```

### Build Review Packet
```bash
node .agents/skills/zamblak-opencodereview/scripts/ocr-packet.mjs build \
  [--cwd <repo>] \
  [--rule .opencodereview/rule.json] \
  [-B .opencodereview/background.md] \
  [--target <comma-separated-files>] \
  [-c <commit>] \
  [--from <branch>] \
  [--to <branch>]
```
