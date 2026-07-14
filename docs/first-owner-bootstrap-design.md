# Approved First-Owner Bootstrap Design

**Status:** APPROVED DESIGN ONLY
**Implementation status:** NOT IMPLEMENTED
**Database apply status:** NOT APPLIED
**Runtime availability:** NOT AVAILABLE AT RUNTIME

Canonical reference for the controller-approved, independently reviewed first-Owner bootstrap design under `ZAM-AUTH-001C`. This document does **not** claim a function, migration, or DEV/DEMO apply exists.

## 1. Approval chain

| Stage | Task | Result |
|---|---|---|
| Initial design | `ZAM-AUTH-001C-FIRST-OWNER-BOOTSTRAP-DESIGN-1` | Produced; controller HOLD (three P0 gaps) |
| Corrected design | `ZAM-AUTH-001C-FIRST-OWNER-BOOTSTRAP-DESIGN-FIX-1` | PASS |
| Independent security/architecture review | `ZAM-AUTH-001C-FIRST-OWNER-BOOTSTRAP-DESIGN-REVIEW-1` | PASS (0 P0, 0 P1); three nonblocking implementation requirements |
| Mozfer/controller approval | `ZAM-AUTH-001C-FIRST-OWNER-BOOTSTRAP-DESIGN-APPROVAL-1` | APPROVED |

## 2. Product scope (current MVP)

- `MVP_ACCESS_POLICY` remains `INVITATION_OR_ADMIN_SEED_ONLY`.
- Public self-service signup is disabled.
- Arbitrary account creation is disabled.
- Users cannot select their own role or create/promote themselves as Owner.
- This bootstrap is a **globally one-time deployment initialization** path for the present Zamblak deployment.
- It may create **exactly one** initial account and **exactly one** initial active, non-deleted Owner.
- It is **not** reusable to provision additional accounts or first Owners.
- Additional tenant / first-Owner provisioning is a **separate future program** (not authorized by this design).
- This path is **not** sole-Owner recovery.
- Bootstrap is never available through public or normal application routes.

## 3. Current source reality

Verified in committed migrations and application source (not re-applied by this documentation task):

- `public.accounts` has no authenticated `INSERT` RLS policy; normal user sessions cannot create accounts under RLS.
- `public.profiles` `ins_profiles_owner` requires an existing Owner (`is_owner()` and current `account_id`); first Owner cannot be created via normal authenticated RLS (chicken-and-egg).
- Defense-in-depth already present:
  - `profiles.auth_user_id` UNIQUE;
  - partial unique index: at most one active non-deleted Owner per account;
  - `role` CHECK constrained to `owner` / `support_helper`;
  - `account_id` FK to `accounts`.
- These constraints are **not** the global bootstrap gate.
- No bootstrap function, migration, or privileged bootstrap path exists in source yet.
- Live login, session refresh, protected routes, and profile resolution are absent. `mockRole` is UI-only.

## 4. Selected mechanism

- One privileged `SECURITY DEFINER` database function (conceptual name: `public.bootstrap_first_owner(...)`).
- **Invocation boundary (exactly one preferred MVP boundary):** Mozfer-operated privileged SQL-owner session only (for example Supabase SQL Editor as migration-owner / `postgres`-class role).
- **Must not** be invoked from: browser, Next.js page, Server Action, Route Handler, Proxy, Edge Function, normal authenticated session, `anon`, `authenticated`, or any `service_role` application path.
- Fixed safe `search_path` (aligned with hardened helpers: include `pg_catalog` and `public`).
- Schema-qualified references to security-sensitive objects (including `auth.users`, `public.accounts`, `public.profiles`).
- `EXECUTE` must be revoked from `PUBLIC`, `anon`, `authenticated`, and `service_role`.
- Exact function owner role is pinned and proven only during later SQL implementation and apply verification (not claimed here).

## 5. Transaction and gate sequence

All of the following occur in **one** database transaction.

1. **Mandatory fixed transaction-scoped advisory lock**
   - Acquired **before** all availability, Auth-user, account, and profile checks.
   - Lock identity is **fixed** and must **not** depend on Auth user, account, caller, request, or environment input.
   - Exact lock function form and numeric constants are **not frozen yet**; they must be frozen in `ZAM-AUTH-001C-FIRST-OWNER-BOOTSTRAP-SQL-DRAFT-1`.
   - Released automatically on commit or rollback.

2. **Deterministic fail-closed checks (order fixed):**

   | Order | Gate | Failure code |
   |---|---|---|
   | 1 | Any active non-deleted Owner (`role = owner`, `active = true`, `deleted_at IS NULL`) | `bootstrap_already_completed` |
   | 2 | Any historical Owner profile (any other Owner state) | `bootstrap_historical_owner_present` |
   | 3 | Any pre-existing `public.accounts` row | `bootstrap_preexisting_accounts` |
   | 4 | Mandatory existence of Auth UUID in schema-qualified `auth.users` | `auth_user_not_found` |
   | 5 | Any existing profile for that Auth user | `auth_user_already_profiled` |
   | 6 | Input validation | `invalid_input` |

3. **Atomic writes (only if all gates pass):**
   - Create **one** new account with a database-generated ID.
   - Create **one** new profile attached **only** to that new account.
   - Hard-code: `role = owner`, `active = true`, `deleted_at = NULL`.
   - Return only bounded identifiers (`account_id`, `profile_id`, `auth_user_id`).
   - Commit.

4. **On any failure:** no account row persists; no profile row persists; no ambiguous success; lock releases with the transaction.

## 6. Inputs

**Allowed conceptual inputs:**

- Existing Auth user UUID
- Account display name
- Owner display name
- Optional Owner phone

**Prohibited inputs:**

- `account_id` or existing-account selector
- `role`, `active`, `deleted_at`, profile ID
- Force, override, recovery, or tenant-provisioning flags

## 7. Success and failure contract

**Success payload (bounded):** `account_id`, `profile_id`, `auth_user_id` only (no secrets).

**Stable failure codes (minimum):**

- `bootstrap_already_completed`
- `bootstrap_historical_owner_present`
- `bootstrap_preexisting_accounts`
- `auth_user_not_found`
- `auth_user_already_profiled`
- `invalid_input`
- `bootstrap_forbidden`
- `bootstrap_failed`

**Post-success deterministic code:** any later invocation (same or different Auth user) returns **`bootstrap_already_completed`** only. Do not document post-success as `auth_user_already_profiled` or “and/or” alternatives.

## 8. Concurrency and replay

- Concurrent callers serialize on the fixed transaction-scoped advisory lock.
- The waiting transaction re-evaluates all gates after acquiring the lock.
- Two different Auth users cannot both create accounts under concurrent load.
- Exact lock contention/timeout surfaces as infrastructure/timeout failure when the statement times out; business success is never dual-committed.

## 9. Historical Owner and pre-existing accounts

- Active non-deleted Owner closes the path permanently for this function.
- Inactive or soft-deleted historical Owner profiles close the path with `bootstrap_historical_owner_present` (no reactivate/replace/recover).
- Pre-existing accounts close the path with `bootstrap_preexisting_accounts` (no attach).
- Sole-Owner recovery remains a separate deferred design.

## 10. External Auth-user lifecycle

- Supabase Auth user creation occurs **outside** the public-schema account/profile transaction.
- A failed bootstrap may leave an unused Auth user; cleanup is manual and Mozfer-owned.
- No public application account or profile row may remain after rollback.
- Dashboard visual confirmation is **not** a substitute for the mandatory `auth.users` SQL check.
- A profile must never be created for an unverifiable UUID.

## 11. Runtime boundary after bootstrap

- Later normal application access uses Supabase Auth, `@supabase/ssr`, authenticated session handling, database-backed profile/account resolution, and RLS.
- `mockRole` remains UI-only and is not authorization.
- Live login, logout, session refresh, protected routes, and profile resolution remain **not implemented**.
- Service-role and privileged credentials remain outside browser and normal application paths.

## 12. Mandatory later implementation requirements

From independent review (nonblocking for design approval; mandatory before implementation acceptance):

1. Freeze and document the exact advisory-lock function form and numeric constants in `ZAM-AUTH-001C-FIRST-OWNER-BOOTSTRAP-SQL-DRAFT-1`.
2. Preserve strict failure precedence so post-success invocation always returns `bootstrap_already_completed`.
3. Pin the actual function owner after apply and prove that owner can authoritatively `SELECT` from `auth.users`.

## 13. Explicit non-claims

- Bootstrap function does **not** exist in the repository.
- No bootstrap migration exists.
- Design is **not applied** to DEV/DEMO or any database by this documentation.
- Live authentication is **not** started.
- Production readiness is **not** claimed.
- Additional tenant creation is **not** authorized.
- This path is **not** sole-Owner recovery.

## 14. Deferred

SQL implementation; migration drafting; DEV/DEMO apply; post-apply verification; login/logout; Proxy/session refresh; protected routes; `mockRole` replacement; Support Helper invitation/onboarding; sole-Owner recovery; additional tenant provisioning; public self-provisioning; email confirmation hard requirement; future provisioning abuse controls/rate limits; browser smoke; production onboarding; residual non-SELECT privilege cleanup.

## 15. Proposed controlled sequence after this documentation

1. `ZAM-AUTH-001C-FIRST-OWNER-BOOTSTRAP-DESIGN-DOCS-REVIEW-1` — independent docs review
2. Docs commit with explicitly authorized post-commit Graphify refresh
3. Docs push (separate task)
4. `ZAM-AUTH-001C-FIRST-OWNER-BOOTSTRAP-SQL-DRAFT-1` — SQL draft only
5. SQL review; later commit/push gates as authorized
6. Mozfer-owned DEV/DEMO action when authorized
7. Read-only post-apply verification
8. Later authentication/session tasks remain separate programs
