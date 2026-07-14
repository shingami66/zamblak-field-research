# Project Status

Current phase: First-owner bootstrap design approved; canonical documentation synchronized locally
Next task: ZAM-AUTH-001C-FIRST-OWNER-BOOTSTRAP-DESIGN-DOCS-REVIEW-1

## Current Activity
- Role-aware empty Dashboard Shell slice is complete and reflected in `src/app/page.tsx`, `src/components/dashboard/DashboardShell.tsx`, `src/components/layout/Navigation.tsx`, and `src/lib/auth/mock-role.ts`.
- Approved roles are limited to `owner` and `support_helper`.
- The shell remains static UI only for authorization: login is visual-only, `mockRole` remains the UI role source, and no live session, protected routes, or domain data access is implemented.
- `support_helper` does not receive `المستحقات` or `/financials`.
- Independent review found mismatched static role sources, support-helper financial navigation risk, unsupported researcher-team wording, and admin-like owner wording.
- Narrow fix completed with one shared static role source, source-level role filtering before navigation render, and corrected approved Arabic role descriptions.
- Independent re-review passed.
- Static validation passed: build, lint, TypeScript, and `git diff --check`.
- Mozfer manual smoke passed for both owner and support helper views.
- Deferred routes `"/companies"`, `"/projects"`, and `"/financials"` remain unimplemented and currently return Next.js 404 pages.
- `mockRole` was restored to `owner`.
- Impeccable and Graphify were not used for this slice.
- Participation project-state enforcement migration `supabase/migrations/202607130001_participation_project_state_guard.sql` was committed and pushed in `0d48fe8ed2d67b2f923a44b59f52a6dab0010577`.
- Mozfer manually applied the exact committed project-state guard to the designated DEV/DEMO database for project ref `gdegnwglakyblnmxgiwx`; post-apply structural verification and a controlled zero-UUID dry-run passed.
- Verified project-state enforcement covers participation INSERT, membership-creating project/respondent changes, and soft-delete restore for active non-deleted projects; missing, deleted, draft, closed, and cancelled projects fail closed.

## ZAM-WF-001F Role-Safe Read Surface (DEV/DEMO applied and verified)
- Program `ZAM-WF-001F-RLS-READ-SURFACE` completed migration source preparation, frozen-snapshot manual apply to designated DEV/DEMO, and read-only post-apply verification.
- Migration source: `supabase/migrations/202607130002_role_safe_read_surfaces.sql` (local untracked draft at apply time; SHA-256 `AE01C67A188E188533769E946C4965878975381B0E5CB1AF750431028F56EC8D`).
- Mozfer manually applied the byte-identical frozen snapshot once to DEV/DEMO project `gdegnwglakyblnmxgiwx` with no Supabase SQL error.
- Final read-only post-apply verification packet `ZAM-WF-001F-RLS-READ-SURFACE-POST-APPLY-VERIFICATION-PACKET-1` returned `overall_verdict = PASS` with empty failure arrays.
- Managed inventory verified: **11** functions, **2** views, **23** policies (managed manifest MD5 `f950c7ec5024dcf907d36f02df8c78b4`, octets `8238`).
- Owner base-table SELECT remains owner-only for current permitted rows; `project_operational_summary` and `project_financial_summary` grant authenticated SELECT while remaining owner-scoped through policy and view predicates.
- Support Helper database access remains limited to four whitelisted support-safe `SECURITY DEFINER` RPCs:
  - `support_participation_operational_rows(uuid, integer, integer)`
  - `support_profile_directory(integer, integer)`
  - `support_project_participation_summary(uuid, integer, integer)`
  - `support_project_directory(integer, integer)`
- Support Helper must not gain broad base-table reads, pricing visibility, payments visibility, financial-summary visibility, or review-only / sensitive respondent fields beyond the approved safe RPC surface.
- Verification also confirmed: fixed `search_path`, function EXECUTE ACLs, view structure/dependencies/ACLs, policy identities/expressions, core-table SELECT ACL contract, preserved participation project-state guard, preserved unique respondent-per-project index, and expected RLS state (RLS on, FORCE RLS off for the ten core tables).
- A compact note: the final evidence-exact verification packet passed after local verification-packet formatting corrections; those corrections were not database defects.
- Boundaries: DEV/DEMO database evidence only. No browser smoke, no live authenticated application integration claim, no customer production-readiness claim, and no Supabase migration-history registration claim (manual SQL Editor apply).
- Deferred residual privilege follow-up remains open: non-SELECT privileges such as `MAINTAIN`, `REFERENCES`, `TRIGGER`, and `TRUNCATE` on residual surfaces (including anon/service_role patterns) are out of scope for this completed program and must not be silently closed here.

## ZAM-AUTH-001A Supabase Runtime Client Foundation (CLOSED)
- Program `ZAM-AUTH-001A-SUPABASE-RUNTIME-CLIENT-FOUNDATION`: **CLOSED**. Final closure verification `ZAM-AUTH-001A-SUPABASE-RUNTIME-CLIENT-FOUNDATION-FINAL-CLOSURE-VERIFICATION-1` result: **PASS**.
- Verified auth-program chain: `567c021` (`feat(auth): add Supabase runtime client foundation`) → `130637e` (`docs(auth): record Supabase foundation push`) → `8da92f7` (`docs(auth): set final closure verification`).
- Auth-program final verification HEAD: `8da92f7bde113c94d8d456d1908e294c729d960c`. Program gates: implementation PASS; independent implementation review accepted (PASS WITH WARN: historical process note only); docs sync PASS; independent docs review PASS; precommit accepted; commit PASS; push PASS (mandatory dry-run evidenced); local/remote aligned after foundation push; post-push docs correction and durable status commits pushed and verified.
- Repository later advanced to current HEAD `e39068a9a79112ec4041bb8e953e3dd1f4775a82` via unrelated `chore(graphify): add project navigation workflow` (does not change auth implementation or 001A closure evidence). Local and remote `main` aligned at `e39068a`. Tracked tree clean at closure docs writing; implementation hashes verified; final verification made no file, commit, database, or remote mutation.
- Foundation commit: `567c021670b4f6546993c7529256df7b5e6cacf7` — env validation + browser/server client factories only.
- Static validation at foundation handoff: `lint`, standalone `tsc`, `build`, `git diff --check`.
- Direct packages: `@supabase/supabase-js`, `@supabase/ssr` (not deprecated Auth Helpers).
- Source modules: `src/lib/supabase/env.ts`, `client.ts`, `server.ts` (browser `createClient()` via `createBrowserClient`; request-scoped async server `createClient()` via `createServerClient` + awaited Next.js cookies getAll/setAll).
- Public environment contract names only: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Call-time validation only; no `.env` files added; no values claimed configured.
- Boundaries: runtime client foundation only. No live login/signup/logout, callback routes, Proxy/middleware session refresh, `getSession`/`getUser`/`getClaims`, route protection, profile/account resolution in the app, database/view/RPC/storage calls, generated Database TypeScript types, service-role client, browser smoke, or Supabase console configuration claims. Login remains visual/static. Customer production readiness is not claimed.
- Security: `mockRole` is UI-only and not authorization; live roles must resolve from authenticated database-backed profile/account context. Service-role/secret keys must never enter browser or normal application paths. User-session RLS remains the normal application path. Owner financial and Support Helper approved safe RPC-only boundaries remain unchanged. Residual non-SELECT privilege follow-up (`MAINTAIN` / `REFERENCES` / `TRIGGER` / `TRUNCATE`) remains open and separate.
- Next program after 001A was `ZAM-AUTH-001B` (access policy decision); that decision is now recorded below. Live authentication remains unimplemented.

## ZAM-AUTH-001B MVP Access Policy Decision (RECORDED)

Controller-approved binding MVP access policy:

- **MVP_ACCESS_POLICY:** `INVITATION_OR_ADMIN_SEED_ONLY`
- **Public self-service signup:** DISABLED FOR MVP
- **Arbitrary account creation:** DISABLED FOR MVP
- **User-selected role:** PROHIBITED
- **User-created Owner:** PROHIBITED
- **First Owner:** ONE-TIME CONTROLLED ADMINISTRATIVE BOOTSTRAP only
- **First-owner bootstrap exposure:** NOT AVAILABLE through public or normal application routes
- **Bootstrap after first active Owner:** DISABLED OR UNUSABLE
- **Support Helper onboarding:** AUTHORIZED OWNER OR CONTROLLED ADMINISTRATIVE CREATION ONLY
- **Support Helper self-registration:** PROHIBITED
- **Support Helper role escalation:** PROHIBITED
- **Runtime role authority:** SERVER-RESOLVED PROFILE AND ACCOUNT MEMBERSHIP UNDER RLS
- **mockRole authority:** NONE; UI-ONLY
- **Service-role:** NEVER in browser or normal user-session paths
- **Sole-Owner recovery:** DEFERRED SEPARATE DESIGN

### Long-term architecture (not MVP; not implemented; not approved for implementation)

A future separately approved onboarding program may allow a verified new researcher to create a brand-new tenant/account and become the initial Owner of that new account through a controlled server-side provisioning workflow. If later approved, that workflow must:

- create a new tenant/account only;
- create exactly one initial Owner for that new tenant;
- perform account and Owner provisioning atomically or fail closed;
- run only through a controlled server-side provisioning boundary;
- never allow joining an existing account without invitation;
- never allow a user to select an arbitrary role;
- never allow creating an Owner inside an existing account;
- never expose service-role credentials to the browser;
- require email verification, abuse controls, recovery design, and explicit rate limiting;
- remain outside the current MVP.

This future model is **not** implemented, **not** part of MVP, and **not** approved implementation work.

### Non-claims preserved after 001B decision documentation

- Live login is not wired; signup is not implemented; logout is not implemented.
- Callback routes, Proxy/session refresh, protected routes, and authenticated profile/account resolution are absent.
- Invitation flow is absent; first-owner bootstrap **implementation** remains absent (design approved; not implemented or applied).
- Generated database types are absent; `mockRole` remains UI-only.
- Browser smoke remains Mozfer-owned; production readiness is not claimed.

### Security boundaries preserved

- `account_id` isolation remains mandatory.
- Owner financial access remains Owner-only.
- Support Helper remains limited to approved operational and safe RPC surfaces.
- Authenticated user-session RLS remains the normal runtime path.
- Client state is never role authority; inactive or deleted profiles must fail closed.
- Service-role and privileged credentials remain outside browser and normal application paths.

## ZAM-AUTH-001C First-Owner Bootstrap Design (APPROVED DESIGN ONLY)

Canonical design document: `docs/first-owner-bootstrap-design.md`.

- **Status:** APPROVED DESIGN ONLY. **NOT IMPLEMENTED.** **NOT APPLIED.** **NOT AVAILABLE AT RUNTIME.**
- **Approval chain:** design → controller HOLD → corrected design PASS → independent review PASS → Mozfer approval APPROVED.
- **MVP scope:** globally one-time deployment initialization. Creates exactly one initial account and one initial active non-deleted Owner. Not reusable for additional tenants or first Owners. Not sole-Owner recovery.
- **Mechanism (approved, not present in source):** one privileged `SECURITY DEFINER` function (conceptual `public.bootstrap_first_owner(...)`), Mozfer SQL-owner session only. No browser, Next.js, Server Action, Route Handler, Proxy, Edge Function, `anon`, `authenticated`, or `service_role` application execution path. `EXECUTE` must be revoked from `PUBLIC`, `anon`, `authenticated`, and `service_role`.
- **Serialization:** mandatory fixed transaction-scoped PostgreSQL advisory lock before all checks; lock identity independent of Auth user, account, caller, request, or environment. Exact lock form/constants **not frozen yet** (required in SQL-draft task).
- **Gates (deterministic order after lock):** active Owner → `bootstrap_already_completed`; historical Owner → `bootstrap_historical_owner_present`; pre-existing accounts → `bootstrap_preexisting_accounts`; schema-qualified `auth.users` existence (mandatory) → `auth_user_not_found`; existing profile → `auth_user_already_profiled`; input validation → `invalid_input`.
- **Atomic write:** one new account (DB-generated id) + one Owner profile hard-coded `role = owner`, `active = true`, `deleted_at = NULL`. Failures leave no account/profile rows.
- **Post-success:** any later invocation (same or different Auth user) returns **`bootstrap_already_completed`** only.
- **Mandatory later implementation requirements:** (1) freeze/document exact advisory-lock form and constants in SQL draft; (2) keep post-success code strictly `bootstrap_already_completed`; (3) pin actual function owner after apply and prove authoritative `SELECT` on `auth.users`.
- **Non-claims:** no bootstrap function or migration exists; not applied to DEV/DEMO; live login/session not started; production readiness not claimed; additional tenant provisioning not authorized.

### Next auth task (not started)

- `ZAM-AUTH-001C-FIRST-OWNER-BOOTSTRAP-DESIGN-DOCS-REVIEW-1` — independent review of this documentation synchronization.
