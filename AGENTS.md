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

## Reporting Format
All tasks must end with a structured PASS/HOLD report:
PASS/HOLD
Task: <ID>
Files modified: ...
Validation: ...
Notes: ...
Next recommended task: ...
