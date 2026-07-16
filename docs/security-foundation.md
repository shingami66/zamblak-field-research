# Security Foundation

- `account_id` is the mandatory tenant boundary.
- Row Level Security (RLS) is required on all tables.
- Sensitive writes use RPC-only boundaries or Server Actions.
- Operational and financial data remain isolated.
- Audit history is trigger-backed and client-immutable.
- Support Helper receives no financial wording, route, or data exposure.

## Application Auth boundary (`ZAM-AUTH-001D`)

Implemented in source, passed source/static review, and passed Mozfer-owned manual smoke; application implementation is committed locally as `74ceca7 feat(auth): add protected sessions and role-aware shell`; documentation is committed locally as `9a140d8 docs(auth): record protected session milestone`. Local `main` is ahead of `origin/main` by two commits; no push has occurred. The post-commit documentation-state correction remains uncommitted.

- Auth Server Components and Server Actions use the existing request-scoped Supabase SSR client. Server Actions have the writable cookie adapter required by Supabase Auth.
- Next.js Proxy refreshes Auth cookies and validates the user through `getUser()` on matched requests.
- Login and session authority are server-side. Login accepts credentials only; it does not accept role, account, profile, redirect, or other browser-supplied authorization context.
- The argument-free database RPC `resolve_current_profile()` binds profile/account resolution to the authenticated Auth identity. Missing, inactive, deleted, malformed, or unsupported profiles fail closed.
- The protected root requires the resolved application session. An authenticated visit to `/login` redirects to `/`.
- The former `mockRole` source is removed. Browser state is not role authority, and no service-role client is present on the normal application path.
- User-initiated logout is explicitly local to the current browser session (`supabase.auth.signOut({ scope: "local" })`) and redirects to the fixed `/login` destination. Errors remain sanitized.
- Redirect destinations are fixed by the server; no browser-supplied redirect authority is accepted.
- `/financials` performs a server-side Owner check. A Support Helper direct request redirects to `/` and receives no financial wording or data.
- Companies MVP list/create/detail/edit are implemented application routes on designated DEV/DEMO evidence only; production readiness is not claimed. Cross-account runtime isolation smoke is not claimed. Projects product RPCs (`list_projects`, `get_project`, `create_project`, `update_project`, Owner-only `transition_project_status`) are **installed and verified on designated DEV/DEMO** (authenticated EXECUTE only; relation ACL/RLS non-regression preserved; no finance exposure on Projects RPCs); application contracts/UI remain **not** started. `/projects` and `/financials` remain controlled placeholders only and do not claim completed domain application permissions.

## Preserved database and onboarding controls

- Role-safe reads (`ZAM-WF-001F`) are verified on designated DEV/DEMO: Owner base-table access remains Owner-scoped, while Support Helper is limited to four approved safe `SECURITY DEFINER` RPCs. Residual non-SELECT privilege cleanup remains deferred.
- MVP access policy (`ZAM-AUTH-001B`) remains `INVITATION_OR_ADMIN_SEED_ONLY`. Public signup, arbitrary account creation, user-selected roles, and user-created Owners are prohibited.
- First-Owner bootstrap (`ZAM-AUTH-001C`) remains a globally one-time SQL-owner-only operation. It is consumed on designated DEV/DEMO, is unavailable to browser/application/service-role paths, and is not a recovery mechanism.
- Production readiness is not claimed.
