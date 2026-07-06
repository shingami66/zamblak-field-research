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
- Only stage the exact files named in the task instructions.
- Never use `git add .` or wildcard staging.

## Required Checks
Before committing, you must run and verify the following:
1. `git status --short`: Verify the repository state.
2. `git diff --check`: Check for whitespace or conflict marker errors.
3. `git diff --cached --check`: Check staged files specifically.
4. **Inspect Intended File List**: Confirm only approved files are staged.
5. **Verify No `.env` or Secrets**: Ensure no environment variables or credentials are leaked.
6. **Verify No Unintended Files**: Look for accidental scratch files, logs, or node_modules.
7. **Verify No Migration Apply Happened**: Confirm no database state changes occurred unless explicitly approved by the task mode.

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
- Documentation mismatch (code changed but required docs were not updated).

## Commit-Only and Push-Only Safety Notes
- `COMMIT_ONLY` tasks must not push to the remote.
- `PUSH_ONLY` tasks must not create new commits.
- A PASS on precommit validation is required before proceeding to the actual `git commit` command.

## Output Format
Final report must clearly list the branch, exact files staged, validation command outputs, and end with a structured PASS/HOLD.
