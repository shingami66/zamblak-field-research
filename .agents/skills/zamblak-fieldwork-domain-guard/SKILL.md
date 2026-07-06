---
name: zamblak-fieldwork-domain-guard
description: Protects specific fieldwork domain logic and constraints.
---
# Zamblak Fieldwork Domain Guard

**When to use:** When implementing respondent workflows, participation tracking, and accepted/completed statuses.
**What it guards:** The rule that accepted forms count financially, while completed/transferred do not. Warns on 3-month same-domain participation.
**Required checks:** Verify state transitions for participations.
**Forbidden actions:** Hard blocking same-domain within 3 months (must be warning only).
**PASS/HOLD expectations:** Domain logic perfectly matches PRD.
