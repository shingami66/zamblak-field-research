# Project Status

Current phase: `ZAM-AUTH-001D` application implementation is committed locally; documentation sync remains modified and uncommitted; no push has occurred.

Next sequence: documentation commit-state correction → documentation commit → independent documentation-commit review → push-only after explicit approval. After Auth closure, the next product milestone is the real Companies domain slice.

## Current application state (`ZAM-AUTH-001D`)

- **Implementation:** complete and committed locally as `74ceca7 feat(auth): add protected sessions and role-aware shell`.
- **Review:** source/static implementation reviews passed, including the focused logout-scope, account-menu accessibility, final integration, and dead-navigation reviews. Independent application-commit review passed.
- **Manual runtime evidence:** Mozfer-owned smoke passed for real Owner login, redirects, session persistence after refresh, unauthenticated root protection, responsive login/dashboard layouts, desktop/mobile account menu behavior, logout, and all controlled routes. These are Mozfer's runtime observations, not agent-performed browser claims.
- **Commit state:** application commit present on local `main` (`74ceca7`); documentation sync remains uncommitted. Local `main` is ahead of `origin/main` by one commit before the documentation commit. No push has occurred.

Implemented behavior:

- Live email/password login using the request-scoped Supabase server client and sanitized Arabic errors.
- Server-side Auth user validation and database-backed profile/account/role resolution for the only approved roles: `owner` and `support_helper`.
- Next.js Proxy session-cookie refresh.
- Protected `/`; unauthenticated access redirects to `/login`.
- Authenticated `/login` access redirects to `/`.
- Responsive branded login and authenticated dashboard shell, with server-resolved account/profile context and no fake dashboard metrics.
- Accessible desktop/mobile account menu.
- Argument-free local logout that ends only the current browser session and redirects to `/login` with sanitized Arabic error handling.
- Controlled authenticated `/companies` and `/projects` placeholders.
- Controlled Owner-only `/financials` placeholder; Support Helper direct access redirects to `/` without financial wording or data exposure.

The three controlled routes are navigation-safety placeholders only. They prevent dead navigation but do not represent completed Companies, Projects, or Financials modules, domain data integration, or final domain permissions.

## Auth security and authority boundary

- Role authority comes from the authenticated user's active, non-deleted database profile/account context, resolved server-side through the argument-free `resolve_current_profile()` RPC.
- Browser-supplied roles, account IDs, profile IDs, Auth UUIDs, and redirect targets are not accepted as authority.
- Missing, inactive, deleted, malformed, or unsupported profiles fail closed.
- The former `mockRole` source has been removed.
- No service-role client is used in browser or normal user-session paths.
- User-initiated logout uses explicit local scope. Financial route authorization is checked on the server.
- MVP onboarding remains `INVITATION_OR_ADMIN_SEED_ONLY`; public signup, arbitrary account creation, user-selected roles, and user-created Owners remain prohibited.

## Earlier Auth milestones

### `ZAM-AUTH-001A` — Supabase runtime client foundation (closed)

- Committed/pushed foundation introduced environment-name validation and browser/request-scoped SSR client factories using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- At 001A closure, live login/session behavior was intentionally absent. That historical limitation was superseded by the local 001D application commit described above.

### `ZAM-AUTH-001B` — MVP access policy (recorded)

- Binding policy: `INVITATION_OR_ADMIN_SEED_ONLY`.
- Public self-service signup, arbitrary account creation, user-selected roles, and user-created Owners are prohibited.
- Support Helper onboarding is authorized Owner or controlled administration only; self-registration and role escalation are prohibited.
- At 001B recording, login/logout, Proxy refresh, route protection, and profile resolution were historical non-claims. Those application-runtime items were implemented by 001D; invitation/admin onboarding remains deferred.

### `ZAM-AUTH-001C` — First-Owner bootstrap (repository + DEV/DEMO complete)

- Canonical design: `docs/first-owner-bootstrap-design.md`.
- Migration: `supabase/migrations/20260714114814_first_owner_bootstrap.sql`; SQL-owner-only `public.bootstrap_first_owner` with fixed search path, frozen advisory lock, revoked application-role execution, and fail-closed one-time gates.
- Mozfer applied and verified the migration on the designated DEV/DEMO database, created one account and one active Owner, and confirmed replay returns `bootstrap_already_completed`.
- The bootstrap path is consumed for that DEV/DEMO database. It is not recovery, additional-tenant provisioning, or a browser/application flow.
- At 001C completion, live application login/session integration was outside that milestone; it was subsequently implemented by 001D. Production readiness and Supabase migration-history registration remain unclaimed.

## Database enforcement status

### `ZAM-WF-001E` — Participation project-state enforcement

- Migration `supabase/migrations/202607130001_participation_project_state_guard.sql` was committed/pushed, manually applied by Mozfer to designated DEV/DEMO, and structurally verified.
- Participation creation and relevant membership/restore changes fail closed unless the project is active and non-deleted.

### `ZAM-WF-001F` — Role-safe read surface

- Mozfer manually applied the frozen migration to designated DEV/DEMO; the read-only post-apply packet passed.
- Verified inventory: 11 functions, 2 views, and 23 policies; managed manifest MD5 `f950c7ec5024dcf907d36f02df8c78b4` (8238 octets).
- Owner base-table and summary access remains Owner-scoped. Support Helper remains limited to the four approved support-safe `SECURITY DEFINER` RPCs and receives no broad base-table, pricing, payment, financial-summary, or sensitive review data.
- Boundaries: DEV/DEMO database evidence only. Domain RPC application integration, residual non-SELECT privilege cleanup, customer production readiness, and migration-history registration remain separate work.

## Open work

- Complete documentation commit-state correction, documentation commit, independent documentation-commit review, and separately approved push-only closure.
- Begin the real Companies domain module after Auth closure, preserving the sequence Company → Project → Respondent → Participation → Review → Financials.
- Password recovery/change, invitation and Support Helper administration, Auth-user/profile relinking, account/profile settings, broader multi-device session controls, and sole-Owner recovery remain deferred.
