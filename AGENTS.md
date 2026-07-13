# Zamblak Agent Rules

## Task Classification & Execution Modes
All tasks must be classified and assigned an exact execution mode before execution.
Supported modes include: `READONLY_REVIEW_ONLY`, `SQL_DRAFT_ONLY`, `SQL_DRAFT_FIX_ONLY`, `SKILLS_GOVERNANCE_FIX_ONLY`, `DOCS_SYNC_ONLY`, `IMPLEMENT_NO_STAGE`, `SUPABASE_APPLY_PRECHECK_ONLY`, `SUPABASE_APPLY_ONLY`, `PRECOMMIT_REVIEW_ONLY`, `COMMIT_ONLY`, `PUSH_ONLY`.

## Mandatory First-Run Behavior
Every task must explicitly read this `AGENTS.md` and `.agents/skills/zamblak-agent-control/SKILL.md` before taking action.

## Local Skill Stack Overview
Local skills reside in `.agents/skills/`. The agent must select the **smallest relevant skill stack only** to minimize operational surface area. Do not overuse broad skills.
- `zamblak-agent-control`: Core execution protocol and task orchestration.
- `zamblak-db-rls-migration-guard`: Migration, SQL, and RLS schema protection.
- `zamblak-precommit-gate`: Git staging and commit protections.
- `zamblak-product-manager`: PRD alignment and product requirement rigor.
- `zamblak-fieldwork-domain-guard`: Field research domain logic.
- `zamblak-security-privacy-guard`: Privacy and tenant boundaries.
- `zamblak-docs-guard`: Documentation integrity.
- `zamblak-ui-rtl-senior-ux-guard`: Arabic-first UX logic.

## Approved & Forbidden Files Per Task
Modify only files explicitly relevant to the current task scope.
- Do not modify `.env` files or read any secret credentials.
- No G7 business-rule contamination: Zamblak must remain entirely free of CRM terminology like Quotations, Invoices, VAT, ZATCA, etc. (These are forbidden contamination examples).

## Git & Database Rules
- NO commit without explicit approval.
- NO push without explicit approval.
- NO destructive git commands without explicit approval.
- **SQL_DRAFT_ONLY** and **SQL_DRAFT_FIX_ONLY**: Write or fix SQL drafts locally. Do NOT apply to the database.
- **SUPABASE_APPLY_ONLY**: Only apply SQL if the task mode explicitly allows it and user has approved. No migration apply without explicit approval.

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

### Task Prompts
- A task prompt defines the current bounded operation.
- It must remain consistent with `AGENTS.md`, approved product authority, and verified technical reality.
- A task prompt must not silently override them.

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

### PASS
Use PASS only when:
- all mandatory acceptance criteria pass;
- repository state matches the expected baseline and final state;
- required validation passes;
- no unresolved safety, security, privacy, role, data, scope, or source-of-truth conflict remains.

### PASS WITH WARN
Use PASS WITH WARN only when:
- all mandatory acceptance criteria pass;
- the remaining warning is precise, evidence-based, and nonblocking;
- it does not involve security, privacy, role or permission leakage, account isolation, data corruption or loss, migration uncertainty, validation failure, repository-state mismatch, or unsupported completion claims.

A warning must not be used to bypass a HOLD condition.

### HOLD
Use HOLD when:
- repository baseline or file inventory differs;
- required authority or evidence is missing or contradictory;
- a validation fails;
- scope would need to broaden;
- an unexpected file or state appears;
- permissions, roles, PII, account isolation, database safety, or product correctness are uncertain;
- a destructive or unauthorized action would be required;
- the task cannot be completed without inventing facts.

### Required HOLD Behavior
When HOLD occurs:
- make no speculative fix unless the current task explicitly authorizes a narrow fix;
- perform no unrelated work;
- do not stage, commit, push, apply migrations, install tools, or broaden scope;
- report the exact blocking evidence;
- provide exactly one narrow recovery task ID or recovery action;
- preserve the repository state.

## Reporting Format
All tasks must end with a structured PASS/HOLD report:
PASS/HOLD
Task: <ID>
Files modified: ...
Validation: ...
Notes: ...
Next recommended task: ...
