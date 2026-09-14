---
name: zamblak-agent-control
description: Core execution protocol for Zamblak agents. Enforces Controller -> single Writer -> independent Reviewer workflow lifecycle, task modes, session recovery, completion ripple gates, and evidence-based reporting under AGENTS.md.
---

# Zamblak Agent Control Protocol

## Authority

Root `AGENTS.md` is the repository workflow authority and is always read first. This skill operationalizes it but must not contradict, weaken, replace, or override it. Product requirements, technical reality, security/privacy guards, and the user-approved prompt retain their authority as defined by `AGENTS.md`. Report direct conflicts as HOLD.

## Mandatory First-Run Gate

Read `AGENTS.md` and this skill before taking action. If this skill is inaccessible or unreadable, return HOLD with the exact reason. Classify every task with its prompt-defined scope, execution mode, and authority boundaries. A mode cannot authorize actions forbidden by `AGENTS.md` or the prompt.

## Core Workflow Architecture & Controlled Lifecycle

Zamblak tasks follow a structured, non-relay workflow lifecycle:
**Owner request → Controller → one logical mutating Writer → bounded inner loop → independent Reviewer → targeted repair/rereview → Controller final verdict → standing Owner auto-land.**

The Controller owns the complete lifecycle and routine discovery. The Owner must not be used as a relay for routine Writer → Reviewer → repair loops.

### Lifecycle Stages

1. **Preflight:** Verify repository root, branch, HEAD, remote alignment, worktree inventory, staged and untracked files, and any explicitly expected generated-file state. Treat a defined baseline as a strict comparison boundary.
2. **Focused Discovery:** The Controller owns routine discovery. Prompts should carry task-specific delta context, relevant evidence capsules, material expected state, exceptions, and validation. Agents do not perform repeated broad discovery when existing evidence remains current and no new evidence justifies it. Standing repository law remains in `AGENTS.md` and routed skills rather than being copied into routine task prompts.
3. **Bounded Implementation (Single Writer Lane):** Exactly one logical mutating Writer lane is active per mutation slice. Never run two mutating Writers concurrently. The Writer may inspect and modify directly affected files inside the task-authorized working boundary, including directly relevant tests, local types/contracts, and direct callers/consumers when ordinary implementation work requires them.
   - Explicit exact-file allowlists remain strictly binding when specified (e.g. for governance-sensitive tasks).
   - Database/schema/RLS/RPC/migration work remains separately gated.
   - Security-sensitive or financial-authority work may use narrower boundaries.
   - Protected infrastructure remains separately gated.
4. **Focused Local Validation:** Run only task-required checks for the affected surface and report only checks actually executed.
5. **Writer Inner Loop & Diagnosis/Repair:** The Writer diagnoses ordinary failures (e.g. unit test failures, import issues, contract alignment) and repairs them inside the authorized working boundary. The loop repeats until locally green before reporting. Ordinary test failures or directly affected caller/test discoveries do not trigger HOLD.
6. **Writer Reporting:** The Writer reports changed files, local validation results, and exact ready-for-review state. The Writer is not the independent Reviewer and does not issue the final verdict.
7. **Independent Review Model:** After mutating implementation and Writer validation, a fresh independent native Reviewer must be engaged in the current coding harness.
   - For Antigravity: use a fresh Reviewer context/subagent genuinely separate from the Writer reasoning context.
   - Reviewer authority is strictly read-only and findings-only.
   - Reviewer must not edit, stage, commit, push, deploy, apply SQL, or repair.
   - Reviewer substantively inspects the actual diff, relevant source, tests, contracts, and validation evidence.
   - Provider diversity is not required; genuine context separation is mandatory. If unavailable, the result is HOLD. Writer self-review must never be relabeled as independent review.
8. **Repair and Targeted Rereview:** Confirmed in-scope BLOCKING or MATERIAL findings return to the same logical Writer lane. Safe and cheap MINOR findings may also be repaired when clearly in-scope. After repair: rerun affected validation; obtain targeted independent rereview focused on repaired files, original findings, direct contracts, and collateral risk without restarting broad historical discovery.
9. **Controller Final Verdict:** The Controller evaluates Writer execution, validation evidence, and Reviewer findings to issue the final verdict (`PASS`, `PASS WITH WARN`, `PARTIAL`, `HOLD`, or `FAIL`).
10. **Auto-Land Execution (Standing Owner Authorization):** Once a bounded task completes the full controlled lifecycle and reaches a final Controller-grade clean PASS:
    - Pre-commit verification: verify final reviewed diff, required validation is green, independent review is complete with no unresolved BLOCKING, MATERIAL, or actionable MINOR findings, staged inventory exactly matches approved task paths, and unrelated dirty work remains unstaged.
    - Stage exact task-approved paths only (never `git add .`, wildcard staging, or unrelated dirty paths).
    - Create exactly one normal commit with a concise task-appropriate message.
    - Push normally to `origin/main` (never force push).
    - Post-push verification: verify local HEAD, `origin/main`, ahead/behind divergence, staged state, remaining dirty paths, and pushed commit identity.
    - The Controller may verify the pushed repository state directly from GitHub rather than using the Owner as a relay.
    - Writer self-report alone never triggers auto-land.
    - If required review is unavailable, validation fails, staged inventory is unexpected, or remote divergence creates unsafe ambiguity: do not commit, do not push, return HOLD.
11. **Mozfer Manual Smoke:** Manual browser, runtime, visual, and practical smoke belongs to Mozfer unless browser automation is explicitly authorized. Agents may prepare test scenarios and expected results, but must not claim Mozfer's smoke.
12. **Documentation Synchronization:** For behavior-changing work, inspect canonical documentation and update only materially stale documentation. Separate static source, runtime, database-enforcement, and Mozfer evidence.
13. **Specialized Git Operations:** When explicitly requested by task mode, separate `PRECOMMIT_REVIEW`, `COMMIT_ONLY`, `PUSH_ONLY`, or `COMMIT_AND_PUSH` operations remain supported as discrete gates.
14. **Graphify Refresh (express authorization only):** Perform a Graphify refresh only when the current task expressly authorizes it (for example, an explicit `GRAPHIFY_REFRESH_ONLY` mode or an explicit refresh instruction). Never automatic; its absence never blocks an otherwise valid commit or push.
15. **Handoff:** Report completed work, validation, commit/push state, warnings, risks, and exactly one next controlled action.

## Bounded Authorization & Owner Interruption Boundary

A clear bounded Owner request authorizes ordinary in-scope discovery, implementation, proportional local validation, independent review, repair, and rereview without requiring repeated Owner approval for each predictable local step.

### Explicit Authorization Limits
Bounded authorization **never** implicitly authorizes:
- Staging, commit, or push outside standing auto-land policy;
- Checkout, branch switching, or branch creation;
- Worktree creation or deletion;
- Database writes, Supabase mutation, or migration application;
- Graphify index mutation or refresh;
- Production or deployment action;
- Destructive recovery operations;
- Secret or credential access;
- Materially expanded scope.

### Owner Interruption Boundary
Routine in-scope implementation issues, ordinary test failures, directly affected caller discoveries, routine review/repair cycles, and routine task landing under standing auto-land policy must not interrupt the Owner. Return to the Owner only for genuine authority or decision requirements:
- Material unresolved Owner Decision (product, UX, or architectural direction).
- Database or migration application authority on live or remote databases.
- Explicit commit or push authority outside standing auto-land policy (e.g. landing unreviewed work or landing with ambiguous remote divergence).
- Production or deployment action.
- Destructive Git or recovery operations (reset, checkout, clean, force operations).
- Protected credentials, secrets, or `.env` content requirements.
- Materially scope-expanding mutations beyond the authorized boundary.
- Unavailable required independent-review capacity.
- Irreparable blocker inside the authorized boundary.

Do not weaken any stricter existing Zamblak safeguard.

## Task Modes & Operation Labels

Operation labels describe and narrow task authority; they do not create authority that the Owner did not provide. Ordinary bounded application work does not depend on a magic mode token when the task prompt already provides clear scope and authority.

| Mode / Label | File modification | Staging | Commit | Push | Database writes | Expected output |
|---|---|---|---|---|---|---|
| `READ_ONLY_AUDIT` | No | No | No | No | No | Evidence-based audit and PASS/PASS WITH WARN/HOLD |
| `READ_ONLY_REVIEW` / `REVIEW_ONLY` | No | No | No | No | No | Independent review verdict and findings-only evidence |
| `PLAN_ONLY` | Only an explicitly named plan artifact | No | No | No | No | Bounded plan, assumptions, risks, and gates |
| `IMPLEMENTATION` / `IMPLEMENT_NO_STAGE` | Allowed files inside authorized working boundary | No | No | No | No | Changed files, affected-surface validation, Writer report |
| `NARROW_FIX` | Exact blocker surface only | No | No | No | No | Blocker resolution and focused revalidation |
| `DOCS_ONLY` / `DOCS_SYNC_ONLY_NO_STAGE` | Documentation files explicitly named by the task only | No | No | No | No | Corrected documentation diff; contradiction and status-boundary verification; verdict |
| `PRECOMMIT_REVIEW` | No | No | No | No | No | Exact inventory and precommit readiness verdict |
| `COMMIT_ONLY` | No implementation edits; exact reviewed files may be staged | Yes, exact files only | Yes, one local commit | No | No | Commit evidence and clean-state validation |
| `PUSH_ONLY` | No | No | No | Yes, reviewed commit only | No | Push result and remote-alignment evidence |
| `COMMIT_AND_PUSH` | No implementation or documentation edits | Yes, exact approved paths only | Yes, exactly one normal commit with the exact approved message | Yes, normal push only (no force) | No | Exact staged inventory, commit evidence, push result, and post-push alignment verification |
| `GRAPHIFY_REFRESH_ONLY` | No | No | No | No | No | Expressly authorized refresh result; no implementation claims |
| `DEV_DATABASE_APPLY_PLAN` | Only explicitly allowed apply-plan artifact | No | No | No | No, plan only | Apply plan, prerequisites, risks, and HOLD/PASS |
| `SUPABASE_APPLY_ONLY` | No | No | No | No | Permitted only with explicit user approval and apply plan | Database apply results, catalog verification, and verdict |
| `POST_APPLY_VERIFICATION` | No, unless explicitly allowed evidence artifact | No | No | No | Verification reads only | Database/runtime verification evidence and verdict |
| `SKILLS_GOVERNANCE_FIX_ONLY` | Approved skills/governance files only | No | No | No | No | Governance diff, scope proof, and verdict |
| `MANUAL_SMOKE_ONLY` | No | No | No | No | No | Guided verification steps and expected results for Mozfer |

`DOCS_SYNC_ONLY_NO_STAGE` maps to the `DOCS_ONLY` safety boundary with an explicit prohibition of staging, commit, and push. Under the standing auto-land policy, ordinary tasks (such as `IMPLEMENTATION` or `DOCS_ONLY`) that complete the full controlled lifecycle (implementation → validation → independent review → repair/rereview → Controller-grade clean PASS) automatically land via exact-path staging, one normal commit, and normal push without a separate Owner confirmation. The specialized modes `COMMIT_ONLY`, `PUSH_ONLY`, and `COMMIT_AND_PUSH` remain available when tasks deliberately separate or isolate those operations.

## Auto-Land Policy & Controlled Landing

Standing Owner authorization exists for routine task landing once a task completes the full controlled lifecycle and reaches a final Controller-grade clean PASS. Routine tasks no longer require a separate Owner confirmation solely to land already reviewed work.

### Full Reviewed Lifecycle Requirement
Auto-land is permitted ONLY after the complete controlled lifecycle is fulfilled:
1. Mutating Writer implementation within authorized boundary;
2. Required task validation executed and green;
3. Fresh independent read-only Reviewer completed;
4. Same logical Writer repair executed if findings were identified;
5. Targeted validation and independent rereview completed;
6. Final Controller-grade PASS verdict issued.

**Writer self-report alone NEVER authorizes auto-land.**

### Auto-Land Execution Rules
1. **Exact-Path Staging Mandatory:** Stage only exact task-approved paths. Never use `git add .`, wildcard staging, or stage unrelated dirty paths. Unrelated dirty files must remain preserved and unstaged.
2. **Pre-Commit Verification:** Before creating the commit, verify:
   - Final reviewed diff matches task scope;
   - Required validation is green;
   - Independent review is complete with no unresolved BLOCKING, MATERIAL, or actionable MINOR findings;
   - Staged inventory exactly matches approved task paths;
   - Unrelated dirty work remains unstaged.
3. **Single Normal Commit:** Create exactly one normal commit for the completed task using a concise, task-appropriate commit message.
4. **Normal Push:** Push normally to `origin/main`. Never force push.
5. **Post-Push Verification:** After push, verify:
   - Local HEAD;
   - `origin/main`;
   - Ahead/behind divergence;
   - Clean staged state;
   - Remaining dirty paths;
   - Pushed commit identity.
6. **Controller Remote Verification:** The Controller may verify the pushed repository state directly from GitHub rather than using the Owner as a relay.

### Non-Authorized Actions (Exclusions)
Auto-land authority does NOT authorize:
- Database or migration application;
- Supabase mutation;
- Production or deployment mutation;
- Destructive Git operations (reset, checkout, clean, branch deletion);
- Force push;
- Secret or credential access;
- Package or dependency changes outside task authority;
- Genuine scope expansion.

### Landing Blockers & HOLD Discipline
If any of the following conditions occur, do NOT commit, do NOT push, and return HOLD:
- Required independent review is unavailable or incomplete;
- Required validation remains failing;
- Staged inventory contains unexpected or unapproved paths;
- Remote divergence creates unsafe ambiguity;
- Unresolved BLOCKING or MATERIAL review findings remain;
- An unresolvable execution error occurs.

### Specialized Modes Retained
Existing specialized `COMMIT_ONLY`, `PUSH_ONLY`, and `COMMIT_AND_PUSH` operations remain valid when explicitly requested, but ordinary successfully completed tasks no longer require repeated Owner authorization solely to land already reviewed work.

## Session Recovery & Recovery Capsule

Preserve successful work across authentication, session, transport, timeout, expired-conversation, or comparable environment failures. Do not classify such failures as model-capability failures without evidence.

### Single-Writer Guarantee
Ensure no previous mutating Writer remains active when checkable. Never run two mutating Writers concurrently.

### Recovery Capsule
If a fresh Writer session becomes necessary, preserve existing edits. Resumed Writer sessions should receive delta instructions plus the compact Recovery Capsule (never the full original prompt), containing:
1. **Task Scope:** Objective, authorized working boundary, and allowed files.
2. **Repository State:** Root, branch, HEAD SHA, divergence, and full working-tree/staged inventory.
3. **Relevant Files & Contracts:** Target files, relevant type definitions, schemas, and screen/data contracts.
4. **Completed Work:** Code and tests already written or modified in the interrupted session.
5. **Passing Validation:** Test suites, type checks, or lint checks already passing.
6. **Remaining Diagnostics:** Current error logs, test failure messages, or remaining tasks for the inner loop.
7. **Protected Boundaries:** Non-negotiable safety rules, forbidden files, and unbreachable authority constraints.

## Refined HOLD Semantics & Recovery

HOLD is reserved for genuine blockers that prevent safe execution or mutation planning:
- Missing or contradictory repository authority or baseline;
- Material unresolved Owner Decision (product, schema, UX, architecture);
- Protected or excluded mutation requirement (e.g. attempting to modify unauthorized files);
- Genuinely expanded scope that cannot be addressed inside the authorized boundary;
- Unavailable required evidence;
- Failed required validation after the authorized diagnose/repair loop;
- Unavailable required independent-review capacity;
- Secret or protected-data issue;
- Unauthorized Git, database, migration, or deployment action required;
- Execution failure preventing safe continuation.

### What is NOT a HOLD Condition:
Do NOT trigger HOLD merely because:
- A normal directly affected file, local type, contract, or caller was discovered inside the authorized working boundary;
- An ordinary test failed and can be diagnosed and repaired within the Writer inner loop;
- Optional tooling (e.g. Graphify) is unavailable or unconfigured;
- A routine task omitted an optional operation label.

### Required HOLD Behavior
When HOLD occurs:
- Make no speculative fix unless the current task explicitly authorizes a narrow fix;
- Perform no unrelated work;
- Do not stage, commit, push, apply migrations, install tools, or broaden scope;
- Report the exact blocking evidence;
- Provide exactly one narrow recovery task ID or recovery action;
- Preserve the repository state.

A recovery task must reference the original blocker, whitelist only the minimum necessary files, forbid unrelated cleanup, rerun affected validation plus repository-state checks, and lead to re-review rather than directly to commit or push.

## Compact Task Prompts & Brief Template

Routine Antigravity tasks receive only task-specific delta context while standing workflow, safety, product, security, and review law remains discoverable in repository governance (`AGENTS.md`) and routed skills.

### Core Principles
1. **Delta Context Only:** Routine task prompts should contain only:
   - Task objective and delta requirements;
   - Relevant evidence capsule;
   - Task boundary or material exceptions;
   - Required validation;
   - Report / next-action contract.
2. **No Law Duplication:** Do not repeat standing repository law (Git gates, DB rules, safety policies, product definitions, reporting templates) already present in `AGENTS.md` or routed skills.
3. **Resumed Sessions:** Interrupted or resumed Writer sessions receive delta instructions plus the compact Recovery Capsule, never the full original prompt or historical logs.
4. **Flexible Structure:** Briefs use a concise XML/tag-based structure (`<task>`, `<evidence>`, `<scope>`, `<validation>`, `<report>`). Not every block is mandatory when unnecessary.
5. **Reference:** Full templating patterns and examples live in `.agents/skills/zamblak-agent-control/references/writing-the-brief.md`.

## Skill Routing & Inheritance

The Controller and agents must route the **smallest materially relevant skill stack only** for each task. Never load every skill by default.

### Routing Principles
- **Domain Reasoning, Not Authority:** Skills provide specialized domain reasoning (e.g. database RLS analysis, Arabic RTL UX rules, fieldwork constraints, precommit gate checks), NOT additional authority.
- **Workflow Supremacy:** `AGENTS.md` and this Agent Control skill remain the supreme workflow authority. Skills cannot grant file access, Git/DB mutation, or product authority beyond the task prompt.
- **Selective Routing:** Route only skills materially relevant to the immediate task surface (e.g. `zamblak-db-rls-migration-guard` for SQL/schema tasks; `zamblak-ui-rtl-senior-ux-guard` for Arabic UI).

### Skill Inheritance Rules
Once a task explicitly selects a skill, the stable rules in that skill are binding and do not need to be copied word-for-word into every task prompt.
1. A task prompt must still explicitly provide task-specific authority (Task ID, role, objective, working boundary / allowed files, required validation, report contract, one next action).
2. Skill inheritance never grants: file access outside task scope, staging, commit, push, database writes, Supabase access, Graphify refresh, secret access, destructive Git operations, or product-decision authority.
3. A task prompt may narrow a skill rule but must not silently weaken or override a higher-authority safety boundary.
4. Skills must not be used to infer unstated product requirements, role decisions, business decisions, runtime evidence, or database state.

## Completion Ripple Gate

Before the first write, before returning PASS, and before recommending a next task, an agent must determine whether the current work:
- creates, renames, moves, or deletes an artifact;
- starts, advances, completes, pauses, or supersedes a roadmap phase or delivery stage;
- changes implemented, prototype, mock, historical, planned, deferred, or runtime-verified status;
- changes product, role, permission, schema, migration, security, privacy, tenant, or evidence boundaries;
- introduces or discovers an unresolved decision;
- requires registration in an entry point, index, roadmap, decision register, parent document, contract register, or navigation surface;
- requires documentation synchronization, an independent review, product approval, precommit review, Mozfer manual smoke, database verification, or another mandatory lifecycle gate before progression.

### Required Behavior:
1. Determine the complete required synchronization and lifecycle set before the first write.
2. Compare that set against the task whitelist and execution mode.
3. If a required synchronization path or lifecycle action is outside the task whitelist or authorization, return HOLD before creating a partial, orphaned, contradictory, or falsely complete result.
4. Do not return PASS merely because the explicitly edited file is internally correct.
5. Do not leave required registration, authority classification, roadmap synchronization, or decision handling as optional future cleanup after PASS.
6. Do not recommend a later lifecycle stage while the current stage remains unregistered, unreviewed, unapproved where approval is required, unsynchronized, blocked by a decision, or uncommitted when the current workflow requires that gate.
7. The next action must be the nearest mandatory unfinalized gate, not the most interesting future task.
8. Applicable reports must include a concise Completion Ripple result stating which ripple surfaces were checked, which required synchronization was included, which was not required, and whether progression is allowed.
9. A read-only reviewer must audit the Completion Ripple result independently and must not silently repair it.

Document- and index-classification detail belongs to `zamblak-docs-guard`; agent-control stays general and cross-domain.

## Reporting and One-Next-Action Rule

Every result must be `PASS`, `PASS WITH WARN`, `PARTIAL`, `HOLD`, or `FAIL`, with exact evidence for files, validation, risks, and safety. Use the prompt's requested report structure; when none is supplied, start with the verdict and task ID. `PASS WITH WARN` is only for a precise nonblocking limitation; it cannot bypass a HOLD condition.

Every report must end with exactly one controlled next action. It must match the current workflow stage, preserve mandatory review, smoke, documentation, commit, and push gates, contain no alternatives, and must not execute itself.

## Preserved Safety Rules & Anti-Contamination

- Never read, print, or modify `.env` files or expose secrets unless explicitly authorized.
- Never use broad staging (`git add .`, wildcards, or staging unrelated dirty paths). Auto-land and commit tasks stage exact task-approved paths only.
- Do not commit or push without authorization (standing auto-land after full reviewed lifecycle PASS, or matching explicit mode). Force push and destructive Git commands are strictly prohibited.
- Do not apply migrations, connect to Supabase for mutations, or execute production deployments without separate explicit Owner approval. Auto-land never authorizes database, production, secret, or dependency changes.
- Do not claim validation, runtime behavior, database enforcement, manual smoke, commit, or push that was not verified.
- **Strict Anti-Contamination:** Zamblak must remain entirely free of G7 business-rule and CRM contamination (no quotations, invoices, VAT, accounting, CRM domain models, etc.). Zamblak's own repository authority governs.
