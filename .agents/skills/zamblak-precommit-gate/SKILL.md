---
name: zamblak-precommit-gate
description: Gatekeeper for Zamblak before staging, committing, or pushing. Enforces strict file staging, no-secret rules, and precommit checks.
---

# Zamblak Precommit Gate

## Purpose
Ensures that no unauthorized, unintended, or dangerous files are staged or committed. Validates git history and file states before persisting changes.

## When to Use
Use this skill in `PRECOMMIT_REVIEW_ONLY` or `COMMIT_ONLY` tasks, before any `git commit` or `git push` action.

## Exact-File Staging Only
- Treat the prompt's expected baseline as a strict boundary.
- Verify the intended inventory before staging: modified files, untracked files, staged files, generated drift, and forbidden files.
- Only stage the exact files named in the task instructions.
- Never use `git add .`, `git add -A`, `git add --all`, or wildcard staging.
- Do not infer extra files from related changes.

## Required Checks
Before committing, you must run and verify the following:
1. `git status --short`: Verify the repository state.
2. `git diff --check`: Check for whitespace or conflict marker errors.
3. `git diff --cached --check`: Check staged files specifically.
4. `git config user.name` and `git config user.email`: Verify the Git author before commit.
5. `git diff --cached --name-only`: Confirm the staged inventory is exact.
6. `git diff --cached --stat`: Confirm the staged surface is narrow.
7. **Inspect Intended File List**: Confirm only approved files are staged.
8. **Verify No `.env` or Secrets**: Ensure no environment variables or credentials are leaked.
9. **Verify No Unintended Files**: Look for accidental scratch files, logs, or node_modules.
10. **Verify No Migration Apply Happened**: Confirm no database state changes occurred unless explicitly approved by the task mode.

## Commit Message Rules
- **Clear Scope**: Format clearly (e.g., `feat:`, `fix:`, `docs:`).
- **No Fake Claims**: Do not state features are "complete" if they are only partially implemented.
- **No “applied to Supabase”**: Never claim database application in a commit message unless a `SUPABASE_APPLY_ONLY` task was successfully executed and verified.

## HOLD Conditions
Return HOLD immediately if any of the following occur:
- Unexpected or unapproved files are modified or staged.
- `.env` files or secrets are detected in the diff.
- Evidence of destructive commands (e.g., dropped tables, deleted source files without authorization).
- Broad staging (`git add .`) was attempted.
- `git diff --check` fails with unresolved issues.
- `git diff --cached --check` fails or the staged inventory is not exact.
- The Git author does not match the approved identity.
- Documentation mismatch (code changed but required docs were not updated).

## Commit-Only and Push-Only Safety Notes
- `COMMIT_ONLY` tasks must not push to the remote.
- `PUSH_ONLY` tasks must not create new commits.
- A PASS on precommit validation is required before proceeding to the actual `git commit` command.
- Commit-only ends with a local commit and a clean tree; push-only starts from an already verified commit and ends with remote alignment only.

## Drift and recovery
- Inspect `next-env.d.ts`, `implementation_plan.md`, lockfiles, and other generated drift when they are part of the prompt baseline.
- If drift is unexpected, HOLD and preserve state; do not restore or unstage unless the current task explicitly authorizes a narrow recovery step.
- A narrow recovery task must name the blocker, limit files, rerun `git diff --check`, and return to review before commit or push.

## Output Format
Final report must clearly list the branch, exact files staged, validation command outputs, and end with a structured PASS/HOLD.
