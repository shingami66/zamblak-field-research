---
name: zamblak-review-delegation
description: Antigravity-native delegation protocol. Dispatches fresh read-only independent review contexts, enforces worktree fingerprint integrity, captures review reports in runtime artifacts, supports targeted rereview, and manages session recovery capsules under AGENTS.md.
---

# Zamblak Review Delegation Protocol

## Authority & Hierarchy

Root `AGENTS.md` and `zamblak-agent-control` govern repository workflow, task lifecycle, and safety gates. This skill operationalizes Antigravity-native delegation for independent review and session recovery without expanding task authority or modifying application behavior.

## When to Route

Route `zamblak-review-delegation` **only** when a task:
1. Requires launching a fresh independent Reviewer context through the Antigravity harness;
2. Requires performing a targeted independent rereview following same-Writer repair;
3. Requires saving, verifying, or resuming an interrupted Writer session via a Recovery Capsule.

Do **not** route this skill for routine implementation, documentation editing, local unit testing, or pre-commit checks.

## Core Architectural Guarantees

### 1. Fresh Independent Native Context
- Dispatches a genuinely separate Antigravity session using the local `agy` CLI (`agy --new-project --add-dir <repo> --mode plan -p <brief>`).
- Context separation is proven via distinct `projectId` and `conversationId` captured from execution logs.
- Writer reasoning context is never reused as a reviewer.

### 2. Strictly Read-Only & Findings-Only
- Reviewer operates exclusively in plan mode (`--mode plan`).
- The Reviewer has zero authority to edit, stage, commit, push, deploy, apply migrations, mutate Supabase, or access credentials.

### 3. No Dangerous Permissions
- The delegation harness strictly prohibits `--dangerously-skip-permissions`.
- Passing or attempting to pass dangerous permission flags aborts immediately with a security error.

### 4. Worktree Fingerprinting & Fail-Closed Integrity
- Deterministic SHA-256 fingerprint of the Git worktree (`git status`, `git rev-parse HEAD`, cached diff, and working-tree diff) is computed before and after review.
- If any change is detected between the pre-review and post-review fingerprints, the harness fails closed with `REVIEWER_MUTATION_VIOLATION`.

### 5. Deterministic Runtime Artifacts
- All review run artifacts (brief, `agy.log`, `stderr.txt`, `result.json`, `review-report.md`) are stored in an OS-local directory outside the Git repository (`%TEMP%/zamblak-delegation/reviews/<run-id>`).
- The Git working tree remains completely clean and unpolluted by review logs.

### 6. Targeted Rereview
- When in-scope findings are repaired by the same logical Writer lane, a targeted rereview is dispatched with `--rereview`.
- The rereview brief focuses strictly on repaired files, original findings, direct contracts, and collateral risk without repeating historical discovery.

### 7. Session Recovery & Single-Mutating-Writer Lock
- Interrupted Writer sessions are preserved using a compact Recovery Capsule (`zamblak-recovery-capsule.v1`).
- An atomic process lock (`zamblak-writer-lock.v1`) with tri-state process liveness inspection guarantees that exactly one mutating Writer lane is active per working tree. Concurrent mutating Writers are strictly forbidden.

### 8. Antigravity-Only Scope
- Provider scope is Antigravity-native (`agy`). No external provider adapters or complex cross-provider state machines are introduced.

---

## Scripts & CLI Usage

### Dispatch Independent Reviewer

```bash
node .agents/skills/zamblak-review-delegation/scripts/delegate-reviewer.mjs \
  --brief <brief-file-or-string> \
  --cwd <repo-path> \
  [--timeout 10m] \
  [--model <model-name>] \
  [--rereview]
```

### Inspect Worktree Fingerprint

```bash
node .agents/skills/zamblak-review-delegation/scripts/fingerprint.mjs [repo-path]
```

### Manage Recovery Capsule & Writer Mutex

```bash
# Acquire writer lock
node .agents/skills/zamblak-review-delegation/scripts/recovery-capsule.mjs lock --task <task-id> --writer <writer-id>

# Release writer lock
node .agents/skills/zamblak-review-delegation/scripts/recovery-capsule.mjs unlock --task <task-id> --writer <writer-id>

# Inspect recovery capsule
node .agents/skills/zamblak-review-delegation/scripts/recovery-capsule.mjs inspect --task <task-id>
```
