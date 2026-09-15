---
name: zamblak-fieldwork-domain-guard
description: Authoritative domain reasoning guard for Zamblak field research. Governs Respondent Registry uniqueness, participation eligibility, 3-month warnings, current 5-tier hierarchy boundaries, research form invariants, and accepted-only financial counting under AGENTS.md.
---

# Zamblak Fieldwork Domain Guard

## Purpose & Authority
This skill provides authoritative domain reasoning for Zamblak field research workflows. It ensures that application code, server actions, database RPCs, and agent tasks conform strictly to approved fieldwork principles, respondent registry rules, participation eligibility, and financial counting boundaries.

### Canonical Authority Hierarchy
- **Subordinate to Canonical Docs:** This skill derives domain truth from canonical repository authority:
  - [`docs/product-requirements.md`](file:///D:/Zamblak/Zamblak-field-research/docs/product-requirements.md)
  - [`docs/database-schema.md`](file:///D:/Zamblak/Zamblak-field-research/docs/database-schema.md)
  - [`docs/roles-permissions.md`](file:///D:/Zamblak/Zamblak-field-research/docs/roles-permissions.md)
  - [`docs/deferred-decisions.md`](file:///D:/Zamblak/Zamblak-field-research/docs/deferred-decisions.md)
  - [`docs/project-roadmap.md`](file:///D:/Zamblak/Zamblak-field-research/docs/project-roadmap.md)
- **Not a Competing PRD:** When product requirements change, canonical documentation and database evidence supersede any static summary in this skill.
- **Zero Technical Mutation Authority:** This skill provides domain reasoning only. It never authorizes Git operations, database DDL/migrations, SQL execution, secret access, or deployment actions.

---

## 1. Respondent Registry Principles

- **Heart of the Product:** The Respondent Registry is the central, shared foundation of Zamblak across all research projects.
- **Store Each Respondent Once:** Every human respondent must be registered exactly once. Never create duplicate respondent records merely because a respondent participates in multiple projects.
- **Mobile Number Uniqueness:** A single normalized mobile number (`9665xxxxxxxx`) identifies exactly one respondent. Mobile format validation and uniqueness are non-negotiable.
- **Registry Independence:** Respondent existence in the Registry is completely decoupled from project participation membership. A respondent may exist in the Registry without belonging to any project.
- **Identifier Boundary:** Raw database UUIDs are internal identifiers and must **never** be exposed as primary user-facing references.

---

## 2. Participation Eligibility & Membership

Distinguish clearly between:
1. **Registry Existence:** The respondent is registered in the database.
2. **Project Eligibility:** The respondent is eligible to be contacted or surveyed for a project.
3. **Participation Membership:** An explicit operational record linking a respondent to a project (`participations`).

### Key Membership Invariants:
- **Three-Month Same-Domain Warning (Warning Only):**
  - If a respondent participated in a project within the same domain within the past 3 months, Zamblak displays an informational warning to researchers.
  - **Cardinal Rule:** The 3-month same-domain rule is a **warning only**. It must **NEVER** become a hard block. Blocking same-domain participation within 3 months is a severe domain violation.
- **Same Project Hard Block:**
  - A respondent is strictly hard-blocked from participating more than once inside the **same active project**.
- **Project Liveness Prerequisite:**
  - Participation membership writes require the target project to have `status = 'active'` and `deleted_at IS NULL`.
  - `draft`, `closed`, `cancelled`, or soft-deleted projects strictly reject new participation creation, reassignment, or restoration.
- **Closed Project Boundary:**
  - Closing a project ends that project's active duplicate-blocking scope for future participation in other projects.
  - Closing a project does **not** permit new participation writes into the closed project.

---

## 3. Current Hierarchy vs Future Direction

### Current Runtime Truth (5-Tier Hierarchy):
$$\text{Account} \longrightarrow \text{Company} \longrightarrow \text{Project} \longrightarrow \text{Participation} \longrightarrow \text{Research Form}$$

- The physical database schema currently links `participations` directly to `projects(id)`.
- Stored research form identifiers use the legacy format `RF-YYYYMMDD-NNN`.

### Approved Future Direction (6-Tier Hierarchy):
$$\text{Account} \longrightarrow \text{Company} \longrightarrow \text{Project} \longrightarrow \mathbf{Sample} \longrightarrow \text{Participation} \longrightarrow \text{Research Form}$$

- Future target reference direction is `P###-S##-F###` (e.g., `P012-S01-F004`), scoped per sample.
- **Strict Boundary:** Agents must **never** assume that `ProjectSample` tables, `sample_id` foreign keys, `P###-S##-F###` counters, or sample UI exist today. The physical Sample domain remains unstarted until Phase 2 implementation.

---

## 4. Research Form Membership Invariants

- **Exactly One Persisted Form Per Participation:**
  - Every `Participation` record has at most one persisted `ResearchForm` row (`enforce_one_research_form_per_participation`).
  - Creating duplicate or secondary research forms for the same participation is strictly forbidden.
- **Same-Record Correction & Resubmission (DEC-FORM-001):**
  - If a research form is rejected during review, future correction must update the **same persisted research form record**.
  - Never create a new research form row for correction.
  - Do not invent correction workflow UI or state transitions beyond what current contracts explicitly authorize.
- **Distinct Date Semantics (DEC-FORM-002):**
  - `submitted_date`: The business calendar date on which the interview occurred (interview date).
  - `submitted_at`: The server-authoritative audit timestamp when the submission was recorded in the database.
  - The two fields have distinct semantics and must never be treated as interchangeable.

---

## 5. Submission Data Semantics (Approved Product Rules)

When reasoning about research form submissions, uphold these canonical semantics (DEC-FORM-003 through DEC-FORM-006):
- **Canonical Blank Notes (SQL NULL):** Research Form notes are optional. Leading/trailing whitespace is trimmed. A missing, blank, or whitespace-only notes value canonicalizes to SQL `NULL`; an empty string is not canonical absence.
- **Notes Length Bound:** Non-null trimmed notes must not exceed **2000 characters**.
- **Calendar Validity & Non-Future Date:** `submitted_date` must be a real calendar date (e.g. `2026-02-31` is invalid) and must not be later than the server-authoritative current date. Browser clocks are not authoritative.
- **Retry-Stable Idempotency:** One logical submission operation has one idempotency key. Retrying with the same payload replays the completed result; retrying with a different payload fails closed as a conflict. A new logical operation generates a new key.
- *Implementation Note:* These rules represent approved product semantics; divergence in older code paths does not authorize ad-hoc rewrites outside authorized tasks.

---

## 6. Review & Financial Counting Boundary

- **Accepted Forms Only:**
  - **Only** research forms with status `accepted` count financially toward respondent payout and client billing.
  - Forms in `draft`, `submitted`, `rejected`, `completed`, or `transferred` status do **NOT** count financially merely because fieldwork took place.
- **Acceptance as a Financial Event:**
  - Changing a form's status to `accepted` triggers financial calculations and locks an authoritative price snapshot.
- **Owner-Exclusive Financial Authority:**
  - All pricing configuration, financial totals, fee settings, payment logs, and collection settlements are strictly restricted to the `owner` role.
- **Support Helper Finance Blindness:**
  - The `support_helper` role is an operational assistant. It must remain completely finance-blind and never access pricing, payments, or financial totals.

---

## 7. Pricing Boundary Awareness

- **Zero Browser Pricing Authority:**
  - Client components must never compute, send, or assert monetary totals for storage.
- **No Silent Zero Defaults:**
  - Missing pricing configuration must **never** default or fall back to `0.00`.
- **Authoritative Server Snapshot:**
  - Form acceptance requires a usable price from `participation_pricing.price_snapshot` or fallback `project_financial_settings.price_per_accepted_form`.
  - If no price is configured, acceptance fails closed with `accepted_price_unavailable`.
- **Cross-Skill Routing for Implementation:**
  - Runtime Supabase queries & RPCs → `zamblak-supabase-data-engineering`
  - Authorization & tenant boundaries → `zamblak-security-privacy-guard`
  - Database schema & pricing migration → `zamblak-db-rls-migration-guard`

---

## 8. Account & Parent Consistency Invariants

Fieldwork domain logic must always preserve hierarchical consistency:
- All entities (`companies`, `projects`, `respondents`, `participations`, `research_forms`) share the same tenant `account_id`.
- A Participation must reference a Project belonging to the same Company and Account.
- Cross-account reassignment is strictly impossible.
- Reassigning Participations across Projects must strictly respect target project liveness and duplicate rules.

---

## 9. Current Truth vs Future Direction vs Unresolved Decisions

| Category | Current Implemented Truth | Approved Future Direction | Unresolved / Deferred |
| :--- | :--- | :--- | :--- |
| **Hierarchy** | 5-tier: `Account → Company → Project → Participation → Form` | 6-tier: `Account → Company → Project → Sample → Participation → Form` | Physical table design and migration timing for `project_samples` |
| **Form Codes** | Legacy `RF-YYYYMMDD-NNN` | Scoped reference `P###-S##-F###` | Sequence reset boundaries and overflow policy |
| **Roles** | `owner` (financial) and `support_helper` (operational) | Owner-first V1 focus; professional SaaS platform | Future multi-researcher role names, structures, and permission matrices |
| **Quotas** | Simple project-level respondent counts | Sample-level target counts | Multi-dimensional demographic quota engine (deferred) |
| **Correction** | Form rejection exists; error codes reserved | Same-record correction & resubmission (DEC-FORM-001) | Detailed correction UI, state transitions, and audit tracking |

---

## 10. Product Decision Discipline

When a task encounters an ambiguous requirement or an unapproved product choice:
1. **Never Infer or Invent:** Do not guess product policy, invent business workflows, or create unauthorized domain rules.
2. **Consult Canonical Authority:** Verify `docs/product-requirements.md` and `docs/deferred-decisions.md`.
3. **Route `zamblak-product-manager`:** If the choice is truly unresolved by repository authority, route `zamblak-product-manager` to formulate a clear, compact decision packet for the Owner.
4. **No Unnecessary Interruption:** Do not interrupt the Owner with technical or engineering choices that the existing canonical baseline already resolves.
