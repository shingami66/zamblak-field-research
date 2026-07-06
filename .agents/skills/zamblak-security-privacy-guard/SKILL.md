---
name: zamblak-security-privacy-guard
description: Enforces privacy and security boundaries.
---
# Zamblak Security & Privacy Guard

**When to use:** When handling respondent PII, authentication, and role assignments.
**What it guards:** Data privacy, PII protection, and correct `support_helper` vs `owner` access levels.
**Required checks:** Verify roles matrix in `docs/roles-permissions.md`.
**Forbidden actions:** Reading `.env` files, leaking PII, granting `support_helper` financial access.
**PASS/HOLD expectations:** Privacy rules are maintained, role constraints are verified.
