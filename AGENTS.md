# Zamblak Agent Rules

## Core Workflow Architecture & Lifecycle

Zamblak enforces a disciplined, non-relay workflow architecture:
**Owner request → Controller → one logical mutating Writer → bounded inner loop → independent Reviewer → targeted repair/rereview → Controller final verdict → standing Owner auto-land.**

```
Owner Request
    │
    ▼
Controller (owns complete lifecycle, routine discovery, prompt scoping)
    │
    ▼
One Logical Mutating Writer Lane (per mutation slice)
    ├── Inspect
    ├── Edit (authorized working boundary)
    ├── Task-authorized focused validation
    ├── Diagnose ordinary failures & repair
    └── Repeat until locally green → Writer Report
    │
    ▼
Fresh Independent Reviewer (read-only, findings-only, fresh Antigravity subagent/context)
    │
    ├── In-scope blocking/material/minor findings
    │       ▼
    │   Same Logical Writer Lane (repairs findings → targeted validation)
    │       ▼
    │   Targeted Independent Rereview
    │
    ▼
Controller Final Verdict (PASS / PASS WITH WARN / PARTIAL / HOLD / FAIL)
    │
    ▼ (on final Controller-grade clean PASS)
Standing Owner Auto-Land
    ├── Pre-commit verification (diff, validation, independent review, inventory)
    ├── Stage exact task-approved paths only (no wildcards / unrelated dirty state)
    ├── One normal commit with concise task message
    ├── Normal push to origin/main (never force push)
    └── Post-push remote verification (local HEAD, origin/main, divergence, index)
```

### Key Lifecycle Principles
1. **Controller Ownership:** The Controller owns complete task lifecycle management, routine discovery, and prompt synthesis. The Owner must not be used as a relay for routine Writer → Reviewer → repair loops.
2. **One Logical Mutating Writer Lane:** Exactly one mutating Writer lane is active per mutation slice. Never run two mutating Writers concurrently. The Writer owns a bounded local diagnose-and-repair loop and drives the slice until locally green before reporting.
3. **Writer Working Boundary:** The Writer may inspect and modify directly affected files inside the task-authorized working boundary, including directly relevant tests, local types/contracts, and direct callers/consumers when ordinary implementation requires them.
   - Explicit exact-file allowlists remain strictly binding when specified (e.g. for governance-sensitive tasks).
   - Database/schema/RLS/RPC/migration work remains separately gated.
   - Security-sensitive or financial-authority work may use narrower boundaries.
   - Protected infrastructure remains separately gated.
4. **Independent Review Model:** After mutating implementation and Writer validation, a fresh independent native Reviewer must be engaged in the coding harness (for Antigravity: a fresh Reviewer context/subagent genuinely separate from the Writer reasoning context).
   - Reviewer authority is strictly read-only and findings-only.
   - Reviewer must not edit, stage, commit, push, deploy, apply SQL, or repair.
   - Reviewer substantively inspects the actual diff, relevant source, tests, contracts, and validation evidence.
   - Provider diversity is not required; genuine context separation is mandatory. If unavailable, the result is HOLD. Writer self-review must never be relabeled as independent review.
   - Antigravity-native delegation is operationalized via `zamblak-review-delegation`, which launches fresh read-only reviewer sessions via the local `agy` CLI, enforces worktree fingerprint integrity, and captures reports outside the Git tree.
   - Deterministic review preparation packets may be generated via `zamblak-opencodereview` (`ocr delegate preview` and `ocr delegate rule`). OCR LLM review paths are strictly prohibited. OCR tooling remains optional infrastructure and does not block ordinary work if unconfigured.
5. **Repair and Rereview:** Confirmed in-scope BLOCKING or MATERIAL findings return to the same logical Writer lane. Safe and cheap MINOR findings may also be repaired when clearly in-scope. After repair, rerun affected validation and obtain targeted independent rereview focused on repaired files, original findings, direct contracts, and collateral risk without restarting broad historical discovery.
6. **Session Recovery:** Preserve successful work across session, transport, timeout, or environment interruptions. If a fresh Writer session is required: verify no previous mutating Writer remains active when checkable, preserve existing edits, and supply a compact Recovery Capsule (task scope, repository state, relevant files/contracts, completed work, already-passing validation, remaining diagnostics, protected boundaries). Never classify session or transport dropouts as model-capability failures without evidence.
7. **Auto-Land Policy (Standing Owner Authorization):** Standing Owner authorization exists for routine task landing once a task completes the full controlled lifecycle and reaches a final Controller-grade clean PASS (Writer implementation → required validation → fresh independent read-only Reviewer → targeted repair/rereview if needed → Controller final PASS).
   - No separate Owner approval is required solely to commit and push after this final PASS.
   - Writer self-report alone NEVER authorizes auto-land.
   - Auto-land must stage only exact task-approved paths (never `git add .`, wildcard staging, or unrelated dirty paths).
   - Pre-commit verification: verify final reviewed diff, required validation is green, independent review is complete with no unresolved BLOCKING, MATERIAL, or actionable MINOR findings, staged inventory exactly matches approved task paths, and unrelated dirty work remains unstaged.
   - Commit: create exactly one normal commit using a concise task-appropriate message.
   - Push: push normally to `origin/main`; never force push.
   - Post-push verification: verify local HEAD, `origin/main`, ahead/behind divergence, staged state, remaining dirty paths, and pushed commit identity.
   - The Controller may verify the pushed repository state directly from GitHub rather than using the Owner as a relay.
   - Limits: Auto-land does NOT authorize database/migration application, Supabase mutation, production/deployment action, destructive Git operations, force push, secret/credential access, package/dependency modifications outside task scope, or scope expansion.
   - Landing Blockers: If required independent review is unavailable, validation fails, staged inventory is unexpected, remote divergence creates unsafe ambiguity, or another landing blocker exists: do not commit, do not push, return HOLD.
   - Existing specialized modes (`COMMIT_ONLY`, `PUSH_ONLY`, `COMMIT_AND_PUSH`) remain valid when explicitly requested, but ordinary completed tasks do not require repeated Owner authorization solely to land reviewed work.

## Owner Interruption Boundary

Routine in-scope implementation issues, ordinary test failures, routine review/repair cycles, and routine task landing under the standing auto-land policy must not interrupt the Owner. Return to the Owner only for genuine authority or decision requirements:
- Material unresolved Owner Decision (product, UX, or architectural direction).
- Database or migration application authority on live or remote databases.
- Explicit commit or push authority outside standing auto-land policy (e.g. landing unreviewed work, emergency manual landing, or ambiguous divergence).
- Production or deployment action.
- Destructive Git or recovery operations (reset, checkout, clean, force operations).
- Protected credentials, secrets, or `.env` content requirements.
- Materially scope-expanding mutations beyond the authorized boundary.
- Unavailable required independent-review capacity.
- Irreparable blocker inside the authorized boundary.

Do not weaken any stricter existing Zamblak safeguard.

## Bounded Authorization & Operation Labels

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

### Operation Labels
Operation labels narrow or describe task authority; they do not create authority the Owner did not grant. Routine bounded application work does not depend on a magic mode token when the task prompt already provides clear scope and authority. Retained labels include:
- `READ_ONLY_AUDIT`: Read-only inspection and evidence reporting.
- `PLAN_ONLY`: Architecture or implementation planning; only an explicitly named plan artifact may be written.
- `IMPLEMENT_NO_STAGE`: Ordinary implementation inside authorized working boundary; no staging, commit, push, or DB writes.
- `DOCS_ONLY` / `DOCS_SYNC_ONLY_NO_STAGE`: Documentation files explicitly named by task only; no staging, commit, push, or DB writes.
- `REVIEW_ONLY`: Independent read-only, findings-only review.
- `COMMIT_ONLY`: No implementation edits; stage only exact reviewed files and create one local commit.
- `PUSH_ONLY`: Push reviewed local commit only; verify local/remote alignment.
- `COMMIT_AND_PUSH`: Opt-in only when explicitly named in user-approved task; verify exact inventory, stage exact paths, one commit, normal push, post-push verification. Never an implicit default.
- `SQL_DRAFT_ONLY` / `SQL_DRAFT_FIX_ONLY`: Draft SQL locally; no DB application, staging, commit, or push.
- `SUPABASE_APPLY_ONLY`: Permitted only with explicit user approval and apply plan; DB writes only, no file edits, staging, commit, or push.
- `MANUAL_SMOKE_ONLY`: Guided manual verification steps for Mozfer; no automated claim.
- `SKILLS_GOVERNANCE_FIX_ONLY`: Approved skills or governance files only.

Full operational definitions live in `.agents/skills/zamblak-agent-control/SKILL.md`.

## Mandatory First-Run Behavior
Every task must explicitly read this `AGENTS.md` and `.agents/skills/zamblak-agent-control/SKILL.md` before taking action.

## Local Skill Stack & Skill Routing
Local skills reside in `.agents/skills/`. Tasks and agents must route the **smallest materially relevant skill stack only** to minimize operational surface area. Never load every skill by default.
- **Domain Reasoning, Not Authority:** Skills provide specialized domain reasoning and checks (database RLS, Arabic RTL UX, fieldwork logic, precommit gates, navigation), NOT additional authority.
- **Workflow Supremacy:** `AGENTS.md` and `zamblak-agent-control` remain the workflow authority. Skills cannot grant file access, Git/database mutations, or product authority beyond the task prompt.
- `zamblak-agent-control`: Core execution protocol, workflow lifecycle, prompt design, and task orchestration.
- `zamblak-review-delegation`: Antigravity-native independent review dispatch, worktree fingerprint integrity, targeted rereview, and session recovery capsules. Selected only when a task requires independent review, delegation, or session recovery.
- `zamblak-opencodereview`: Deterministic OpenCodeReview delegation-packet preparation protocol. Prepares structured review packets (reviewable files, exclusions, resolved path rules, and domain background) via `ocr delegate preview` and `ocr delegate rule` without invoking OCR LLM paths. Selected only when a task explicitly requires OCR-backed review.
- `zamblak-supabase-data-engineering`: Runtime Supabase data engineering, browser vs server client usage, SSR cookie sessions, Data API queries, and RPC contracts. Schema, migrations, and RLS policies remain with `zamblak-db-rls-migration-guard`.
- `zamblak-nextjs-framework-engineering`: Next.js App Router framework engineering, Server vs Client components, Server Actions, Route Handlers, streaming, and version-matched Next.js 16 APIs.
- `zamblak-nextjs-performance-engineering`: Evidence-first performance engineering, symptom measurement, bottleneck layer identification, before/after benchmarking, and targeted optimization.
- `zamblak-postgres-query-index-guidance`: Advisory PostgreSQL query shaping, composite/partial index design, selectivity analysis, write amplification tradeoffs, and tenant-aware indexing.
- `zamblak-db-rls-migration-guard`: Authoritative gatekeeper for database schemas, SQL migrations, RLS policies, views, triggers, grants, and migration apply gates.
- `zamblak-clean-code-guard`: Production code quality, simplicity, trust-boundary validation, error handling, and refactoring integrity for non-trivial code changes.
- `zamblak-test-guard`: Quality, behavioral integrity, boundary mocking, assertion depth, and regression protection for changed or generated test code. Does not run tests or review production code.
- `zamblak-security-privacy-guard`: Specialist review guard for application security, authentication, authorization, IDOR/BOLA prevention, respondent PII privacy, and tenant isolation (`account_id`).
- `zamblak-precommit-gate`: Git staging and commit protections.
- `zamblak-product-manager`: PRD alignment and product requirement rigor.
- `zamblak-fieldwork-domain-guard`: Authoritative domain reasoning for Respondent Registry uniqueness, participation eligibility, 3-month warnings, current 5-tier hierarchy boundaries, research form invariants, and accepted-only financial counting.
- `zamblak-docs-guard`: Documentation integrity.
- `zamblak-ui-rtl-senior-ux-guard`: Arabic-first UX logic.
- `zamblak-graphify-navigation`: Graphify-first navigation, symbol/impact tracing, freshness classification, targeted grep fallback, and index refresh only on express task authorization.

### Graphify navigation policy
- Select `zamblak-graphify-navigation` for Graphify-backed navigation, symbol tracing, and impact review; select it for post-commit index refresh verification only when a refresh is expressly authorized.
- Graphify remains **navigation only** (hierarchy item 7). It never overrides source, migrations, Git state, canonical docs, or task authority.
- Source verification against current files is mandatory for material conclusions.
- When graph nodes are missing or stale, use **targeted** `grep` / `rg` (known symbols and mapped paths) before any broader search.
- Repository-local Graphify output is generated under ignored `graphify-out/`. Verify the ignore rule before any authorized refresh. Ignored `graphify-out/**` is allowed after an authorized refresh; tracked, staged, or non-ignored untracked changes block push; output outside `graphify-out/` blocks push.
- Graphify refresh is performed **only** when the current task expressly authorizes it (for example, an explicit `GRAPHIFY_REFRESH_ONLY` mode or an explicit refresh instruction). There is **no** automatic refresh after commits, and the absence of an unauthorized Graphify refresh must **never** block an otherwise valid commit or push.
- Do **not** create automatic Graphify Git hooks.
- Do **not** refresh Graphify during read-only, docs, implementation, commit, or push tasks unless the task expressly authorizes refresh.
- Full procedures live in `.agents/skills/zamblak-graphify-navigation/SKILL.md` and apply only when a refresh is expressly authorized; do not duplicate them here.

## Approved Files & Anti-Contamination Boundary
Modify only files explicitly relevant to the authorized task scope.
- Do not modify `.env` files or read any secret credentials.
- **Strict Anti-Contamination Rule:** Zamblak must remain entirely free of G7 business-rule and CRM contamination. Absolutely no CRM domain behavior, quotations, invoices, VAT, payments/receivables accounting models, Service/Booking workflows, G7 roles, G7 ERP lifecycle, accounting rules, or G7 database schema/migration behavior.
- **Zamblak Product & Domain Authority:** Zamblak's own repository authority remains strictly authoritative for:
  - Product requirements (`docs/product-requirements.md`);
  - Roles and permissions (`docs/roles-permissions.md`);
  - Respondent Registry behavior and 3-month duplicate warning;
  - Mandatory tenant boundaries (`account_id`) and Row Level Security;
  - Research Forms workflow and one-form-per-Participation invariant;
  - Server-authoritative pricing (`participation_pricing` / `project_financial_settings`);
  - Database schema and migrations (`docs/database-schema.md`, `docs/database-migrations.md`);
  - Security foundations (`docs/security-foundation.md`);
  - Project roadmap and deferred decisions (`docs/project-roadmap.md`, `docs/deferred-decisions.md`).

## Git & Database Rules
- **Commit & Push Authorization:** Authorized via standing Owner auto-land policy after a completed task reaches final Controller-grade clean PASS following independent review, or via explicit task mode (`COMMIT_ONLY`, `PUSH_ONLY`, `COMMIT_AND_PUSH`). NO unapproved or unreviewed commit or push.
- **NO destructive git commands without explicit approval** (no reset, checkout, clean, branch deletion, or force push).
- **NO force push ever.**
- **Exact-Path Staging Mandatory:** Auto-land and commit tasks stage ONLY exact task-approved paths. Never use `git add .`, wildcard staging, or stage unrelated dirty paths. Unrelated dirty files must remain preserved and unstaged.
- **Auto-Land Pre-Commit Verification:** Before creating a commit, verify:
  1. Final reviewed diff matches authorized scope;
  2. Required validation is green;
  3. Independent review is complete with no unresolved BLOCKING, MATERIAL, or actionable MINOR findings;
  4. Staged inventory exactly matches approved task paths;
  5. Unrelated dirty work remains unstaged.
- **Single Normal Commit & Normal Push:** Create exactly one normal commit for the completed task using a concise task-appropriate message; push normally to `origin/main` (never force push).
- **Post-Push Verification:** After push, verify local HEAD, `origin/main`, ahead/behind divergence, clean staged state, remaining dirty paths, and pushed commit identity.
- **Controller Remote Verification:** The Controller may verify the pushed repository state directly from GitHub rather than using the Owner as a relay.
- **Auto-Land Exclusions:** Auto-land authority does NOT authorize: database or migration application, Supabase mutation, production or deployment mutation, destructive Git, force push, secret access, package/dependency changes outside task authority, or genuine scope expansion.
- **Landing Blockers:** If required independent review is unavailable, validation remains failing, staged inventory is unexpected, remote divergence creates unsafe ambiguity, or another real landing blocker exists: do not commit, do not push, return HOLD.
- **Specialized Modes Retained:** `COMMIT_ONLY`, `PUSH_ONLY`, and `COMMIT_AND_PUSH` remain valid when explicitly requested, but ordinary successfully completed tasks no longer require a second Owner authorization solely to land already reviewed work.
- **SQL_DRAFT_ONLY** and **SQL_DRAFT_FIX_ONLY**: Write or fix SQL drafts locally. Do NOT apply to the database.
- **SUPABASE_APPLY_ONLY**: Only apply SQL if the task mode explicitly allows it and user has approved. No migration apply without explicit approval.
- **DOCS_SYNC_ONLY_NO_STAGE**: modifications allowed only to documentation files explicitly named by the task; no staging, commit, push, or database writes.

## Source-of-Truth Hierarchy
1. User-approved prompt
2. `AGENTS.md`
3. Local Zamblak skills (`.agents/skills/`)
4. Canonical docs/specs (`docs/`, `specs/`)
5. SQL/source files
6. Diffs/tests/DB verification
7. Graphify (as navigation only)

## Authority and Decision Gates

### Workflow Authority
- Root `AGENTS.md` governs repository workflow, task control, safety gates, and agent conduct.

### Product Authority
- Approved Zamblak product, role, privacy, security, and specification documents govern intended product behavior.
- `AGENTS.md` must not invent or replace product requirements.

### Technical Reality
- Current committed source code and Supabase migrations govern what is actually implemented and enforced.
- Documentation must not claim runtime, database, RLS, route, authentication, or authorization behavior that current source or migrations do not prove.

### Task Prompts & Compact Briefs
- A task prompt defines the current bounded operation.
- It must remain consistent with `AGENTS.md`, approved product authority, and verified technical reality.
- A task prompt must not silently override them.
- **Compact Delta Prompts:** Routine Antigravity tasks receive only task-specific delta context:
  1. Task objective and delta requirements;
  2. Relevant evidence capsule (starting state, key commits, contract references);
  3. Task boundary or material exceptions (allowed files, forbidden paths);
  4. Required validation;
  5. Report / next-action contract.
- **No Law Duplication:** Do not repetitively copy standing repository law (Git gates, DB rules, safety policies, product definitions, reporting structure) already discoverable in `AGENTS.md` or routed skills into routine prompts.
- **Resumed Writer Sessions:** When resuming an interrupted session, provide only delta instructions and the compact Recovery Capsule, never the full original prompt or historical transcripts.
- **Reference Guidance:** Follow the compact brief template (`<task>`, `<evidence>`, `<scope>`, `<validation>`, `<report>`) documented in `.agents/skills/zamblak-agent-control/references/writing-the-brief.md`.

### Visual References
- Stitch screens, screenshots, mockups, ZIP archives, and design samples are visual references only.
- They do not authorize scope, roles, permissions, data visibility, or implementation status.

### Agent Reports
- Agent output is execution and review evidence only.
- It is not automatically a source of truth.
- Claims must be verified against repository state, current source, migrations, or approved documentation.

### Direct Conflicts
- Do not silently choose between conflicting authorities.
- Identify the conflict precisely.
- Stop with HOLD when the conflict affects correctness, scope, permissions, security, privacy, data behavior, or safe execution.

## Verdict Vocabulary & HOLD Discipline

Every task must conclude with one of the standard verdicts:

### PASS
Use PASS only when:
- All mandatory acceptance criteria pass;
- Repository state matches the expected baseline and final state;
- Required validation passes;
- No unresolved safety, security, privacy, role, data, scope, or source-of-truth conflict remains.

### PASS WITH WARN
Use PASS WITH WARN only when:
- All mandatory acceptance criteria pass;
- The remaining warning is precise, evidence-based, and nonblocking;
- Bounded non-blocking state must be preserved or accounted for in the next task;
- It does not involve security, privacy, role or permission leakage, account isolation, data corruption or loss, migration uncertainty, validation failure, repository-state mismatch, or unsupported completion claims.
- A warning must not be used to bypass a HOLD condition.

### PARTIAL
Use PARTIAL only when:
- Work is clearly incomplete without a true blocker;
- Bounded deliverables within an authorized milestone are delivered and verified, but subsequent steps remain for a planned follow-up;
- All completed work is validated and safe;
- Useful for handoff or incremental review where full slice completion was not authorized or time/boundary constraints require a safe stopping point.

### FAIL
Use FAIL when:
- Required validation fails after the authorized diagnose/repair loop;
- Severe implementation defect or regression cannot be resolved within scope.

### HOLD
HOLD is reserved for genuine blockers where safe execution or mutation planning cannot proceed:
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

## Reporting Format
All tasks must end with a structured evidence-based report:
```
TASK RESULT: <PASS | PASS WITH WARN | PARTIAL | HOLD | FAIL>
Task: <ID>
Files modified: ...
Validation: ...
Notes: ...
EXACT NEXT ACTION: <Single unambiguous next action>
```
Reports must never claim evidence that was not actually obtained. Every report must end with exactly one controlled next action.
