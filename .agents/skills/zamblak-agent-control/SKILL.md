---
name: zamblak-agent-control
description: Core execution protocol for Zamblak agents. Enforces execution modes, task boundaries, validation expectations, and strict PASS/HOLD reporting.
---

# Zamblak Agent Control Protocol

## Purpose
Enforce a controlled execution environment for all Zamblak agents. The agent is an executor bound by strict workflow constraints, not an autonomous decision maker.

## When to Use
Use this skill for all tasks. It governs task orchestration, execution modes, and lifecycle management.

## Mandatory First-Run Gate
Every task must explicitly read `AGENTS.md` and `.agents/skills/zamblak-agent-control/SKILL.md` before execution.
If this skill is inaccessible or unreadable, the agent must immediately return:
```text
TASK RESULT: HOLD
Reason: zamblak-agent-control unavailable.
```

## Task Classification System
Before executing, the agent must classify the task and assign an exact execution mode. If no mode is specified in the prompt, default to `READONLY_REVIEW_ONLY`. If task instructions require actions exceeding the requested mode's boundaries, return HOLD.

## Required Task Header Expectations
All final task reports must start precisely with `PASS/HOLD`, followed by `Task: <Task ID>`, `Files modified`, and detailed validation reports matching the requested format.

## Allowed and Forbidden Files Discipline
- The agent must only modify files explicitly approved by the task mode or prompt.
- If unexpected files are modified, return HOLD.

## Execution Modes

### READONLY_REVIEW_ONLY
- **Allowed Actions:** Read files, produce review reports, run safe inspection commands (`git status`, `git diff`, `git log`).
- **Forbidden Actions:** Modifying files, staging, committing, pushing, Supabase connection, running migrations, starting servers.
- **Validation:** Raw status, diff snippets, and review verdict.
- **Output:** PASS/HOLD report.

### SQL_DRAFT_ONLY
- **Allowed Actions:** Read files, draft SQL in response, write to a new `.sql` file only if explicitly named by the user.
- **Forbidden Actions:** Applying SQL, Supabase connection, staging, committing, pushing, runtime code changes.
- **Validation:** Raw SQL draft, confirmation no SQL was applied.
- **Output:** PASS/HOLD report.

### SQL_DRAFT_FIX_ONLY
- **Allowed Actions:** Read files, modify existing migration/SQL draft files explicitly named.
- **Forbidden Actions:** Applying SQL, Supabase connection, staging, committing, pushing.
- **Validation:** Raw file diffs, confirmation no SQL was applied.
- **Output:** PASS/HOLD report.

### SKILLS_GOVERNANCE_FIX_ONLY
- **Allowed Actions:** Modify `.agents/skills/*` files, `AGENTS.md`, and project documentation status.
- **Forbidden Actions:** Editing runtime code, editing migrations, applying SQL, Supabase connection, staging, committing, pushing.
- **Validation:** Raw diffs of modified governance files.
- **Output:** PASS/HOLD report.

### DOCS_SYNC_ONLY
- **Allowed Actions:** Modify explicit `docs/*` or `specs/*` files.
- **Forbidden Actions:** Editing code or migrations, applying SQL, staging, committing, pushing.
- **Validation:** Raw diffs of modified docs.
- **Output:** PASS/HOLD report.

### IMPLEMENT_NO_STAGE
- **Allowed Actions:** Modify application files (`src/`, `app/`, components) as instructed. Run local builds/tests.
- **Forbidden Actions:** Staging, committing, pushing, applying migrations, Supabase connection.
- **Validation:** Raw `git diff --name-only`, build/test results.
- **Output:** PASS/HOLD report.

### SUPABASE_APPLY_PRECHECK_ONLY
- **Allowed Actions:** Read schema, migration files, and `AGENTS.md` to verify readiness for DB apply.
- **Forbidden Actions:** Actually applying the migration, connecting to Supabase, modifying files.
- **Validation:** Raw verification checklist showing all conditions are met.
- **Output:** PASS/HOLD report.

### SUPABASE_APPLY_ONLY
- **Allowed Actions:** Execute explicitly approved SQL or Supabase migration commands.
- **Forbidden Actions:** Modifying code files, staging, committing, pushing. Inventing new write SQL.
- **Validation:** Raw SQL/command executed, execution results.
- **Output:** PASS/HOLD report.

### PRECOMMIT_REVIEW_ONLY
- **Allowed Actions:** Read `git status`, `git diff`, `git diff --cached`.
- **Forbidden Actions:** Modifying files, staging, committing, pushing, DB application.
- **Validation:** Precommit checks passed/failed.
- **Output:** PASS/HOLD report.

### COMMIT_ONLY
- **Allowed Actions:** Stage explicitly named files. Commit with approved message.
- **Forbidden Actions:** Modifying files, using `git add .`, pushing, applying migrations.
- **Validation:** Raw `git status`, staged file list, commit hash.
- **Output:** PASS/HOLD report.

### PUSH_ONLY
- **Allowed Actions:** Push approved existing commits to the designated branch.
- **Forbidden Actions:** Modifying files, staging, committing, applying migrations.
- **Validation:** Raw log showing commit, push output, post-push status.
- **Output:** PASS/HOLD report.

## Absolute Prohibitions
- No `.env` reading, printing, or modifying unless explicitly authorized.
- No exposure of secrets in responses or logs.
- Never run `git add .`.
- No commit without explicit approval.
- No push without explicit approval.
- No migration apply without explicit approval.
- No destructive git commands (`git reset`, `git clean`) without explicit approval.
- No Supabase connection unless the task mode explicitly allows it.

## Smallest Relevant Skill Stack Only
Agents must invoke only the skills absolutely necessary for the task context to minimize execution surface area.

## Stop-and-Report Behavior on Ambiguity
If instructions are ambiguous, conflict with execution modes, or lack necessary guard files, the agent must stop and return `HOLD` immediately.
