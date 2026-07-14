# Approved First-Owner Bootstrap Design

**Status:** APPROVED DESIGN + REPOSITORY IMPLEMENTATION + DEV/DEMO VERIFIED
**Implementation status:** IMPLEMENTED IN REPOSITORY (`supabase/migrations/20260714114814_first_owner_bootstrap.sql`)
**Database apply status:** APPLIED AND VERIFIED ON DESIGNATED DEV/DEMO (`gdegnwglakyblnmxgiwx`)
**Bootstrap path on DEV/DEMO:** GLOBALLY CONSUMED (do not re-invoke)
**Application runtime:** Live login/session/profile resolution still NOT implemented


Canonical reference for the controller-approved first-Owner bootstrap under `ZAM-AUTH-001C`.

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
- Bootstrap function and migration now exist in repository and were applied on designated DEV/DEMO (see section 12).
- Live login, session refresh, protected routes, and profile resolution remain absent. `mockRole` is UI-only.

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

## 12. Implementation and DEV/DEMO closeout (completed)

| Gate | Result |
|---|---|
| SQL draft / review / commit / push | Complete (`20260714114814_first_owner_bootstrap.sql`; `current_user` syntax fix in `fd847f5`) |
| Frozen lock | `-1850433270600458575` / namespace `zamblak:first-owner-bootstrap:v1` |
| Function owner + `auth.users` SELECT | Verified on DEV/DEMO as `postgres` |
| DEV/DEMO migration apply | Complete (SQL Editor, project `gdegnwglakyblnmxgiwx`) |
| Pre-bootstrap readiness | accounts/profiles/Owners all `0` |
| First bootstrap | Complete once (account `Zamblak Field Research`; Owner display name recorded without Auth secrets) |
| Post-bootstrap | accounts `1`, profiles `1`, active Owners `1`, Support Helpers `0` |
| Replay | `bootstrap_already_completed`; counts remained `1` / `1` |

SQL-owner-only contract preserved: no browser/app/`service_role` EXECUTE path.

## 13. Explicit non-claims

- Live authentication (login/logout), Proxy/session refresh, protected routes, and app profile/account resolution are **not** started.
- `mockRole` remains UI-only until a later authorized replacement.
- Production readiness is **not** claimed.
- Supabase migration-history registration is **not** claimed (manual SQL Editor apply).
- Additional tenant creation is **not** authorized by this path.
- This path is **not** sole-Owner recovery; soft-delete does **not** reopen bootstrap.
- Do **not** re-invoke bootstrap on the designated DEV/DEMO database.

## 14. Deferred

Login/logout; Proxy/session refresh; protected routes; `mockRole` replacement; invitation/Support Helper onboarding UX; sole-Owner recovery; additional tenant provisioning; public self-provisioning; email confirmation hard requirement for future programs; browser smoke for live auth; production onboarding; residual non-SELECT privilege cleanup; migration-history registration.

## 15. Next controlled sequence

1. `ZAM-AUTH-001D-LIVE-LOGIN-SESSION-PLAN-1` — plan live login and session integration under authenticated user-session RLS (not started).
2. Subsequent bounded tasks for Proxy refresh, login UX, profile resolution, and `mockRole` retirement as separately authorized.
