---
name: zamblak-docs-guard
description: Maintains documentation structure and integrity under AGENTS.md and agent-control.
---
# Zamblak Docs Guard

## Authority

Root `AGENTS.md` is the workflow authority. This skill specializes documentation integrity only and must not contradict, weaken, replace, or duplicate agent-control. When documentation and higher authority conflict, report HOLD.

## Canonical document map

This map reconciles the repository authority set. `docs/contracts/*` are subordinate Phase workflow artifacts and are intentionally NOT listed here as canonical authority (see "Phase Delivery Workflow Contract Artifacts" below).

| Document | Primary purpose | Claim boundary |
|---|---|---|
| `README.md` | Repository entry point and discoverability surface | Entry point only; not product authority |
| `docs/product-requirements.md` | Approved product behavior, roles, scope, privacy, and business rules | Must not be silently rewritten by status or roadmap prose |
| `docs/roles-permissions.md` | Current role and permission boundaries; Owner-first and legacy-role boundaries | Implemented role, route, and capability truth |
| `docs/database-schema.md` | Current physical schema and invariants; current versus future domain separation | Physical schema and invariant truth (source + migrations) |
| `docs/database-migrations.md` | Local migration source ledger and remote-registration evidence boundaries | Distinguish local source from claimed/applied registration |
| `docs/security-foundation.md` | Authentication, authorization, RLS, tenant, privacy, and security boundaries | Security authority; fail-closed boundaries |
| `docs/project-roadmap.md` | Phase status, sequencing, delivery order, and future direction | Planned work is not implemented work |
| `docs/deferred-decisions.md` | Unresolved, deferred, closed, superseded, and historical decision register | Register; not current implementation authority |
| `docs/project-status.md` | Historical evidence and next controlled activity | Historical evidence only; not current product authority |
| `docs/ui/ui-implementation-roadmap.md` | UI batch planning and implementation sequencing | Must distinguish planned, in progress, implemented, and deferred |
| `docs/ui/frontend-foundation-plan.md` | Frontend foundation planning and validation intent | Must not claim runtime, auth, or data completion |
| `docs/leanctx.md` | Concise navigation and context recovery | Summary aid only; never overrides technical reality or canonical docs |

## Documentation Artifact Classification

Every new documentation artifact must be classified before creation as exactly one of:

1. Canonical authority
2. Subordinate workflow or design artifact
3. Historical evidence
4. Generated or non-authoritative output

For every new artifact, the agent must identify before writing:

- its classification and purpose;
- its governing parent authorities;
- whether a suitable existing document should be updated instead;
- why a new file is necessary;
- its approved path and naming convention;
- its registration or index location;
- whether README or another entry point requires synchronization;
- whether roadmap phase or active-slice status changes;
- whether deferred-decisions synchronization is required;
- whether the artifact introduces unresolved decisions;
- whether creation would introduce a competing source of truth;
- whether another artifact must exist or be reviewed first;
- whether the task whitelist includes the full required synchronization set.

## No Orphan Documentation Rule

1. A documentation file must not be created without: classification; authority boundary; parent authority references; a registration decision; a roadmap-impact decision; a deferred-decision impact check; and a delivery-stage relationship.
2. A new file must not be created merely because an existing document is inconvenient or large.
3. Prefer updating or consolidating an existing suitable document when that preserves clarity and authority.
4. When a new artifact requires registration, roadmap synchronization, parent links, or decision-register synchronization, the complete required documentation set must be allowed by the task before the first write.
5. If the whitelist is insufficient, return HOLD before creating the artifact.
6. Do not create the artifact first and leave registration, classification, phase synchronization, or decision handling for an optional follow-on task.
7. Do not report PASS for an unregistered artifact when registration is required.
8. A file may remain unregistered only when repository governance explicitly classifies it as generated, temporary, intentionally undiscoverable, or non-authoritative tool output.
9. An untracked documentation file is not governance-complete merely because its internal content is correct.

## Phase Delivery Workflow Contract Artifacts

1. `docs/contracts/*` are subordinate Phase delivery workflow artifacts.
2. They conform to and never override: product requirements; roles and permissions; schema and migration truth; security and privacy boundaries; deferred decisions; and roadmap sequence.
3. Every contract must state near the top: Status; Authority boundary; Delivery boundary; Governing documents; Unresolved decisions; and Explicit non-claims.
4. Existing contracts must be registered in the repository entry point or an approved contract index explicitly linked from the entry point.
5. Do not register a contract that does not exist.
6. Do not label workflow contracts as canonical product authority.
7. A Screen Contract does not complete its Data Contract.
8. A Data Contract does not imply completion of: wireframe; visual specification; implementation; runtime acceptance; manual smoke; or phase closure.
9. Contract creation may move a roadmap phase from NOT STARTED to IN PROGRESS only when the artifact genuinely begins the approved phase work.
10. Contract creation never means: implementation completion; runtime acceptance; database verification; phase completion; or production readiness.
11. A contract must distinguish: canonical product truth; current source evidence; temporary implementation; prototype behavior; mock/demo behavior; and future/non-live direction.

## Decision Registration Trigger

1. Existing deferred-decision IDs must be referenced whenever relevant.
2. Do not silently resolve, close, supersede, rename, or change the status of an existing decision.
3. A newly discovered unresolved decision must be reported exactly as: UNREGISTERED DECISION CANDIDATE.
4. Do not assign a new decision ID unless the current task explicitly authorizes modification of `docs/deferred-decisions.md`.
5. Classify whether each unresolved decision blocks: current artifact completion; the next delivery stage; implementation only; runtime acceptance; or a future phase.
6. If a blocking decision must be recorded but the decision register is outside scope, return HOLD before claiming the affected artifact complete.
7. A nonblocking future decision may remain unregistered only when the artifact clearly marks it as an UNREGISTERED DECISION CANDIDATE and states the stage it blocks.
8. Documentation tasks must not invent decision outcomes merely to avoid HOLD.

## Sync triggers

Inspect canonical documentation after material changes involving:

- user-visible behavior;
- product scope;
- roles or permissions;
- security or privacy behavior;
- database, schema, RLS, or migration behavior;
- implemented routes or screens;
- deferred or removed functionality;
- workflow-governance changes;
- materially changed validation or manual-smoke state.

Do not broaden docs work for read-only reviews, push-only tasks, mechanical Git checks, or narrow recovery that does not change documented behavior.

## Minimum-update rule

- Inspect all materially relevant canonical documents first.
- Modify only documents that are stale or contradictory.
- Explain why each changed document required an update.
- List inspected documents that required no change.
- Preserve unrelated history, dates, milestones, and decisions.
- Avoid broad roadmap rewrites or “touch everything” cleanup.

## Evidence boundaries

Documentation must separate these claim types:

1. Planned or designed.
2. Static source evidence.
3. Build or static validation.
4. Runtime evidence.
5. Mozfer manual smoke.
6. Database evidence.
7. Live authorization or security evidence.

Do not collapse these into one completion claim. A navigation link is not an implemented route. A static mock is not live auth. Build PASS is not manual smoke PASS. UI visibility alone is not authorization.

## Unsupported-claim controls

Documentation must not claim completion based only on roadmap intent, a design file, Stitch screens, screenshots, navigation links, placeholder UI, unexecuted migration SQL, agent assumptions, successful TypeScript or lint alone, a commit existing, or a planned integration.

Use precise status terms such as `planned`, `deferred`, `in progress`, `implemented in source`, `static validation passed`, `runtime verified`, `manually smoke-tested by Mozfer`, `applied to DEV`, `post-apply verified`, `blocked`, and `superseded`. Avoid vague completion wording unless the evidence supports it.

## DOCS_ONLY behavior

A docs task may inspect canonical docs, source, and verified evidence; update only stale or contradictory documents; and run documentation-relevant Git validation.

A docs task must not modify implementation, apply migrations, stage, commit, push, or invent runtime/manual evidence. If an implementation defect is discovered, report HOLD and hand off a narrow fix or verification task.

## Contradiction handling

When canonical documents conflict:

- identify the exact conflicting statements;
- compare them against current source, migrations, approved product authority, and verified evidence;
- update only the document that is stale when authority clearly resolves the conflict;
- otherwise HOLD;
- do not silently choose the more convenient statement.

## Safety

- Keep documentation changes compact and local to the stale surface.
- Preserve unrelated history and context.
- Do not introduce G7 CRM terminology or other irrelevant product rules.
- Do not duplicate full Git, staging, commit, or push policy from precommit-gate.
- Do not stage the docs-guard change during governance review.
