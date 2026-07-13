---
name: zamblak-agent-control
description: Core execution protocol for Zamblak agents. Enforces bounded lifecycle, task modes, recovery, and evidence-based reporting under AGENTS.md.
---

# Zamblak Agent Control Protocol

## Authority

Root `AGENTS.md` is the repository workflow authority and is always read first. This skill operationalizes it but must not contradict, weaken, replace, or override it. Product requirements, technical reality, security/privacy guards, and the user-approved prompt retain their authority as defined by `AGENTS.md`. Report direct conflicts as HOLD.

## Mandatory first-run gate

Read `AGENTS.md` and this skill before taking action. If this skill is inaccessible or unreadable, return HOLD with the exact reason. Classify every task with its exact prompt-defined mode; if no mode is specified, use the repository's read-only default. A mode cannot authorize actions forbidden by `AGENTS.md` or the prompt.

## Controlled lifecycle

1. **Preflight:** Verify repository root, branch, HEAD, remote alignment, worktree inventory, staged and untracked files, and any explicitly expected generated-file state. Treat a defined baseline as a strict comparison boundary.
2. **Focused discovery:** Read only the authorities, source, documentation, and skills required for the bounded task. Prefer exact files and focused searches.
3. **Product or technical decision:** Use `PLAN_ONLY` or a read-only audit when correctness, scope, architecture, security, database behavior, or product requirements are unresolved. Do not implement unresolved assumptions.
4. **Implementation:** Modify only allowed files. Do not stage, commit, push, or perform unrelated cleanup.
5. **Validation:** Run only task-required checks for the affected surface and report only checks actually executed.
6. **Independent review:** Review against authority, scope, role boundaries, security, privacy, data behavior, and documentation. A read-only reviewer must not silently fix defects.
7. **Narrow recovery:** After HOLD, create one recovery task for the exact blocker, change only its allowed surface, and revalidate it.
8. **Re-review:** Confirm the blocker is resolved, then recheck inventory and acceptance criteria.
9. **Mozfer manual smoke:** Manual browser, runtime, visual, and practical smoke belongs to Mozfer unless browser automation is explicitly authorized. Agents may prepare cases and expected results, but must not claim Mozfer's smoke.
10. **Documentation synchronization:** For behavior-changing work, inspect canonical documentation and update only materially stale documentation. Separate static source, runtime, database-enforcement, and Mozfer evidence.
11. **Precommit review:** Check exact intended inventory, validation, documentation, generated-file drift, secrets, and staging safety. Do not stage during review.
12. **Commit-only:** Stage only exact reviewed files and create one local commit. Do not push.
13. **Optional Graphify refresh-only:** Use only under a later approved policy, as a separate task; this skill does not define Graphify commands.
14. **Push-only:** Push only the reviewed local commit and verify local/remote alignment afterward.
15. **Handoff:** Report completed work, validation, commit/push state, warnings, risks, and exactly one next controlled action.

## Task modes

| Mode | File modification | Staging | Commit | Push | Database writes | Expected output |
|---|---|---|---|---|---|---|
| `READ_ONLY_AUDIT` | No | No | No | No | No | Evidence-based audit and PASS/PASS WITH WARN/HOLD |
| `READ_ONLY_REVIEW` | No | No | No | No | No | Independent review verdict and evidence |
| `PLAN_ONLY` | Only an explicitly named plan artifact | No | No | No | No | Bounded plan, assumptions, risks, and gates |
| `IMPLEMENTATION` | Allowed implementation files only | No | No | No | No | Changed files, affected-surface validation, verdict |
| `NARROW_FIX` | Exact blocker surface only | No | No | No | No | Blocker resolution and focused revalidation |
| `DOCS_ONLY` | Explicit documentation files only | No | No | No | No | Documentation diff and authority validation |
| `PRECOMMIT_REVIEW` | No | No | No | No | No | Exact inventory and precommit readiness verdict |
| `COMMIT_ONLY` | No implementation edits; exact reviewed files may be staged | Yes, exact files only | Yes, one local commit | No | No | Commit evidence and clean-state validation |
| `PUSH_ONLY` | No | No | No | Yes, reviewed commit only | No | Push result and remote-alignment evidence |
| `GRAPHIFY_REFRESH_ONLY` | No | No | No | No | No | Approved refresh result; no implementation claims |
| `DEV_DATABASE_APPLY_PLAN` | Only explicitly allowed apply-plan artifact | No | No | No | No, plan only | Apply plan, prerequisites, risks, and HOLD/PASS |
| `POST_APPLY_VERIFICATION` | No, unless explicitly allowed evidence artifact | No | No | No | Verification reads only | Database/runtime verification evidence and verdict |
| `SKILLS_GOVERNANCE_FIX_ONLY` | Approved skills/governance files only | No | No | No | No | Governance diff, scope proof, and verdict |

The prompt may narrow any row further. Specialized skills define detailed database, Git, security, documentation, or tool procedures; this skill does not.

Existing repository modes remain valid under the same boundaries: `READONLY_REVIEW_ONLY` maps to `READ_ONLY_REVIEW`; `DOCS_SYNC_ONLY` maps to `DOCS_ONLY`; `IMPLEMENT_NO_STAGE` maps to `IMPLEMENTATION`; `SQL_DRAFT_ONLY` and `SQL_DRAFT_FIX_ONLY` are draft-only modes with no database writes, staging, commit, or push; `SUPABASE_APPLY_PRECHECK_ONLY` is read-only; and `SUPABASE_APPLY_ONLY` permits only explicitly approved database writes with no file edits, staging, commit, or push. Their output is the evidence and verdict required by the prompt.

## Recovery and HOLD

Every HOLD must state exact blocking evidence, make no speculative fix unless the current mode explicitly permits a narrow fix, do no unrelated work, preserve repository state, identify exactly one narrow recovery task ID or recovery action, and stop before the next phase.

A recovery task must reference the original blocker, whitelist only the minimum necessary files, forbid unrelated cleanup, rerun affected validation plus repository-state checks, and lead to re-review rather than directly to commit or push.

## Prompt-control template

When applicable, a controlled prompt should contain: Current workflow stage; Task ID; Mode; Role; Repository; Objective; Expected baseline; Authority and source-of-truth files; Selected skills; Language and verbosity policy; Tool policy; Allowed files; Forbidden files; Preconditions; Required actions; Required validation; Acceptance criteria; PASS / PASS WITH WARN / HOLD rules; Safety confirmation; and exactly one next controlled action.

Not every trivial task needs every section expanded. Risky tasks require explicit detail. Prompts must not repeat large unrelated histories. Prefer exact evidence over narrative, use concise English for execution reporting, and reserve Arabic for exact user-facing product copy when needed.

## Skill selection

- Select only relevant skills and list them explicitly in the task.
- Do not load skills merely because they exist.
- Do not use overlapping skills to duplicate authority.
- `AGENTS.md` remains above every skill.
- Product and security guards cannot be bypassed by UI or implementation skills.

## Reporting and one-next-action rule

Every result must be `PASS`, `PASS WITH WARN`, or `HOLD`, with exact evidence for files, validation, risks, and safety. Use the prompt's requested report structure; when none is supplied, start with the verdict and task ID. `PASS WITH WARN` is only for a precise nonblocking limitation; it cannot bypass a HOLD condition.

Every report must end with exactly one controlled next action. It must match the current workflow stage, preserve mandatory review, smoke, documentation, commit, and push gates, contain no alternatives, and must not execute itself.

## Preserved safety rules

- Never read, print, or modify `.env` files or expose secrets unless explicitly authorized.
- Never use broad staging.
- Do not commit, push, apply migrations, connect to Supabase, or run destructive Git operations without explicit authorization and the matching mode.
- Do not claim validation, runtime behavior, database enforcement, manual smoke, commit, or push that was not verified.
