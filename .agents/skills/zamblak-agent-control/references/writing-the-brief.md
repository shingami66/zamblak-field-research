# Writing the Brief: Compact Antigravity Task Prompts

## Purpose
This reference defines the compact prompt and skill routing pattern for Zamblak tasks in Antigravity. It ensures routine tasks stay lean, focused, and fast by providing only task-specific delta context while relying on repository governance (`AGENTS.md`) and routed skills for standing law.

---

## Core Principles

1. **Delta Context Only:** Provide only what changes for this specific task. Do not copy-paste standing Git rules, database rules, secret gates, or product requirements.
2. **Standing Law Inheritance:** Standing repository law is already loaded and enforced via `AGENTS.md` and routed skills. Prompts should reference these authorities rather than repeat them.
3. **Route Minimal Skills:** Route only the smallest materially relevant skill stack needed for the specific task domain (e.g., `zamblak-db-rls-migration-guard` for SQL, `zamblak-ui-rtl-senior-ux-guard` for Arabic UI). Never route every skill by default.
4. **Skills Provide Domain Reasoning, Not Authority:** A routed skill guides implementation quality and checks; it does not grant broader file access, Git/DB write authority, or product-decision authority.
5. **Session Resumptions:** Interrupted or resumed Writer sessions receive delta instructions plus the compact Recovery Capsule, never the full original prompt or large historical logs.

---

## Compact Brief Structure

Routine task briefs use a concise, tag-based or sectioned format. Not every tag is mandatory for simple tasks; include only what the task requires:

```markdown
TASK: <ID>
ROLE: <MUTATING WRITER | INDEPENDENT REVIEWER | CONTROLLER>
[MODE: <OPTIONAL_LABEL>]

<task>
Objective and delta requirements for this bounded task.
</task>

<evidence>
Relevant starting baseline (e.g. HEAD SHA, branch, recent commits, or contract references).
</evidence>

<scope>
Authorized files / working boundary, and any material exceptions or forbidden surfaces.
</scope>

<validation>
Proportional task-specific checks (e.g. specific test files, diff checks, type checks).
</validation>

<report>
Expected verdict format and exact single next action.
</report>
```

---

## Section Guidelines

### `<task>`
- State the specific, bounded goal.
- State the role (`MUTATING WRITER` or `INDEPENDENT REVIEWER`).
- Include mode label only when narrowing or describing authority (e.g., `IMPLEMENT_NO_STAGE`, `REVIEW_ONLY`, `READ_ONLY_AUDIT`).

### `<evidence>`
- Provide the verified starting state: branch, HEAD SHA, or relevant commit hash.
- Reference existing contracts or documents by relative path.
- Avoid reproducing full commit logs or file contents.

### `<scope>`
- List authorized files explicitly when narrow boundaries apply.
- Note any specific surfaces that must be preserved or ignored.
- Standing limits (no `.env`, no unauthorized DB writes, no unapproved commit/push, strict anti-contamination) apply automatically and do not need to be relisted.

### `<validation>`
- List only proportional checks for the affected surface.
- Avoid requiring full-suite runs for narrow single-file edits.

### `<report>`
- Specify the verdict options (`PASS`, `PASS WITH WARN`, `PARTIAL`, `HOLD`, `FAIL`).
- Provide the exact single next action string.

---

## Resumed Session Capsule Pattern

When resuming an interrupted Writer session:
```markdown
TASK: <ID> (RESUMED)
ROLE: MUTATING WRITER

<delta>
Remaining diagnostic or repair steps.
</delta>

<recovery-capsule>
- State: <branch, HEAD, modified files>
- Completed work: <what was already edited and passing>
- Current blocker: <exact test failure or diagnostic message>
</recovery-capsule>

<validation>
<checks to confirm resolution>
</validation>

<report>
<reporting contract>
</report>
```

---

## Skill Routing Quick Reference

| Domain / Task Surface | Routed Skill | Role |
| :--- | :--- | :--- |
| Core workflow, lifecycle, task control | `zamblak-agent-control` | Mandatory on all tasks |
| Independent review, delegation, session recovery | `zamblak-review-delegation` | Review delegation & recovery |
| OCR review preparation & delegation packets | `zamblak-opencodereview` | Review packet preparation |
| Supabase runtime, queries, RPCs, SSR cookies | `zamblak-supabase-data-engineering` | Runtime data access |
| Next.js App Router, actions, boundaries | `zamblak-nextjs-framework-engineering` | Framework mechanics |
| Performance bottlenecks, profiling, metrics | `zamblak-nextjs-performance-engineering` | Performance diagnostics |
| PostgreSQL query analysis, index suitability | `zamblak-postgres-query-index-guidance` | Query & index advice |
| Schema, migrations, RPCs, RLS policies | `zamblak-db-rls-migration-guard` | SQL / DB safety |
| Git staging, precommit reviews, commits | `zamblak-precommit-gate` | Precommit checks |
| Product requirements, PRD alignment | `zamblak-product-manager` | Product scope |
| Field research, respondent rules, forms | `zamblak-fieldwork-domain-guard` | Domain logic |
| Tenant boundaries (`account_id`), PII | `zamblak-security-privacy-guard` | Privacy & isolation |
| Documentation updates, ripple sync | `zamblak-docs-guard` | Documentation rigor |
| Arabic UI, RTL layouts, Tailwind/CSS | `zamblak-ui-rtl-senior-ux-guard` | RTL / UX design |
| Graph navigation, symbol tracing | `zamblak-graphify-navigation` | Navigation only |
