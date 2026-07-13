---
name: zamblak-docs-guard
description: Maintains documentation structure and integrity under AGENTS.md and agent-control.
---
# Zamblak Docs Guard

## Authority

Root `AGENTS.md` is the workflow authority. This skill specializes documentation integrity only and must not contradict, weaken, replace, or duplicate agent-control. When documentation and higher authority conflict, report HOLD.

## Canonical document map

| Document | Primary purpose | Claim boundary |
|---|---|---|
| `docs/product-requirements.md` | Approved product behavior, roles, scope, privacy, and business rules | Must not be silently rewritten by status or roadmap prose |
| `docs/project-status.md` | Verified current implementation state, risks, warnings, and next controlled activity | Must reflect evidence, not intent |
| `docs/project-roadmap.md` | Sequencing, deferred work, and phase order | Planned work is not implemented work |
| `docs/ui/ui-implementation-roadmap.md` | UI batch planning and implementation sequencing | Must distinguish planned, in progress, implemented, and deferred |
| `docs/ui/frontend-foundation-plan.md` | Frontend foundation planning and validation intent | Must not claim runtime, auth, or data completion |
| `docs/leanctx.md` | Concise navigation and context recovery | Summary aid only; never overrides technical reality or canonical docs |

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
